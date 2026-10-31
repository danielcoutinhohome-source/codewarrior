"use client";

import { getSession } from "../auth";
import { CONTENT_VERSION, getCloud, localIdFor } from "./client";
import { enqueue } from "./outbox";
import type { AttemptRecord, SessionFinish, SessionStart, SyncEvent } from "./protocol";

// Records a battle or practice run for the signed-in class account: a start event, one event
// per answer (saved as the run goes, so a closed tab loses little), and a finish event. Runs
// are only reported for a student class account whose warrior is the one playing.

const OPEN_KEY = "cw.cloud.open"; // runs in progress: id -> { userId, beat }
type Open = Record<string, { userId: string; beat: number }>;
const readOpen = (): Open => {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY) || "{}") || {};
  } catch {
    return {};
  }
};
const writeOpen = (o: Open) => {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify(o));
  } catch {}
};

export type Run = {
  id: string;
  attempt: (a: AttemptRecord) => void;
  finish: (r: SessionFinish) => Promise<void>;
  abandon: () => void;
  readonly finished: boolean;
};

export function reportingUser(): string | null {
  const c = getCloud();
  if (!c || c.me.role !== "student") return null;
  return getSession() === localIdFor(c.me.id) ? c.me.id : null;
}

export function startRun(s: Omit<SessionStart, "id" | "contentVersion">): Run | null {
  const userId = reportingUser();
  if (!userId) return null;
  const id = crypto.randomUUID();
  let finished = false;
  let chain = Promise.resolve();
  // Events are written in order; each write is awaited before the next so the queue order
  // matches play order even if the database is slow.
  const push = (e: SyncEvent) => (chain = chain.then(() => enqueue(userId, [e], { urgent: e.type !== "attempt" })).catch((err) => console.error("couldn't queue classroom event", err)));
  const open = readOpen();
  open[id] = { userId, beat: Date.now() };
  writeOpen(open);
  const beat = setInterval(() => {
    const o = readOpen();
    if (o[id]) {
      o[id].beat = Date.now();
      writeOpen(o);
    }
  }, 20_000);
  const close = () => {
    clearInterval(beat);
    const o = readOpen();
    delete o[id];
    writeOpen(o);
  };
  push({ id: crypto.randomUUID(), type: "session.start", at: Date.now(), session: { ...s, id, contentVersion: CONTENT_VERSION } });
  return {
    id,
    get finished() {
      return finished;
    },
    attempt: (a) => {
      if (!finished) push({ id: crypto.randomUUID(), type: "attempt", at: Date.now(), sessionId: id, attempt: a });
    },
    finish: async (r) => {
      if (finished) return;
      finished = true;
      close();
      push({ id: crypto.randomUUID(), type: "session.finish", at: Date.now(), sessionId: id, result: r });
      await chain;
    },
    abandon: () => {
      if (finished) return;
      finished = true;
      close();
      push({ id: crypto.randomUUID(), type: "session.abandon", at: Date.now(), sessionId: id });
    },
  };
}

// Runs left open by a closed tab or crash: marked abandoned (not completed) once they have
// had no heartbeat for two minutes, so a run still going in another tab is left alone.
export async function recoverAbandoned() {
  const o = readOpen();
  const stale = Object.entries(o).filter(([, v]) => Date.now() - v.beat > 120_000);
  if (!stale.length) return;
  for (const [id, v] of stale) {
    await enqueue(v.userId, [{ id: crypto.randomUUID(), type: "session.abandon", at: v.beat, sessionId: id }], { urgent: true });
    delete o[id];
  }
  writeOpen(o);
}
