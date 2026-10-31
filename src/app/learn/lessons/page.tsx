"use client";

import Link from "next/link";
import LearnShell from "@/components/learn/LearnShell";
import type { Course } from "@/lib/db";
import { WORLDS } from "@/lib/game";
import { lessonsFor } from "@/lib/learn/lessons";
import { setCourse } from "@/lib/learn/store";
import { useLearn } from "@/lib/learn/useLearn";

export default function LessonsIndex() {
  const { account, progress, profile, reload, warm } = useLearn();
  if (!account || !progress) return <div className="min-h-dvh bg-sky" />;
  const change = async (c: Course) => {
    await setCourse(account.id, c);
    await reload();
  };
  return (
    <LearnShell account={account} progress={progress} profile={profile} warm={warm} onCourse={change}>
      {profile && (
        <div className="grid gap-3 sm:grid-cols-2">
          {lessonsFor(profile.course).map((l, i) => {
            const st = profile.lessons[l.id];
            return (
              <Link key={l.id} href={`/learn/lesson/?id=${l.id}`} className="card flex flex-col gap-1.5 p-5 transition-[filter] hover:brightness-[1.03]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-xp-deep">Lesson {i + 1} · {l.minutes} min</span>
                  {st && (
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-black" style={{ background: st.status === "done" ? "#E3F9EA" : "#FFF1E0", color: st.status === "done" ? "#2BA155" : "#B35A00" }}>
                      {st.status === "done" ? `Done${st.total ? ` · ${st.right}/${st.total}` : ""}` : "In progress"}
                    </span>
                  )}
                </div>
                <div className="font-display text-xl leading-tight">{l.title}</div>
                <p className="text-sm font-bold text-ink-soft">{l.objective}</p>
                <div className="mt-auto pt-1 text-xs font-bold text-ink-mute">
                  {l.unit}
                  {l.course === "csa" && l.world >= 0 ? ` · prepares you for ${WORLDS[l.world].name}` : ""}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </LearnShell>
  );
}
