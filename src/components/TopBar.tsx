"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Warrior from "./Warrior";
import { CoinIcon, FlameIcon, SoundToggle } from "./icons";
import { useSyncState } from "@/lib/cloud/outbox";
import type { Account, Progress } from "@/lib/db";
import { XP_PER_LEVEL, levelFor } from "@/lib/game";

const NAV = [
  { href: "/map/", label: "World" },
  { href: "/learn/", label: "Learn" },
  { href: "/shop/", label: "Shop" },
  { href: "/profile/", label: "Armory" },
];

// Shared header: avatar, level, XP, coins, streak and navigation.
export default function TopBar({ account, progress }: { account: Account; progress: Progress }) {
  const path = usePathname();
  const level = levelFor(progress.xp);
  const into = progress.xp % XP_PER_LEVEL;
  const [coins, setCoins] = useState(progress.coins);
  useEffect(() => {
    // Count coins up or down when they change.
    const from = coins, to = progress.coins;
    if (from === to) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 500);
      setCoins(Math.round(from + (to - from) * k));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.coins]);

  const a = account.avatar;
  return (
    <header className="card flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-5">
      <Link href="/profile/" className="flex items-center gap-3" aria-label="Open your armory">
        <span className="grid h-14 w-14 flex-none place-items-center overflow-hidden rounded-full border-[3px] border-gold bg-sky-night">
          <Warrior weapon={a.weapon} headwear={a.headwear} body={a.body} armor={a.armor} energy={a.energy} finish={a.finish} size={46} idle={false} />
        </span>
        <span>
          <span className="block font-display text-xl leading-none">{account.username}</span>
          <span className="text-[13px] font-extrabold text-ink-soft">{a.title} · Lv {level}</span>
        </span>
      </Link>
      <div className="min-w-0 flex-[1_1_140px]" title={`${into} / ${XP_PER_LEVEL} XP to level ${level + 1}`}>
        <div className="flex justify-between text-[12px] font-black text-xp-deep">
          <span>XP</span>
          <span className="tabular-nums">{into} / {XP_PER_LEVEL}</span>
        </div>
        <div className="mt-1 h-3.5 overflow-hidden rounded-full bg-xp-soft">
          <motion.div className="h-full rounded-full bg-xp" style={{ boxShadow: "inset 0 -3px 0 #6D4BD8" }} initial={false} animate={{ width: `${Math.max(3, (into / XP_PER_LEVEL) * 100)}%` }} transition={{ type: "spring", stiffness: 80, damping: 20 }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-2xl bg-ember-soft px-3 py-1.5 font-black text-[#B35A00]" title="Day streak">
          <FlameIcon /> {progress.streak}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-2xl bg-gold-soft px-3 py-1.5 font-black tabular-nums text-[#8A6400]" title="Coins" data-testid="coins">
          <CoinIcon /> {coins}
        </span>
      </div>
      <nav className="flex items-center gap-1 rounded-2xl bg-sky p-1" aria-label="Main">
        {[...NAV, ...(account.cloudUserId ? [{ href: "/classroom/", label: "Class" }] : [])].map((n) => {
          const on = path?.startsWith(n.href.replace(/\/$/, ""));
          return (
            <Link key={n.href} href={n.href} className="relative rounded-xl px-3.5 py-1.5 text-sm font-black" style={{ color: on ? "#FFFFFF" : "#4A5175" }}>
              {on && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-ocean" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
              <span className="relative">{n.label}</span>
            </Link>
          );
        })}
      </nav>
      {account.cloudUserId && <SyncDot />}
      <SoundToggle />
    </header>
  );
}

// Small save indicator for class accounts. "Online" here means the last upload worked; it
// never claims the teacher is watching.
function SyncDot() {
  const s = useSyncState();
  const [color, label] =
    s.pending === 0 && s.state !== "error" && s.state !== "signed-out"
      ? ["#3EC46D", "All results saved"]
      : s.state === "offline"
        ? ["#FFB84D", `${s.pending} waiting for a connection`]
        : s.state === "signed-out"
          ? ["#FF8A8F", "Sign in to your class account to sync"]
          : s.state === "error"
            ? ["#FF8A8F", `${s.pending} couldn't sync yet`]
            : ["#2D9CDB", "Saving…"];
  return (
    <Link href="/classroom/" title={label} aria-label={label} className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-2.5 py-1.5 text-xs font-black text-ink-soft">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span className="hidden xl:inline">{label}</span>
    </Link>
  );
}
