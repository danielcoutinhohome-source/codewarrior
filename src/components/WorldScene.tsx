"use client";

import { AnimatePresence, motion, useAnimate } from "framer-motion";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Monster from "./Monster";
import Warrior from "./Warrior";
import { StarIcon } from "./icons";
import type { Avatar } from "@/lib/db";
import { BOSS, type Decor, type World } from "@/lib/game";

export type SceneHandle = { charge: (battle: number) => Promise<void> };

type Props = {
  world: World;
  avatar: Avatar;
  stars: (number | undefined)[]; // per battle
  unlocked: boolean[]; // per battle
  selected: number;
  onSelect: (b: number) => void;
};

// Depth of each battle along the road (bigger = farther away).
const DEPTH = [1.6, 2.4, 3.5, 5.1, 8.2];
const SIDE = [-1, 1, -1, 1, 0];

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

// A first-person view down the road: your warrior in front, each enemy waiting by its level,
// and the boss hidden in the fog at the end.
const WorldScene = forwardRef<SceneHandle, Props>(function WorldScene({ world, avatar, stars, unlocked, selected, onSelect }, ref) {
  const [box, W] = useSize<HTMLDivElement>();
  const [scope, animate] = useAnimate();
  const H = Math.round(Math.max(440, Math.min(660, W * 0.62)));
  const horizon = H * 0.36;
  const t = world.theme;
  const bossOpen = unlocked[BOSS];

  const proj = (z: number, lateral: number) => {
    const s = 1 / z;
    return { x: W / 2 + lateral * (W / 2) * s, y: horizon + (H - horizon) * s * 0.94, s };
  };
  const roadHalf = (z: number) => 0.32 * (W / 2) * (1 / z);

  useImperativeHandle(ref, () => ({
    async charge(b: number) {
      const p = proj(DEPTH[b], SIDE[b] * 0.5);
      await animate(scope.current, { scale: [1, 2.6], filter: ["blur(0px)", "blur(6px)"], opacity: [1, 0] }, { duration: 0.6, ease: [0.5, 0, 0.75, 0] });
      void p;
    },
  }));

  // Side scenery at fixed depths.
  const decor: { z: number; side: number; kind: Decor; lat: number }[] = [];
  [1.15, 1.5, 1.95, 2.5, 3.2, 4.1, 5.3, 6.8, 8.8, 11.5].forEach((z, i) => {
    decor.push({ z, side: -1, kind: t.decor[i % t.decor.length], lat: 1.15 + ((i * 37) % 5) * 0.12 });
    decor.push({ z: z * 1.08, side: 1, kind: t.decor[(i + 1) % t.decor.length], lat: 1.2 + ((i * 53) % 5) * 0.12 });
  });

  const base = Math.min(W * 0.34, 300);
  const warriorSize = Math.min(W * 0.22, 200);

  // Road center dashes from near to far.
  const dashes: string[] = [];
  for (let z = 1.05; z < 14; z *= 1.32) {
    const a = proj(z, 0), b2 = proj(z * 1.14, 0);
    const wa = Math.max(1, roadHalf(z) * 0.05), wb = Math.max(0.6, roadHalf(z * 1.14) * 0.05);
    dashes.push(`${a.x - wa},${a.y} ${a.x + wa},${a.y} ${b2.x + wb},${b2.y} ${b2.x - wb},${b2.y}`);
  }

  return (
    <div ref={box} className="relative w-full overflow-hidden rounded-[30px] border-[3px]" style={{ height: H || 480, borderColor: t.roadEdge, boxShadow: `0 10px 0 ${t.roadEdge}` }}>
      {W > 0 && (
        <div ref={scope} className="absolute inset-0" style={{ transformOrigin: `50% ${horizon + (H - horizon) * 0.3}px` }}>
          {/* sky */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${t.skyTop} 0%, ${t.skyBottom} ${(horizon / H) * 100}%, ${t.groundFar} ${(horizon / H) * 100}%, ${t.groundNear} 100%)` }} />
          {t.night ? (
            <>
              {Array.from({ length: 28 }).map((_, i) => (
                <motion.span key={i} aria-hidden className="absolute rounded-full bg-white" style={{ left: `${(i * 37) % 100}%`, top: ((i * 53) % 100) * (horizon / 100) * 0.9, width: i % 4 ? 2 : 3, height: i % 4 ? 2 : 3 }} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2 + (i % 5) * 0.6, repeat: Infinity, delay: i * 0.13 }} />
              ))}
              <div aria-hidden className="absolute rounded-full" style={{ right: "12%", top: horizon * 0.18, width: W * 0.07, height: W * 0.07, background: "#FFF6D6", boxShadow: "0 0 40px 10px rgba(255,246,214,.35)" }} />
            </>
          ) : (
            <motion.div aria-hidden className="absolute rounded-full" style={{ left: "14%", top: horizon * 0.2, width: W * 0.09, height: W * 0.09, background: "#FFF3B0", boxShadow: "0 0 60px 20px rgba(255,243,176,.6)" }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 5, repeat: Infinity }} />
          )}
          {!t.night &&
            [0.18, 0.62].map((x, i) => (
              <motion.div key={x} aria-hidden className="absolute rounded-full bg-white/80" style={{ left: `${x * 100}%`, top: horizon * (0.25 + i * 0.25), width: W * 0.14, height: W * 0.035 }} animate={{ x: [0, i ? -30 : 30, 0] }} transition={{ duration: 16 + i * 4, repeat: Infinity, ease: "easeInOut" }} />
            ))}

          {/* far hills or peaks */}
          <svg aria-hidden className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            {t.peaks ? (
              <path d={`M0 ${horizon} L${W * 0.12} ${horizon - H * 0.14} L${W * 0.22} ${horizon - H * 0.05} L${W * 0.36} ${horizon - H * 0.2} L${W * 0.5} ${horizon - H * 0.06} L${W * 0.66} ${horizon - H * 0.18} L${W * 0.8} ${horizon - H * 0.07} L${W * 0.92} ${horizon - H * 0.15} L${W} ${horizon - H * 0.05} L${W} ${horizon} Z`} fill={t.far} stroke="#C9D4EA" strokeWidth="2" />
            ) : (
              <path d={`M0 ${horizon} Q${W * 0.12} ${horizon - H * 0.09} ${W * 0.26} ${horizon - H * 0.03} Q${W * 0.42} ${horizon - H * 0.12} ${W * 0.58} ${horizon - H * 0.02} Q${W * 0.76} ${horizon - H * 0.1} ${W} ${horizon - H * 0.03} L${W} ${horizon} Z`} fill={t.far} opacity="0.9" />
            )}
            {/* road */}
            <polygon points={`${W / 2 - roadHalf(0.92) * 1.08},${H} ${W / 2 + roadHalf(0.92) * 1.08},${H} ${W / 2 + 2},${horizon} ${W / 2 - 2},${horizon}`} fill={t.roadEdge} />
            <polygon points={`${W / 2 - roadHalf(0.92)},${H} ${W / 2 + roadHalf(0.92)},${H} ${W / 2 + 1.5},${horizon} ${W / 2 - 1.5},${horizon}`} fill={t.road} />
            {dashes.map((d, i) => <polygon key={i} points={d} fill={t.roadLine} />)}
          </svg>

          {/* scenery, far to near */}
          {decor
            .sort((a, b) => b.z - a.z)
            .map((d, i) => {
              const p = proj(d.z, d.side * d.lat);
              const size = W * 0.2 * p.s;
              return (
                <div key={i} aria-hidden className="pointer-events-none absolute" style={{ left: p.x - size / 2, top: p.y - size, width: size, height: size, zIndex: Math.round(200 - d.z * 10) }}>
                  <Scenery kind={d.kind} />
                </div>
              );
            })}

          {/* fog over the boss */}
          <motion.div aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top: horizon - H * 0.16, height: H * 0.34, zIndex: 120, background: `linear-gradient(180deg, transparent, ${t.fog} 45%, transparent)` }} animate={{ opacity: bossOpen ? 0.3 : 0.85 }} transition={{ duration: 1.2 }} />
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              aria-hidden
              className="pointer-events-none absolute rounded-full"
              style={{ top: horizon - H * (0.1 - i * 0.04), left: `${10 + i * 28}%`, width: W * 0.42, height: H * 0.12, background: t.fog, filter: "blur(18px)", zIndex: 121 }}
              animate={{ x: [0, i % 2 ? -50 : 50, 0], opacity: bossOpen ? 0.2 : [0.45, 0.7, 0.45] }}
              transition={{ duration: 9 + i * 3, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}

          {/* battles: a level pad on the road and the enemy standing beside it */}
          {DEPTH.map((z, b) => {
            const boss = b === BOSS;
            const enemy = world.enemies[b];
            const won = !!stars[b];
            const open = unlocked[b];
            const isNext = open && !won;
            const pad = proj(z, SIDE[b] * 0.12);
            const at = proj(z, SIDE[b] * (boss ? 0 : 0.78));
            const size = (boss ? base * 2.7 : base) * at.s * (selected === b ? 1.06 : 1);
            const padW = Math.max(26, roadHalf(z) * 0.9);
            const zi = boss ? 120 : Math.round(200 - z * 10);
            const hidden = boss && !bossOpen;
            return (
              <div key={b}>
                <motion.button
                  type="button"
                  onClick={() => onSelect(b)}
                  aria-label={`${boss ? "Boss" : `Battle ${b + 1}`}: ${hidden ? "hidden in the fog" : enemy.name}${won ? `, won with ${stars[b]} stars` : open ? "" : ", locked"}`}
                  className="absolute grid place-items-center rounded-[50%] border-white font-display text-white"
                  style={{
                    left: pad.x - padW / 2,
                    top: pad.y - padW * 0.18,
                    width: padW,
                    height: padW * 0.36,
                    zIndex: zi + 1,
                    borderWidth: Math.max(2, 4 * pad.s),
                    fontSize: Math.max(10, 26 * pad.s),
                    background: won ? "#FFC83D" : isNext ? "#FF8A00" : boss ? "#E5484D" : "#A9B4C8",
                    boxShadow: `0 ${Math.max(3, 9 * pad.s)}px 0 ${won ? "#E5A300" : isNext ? "#D96F00" : boss ? "#B3343A" : "#7D879E"}`,
                  }}
                  animate={isNext ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={isNext ? { duration: 1.4, repeat: Infinity } : undefined}
                >
                  {boss ? "!" : b + 1}
                </motion.button>

                <motion.button
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  onClick={() => onSelect(b)}
                  className="absolute"
                  style={{
                    left: at.x - size / 2,
                    top: at.y - size * 0.98,
                    width: size,
                    height: size,
                    zIndex: zi,
                    filter: won ? "grayscale(0.7) brightness(1.05)" : !open && !hidden ? "saturate(0.55) brightness(0.92)" : undefined,
                    opacity: won ? 0.55 : 1,
                  }}
                  whileHover={{ scale: 1.07 }}
                  animate={{ rotate: won ? -10 : 0 }}
                >
                  <Monster enemy={enemy} boss={boss} size={size} silhouette={hidden} idle={!won} hurt={won} />
                </motion.button>

                {/* markers above enemies */}
                {isNext && !hidden && (
                  <motion.div className="pointer-events-none absolute grid place-items-center rounded-full bg-white font-display text-ember" style={{ left: at.x - 16, top: at.y - size - 34, width: 32, height: 32, zIndex: zi + 2, boxShadow: "0 4px 0 #D96F00", fontSize: 22 }} animate={{ y: [0, -8, 0] }} transition={{ duration: 1, repeat: Infinity }}>
                    !
                  </motion.div>
                )}
                {won && (
                  <div className="pointer-events-none absolute flex" style={{ left: at.x - 33, top: at.y - size - 20, zIndex: zi + 2 }}>
                    {[1, 2, 3].map((s) => <StarIcon key={s} size={22} on={s <= (stars[b] || 0)} />)}
                  </div>
                )}
                {selected === b && (
                  <motion.div layoutId="select-ring" className="pointer-events-none absolute rounded-[50%] border-4 border-white" style={{ left: at.x - size * 0.42, top: at.y - size * 0.12, width: size * 0.84, height: size * 0.26, zIndex: zi - 1, boxShadow: "0 0 0 3px rgba(255,138,0,.8)" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                )}
              </div>
            );
          })}

          {/* your warrior, seen from behind */}
          <motion.div className="pointer-events-none absolute" style={{ left: W / 2 - warriorSize / 2 + W * 0.11, bottom: -warriorSize * 0.06, width: warriorSize, zIndex: 300 }} initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 140, damping: 16, delay: 0.15 }}>
            <Warrior facing="back" armor={avatar.armor} energy={avatar.energy} finish={avatar.finish} aura={avatar.aura} size={warriorSize} />
          </motion.div>

          <AnimatePresence>
            {!bossOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1F2440]/70 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white" style={{ top: horizon - H * 0.2, zIndex: 130 }}>
                Something waits in the fog
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
});

export default WorldScene;

function Scenery({ kind }: { kind: Decor }) {
  switch (kind) {
    case "palm":
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <path d="M50 100 Q46 70 54 40" stroke="#9C6B3C" strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M54 40 Q30 28 12 42 M54 40 Q78 26 92 40 M54 40 Q40 16 22 18 M54 40 Q70 14 86 20 M54 40 Q56 20 52 8" stroke="#2FAE55" strokeWidth="9" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "pine":
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <rect x="45" y="78" width="10" height="22" rx="3" fill="#8A5A2E" />
          <path d="M50 6 L80 50 H64 L86 80 H14 L36 50 H20 Z" fill="#2E8B57" />
          <path d="M50 6 L80 50 H64 L86 80 H50 Z" fill="#257A4B" />
        </svg>
      );
    case "rock":
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <path d="M14 100 L24 64 L46 52 L72 60 L88 100 Z" fill="#A9B2C3" />
          <path d="M46 52 L72 60 L88 100 L56 100 Z" fill="#8E98AC" />
        </svg>
      );
    case "crystal":
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <path d="M40 100 L30 50 L44 20 L56 52 Z" fill="#B394FF" />
          <path d="M44 20 L56 52 L52 100 L40 100 Z" fill="#8B5CF6" />
          <path d="M60 100 L58 60 L70 36 L80 62 L74 100 Z" fill="#7DF9FF" opacity="0.9" />
        </svg>
      );
    case "pillar":
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <rect x="34" y="20" width="32" height="76" fill="#D7D9E3" />
          <rect x="54" y="20" width="12" height="76" fill="#B9BCCB" />
          <rect x="28" y="12" width="44" height="10" rx="2" fill="#C5C8D6" />
          <rect x="28" y="92" width="44" height="8" rx="2" fill="#C5C8D6" />
          <path d="M38 26 v18 h10 l-5 -6 l5 -6 z" fill="#E5484D" />
        </svg>
      );
    case "lily":
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <ellipse cx="50" cy="86" rx="40" ry="12" fill="#3FAE6A" />
          <path d="M50 86 L90 80 A40 12 0 0 0 82 76 Z" fill="#7FD3EA" />
          <circle cx="40" cy="80" r="7" fill="#FF8FB1" />
        </svg>
      );
    case "obelisk":
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <path d="M40 100 L44 20 L50 8 L56 20 L60 100 Z" fill="#3B3F8F" />
          <path d="M50 8 L56 20 L60 100 L50 100 Z" fill="#2B2F6B" />
          <text x="50" y="56" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontWeight="800" fontSize="9" fill="#FFC83D">{"{}"}</text>
          <circle cx="50" cy="22" r="3" fill="#FFC83D" />
        </svg>
      );
  }
}
