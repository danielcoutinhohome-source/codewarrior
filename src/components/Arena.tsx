"use client";

import { AnimatePresence, motion, useAnimate } from "framer-motion";
import { useReduceMotion } from "@/lib/motionPref";
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import Monster from "./Monster";
import DuelImpact, { type DuelSpark } from "./DuelImpact";
import { BossRoom } from "./WorldPassage";
import PlayerAttackFx, { type PlayerEffect } from "./PlayerAttackFx";
import { playerMove, performPlayerMove } from "@/lib/playerCombat";
import EnemyAttackFx, { type CombatEffect } from "./EnemyAttackFx";
import { enemyMove, ENEMY_MOVESETS, performEnemyMove } from "@/lib/enemyCombat";
import Warrior from "./Warrior";
import { play, stopAll } from "@/lib/sfx";
import { contactSound, enemyImpact, enemyPhase, heroImpact, heroPhase } from "@/lib/combatSfx";
import { solid } from "@/lib/color";
import type { Avatar } from "@/lib/db";
import { weaponSpec } from "@/lib/cosmetics";
import type { Enemy, Theme } from "@/lib/game";

export type ArenaHandle = {
  attack: (o: { damage: number; crit: boolean; surge: boolean; finisher: boolean; onImpact?: () => void }) => Promise<void>;
  hurt: (o: { damage: number; blocked: boolean; knockout: boolean; onImpact?: () => void }) => Promise<void>;
  heal: (amount: number) => Promise<void>;
  powerUp: (kind: "shield" | "surge" | "scroll") => Promise<void>;
  enemyDefeated: () => Promise<void>;
  playerDefeated: () => Promise<void>;
  intro: () => Promise<void>;
};

type Props = {
  avatar: Avatar;
  enemy: Enemy;
  boss: boolean;
  theme: Theme;
  name: string;
  playerHp: number;
  playerMax: number;
  enemyHp: number;
  enemyMax: number;
  combo: number;
  shield: boolean;
  surge: boolean;
  compact?: boolean;
  revived?: boolean; // this fight is a retry: play the revive intro
};

type Pt = { x: number; y: number };
type Float = { id: number; text: string; at: Pt; color: string; big?: boolean };
type Burst = { id: number; at: Pt; colors: string[]; count: number; spread: number };
type Ring = { id: number; at: Pt; color: string; size: number; inward?: boolean };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ease = [0.22, 1, 0.36, 1] as const; // smooth ease-out
const easeIn = [0.55, 0, 0.75, 0.2] as const;
let uid = 0;

const HeroArt = memo(Warrior);
const FoeArt = memo(Monster);

