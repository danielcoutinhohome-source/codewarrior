"use client";

import { animate, motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { useReduceMotion } from "@/lib/motionPref";
import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from "react";
import Monster from "./Monster";
import WorldLandmark from "./WorldLandmark";
import { worldDetails } from "@/lib/worldDetails";
import Warrior from "./Warrior";
import { PassageFrame, BossDoor } from "./WorldPassage";
import { bossApproach } from "@/lib/bossApproach";
import { StarIcon } from "./icons";
import { Backdrop, RoadExtras, RoadMark, Scenery, roadMarkSize } from "./worldArt";
import type { Avatar } from "@/lib/db";
import { BOSS, type World } from "@/lib/game";

export type SceneHandle = { charge: (battle: number) => Promise<void> };

type Props = {
  worldIndex: number;
  world: World;
  avatar: Avatar;
  stars: (number | undefined)[];
  unlocked: boolean[];
  selected: number;
  onSelect: (b: number) => void;
  onEnterBoss?: () => void;
  height: number;
  width: number;
};

// Distance of each battle down the road. The camera walks forward as you win.
export const DEPTH = [1.8, 3.6, 5.4, 7.2, 10.2];
const SIDE = [-1, 1, -1, 1, 0];
const camFor = (b: number) => (b === BOSS ? DEPTH[BOSS] - 1.65 : Math.max(0, DEPTH[b] - 1.6));
const NEAR = 0.38;
const ease = [0.22, 1, 0.36, 1] as const;

const MonsterArt = memo(Monster);
const WarriorArt = memo(Warrior);

type Geo = { W: number; H: number; horizon: number };

// Places a box on the ground at depth z (relative to the camera), using only transforms.
function Placed({ cam, z, lat, g, w, h, zIndex, children, fadeNear = true, decorative = false }: { cam: MotionValue<number>; z: number; lat: number; g: Geo; w: number; h: number; zIndex: number; children: ReactNode; fadeNear?: boolean; decorative?: boolean }) {
  const rel = useTransform(cam, (c) => z - c);
  const scale = useTransform(rel, (r) => 1 / Math.max(NEAR, r));
  const x = useTransform(rel, (r) => g.W / 2 + lat * (g.W / 2) / Math.max(NEAR, r) - w / 2);
  const y = useTransform(rel, (r) => g.horizon + ((g.H - g.horizon) * 0.94) / Math.max(NEAR, r) - h);
  const opacity = useTransform(rel, (r) => (!fadeNear ? 1 : r < 0.7 ? 0 : r < 1.05 ? (r - 0.7) / 0.35 : 1));
  const visibility = useTransform(rel, (r) => (r < 0.72 || r > 40 ? "hidden" : "visible"));
  return (
    <motion.div className="absolute left-0 top-0" style={{ width: w, height: h, x, y, scale, opacity, visibility, zIndex, pointerEvents: decorative ? "none" : undefined, transformOrigin: "50% 100%", willChange: "transform" }}>
      {children}
    </motion.div>
  );
}

// First-person view down the road: your warrior in front, each enemy waiting by its level,
// and the boss hidden in fog until the four battles before it are won.
const WorldScene = forwardRef<SceneHandle, Props>(function WorldScene({ worldIndex, world, avatar, stars, unlocked, selected, onSelect, onEnterBoss, height, width }, ref) {
  const W = width;
  const H = height;
  const horizon = H * 0.38;
  const g = useMemo(() => ({ W, H, horizon }), [W, H, horizon]);
  const t = useMemo(()=>world.theme.scene==="citadel"?{...world.theme,road:"#27394C",roadEdge:"#4B7B79",roadLine:"#8AB8A8"}:world.theme,[world.theme]);
  const furthest = Math.max(0,unlocked.lastIndexOf(true));
  const cameraBattle = Math.min(selected,furthest);
  const approach = bossApproach(stars, selected);
  const reduced = !!useReduceMotion();
  const focusGate = cameraBattle === BOSS && approach.ready && !stars[BOSS];
  const doorHeight = Math.min(W * 1.1, H * .9);
  const storeKey = `cw.cam.${worldIndex}`;

  // Camera: start where the player last stood in this world, then walk to the selected battle.
  // Start the camera where the player last stood, already on the first frame
  // (setting it in an effect drew one frame from the wrong spot, which looked like a flash).
  const [startCam] = useState(() => {
    try {
      const raw = sessionStorage.getItem(storeKey);
      if (raw !== null && !Number.isNaN(Number(raw))) return Math.max(0,Math.min(Number(raw),camFor(furthest)));
    } catch {}
    return camFor(cameraBattle);
  });
  const cam = useMotionValue(startCam);
  const [moving, setMoving] = useState(false);
  // Walk first, then settle into a slight upward close-up. Keep the HUD and
  // warrior outside this transform, and cancel both phases when navigating away.
  const gateFocus = useMotionValue(0);
  const viewScale = useTransform(gateFocus, [0, 1], [1, 1.14]);
  const viewY = useTransform(gateFocus, [0, 1], [0, -H * .035]);
  useEffect(() => {
    const to = camFor(cameraBattle);
    if (reduced) {
      cam.set(to);
      gateFocus.set(focusGate ? 1 : 0);
      setMoving(false);
      return;
    }
    const reset = animate(gateFocus, 0, { duration: .35, ease });
    let settle: { stop: () => void } | undefined;
    const arrive = () => {
      setMoving(false);
      if (focusGate) settle = animate(gateFocus, 1, { duration: 1.15, ease });
    };
    const dist = Math.abs(cam.get() - to);
    if (dist < .01) {
      reset.stop();
      arrive();
      return () => settle?.stop();
    }
    setMoving(true);
    const walk = animate(cam, to, { duration: Math.min(2.2, .7 + dist * .35), ease, onComplete: arrive });
    return () => { walk.stop(); reset.stop(); settle?.stop(); };
  }, [cameraBattle, cam, gateFocus, focusGate, reduced, storeKey]);
  useMotionValueEvent(cam, "change", (v) => {
    try {
      sessionStorage.setItem(storeKey, String(v));
    } catch {}
  });

  useImperativeHandle(ref, () => ({
    async charge(b: number) {
      setMoving(true);
      await animate(cam, DEPTH[b] - 0.95, { duration: reduced ? 0 : 0.55, ease: [0.55, 0, 0.75, 0.2] });
    },
  }));

  const roadHalf0 = 0.19 * (W / 2); // road half-width at depth 1
  const mobile = W < 640;
  const details = useMemo(() => worldDetails(t, mobile), [t, mobile]);
  const mark = roadMarkSize(t, W, roadHalf0);
  const warriorSize = mobile ? W * 0.3 : Math.min(W * 0.2, 190, H * .35);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: H }}>
      {W > 0 && (
        <>
          <motion.div data-boss-camera={focusGate ? "arrival" : "travel"} className="absolute inset-0" style={{ scale: viewScale, y: viewY, transformOrigin: "50% 45%" }}>
          {/* sky and ground */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${t.skyTop} 0%, ${t.skyBottom} ${(horizon / H) * 100}%, ${t.groundFar} ${(horizon / H) * 100}%, ${t.groundNear} 100%)` }} />
          <Backdrop W={W} H={H} hz={horizon} t={t} />
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{background:"linear-gradient(180deg, rgba(5,10,22,.36), transparent 55%, rgba(5,10,22,.28))"}} />
          <PassageFrame theme={t} />
          <svg aria-hidden className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <polygon points={`${W / 2 - roadHalf0 * 1.2},${H} ${W / 2 + roadHalf0 * 1.2},${H} ${W / 2 + 2},${horizon} ${W / 2 - 2},${horizon}`} fill={t.roadEdge} />
            <polygon points={`${W / 2 - roadHalf0 * 1.1},${H} ${W / 2 + roadHalf0 * 1.1},${H} ${W / 2 + 1.5},${horizon} ${W / 2 - 1.5},${horizon}`} fill={t.road} />
          </svg>
          <div className="pointer-events-none absolute inset-0 opacity-40"><RoadExtras W={W} H={H} hz={horizon} t={t} half={roadHalf0} /></div>

          {/* road markings stream toward you as the camera walks */}
          {Array.from({ length: Math.round(20 / mark.gap) }).map((_, i) => (
            <Placed decorative key={`d${i}`} cam={cam} z={0.8 + i * mark.gap} lat={0} g={g} w={mark.w} h={mark.h} zIndex={5}>
              <RoadMark t={t} />
            </Placed>
          ))}

          {details.props.map((d, i) => (
            <Placed decorative key={`s${i}`} cam={cam} z={d.z} lat={d.lat} g={g} w={W * d.size} h={W * d.size} zIndex={Math.round(400 - d.z * 10)}>
              <div aria-hidden className="pointer-events-none h-full w-full">
                <Scenery kind={d.kind} scene={t.scene} />
              </div>
            </Placed>
          ))}
          {details.landmarks.map((d, i) => (
            <Placed decorative key={`landmark${i}`} cam={cam} z={d.z} lat={d.lat} g={g} w={W * .42} h={W * .42} zIndex={Math.round(399 - d.z * 10)}>
              <WorldLandmark theme={t} variant={d.variant} />
            </Placed>
          ))}

          {!stars[BOSS] && <Placed cam={cam} z={DEPTH[BOSS]-.2} lat={0} g={g} w={doorHeight * 240 / 280} h={doorHeight} zIndex={299}>
            <button type="button" aria-label={approach.ready?"Approach and unseal the boss gate":"Boss gate: break four seals first"} disabled={!approach.ready} onClick={()=>onEnterBoss?onEnterBoss():onSelect(BOSS)} className="block h-full w-full rounded-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-cyan-200 disabled:cursor-not-allowed"><BossDoor theme={t} ready={approach.ready}/></button>
          </Placed>}
          {/* The mist lives at the boss depth, so it stays on the threshold as
              the camera advances. Wins thin it instead of toggling it off. */}
          {!stars[BOSS] && <Placed decorative cam={cam} z={DEPTH[BOSS]-.1} lat={0} g={g} w={W*.9} h={W*.78} zIndex={300}>
            <motion.div data-boss-fog={approach.cleared} className="pointer-events-none absolute inset-[-12%]" initial={false} animate={{opacity:approach.fog}} transition={{duration:reduced?0:1.7}} style={{background:`radial-gradient(ellipse, ${t.fog} 15%, ${t.fog}CC 42%, transparent 70%)`,filter:"blur(8px)"}}/>
          </Placed>}
          <div aria-hidden className="pointer-events-none absolute inset-x-0" style={{top:horizon-H*.13,height:H*.26,zIndex:280,background:`linear-gradient(transparent, ${t.fog}55, transparent)`}}/>

          {/* each battle: a pad on the road and its enemy standing beside it */}
          {DEPTH.map((z, b) => {
            const boss = b === BOSS;
            const enemy = world.enemies[b];
            const won = !!stars[b];
            const open = unlocked[b];
            const next = open && !won;
            const hidden = !won && (!open || (boss && !approach.ready));
            const size = boss ? Math.min(W * 0.5, 460, H * .65) : Math.min(W * 0.3, 270, H * .5);
            const padW = Math.max(W*.12, roadHalf0 * 0.95);
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
                    <span className="block" style={{ filter: won ? "grayscale(1)" : hidden ? "brightness(0)" : undefined, opacity: won ? 0.8 : 1 }}>
                      {won ? (
                        <span className="block" data-defeated={enemy.design} style={{ transform: "translateY(10%) rotate(70deg) scale(0.85)", transformOrigin: "50% 70%" }}>
                          <MonsterArt enemy={enemy} boss={boss} size={size} idle={false} hurt />
                        </span>
                      ) : <MonsterArt enemy={enemy} boss={boss} size={size} silhouette={hidden || !open} idle={!hidden&&!reduced} />}
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

          </motion.div>
          <p className="pointer-events-none absolute inset-x-3 bottom-20 z-[650] mx-auto w-fit max-w-[calc(100%-1.5rem)] rounded-full bg-slate-950/55 px-3 py-1 text-center text-[10px] font-bold uppercase tracking-[.12em] text-white/90">{approach.ready ? "The threshold awaits" : `${approach.cleared} / 4 seals broken · something waits ahead`}</p>
          {/* your warrior from behind; it bobs faster while walking */}
          <motion.div className="pointer-events-none absolute" style={{ left: W / 2 - warriorSize / 2 + W * (mobile ? 0.16 : 0.1), bottom: mobile ? 46 : -warriorSize * 0.08, width: warriorSize, zIndex: 600 }} initial={{ y: 60 }} animate={moving ? { y: [0, -10, 0], rotate: [-2, 2, -2] } : { y: 0, rotate: 0 }} transition={moving ? { duration: 0.45, repeat: Infinity, ease: "easeInOut" } : { duration: 0.5, ease }}>
            <WarriorArt facing="back" weapon={avatar.weapon} headwear={avatar.headwear} body={avatar.body} armor={avatar.armor} energy={avatar.energy} finish={avatar.finish} aura={avatar.aura} size={warriorSize} />
          </motion.div>
        </>
      )}
    </div>
  );
});

export default WorldScene;
