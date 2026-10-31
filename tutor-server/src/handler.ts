import { systemPrompt } from "./prompt";
import { LIMITS, parseGrade, type TutorContext, type TutorErrorCode, type TutorRequest, type TutorResponse, type WireMessage } from "./protocol";
import { ProviderError, providerFromEnv, type Provider, type ProviderEnv } from "./providers";

export type Env = ProviderEnv & {
  ALLOWED_ORIGINS?: string; // comma-separated
  RATE_PER_10MIN?: string; // per client IP
  RATE_PER_DAY?: string; // per client IP
  DAILY_LIMIT?: string; // all clients, per server instance
  TIMEOUT_MS?: string;
};

const DEFAULT_ORIGINS = ["https://danielcoutinhohome-source.github.io", "http://localhost:3000", "http://localhost:4321"];

// ---- rate limiting (in memory, per server instance; see README for durable options) ----
type Bucket = { short: number[]; day: number[] };
const buckets = new Map<string, Bucket>();
let global = { day: new Date().toISOString().slice(0, 10), count: 0 };

function allow(ip: string, env: Env): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  if (global.day !== today) global = { day: today, count: 0 };
  if (global.count >= Number(env.DAILY_LIMIT || 3000)) return { ok: false, retryAfter: 3600 };
  const b = buckets.get(ip) || { short: [], day: [] };
  b.short = b.short.filter((t) => now - t < 10 * 60_000);
  b.day = b.day.filter((t) => now - t < 86_400_000);
  if (b.short.length >= Number(env.RATE_PER_10MIN || 20)) return { ok: false, retryAfter: Math.ceil((10 * 60_000 - (now - b.short[0])) / 1000) };
  if (b.day.length >= Number(env.RATE_PER_DAY || 150)) return { ok: false, retryAfter: Math.ceil((86_400_000 - (now - b.day[0])) / 1000) };
  b.short.push(now);
  b.day.push(now);
  buckets.set(ip, b);
  if (buckets.size > 5000) buckets.delete(buckets.keys().next().value as string);
  global.count++;
  return { ok: true };
}
export const resetRateLimits = () => { buckets.clear(); global = { day: new Date().toISOString().slice(0, 10), count: 0 }; };

// ---- validation ----
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, LIMITS.maxListItems).map((x) => x.slice(0, LIMITS.maxItemChars)) : undefined);

function cleanContext(raw: unknown): TutorContext | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (c.course !== "csa" && c.course !== "csp") return null;
  const p = (c.prefs || {}) as Record<string, unknown>;
  const ctx: TutorContext = {
    course: c.course,
    prefs: {
      length: p.length === "steps" ? "steps" : "short",
      level: p.level === "exam" ? "exam" : "beginner",
      style: p.style === "direct" ? "direct" : "guided",
    },
  };
  if (c.lesson && typeof c.lesson === "object") {
    const l = c.lesson as Record<string, unknown>;
    const title = str(l.title, 120), objective = str(l.objective, 400);
    if (title && objective) ctx.lesson = { title, objective, unit: str(l.unit, 80) };
  }
  const focus = str(c.focus, LIMITS.maxFocusChars);
  if (focus) ctx.focus = focus;
  const action = str(c.action, 40);
  if (action) ctx.action = action;
  if (c.learner && typeof c.learner === "object") {
    const l = c.learner as Record<string, unknown>;
    ctx.learner = { currentWorld: str(l.currentWorld, 80), worldsCleared: list(l.worldsCleared), lessonsCompleted: list(l.lessonsCompleted), needsPractice: list(l.needsPractice), strengths: list(l.strengths), recentMistakes: list(l.recentMistakes) };
  }
  return ctx;
}

// Keeps the most recent turns, starting with a user turn and alternating roles.
function cleanMessages(raw: unknown): WireMessage[] | "too_large" | null {
  if (!Array.isArray(raw) || !raw.length) return null;
  const msgs: WireMessage[] = [];
  for (const m of raw.slice(-LIMITS.maxMessages)) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || !content.trim()) return null;
    if (content.length > LIMITS.maxMessageChars) return "too_large";
    const prev = msgs[msgs.length - 1];
    if (prev && prev.role === role) prev.content += `\n\n${content}`;
    else msgs.push({ role, content });
  }
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return null;
  if (msgs.reduce((n, m) => n + m.content.length, 0) > LIMITS.maxTotalChars) return "too_large";
  return msgs;
}

// ---- HTTP ----
function cors(origin: string | null, env: Env) {
  const allowed = (env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()) : DEFAULT_ORIGINS).filter(Boolean);
  const ok = !!origin && allowed.includes(origin);
  return {
    ok,
    headers: {
      ...(ok ? { "access-control-allow-origin": origin! } : {}),
      "access-control-allow-methods": "POST, GET, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
      vary: "origin",
    } as Record<string, string>,
  };
}

