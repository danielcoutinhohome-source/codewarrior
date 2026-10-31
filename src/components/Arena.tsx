"use client";

import { AnimatePresence, motion, useAnimate } from "framer-motion";
import { forwardRef, memo, useCallback, useImperativeHandle, useRef, useState } from "react";
import Monster from "./Monster";
import Warrior from "./Warrior";
import { play } from "@/lib/sfx";
import type { Avatar } from "@/lib/db";
import type { Enemy, Theme } from "@/lib/game";

export type ArenaHandle = {
  attack: (o: { damage: number; crit: boolean; surge: boolean; finisher: boolean }) => Promise<void>;
  hurt: (o: { damage: number; blocked: boolean; knockout: boolean }) => Promise<void>;
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
type Ring = { id: number; at: Pt; color: string; size: number };
type Shot = { id: number; from: Pt; to: Pt; color: string; kind: "wave" | "glob"; ms: number };
type Slash = { id: number; at: Pt; size: number; kind: "diag" | "cross" | "down"; color: string };

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
  const lastAttack = useRef("");
  const lastHurt = useRef("");
  const [floats, setFloats] = useState<Float[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [rings, setRings] = useState<Ring[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [slashes, setSlashes] = useState<Slash[]>([]);
  const [flash, setFlash] = useState<{ id: number; color: string; side: "hero" | "foe" | "all" } | null>(null);
  const [foeHurt, setFoeHurt] = useState(false);
  const [heroHurt, setHeroHurt] = useState(false);
  const [glow, setGlow] = useState<{ id: number; color: string } | null>(null);
  const [vignette, setVignette] = useState(false);

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
    return Math.max(60, b.x - a.x - (p.compact ? 64 : 110));
  };

  const add = <T extends { id: number }>(set: React.Dispatch<React.SetStateAction<T[]>>, item: T, ms: number) => {
    set((v) => [...v, item]);
    setTimeout(() => set((v) => v.filter((x) => x.id !== item.id)), ms);
  };
  const float = (text: string, at: Pt, color: string, big = false) => add<Float>(setFloats, { id: ++uid, text, at, color, big }, 1250);
  const burst = (at: Pt, colors: string[], count = 12, spread = 90) => add<Burst>(setBursts, { id: ++uid, at, colors, count, spread }, 900);
  const ring = (at: Pt, color: string, size = 160) => add<Ring>(setRings, { id: ++uid, at, color, size }, 700);
  const slash = (at: Pt, kind: Slash["kind"], size = foeSize) => add<Slash>(setSlashes, { id: ++uid, at, size, kind, color: p.avatar.energy }, 650);
  const flashOn = (color: string, side: "hero" | "foe" | "all") => setFlash({ id: ++uid, color, side });
  const shake = (amt = 8) => animate(scope.current, { x: [0, -amt, amt, -amt * 0.6, amt * 0.5, 0], y: [0, amt * 0.4, -amt * 0.3, amt * 0.2, 0, 0] }, { duration: 0.36, ease: "easeOut" });

  const pick = (opts: string[], last: React.MutableRefObject<string>) => {
    const choices = opts.filter((o) => o !== last.current);
    const c = choices[Math.floor(Math.random() * choices.length)];
    last.current = c;
    return c;
  };

  // The enemy reacts to a hit.
  const foeHit = (big: boolean) => {
    const f = foeBody.current;
    if (!f) return;
    setFoeHurt(true);
    animate(f, { x: [0, big ? 40 : 28, -6, 0], scaleX: [1, 0.84, 1.06, 1], scaleY: [1, 1.12, 0.96, 1], rotate: [0, 8, -3, 0] }, { duration: 0.45, ease });
    setTimeout(() => setFoeHurt(false), 520);
  };
  const impactFx = (at: Pt, strong: boolean, label?: string, damage?: number) => {
    flashOn("#FFFFFF", "foe");
    burst(at, [p.avatar.energy, "#FFFFFF", "#FFE066"], strong ? 18 : 12, strong ? 130 : 90);
    if (damage !== undefined) float(`-${damage}`, { x: at.x, y: at.y - 40 }, strong ? "#FFC83D" : "#FFFFFF", strong);
    if (label) float(label, { x: at.x, y: at.y - 92 }, "#FF8A00", true);
  };

  useImperativeHandle(ref, () => ({
    async intro() {
      const h = heroRef.current, f = foeRef.current;
      if (!h || !f) return;
      if (p.revived) {
        animate(h, { y: [40, 0], opacity: [0, 1] }, { duration: 0.6, ease });
        animate(heroBody.current!, { scale: [0.6, 1.08, 1], rotate: [-20, 0] }, { duration: 0.7, ease });
        setTimeout(() => {
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

    async attack({ damage, crit, surge, finisher }) {
      const h = heroRef.current, hb = heroBody.current, f = foeRef.current;
      if (!h || !hb || !f) return;
      const strong = crit || surge;
      const label = surge ? "POWER SURGE!" : crit ? "CRITICAL!" : undefined;
      const d = gap();

      if (finisher) {
        // Slow, zoomed-in finishing blow.
        const stage = stageRef.current!;
        const fc = center(f);
        stage.style.transformOrigin = `${fc.x}px ${fc.y}px`;
        setVignette(true);
        play("whoosh");
        await animate(stage, { scale: 1.14 }, { duration: 0.3, ease });
        animate(hb, { rotate: [0, -25] }, { duration: 0.18, ease });
        await animate(h, { x: -18 }, { duration: 0.18, ease });
        await animate(h, { x: d, y: -30 }, { duration: 0.2, ease: easeIn });
        animate(hb, { rotate: [-25, 360] }, { duration: 0.42, ease });
        play("crit");
        slash(center(f), "cross", foeSize * 1.3);
        await sleep(110);
        foeHit(true);
        impactFx(center(f), true, "FINISHING BLOW!", damage);
        ring({ x: fc.x, y: fc.y + foeSize * 0.4 }, p.avatar.energy, foeSize * 2);
        flashOn("#FFFFFF", "all");
        shake(16);
        await sleep(420);
        animate(stage, { scale: 1 }, { duration: 0.45, ease });
        setVignette(false);
        await animate(h, { x: 0, y: 0 }, { duration: 0.45, ease });
        animate(hb, { rotate: 0 }, { duration: 0 });
        return;
      }

      const kind = pick(["dash", "leap", "wave"], lastAttack);
      if (kind === "dash") {
        play("whoosh");
        await animate(h, { x: -16, scaleX: 0.94 }, { duration: 0.12, ease });
        await animate(h, { x: d, y: -18, scaleX: 1.04 }, { duration: 0.18, ease: easeIn });
        animate(hb, { rotate: [0, 16, 0] }, { duration: 0.3, ease });
        play(strong ? "crit" : "slash");
        slash(center(f), strong ? "cross" : "diag");
        await sleep(80);
        foeHit(strong);
        impactFx(center(f), strong, label, damage);
        if (strong) shake(10);
        await sleep(200);
        await animate(h, { x: 0, y: 0, scaleX: 1 }, { duration: 0.4, ease });
      } else if (kind === "leap") {
        play("whoosh");
        await animate(hb, { scaleY: 0.86, scaleX: 1.08 }, { duration: 0.1, ease });
        animate(hb, { scaleY: 1, scaleX: 1, rotate: [0, -12, 20] }, { duration: 0.42, ease });
        await animate(h, { x: [0, d * 0.55, d * 0.95], y: [0, -110, -8] }, { duration: 0.42, ease: "easeInOut" });
        play(strong ? "crit" : "slash");
        const fc = center(f);
        slash(fc, "down");
        ring({ x: fc.x, y: fc.y + foeSize * 0.42 }, p.avatar.energy, foeSize * 1.4);
        foeHit(strong);
        animate(foeBody.current!, { scaleY: [1, 0.78, 1.05, 1] }, { duration: 0.4, ease });
        impactFx(fc, strong, label, damage);
        shake(strong ? 12 : 7);
        await sleep(220);
        animate(hb, { rotate: 0 }, { duration: 0.3, ease });
        await animate(h, { x: [d * 0.95, d * 0.4, 0], y: [-8, -40, 0] }, { duration: 0.42, ease: "easeInOut" });
      } else {
        // Energy wave: the warrior swings and launches a crescent.
        await animate(hb, { rotate: -18, scale: 1.04 }, { duration: 0.16, ease });
        animate(hb, { rotate: [-18, 22, 0], scale: [1.04, 1, 1] }, { duration: 0.38, ease });
        play("whoosh");
        const from = center(h), to = center(f);
        add<Shot>(setShots, { id: ++uid, from, to, color: p.avatar.energy, kind: "wave", ms: 260 }, 320);
        await sleep(250);
        play(strong ? "crit" : "slash");
        foeHit(strong);
        impactFx(to, strong, label, damage);
        ring({ x: to.x, y: to.y }, p.avatar.energy, foeSize * 1.1);
        if (strong) shake(10);
        await sleep(260);
      }
    },

    async hurt({ damage, blocked, knockout }) {
      const h = heroRef.current, hb = heroBody.current, f = foeRef.current, fb = foeBody.current;
      if (!h || !hb || !f || !fb) return;
      const d = gap();
      const kind = pick(["lunge", "slam", "spit"], lastHurt);
      const onHit = () => {
        const at = center(h);
        if (blocked) {
          play("shield");
          burst(at, ["#7DF9FF", "#FFFFFF", "#A9C7FF"], 14, 80);
          ring(at, "#7DF9FF", heroSize * 1.2);
          float("BLOCKED", { x: at.x, y: at.y - 70 }, "#7DF9FF", true);
          animate(h, { x: [0, -10, 0] }, { duration: 0.3, ease });
          return;
        }
        play("hurt");
        setHeroHurt(true);
        flashOn("#FF3B4A", "hero");
        animate(hb, { rotate: [0, -16, 6, 0], opacity: [1, 0.35, 1, 0.6, 1] }, { duration: 0.55, ease });
        animate(h, { x: [0, -44, -24, 0] }, { duration: 0.55, ease });
        burst(at, ["#FF5A5F", "#FFB3B6", p.enemy.color], 10, 70);
        float(`-${damage}`, { x: at.x, y: at.y - 50 }, "#FF5A5F", knockout);
        shake(knockout ? 14 : 9);
        if (!knockout) setTimeout(() => setHeroHurt(false), 650);
      };

      if (kind === "lunge") {
        play("whoosh");
        await animate(f, { x: 14 }, { duration: 0.12, ease });
        await animate(f, { x: -d, y: -14, rotate: -10 }, { duration: 0.2, ease: easeIn });
        onHit();
        await sleep(260);
        await animate(f, { x: 0, y: 0, rotate: 0 }, { duration: 0.42, ease });
      } else if (kind === "slam") {
        play("whoosh");
        await animate(fb, { scaleY: 0.82, scaleX: 1.1 }, { duration: 0.12, ease });
        animate(fb, { scaleY: [0.82, 1.1, 1], scaleX: [1.1, 0.95, 1] }, { duration: 0.4, ease });
        await animate(f, { x: [0, -d * 0.5, -d * 0.9], y: [0, -130, -4] }, { duration: 0.42, ease: "easeInOut" });
        const at = center(h);
        ring({ x: at.x, y: at.y + heroSize * 0.45 }, p.enemy.color, heroSize * 1.6);
        animate(fb, { scaleY: [1, 0.8, 1] }, { duration: 0.3, ease });
        onHit();
        await sleep(240);
        await animate(f, { x: [-d * 0.9, -d * 0.4, 0], y: [-4, -50, 0] }, { duration: 0.45, ease: "easeInOut" });
      } else {
        // Spit a glob at the warrior.
        await animate(fb, { scaleY: 1.12, scaleX: 0.92, x: 12 }, { duration: 0.16, ease });
        animate(fb, { scaleY: 1, scaleX: 1, x: 0 }, { duration: 0.25, ease });
        play("whoosh");
        add<Shot>(setShots, { id: ++uid, from: center(f, 0.45), to: center(h), color: p.enemy.color, kind: "glob", ms: 330 }, 380);
        await sleep(320);
        onHit();
        await sleep(300);
      }
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
      float(kind === "shield" ? "SHIELD UP" : kind === "surge" ? "POWER SURGE" : "HINT", { x: at.x, y: at.y - 70 }, color, true);
      await sleep(500);
    },

    async enemyDefeated() {
      const f = foeRef.current;
      if (!f) return;
      const at = center(f);
      setFoeHurt(true);
      await sleep(120);
      burst(at, [p.enemy.color, "#FFFFFF", "#FFE066"], 24, 170);
      ring(at, "#FFFFFF", foeSize * 2.2);
      await animate(f, { scale: [1, 1.12, 0], rotate: [0, -6, 24], opacity: [1, 1, 0], y: [0, -8, 30] }, { duration: 0.55, ease: easeIn });
    },

    async playerDefeated() {
      const h = heroRef.current;
      if (!h) return;
      setHeroHurt(true);
      await animate(h, { rotate: -80, y: 46, x: -24, opacity: 0.5 }, { duration: 0.7, ease: easeIn });
    },
  }));

  const ink = p.theme.night ? "#FFFFFF" : "#1F2440";

  return (
    <div
      ref={scope}
      className="relative overflow-hidden rounded-[26px] border-[3px]"
      style={{ height: p.compact ? 268 : 400, background: `linear-gradient(180deg, ${p.theme.skyTop} 0%, ${p.theme.skyBottom} 62%)`, borderColor: p.theme.roadEdge, willChange: "transform" }}
    >
      <div ref={stageRef} className="absolute inset-0" style={{ willChange: "transform" }}>
        {p.theme.night &&
          [12, 28, 47, 66, 84].map((x, i) => (
            <motion.span key={x} aria-hidden className="absolute h-1 w-1 rounded-full bg-white" style={{ left: `${x}%`, top: `${8 + (i % 3) * 9}%` }} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2 + i * 0.4, repeat: Infinity }} />
          ))}
        <div aria-hidden className="absolute inset-x-[-10%] bottom-[-30%] h-[62%] rounded-[50%]" style={{ background: `linear-gradient(180deg, ${p.theme.groundFar}, ${p.theme.groundNear})` }} />
        <div aria-hidden className="absolute bottom-[9%] left-[6%] h-[13%] w-[34%] rounded-[50%]" style={{ background: p.theme.road, boxShadow: `0 10px 0 ${p.theme.roadEdge}` }} />
        <div aria-hidden className="absolute bottom-[9%] right-[5%] h-[14%] w-[38%] rounded-[50%]" style={{ background: p.theme.road, boxShadow: `0 10px 0 ${p.theme.roadEdge}` }} />

        <div ref={heroRef} className="absolute bottom-[14%] left-[8%] z-10" style={{ width: heroSize, willChange: "transform" }}>
          <div ref={heroBody} className="relative" style={{ transformOrigin: "50% 80%" }}>
            <HeroArt armor={p.avatar.armor} energy={p.avatar.energy} finish={p.avatar.finish} aura={p.avatar.aura} size={heroSize} hurt={heroHurt} />
            <AnimatePresence>
              {p.shield && (
                <motion.svg key="shield" viewBox="0 0 100 100" className="pointer-events-none absolute inset-[-12%]" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.3, opacity: 0 }}>
                  <motion.polygon points="50,4 92,28 92,72 50,96 8,72 8,28" fill="rgba(125,249,255,0.14)" stroke="#7DF9FF" strokeWidth="2.5" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.6, repeat: Infinity }} />
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
            <FoeArt enemy={p.enemy} boss={p.boss} size={foeSize} hurt={foeHurt} />
          </div>
        </div>

        {/* effects */}
        {rings.map((r) => (
          <motion.div key={r.id} className="pointer-events-none absolute z-20 rounded-[50%] border-[5px]" style={{ left: r.at.x - r.size / 2, top: r.at.y - r.size * 0.18, width: r.size, height: r.size * 0.36, borderColor: r.color }} initial={{ scale: 0.2, opacity: 1 }} animate={{ scale: 1, opacity: 0 }} transition={{ duration: 0.6, ease }} />
        ))}
        {slashes.map((s) => (
          <motion.svg key={s.id} viewBox="0 0 200 200" className="pointer-events-none absolute z-30" style={{ left: s.at.x - s.size / 2, top: s.at.y - s.size / 2, width: s.size, height: s.size }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 0.28, duration: 0.3 }}>
            {(s.kind === "cross" ? ["M176 30 Q96 96 24 170", "M24 30 Q104 96 176 170"] : s.kind === "down" ? ["M110 10 Q96 100 104 190"] : ["M176 34 Q90 96 26 168"]).map((d, k) => (
              <g key={k}>
                <motion.path d={d} fill="none" stroke={s.color} strokeWidth="20" strokeLinecap="round" opacity="0.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.14, delay: k * 0.07, ease }} style={{ filter: "blur(4px)" }} />
                <motion.path d={d} fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.14, delay: k * 0.07, ease }} />
              </g>
            ))}
          </motion.svg>
        ))}
        {shots.map((s) =>
          s.kind === "wave" ? (
            <motion.svg key={s.id} viewBox="0 0 60 100" className="pointer-events-none absolute z-30" style={{ left: 0, top: 0, width: 60, height: 100 }} initial={{ x: s.from.x - 30, y: s.from.y - 50, opacity: 0.4, scale: 0.6 }} animate={{ x: s.to.x - 30, y: s.to.y - 50, opacity: 1, scale: 1.2 }} transition={{ duration: s.ms / 1000, ease: easeIn }}>
              <path d="M14 6 Q60 50 14 94 Q36 50 14 6 Z" fill={s.color} style={{ filter: `drop-shadow(0 0 8px ${s.color})` }} />
              <path d="M18 18 Q46 50 18 82" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
            </motion.svg>
          ) : (
            <motion.div key={s.id} className="pointer-events-none absolute z-30 rounded-full" style={{ left: 0, top: 0, width: 26, height: 26, background: `radial-gradient(circle at 35% 35%, #FFFFFF, ${s.color} 55%)`, boxShadow: `0 0 14px ${s.color}` }} initial={{ x: s.from.x - 13, y: s.from.y - 13, scale: 0.5 }} animate={{ x: [s.from.x - 13, (s.from.x + s.to.x) / 2 - 13, s.to.x - 13], y: [s.from.y - 13, Math.min(s.from.y, s.to.y) - 90, s.to.y - 13], scale: [0.5, 1.1, 1] }} transition={{ duration: s.ms / 1000, ease: "easeIn" }} />
          ),
        )}
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

      {/* overlays that should not zoom */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash.id}
            className="pointer-events-none absolute inset-0 z-40"
            style={{
              background:
                flash.side === "all"
                  ? "rgba(255,255,255,.75)"
                  : flash.side === "foe"
                    ? "radial-gradient(circle at 75% 62%, rgba(255,255,255,.7), transparent 50%)"
                    : "radial-gradient(circle at 25% 60%, transparent 30%, rgba(255,59,74,.42))",
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: flash.side === "all" ? 0.5 : 0.4, ease }}
            onAnimationComplete={() => setFlash(null)}
          />
        )}
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
