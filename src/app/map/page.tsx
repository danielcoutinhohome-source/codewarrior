"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import Monster from "@/components/Monster";
import TopBar from "@/components/TopBar";
import WorldScene, { type SceneHandle } from "@/components/WorldScene";
import { StarIcon } from "@/components/icons";
import { Button } from "@/components/ui";
import { BOSS, QUESTIONS_PER_BATTLE, QUESTIONS_PER_BOSS, WORLDS, enemyHit, key } from "@/lib/game";
import { battleUnlocked, frontier, worldUnlocked } from "@/lib/progress";
import { play } from "@/lib/sfx";
import { useWarrior } from "@/lib/useWarrior";

const ease = [0.22, 1, 0.36, 1] as const;
const glass = "rounded-[22px] border border-white/60 bg-white/80 shadow-[0_10px_30px_rgba(20,24,60,.16)] backdrop-blur-md";

export default function MapPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-sky" />}>
      <WorldMap />
    </Suspense>
  );
}

function useBoxWidth() {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, w] as const;
}

function WorldMap() {
  const router = useRouter();
  const params = useSearchParams();
  const { account, progress } = useWarrior();
  const scene = useRef<SceneHandle>(null);
  const [boxRef, boxW] = useBoxWidth();
  const [w, setW] = useState<number | null>(null);
  const [selected, setSelected] = useState(0);
  const [charging, setCharging] = useState(false);

  useEffect(() => {
    if (!progress) return;
    const f = frontier(progress);
    const asked = params.get("w");
    const target = asked !== null && worldUnlocked(progress, Number(asked)) ? Number(asked) : f.w;
    setW(target);
    setSelected(target === f.w ? f.b : [0, 1, 2, 3, 4].find((b) => !progress.stars[key(target, b)]) ?? BOSS);
  }, [progress, params]);

  const mobile = boxW > 0 && boxW < 640;
  const sceneH = mobile ? 560 : Math.round(Math.max(520, Math.min(700, boxW * 0.58)));

  if (!account || !progress || w === null)
    return (
      <div className="min-h-dvh bg-sky">
        <div ref={boxRef} className="mx-auto max-w-6xl px-4" />
      </div>
    );

  const world = WORLDS[w];
  const stars = [0, 1, 2, 3, 4].map((b) => progress.stars[key(w, b)]);
  const unlocked = [0, 1, 2, 3, 4].map((b) => battleUnlocked(progress, w, b));
  const enemy = world.enemies[selected];
  const isBoss = selected === BOSS;
  const hiddenBoss = isBoss && !unlocked[BOSS];
  const worldStars = stars.reduce<number>((a, s) => a + (s || 0), 0);
  const cleared = !!stars[BOSS];

  const go = (nw: number) => {
    if (nw < 0 || nw >= WORLDS.length || !worldUnlocked(progress, nw) || nw === w) return;
    play("whoosh");
    router.replace(`/map/?w=${nw}`, { scroll: false });
  };
  const choose = (b: number) => {
    if (b === selected) return;
    setSelected(b);
    play("click");
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

        <div ref={boxRef} className="relative overflow-hidden rounded-[30px] border-[3px]" style={{ borderColor: world.theme.roadEdge, boxShadow: `0 10px 0 ${world.theme.roadEdge}` }}>
          <AnimatePresence mode="wait">
            <motion.div key={w} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.45, ease }}>
              {boxW > 0 && <WorldScene ref={scene} worldIndex={w} world={world} avatar={account.avatar} stars={stars} unlocked={unlocked} selected={selected} onSelect={choose} height={sceneH} />}
            </motion.div>
          </AnimatePresence>

          {/* top overlay: world name and switching */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[700] flex items-start justify-between gap-2 p-3 sm:p-4">
            <div className={`pointer-events-auto flex items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3 ${glass}`}>
              <Arrow dir={-1} disabled={w === 0} onClick={() => go(w - 1)} />
              <div className="min-w-0 px-1">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-ocean-deep">World {w + 1}<span className="hidden sm:inline"> · {world.topic}</span></div>
                <AnimatePresence mode="wait">
                  <motion.div key={w} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease }} className="truncate font-display text-[clamp(22px,3.4vw,32px)] leading-tight">
                    {world.name}
                  </motion.div>
                </AnimatePresence>
              </div>
              <Arrow dir={1} disabled={w === WORLDS.length - 1 || !worldUnlocked(progress, w + 1)} onClick={() => go(w + 1)} />
            </div>
            <div className={`pointer-events-auto flex items-center gap-2 px-3 py-2 ${glass}`}>
              {cleared && <span className="hidden rounded-full bg-hp px-2.5 py-0.5 text-xs font-black text-white sm:inline">CLEARED</span>}
              <span className="inline-flex items-center gap-1 font-black tabular-nums"><StarIcon size={18} /> {worldStars}/15</span>
            </div>
          </div>

          {/* bottom-left overlay: battles along this path */}
          <div className="pointer-events-none absolute bottom-0 left-0 z-[700] p-3 sm:p-4">
            <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/60 bg-white/75 p-1.5 shadow-[0_8px_24px_rgba(20,24,60,.15)] backdrop-blur-md" role="tablist" aria-label="Battles in this world">
              {[0, 1, 2, 3, 4].map((b) => {
                const on = selected === b;
                const won = !!stars[b];
                const open = unlocked[b];
                return (
                  <button
                    key={b}
                    role="tab"
                    aria-selected={on}
                    onClick={() => choose(b)}
                    className="relative grid h-8 min-w-8 place-items-center rounded-full px-2 text-[13px] font-black sm:h-9 sm:min-w-9 sm:px-2.5 sm:text-sm"
                    style={{ color: on ? "#FFFFFF" : won ? "#8A6400" : open ? "#1F2440" : "#9AA3B8" }}
                    aria-label={b === BOSS ? "Boss" : `Battle ${b + 1}`}
                  >
                    {on && <motion.span layoutId="path-pill" className="absolute inset-0 rounded-full" style={{ background: b === BOSS ? "#E5484D" : "#FF8A00" }} transition={{ duration: 0.35, ease }} />}
                    <span className="relative">{b === BOSS ? "BOSS" : won ? "✓" : b + 1}</span>
                  </button>
                );
              })}
            </div>

          </div>
          <AnimatePresence>{charging && <motion.div className="pointer-events-none absolute inset-0 z-[800] bg-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.15 }} />}</AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <motion.section
            key={`${w}-${selected}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.32, ease }}
            className="card flex items-center gap-3 p-3 sm:gap-4 sm:p-4"
          >
            <div className="grid h-16 w-16 flex-none place-items-center rounded-2xl sm:h-20 sm:w-20" style={{ background: hiddenBoss ? "#2B2F5E" : "rgba(226,243,255,.9)" }}>
              <Monster enemy={enemy} boss={isBoss} size={mobile ? 58 : 74} silhouette={hiddenBoss} idle={false} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-black uppercase tracking-wider" style={{ color: isBoss ? "#D9434A" : "#FF8A00" }}>
                {isBoss ? "Boss battle" : `Battle ${selected + 1}`}
                {stars[selected] ? <span className="ml-2 inline-flex translate-y-[3px] gap-0.5">{[1, 2, 3].map((s) => <StarIcon key={s} size={14} on={s <= (stars[selected] || 0)} />)}</span> : null}
              </div>
              <div className="truncate font-display text-[clamp(20px,3vw,28px)] leading-tight">{hiddenBoss ? "Hidden in the fog" : enemy.name}</div>
              <div className="truncate text-sm font-bold text-ink-soft">
                {hiddenBoss
                  ? "Win the four battles before it to clear the fog."
                  : !unlocked[selected]
                    ? `Win battle ${selected} first.`
                    : isBoss
                      ? `${QUESTIONS_PER_BOSS} questions · hits for ${enemyHit(w, true)} · no hint scrolls`
                      : `${QUESTIONS_PER_BATTLE} questions · hits for ${enemyHit(w, false)} · bug: ${enemy.label}`}
              </div>
            </div>
            <Button size={mobile ? "md" : "lg"} onClick={fight} disabled={!unlocked[selected] || charging} tone={isBoss ? "danger" : "ember"} className="flex-none">
              {stars[selected] ? "REPLAY" : "FIGHT!"}
            </Button>
          </motion.section>
        </AnimatePresence>

        <nav aria-label="Worlds" className="flex gap-2 overflow-x-auto pb-1">
          {WORLDS.map((wd, i) => {
            const open = worldUnlocked(progress, i);
            const here = i === w;
            const done = !!progress.stars[key(i, BOSS)];
            const s = [0, 1, 2, 3, 4].reduce((a, b) => a + (progress.stars[key(i, b)] || 0), 0);
            return (
              <button
                key={wd.name}
                type="button"
                disabled={!open}
                onClick={() => go(i)}
                className="relative flex min-w-[132px] flex-1 flex-col items-start rounded-2xl px-3 py-2 text-left transition-colors disabled:cursor-not-allowed"
                style={{ background: here ? "#1F2440" : open ? "#FFFFFF" : "rgba(255,255,255,.5)", color: here ? "#FFFFFF" : open ? "#1F2440" : "#9AA3B8" }}
              >
                <span className="text-[11px] font-black uppercase tracking-wider opacity-80">{i === WORLDS.length - 1 ? "Final world" : `World ${i + 1}`}</span>
                <span className="font-black leading-tight">{wd.name}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs font-black opacity-90">
                  {open ? <><StarIcon size={12} /> {s}/15{done ? " · cleared" : ""}</> : "Locked"}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function Arrow({ dir, disabled, onClick }: { dir: -1 | 1; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={dir < 0 ? "Previous world" : "Next world"} className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white text-ocean-deep transition-opacity disabled:opacity-30">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}
