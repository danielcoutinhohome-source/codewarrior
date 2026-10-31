"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LearnShell from "@/components/learn/LearnShell";
import PrefsCard from "@/components/learn/PrefsCard";
import { ButtonLink } from "@/components/ui";
import type { Conversation, Course } from "@/lib/db";
import { WORLDS } from "@/lib/game";
import { LEVEL_LABEL, lessonEvidence, levelFor, recentMistakes, recommend, skillEvidence, type Level } from "@/lib/learn/insights";
import { lessonsFor } from "@/lib/learn/lessons";
import { listConversations, setCourse } from "@/lib/learn/store";
import { useLearn } from "@/lib/learn/useLearn";
import { checkTutor, type TutorStatus } from "@/lib/tutor/client";

const LEVEL_STYLE: Record<Level, { bg: string; fg: string }> = {
  none: { bg: "#EEF3FA", fg: "#6B7294" },
  practice: { bg: "#FFE8EA", fg: "#D9434A" },
  growing: { bg: "#FFF1E0", fg: "#B35A00" },
  strong: { bg: "#E3F9EA", fg: "#2BA155" },
};

export default function LearnHome() {
  const { account, progress, profile, attempts, reload, warm } = useLearn();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [status, setStatus] = useState<TutorStatus>({ state: "checking" });

  useEffect(() => {
    if (account) listConversations(account.id).then(setConvos);
  }, [account]);
  useEffect(() => {
    checkTutor().then(setStatus);
  }, []);

  if (!account || !progress) return <div className="min-h-dvh bg-sky" />;
  const changeCourse = async (c: Course) => {
    await setCourse(account.id, c);
    await reload();
  };

  return (
    <LearnShell account={account} progress={progress} profile={profile} warm={warm} onCourse={changeCourse}>
      {!profile ? (
        <div className="card h-64 animate-pulse" />
      ) : (
        renderDashboard()
      )}
    </LearnShell>
  );

  function renderDashboard() {
    const course = profile!.course;
    const lessons = lessonsFor(course);
    const ev = skillEvidence(progress, attempts);
    const recs = recommend(profile!, progress, attempts);
    const mistakes = recentMistakes(attempts, course).slice(0, 5);
    const rows = lessons.map((l) => ({ l, e: lessonEvidence(l, ev), st: profile!.lessons[l.id] }));
    const strong = rows.filter((r) => levelFor(r.e) === "strong");
    const needs = rows.filter((r) => levelFor(r.e) === "practice");
    const doneCount = rows.filter((r) => r.st?.status === "done").length;
    const lastConvo = convos[0];
    const hrefFor = (r: (typeof recs)[number]) =>
      r.kind === "mistake" ? `/learn/practice/?lesson=${r.lessonId || ""}&skill=${encodeURIComponent(r.skill)}&difficulty=mixed` : r.kind === "lesson" ? `/learn/lesson/?id=${r.lessonId}` : r.kind === "practice" ? `/learn/practice/?lesson=${r.lessonId}&difficulty=mixed` : `/learn/practice/?lesson=${r.lessonId || ""}&difficulty=exam`;
    const label = (r: (typeof recs)[number]) => (r.kind === "lesson" ? "START LESSON" : r.kind === "boss" ? "PRACTICE FOR THE BOSS" : "PRACTICE NOW");

    return (
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          {recs[0] && (
            <section className="card relative overflow-hidden p-5 sm:p-6" style={{ background: "linear-gradient(135deg, #F1EAFF, #FFFFFF 60%)" }}>
              <div className="text-[13px] font-black uppercase tracking-[0.15em] text-xp-deep">Recommended next</div>
              <h2 className="mt-1 font-display text-[clamp(24px,3vw,32px)] leading-tight">{recs[0].title}</h2>
              <p className="mt-1 max-w-xl font-bold text-ink-soft">{recs[0].reason}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink href={hrefFor(recs[0])} tone="violet">{label(recs[0])}</ButtonLink>
                {recs[0].kind === "mistake" && (
                  <ButtonLink href={`/learn/tutor/?why=1`} tone="white">ASK THE TUTOR WHY</ButtonLink>
                )}
              </div>
              {recs.length > 1 && (
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {recs.slice(1, 4).map((r) => (
                    <Link key={r.title} href={hrefFor(r)} className="rounded-2xl border-2 border-line bg-white px-4 py-3 hover:border-xp">
                      <div className="font-display text-lg leading-tight">{r.title}</div>
                      <div className="text-sm font-bold text-ink-mute">{r.reason}</div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="card p-5" aria-labelledby="topics-title">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="topics-title" className="font-display text-2xl">Topics</h2>
              <span className="text-sm font-black text-ink-mute">{doneCount} of {lessons.length} lessons finished</span>
            </div>
            <p className="text-sm font-bold text-ink-mute">Based on your first-try answers in battles, practice and lesson checkpoints. Labels stay cautious until there are enough answers.</p>
            <ul className="mt-3 flex flex-col divide-y-2 divide-line">
              {rows.map(({ l, e, st }) => {
                const lv = levelFor(e);
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                    <div className="min-w-0 flex-[1_1_220px]">
                      <Link href={`/learn/lesson/?id=${l.id}`} className="font-black text-ink hover:text-xp-deep">{l.title}</Link>
                      <div className="text-xs font-bold text-ink-mute">
                        {l.world >= 0 && course === "csa" ? `${WORLDS[l.world].name} · ` : ""}{l.unit}
                        {st?.status === "done" ? " · lesson finished" : st?.status === "started" ? " · lesson started" : ""}
                      </div>
                    </div>
                    <span className="rounded-full px-2.5 py-1 text-xs font-black" style={{ background: LEVEL_STYLE[lv].bg, color: LEVEL_STYLE[lv].fg }}>
                      {LEVEL_LABEL[lv]}{e.n ? ` · ${e.right}/${e.n}` : ""}
                    </span>
                    <Link href={`/learn/practice/?lesson=${l.id}&difficulty=mixed`} className="text-sm font-black text-ocean-deep hover:underline">Practice</Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <section className="card flex flex-col gap-2 p-5">
            <h2 className="font-display text-2xl">Pick up where you left off</h2>
            {lastConvo ? (
              <Link href={`/learn/tutor/?c=${lastConvo.id}`} className="rounded-2xl bg-sky px-4 py-3 hover:bg-ocean-soft">
                <div className="text-xs font-black uppercase tracking-wider text-ocean-deep">Tutor conversation</div>
                <div className="font-black text-ink">{lastConvo.title}</div>
                <div className="text-xs font-bold text-ink-mute">{lastConvo.messages.length} messages · {new Date(lastConvo.updatedAt).toLocaleDateString()}</div>
              </Link>
            ) : (
              <p className="text-sm font-bold text-ink-mute">No tutor conversations yet.</p>
            )}
            {profile!.recent.filter((r) => r.kind !== "tutor").slice(0, 4).map((r) => (
              <Link key={`${r.kind}${r.ref}`} href={r.kind === "lesson" ? `/learn/lesson/?id=${r.ref}` : `/learn/practice/?lesson=${r.ref}&difficulty=mixed`} className="rounded-2xl border-2 border-line px-4 py-2.5 hover:border-xp">
                <div className="text-xs font-black uppercase tracking-wider text-xp-deep">{r.kind === "lesson" ? "Lesson" : "Practice"}</div>
                <div className="font-black text-ink">{r.label}</div>
              </Link>
            ))}
            <ButtonLink href="/learn/tutor/" tone="ocean" className="mt-1">
              {status.state === "online" ? "OPEN THE TUTOR" : "OPEN THE STUDY HELPER"}
            </ButtonLink>
          </section>

          <section className="card flex flex-col gap-2 p-5">
            <h2 className="font-display text-2xl">Recent mistakes</h2>
            {mistakes.length ? (
              mistakes.map((m) => (
                <div key={m.skill} className="rounded-2xl bg-[#FFF5F5] px-4 py-2.5">
                  <div className="font-black text-ink">{m.skill}</div>
                  <div className="text-xs font-bold text-ink-mute">
                    {m.source === "battle" && m.world >= 0 ? `Battle in ${WORLDS[m.world].name}` : m.source === "lesson" ? "Lesson checkpoint" : "Practice"} · {new Date(m.at).toLocaleDateString()}
                  </div>
                  <div className="mt-1.5 flex gap-3 text-sm font-black">
                    <Link className="text-ocean-deep hover:underline" href={`/learn/practice/?lesson=${m.lessonId || ""}&skill=${encodeURIComponent(m.skill)}&difficulty=mixed`}>Practice this</Link>
                    <Link className="text-xp-deep hover:underline" href={`/learn/tutor/?why=${encodeURIComponent(m.skill)}`}>Why was I wrong?</Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm font-bold text-ink-mute">Nothing yet. Misses from battles, practice and lesson checkpoints show up here so you can fix them.</p>
            )}
          </section>

          <section className="card flex flex-col gap-2 p-5">
            <h2 className="font-display text-2xl">Strengths and work areas</h2>
            {strong.length || needs.length ? (
              <>
                {needs.length > 0 && <p className="text-sm font-bold text-ink-soft"><span className="font-black text-danger-deep">Needs more practice:</span> {needs.map((r) => r.l.title).join(", ")}</p>}
                {strong.length > 0 && <p className="text-sm font-bold text-ink-soft"><span className="font-black text-[#2BA155]">Strong so far:</span> {strong.map((r) => r.l.title).join(", ")}</p>}
              </>
            ) : (
              <p className="text-sm font-bold text-ink-mute">Not enough data yet. Play a few battles or practice sets and this fills in.</p>
            )}
          </section>

          <PrefsCard profile={profile!} onChange={reload} />
        </aside>
      </div>
    );
  }
}
