"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { ChatSeed } from "@/components/learn/ChatPanel";
import LearnShell from "@/components/learn/LearnShell";
import { CodeBlock, Inline } from "@/components/learn/Markdown";
import PracticeRunner, { type RunSummary } from "@/components/learn/PracticeRunner";
import TutorDrawer from "@/components/learn/TutorDrawer";
import { Button, ButtonLink } from "@/components/ui";
import { WORLDS } from "@/lib/game";
import { COURSE_LABEL, lessonById, lessonsFor } from "@/lib/learn/lessons";
import { buildPracticeSet } from "@/lib/learn/practice";
import { addRecent, markLesson, setCourse } from "@/lib/learn/store";
import { useLearn } from "@/lib/learn/useLearn";
import { play } from "@/lib/sfx";

export default function LessonPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-sky" />}>
      <Lesson />
    </Suspense>
  );
}

function Lesson() {
  const params = useSearchParams();
  const lesson = lessonById(params.get("id"));
  const { account, progress, profile, attempts, reload, warm } = useLearn();
  const [stage, setStage] = useState<"read" | "check" | "done">("read");
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [seed, setSeed] = useState<ChatSeed | null>(null);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    if (!account || !lesson) return;
    void markLesson(account.id, lesson.id, "started").then(() => addRecent(account.id, "lesson", lesson.id, lesson.title)).then(reload);
    // Opening a lesson from the other course switches the course to match.
    if (profile && profile.course !== lesson.course) void setCourse(account.id, lesson.course).then(reload);
    setStage("read");
    setSummary(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id, lesson?.id]);

  // Checkpoint: three verified questions from this lesson, including an authored one.
  const items = useMemo(() => (lesson ? buildPracticeSet({ course: lesson.course, lessonId: lesson.id, difficulty: "mixed", count: 3, includeExplain: false, seed: runKey * 7919 + lesson.id.length }) : []), [lesson, runKey]);

  if (!account || !progress) return <div className="min-h-dvh bg-sky" />;
  if (!lesson)
    return (
      <LearnShell account={account} progress={progress} profile={profile} warm={warm}>
        <div className="card p-6">
          <p className="font-bold">That lesson doesn&apos;t exist.</p>
          <ButtonLink href="/learn/lessons/" tone="white" className="mt-3">ALL LESSONS</ButtonLink>
        </div>
      </LearnShell>
    );

  const list = lessonsFor(lesson.course);
  const idx = list.findIndex((l) => l.id === lesson.id);
  const nextLesson = list[idx + 1];
  const ask = (text: string, action?: string, focus?: string) => {
    setSeed({ text, action, focus, lessonId: lesson.id, title: `${lesson.title}: ${text.slice(0, 40)}`, key: Date.now() });
    setDrawer(true);
  };
  const finish = async (s: RunSummary) => {
    setSummary(s);
    setStage("done");
    play("milestone");
    await markLesson(account.id, lesson.id, "done", s.firstTry, s.total);
    await reload();
  };

  return (
    <LearnShell account={account} progress={progress} profile={profile} warm={warm}>
      <article className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <header className="card p-5 sm:p-6">
            <div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-wider">
              <span className="rounded-full bg-xp-soft px-2.5 py-1 text-xp-deep">{COURSE_LABEL[lesson.course]}</span>
              <span className="rounded-full bg-sky px-2.5 py-1 text-ocean-deep">{lesson.unit}</span>
              <span className="rounded-full bg-sky px-2.5 py-1 text-ink-mute">{lesson.minutes} min</span>
            </div>
            <h2 className="mt-2 font-display text-[clamp(26px,3.6vw,38px)] leading-tight">{lesson.title}</h2>
            <p className="mt-2 rounded-2xl bg-[#F6F1FF] px-4 py-2.5 font-bold text-ink">
              <span className="font-black text-xp-deep">Goal: </span>
              {lesson.objective}
            </p>
            <div className="mt-4 flex flex-col gap-3 text-[16.5px] font-semibold leading-relaxed text-ink">
              {lesson.body.map((p, i) => (
                <p key={i}>
                  <Inline text={p} />
                </p>
              ))}
            </div>
          </header>

          <section className="card p-5 sm:p-6" aria-labelledby="ex-title">
            <div className="text-[13px] font-black uppercase tracking-wider text-ocean-deep">Worked example</div>
            <h3 id="ex-title" className="font-display text-2xl">{lesson.example.title}</h3>
            <div className="mt-3">
              <CodeBlock code={lesson.example.code} lang={lesson.example.lang === "java" ? "java" : undefined} />
            </div>
            <ol className="mt-3 flex list-decimal flex-col gap-1.5 pl-6 font-semibold text-ink">
              {lesson.example.steps.map((s, i) => (
                <li key={i}>
                  <Inline text={s} />
                </li>
              ))}
            </ol>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-ink-soft">Output:</span>
              <code className="whitespace-pre rounded-xl bg-[#1E2248] px-3 py-1.5 font-mono text-sm text-[#7FE0B4]">{lesson.example.output}</code>
              <span className="text-xs font-bold text-ink-mute">{lesson.example.lang === "java" ? "verified by compiling and running it" : "verified against a reference program"}</span>
            </div>
          </section>

          <section className="card border-[3px] border-[#FFD3D6] p-5 sm:p-6" style={{ background: "#FFF8F8" }}>
            <div className="text-[13px] font-black uppercase tracking-wider text-danger-deep">Common misconception</div>
            <p className="mt-1 font-bold text-ink">
              <span className="font-black">Myth: </span>
              <Inline text={lesson.misconception.wrong} />
            </p>
            <p className="mt-1 font-bold text-ink">
              <span className="font-black text-[#2BA155]">Actually: </span>
              <Inline text={lesson.misconception.right} />
            </p>
            {lesson.misconception.code && (
              <div className="mt-3">
                <CodeBlock code={lesson.misconception.code} lang={lesson.course === "csa" ? "java" : undefined} />
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="cp-title">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="cp-title" className="font-display text-2xl">Checkpoint</h3>
              {stage === "read" && <Button tone="violet" onClick={() => setStage("check")}>START CHECKPOINT · 3 QUESTIONS</Button>}
            </div>
            {stage === "check" && profile && <PracticeRunner accountId={account.id} course={lesson.course} prefs={profile.prefs} items={items} source="lesson" onDone={finish} doneLabel="FINISH LESSON" onAskTutor={(focus, action, text) => ask(text, action, focus)} />}
            {stage === "done" && summary && (
              <div className="card flex flex-col gap-3 p-5 sm:p-6">
                <div className="font-display text-2xl text-[#2BA155]">Lesson complete</div>
                <p className="font-bold text-ink">
                  {summary.firstTry} of {summary.total} right on the first try.
                  {summary.missedSkills.length ? ` Worth another look: ${summary.missedSkills.join(", ")}.` : " Nice and clean."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {nextLesson && <ButtonLink href={`/learn/lesson/?id=${nextLesson.id}`} tone="violet">NEXT LESSON</ButtonLink>}
                  <ButtonLink href={`/learn/practice/?lesson=${lesson.id}&difficulty=core`} tone="white">MORE PRACTICE</ButtonLink>
                  {lesson.course === "csa" && lesson.world >= 0 && <ButtonLink href={`/map/?w=${lesson.world}`} tone="ember">BATTLE IN {WORLDS[lesson.world].name.toUpperCase()}</ButtonLink>}
                  <Button tone="white" onClick={() => { setRunKey((k) => k + 1); setStage("check"); setSummary(null); }}>RETRY CHECKPOINT</Button>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4">
          <section className="card flex flex-col gap-2 p-5">
            <h3 className="font-display text-xl">Ask the tutor</h3>
            {lesson.prompts.map((p) => (
              <button key={p} type="button" onClick={() => ask(p)} className="rounded-xl bg-sky px-3 py-2 text-left text-sm font-bold text-ocean-deep hover:bg-ocean-soft">
                {p}
              </button>
            ))}
            <button type="button" onClick={() => ask("Explain this lesson differently.", "explain-differently")} className="rounded-xl bg-sky px-3 py-2 text-left text-sm font-bold text-ocean-deep hover:bg-ocean-soft">
              Explain this lesson differently
            </button>
            <button type="button" onClick={() => ask("Quiz me on this lesson, one question at a time.", "quiz")} className="rounded-xl bg-sky px-3 py-2 text-left text-sm font-bold text-ocean-deep hover:bg-ocean-soft">
              Quiz me on this lesson
            </button>
          </section>
          <section className="card flex flex-col gap-1.5 p-5 text-sm font-bold">
            <h3 className="font-display text-xl">In this course</h3>
            {list.map((l) => (
              <Link key={l.id} href={`/learn/lesson/?id=${l.id}`} className="rounded-lg px-2 py-1 hover:bg-sky" style={{ color: l.id === lesson.id ? "#6D4BD8" : "#4A5175", fontWeight: l.id === lesson.id ? 900 : 700 }} aria-current={l.id === lesson.id ? "page" : undefined}>
                {profile?.lessons[l.id]?.status === "done" ? "✓ " : ""}
                {l.title}
              </Link>
            ))}
          </section>
        </aside>
      </article>
      {profile && (
        <TutorDrawer open={drawer} onClose={() => setDrawer(false)} seed={seed} accountId={account.id} profile={profile} progress={progress} attempts={attempts} lessonId={lesson.id} />
      )}
    </LearnShell>
  );
}
