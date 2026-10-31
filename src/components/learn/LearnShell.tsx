"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import TopBar from "../TopBar";
import { Screen } from "../ui";
import type { Account, Course, LearnProfile, Progress } from "@/lib/db";
import { COURSE_LABEL, COURSE_NOTE } from "@/lib/learn/lessons";

const TABS = [
  { href: "/learn/", label: "Overview" },
  { href: "/learn/lessons/", label: "Lessons" },
  { href: "/learn/practice/", label: "Practice" },
  { href: "/learn/tutor/", label: "Tutor" },
];

export default function LearnShell({ account, progress, profile, warm, onCourse, children }: { account: Account; progress: Progress; profile: LearnProfile | null; warm: boolean; onCourse?: (c: Course) => void; children: ReactNode }) {
  const path = usePathname() || "";
  const active = (href: string) => (href === "/learn/" ? /\/learn\/?$/.test(path) : path.includes(href.replace(/\/$/, "")));
  return (
    <Screen fade={!warm}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-12 pt-4 sm:px-5">
        <TopBar account={account} progress={progress} />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-black uppercase tracking-[0.15em] text-xp-deep">Learn</div>
            <h1 className="font-display text-[clamp(30px,4.5vw,44px)] leading-none">Study hall</h1>
          </div>
          {profile && onCourse && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex rounded-2xl bg-white p-1 shadow-card-sm" role="radiogroup" aria-label="Course">
                {(["csa", "csp"] as Course[]).map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={profile.course === c} onClick={() => onCourse(c)} className="rounded-xl px-3.5 py-1.5 text-sm font-black" style={{ background: profile.course === c ? "#8B5CF6" : "transparent", color: profile.course === c ? "#FFFFFF" : "#4A5175" }}>
                    {COURSE_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {profile && <p className="-mt-2 text-sm font-bold text-ink-mute">{COURSE_NOTE[profile.course]}</p>}
        <nav className="flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-card-sm" aria-label="Learn sections">
          {TABS.map((t) => {
            const on = active(t.href);
            return (
              <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className="relative flex-none rounded-xl px-4 py-2 text-sm font-black" style={{ color: on ? "#FFFFFF" : "#4A5175" }}>
                {on && <motion.span layoutId="learn-tab" className="absolute inset-0 rounded-xl bg-xp" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                <span className="relative">{t.label}</span>
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </Screen>
  );
}
