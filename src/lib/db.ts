import Dexie, { type EntityTable } from "dexie";
import { STARTER_COINS, STARTER_INVENTORY, STARTER_OWNED } from "./game";

export type Avatar = {
  weapon?: string; // missing on older saves: classic energy blade
  headwear?: string; // missing on older saves: original frame headwear
  body?: string; // "bot" | "titan" | "valkyrie"
  armor: string;
  energy: string;
  title: string;
  finish?: string; // legacy finish IDs and the extended finish catalog
  aura?: string; // legacy aura IDs and the extended aura catalog
};

export type Account = {
  id: string; // lowercased username, unique per device; "c:<user id>" for a class account
  username: string; // as typed
  cloudUserId?: string; // set for class accounts: the server account this warrior belongs to
  passwordHash: string;
  salt: string;
  avatar: Avatar;
  createdAt: number;
};

export type Stats = {
  battles: number;
  wins: number;
  losses: number;
  questions: number; // answered in a first round
  firstTry: number; // right on the first try, no hint
  bosses: number;
};

export type Progress = {
  id: string; // same as Account.id
  xp: number;
  coins: number;
  streak: number;
  lastActiveDay: string; // YYYY-MM-DD, local time
  stars: Record<string, number>; // "w0-b2" -> 1..3; present means won
  inventory: Record<string, number>; // power-up id -> count
  owned: string[]; // shop item ids
  stats: Stats;
  skills: Record<string, [number, number]>; // skill -> [right first try, missed]
  updatedAt: number;
};

// ---- Learn Mode (v3) ----
export type Course = "csa" | "csp";
export type LearnPrefs = {
  length: "short" | "steps"; // short explanation vs step-by-step
  level: "beginner" | "exam"; // beginner-friendly vs AP exam style
  style: "guided" | "direct"; // guided practice vs direct explanation
  useProgress: boolean; // let the tutor see game and practice progress
};
export const DEFAULT_PREFS: LearnPrefs = { length: "short", level: "beginner", style: "guided", useProgress: true };

export type LessonState = { status: "started" | "done"; right: number; total: number; at: number };
export type LearnProfile = {
  id: string; // account id
  course: Course;
  prefs: LearnPrefs;
  lessons: Record<string, LessonState>;
  recent: { kind: "lesson" | "practice" | "tutor"; ref: string; label: string; at: number }[];
  updatedAt: number;
};

// One answer to one question, from a battle, practice or a lesson checkpoint.
export type Attempt = {
  id?: number;
  accountId: string;
  at: number;
  source: "battle" | "practice" | "lesson";
  course: Course;
  world: number; // topic index; -1 when not tied to a world
  skill: string;
  kind: string; // predict | fill | choice | order | bug | explain
  qid: string;
  correct: boolean;
  firstTry: boolean; // right on the first attempt without a hint
  given?: string; // what the student answered (trimmed)
  expected?: string; // canonical answer, when there is one
  prompt?: string; // short snapshot so the tutor can explain the mistake later
  code?: string;
};

export type ChatMessage = { role: "user" | "assistant"; content: string; at: number; meta?: { action?: string; provider?: string } };
export type Conversation = {
  id: string;
  accountId: string;
  title: string;
  course: Course;
  lessonId?: string;
  topic?: string;
  focus?: string; // the question or mistake this conversation is about
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

export const emptyStats = (): Stats => ({ battles: 0, wins: 0, losses: 0, questions: 0, firstTry: 0, bosses: 0 });

// All saves live in this browser's IndexedDB. Nothing here is sent anywhere.
// A classroom event waiting to upload. Removed only after the server acknowledges it.
export type OutboxItem = {
  seq?: number;
  id: string; // event id (idempotency key)
  userId: string; // the class account that created it; never uploaded under another account
  sessionId: string;
  event: unknown; // SyncEvent
  createdAt: number;
};

export const db = new Dexie("codewarrior") as Dexie & {
  outbox: EntityTable<OutboxItem, "seq">;
  accounts: EntityTable<Account, "id">;
  progress: EntityTable<Progress, "id">;
  learn: EntityTable<LearnProfile, "id">;
  attempts: EntityTable<Attempt, "id">;
  conversations: EntityTable<Conversation, "id">;
};

db.version(1).stores({
  accounts: "id, createdAt",
  progress: "id",
});

// v2: stars, inventory, shop, stats. Older saves are upgraded in place.
db.version(2)
  .stores({ accounts: "id, createdAt", progress: "id" })
  .upgrade((tx) =>
    tx
      .table("progress")
      .toCollection()
      .modify((p: Record<string, unknown>) => {
        const won = (p.battlesWon as Record<string, boolean>) || {};
        p.stars = Object.fromEntries(Object.keys(won).map((k) => [k, 1]));
        delete p.battlesWon;
        delete p.currentWorld;
        p.inventory = { ...STARTER_INVENTORY };
        p.owned = [...STARTER_OWNED];
        p.coins = Math.max(Number(p.coins) || 0, STARTER_COINS);
        p.stats = emptyStats();
        p.skills = {};
        p.updatedAt = Date.now();
      }),
  );

// v3: Learn Mode. New tables only; existing saves are untouched.
db.version(3).stores({
  accounts: "id, createdAt",
  progress: "id",
  learn: "id",
  attempts: "++id, accountId, [accountId+at], [accountId+skill]",
  conversations: "id, accountId, [accountId+updatedAt]",
});

// v4: classroom sync outbox. New table only.
db.version(4).stores({
  accounts: "id, createdAt",
  progress: "id",
  learn: "id",
  attempts: "++id, accountId, [accountId+at], [accountId+skill]",
  conversations: "id, accountId, [accountId+updatedAt]",
  outbox: "++seq, &id, userId, sessionId",
});

// A newer version of the site opened in another tab needs this tab to let go of the save,
// or its upgrade waits forever (Safari freezes background tabs, so they never answer).
// Step aside and reload into the new version.
if (typeof window !== "undefined") {
  db.on("versionchange", () => {
    db.close();
    window.setTimeout(() => window.location.reload(), 50);
    return false;
  });
  db.on("blocked", () => window.dispatchEvent(new CustomEvent("cw-db", { detail: "blocked" })));
}
