"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "../ui";
import Code from "../Code";
import { api, errorText } from "@/lib/cloud/client";
import type { SessionSummary } from "@/lib/cloud/protocol";
import { OUTCOME, Pill, runLabel } from "./labels";
import { dateTime, type Attempt } from "./types";

// One recorded battle or practice run, question by question, with the student's actual
// answers. Opened from the activity feed, the roster and student detail.
export default function SessionModal({ classId, sessionId, onClose, onFeedback }: { classId: string; sessionId: string | null; onClose: () => void; onFeedback?: (s: SessionSummary) => void }) {
  const [data, setData] = useState<{ session: SessionSummary & { contentVersion: string; contextNote?: string | null; itemsUsed?: Record<string, number> }; attempts: Attempt[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setData(null);
    setErr(null);
    if (!sessionId) return;
    api<typeof data>("GET", `/classes/${classId}/sessions/${sessionId}`).then(setData, (e) => setErr(errorText(e)));
  }, [classId, sessionId]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const s = data?.session;
  const byQ = new Map<number, Attempt[]>();
  data?.attempts.forEach((a) => byQ.set(a.index, [...(byQ.get(a.index) || []), a]));
  return (
    <AnimatePresence>
      {sessionId && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-[#1F2440]/55 p-3 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="run-title" className="card max-h-[92dvh] w-full max-w-3xl overflow-y-auto p-5 sm:p-6" initial={{ y: 20 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="run-title" className="font-display text-2xl leading-tight">{s ? `${s.studentName}: ${runLabel(s)}` : "Result"}</h2>
                {s && (
                  <p className="mt-1 text-sm font-bold text-ink-soft">
                    <Pill v={s.outcome} map={OUTCOME} /> {s.stars ? `${s.stars}★ · ` : ""}{s.firstTry}/{s.questionCount} right on the first try · {s.retries} retr{s.retries === 1 ? "y" : "ies"} · {s.hintsUsed} hint{s.hintsUsed === 1 ? "" : "s"}
                    {s.itemsUsed && Object.keys(s.itemsUsed).length ? ` · items: ${Object.entries(s.itemsUsed).map(([k, v]) => `${k} ×${v}`).join(", ")}` : ""}
                  </p>
                )}
                {s && <p className="text-xs font-bold text-ink-mute">Started {dateTime(s.startedAt)}{s.finishedAt ? ` · finished ${dateTime(s.finishedAt)}` : ""} · received {dateTime(s.receivedAt)} · question bank {s.contentVersion}{s.assignmentTitle ? ` · for “${s.assignmentTitle}”` : ""}{s.contextNote ? ` · not counted toward an assignment: ${s.contextNote}` : ""}</p>}
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl px-2 py-1 text-xl font-black text-ink-mute hover:bg-sky">✕</button>
            </div>
            {err && <p role="alert" className="mt-3 font-black text-danger-deep">{err}</p>}
            {!data && !err && <p className="mt-3 font-bold text-ink-mute">Loading…</p>}
            {data && data.attempts.length === 0 && <p className="mt-3 font-bold text-ink-mute">No answers were recorded for this run.</p>}
            <ol className="mt-4 flex flex-col gap-3">
              {[...byQ.entries()].sort((a, b) => a[0] - b[0]).map(([i, tries]) => {
                const q = tries[0];
                return (
                  <li key={i} className="rounded-2xl border-2 border-line p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-ink-mute">Q{i + 1} · {q.skill} · {q.kind}</span>
                      {q.expected && <span className="text-xs font-bold text-ink-mute">Answer key: <span className="font-mono text-ink">{q.expected.length > 60 ? q.expected.slice(0, 60) + "…" : q.expected}</span></span>}
                    </div>
                    <p className="mt-1 font-bold text-ink">{q.prompt}</p>
                    {q.code && <div className="mt-2 overflow-x-auto text-sm"><Code code={q.code} /></div>}
                    {q.options && q.kind === "choice" && <ol className="mt-1 list-[upper-alpha] pl-6 text-sm font-semibold text-ink-soft">{q.options.map((o, k) => <li key={k}>{o}</li>)}</ol>}
                    <ul className="mt-2 flex flex-col gap-1">
                      {tries.map((t) => (
                        <li key={`${t.round}-${t.tryNo}`} className="flex flex-wrap items-start gap-2 rounded-xl px-2 py-1 text-sm" style={{ background: t.correct === null ? "#F3F7FD" : t.correct ? "#E3F9EA" : "#FFE8EA" }}>
                          <span className="font-black" style={{ color: t.correct === null ? "#4A5175" : t.correct ? "#1E7A3E" : "#B42318" }}>
                            {t.round > 0 ? `Round ${t.round + 1}, ` : ""}try {t.tryNo + 1}: {t.correct === null ? "written answer" : t.correct ? "right" : "wrong"}{t.hinted ? " (hint used)" : ""}
                          </span>
                          <span className="min-w-0 whitespace-pre-wrap break-words font-mono text-[13px] text-ink">{t.given}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ol>
            {s && onFeedback && (
              <div className="mt-4 flex justify-end">
                <Button size="sm" tone="white" onClick={() => onFeedback(s)}>LEAVE FEEDBACK ON THIS</Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
