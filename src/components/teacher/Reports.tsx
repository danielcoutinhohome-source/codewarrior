"use client";

import { useState } from "react";
import { Button } from "../ui";
import { api, errorText } from "@/lib/cloud/client";
import { toCsv, type SessionSummary } from "@/lib/cloud/protocol";
import { runLabel } from "./labels";
import type { Attempt, Summary } from "./types";

type ExportData = { sessions: SessionSummary[]; attempts: (Attempt & { studentName: string; world: number | null; battle: number | null; enemy: string | null; lessonId: string | null; assignmentId: string | null })[] };
const iso = (t: number | null | undefined) => (t ? new Date(t).toISOString() : "");

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Filters genuine records on the server and exports them as CSV. Cells that a spreadsheet
// would run as formulas are prefixed with a quote (see csvCell).
export default function Reports({ data }: { data: Summary }) {
  const [student, setStudent] = useState("");
  const [assignment, setAssignment] = useState("");
  const [topic, setTopic] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState<ExportData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const titles = new Map(data.assignments.map((a) => [a.id, a.title]));

  const run = async () => {
    setBusy(true);
    const q = new URLSearchParams();
    if (student) q.set("student", student);
    if (assignment) q.set("assignment", assignment);
    if (topic) q.set("topic", topic);
    if (from) q.set("from", String(new Date(`${from}T00:00`).getTime()));
    if (to) q.set("to", String(new Date(`${to}T00:00`).getTime() + 86_400_000));
    try {
      setResult(await api<ExportData>("GET", `/classes/${data.class.id}/export?${q}`));
      setErr(null);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const slug = data.class.name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "class";
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="font-display text-2xl">Reports</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Select label="Student" value={student} onChange={setStudent} options={[...data.students, ...data.formerMembers].map((s) => [s.id, s.name])} />
          <Select label="Assignment" value={assignment} onChange={setAssignment} options={data.assignments.map((a) => [a.id, a.title])} />
          <Select label="Topic" value={topic} onChange={setTopic} options={data.skills.map((s) => [s.skill, s.skill])} />
          <label className="field-label" htmlFor="r-from">From<input id="r-from" type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="field-label" htmlFor="r-to">To (including)<input id="r-to" type="date" className="field" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <p className="text-xs font-bold text-ink-mute">Dates use your time zone. Times in the CSV are UTC (ISO 8601).</p>
        <div><Button tone="ocean" onClick={() => void run()} disabled={busy}>{busy ? "LOADING…" : "SHOW RECORDS"}</Button></div>
        {err && <p role="alert" className="font-black text-danger-deep">{err}</p>}
      </section>

      {result && (
        <section className="card flex flex-col gap-3 p-5">
          <p className="font-bold text-ink">{result.sessions.length} battle/practice run{result.sessions.length === 1 ? "" : "s"} and {result.attempts.length} answer{result.attempts.length === 1 ? "" : "s"} match.</p>
          <div className="flex flex-wrap gap-2">
            <Button tone="white" disabled={!result.sessions.length} onClick={() => download(`${slug}-results-${stamp}.csv`, toCsv(
              ["Student", "Activity", "Assignment", "Outcome", "Stars", "First try right", "Questions", "Answered", "Retries", "Hints", "Started (UTC)", "Finished (UTC)", "Received (UTC)", "Run ID"],
              result.sessions.map((s) => [s.studentName, runLabel(s), s.assignmentId ? titles.get(s.assignmentId) ?? "" : "", s.outcome, s.stars ?? "", s.firstTry, s.questionCount, s.answered, s.retries, s.hintsUsed, iso(s.startedAt), iso(s.finishedAt), iso(s.receivedAt), s.id]),
            ))}>DOWNLOAD RESULTS CSV</Button>
            <Button tone="white" disabled={!result.attempts.length} onClick={() => download(`${slug}-answers-${stamp}.csv`, toCsv(
              ["Student", "Activity", "Assignment", "Question #", "Round", "Try", "Topic", "Question type", "Question", "Code", "Student answer", "Answer key", "Correct", "Hint used", "Question bank version", "Received (UTC)", "Run ID", "Question ID"],
              result.attempts.map((a) => [a.studentName, runLabel({ kind: a.world !== null ? "battle" : "practice", world: a.world, battle: a.battle, lessonId: a.lessonId }), a.assignmentId ? titles.get(a.assignmentId) ?? "" : "", a.index + 1, a.round + 1, a.tryNo + 1, a.skill, a.kind, a.prompt, a.code ?? "", a.given, a.expected ?? "", a.correct === null ? "not graded" : a.correct ? "yes" : "no", a.hinted ? "yes" : "no", a.contentVersion, iso(a.receivedAt), a.sessionId, a.questionId]),
            ))}>DOWNLOAD ANSWERS CSV</Button>
          </div>
        </section>
      )}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  const id = `r-${label.toLowerCase()}`;
  return (
    <label className="field-label" htmlFor={id}>
      {label}
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
