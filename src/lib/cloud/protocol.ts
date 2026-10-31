// Shared between the browser and the classroom server (classroom-server/). Pure data and
// validation only: no DOM, no Dexie, no Workers APIs.

export const COURSES = ["csa", "csp"] as const;
export type CourseId = (typeof COURSES)[number];
export type Role = "student" | "teacher";

export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 200;
// Eight characters from an alphabet without look-alikes (no 0/O, 1/I/L).
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CLASS_CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;
export const normalizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

export type Me = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
  createdAt: number;
};

export type ApiError = {
  error:
    | "bad_request"
    | "unauthorized"
    | "forbidden"
    | "not_found"
    | "conflict"
    | "rate_limited"
    | "password_change_required"
    | "invalid_credentials"
    | "username_taken"
    | "invalid_code"
    | "class_closed"
    | "server_error";
  message: string;
  retryAfter?: number;
};

// ---- classes ----
export type ClassInfo = {
  id: string;
  name: string;
  course: CourseId;
  section: string;
  description: string;
  joinCode: string | null; // teacher only
  joinEnabled: boolean;
  archived: boolean;
  createdAt: number;
  teacherName: string;
  memberCount?: number; // teacher only
  // student only
  joinedAt?: number;
  sharePlay?: boolean;
};

// ---- assignments ----
export type AssignmentTarget =
  | { kind: "battles"; battles: [number, number][] } // [world, battle]
  | { kind: "practice"; lessonId: string; lessonTitle: string; difficulty: "warmup" | "core" | "exam" | "mixed"; count: number };

export type Assignment = {
  id: string;
  classId: string;
  title: string;
  instructions: string;
  target: AssignmentTarget;
  dueAt: number | null; // UTC ms
  dueTz: string; // IANA zone the teacher picked, shown next to the date
  status: "draft" | "published";
  version: number;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
  // false (default): a battle/topic the student already completed on their class account counts.
  // true: only work started from this assignment counts (e.g. to keep class time on task).
  requireLaunch: boolean;
  targetsLocked?: boolean; // published and has recorded work
};

// Which run earned credit for one part of an assignment.
export type Credit = { target: string; sessionId: string; at: number; viaAssignment: boolean };

export type AssignmentState = "not_started" | "in_progress" | "completed" | "overdue";
export type StudentAssignment = Assignment & {
  className: string;
  state: AssignmentState;
  completedAt: number | null;
  late: boolean;
  done: number; // targets completed
  needed: number;
  credits: Credit[]; // target key ("w-b" or lesson id) -> the run that earned it
};

// ---- recorded work ----
export type SessionKind = "battle" | "practice";
export type SessionOutcome = "won" | "lost" | "completed" | "abandoned" | "in_progress";

export type AttemptRecord = {
  index: number; // question position in the session
  round: number; // battle rounds: missed questions come back in later rounds
  tryNo: number; // 0 = first try
  questionId: string;
  skill: string;
  kind: string; // predict | fill | choice | order | explain
  prompt: string;
  code?: string;
  options?: string[];
  given: string;
  expected?: string;
  correct: boolean | null; // null = not auto-graded (written explanation)
  hinted: boolean;
};

export type SessionStart = {
  id: string;
  kind: SessionKind;
  world?: number;
  battle?: number;
  lessonId?: string;
  classId?: string;
  assignmentId?: string;
  questionCount: number;
  contentVersion: string;
};

export type SessionFinish = {
  outcome: "won" | "lost" | "completed";
  itemsUsed: Record<string, number>;
  hintsUsed: number;
  bestCombo?: number;
};

export type SyncEvent =
  | { id: string; type: "session.start"; at: number; session: SessionStart }
  | { id: string; type: "attempt"; at: number; sessionId: string; attempt: AttemptRecord }
  | { id: string; type: "session.finish"; at: number; sessionId: string; result: SessionFinish }
  | { id: string; type: "session.abandon"; at: number; sessionId: string };

export type SyncAck = { id: string; status: "ok" | "duplicate" | "rejected"; reason?: string };
export type SyncResponse = { acks: SyncAck[]; serverTime: number };

export type SessionSummary = {
  id: string;
  studentId: string;
  studentName: string;
  kind: SessionKind;
  world: number | null;
  battle: number | null;
  enemy: string | null;
  lessonId: string | null;
  classId: string | null;
  assignmentId: string | null;
  assignmentTitle?: string | null;
  outcome: SessionOutcome;
  stars: number | null;
  firstTry: number;
  questionCount: number;
  answered: number;
  retries: number;
  hintsUsed: number;
  startedAt: number;
  finishedAt: number | null;
  receivedAt: number;
};

export type AttemptRow = AttemptRecord & { sessionId: string; receivedAt: number; contentVersion: string };

export type Feedback = {
  id: string;
  classId: string;
  studentId: string;
  assignmentId: string | null;
  sessionId: string | null;
  body: string;
  teacherName: string;
  createdAt: number;
  updatedAt: number;
};

// ---- cross-device game progress ----
export type ProgressDoc = {
  avatar: unknown; // the game's Avatar object
  xp: number;
  coins: number;
  streak: number;
  lastActiveDay: string;
  stars: Record<string, number>;
  inventory: Record<string, number>;
  owned: string[];
  stats: Record<string, number>;
  skills: Record<string, [number, number]>;
  imports: string[]; // legacy device saves already merged (idempotent import)
  updatedAt: number;
};

// Merge rule for two copies of the same student's progress (e.g. two devices). Earned
// things never go backwards: stars, XP and owned items take the best of both. Spendable
// counts (coins, items) take the larger value, so a purchase on one device and a battle on
// another never erase each other; the cost is that a spend can occasionally be undone.
export function mergeProgress(a: ProgressDoc, b: ProgressDoc): ProgressDoc {
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  const maxRec = (x: Record<string, number>, y: Record<string, number>) => {
    const out: Record<string, number> = { ...x };
    for (const [k, v] of Object.entries(y)) out[k] = Math.max(out[k] ?? 0, Number(v) || 0);
    return out;
  };
  const skills: Record<string, [number, number]> = { ...a.skills };
  for (const [k, v] of Object.entries(b.skills || {})) {
    const p = skills[k] || [0, 0];
    skills[k] = [Math.max(p[0], v[0] || 0), Math.max(p[1], v[1] || 0)];
  }
  return {
    avatar: newer.avatar,
    xp: Math.max(a.xp, b.xp),
    coins: Math.max(a.coins, b.coins),
    streak: Math.max(a.streak, b.streak),
    lastActiveDay: a.lastActiveDay > b.lastActiveDay ? a.lastActiveDay : b.lastActiveDay,
    stars: maxRec(a.stars || {}, b.stars || {}),
    inventory: maxRec(a.inventory || {}, b.inventory || {}),
    owned: [...new Set([...(a.owned || []), ...(b.owned || [])])],
    stats: maxRec(a.stats || {}, b.stats || {}),
    skills,
    imports: [...new Set([...(a.imports || []), ...(b.imports || [])])],
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}

export const starsFor = (firstTry: number, total: number) => {
  const r = total ? firstTry / total : 0;
  return r >= 0.9 ? 3 : r >= 0.6 ? 2 : 1;
};

// Spreadsheet apps treat cells starting with these as formulas. Prefix with a quote.
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const toCsv = (head: string[], rows: unknown[][]) => [head.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\r\n");
