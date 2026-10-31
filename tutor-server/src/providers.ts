import type { WireMessage } from "./protocol";

// A provider turns a system prompt and messages into text. Swap providers with TUTOR_PROVIDER.
export type CompleteArgs = { system: string; messages: WireMessage[]; maxTokens: number; signal: AbortSignal };
export type Provider = { name: string; model: string; complete: (a: CompleteArgs) => Promise<string> };

export class ProviderError extends Error {
  constructor(public kind: "unavailable" | "rate_limited" | "provider_error" | "timeout" | "malformed", message: string) {
    super(message);
  }
}

async function post(url: string, headers: Record<string, string>, body: unknown, signal: AbortSignal) {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal });
  } catch (e) {
    if (signal.aborted) throw new ProviderError("timeout", "The AI provider took too long.");
    throw new ProviderError("unavailable", `Could not reach the AI provider: ${(e as Error).message}`);
  }
  if (res.status === 429) throw new ProviderError("rate_limited", "The AI provider is rate limiting requests.");
  if (res.status >= 500) throw new ProviderError("unavailable", `The AI provider returned ${res.status}.`);
  if (!res.ok) throw new ProviderError("provider_error", `The AI provider rejected the request (${res.status}).`);
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    throw new ProviderError("malformed", "The AI provider sent an unreadable response.");
  }
}

// Anthropic Messages API.
export function anthropic(apiKey: string, model: string): Provider {
  return {
    name: "anthropic",
    model,
    async complete({ system, messages, maxTokens, signal }) {
      const data = await post("https://api.anthropic.com/v1/messages", { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, { model, max_tokens: maxTokens, system, messages }, signal);
      const blocks = Array.isArray(data.content) ? (data.content as { type: string; text?: string }[]) : [];
      const text = blocks.filter((b) => b.type === "text" && typeof b.text === "string").map((b) => b.text).join("").trim();
      if (!text) throw new ProviderError("malformed", "The AI provider returned no text.");
      return text;
    },
  };
}

// Any OpenAI-compatible chat completions endpoint.
export function openaiCompatible(apiKey: string, model: string, baseUrl: string): Provider {
  return {
    name: "openai-compatible",
    model,
    async complete({ system, messages, maxTokens, signal }) {
      const data = await post(`${baseUrl.replace(/\/$/, "")}/chat/completions`, { authorization: `Bearer ${apiKey}` }, { model, max_tokens: maxTokens, messages: [{ role: "system", content: system }, ...messages] }, signal);
      const choices = Array.isArray(data.choices) ? (data.choices as { message?: { content?: string } }[]) : [];
      const text = choices[0]?.message?.content?.trim();
      if (!text) throw new ProviderError("malformed", "The AI provider returned no text.");
      return text;
    },
  };
}

// Test-only provider. It is refused unless ALLOW_MOCK=1, and every reply says it is a mock,
// so it can never pass for a real tutor.
export function mock(delayMs = 250): Provider {
  return {
    name: "mock",
    model: "mock",
    async complete({ system, messages, signal }) {
      await new Promise((r, j) => {
        const t = setTimeout(r, delayMs);
        signal.addEventListener("abort", () => { clearTimeout(t); j(new ProviderError("timeout", "aborted")); }, { once: true });
      });
      if (system.includes("Reply with JSON only")) return JSON.stringify({ verdict: "partial", feedback: "[Mock grader] This is a test response, not real feedback.", missing: ["mock missing idea"] });
      const last = messages[messages.length - 1]?.content || "";
      return `[Mock tutor, test mode] You asked: "${last.slice(0, 80)}". A real tutor reply would appear here.\n\n\`\`\`java\nint x = 7 / 2; // 3\n\`\`\``;
    },
  };
}

// Cloudflare Workers AI through the Worker's `AI` binding. No API key and no bill on the
// Workers Free plan: it includes a daily allowance, and past it requests fail with an error
// instead of charging. Default model: Mistral Small 3.1 (Apache 2.0 licence).
export type WorkersAI = { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
export const WORKERS_AI_DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

export function workersAI(ai: WorkersAI, model: string): Provider {
  return {
    name: "workers-ai",
    model,
    async complete({ system, messages, maxTokens, signal }) {
      let out: unknown;
      try {
        out = await Promise.race([
          ai.run(model, { messages: [{ role: "system", content: system }, ...messages], max_tokens: maxTokens }),
          new Promise((_, reject) => {
            if (signal.aborted) reject(new ProviderError("timeout", "aborted"));
            signal.addEventListener("abort", () => reject(new ProviderError("timeout", "The AI provider took too long.")), { once: true });
          }),
        ]);
      } catch (e) {
        if (e instanceof ProviderError) throw e;
        const msg = String((e as Error)?.message || e);
        // The free daily allowance is used up: say so plainly, it resets the next day.
        if (/neuron|4006|daily free allocation|quota|limit/i.test(msg)) throw new ProviderError("rate_limited", "Today's free tutor allowance is used up. It resets tomorrow.");
        throw new ProviderError("unavailable", `Workers AI error: ${msg.slice(0, 200)}`);
      }
      const text = typeof out === "string" ? out : typeof (out as { response?: unknown })?.response === "string" ? (out as { response: string }).response : "";
      if (!text.trim()) throw new ProviderError("malformed", "The AI provider returned no text.");
      return text.trim();
    },
  };
}

export type ProviderEnv = { AI?: WorkersAI; TUTOR_PROVIDER?: string; TUTOR_MODEL?: string; ANTHROPIC_API_KEY?: string; OPENAI_API_KEY?: string; OPENAI_BASE_URL?: string; ALLOW_MOCK?: string; MOCK_DELAY_MS?: string };

// Picks the provider. With a Workers AI binding and nothing else set, the free provider is used.
export function providerFromEnv(env: ProviderEnv): Provider | null {
  const which = (env.TUTOR_PROVIDER || (env.AI ? "workers-ai" : "anthropic")).toLowerCase();
  if (which === "mock") return env.ALLOW_MOCK === "1" ? mock(Number(env.MOCK_DELAY_MS || 250)) : null;
  if (which === "workers-ai") return env.AI ? workersAI(env.AI, env.TUTOR_MODEL || WORKERS_AI_DEFAULT_MODEL) : null;
  if (which === "openai") return env.OPENAI_API_KEY ? openaiCompatible(env.OPENAI_API_KEY, env.TUTOR_MODEL || "gpt-4o-mini", env.OPENAI_BASE_URL || "https://api.openai.com/v1") : null;
  return env.ANTHROPIC_API_KEY ? anthropic(env.ANTHROPIC_API_KEY, env.TUTOR_MODEL || "claude-haiku-5-5") : null;
}