const Arena = forwardRef<ArenaHandle, Props>(function Arena(p, ref) {
  const [scope, animate] = useAnimate();
  const stageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroBody = useRef<HTMLDivElement>(null);
  const foeRef = useRef<HTMLDivElement>(null);
  const foeBody = useRef<HTMLDivElement>(null);
  const playerTurn = useRef(0);
  const playerController = useRef<AbortController | null>(null);
  const [playerEffects, setPlayerEffects] = useState<PlayerEffect[]>([]);
  const [playerAttacking, setPlayerAttacking] = useState(false);
  const [enemyAttacking,setEnemyAttacking] = useState(false);
  const [duelSparks,setDuelSparks] = useState<DuelSpark[]>([]);
  const [cinematic,setCinematic] = useState<{who:"hero"|"foe";hits:number;stage:string}|null>(null);
  const [knockoutBanner,setKnockoutBanner] = useState(false);
  const reduced = !!useReduceMotion();
  const enemyTurn = useRef(0);
  const attackController = useRef<AbortController | null>(null);
  const effectTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const [enemyEffects, setEnemyEffects] = useState<CombatEffect[]>([]);
  const [moveLabel, setMoveLabel] = useState<{ name: string; ultimate: boolean } | null>(null);
  useEffect(() => {
    enemyTurn.current = 0;
    playerTurn.current = 0;
    return () => {
      attackController.current?.abort();
      playerController.current?.abort();
      effectTimers.current.forEach(clearTimeout);
      effectTimers.current.clear();
      stopAll(); // leaving the battle silences any ringing tails
    };
  }, [p.enemy.design]);
  const later = (fn: () => void, ms: number) => {
    const timer = setTimeout(() => { effectTimers.current.delete(timer); fn(); }, ms);
    effectTimers.current.add(timer);
  };
  const enemyEffect = (effect: Omit<CombatEffect, "id" | "enemy" | "compact" | "reduced">) => {
    const id = ++uid;
    setEnemyEffects(v => [...v.slice(-5), { ...effect, id, enemy: p.enemy, compact: !!p.compact, reduced }]);
    later(() => setEnemyEffects(v => v.filter(e => e.id !== id)), 1000);
  };

  const [floats, setFloats] = useState<Float[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [rings, setRings] = useState<Ring[]>([]);
  const [foeHurt, setFoeHurt] = useState(false);
  const [heroHurt, setHeroHurt] = useState(false);
  const [glow, setGlow] = useState<{ id: number; color: string } | null>(null);
  const [vignette, setVignette] = useState(false);

  const en = solid(p.avatar.energy);
  const heroSize = p.compact ? 118 : 168;
  const foeSize = p.compact ? (p.boss ? 150 : 126) : p.boss ? 220 : 178;

  // Geometry helpers, all relative to the arena box.
  const center = useCallback(
    (el: HTMLElement | null, dy = 0.5): Pt => {
      const root = scope.current as HTMLElement | null;
      if (!el || !root) return { x: 0, y: 0 };
      const a = el.getBoundingClientRect();
      const b = root.getBoundingClientRect();
      return { x: a.left + a.width / 2 - b.left, y: a.top + a.height * dy - b.top };
    },
    [scope],
  );
  const gap = () => {
    const a = center(heroRef.current), b = center(foeRef.current);
    return Math.max(0, b.x - a.x - (heroSize + foeSize)*.28);
  };
  const contact = (who:"hero"|"foe",stage:string,index:number) => {
    setCinematic({who,hits:index,stage});
    contactSound(who,stage,index);
    if(reduced || stage==="freeze")return;
    const at=center(who==="hero"?foeBody.current:heroBody.current);
    const id=++uid;
    setDuelSparks(v=>[...v.slice(-3),{id,...at,color:who==="hero"?en:p.enemy.accent,launch:stage==="launch"}]);
    later(()=>setDuelSparks(v=>v.filter(s=>s.id!==id)),420);
  };
  const pose = async (el:Element|null,values: import("@/lib/enemyCombat").ActorPose,ms:number,signal:AbortSignal) => {
    if(!el)return;
    if(ms===0){const reset=animate(el,values,{duration:0});reset.complete();return;}
    await new Promise<void>(resolve=>{
      const controls=animate(el,values,{duration:ms/1000,ease});
      const done=()=>{signal.removeEventListener("abort",cancel);resolve();};
      const cancel=()=>{controls.stop();done();};
      signal.addEventListener("abort",cancel,{once:true});controls.then(done,done);if(signal.aborted)cancel();
    });
  };

  const add = <T extends { id: number }>(set: React.Dispatch<React.SetStateAction<T[]>>, item: T, ms: number) => {
    set((v) => [...v, item]);
    later(() => set((v) => v.filter((x) => x.id !== item.id)), ms);
  };
  const float = (text: string, at: Pt, color: string, big = false) => add<Float>(setFloats, { id: ++uid, text, at, color, big }, 1250);
  const burst = (at: Pt, colors: string[], count = 12, spread = 90) => add<Burst>(setBursts, { id: ++uid, at, colors, count, spread }, 900);
  const ring = (at: Pt, color: string, size = 160, inward = false) => add<Ring>(setRings, { id: ++uid, at, color, size, inward }, 700);
  const whiteFlash = (el: HTMLElement | null) => el && animate(el, { filter: ["brightness(2.8) saturate(0.2)", "brightness(1) saturate(1)"] }, { duration: 0.22, ease: "easeOut" });
  const shake = (amt = 8) => animate(scope.current, { x: [0, -amt, amt, -amt * 0.6, amt * 0.5, 0], y: [0, amt * 0.4, -amt * 0.3, amt * 0.2, 0, 0] }, { duration: 0.36, ease: "easeOut" });

  useImperativeHandle(ref, () => ({
    async intro() {
      const h = heroRef.current, f = foeRef.current;
      if (!h || !f) return;
      setKnockoutBanner(false);
      if (p.revived) {
        animate(h, { y: [40, 0], opacity: [0, 1] }, { duration: 0.6, ease });
        animate(heroBody.current!, { scale: [0.6, 1.08, 1], rotate: [-20, 0] }, { duration: 0.7, ease });
        later(() => {
          const at = center(heroRef.current);
          burst(at, ["#3EC46D", "#B6F5C8", "#FFFFFF"], 16, 80);
          ring({ x: at.x, y: at.y + heroSize * 0.45 }, "#3EC46D", heroSize * 1.4);
          float("REVIVED!", { x: at.x, y: at.y - 70 }, "#3EC46D", true);
          play("potion");
        }, 250);
      } else {
        animate(h, { x: [-200, 0], opacity: [0, 1] }, { duration: 0.65, ease });
      }
      await animate(f, { x: [200, 0], opacity: [0, 1] }, { duration: 0.65, ease, delay: 0.08 });
    },

    async attack({ damage, crit, surge, finisher, onImpact }) {
      const h = heroRef.current, hb = heroBody.current, f = foeRef.current, fb = foeBody.current;
      if (!h || !hb || !f || !fb) return;
      playerController.current?.abort();
      const controller = new AbortController();
      playerController.current = controller;
      const move = playerMove(p.avatar.weapon, playerTurn.current++, finisher);
      const from = center(h), to = center(f), groundY = center(f, .95).y;
      // Clamp travel to the actual free space; compact boss arenas must never
      // send the warrior past the opponent or out of the clipped stage.
      const distance = Math.max(0, to.x - from.x - (heroSize + foeSize) * .28);
      const strong = crit || surge || finisher;
      const grip = h.querySelector<SVGElement>("[data-weapon-grip]");
      setPlayerAttacking(true);
      setCinematic(finisher?{who:"hero",hits:0,stage:"charge"}:null);
      setMoveLabel({ name: move.name, ultimate: finisher });
      setVignette(finisher && !reduced);
      try {
        await performPlayerMove(move, {
          signal: controller.signal, distance, compact: !!p.compact, reduced,
          animate: (actor,values,ms) => pose(actor === "hero" ? h : actor === "body" ? hb : actor === "target" ? fb : grip,values,ms,controller.signal),
          contact: (stage,index) => contact("hero",stage,index),
          wait: ms => new Promise<void>(resolve => {
            const done = () => { clearTimeout(timer); controller.signal.removeEventListener("abort", done); resolve(); };
            const timer = setTimeout(done, ms);
            controller.signal.addEventListener("abort", done, { once: true });
            if (controller.signal.aborted) done();
          }),
          effect: (phase, ms) => {
            heroPhase(move, phase);
            const id = ++uid;
            setPlayerEffects(v => [...v.slice(-3), { id, move, phase, ms, from, to, groundY, color: en, compact: !!p.compact, reduced }]);
            later(() => setPlayerEffects(v => v.filter(e => e.id !== id)), phase === "impact" ? 950 : ms);
          },
          hit: () => {
            onImpact?.();
            heroImpact(move, strong);
            float(`-${damage}`, { x: to.x, y: to.y - 40 }, strong ? "#FFC83D" : "#FFFFFF", strong);
            if (finisher || crit || surge) float(finisher ? "FINISHING BLOW!" : surge ? "POWER SURGE!" : "CRITICAL!", { x: to.x, y: to.y - 85 }, en, true);
            setFoeHurt(true);
            if (!reduced) burst(to, [en, "#FFFFFF"], finisher ? 22 : 10, finisher ? 130 : 65);
            // Recoil belongs to the awaited impact step.
          },
        });
      } finally {
        if (!controller.signal.aborted) {
          setFoeHurt(false); setVignette(false); setMoveLabel(null); setPlayerAttacking(false); setCinematic(null);
        }
      }
    },

    async hurt({ damage, blocked, knockout, onImpact }) {
      const h = heroRef.current, hb = heroBody.current, f = foeRef.current, fb = foeBody.current;
      if (!h || !hb || !f || !fb) return;
      attackController.current?.abort();
      const controller = new AbortController();
      attackController.current = controller;
      const move = enemyMove(p.enemy.design, enemyTurn.current++, knockout && !blocked);
      const from = center(f, 0.45), to = center(h);
      setEnemyAttacking(true);
      setVignette(knockout&&!reduced);
      setCinematic(knockout?{who:"foe",hits:0,stage:"charge"}:null);
      setMoveLabel({ name: move.name, ultimate: move.glyph === 3 });
      await performEnemyMove(move, {
        signal: controller.signal, distance: gap(), compact: !!p.compact, reducedMotion: reduced,
        animate: (actor,values,ms) => pose(actor === "foe" ? f : actor === "target" ? hb : fb,values,ms,controller.signal),
        contact: (stage,index) => contact("foe",stage,index),
        wait: ms => new Promise<void>(resolve => {
          const done = () => { clearTimeout(timer); controller.signal.removeEventListener("abort", done); resolve(); };
          const timer = setTimeout(done, ms);
          controller.signal.addEventListener("abort", done, { once: true });
          if (controller.signal.aborted) done();
        }),
        effect: phase => { enemyPhase(move, phase); enemyEffect({ move, phase, from, to }); },
        hit: () => {
          onImpact?.();
          const at = center(h);
          enemyImpact(move, blocked);
          if (blocked) {
            float("BLOCKED", { x: at.x, y: at.y - 70 }, "#7DF9FF", true);
            if (!reduced) ring(at, "#7DF9FF", heroSize * 1.2);
            return;
          }
          setHeroHurt(true);
          float(`-${damage}`, { x: at.x, y: at.y - 50 }, "#FF5A5F", knockout);
          if (!reduced) {
            whiteFlash(hb);
            burst(at, [p.enemy.accent, "#FFFFFF", p.enemy.color], 12, 80);
            shake(knockout ? 10 : 5);
          }
          if (!knockout) later(() => setHeroHurt(false), 650);
        },
      });
      if (!controller.signal.aborted) { setMoveLabel(null); setCinematic(null); setEnemyAttacking(false); setVignette(false); }
    },

    async heal(amount) {
      const at = center(heroRef.current);
      play("potion");
      setGlow({ id: ++uid, color: "#3EC46D" });
      burst(at, ["#3EC46D", "#B6F5C8", "#FFFFFF"], 16, 70);
      float(`+${amount}`, { x: at.x, y: at.y - 60 }, "#3EC46D", true);
      await sleep(600);
    },

    async powerUp(kind) {
      const at = center(heroRef.current);
      play(kind === "shield" ? "shield" : "potion");
      const color = kind === "shield" ? "#7DF9FF" : kind === "surge" ? "#FFC83D" : "#B394FF";
      setGlow({ id: ++uid, color });
      burst(at, [color, "#FFFFFF"], 14, 70);
      ring({ x: at.x, y: at.y + heroSize * 0.45 }, color, heroSize * 1.3);
      float(kind === "shield" ? "FIREWALL UP" : kind === "surge" ? "POWER SURGE" : "HINT", { x: at.x, y: at.y - 70 }, color, true);
      await sleep(500);
    },

    async enemyDefeated() {
      setKnockoutBanner(true);
      play("knockout", { pan: 0.25 });
      await sleep(reduced?120:650);
      const f = foeRef.current;
      if (!f) return;
      const at = center(f);
      setFoeHurt(true);
      const moveset = ENEMY_MOVESETS[p.enemy.design];
      enemyEffect({ move: moveset.finisher, phase: "defeat", from: at, to: at });
      if (reduced) { await animate(f, { opacity: 0 }, { duration: 0.2 }); return; }
      const poses = {
        shatter: { scale: [1, 1.15, 0], rotate: [0, -6, 24], y: [0, -8, 30] },
        sink: { scaleY: [1, 0.8, 0], y: [0, 20, 90], rotate: [0, -10, -18] },
        unravel: { scaleX: [1, 1.25, 0], scaleY: [1, 0.8, 1.4], rotate: [0, 12, -30] },
        decompile: { x: [0, -12, 12, -8, 0], scaleY: [1, 1, 0.05], y: [0, 0, 35] },
        eclipse: { scale: [1, 0.8, 0], y: [0, -20, -50], rotate: [0, -12, -60] },
      };
      await animate(f, { ...poses[moveset.defeat], opacity: [1, 1, 0] }, { duration: 0.65, ease: easeIn });
    },

    async playerDefeated() {
      setKnockoutBanner(true);
      await sleep(reduced?120:650);
      const h = heroRef.current;
      if (!h) return;
      setHeroHurt(true);
      await animate(h, { y: 24, x: -14, opacity: 0.45 }, { duration: 0.7, ease: easeIn });
    },
  }));

  const ink = p.theme.night ? "#FFFFFF" : "#1F2440";

  return (
    <div
      ref={scope}
      className="relative overflow-hidden rounded-[26px] border-[3px]"
      style={{ height: p.compact ? 350 : 480, background: `linear-gradient(180deg, ${p.theme.skyTop} 0%, ${p.theme.skyBottom} 62%)`, borderColor: p.theme.roadEdge, willChange: "transform" }}
    >
      {moveLabel && <div role="status" className="pointer-events-none absolute inset-x-3 top-16 z-50 text-center">
        <span className="inline-block rounded-xl border border-white/40 bg-slate-950/90 px-3 py-1 text-xs font-bold text-white shadow-lg">
          {moveLabel.ultimate && <span className="mr-2 text-amber-300">FINISHER</span>}{moveLabel.name}
        </span>
      </div>}
      <div ref={stageRef} className="absolute inset-0" style={{ willChange: "transform" }}>
        {p.boss && <BossRoom theme={p.theme}/>}
        {!p.boss && p.theme.night &&
          [12, 28, 47, 66, 84].map((x, i) => (
            <motion.span key={x} aria-hidden className="absolute h-1 w-1 rounded-full bg-white" style={{ left: `${x}%`, top: `${8 + (i % 3) * 9}%` }} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2 + i * 0.4, repeat: Infinity }} />
          ))}
        {!p.boss && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[27%] border-t-2" style={{background:`linear-gradient(${p.theme.groundFar}, ${p.theme.groundNear})`,borderColor:p.theme.roadEdge}}/>}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[13%] h-px bg-white/15"/>

        <div ref={heroRef} className="absolute bottom-[14%] left-[8%] z-10" style={{ width: heroSize, willChange: "transform" }}>
          <div ref={heroBody} className="relative" style={{ transformOrigin: "50% 80%" }}>
            <HeroArt weapon={p.avatar.weapon} headwear={p.avatar.headwear} body={p.avatar.body} armor={p.avatar.armor} energy={p.avatar.energy} finish={p.avatar.finish} aura={p.avatar.aura} size={heroSize} idle={!playerAttacking&&!enemyAttacking} hurt={heroHurt} />
            <AnimatePresence>
              {p.shield && (
                // Firewall: a curved energy barrier on the side facing the enemy.
                <motion.svg key="shield" viewBox="0 0 60 140" className="pointer-events-none absolute" style={{ right: "-34%", top: "2%", width: "52%", height: "96%", transformOrigin: "0% 50%" }} initial={{ scaleX: 0.2, opacity: 0, x: -20 }} animate={{ scaleX: 1, opacity: 1, x: 0 }} exit={{ scaleX: 1.4, opacity: 0, x: 16 }} transition={{ duration: 0.35 }}>
                  <defs>
                    <linearGradient id="fw-fill" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#7DF9FF" stopOpacity="0.05" />
                      <stop offset="70%" stopColor="#7DF9FF" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.7" />
                    </linearGradient>
                  </defs>
                  <motion.path d="M8 6 Q60 70 8 134 Q28 70 8 6 Z" fill="url(#fw-fill)" stroke="#7DF9FF" strokeWidth="3" strokeLinejoin="round" animate={{ opacity: [0.75, 1, 0.75] }} transition={{ duration: 1.4, repeat: Infinity }} />
                  <g stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="1.6" fill="none" strokeLinecap="round">
                    <path d="M22 30 Q34 36 38 46 M28 56 Q38 62 40 72 M28 86 Q38 92 36 104" />
                  </g>
                  {[24, 52, 80, 108].map((y, i) => (
                    <motion.circle key={y} cx={i % 2 ? 36 : 30} cy={y} r="2.6" fill="#FFFFFF" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.22 }} />
                  ))}
                </motion.svg>
              )}
              {p.surge && (
                <motion.div key="surge" className="pointer-events-none absolute inset-[-8%] rounded-full" style={{ boxShadow: "0 0 40px 10px rgba(255,200,61,.55)" }} initial={{ opacity: 0 }} animate={{ opacity: [0.4, 0.9, 0.4] }} exit={{ opacity: 0 }} transition={{ duration: 1, repeat: Infinity }} />
              )}
            </AnimatePresence>
          </div>
        </div>
        <div ref={foeRef} className="absolute bottom-[14%] right-[8%] z-10" style={{ width: foeSize, willChange: "transform" }}>
          <div ref={foeBody} style={{ transformOrigin: "50% 90%" }}>
            <FoeArt enemy={p.enemy} boss={p.boss} size={foeSize} idle={!playerAttacking&&!enemyAttacking} hurt={foeHurt} />
          </div>
        </div>

        {/* effects */}
        {duelSparks.map(spark=><DuelImpact key={spark.id} spark={spark}/>)}
        {playerEffects.map(fx => <PlayerAttackFx key={fx.id} fx={fx} />)}
        {enemyEffects.map(fx => <EnemyAttackFx key={fx.id} fx={fx} />)}
        {rings.map((r) => (
          <motion.div key={r.id} className="pointer-events-none absolute z-20 rounded-[50%] border-[5px]" style={{ left: r.at.x - r.size / 2, top: r.at.y - (r.inward ? r.size / 2 : r.size * 0.18), width: r.size, height: r.inward ? r.size : r.size * 0.36, borderColor: r.color, boxShadow: `0 0 12px ${r.color}` }} initial={r.inward ? { scale: 1.3, opacity: 0 } : { scale: 0.2, opacity: 1 }} animate={r.inward ? { scale: 0.15, opacity: [0, 1, 0.8] } : { scale: 1, opacity: 0 }} transition={{ duration: r.inward ? 0.45 : 0.6, ease: r.inward ? easeIn : ease }} />
        ))}
        {bursts.map((b) =>
          Array.from({ length: b.count }).map((_, i) => {
            const ang = (i / b.count) * Math.PI * 2 + (b.id % 7);
            const dist = b.spread * (0.6 + ((i * 37) % 10) / 20);
            return (
              <motion.span
                key={`${b.id}-${i}`}
                className="pointer-events-none absolute z-30 rounded-full"
                style={{ left: b.at.x - 5, top: b.at.y - 5, width: i % 3 ? 8 : 12, height: i % 3 ? 8 : 12, background: b.colors[i % b.colors.length] }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos(ang) * dist, y: Math.sin(ang) * dist + 18, opacity: 0, scale: 0.3 }}
                transition={{ duration: 0.65, ease }}
              />
            );
          }),
        )}
      </div>

      {cinematic && !reduced && <div aria-hidden className="pointer-events-none absolute inset-0 z-[36]">
        <div className="absolute inset-x-0 bottom-0 h-5 bg-black/80"/>
        <div className="absolute inset-x-0 top-0 h-2 bg-black/80"/>
        <div className="absolute bottom-6 left-4 font-display text-xl italic text-white" style={{textShadow:"2px 3px #111827"}}>{cinematic.stage==="freeze"?"FINAL STRIKE":cinematic.stage==="launch"?"LAUNCH!":cinematic.stage==="juggle"?"AIR COMBO":cinematic.stage==="stagger"?"BREAK!":"LIMIT RELEASE"}</div>
      </div>}
      {knockoutBanner && <div role="status" className="pointer-events-none absolute inset-0 z-[60] grid place-items-center bg-[#090D1A]/30"><span className="font-display text-6xl italic text-amber-200" style={{textShadow:"4px 5px #702D4D"}}>K.O.</span></div>}
      {/* overlays that should not zoom */}
      <AnimatePresence>
        {glow && (
          <motion.div key={glow.id} className="pointer-events-none absolute z-0 rounded-full" style={{ left: "6%", bottom: "8%", width: heroSize * 1.2, height: heroSize * 1.2, background: `radial-gradient(circle, ${glow.color}88, transparent 65%)` }} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1.4, opacity: [0, 1, 0] }} transition={{ duration: 0.8, ease }} onAnimationComplete={() => setGlow(null)} />
        )}
        {vignette && <motion.div key="vig" className="pointer-events-none absolute inset-0 z-[35]" style={{ background: "radial-gradient(circle at 70% 55%, transparent 35%, rgba(10,12,34,.55))" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />}
      </AnimatePresence>

      <HpBar label={p.name} hp={p.playerHp} max={p.playerMax} color="#3EC46D" edge="#2BA155" side="left" ink={ink} />
      <HpBar label={p.enemy.name} hp={p.enemyHp} max={p.enemyMax} color={p.boss ? "#E5484D" : "#FF5A5F"} edge="#C2333A" side="right" ink={ink} boss={p.boss} />

      <AnimatePresence>
        {p.combo >= 2 && (
          <motion.div
            key={p.combo}
            initial={{ scale: 0.5, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease }}
            className="absolute left-1/2 top-[22%] z-40 -translate-x-1/2 rounded-2xl px-3 py-1 font-display text-white"
            style={{ background: p.combo >= 5 ? "#FF8A00" : "#8B5CF6", boxShadow: `0 4px 0 ${p.combo >= 5 ? "#D96F00" : "#6D4BD8"}`, fontSize: p.compact ? 18 : 24 }}
          >
            {p.combo}x COMBO
          </motion.div>
        )}
      </AnimatePresence>

      {floats.map((f) => (
        <motion.div
          key={f.id}
          className="pointer-events-none absolute z-50 whitespace-nowrap font-display"
          style={{ left: f.at.x, top: f.at.y, color: f.color, fontSize: f.big ? (p.compact ? 24 : 34) : p.compact ? 22 : 30, WebkitTextStroke: "2px rgba(31,36,64,.85)", paintOrder: "stroke", x: "-50%" }}
          initial={{ y: 12, scale: 0.5, opacity: 0 }}
          animate={{ y: -46, scale: 1, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.15, times: [0, 0.15, 0.7, 1], ease }}
        >
          {f.text}
        </motion.div>
      ))}
    </div>
  );
});

function HpBar({ label, hp, max, color, edge, side, ink, boss }: { label: string; hp: number; max: number; color: string; edge: string; side: "left" | "right"; ink: string; boss?: boolean }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return (
    <div className="absolute top-3 z-40 w-[44%] max-w-[260px] rounded-2xl bg-white/85 px-3 py-2 backdrop-blur-md" style={{ [side]: 12, boxShadow: "0 6px 18px rgba(31,36,64,.14)" }}>
      <div className="flex items-baseline justify-between gap-2 text-[13px] font-black text-ink">
        <span className="truncate">{boss && <span className="mr-1 text-danger-deep">BOSS</span>}{label}</span>
        <span className="flex-none tabular-nums" style={{ color: ink === "#FFFFFF" ? "#1F2440" : "#4A5175" }}>{Math.round(pct)}%</span>
      </div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-[#E3E8F1]">
        <motion.div className="h-full rounded-full" style={{ background: color, boxShadow: `inset 0 -3px 0 ${edge}` }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease }} />
      </div>
    </div>
  );
}

export default Arena;
