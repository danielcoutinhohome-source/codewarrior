"use client";

import { useSyncExternalStore } from "react";
import { db, type OutboxItem } from "../db";
import { CloudError, api, getCloud } from "./client";
import type { SyncEvent, SyncResponse } from "./protocol";

// Authenticated outbox. Every classroom event is written to IndexedDB first, then uploaded.
// An item is deleted only after the server acknowledges it (accepted, duplicate or rejected),
// so a closed tab, a dropped connection or a crash never loses a completed battle. Items are
// tagged with the class account that created them and are uploaded only while that same
// account is signed in.

export type SyncState = {
  state: "idle" | "syncing" | "offline" | "error" | "signed-out";
  pending: number; // for the signed-in account
  otherPending: number; // queued by other accounts on this device
  lastSyncAt: number | null;
  lastError: string | null;
  saved: Record<string, number>; // session id -> time the server confirmed every event
  rejected: number;
};

let status: SyncState = { state: "idle", pending: 0, otherPending: 0, lastSyncAt: null, lastError: null, saved: {}, rejected: 0 };
const listeners = new Set<() => void>();
const set = (p: Partial<SyncState>) => {
  status = { ...status, ...p };
  listeners.forEach((l) => l());
};
export const getSyncState = () => status;
export const useSyncState = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSyncState,
    getSyncState,
  );

const SAVED_KEY = "cw.cloud.saved";
try {
  if (typeof window !== "undefined") status.saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "{}") || {};
} catch {}
function markSaved(ids: string[]) {
  if (!ids.length) return;
  const saved = { ...status.saved };
  for (const id of ids) saved[id] = Date.now();
  // keep the 200 most recent
  const trimmed = Object.fromEntries(Object.entries(saved).sort((a, b) => b[1] - a[1]).slice(0, 200));
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(trimmed));
  } catch {}
  set({ saved: trimmed });
}

// Events are always written to the device first. Answers are then uploaded in small batches
// (a few seconds apart) to stay well inside the free plan's daily limits; the end of a run
// (and anything urgent) uploads immediately so the teacher sees results within seconds.
const BATCH_MS = 5000;
let batchTimer: ReturnType<typeof setTimeout> | null = null;
export async function enqueue(userId: string, events: SyncEvent[], opts: { urgent?: boolean } = {}) {
  const items: OutboxItem[] = events.map((e) => ({ id: e.id, userId, sessionId: e.type === "session.start" ? e.session.id : e.sessionId, event: e, createdAt: Date.now() }));
  await db.outbox.bulkAdd(items);
  await refreshCounts();
  if (opts.urgent) {
    if (batchTimer) clearTimeout(batchTimer);
    batchTimer = null;
    void flush();
  } else if (!batchTimer) {
    batchTimer = setTimeout(() => {
      batchTimer = null;
      void flush();
    }, BATCH_MS);
  }
}

async function refreshCounts() {
  // Counted from the indexes, not loaded: a long offline session can queue thousands of events.
  const me = getCloud()?.me.id;
  const [all, mine] = await Promise.all([db.outbox.count(), me ? db.outbox.where("userId").equals(me).count() : 0]);
  set({ pending: mine, otherPending: all - mine });
}

export async function pendingFor(sessionId: string) {
  return db.outbox.where("sessionId").equals(sessionId).count();
}

// ---- upload loop with bounded exponential backoff ----
let running: Promise<void> | null = null;
let failures = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

function schedule(ms: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, ms);
}

export function flush(): Promise<void> {
  if (running) return running;
  running = (async () => {
    try {
      await upload();
    } finally {
      running = null;
    }
  })();
  return running;
}

async function upload() {
  const session = getCloud();
  if (!session) {
    await refreshCounts();
    set({ state: "signed-out" });
    return;
  }
  const userId = session.me.id;
  for (;;) {
    // Index entries with the same userId are ordered by primary key (seq), so this is the
    // oldest 100 without loading the whole queue.
    const batch = await db.outbox.where("userId").equals(userId).limit(100).toArray();
    if (!batch.length) {
      failures = 0;
      await refreshCounts();
      set({ state: "idle", lastError: null });
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      set({ state: "offline" });
      return; // the "online" event restarts the loop
    }
    set({ state: "syncing" });
    let res: SyncResponse;
    try {
      res = await api<SyncResponse>("POST", "/sync", { events: batch.map((b) => b.event), sentAt: Date.now() }, { token: session.token, timeoutMs: 30_000 });
    } catch (e) {
      const err = e as CloudError;
      if (err.status === 401) {
        set({ state: "signed-out", lastError: "Sign in again to finish syncing." });
        return;
      }
      failures++;
      const offline = err.code === "network";
      const wait = err.retryAfter ? err.retryAfter * 1000 : Math.min(5 * 60_000, 1000 * 2 ** Math.min(failures, 8)) * (0.75 + Math.random() * 0.5);
      set({ state: offline ? "offline" : "error", lastError: err.message });
      schedule(wait);
      return;
    }
    // A different account signed in while we were waiting: drop nothing, just stop.
    if (getCloud()?.me.id !== userId) return;
    const acked = new Set(res.acks.map((a) => a.id));
    const rejected = res.acks.filter((a) => a.status === "rejected");
    if (rejected.length) console.warn("classroom sync rejected events", rejected);
    const done = batch.filter((b) => acked.has(b.id));
    await db.outbox.bulkDelete(done.map((b) => b.seq!));
    // A run counts as saved only when its finish (or abandon) event is acknowledged and none
    // of its events are still waiting. Early events of a run in progress don't count.
    const sessions = [...new Set(done.filter((b) => /^session\.(finish|abandon)$/.test((b.event as { type: string }).type)).map((b) => b.sessionId))];
    const stillPending = await Promise.all(sessions.map((s) => pendingFor(s)));
    markSaved(sessions.filter((_, i) => stillPending[i] === 0));
    failures = 0;
    set({ lastSyncAt: Date.now(), lastError: null, rejected: status.rejected + rejected.length });
    if (done.length === 0) {
      schedule(30_000); // server answered without acknowledging anything: try later
      return;
    }
  }
}

// Starts the background loop: on load, when the connection returns, when the tab becomes
// visible and once a minute while anything is waiting.
let started = false;
export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("online", () => void flush());
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && void flush());
  setInterval(() => {
    if (status.pending > 0 && !running) void flush();
  }, 60_000);
  void refreshCounts().then(() => flush());
}
