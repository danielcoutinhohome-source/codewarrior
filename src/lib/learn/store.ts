import { DEFAULT_PREFS, db, type Attempt, type ChatMessage, type Conversation, type Course, type LearnPrefs, type LearnProfile } from "../db";

const MAX_ATTEMPTS = 2000; // per account; oldest are pruned
const MAX_MESSAGES = 200; // per conversation

export async function getProfile(accountId: string): Promise<LearnProfile> {
  const p = await db.learn.get(accountId);
  if (p) return { ...p, prefs: { ...DEFAULT_PREFS, ...p.prefs } };
  const fresh: LearnProfile = { id: accountId, course: "csa", prefs: { ...DEFAULT_PREFS }, lessons: {}, recent: [], updatedAt: Date.now() };
  await db.learn.put(fresh);
  return fresh;
}

export async function updateProfile(accountId: string, change: (p: LearnProfile) => LearnProfile) {
  return db.transaction("rw", db.learn, async () => {
    const p = await getProfile(accountId);
    const next = { ...change(p), updatedAt: Date.now() };
    await db.learn.put(next);
    return next;
  });
}

export const setCourse = (accountId: string, course: Course) => updateProfile(accountId, (p) => ({ ...p, course }));
export const setPrefs = (accountId: string, prefs: Partial<LearnPrefs>) => updateProfile(accountId, (p) => ({ ...p, prefs: { ...p.prefs, ...prefs } }));

export function addRecent(accountId: string, kind: LearnProfile["recent"][number]["kind"], ref: string, label: string) {
  return updateProfile(accountId, (p) => ({
    ...p,
    recent: [{ kind, ref, label, at: Date.now() }, ...p.recent.filter((r) => !(r.kind === kind && r.ref === ref))].slice(0, 12),
  }));
}

export function markLesson(accountId: string, lessonId: string, status: "started" | "done", right = 0, total = 0) {
  return updateProfile(accountId, (p) => {
    const prev = p.lessons[lessonId];
    const keepDone = prev?.status === "done" && status === "started";
    return {
      ...p,
      lessons: {
        ...p.lessons,
        [lessonId]: keepDone ? { ...prev, at: Date.now() } : { status, right: total ? right : prev?.right || 0, total: total || prev?.total || 0, at: Date.now() },
      },
    };
  });
}

export async function recordAttempt(a: Omit<Attempt, "id" | "at"> & { at?: number }) {
  const row: Attempt = {
    ...a,
    at: a.at ?? Date.now(),
    given: a.given?.slice(0, 300),
    expected: a.expected?.slice(0, 300),
    prompt: a.prompt?.slice(0, 400),
    code: a.code?.slice(0, 1200),
  };
  try {
    await db.attempts.add(row);
    const n = await db.attempts.where("accountId").equals(a.accountId).count();
    if (n > MAX_ATTEMPTS) {
      const old = await db.attempts.where("[accountId+at]").between([a.accountId, 0], [a.accountId, Infinity]).limit(n - MAX_ATTEMPTS).primaryKeys();
      await db.attempts.bulkDelete(old);
    }
  } catch {
    // Tracking is best-effort; never break a battle or lesson over it.
  }
}

export const recentAttempts = (accountId: string, limit = 400) =>
  db.attempts.where("[accountId+at]").between([accountId, 0], [accountId, Infinity]).reverse().limit(limit).toArray();

// ---- Conversations ----
const uuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `c${Date.now()}${Math.random().toString(36).slice(2)}`);

export async function createConversation(accountId: string, course: Course, title: string, extra: Partial<Conversation> = {}) {
  const c: Conversation = { id: uuid(), accountId, course, title: title.slice(0, 80), messages: [], createdAt: Date.now(), updatedAt: Date.now(), ...extra };
  await db.conversations.put(c);
  return c;
}

export const listConversations = (accountId: string) =>
  db.conversations.where("[accountId+updatedAt]").between([accountId, 0], [accountId, Infinity]).reverse().toArray();

export const getConversation = (id: string) => db.conversations.get(id);

export async function appendMessages(id: string, messages: ChatMessage[], title?: string) {
  return db.transaction("rw", db.conversations, async () => {
    const c = await db.conversations.get(id);
    if (!c) return null;
    const next: Conversation = { ...c, messages: [...c.messages, ...messages].slice(-MAX_MESSAGES), updatedAt: Date.now(), title: title ?? c.title };
    await db.conversations.put(next);
    return next;
  });
}

export async function replaceMessages(id: string, messages: ChatMessage[]) {
  const c = await db.conversations.get(id);
  if (!c) return null;
  const next = { ...c, messages, updatedAt: Date.now() };
  await db.conversations.put(next);
  return next;
}

export const deleteConversation = (id: string) => db.conversations.delete(id);

// Clears what the tutor uses to personalize: preferences, practice and mistake history.
// Game progress (stars, coins, battle skill tallies) and saved conversations are kept.
export async function resetPersonalization(accountId: string) {
  await db.transaction("rw", db.learn, db.attempts, async () => {
    await db.attempts.where("accountId").equals(accountId).delete();
    const p = await getProfile(accountId);
    await db.learn.put({ ...p, prefs: { ...DEFAULT_PREFS }, recent: [], updatedAt: Date.now() });
  });
}