const json = (body: TutorResponse | Record<string, unknown>, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
const fail = (error: TutorErrorCode, message: string, status: number, headers: Record<string, string>, retryAfter?: number) =>
  json({ ok: false, error, message, ...(retryAfter ? { retryAfter } : {}) }, status, retryAfter ? { ...headers, "retry-after": String(retryAfter) } : headers);

export async function handle(req: Request, env: Env, ip = "unknown", providerOverride?: Provider): Promise<Response> {
  const url = new URL(req.url);
  const c = cors(req.headers.get("origin"), env);
  if (req.method === "OPTIONS") return new Response(null, { status: c.ok ? 204 : 403, headers: c.headers });
  if (req.headers.get("origin") && !c.ok) return fail("forbidden", "This site is not allowed to use the tutor.", 403, c.headers);

  const provider = providerOverride || providerFromEnv(env);
  if (url.pathname === "/v1/health" && req.method === "GET")
    return json({ ok: !!provider, provider: provider?.name ?? null, model: provider?.model ?? null }, 200, c.headers);
  if (url.pathname !== "/v1/tutor" || req.method !== "POST") return fail("bad_request", "Not found.", 404, c.headers);
  if (!provider) return fail("unavailable", "The tutor has no AI provider configured.", 503, c.headers);

  const length = Number(req.headers.get("content-length") || 0);
  if (length > 64_000) return fail("too_large", "That message is too long.", 413, c.headers);
  let body: TutorRequest;
  try {
    const text = await req.text();
    if (text.length > 64_000) return fail("too_large", "That message is too long.", 413, c.headers);
    body = JSON.parse(text);
  } catch {
    return fail("bad_request", "The request was not valid JSON.", 400, c.headers);
  }
  const ctx = cleanContext((body as { context?: unknown })?.context);
  if (!ctx) return fail("bad_request", "Missing or invalid context.", 400, c.headers);

  let messages: WireMessage[];
  let maxTokens: number;
  if (body.mode === "grade") {
    const t = body.task as Record<string, unknown> | undefined;
    const prompt = str(t?.prompt, 1000), model = str(t?.model, 1500), answer = str(body.answer, LIMITS.maxAnswerChars + 1);
    const keyPoints = list(t?.keyPoints);
    if (!prompt || !model || !keyPoints?.length || !answer?.trim()) return fail("bad_request", "Missing task or answer.", 400, c.headers);
    if (answer.length > LIMITS.maxAnswerChars) return fail("too_large", "That answer is too long.", 413, c.headers);
    const code = str(t?.code, 2000);
    messages = [{ role: "user", content: `Task: ${prompt}${code ? `\nCode:\n${code}` : ""}\nKey points a full answer covers:\n- ${keyPoints.join("\n- ")}\nReference answer: ${model}\n\nStudent's answer:\n${answer}` }];
    maxTokens = 400;
  } else if (body.mode === "chat") {
    const m = cleanMessages(body.messages);
    if (m === "too_large") return fail("too_large", "The conversation is too long to send. Start a new one or shorten your message.", 413, c.headers);
    if (!m) return fail("bad_request", "Invalid messages.", 400, c.headers);
    messages = m;
    maxTokens = ctx.prefs.length === "steps" ? 1100 : 750;
  } else return fail("bad_request", "Unknown mode.", 400, c.headers);

  const gate = allow(ip, env);
  if (!gate.ok) return fail("rate_limited", "Too many tutor requests right now. Try again in a bit.", 429, c.headers, gate.retryAfter);

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), Number(env.TIMEOUT_MS || 30_000));
  try {
    const text = await provider.complete({ system: systemPrompt(ctx, body.mode), messages, maxTokens, signal: ctl.signal });
    if (body.mode === "grade") {
      const grade = parseGrade(text);
      if (!grade) return fail("malformed", "The tutor's grading came back in an unexpected format.", 502, c.headers);
      return json({ ok: true, mode: "grade", grade, provider: provider.name, model: provider.model }, 200, c.headers);
    }
    return json({ ok: true, mode: "chat", reply: text.slice(0, 12_000), provider: provider.name, model: provider.model }, 200, c.headers);
  } catch (e) {
    if (e instanceof ProviderError) {
      const status = e.kind === "timeout" ? 504 : e.kind === "rate_limited" ? 429 : e.kind === "malformed" ? 502 : 503;
      return fail(e.kind === "provider_error" ? "provider_error" : e.kind, e.message, status, c.headers);
    }
    return fail("provider_error", "The tutor hit an unexpected error.", 500, c.headers);
  } finally {
    clearTimeout(timer);
  }
}
