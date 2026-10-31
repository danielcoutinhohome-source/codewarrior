"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import Monster from "@/components/Monster";
import TopBar from "@/components/TopBar";
import WorldScene, { type SceneHandle } from "@/components/WorldScene";
import { StarIcon } from "@/components/icons";
import { Button } from "@/components/ui";
import { BOSS, QUESTIONS_PER_BATTLE, QUESTIONS_PER_BOSS, WORLDS, enemyHit, key } from "@/lib/game";
import { battleUnlocked, frontier, totalStars, worldUnlocked } from "@/lib/progress";
import { play } from "@/lib/sfx";
import { useWarrior } from "@/lib/useWarrior";

export default function MapPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-sky" />}>
      <WorldMap />
    </Suspense>
  );
}

function WorldMap() {
  const router = useRouter();
  const params = useSearchParams();
  const { account, progress } = useWarrior();
  const scene = useRef<SceneHandle>(null);
  const [w, setW] = useState<number | null>(null);
  const [selected, setSelected] = useState(0);
  const [charging, setCharging] = useState(false);

  // Pick the world from the URL, or the furthest one reached.
  useEffect(() => {
    if (!progress) return;
    const f = frontier(progress);
    const asked = params.get("w");
    const target = asked !== null && worldUnlocked(progress, Number(asked)) ? Number(asked) : f.w;
    setW(target);
    setSelected(target === f.w ? f.b : [0, 1, 2, 3, 4].find((b) => !progress.stars[key(target, b)]) ?? BOSS);
  }, [progress, params]);

  if (!account || !progress || w === null) return <div className="min-h-dvh bg-sky" />;

  const world = WORLDS[w];
  const stars = [0, 1, 2, 3, 4].map((b) => progress.stars[key(w, b)]);
  const unlocked = [0, 1, 2, 3, 4].map((b) => battleUnlocked(progress, w, b));
  const enemy = world.enemies[selected];
  const isBoss = selected === BOSS;
  const hiddenBoss = isBoss && !unlocked[BOSS];
  const worldStars = stars.reduce<number>((a, s) => a + (s || 0), 0);

  const go = (nw: number) => {
    if (nw < 0 || nw >= WORLDS.length || !worldUnlocked(progress, nw)) return;
    play("whoosh");
    router.replace(`/map/?w=${nw}`, { scroll: false });
  };

  const fight = async () => {
    if (!unlocked[selected] || charging) return;
    setCharging(true);
    play("whoosh");
    await scene.current?.charge(selected);
    router.push(`/battle/?w=${w}&b=${selected}`);
  };

  return (
    <div className="min-h-dvh bg-sky">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-10 pt-4 sm:px-5">
        <TopBar account={account} progress={progress} />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <ArrowBtn dir={-1} disabled={w === 0} onClick={() => go(w - 1)} />
            <div>
              <div className="text-[13px] font-black uppercase tracking-[0.15em] text-ocean-deep">World {w + 1} of {WORLDS.length}</div>
              <AnimatePresence mode="wait">
                <motion.h1 key={w} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="font-display text-[clamp(32px,5vw,46px)] leading-none">
                  {world.name}
                </motion.h1>
              </AnimatePresence>
            </div>
            <ArrowBtn dir={1} disabled={w === WORLDS.length - 1 || !worldUnlocked(progress, w + 1)} onClick={() => go(w + 1)} />
          </div>
          <div className="flex items-center gap-3 font-extrabold text-ink-soft">
            <span>{world.topic}</span>
            {stars[BOSS] ? <span className="rounded-full bg-[#3EC46D] px-3 py-1 text-sm font-black text-white">CLEARED</span> : null}
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-ink"><StarIcon size={18} /> {worldStars} / 15</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={w} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <WorldScene ref={scene} world={world} avatar={account.avatar} stars={stars} unlocked={unlocked} selected={selected} onSelect={(b) => { setSelected(b); play("click"); }} />
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.section
            key={`${w}-${selected}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="card flex flex-wrap items-center gap-5 p-5"
          >
            <div className="grid h-28 w-28 flex-none place-items-center rounded-3xl" style={{ background: hiddenBoss ? "#2B2F5E" : "#EEF6FF" }}>
              <Monster enemy={enemy} boss={isBoss} size={100} silhouette={hiddenBoss} />
            </div>
            <div className="min-w-0 flex-[1_1_260px]">
              <div className="text-[13px] font-black uppercase tracking-wider" style={{ color: isBoss ? "#D9434A" : "#FF8A00" }}>
                {isBoss ? "Boss battle" : `Battle ${selected + 1}`}
              </div>
              <div className="font-display text-[30px] leading-tight">{hiddenBoss ? "???" : enemy.name}</div>
              <div className="font-bold text-ink-soft">
                {hiddenBoss
                  ? "Win all four battles in this world to clear the fog."
                  : isBoss
                    ? `${QUESTIONS_PER_BOSS} questions · hits for ${enemyHit(w, true)} · no hint scrolls`
                    : `${QUESTIONS_PER_BATTLE} questions · hits for ${enemyHit(w, false)} · carries the bug "${enemy.label}"`}
              </div>
              {stars[selected] ? (
                <div className="mt-1 flex items-center gap-1 text-sm font-black text-ink-mute">
                  {[1, 2, 3].map((s) => <StarIcon key={s} size={18} on={s <= (stars[selected] || 0)} />)} Best result. Replays earn half rewards.
                </div>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button size="lg" onClick={fight} disabled={!unlocked[selected] || charging} tone={isBoss ? "danger" : "ember"}>
                {stars[selected] ? "FIGHT AGAIN" : "FIGHT!"}
              </Button>
              {!unlocked[selected] && <span className="text-sm font-bold text-ink-mute">Win battle {selected} first</span>}
            </div>
          </motion.section>
        </AnimatePresence>

        <nav aria-label="Worlds" className="grid grid-cols-[repeat(7,minmax(128px,1fr))] gap-2.5 overflow-x-auto pb-2">
          {WORLDS.map((wd, i) => {
            const open = worldUnlocked(progress, i);
            const here = i === w;
            const cleared = !!progress.stars[key(i, BOSS)];
            const final = i === WORLDS.length - 1;
            const s = [0, 1, 2, 3, 4].reduce((a, b) => a + (progress.stars[key(i, b)] || 0), 0);
            return (
              <motion.button
                key={wd.name}
                type="button"
                disabled={!open}
                onClick={() => go(i)}
                whileHover={open ? { scale: 1.03 } : undefined}
                className="rounded-[18px] border-[3px] px-3 py-2.5 text-left disabled:cursor-not-allowed"
                style={{
                  background: here ? "#FF8A00" : final && open ? "#2B2F5E" : open ? "#FFFFFF" : "#EEF2F8",
                  borderColor: here ? "#FF8A00" : cleared ? "#BFE9C8" : open ? "#D5E4F5" : "#D7DEEA",
                  color: here || (final && open) ? "#FFFFFF" : open ? "#1F2440" : "#8A93AD",
                  boxShadow: `0 6px 0 ${here ? "#D96F00" : final && open ? "#171A3D" : cleared ? "#9BD3A8" : "#C3CCDB"}`,
                }}
              >
                <div className="text-xs font-black opacity-90">{final ? "FINAL WORLD" : `WORLD ${i + 1}`}{!open ? " · LOCKED" : cleared ? " · CLEARED" : ""}</div>
                <div className="font-black leading-tight">{wd.name}</div>
                {open && <div className="mt-0.5 flex items-center gap-1 text-xs font-black opacity-90"><StarIcon size={13} /> {s}/15</div>}
              </motion.button>
            );
          })}
        </nav>
        <p className="text-center text-sm font-bold text-ink-mute">
          {totalStars(progress.stars)} stars earned · <Link href="/profile/" className="text-ocean-deep hover:underline">See your stats</Link>
        </p>
      </div>
    </div>
  );
}

function ArrowBtn({ dir, disabled, onClick }: { dir: -1 | 1; disabled: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      aria-label={dir < 0 ? "Previous world" : "Next world"}
      className="grid h-11 w-11 place-items-center rounded-2xl border-[3px] border-line bg-white text-ocean-deep shadow-card-sm disabled:opacity-40"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </motion.button>
  );
}
