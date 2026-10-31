"use client";

import { useState } from "react";
import { Button } from "../ui";
import { api, errorText } from "@/lib/cloud/client";
import type { Assignment, AssignmentTarget } from "@/lib/cloud/protocol";
import { BOSS, WORLDS } from "@/lib/game";
import { lessonsFor } from "@/lib/learn/lessons";
import { Pill, STATE_LABEL, battleLabel } from "./labels";
import type { Summary } from "./types";

const tzName = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};
const toLocalInput = (t: number | null) => {
  if (!t) return "";
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const due = (a: Assignment) => (a.dueAt ? `${new Date(a.dueAt).toLocaleString(undefined, { timeZone: a.dueTz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}` : "No due date");

export default function Assignments({ data, onChanged }: { data: Summary; onChanged: () => void }) {
  const [editing, setEditing] = useState<Assignment | "new" | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const archived = data.class.archived;

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setErr(null);
      onChanged();
    } catch (e) {
      setErr(errorText(e));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm font-bold text-ink-soft">Students see published assignments in their Class page and launch them from there. Only work started from the assignment counts toward it. Game stars are shown as recorded and aren&apos;t a grade.</p>
        {!editing && <Button tone="ocean" onClick={() => setEditing("new")} disabled={archived}>NEW ASSIGNMENT</Button>}
      </div>
      {archived && <p className="rounded-2xl bg-[#FFF6E5] px-4 py-2 font-bold text-[#6B4A00]">This class is archived, so new assignments can&apos;t be published. Unarchive it in Settings.</p>}
      {err && <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-2 font-black text-danger-deep">{err}</p>}
      {editing && <AssignmentForm key={editing === "new" ? "new" : editing.id} data={data} initial={editing === "new" ? null : editing} onDone={() => { setEditing(null); onChanged(); }} onCancel={() => setEditing(null)} />}

      {data.assignments.length === 0 && !editing ? (
        <p className="card p-6 text-center font-bold text-ink-mute">No assignments yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.assignments.map((a) => {
            const states = data.assignmentStates[a.id] || {};
            const count = (k: string) => data.students.filter((s) => states[s.id]?.state === k).length;
            return (
              <li key={a.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-ink">{a.title}</span>
                      <span className="rounded-full px-2 py-0.5 text-xs font-black" style={{ background: a.status === "published" ? "#E3F9EA" : "#EEF4FB", color: a.status === "published" ? "#1E7A3E" : "#4A5175" }}>{a.status === "published" ? "Published" : "Draft"}</span>
                      <span className="rounded-full bg-sky px-2 py-0.5 text-xs font-black text-ink-soft">{a.requireLaunch ? "Must play from assignment" : "Earlier wins count"}</span>
                      {a.version > 1 && <span className="text-xs font-bold text-ink-mute">edited (v{a.version})</span>}
                    </div>
                    <div className="text-xs font-bold text-ink-mute">{due(a)} · {a.target.kind === "battles" ? a.target.battles.map(([w, b]) => battleLabel(w, b)).join("; ") : `Practice: ${a.target.lessonTitle}, ${a.target.count} questions, ${a.target.difficulty}`}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" tone="white" onClick={() => setEditing(a)}>EDIT</Button>
                    {a.status === "published" ? (
                      <Button size="sm" tone="white" onClick={() => act(() => api("PATCH", `/assignments/${a.id}`, { status: "draft" }))}>UNPUBLISH</Button>
                    ) : (
                      <>
                        <Button size="sm" tone="grass" disabled={archived} onClick={() => act(() => api("PATCH", `/assignments/${a.id}`, { status: "published" }))}>PUBLISH</Button>
                        <Button size="sm" tone="white" onClick={() => act(() => api("DELETE", `/assignments/${a.id}`))}>DELETE</Button>
                      </>
                    )}
                  </div>
                </div>
                {a.status === "published" && (
                  <>
                    <button type="button" onClick={() => setOpen(open === a.id ? null : a.id)} className="mt-2 flex flex-wrap gap-2 text-xs font-black" aria-expanded={open === a.id}>
                      {(["completed", "in_progress", "not_started", "overdue"] as const).map((k) => (
                        <span key={k} className="rounded-full px-2 py-0.5" style={{ color: STATE_LABEL[k][1], background: STATE_LABEL[k][2] }}>{STATE_LABEL[k][0]}: {count(k)}</span>
                      ))}
                      <span className="text-ocean-deep">{open === a.id ? "Hide students" : "Show students"}</span>
                    </button>
                    {open === a.id && (
                      <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {data.students.map((s) => {
                          const st = states[s.id];
                          return (
                            <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-sky px-2 py-1 text-sm font-bold">
                              <span>{s.name}</span>
                              <span className="flex items-center gap-1">{st?.credits?.some((c) => !c.viaAssignment) && <span className="text-xs text-ink-mute" title="Credit from a win before or outside this assignment">earlier win</span>}{st ? `${st.done}/${st.needed}` : ""}{st && <Pill v={st.state} map={STATE_LABEL} />}{st?.late && <span className="text-xs text-danger-deep">late</span>}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AssignmentForm({ data, initial, onDone, onCancel }: { data: Summary; initial: Assignment | null; onDone: () => void; onCancel: () => void }) {
  const lessons = lessonsFor(data.class.course);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [kind, setKind] = useState<AssignmentTarget["kind"]>(initial?.target.kind ?? "battles");
  const [battles, setBattles] = useState<Set<string>>(new Set(initial?.target.kind === "battles" ? initial.target.battles.map(([w, b]) => `${w}-${b}`) : []));
  const [lessonId, setLessonId] = useState(initial?.target.kind === "practice" ? initial.target.lessonId : lessons[0]?.id ?? "");
  const [difficulty, setDifficulty] = useState(initial?.target.kind === "practice" ? initial.target.difficulty : "mixed");
  const [count, setCount] = useState(initial?.target.kind === "practice" ? initial.target.count : 8);
  const [dueAt, setDueAt] = useState(toLocalInput(initial?.dueAt ?? null));
  const [requireLaunch, setRequireLaunch] = useState(initial?.requireLaunch ?? false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = !!initial?.targetsLocked;
  const tz = initial?.dueTz && initial.dueAt ? initial.dueTz : tzName();

  const toggle = (k: string) => setBattles((s) => {
    const n = new Set(s);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    return n;
  });
  const save = async (status: "draft" | "published") => {
    setBusy(true);
    const lesson = lessons.find((l) => l.id === lessonId);
    const target: AssignmentTarget = kind === "battles"
      ? { kind, battles: [...battles].map((k) => k.split("-").map(Number) as [number, number]) }
      : { kind, lessonId, lessonTitle: lesson?.title ?? lessonId, difficulty: difficulty as "mixed", count };
    const body = { title, instructions, target, dueAt: dueAt ? new Date(dueAt).getTime() : null, dueTz: tzName(), status, requireLaunch };
    try {
      if (initial) await api("PATCH", `/assignments/${initial.id}`, locked ? { title, instructions, dueAt: body.dueAt, dueTz: body.dueTz, status, requireLaunch } : body);
      else await api("POST", `/classes/${data.class.id}/assignments`, body);
      onDone();
    } catch (e) {
      setErr(errorText(e));
      setBusy(false);
    }
  };
  const valid = title.trim() && (kind === "practice" ? !!lessonId : battles.size > 0);

  return (
    <section className="card flex flex-col gap-3 p-5" aria-labelledby="af-title">
      <h2 id="af-title" className="font-display text-2xl">{initial ? "Edit assignment" : "New assignment"}</h2>
      {initial?.status === "published" && <p className="text-sm font-bold text-ink-soft">Changes apply to work recorded from now on; earlier submissions keep the version they were made under (v{initial.version}).</p>}
      <label className="field-label" htmlFor="af-t">
        Title
        <input id="af-t" className="field" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="field-label" htmlFor="af-i">
        Instructions <span className="font-bold normal-case text-ink-mute">(optional)</span>
        <textarea id="af-i" className="field min-h-[80px]" maxLength={2000} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </label>
      <fieldset disabled={locked} className="flex flex-col gap-2">
        <legend className="text-[13px] font-black uppercase tracking-wider text-ink-soft">What to do</legend>
        {locked && <p className="text-sm font-bold text-[#6B4A00]">Students already have work on this assignment, so its battles or topic are locked. Create a new assignment to change them.</p>}
        <div className="flex gap-2">
          {([["battles", "Battles"], ["practice", "Topic practice"]] as const).map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-sm font-black" style={{ borderColor: kind === v ? "#2D9CDB" : "#D5E4F5", background: kind === v ? "#E2F3FF" : "#FFF" }}>
              <input type="radio" name="af-kind" checked={kind === v} onChange={() => setKind(v)} className="accent-[#2D9CDB]" /> {l}
            </label>
          ))}
        </div>
        {kind === "battles" ? (
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-2xl bg-sky p-3">
            {WORLDS.map((w, wi) => {
              const keys = [0, 1, 2, 3, BOSS].map((b) => `${wi}-${b}`);
              const all = keys.every((k) => battles.has(k));
              return (
                <div key={w.name}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black text-ink">{w.name}</span>
                    <button type="button" className="text-xs font-black text-ocean-deep" onClick={() => setBattles((s) => { const n = new Set(s); keys.forEach((k) => (all ? n.delete(k) : n.add(k))); return n; })}>{all ? "Clear world" : "Whole world"}</button>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {keys.map((k, b) => (
                      <label key={k} className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-bold">
                        <input type="checkbox" checked={battles.has(k)} onChange={() => toggle(k)} className="accent-[#2D9CDB]" />
                        {b === 4 ? "Boss" : `B${b + 1}`}: {w.enemies[b === 4 ? BOSS : b].name}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="field-label sm:col-span-3" htmlFor="af-l">
              Topic
              <select id="af-l" className="field" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
                {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </label>
            <label className="field-label" htmlFor="af-d">
              Difficulty
              <select id="af-d" className="field" value={difficulty} onChange={(e) => setDifficulty(e.target.value as "mixed")}>
                <option value="warmup">Warm-up</option>
                <option value="core">Core</option>
                <option value="exam">Exam</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>
            <label className="field-label" htmlFor="af-c">
              Questions
              <input id="af-c" className="field" type="number" min={3} max={20} value={count} onChange={(e) => setCount(Math.max(3, Math.min(20, Number(e.target.value) || 3)))} />
            </label>
          </div>
        )}
      </fieldset>
      <label className="flex items-start gap-3 rounded-2xl border-2 border-line px-4 py-3">
        <input type="checkbox" checked={requireLaunch} onChange={(e) => setRequireLaunch(e.target.checked)} className="mt-1 h-4 w-4 accent-[#2D9CDB]" />
        <span>
          <span className="block font-black text-ink">Students must play it from this assignment</span>
          <span className="text-sm font-bold text-ink-soft">
            {requireLaunch
              ? "On: only battles started from this assignment count, even if a student already won them. Use it to keep class time on this work."
              : "Off: if a student already won these battles (or finished this practice) on their class account, it counts and they don't have to redo it."}
          </span>
        </span>
      </label>
      <label className="field-label" htmlFor="af-due">
        Due <span className="font-bold normal-case text-ink-mute">(optional · {tz})</span>
        <input id="af-due" className="field" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      </label>
      {err && <p role="alert" className="rounded-2xl bg-danger-soft px-3 py-2 font-black text-danger-deep">{err}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button tone="white" onClick={onCancel}>CANCEL</Button>
        <Button tone="white" disabled={busy || !valid} onClick={() => void save("draft")}>{initial?.status === "published" ? "SAVE AS DRAFT (HIDE)" : "SAVE DRAFT"}</Button>
        <Button tone="grass" disabled={busy || !valid || data.class.archived} onClick={() => void save("published")}>{initial?.status === "published" ? "SAVE" : "PUBLISH"}</Button>
      </div>
    </section>
  );
}
