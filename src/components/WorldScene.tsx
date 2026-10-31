"use client";

import { animate, motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from "react";
import Monster from "./Monster";
import Warrior from "./Warrior";
import { StarIcon } from "./icons";
import { Ambient, Backdrop, RoadExtras, RoadMark, Scenery, roadMarkSize } from "./worldArt";
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
  width: number;
};

// Distance of each battle down the road. The camera walks forward as you win.
export const DEPTH = [1.8, 3.6, 5.4, 7.2, 10.2];
const SIDE = [-1, 1, -1, 1, 0];
const camFor = (b: number) => (b === BOSS ? DEPTH[BOSS] - 2.3 : Math.max(0, DEPTH[b] - 1.6));
const NEAR = 0.38;
const ease = [0.22, 1, 0.36, 1] as const;

const MonsterArt = memo(Monster);
const WarriorArt = memo(Warrior);

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
const WorldScene = forwardRef<SceneHandle, Props>(function WorldScene({ worldIndex, world, avatar, stars, unlocked, selected, onSelect, height, width }, ref) {
  const W = width;
  const H = height;
  const horizon = H * 0.38;
  const g = useMemo(() => ({ W, H, horizon }), [W, H, horizon]);
  const t = world.theme;
  const bossOpen = unlocked[BOSS];
  const storeKey = `cw.cam.${worldIndex}`;

  // Camera: start where the player last stood in this world, then walk to the selected battle.
  // Start the camera where the player last stood, already on the first frame
  // (setting it in an effect drew one frame from the wrong spot, which looked like a flash).
  const [startCam] = useState(() => {
    try {
      const raw = sessionStorage.getItem(storeKey);
      if (raw !== null && !Number.isNaN(Number(raw))) return Number(raw);
    } catch {}
    return camFor(selected);
  });
  const cam = useMotionValue(startCam);
  const [moving, setMoving] = useState(false);
  useEffect(() => {
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
  const mark = roadMarkSize(t, W, roadHalf0);
  const mobile = W < 640;
  const warriorSize = mobile ? W * 0.3 : Math.min(W * 0.2, 190);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: H }}>
      {W > 0 && (
        <>
          {/* sky and ground */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${t.skyTop} 0%, ${t.skyBottom} ${(horizon / H) * 100}%, ${t.groundFar} ${(horizon / H) * 100}%, ${t.groundNear} 100%)` }} />
          <Backdrop W={W} H={H} hz={horizon} t={t} />
          <svg aria-hidden className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <polygon points={`${W / 2 - roadHalf0 * 1.2},${H} ${W / 2 + roadHalf0 * 1.2},${H} ${W / 2 + 2},${horizon} ${W / 2 - 2},${horizon}`} fill={t.roadEdge} />
            <polygon points={`${W / 2 - roadHalf0 * 1.1},${H} ${W / 2 + roadHalf0 * 1.1},${H} ${W / 2 + 1.5},${horizon} ${W / 2 - 1.5},${horizon}`} fill={t.road} />
          </svg>
          <RoadExtras W={W} H={H} hz={horizon} t={t} half={roadHalf0} />

          {/* road markings stream toward you as the camera walks */}
          {Array.from({ length: Math.round(20 / mark.gap) }).map((_, i) => (
            <Placed key={`d${i}`} cam={cam} z={0.8 + i * mark.gap} lat={0} g={g} w={mark.w} h={mark.h} zIndex={5}>
              <RoadMark t={t} />
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

          <Ambient W={W} H={H} hz={horizon} t={t} />
          {/* your warrior from behind; it bobs faster while walking */}
          <motion.div className="pointer-events-none absolute" style={{ left: W / 2 - warriorSize / 2 + W * (mobile ? 0.16 : 0.1), bottom: mobile ? 46 : -warriorSize * 0.08, width: warriorSize, zIndex: 600 }} initial={{ y: 60 }} animate={moving ? { y: [0, -10, 0], rotate: [-2, 2, -2] } : { y: 0, rotate: 0 }} transition={moving ? { duration: 0.45, repeat: Infinity, ease: "easeInOut" } : { duration: 0.5, ease }}>
            <WarriorArt facing="back" weapon={avatar.weapon} headwear={avatar.headwear} body={avatar.body} armor={avatar.armor} energy={avatar.energy} finish={avatar.finish} aura={avatar.aura} size={warriorSize} />
          </motion.div>
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ zIndex: 650, background: "radial-gradient(ellipse at 50% 40%, transparent 55%, rgba(15,18,45,.22))" }} />
        </>
      )}
    </div>
  );
});

export default WorldScene;
