import type { Assignment, AssignmentState, ClassInfo, Credit, Feedback, SessionSummary } from "@/lib/cloud/protocol";

export type SkillStat = { skill: string; firstTries: number; missed: number; students?: number };
export type StudentRow = {
  id: string;
  name: string;
  username: string;
  joinedAt: number;
  sharePlay: boolean;
  runs: number;
  wins: number;
  losses: number;
  abandoned: number;
  firstTry: number;
  firstTotal: number;
  hints: number;
  retries: number;
  lastActivity: number | null;
  skills: SkillStat[];
};
export type Progress = { state: AssignmentState; done: number; needed: number; completedAt: number | null; late: boolean; credits: Credit[] };
export type Summary = {
  class: ClassInfo;
  students: StudentRow[];
  formerMembers: { id: string; name: string; leftAt: number }[];
  assignments: Assignment[];
  assignmentStates: Record<string, Record<string, Progress>>;
  recent: (SessionSummary & { contextNote?: string | null })[];
  skills: SkillStat[];
  serverTime: number;
};
export type Attempt = {
  sessionId: string;
  index: number;
  round: number;
  tryNo: number;
  questionId: string;
  skill: string;
  kind: string;
  prompt: string;
  code?: string;
  options?: string[];
  given: string;
  expected?: string;
  correct: boolean | null;
  hinted: boolean;
  receivedAt: number;
  contentVersion: string;
};
export type StudentDetailData = {
  student: { id: string; name: string; username: string };
  periods: { joinedAt: number; leftAt: number | null; leftReason: string | null; sharePlay: boolean }[];
  sessions: (SessionSummary & { contextNote?: string | null; itemsUsed?: Record<string, number> })[];
  attempts: Attempt[];
  assignments: (Assignment & Progress)[];
  feedback: Feedback[];
};

// Evidence thresholds used across the dashboard. Below these, the dashboard says "not enough
// data yet" instead of drawing conclusions.
export const MIN_FIRST_TRIES = 5;
export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
export const ago = (t: number | null) => {
  if (!t) return "No activity yet";
  const m = Math.round((Date.now() - t) / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
};
export const dateTime = (t: number | null) => (t ? new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
