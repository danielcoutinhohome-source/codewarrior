import { LIMITS, parseGrade, type Grade, type TutorContext, type TutorErrorCode, type TutorResponse, type WireMessage } from "../../../tutor-server/src/protocol";

// Where the tutor server lives. Set at build time (NEXT_PUBLIC_TUTOR_URL is a public URL,
// never a key). A per-browser override (localStorage "cw.tutorUrl") exists for local testing.
export function tutorUrl(): string | null {
  let url = process.env.NEXT_PUBLIC_TUTOR_URL || "";
  try {
    const o = localStorage.getItem("cw.tutorUrl");
    if (o) url = o;
  } catch {}
  return /^https?:\/\/[^\s]+$/.test(url) ? url.replace(/\/$/, "") : null;
}

export type TutorStatus =
  | { state: "unconfigured" }
  | { state: "checking" }
  | { state: "online"; provider: string; model: string; test: boolean }
  | { state: "offline"; reason: string };

let cached: { at: number; status: TutorStatus } | null = null;

export async function checkTutor(force = false): Promise<TutorStatus> {
  const url = tutorUrl();
  if (!url) return { state: "unconfigured" };
  if (!force && cached && Date.now() - cached.at < 60_000) return cached.status;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  let status: TutorStatus;
  try {
    const res = await fetch(`${url}/v1/health`, { signal: ctl.signal });
    const data = (await res.json()) as { ok?: boolean; provider?: string; model?: string };
    status = data.ok && data.provider ? { state: "online", provider: data.provider, model: data.model || "", test: data.provider === "mock" } : { state: "offline", reason: "The tutor server is running but has no AI provider configured." };
  } catch {
    status = { state: "offline", reason: "The tutor server could not be reached." };
  } finally {
    clearTimeout(t);
  }
  cached = { at: Date.now(), status };
  return status;
}

export type TutorError = { code: TutorErrorCode | "unconfigured" | "network" | "cancelled"; message: string; retryAfter?: number };
const FRIENDLY: Record<TutorError["code"], string> = {
  unconfigured: "The AI tutor isn't connected on this site yet.",
  network: "Couldn't reach the tutor. Check your connection and try again.",
  cancelled: "Stopped.",
  bad_request: "The tutor couldn't read that request.",
  too_large: "That's too long to send. Shorten it or start a new conversation.",
  rate_limited: "The tutor is getting a lot of requests. Wait a moment and try again.",
  provider_error: "The AI service returned an error. Try again.",
  unavailable: "The AI service is unavailable right now. Lessons and practice still work.",
  timeout: "The tutor took too long to answer. Try again.",
  malformed: "The tutor's answer came back garbled. Try again.",
  forbidden: "This site isn't allowed to use the tutor server.",
};

async function call(body: unknown, signal: AbortSignal, timeoutMs = 45_000): Promise<TutorResponse | TutorError> {
  const url = tutorUrl();
  if (!url) return { code: "unconfigured", message: FRIENDLY.unconfigured };
  const ctl = new AbortController();
  const onAbort = () => ctl.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  let timedOut = false;
  const t = setTimeout(() => { timedOut = true; ctl.abort(); }, timeoutMs);
  try {
    const res = await fetch(`${url}/v1/tutor`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
    let data: TutorResponse;
    try {
      data = (await res.json()) as TutorResponse;
    } catch {
      return { code: "malformed", message: FRIENDLY.malformed };
    }
    if (!data || typeof data !== "object" || typeof data.ok !== "boolean") return { code: "malformed", message: FRIENDLY.malformed };
    if (!data.ok) return { code: data.error, message: FRIENDLY[data.error] || data.message, retryAfter: data.retryAfter };
    return data;
  } catch {
    if (signal.aborted) return { code: "cancelled", message: FRIENDLY.cancelled };
    if (timedOut) return { code: "timeout", message: FRIENDLY.timeout };
    return { code: "network", message: FRIENDLY.network };
  } finally {
    clearTimeout(t);
    signal.removeEventListener("abort", onAbort);
  }
}

// Trims history to what fits the server limits: newest turns first, oversized ones shortened.
export function fitHistory(messages: WireMessage[]): WireMessage[] {
  const out: WireMessage[] = [];
  let total = 0;
  for (const m of [...messages].reverse()) {
    let content = m.content;
    if (content.length > LIMITS.maxMessageChars) content = content.slice(0, LIMITS.maxMessageChars - 40) + "\n…[shortened to fit]";
    if (out.length >= LIMITS.maxMessages - 1 || total + content.length > LIMITS.maxTotalChars - 500) break;
    out.unshift({ role: m.role, content });
    total += content.length;
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

export async function askTutor(messages: WireMessage[], context: TutorContext, signal: AbortSignal): Promise<{ reply: string; provider: string } | TutorError> {
  const r = await call({ mode: "chat", messages: fitHistory(messages), context }, signal);
  if ("code" in r) return r;
  if (r.ok && r.mode === "chat" && typeof r.reply === "string" && r.reply.trim()) return { reply: r.reply, provider: r.provider };
  return { code: "malformed", message: FRIENDLY.malformed };
}

export async function gradeExplanation(task: { prompt: string; code?: string; keyPoints: string[]; model: string }, answer: string, context: TutorContext, signal: AbortSignal): Promise<{ grade: Grade; provider: string } | TutorError> {
  if (answer.length > LIMITS.maxAnswerChars) return { code: "too_large", message: FRIENDLY.too_large };
  const r = await call({ mode: "grade", task, answer, context }, signal);
  if ("code" in r) return r;
  // Validate again on the client: never trust the shape of model output.
  if (!r.ok || r.mode !== "grade") return { code: "malformed", message: FRIENDLY.malformed };
  const grade = parseGrade(r.grade);
  return grade ? { grade, provider: r.provider } : { code: "malformed", message: FRIENDLY.malformed };
}

export const isTutorError = (x: unknown): x is TutorError => !!x && typeof x === "object" && "code" in x && "message" in x;
