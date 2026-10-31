"use client";

import { animate, motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from "react";
import Monster from "./Monster";
import Warrior from "./Warrior";
import { StarIcon } from "./icons";
import type { Avatar } from "@/lib/db";
import { BOSS, type Decor, type World } from "@/lib/game";

export type SceneHandle = { charge: (battle: number) => Promise<void> };

type Props = {
  worldIndex: number;
  world: World;
  avatar: Avatar;
  stars: (number | undefined)[];
  unlocked: boolean[];
  selected: number;
  onSelect: (b: number) => void;
  height: number;
};

// Distance of each battle down the road. The camera walks forward as you win.
export const DEPTH = [1.8, 3.6, 5.4, 7.2, 10.2];
const SIDE = [-1, 1, -1, 1, 0];
const camFor = (b: number) => (b === BOSS ? DEPTH[BOSS] - 2.3 : Math.max(0, DEPTH[b] - 1.6));
const NEAR = 0.38;
const ease = [0.22, 1, 0.36, 1] as const;

const MonsterArt = memo(Monster);
const WarriorArt = memo(Warrior);

function useWidth<T extends HTMLElement>() {
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

type Geo = { W: number; H: number; horizon: number };

// Places a box on the ground at depth z (relative to the camera), using only transforms.
function Placed({ cam, z, lat, g, w, h, zIndex, children, fadeNear = true }: { cam: MotionValue<number>; z: number; lat: number; g: Geo; w: number; h: number; zIndex: number; children: ReactNode; fadeNear?: boolean }) {
  const rel = useTransform(cam, (c) => z - c);
  const scale = useTransform(rel, (r) => 1 / Math.max(NEAR, r));
  const x = useTransform(rel, (r) => g.W / 2 + lat * (g.W / 2) / Math.max(NEAR, r) - w / 2);
  const y = useTransform(rel, (r) => g.horizon + ((g.H - g.horizon) * 0.94) / Math.max(NEAR, r) - h);
  const opacity = useTransform(rel, (r) => (!fadeNear ? 1 : r < 0.7 ? 0 : r < 1.05 ? (r - 0.7) / 0.35 : 1));
  const visibility = useTransform(rel, (r) => (r < 0.72 || r > 40 ? "hidden" : "visible"));
  return (
    <motion.div className="absolute left-0 top-0" style={{ width: w, height: h, x, y, scale, opacity, visibility, zIndex, transformOrigin: "50% 100%", willChange: "transform" }}>
      {children}
    </motion.div>
  );
}

// First-person view down the road: your warrior in front, each enemy waiting by its level,
// and the boss hidden in fog until the four battles before it are won.
const WorldScene = forwardRef<SceneHandle, Props>(function WorldScene({ worldIndex, world, avatar, stars, unlocked, selected, onSelect, height }, ref) {
  const [box, W] = useWidth<HTMLDivElement>();
  const H = height;
  const horizon = H * 0.38;
  const g = useMemo(() => ({ W, H, horizon }), [W, H, horizon]);
  const t = world.theme;
  const bossOpen = unlocked[BOSS];
  const storeKey = `cw.cam.${worldIndex}`;

  // Camera: start where the player last stood in this world, then walk to the selected battle.
  const cam = useMotionValue(0);
  const [moving, setMoving] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    let from = camFor(selected);
    if (!started.current) {
      started.current = true;
      try {
        const saved = Number(sessionStorage.getItem(storeKey));
        if (!Number.isNaN(saved) && sessionStorage.getItem(storeKey) !== null) from = saved;
      } catch {}
      cam.set(from);
    }
    const to = camFor(selected);
    if (Math.abs(cam.get() - to) < 0.01) return;
    setMoving(true);
    const dist = Math.abs(cam.get() - to);
    const ctl = animate(cam, to, { duration: Math.min(2.2, 0.7 + dist * 0.35), ease, onComplete: () => setMoving(false) });
    return () => ctl.stop();
  }, [selected, cam, storeKey]);
  useMotionValueEvent(cam, "change", (v) => {
    try {
      sessionStorage.setItem(storeKey, String(v));
    } catch {}
  });

  useImperativeHandle(ref, () => ({
    async charge(b: number) {
      setMoving(true);
      await animate(cam, DEPTH[b] - 0.95, { duration: 0.55, ease: [0.55, 0, 0.75, 0.2] });
    },
  }));

  const roadHalf0 = 0.32 * (W / 2); // road half-width at depth 1
  const decor = useMemo(() => {
    const out: { z: number; side: number; kind: Decor; lat: number }[] = [];
    for (let i = 0; i < 34; i++) {
      const z = 1 + i * 0.62;
      out.push({ z, side: i % 2 ? 1 : -1, kind: t.decor[(i >> 1) % t.decor.length], lat: 1.18 + ((i * 37) % 6) * 0.11 });
    }
    return out;
  }, [t.decor]);
  const mobile = W < 640;
  const warriorSize = mobile ? W * 0.3 : Math.min(W * 0.2, 190);

  return (
    <div ref={box} className="relative w-full overflow-hidden" style={{ height: H }}>
      {W > 0 && (
        <>
          {/* sky and ground */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${t.skyTop} 0%, ${t.skyBottom} ${(horizon / H) * 100}%, ${t.groundFar} ${(horizon / H) * 100}%, ${t.groundNear} 100%)` }} />
          {t.night ? (
            <>
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.span key={i} aria-hidden className="absolute rounded-full bg-white" style={{ left: `${(i * 37) % 100}%`, top: ((i * 53) % 100) * (horizon / 100) * 0.92, width: i % 4 ? 2 : 3, height: i % 4 ? 2 : 3 }} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2 + (i % 5) * 0.6, repeat: Infinity, delay: i * 0.13 }} />
              ))}
              <div aria-hidden className="absolute rounded-full" style={{ right: "14%", top: horizon * 0.22, width: W * 0.06, height: W * 0.06, background: "#FFF6D6", boxShadow: "0 0 50px 14px rgba(255,246,214,.3)" }} />
            </>
          ) : (
            <div aria-hidden className="absolute rounded-full" style={{ left: "16%", top: horizon * 0.24, width: W * 0.08, height: W * 0.08, background: "#FFF7C7", boxShadow: "0 0 80px 30px rgba(255,243,176,.55)" }} />
          )}
          {!t.night &&
            [0.12, 0.58, 0.82].map((x, i) => (
              <motion.div key={x} aria-hidden className="absolute rounded-full bg-white/75" style={{ left: `${x * 100}%`, top: horizon * (0.22 + i * 0.18), width: W * (0.12 - i * 0.02), height: W * 0.026 }} animate={{ x: [0, i % 2 ? -26 : 26, 0] }} transition={{ duration: 18 + i * 5, repeat: Infinity, ease: "easeInOut" }} />
            ))}
          <svg aria-hidden className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            {t.peaks ? (
              <path d={`M0 ${horizon} L${W * 0.1} ${horizon - H * 0.13} L${W * 0.2} ${horizon - H * 0.05} L${W * 0.34} ${horizon - H * 0.19} L${W * 0.48} ${horizon - H * 0.06} L${W * 0.64} ${horizon - H * 0.17} L${W * 0.79} ${horizon - H * 0.06} L${W * 0.91} ${horizon - H * 0.14} L${W} ${horizon - H * 0.05} L${W} ${horizon} Z`} fill={t.far} />
            ) : (
              <path d={`M0 ${horizon} Q${W * 0.12} ${horizon - H * 0.08} ${W * 0.26} ${horizon - H * 0.03} Q${W * 0.42} ${horizon - H * 0.11} ${W * 0.58} ${horizon - H * 0.02} Q${W * 0.76} ${horizon - H * 0.09} ${W} ${horizon - H * 0.03} L${W} ${horizon} Z`} fill={t.far} opacity="0.85" />
            )}
            <polygon points={`${W / 2 - roadHalf0 * 1.2},${H} ${W / 2 + roadHalf0 * 1.2},${H} ${W / 2 + 2},${horizon} ${W / 2 - 2},${horizon}`} fill={t.roadEdge} />
            <polygon points={`${W / 2 - roadHalf0 * 1.1},${H} ${W / 2 + roadHalf0 * 1.1},${H} ${W / 2 + 1.5},${horizon} ${W / 2 - 1.5},${horizon}`} fill={t.road} />
          </svg>

          {/* center dashes stream toward you as the camera walks */}
          {Array.from({ length: 30 }).map((_, i) => (
            <Placed key={`d${i}`} cam={cam} z={0.8 + i * 0.7} lat={0} g={g} w={Math.max(4, W * 0.012)} h={Math.max(10, W * 0.06)} zIndex={5}>
              <div className="h-full w-full rounded-full" style={{ background: t.roadLine }} />
            </Placed>
          ))}

          {decor.map((d, i) => (
            <Placed key={`s${i}`} cam={cam} z={d.z} lat={d.side * d.lat} g={g} w={W * 0.2} h={W * 0.2} zIndex={Math.round(400 - d.z * 10)}>
              <Scenery kind={d.kind} />
            </Placed>
          ))}

          {/* fog only while the boss is still locked */}
          {!bossOpen && (
            <>
              <div aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top: horizon - H * 0.14, height: H * 0.3, zIndex: 290, background: `linear-gradient(180deg, transparent, ${t.fog} 48%, transparent)`, opacity: 0.8 }} />
              {[0, 1, 2].map((i) => (
                <motion.div key={i} aria-hidden className="pointer-events-none absolute rounded-full" style={{ top: horizon - H * (0.09 - i * 0.035), left: `${8 + i * 28}%`, width: W * 0.42, height: H * 0.11, background: `radial-gradient(closest-side, ${t.fog}, transparent)`, opacity: 0.75, zIndex: 291 }} animate={{ x: [0, i % 2 ? -50 : 50, 0] }} transition={{ duration: 9 + i * 3, repeat: Infinity, ease: "easeInOut" }} />
              ))}
            </>
          )}

          {/* each battle: a pad on the road and its enemy standing beside it */}
          {DEPTH.map((z, b) => {
            const boss = b === BOSS;
            const enemy = world.enemies[b];
            const won = !!stars[b];
            const open = unlocked[b];
            const next = open && !won;
            const hidden = boss && !bossOpen;
            const size = boss ? Math.min(W * 0.5, 460) : Math.min(W * 0.3, 270);
            const padW = roadHalf0 * 0.95;
            const zi = boss ? (hidden ? 285 : 400 - Math.round(z * 10)) : 400 - Math.round(z * 10);
            return (
              <div key={b}>
                <Placed cam={cam} z={z} lat={SIDE[b] * 0.1} g={g} w={padW} h={padW * 0.34} zIndex={zi + 1}>
                  <button
                    type="button"
                    onClick={() => onSelect(b)}
                    aria-label={`${boss ? "Boss" : `Battle ${b + 1}`}${hidden ? ", hidden in the fog" : `: ${enemy.name}`}${won ? `, won with ${stars[b]} stars` : open ? "" : ", locked"}`}
                    className="grid h-full w-full place-items-center rounded-[50%] border-[6px] border-white font-display text-[34px] text-white"
                    style={{ background: won ? "#FFC83D" : next ? "#FF8A00" : boss ? "#E5484D" : "#A9B4C8", boxShadow: `0 12px 0 ${won ? "#E5A300" : next ? "#D96F00" : boss ? "#B3343A" : "#7D879E"}${selected === b ? ", 0 0 0 8px rgba(255,255,255,.55)" : ""}` }}
                  >
                    {won ? "✓" : boss ? "!" : b + 1}
                  </button>
                </Placed>
                <Placed cam={cam} z={z + 0.01} lat={boss ? 0 : SIDE[b] * 0.8} g={g} w={size} h={size} zIndex={zi}>
                  <motion.button
                    type="button"
                    tabIndex={-1}
                    aria-hidden
                    onClick={() => onSelect(b)}
                    className="relative block h-full w-full"

                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.25, ease }}
                  >
                    {selected === b && !hidden && <span className="absolute bottom-[1%] left-[16%] h-[11%] w-[68%] rounded-[50%] border-[5px] border-white/90" style={{ boxShadow: "0 0 0 5px rgba(255,138,0,.6)" }} />}
                    <span className="block" style={{ filter: won ? "grayscale(0.75)" : !open && !hidden ? "saturate(0.6)" : undefined, opacity: won ? 0.6 : 1 }}>
                      <MonsterArt enemy={enemy} boss={boss} size={size} silhouette={hidden} idle={!won} hurt={won} />
                    </span>
                    {next && !hidden && (
                      <motion.span className="absolute left-1/2 top-[-6%] grid h-[15%] w-[15%] min-w-[26px] -translate-x-1/2 place-items-center rounded-full bg-white font-display text-ember" style={{ boxShadow: "0 4px 0 #D96F00", fontSize: size * 0.1 }} animate={{ y: [0, -8, 0] }} transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}>
                        !
                      </motion.span>
                    )}
                    {won && (
                      <span className="absolute left-1/2 top-[-4%] flex -translate-x-1/2">
                        {[1, 2, 3].map((s) => <StarIcon key={s} size={size * 0.13} on={s <= (stars[b] || 0)} />)}
                      </span>
                    )}
                  </motion.button>
                </Placed>
              </div>
            );
          })}

          {/* your warrior from behind; it bobs faster while walking */}
          <motion.div className="pointer-events-none absolute" style={{ left: W / 2 - warriorSize / 2 + W * (mobile ? 0.16 : 0.1), bottom: mobile ? 46 : -warriorSize * 0.08, width: warriorSize, zIndex: 600 }} initial={{ y: 60 }} animate={moving ? { y: [0, -10, 0], rotate: [-2, 2, -2] } : { y: 0, rotate: 0 }} transition={moving ? { duration: 0.45, repeat: Infinity, ease: "easeInOut" } : { duration: 0.5, ease }}>
            <WarriorArt facing="back" body={avatar.body} armor={avatar.armor} energy={avatar.energy} finish={avatar.finish} aura={avatar.aura} size={warriorSize} />
          </motion.div>
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ zIndex: 650, background: "radial-gradient(ellipse at 50% 40%, transparent 55%, rgba(15,18,45,.22))" }} />
        </>
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
