"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { ChatSeed } from "@/components/learn/ChatPanel";
import LearnShell from "@/components/learn/LearnShell";
import PracticeRunner, { type RunSummary } from "@/components/learn/PracticeRunner";
import TutorDrawer from "@/components/learn/TutorDrawer";
import { Button } from "@/components/ui";
import type { Course } from "@/lib/db";
import { lessonById, lessonForSkill, lessonsFor } from "@/lib/learn/lessons";
import { DIFFICULTY, buildPracticeSet, type Difficulty } from "@/lib/learn/practice";
import { addRecent, setCourse } from "@/lib/learn/store";
import { useLearn } from "@/lib/learn/useLearn";
import SyncStatus from "@/components/cloud/SyncStatus";
import { assignmentFor } from "@/lib/cloud/home";

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-sky" />}>
      <Practice />
    </Suspense>
  );
}

function Practice() {
  const params = useSearchParams();
  const router = useRouter();
  const { account, progress, profile, attempts, reload, warm } = useLearn();
  const skill = params.get("skill") || undefined;
  const lessonParam = params.get("lesson") || (skill ? lessonForSkill(skill, profile?.course)?.id : undefined) || "";
  const difficulty = (DIFFICULTY.some((d) => d.id === params.get("difficulty")) ? params.get("difficulty") : "mixed") as Difficulty;
  const [count, setCount] = useState(() => Math.max(3, Math.min(20, Number(params.get("count")) || 5)));
  const [running, setRunning] = useState(false);
  const [round, setRound] = useState(0);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [seed, setSeed] = useState<ChatSeed | null>(null);
  const [focusSkill, setFocusSkill] = useState<string | undefined>(skill);

  useEffect(() => setFocusSkill(skill), [skill]);
  // Arriving with a topic (from a recommendation or a mistake) starts right away.
  useEffect(() => {
    if (params.get("lesson") || params.get("skill")) setRunning(true);
  }, [params]);

  const lesson = lessonById(lessonParam);
  const assignment = useMemo(() => assignmentFor(params.get("assignment"), (a) => a.target.kind === "practice" && a.target.lessonId === lesson?.id), [params, lesson?.id]);
  const course: Course = lesson?.course || profile?.course || "csa";
  const items = useMemo(
    () => buildPracticeSet({ course, lessonId: lesson?.id, skill: focusSkill, difficulty, count, seed: Date.now() % 1_000_000 + round }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [course, lesson?.id, focusSkill, difficulty, count, round],
  );

  if (!account || !progress) return <div className="min-h-dvh bg-sky" />;
  const set = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) v ? q.set(k, v) : q.delete(k);
    router.replace(`/learn/practice/?${q.toString()}`, { scroll: false });
  };
  const change = async (c: Course) => {
    await setCourse(account.id, c);
    await reload();
    set({ lesson: undefined, skill: undefined });
  };
  const start = () => {
    setSummary(null);
    setRound((r) => r + 1);
    setRunning(true);
    if (lesson) void addRecent(account.id, "practice", lesson.id, `Practice: ${lesson.title}`);
  };
  const done = async (s: RunSummary) => {
    setSummary(s);
    setRunning(false);
    await reload();
  };
  const ask = (focus: string, action: string, text: string) => {
    setSeed({ focus, action, text, lessonId: lesson?.id, title: `${action === "why-wrong" ? "Why wrong" : "Help"}: ${lesson?.title || "practice"}`, key: Date.now() });
    setDrawer(true);
  };

  return (
    <LearnShell account={account} progress={progress} profile={profile} warm={warm} onCourse={change}>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <section className={`card flex flex-col gap-3 p-5 ${running ? "order-2 lg:order-none" : ""}`} aria-labelledby="setup">
          <h2 id="setup" className="font-display text-2xl">Practice set</h2>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-black uppercase tracking-wider text-ink-soft">Topic</span>
            <select value={lesson?.id || ""} onChange={(e) => set({ lesson: e.target.value || undefined, skill: undefined })} className="rounded-xl border-[3px] border-line bg-white px-3 py-2 font-bold text-ink">
              <option value="">Mixed: whole course</option>
              {lessonsFor(course).map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-black uppercase tracking-wider text-ink-soft">Difficulty</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Difficulty">
              {DIFFICULTY.map((d) => (
                <button key={d.id} type="button" role="radio" aria-checked={difficulty === d.id} onClick={() => set({ difficulty: d.id })} className="rounded-xl border-[3px] px-3 py-1.5 text-sm font-black" style={{ borderColor: difficulty === d.id ? "#2D9CDB" : "#D5E4F5", background: difficulty === d.id ? "#E2F3FF" : "#FFFFFF", color: "#1F2440" }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-black uppercase tracking-wider text-ink-soft">Questions</span>
            <div className="flex gap-2" role="radiogroup" aria-label="Number of questions">
              {[3, 5, 8].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={count === n} onClick={() => setCount(n)} className="w-12 rounded-xl border-[3px] py-1.5 text-sm font-black" style={{ borderColor: count === n ? "#2D9CDB" : "#D5E4F5", background: count === n ? "#E2F3FF" : "#FFFFFF" }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          {focusSkill && (
            <div className="rounded-2xl bg-[#FFF5F5] px-3 py-2 text-sm font-bold text-ink">
              Focused on <span className="font-black">{focusSkill}</span>
              <button type="button" className="ml-2 font-black text-ocean-deep hover:underline" onClick={() => set({ skill: undefined })}>clear</button>
            </div>
          )}
          <p className="text-xs font-bold text-ink-mute">Every answer key here was checked by compiling and running Java, or against a reference program for CSP pseudocode. Misses bring a follow-up question on the same idea.</p>
          <Button tone="ocean" onClick={start}>{running ? "NEW SET" : "START"}</Button>
        </section>

        <div className={`min-w-0 ${running ? "order-1 lg:order-none" : ""}`}>
          {running && profile && items.length > 0 ? (
            <PracticeRunner accountId={account.id} course={course} prefs={profile.prefs} items={items} source="practice" onDone={done} onAskTutor={ask} report={{ lessonId: lesson?.id, classId: assignment?.classId, assignmentId: assignment?.id }} />
          ) : summary ? (
            <section className="card flex flex-col gap-3 p-5 sm:p-6">
              <div className="font-display text-3xl">Set complete</div>
              <p className="text-lg font-bold text-ink">
                {summary.firstTry} of {summary.total} right on the first try.
              </p>
              {assignment && <p className="font-bold text-ink-soft">For your class assignment: {assignment.title}</p>}
              <SyncStatus sessionId={summary.runId} assigned={!!assignment} />
              {summary.missedSkills.length > 0 ? (
                <div>
                  <p className="font-bold text-ink-soft">These came up as misses. Practicing one directly is the fastest fix:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {summary.missedSkills.map((s) => (
                      <Button key={s} size="sm" tone="white" onClick={() => { set({ skill: s }); setFocusSkill(s); start(); }}>
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="font-bold text-ink-soft">No misses. Try a harder difficulty or another topic.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button onClick={start}>ANOTHER SET</Button>
                {difficulty !== "exam" && <Button tone="white" onClick={() => { set({ difficulty: "exam" }); start(); }}>HARDER</Button>}
              </div>
            </section>
          ) : (
            <section className="card flex flex-col gap-2 p-6">
              <h2 className="font-display text-2xl">Pick a topic and difficulty</h2>
              <p className="font-bold text-ink-soft">You&apos;ll get multiple choice, code tracing, find-the-bug and line-ordering questions, plus the occasional short written explanation. Two tries each, with a hint if you want one.</p>
            </section>
          )}
        </div>
      </div>
      {profile && <TutorDrawer open={drawer} onClose={() => setDrawer(false)} seed={seed} accountId={account.id} profile={profile} progress={progress} attempts={attempts} lessonId={lesson?.id} />}
    </LearnShell>
  );
}
