"use client";

import { AnimatePresence, motion } from "framer-motion";
import { OUTCOME, Pill, runLabel } from "./labels";
import { MIN_FIRST_TRIES, ago, pct, type Summary } from "./types";

// Evidence-based class summary. Every number says what it's based on; with too little data
// it says so instead of guessing.
export default function Overview({ data, onSession, onStudent }: { data: Summary; onSession: (id: string) => void; onStudent: (id: string) => void }) {
  const students = data.students;
  const published = data.assignments.filter((a) => a.status === "published");
  const slots = published.length * students.length;
  const completed = published.reduce((n, a) => n + students.filter((s) => data.assignmentStates[a.id]?.[s.id]?.state === "completed").length, 0);
  const firstTries = data.skills.reduce((n, s) => n + s.firstTries, 0);
  const missed = data.skills.reduce((n, s) => n + s.missed, 0);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const recentRuns = data.recent.filter((r) => (r.finishedAt || r.receivedAt) >= weekAgo && r.outcome !== "in_progress");
  const attention = data.skills
    .filter((s) => s.firstTries >= MIN_FIRST_TRIES && s.missed / s.firstTries >= 0.4)
    .sort((a, b) => b.missed / b.firstTries - a.missed / a.firstTries)
    .slice(0, 6);
  const help = students
    .map((s) => {
      const tries = s.skills.reduce((n, k) => n + k.firstTries, 0);
      const miss = s.skills.reduce((n, k) => n + k.missed, 0);
      const overdue = published.filter((a) => data.assignmentStates[a.id]?.[s.id]?.state === "overdue").length;
      const reasons: string[] = [];
      if (tries >= 10 && (tries - miss) / tries < 0.6) reasons.push(`${pct(tries - miss, tries)}% right on the first try (${tries} questions)`);
      if (overdue) reasons.push(`${overdue} overdue assignment${overdue === 1 ? "" : "s"}`);
      if (s.losses >= 3 && s.losses > s.wins) reasons.push(`${s.losses} battles lost, ${s.wins} won`);
      return { s, reasons };
    })
    .filter((x) => x.reasons.length);
  const noData = students.filter((s) => s.runs === 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Enrolled" value={students.length} note={data.formerMembers.length ? `${data.formerMembers.length} left or removed` : "Students currently in the class"} />
        <Tile label="Assignments done" value={slots ? `${pct(completed, slots)}%` : "–"} note={slots ? `${completed} of ${slots} (published assignments × students)` : "No published assignments yet"} />
        <Tile label="Runs this week" value={recentRuns.length} note="Battles and practice finished or left in the last 7 days (latest 40 shown below)" />
        <Tile label="First-try accuracy" value={firstTries >= MIN_FIRST_TRIES ? `${pct(firstTries - missed, firstTries)}%` : "–"} note={firstTries >= MIN_FIRST_TRIES ? `Right on the first try without a hint, across ${firstTries} first-round questions` : "Not enough answers yet"} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card min-w-0 p-5" aria-labelledby="feed-title">
          <h2 id="feed-title" className="font-display text-2xl">Latest results</h2>
          <p className="text-sm font-bold text-ink-mute">New results appear here a few seconds after a student&apos;s device uploads them. Offline students upload when they reconnect.</p>
          {data.recent.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-sky p-5 text-center font-bold text-ink-mute">No results yet. They show up after students finish a battle or practice set.</p>
          ) : (
            <ul className="mt-3 flex flex-col">
              <AnimatePresence initial={false}>
                {data.recent.map((r) => (
                  <motion.li key={r.id} layout initial={{ opacity: 0, y: -6, backgroundColor: "#FFF6CC" }} animate={{ opacity: 1, y: 0, backgroundColor: "#FFFFFF" }} transition={{ duration: 0.6 }} className="rounded-xl">
                    <button type="button" onClick={() => onSession(r.id)} className="flex w-full flex-wrap items-center justify-between gap-2 border-b-2 border-line px-2 py-2 text-left hover:bg-sky">
                      <span className="min-w-0">
                        <span className="font-black text-ink">{r.studentName}</span>
                        <span className="text-sm font-bold text-ink-soft"> · {runLabel(r)}{r.assignmentTitle ? ` · ${r.assignmentTitle}` : ""}</span>
                      </span>
                      <span className="flex items-center gap-2 text-sm font-bold text-ink-soft">
                        <Pill v={r.outcome} map={OUTCOME} />
                        {r.stars ? `${r.stars}★` : ""} {r.firstTry}/{r.questionCount} first try · {ago(r.finishedAt || r.receivedAt)}
                      </span>
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className="card p-5" aria-labelledby="topics-title">
            <h2 id="topics-title" className="font-display text-2xl">Topics needing attention</h2>
            <p className="text-sm font-bold text-ink-mute">Missed on the first try (or a hint was used) at least 40% of the time, with at least {MIN_FIRST_TRIES} first tries.</p>
            {attention.length ? (
              <ul className="mt-3 flex flex-col gap-3">
                {attention.map((s) => (
                  <li key={s.skill}>
                    <div className="flex justify-between gap-2 text-sm font-black"><span>{s.skill}</span><span className="text-danger-deep">{pct(s.missed, s.firstTries)}% missed</span></div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-sky"><div className="h-full rounded-full bg-danger" style={{ width: `${pct(s.missed, s.firstTries)}%` }} /></div>
                    <div className="text-xs font-bold text-ink-mute">{s.firstTries} first tries by {s.students} student{s.students === 1 ? "" : "s"}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 font-bold text-ink-mute">{firstTries < 20 ? "Not enough answers yet to call out topics." : "No topic is below that bar right now."}</p>
            )}
          </section>

          <section className="card p-5" aria-labelledby="help-title">
            <h2 id="help-title" className="font-display text-2xl">Students who may need help</h2>
            <p className="text-sm font-bold text-ink-mute">Flags: under 60% first-try accuracy over 10+ questions, an overdue assignment, or losing more battles than winning (3+ losses).</p>
            {help.length ? (
              <ul className="mt-3 flex flex-col gap-2">
                {help.map(({ s, reasons }) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => onStudent(s.id)} className="w-full rounded-xl bg-[#FFF5F5] px-3 py-2 text-left hover:bg-danger-soft">
                      <div className="font-black text-ink">{s.name}</div>
                      <div className="text-xs font-bold text-ink-soft">{reasons.join(" · ")}</div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 font-bold text-ink-mute">No one is flagged.</p>
            )}
            {noData.length > 0 && <p className="mt-3 text-xs font-bold text-ink-mute">No recorded work yet (not the same as struggling): {noData.map((s) => s.name).join(", ")}.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: React.ReactNode; note: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-[11px] font-black uppercase tracking-wider text-ink-mute">{label}</div>
      <div className="font-display text-3xl tabular-nums">{value}</div>
      <div className="text-xs font-bold text-ink-mute">{note}</div>
    </div>
  );
}
