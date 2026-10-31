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

export type ProviderEnv = { TUTOR_PROVIDER?: string; TUTOR_MODEL?: string; ANTHROPIC_API_KEY?: string; OPENAI_API_KEY?: string; OPENAI_BASE_URL?: string; ALLOW_MOCK?: string; MOCK_DELAY_MS?: string };

export function providerFromEnv(env: ProviderEnv): Provider | null {
  const which = (env.TUTOR_PROVIDER || "anthropic").toLowerCase();
  if (which === "mock") return env.ALLOW_MOCK === "1" ? mock(Number(env.MOCK_DELAY_MS || 250)) : null;
  if (which === "openai") return env.OPENAI_API_KEY ? openaiCompatible(env.OPENAI_API_KEY, env.TUTOR_MODEL || "gpt-4o-mini", env.OPENAI_BASE_URL || "https://api.openai.com/v1") : null;
  return env.ANTHROPIC_API_KEY ? anthropic(env.ANTHROPIC_API_KEY, env.TUTOR_MODEL || "claude-haiku-5-5") : null;
}
