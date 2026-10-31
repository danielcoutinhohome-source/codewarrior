"use client";

import { useMemo, useState } from "react";
import { Button } from "../ui";
import { api, errorText } from "@/lib/cloud/client";
import { MIN_FIRST_TRIES, ago, pct, type Summary } from "./types";

type Sort = "name" | "joined" | "activity" | "accuracy" | "done";

export default function Roster({ data, onStudent, onChanged }: { data: Summary; onStudent: (id: string) => void; onChanged: () => void }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const published = data.assignments.filter((a) => a.status === "published");
  const rows = useMemo(() => {
    const r = data.students
      .filter((s) => !q || `${s.name} ${s.username}`.toLowerCase().includes(q.toLowerCase()))
      .map((s) => {
        const tries = s.skills.reduce((n, k) => n + k.firstTries, 0);
        const miss = s.skills.reduce((n, k) => n + k.missed, 0);
        const done = published.filter((a) => data.assignmentStates[a.id]?.[s.id]?.state === "completed").length;
        return { s, tries, acc: tries >= MIN_FIRST_TRIES ? (tries - miss) / tries : null, done };
      });
    const by: Record<Sort, (a: (typeof r)[0], b: (typeof r)[0]) => number> = {
      name: (a, b) => a.s.name.localeCompare(b.s.name),
      joined: (a, b) => b.s.joinedAt - a.s.joinedAt,
      activity: (a, b) => (b.s.lastActivity || 0) - (a.s.lastActivity || 0),
      accuracy: (a, b) => (a.acc ?? 2) - (b.acc ?? 2),
      done: (a, b) => a.done - b.done,
    };
    return r.sort(by[sort]);
  }, [data, q, sort, published]);

  const remove = async (id: string) => {
    try {
      await api("DELETE", `/classes/${data.class.id}/members/${id}`);
      setConfirm(null);
      onChanged();
    } catch (e) {
      setErr(errorText(e));
    }
  };

  return (
    <section className="card min-w-0 p-5" aria-labelledby="roster-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="roster-title" className="font-display text-2xl">Roster ({data.students.length})</h2>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="roster-q">Search students</label>
          <input id="roster-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="rounded-xl border-2 border-line bg-white px-3 py-1.5 text-sm font-bold" />
          <label className="flex items-center gap-2 text-sm font-black text-ink-soft">
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-xl border-2 border-line bg-white px-2 py-1 text-ink">
              <option value="name">Name</option>
              <option value="joined">Newest</option>
              <option value="activity">Last activity</option>
              <option value="accuracy">Lowest accuracy</option>
              <option value="done">Fewest assignments done</option>
            </select>
          </label>
        </div>
      </div>
      {err && <p role="alert" className="mt-2 font-black text-danger-deep">{err}</p>}
      {data.students.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-sky p-6 text-center font-bold text-ink-mute">No students yet. Share the class code (Settings tab) and they&apos;ll appear here as they join.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] font-black uppercase tracking-wider text-ink-mute">
                <th className="py-2 pr-2">Student</th>
                <th className="px-2">Joined</th>
                <th className="px-2">Last recorded activity</th>
                <th className="px-2 text-right">Won / lost</th>
                <th className="px-2 text-right" title="Right on the first try without a hint">First-try</th>
                <th className="px-2 text-right">Assignments</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, tries, acc, done }) => (
                <tr key={s.id} className="border-t-2 border-line align-top">
                  <td className="py-2 pr-2">
                    <button type="button" onClick={() => onStudent(s.id)} className="text-left font-black text-ocean-deep hover:underline">{s.name}</button>
                    <div className="text-xs font-bold text-ink-mute">{s.username}{s.sharePlay ? "" : " · sharing only assigned work"}</div>
                  </td>
                  <td className="px-2 py-2 font-bold text-ink-soft">{new Date(s.joinedAt).toLocaleDateString()}</td>
                  <td className="px-2 py-2 font-bold text-ink-soft">{ago(s.lastActivity)}</td>
                  <td className="px-2 py-2 text-right font-black tabular-nums">{s.wins} / {s.losses}{s.abandoned ? <span className="block text-xs font-bold text-ink-mute">{s.abandoned} left early</span> : null}</td>
                  <td className="px-2 py-2 text-right font-black tabular-nums" style={{ color: acc !== null && acc < 0.6 ? "#D9434A" : undefined }}>{acc === null ? <span className="text-xs font-bold text-ink-mute">{tries ? `${tries} so far` : "–"}</span> : `${pct(acc * 100, 100)}%`}</td>
                  <td className="px-2 py-2 text-right font-black tabular-nums">{published.length ? `${done}/${published.length}` : "–"}</td>
                  <td className="py-2 pl-1 text-right">
                    {confirm === s.id ? (
                      <span className="inline-flex flex-col items-end gap-1">
                        <span className="text-xs font-black text-danger-deep">Remove {s.name}? Their past work stays in your reports.</span>
                        <span className="flex gap-1">
                          <Button size="sm" tone="white" onClick={() => setConfirm(null)}>KEEP</Button>
                          <Button size="sm" tone="danger" onClick={() => void remove(s.id)}>REMOVE</Button>
                        </span>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirm(s.id)} className="rounded-lg px-2 py-1 text-xs font-black text-ink-mute hover:bg-danger-soft hover:text-danger-deep">Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.formerMembers.length > 0 && (
        <div className="mt-4 border-t-2 border-line pt-3">
          <h3 className="text-sm font-black text-ink-soft">Former members</h3>
          <ul className="mt-1 flex flex-wrap gap-2">
            {data.formerMembers.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => onStudent(m.id)} className="rounded-full bg-sky px-3 py-1 text-xs font-black text-ink-soft hover:text-ink">{m.name} · left {new Date(m.leftAt).toLocaleDateString()}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
