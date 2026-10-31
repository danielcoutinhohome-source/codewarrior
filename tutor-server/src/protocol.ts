// Wire format shared by the CodeWarrior site and the tutor server.
// The site imports this file directly, so keep it free of server-only code.

export type Role = "user" | "assistant";
export type WireMessage = { role: Role; content: string };

export type TutorPrefs = {
  length: "short" | "steps";
  level: "beginner" | "exam";
  style: "guided" | "direct";
};

// Only what the tutor needs. No usernames, passwords, emails or account ids.
export type TutorContext = {
  course: "csa" | "csp";
  prefs: TutorPrefs;
  lesson?: { title: string; objective: string; unit?: string };
  focus?: string; // the current question, the student's answer and (once answered) the verified key
  action?: string; // e.g. "explain-differently", "hint", "why-wrong"
  learner?: {
    currentWorld?: string;
    worldsCleared?: string[];
    lessonsCompleted?: string[];
    needsPractice?: string[];
    strengths?: string[];
    recentMistakes?: string[];
  };
};

export type ChatRequest = { mode: "chat"; messages: WireMessage[]; context: TutorContext };
export type GradeRequest = {
  mode: "grade";
  context: TutorContext;
  task: { prompt: string; code?: string; keyPoints: string[]; model: string };
  answer: string;
};
export type TutorRequest = ChatRequest | GradeRequest;

export type Grade = { verdict: "correct" | "partial" | "incorrect"; feedback: string; missing: string[] };

export type TutorResponse =
  | { ok: true; mode: "chat"; reply: string; provider: string; model: string }
  | { ok: true; mode: "grade"; grade: Grade; provider: string; model: string }
  | { ok: false; error: TutorErrorCode; message: string; retryAfter?: number };

export type TutorErrorCode = "bad_request" | "too_large" | "rate_limited" | "provider_error" | "unavailable" | "timeout" | "malformed" | "forbidden";

export const LIMITS = {
  maxMessages: 16,
  maxMessageChars: 6000,
  maxTotalChars: 24000,
  maxFocusChars: 4000,
  maxAnswerChars: 1500,
  maxListItems: 10,
  maxItemChars: 120,
};

// Validates a grade returned by the model. Anything off is treated as malformed.
export function parseGrade(raw: unknown): Grade | null {
  let v = raw;
  if (typeof v === "string") {
    const m = v.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      v = JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.verdict !== "correct" && o.verdict !== "partial" && o.verdict !== "incorrect") return null;
  if (typeof o.feedback !== "string" || !o.feedback.trim() || o.feedback.length > 1200) return null;
  const missing = Array.isArray(o.missing) ? o.missing.filter((x): x is string => typeof x === "string").slice(0, 6) : [];
  return { verdict: o.verdict, feedback: o.feedback.trim(), missing };
}
