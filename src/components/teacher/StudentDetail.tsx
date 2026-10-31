"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "../ui";
import { api, errorText } from "@/lib/cloud/client";
import type { Feedback } from "@/lib/cloud/protocol";
import { BOSS, WORLDS } from "@/lib/game";
import { OUTCOME, Pill, STATE_LABEL, runLabel } from "./labels";
import { MIN_FIRST_TRIES, dateTime, pct, type StudentDetailData } from "./types";

// Everything recorded for one student in this class, summarized so a teacher can see what they
// struggled with without opening each battle. `version` changes when new results arrive.
export default function StudentDetail({ classId, studentId, version, onBack, onSession, feedbackFor }: { classId: string; studentId: string; version: number; onBack: () => void; onSession: (id: string) => void; feedbackFor?: { sessionId?: string; label?: string } | null }) {
  const [d, setD] = useState<StudentDetailData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setD(await api<StudentDetailData>("GET", `/classes/${classId}/students/${studentId}`));
      setErr(null);
    } catch (e) {
      setErr(errorText(e));
    }
  }, [classId, studentId]);
  useEffect(() => void load(), [load, version]);

  if (err && !d) return <section className="card p-5"><p role="alert" className="font-black text-danger-deep">{err}</p><Button size="sm" tone="white" onClick={() => void load()}>RETRY</Button></section>;
  if (!d) return <section className="card p-5 font-bold text-ink-mute">Loading…</section>;

  const firstRound = d.attempts.filter((a) => a.round === 0 && a.tryNo === 0 && a.correct !== null);
  const skills = new Map<string, { n: number; miss: number; eventual: number; hints: number }>();
  for (const a of firstRound) {
    const s = skills.get(a.skill) || { n: 0, miss: 0, eventual: 0, hints: 0 };
    s.n++;
    if (!a.correct || a.hinted) s.miss++;
    if (a.hinted) s.hints++;
    skills.set(a.skill, s);
  }
  // Eventually right: any later try on the same question in the same run was right.
  for (const a of firstRound) {
    if (a.correct && !a.hinted) continue;
    if (d.attempts.some((b) => b.sessionId === a.sessionId && b.index === a.index && (b.round > 0 || b.tryNo > 0) && b.correct)) skills.get(a.skill)!.eventual++;
  }
  const skillRows = [...skills.entries()].sort((a, b) => b[1].miss / b[1].n - a[1].miss / a[1].n);
  const total = firstRound.length;
  const right = firstRound.filter((a) => a.correct && !a.hinted).length;
  // Trend: last 7 days vs before, only when both sides have enough answers.
  const cut = Date.now() - 7 * 86_400_000;
  const recentA = firstRound.filter((a) => a.receivedAt >= cut), olderA = firstRound.filter((a) => a.receivedAt < cut);
  const trend = recentA.length >= 10 && olderA.length >= 10 ? [pct(olderA.filter((a) => a.correct && !a.hinted).length, olderA.length), pct(recentA.filter((a) => a.correct && !a.hinted).length, recentA.length)] : null;
  const won = new Set(d.sessions.filter((s) => s.kind === "battle" && s.outcome === "won").map((s) => `${s.world}-${s.battle}`));
  const misses = d.attempts.filter((a) => a.correct === false).slice(0, 25);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button type="button" onClick={onBack} className="text-sm font-black text-ocean-deep hover:underline">← Back to class</button>
          <h2 className="font-display text-3xl">{d.student.name}</h2>
          <p className="text-sm font-bold text-ink-mute">
            {d.student.username} · {d.periods.map((p) => `in class ${new Date(p.joinedAt).toLocaleDateString()}–${p.leftAt ? `${new Date(p.leftAt).toLocaleDateString()} (${p.leftReason})` : "now"}`).join("; ")}
            {d.periods.some((p) => !p.leftAt && !p.sharePlay) ? " · shares assigned work only" : ""}
          </p>
        </div>
        <div className="text-right text-sm font-bold text-ink-soft">
          {total >= MIN_FIRST_TRIES ? <div className="font-display text-3xl text-ink">{pct(right, total)}%</div> : <div className="font-display text-3xl text-ink-mute">–</div>}
          first-try accuracy {total ? `(${total} questions)` : ""}
          {trend && <div>{trend[1] >= trend[0] ? "▲" : "▼"} {trend[0]}% before → {trend[1]}% in the last 7 days</div>}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="font-display text-xl">Assignments</h3>
          {d.assignments.length === 0 ? <p className="mt-2 font-bold text-ink-mute">No published assignments.</p> : (
            <ul className="mt-2 flex flex-col gap-2">
              {d.assignments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
                  <span className="text-ink">{a.title}</span>
                  <span className="flex items-center gap-2 text-ink-soft">{a.done}/{a.needed}<Pill v={a.state} map={STATE_LABEL} />{a.late && <span className="text-xs text-danger-deep">late</span>}</span>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-4 font-display text-xl">Worlds</h3>
          <p className="text-xs font-bold text-ink-mute">Battles won in work shared with this class.</p>
          <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {WORLDS.map((w, i) => (
              <div key={w.name} className="flex items-center justify-between gap-2 rounded-xl bg-sky px-2 py-1 text-xs font-black">
                <span className="truncate">{w.name}</span>
                <span className="flex gap-0.5">{[0, 1, 2, 3, BOSS].map((b) => <span key={b} title={`${b === BOSS ? "Boss" : `Battle ${b + 1}`}`} className="h-3 w-3 rounded-full" style={{ background: won.has(`${i}-${b}`) ? (b === BOSS ? "#FF8A00" : "#3EC46D") : "#CFDAE8" }} />)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h3 className="font-display text-xl">Topics</h3>
          <p className="text-xs font-bold text-ink-mute">First tries / missed first try / got it on a retry. Topics with fewer than {MIN_FIRST_TRIES} first tries are marked “early”.</p>
          {skillRows.length === 0 ? <p className="mt-2 font-bold text-ink-mute">No answers recorded yet.</p> : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {skillRows.map(([k, s]) => (
                <li key={k} className="text-sm font-bold">
                  <div className="flex justify-between gap-2"><span className="text-ink">{k}{s.n < MIN_FIRST_TRIES && <span className="ml-1 text-xs text-ink-mute">(early)</span>}</span><span className="tabular-nums text-ink-soft">{s.n} / <span className={s.miss ? "text-danger-deep" : ""}>{s.miss}</span> / {s.eventual}{s.hints ? ` · ${s.hints} hint${s.hints === 1 ? "" : "s"}` : ""}</span></div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-sky"><div className="h-full rounded-full" style={{ width: `${pct(s.miss, s.n)}%`, background: "#FF5A5F" }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-5">
        <h3 className="font-display text-xl">Recent wrong answers</h3>
        {misses.length === 0 ? <p className="mt-2 font-bold text-ink-mute">None recorded.</p> : (
          <ul className="mt-2 flex flex-col gap-2">
            {misses.map((a) => (
              <li key={`${a.sessionId}-${a.index}-${a.round}-${a.tryNo}`} className="rounded-xl border-2 border-line px-3 py-2 text-sm">
                <div className="text-xs font-black uppercase tracking-wider text-ink-mute">{a.skill} · {dateTime(a.receivedAt)}</div>
                <div className="font-bold text-ink">{a.prompt}</div>
                {a.code && <pre className="mt-1 overflow-x-auto rounded-lg bg-[#F3F7FD] p-2 font-mono text-xs">{a.code}</pre>}
                <div className="mt-1 font-bold"><span className="text-danger-deep">Answered:</span> <span className="whitespace-pre-wrap font-mono">{a.given}</span>{a.expected ? <> · <span className="text-[#1E7A3E]">Key:</span> <span className="whitespace-pre-wrap font-mono">{a.expected}</span></> : null}</div>
                <button type="button" onClick={() => onSession(a.sessionId)} className="mt-1 text-xs font-black text-ocean-deep hover:underline">Open the whole run</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card min-w-0 p-5">
        <h3 className="font-display text-xl">Battle and practice history</h3>
        {d.sessions.length === 0 ? <p className="mt-2 font-bold text-ink-mute">Nothing shared with this class yet.</p> : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-left text-[11px] font-black uppercase tracking-wider text-ink-mute"><th className="py-1">When</th><th>Activity</th><th>Result</th><th className="text-right">First try</th><th className="text-right">Retries</th><th className="text-right">Hints</th></tr></thead>
              <tbody>
                {d.sessions.map((s) => (
                  <tr key={s.id} className="cursor-pointer border-t-2 border-line hover:bg-sky" onClick={() => onSession(s.id)}>
                    <td className="py-1.5 font-bold text-ink-soft">{dateTime(s.startedAt)}</td>
                    <td className="font-bold text-ink">{runLabel(s)}{s.assignmentTitle ? <span className="block text-xs text-ink-mute">{s.assignmentTitle}</span> : null}</td>
                    <td><Pill v={s.outcome} map={OUTCOME} /> {s.stars ? `${s.stars}★` : ""}</td>
                    <td className="text-right font-black tabular-nums">{s.firstTry}/{s.questionCount}</td>
                    <td className="text-right tabular-nums">{s.retries}</td>
                    <td className="text-right tabular-nums">{s.hintsUsed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <FeedbackCard classId={classId} studentId={studentId} items={d.feedback} assignments={d.assignments} preset={feedbackFor} onSaved={load} />
    </div>
  );
}

function FeedbackCard({ classId, studentId, items, assignments, preset, onSaved }: { classId: string; studentId: string; items: Feedback[]; assignments: { id: string; title: string }[]; preset?: { sessionId?: string; label?: string } | null; onSaved: () => void }) {
  const [body, setBody] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  return (
    <section className="card p-5" id="feedback">
      <h3 className="font-display text-xl">Feedback</h3>
      <p className="text-xs font-bold text-ink-mute">Only this student (and you) can see it. Feedback is separate from game stars; there&apos;s no grade.</p>
      <form
        className="mt-2 flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api("POST", `/classes/${classId}/feedback`, { studentId, body, assignmentId: assignmentId || undefined, sessionId: preset?.sessionId });
            setBody("");
            setErr(null);
            onSaved();
          } catch (e2) {
            setErr(errorText(e2));
          }
        }}
      >
        {preset?.label && <p className="text-sm font-black text-ocean-deep">About: {preset.label}</p>}
        <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 2000))} rows={3} aria-label="Feedback" className="w-full rounded-2xl border-[3px] border-line bg-[#F5FAFF] px-3 py-2 font-semibold text-ink outline-none focus:border-ocean" placeholder="What went well, what to practice next…" />
        <div className="flex flex-wrap items-center gap-2">
          <select value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} aria-label="Related assignment" className="rounded-xl border-2 border-line bg-white px-2 py-1.5 text-sm font-bold">
            <option value="">Not about a specific assignment</option>
            {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
          <Button size="sm" tone="ocean" type="submit" disabled={!body.trim()}>SEND FEEDBACK</Button>
        </div>
        {err && <p role="alert" className="text-sm font-black text-danger-deep">{err}</p>}
      </form>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((f) => (
          <li key={f.id} className="rounded-2xl bg-sky px-3 py-2">
            {editing === f.id ? (
              <div className="flex flex-col gap-2">
                <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={2} aria-label="Edit feedback" className="rounded-xl border-2 border-line px-2 py-1 font-semibold" />
                <div className="flex gap-2">
                  <Button size="sm" tone="white" onClick={() => setEditing(null)}>CANCEL</Button>
                  <Button size="sm" tone="ocean" onClick={async () => { await api("PATCH", `/feedback/${f.id}`, { body: editBody }); setEditing(null); onSaved(); }}>SAVE</Button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap font-bold text-ink">{f.body}</p>
                <p className="text-xs font-bold text-ink-mute">
                  {dateTime(f.createdAt)}{f.updatedAt > f.createdAt + 1000 ? " (edited)" : ""}{f.assignmentId ? ` · ${assignments.find((a) => a.id === f.assignmentId)?.title ?? "assignment"}` : ""}{f.sessionId ? " · about a specific run" : ""}
                  {" · "}<button type="button" className="font-black text-ocean-deep" onClick={() => { setEditing(f.id); setEditBody(f.body); }}>Edit</button>
                  {" · "}<button type="button" className="font-black text-danger-deep" onClick={async () => { await api("DELETE", `/feedback/${f.id}`); onSaved(); }}>Delete</button>
                </p>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
