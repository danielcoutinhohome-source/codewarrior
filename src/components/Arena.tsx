"use client";

import { AnimatePresence, motion, useAnimate } from "framer-motion";
import { forwardRef, memo, useCallback, useImperativeHandle, useRef, useState } from "react";
import Monster from "./Monster";
import Warrior from "./Warrior";
import { play } from "@/lib/sfx";
import { solid } from "@/lib/color";
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
type Ring = { id: number; at: Pt; color: string; size: number; inward?: boolean };
type Shot = { id: number; from: Pt; to: Pt; color: string; kind: "wave" | "rune"; ms: number };
type SlashKind = "arcR" | "arcL" | "up" | "down" | "cross";
type Slash = { id: number; at: Pt; size: number; kind: SlashKind; color: string };
type Ghost = { id: number; who: "hero" | "foe"; x: number; y: number; w: number };
type Streak = { id: number; at: Pt; dir: 1 | -1; color: string };

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
  const [floats, setFloats] = useState<Float[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [rings, setRings] = useState<Ring[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [slashes, setSlashes] = useState<Slash[]>([]);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [flash, setFlash] = useState<{ id: number; color: string; side: "hero" | "foe" | "all" } | null>(null);
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
    return Math.max(60, b.x - a.x - (p.compact ? 64 : 110));
  };

  const add = <T extends { id: number }>(set: React.Dispatch<React.SetStateAction<T[]>>, item: T, ms: number) => {
    set((v) => [...v, item]);
    setTimeout(() => set((v) => v.filter((x) => x.id !== item.id)), ms);
  };
  const float = (text: string, at: Pt, color: string, big = false) => add<Float>(setFloats, { id: ++uid, text, at, color, big }, 1250);
  const burst = (at: Pt, colors: string[], count = 12, spread = 90) => add<Burst>(setBursts, { id: ++uid, at, colors, count, spread }, 900);
  const ring = (at: Pt, color: string, size = 160, inward = false) => add<Ring>(setRings, { id: ++uid, at, color, size, inward }, 700);
  const slash = (at: Pt, kind: SlashKind, size = foeSize * 1.15) => add<Slash>(setSlashes, { id: ++uid, at, size, kind, color: en }, 520);
  // Afterimages: faded copies left behind while something moves fast.
  const ghost = (el: HTMLElement | null, who: Ghost["who"]) => {
    const root = scope.current as HTMLElement | null;
    if (!el || !root) return;
    const a = el.getBoundingClientRect(), b = root.getBoundingClientRect();
    add<Ghost>(setGhosts, { id: ++uid, who, x: a.left - b.left, y: a.top - b.top, w: a.width }, 360);
  };
  const trail = (el: HTMLElement | null, who: Ghost["who"], every = 34) => {
    ghost(el, who);
    const t = setInterval(() => ghost(el, who), every);
    return () => clearInterval(t);
  };
  const streak = (at: Pt, dir: 1 | -1, color = "#FFFFFF") => add<Streak>(setStreaks, { id: ++uid, at, dir, color }, 450);
  const dust = (at: Pt, big = false) => burst(at, [p.theme.roadEdge, p.theme.road, "#FFFFFF"], big ? 14 : 8, big ? 90 : 50);
  // Zoom punch toward a point, for impact frames.
  const punch = (at: Pt, amt = 0.06) => {
    const st = stageRef.current;
    if (!st) return;
    st.style.transformOrigin = `${at.x}px ${at.y}px`;
    animate(st, { scale: [1, 1 + amt, 1] }, { duration: 0.32, ease: "easeOut" });
  };
  const whiteFlash = (el: HTMLElement | null) => el && animate(el, { filter: ["brightness(2.8) saturate(0.2)", "brightness(1) saturate(1)"] }, { duration: 0.22, ease: "easeOut" });
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
    burst(at, [en, "#FFFFFF", "#FFE066"], strong ? 18 : 12, strong ? 130 : 90);
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
      const h = heroRef.current, hb = heroBody.current, f = foeRef.current, fb = foeBody.current;
      if (!h || !hb || !f || !fb) return;
      const strong = crit || surge;
      const label = surge ? "POWER SURGE!" : crit ? "CRITICAL!" : undefined;
      const d = gap();
      // A quick hit inside a combo: slash, flash, small knock, tiny hit-stop.
      const jab = async (kind: SlashKind) => {
        const fc = center(f);
        play("slash");
        slash(fc, kind, foeSize);
        whiteFlash(fb);
        burst(fc, [en, "#FFFFFF"], 6, 50);
        animate(fb, { x: [0, 16, 0], rotate: [0, 5, 0] }, { duration: 0.2, ease });
        await sleep(55);
      };
      // The big hit that deals the damage.
      const smash = (kind: SlashKind, at = center(f)) => {
        play(strong ? "crit" : "slash");
        slash(at, kind, foeSize * (strong ? 1.45 : 1.2));
        whiteFlash(fb);
        foeHit(true);
        impactFx(at, strong, label, damage);
        punch(at, strong ? 0.09 : 0.05);
        shake(strong ? 12 : 7);
      };

      if (finisher) {
        // Anime slice: charge, vanish through the enemy, pause, then the cuts land.
        const stage = stageRef.current!;
        const fc = center(f);
        setVignette(true);
        stage.style.transformOrigin = `${(center(h).x + fc.x) / 2}px ${fc.y}px`;
        animate(stage, { scale: 1.12 }, { duration: 0.45, ease });
        animate(hb, { rotate: -14, scaleY: 0.86, scaleX: 1.1 }, { duration: 0.3, ease });
        const hc = center(h);
        ring(hc, en, heroSize * 1.8, true);
        setTimeout(() => ring(hc, "#FFFFFF", heroSize * 1.4, true), 140);
        setGlow({ id: ++uid, color: en });
        play("whoosh");
        await sleep(420);
        dust(center(h, 1), true);
        streak(center(h), 1, en);
        h.style.zIndex = "15";
        const stop = trail(h, "hero", 24);
        animate(hb, { rotate: 10, scaleY: 1, scaleX: 1 }, { duration: 0.14 });
        await animate(h, { x: d + 110 + foeSize * 0.3, y: -6 }, { duration: 0.14, ease: easeIn });
        stop();
        flashOn("#FFFFFF", "foe");
        whiteFlash(fb);
        await sleep(420); // the dramatic pause
        play("crit");
        slash(fc, "cross", foeSize * 1.7);
        setTimeout(() => slash(fc, "up", foeSize * 1.5), 90);
        foeHit(true);
        impactFx(fc, true, "FINISHING BLOW!", damage);
        ring({ x: fc.x, y: fc.y + foeSize * 0.4 }, en, foeSize * 2.2);
        burst(fc, [en, "#FFFFFF", "#FFE066"], 26, 190);
        flashOn("#FFFFFF", "all");
        shake(16);
        await sleep(520);
        animate(stage, { scale: 1 }, { duration: 0.5, ease });
        setVignette(false);
        animate(hb, { rotate: [10, -360] }, { duration: 0.55, ease });
        await animate(h, { x: [null, d * 0.5, 0], y: [-6, -90, 0] }, { duration: 0.55, ease: "easeInOut" });
        h.style.zIndex = "";
        animate(hb, { rotate: 0, scaleY: [0.86, 1], scaleX: [1.12, 1] }, { duration: 0.25, ease });
        dust(center(h, 1));
        return;
      }

      const kind = pick(["combo", "leap", "wave"], lastAttack);
      if (kind === "combo") {
        // Wind up, dash in leaving afterimages, three-hit combo, backflip home.
        animate(hb, { rotate: -10, scaleY: 0.88, scaleX: 1.1 }, { duration: 0.14, ease });
        await animate(h, { x: -26 }, { duration: 0.14, ease });
        play("whoosh");
        dust(center(h, 1));
        streak(center(h), 1);
        const stop = trail(h, "hero");
        animate(hb, { rotate: 12, scaleY: 1, scaleX: 1 }, { duration: 0.16 });
        await animate(h, { x: d, y: -12 }, { duration: 0.16, ease: easeIn });
        stop();
        animate(hb, { rotate: [12, -24] }, { duration: 0.1, ease });
        await jab("arcR");
        await sleep(70);
        animate(hb, { rotate: [-24, 26] }, { duration: 0.1, ease });
        await jab("arcL");
        await sleep(70);
        animate(hb, { rotate: [26, -34, 0] }, { duration: 0.32, ease });
        animate(h, { y: [-12, -54, -12] }, { duration: 0.36, ease: "easeOut" });
        smash("up");
        animate(f, { y: [0, -58, 0], rotate: [0, -10, 0] }, { duration: 0.55, times: [0, 0.4, 1], ease: "easeInOut" });
        await sleep(90);
        await sleep(strong ? 260 : 200);
        setTimeout(() => dust(center(f, 1), true), 260);
        animate(hb, { rotate: [0, -360] }, { duration: 0.5, ease });
        await animate(h, { x: [d, d * 0.45, 0], y: [-12, -86, 0] }, { duration: 0.5, ease: "easeInOut" });
        animate(hb, { rotate: 0, scaleY: [0.86, 1], scaleX: [1.12, 1] }, { duration: 0.25, ease });
        dust(center(h, 1));
      } else if (kind === "leap") {
        // Crouch, spin high into the air, hang, then plunge down on the enemy.
        await animate(hb, { scaleY: 0.78, scaleX: 1.14 }, { duration: 0.14, ease });
        play("whoosh");
        dust(center(h, 1), true);
        animate(hb, { scaleY: [0.78, 1.14, 1], scaleX: [1.14, 0.9, 1], rotate: [0, -360] }, { duration: 0.44, ease });
        await animate(h, { x: d * 0.72, y: p.compact ? -100 : -150 }, { duration: 0.4, ease: [0.2, 0.8, 0.3, 1] });
        animate(hb, { rotate: [0, -20] }, { duration: 0.12 });
        ring(center(h), en, heroSize, true);
        await sleep(110);
        const stop = trail(h, "hero", 26);
        animate(hb, { rotate: [-20, 30] }, { duration: 0.13, ease: easeIn });
        await animate(h, { x: d * 0.98, y: -4 }, { duration: 0.13, ease: easeIn });
        stop();
        const fc = center(f);
        smash("down", fc);
        ring({ x: fc.x, y: fc.y + foeSize * 0.42 }, en, foeSize * 1.8);
        ring({ x: fc.x, y: fc.y + foeSize * 0.42 }, "#FFFFFF", foeSize * 1.2);
        dust({ x: fc.x - foeSize * 0.4, y: fc.y + foeSize * 0.45 }, true);
        dust({ x: fc.x + foeSize * 0.4, y: fc.y + foeSize * 0.45 }, true);
        animate(fb, { scaleY: [1, 0.7, 1.08, 1], scaleX: [1, 1.2, 0.96, 1] }, { duration: 0.45, ease });
        await sleep(strong ? 300 : 240);
        animate(hb, { rotate: [30, -340, -360], scaleY: 1, scaleX: 1 }, { duration: 0.5, ease });
        await animate(h, { x: [d * 0.98, d * 0.45, 0], y: [-4, -80, 0] }, { duration: 0.5, ease: "easeInOut" });
        animate(hb, { rotate: 0, scaleY: [0.86, 1], scaleX: [1.12, 1] }, { duration: 0.25, ease });
        dust(center(h, 1));
      } else {
        // Charge energy, swing hard, launch a crescent that blasts the enemy back.
        const hc = center(h);
        animate(hb, { rotate: -32, x: -12, scale: 1.06 }, { duration: 0.3, ease });
        ring(hc, en, heroSize * 1.7, true);
        setTimeout(() => ring(hc, "#FFFFFF", heroSize * 1.2, true), 120);
        burst(hc, [en, "#FFFFFF"], 10, 60);
        play("whoosh");
        await sleep(300);
        animate(hb, { rotate: [-32, 46, 0], x: [-12, 16, 0], scale: [1.06, 1, 1] }, { duration: 0.5, ease });
        slash({ x: hc.x + heroSize * 0.35, y: hc.y }, "arcR", heroSize * 1.1);
        const to = center(f);
        add<Shot>(setShots, { id: ++uid, from: { x: hc.x + 30, y: hc.y }, to, color: en, kind: "wave", ms: 280 }, 340);
        streak({ x: (hc.x + to.x) / 2, y: hc.y }, 1, en);
        await sleep(270);
        smash("cross", to);
        animate(f, { x: [0, 48, 0], rotate: [0, 10, 0] }, { duration: 0.55, ease });
        ring(to, en, foeSize * 1.4);
        burst(to, [en, "#FFFFFF", "#FFE066"], 18, 150);
        await sleep(strong ? 380 : 320);
      }
    },

    async hurt({ damage, blocked, knockout }) {
      const h = heroRef.current, hb = heroBody.current, f = foeRef.current, fb = foeBody.current;
      if (!h || !hb || !f || !fb) return;
      const d = gap();
      const kind = p.enemy.attackStyle;
      const onHit = (strongHit = true) => {
        const at = center(h);
        if (blocked) {
          play("shield");
          burst({ x: at.x + heroSize * 0.4, y: at.y }, ["#7DF9FF", "#FFFFFF", "#A9C7FF"], 16, 90);
          ring({ x: at.x + heroSize * 0.4, y: at.y }, "#7DF9FF", heroSize * 1.2);
          float("BLOCKED", { x: at.x, y: at.y - 70 }, "#7DF9FF", true);
          animate(h, { x: [0, -10, 0] }, { duration: 0.3, ease });
          animate(f, { x: [null, -d * 0.4], rotate: [null, 14, 0] }, { duration: 0.35, ease });
          return;
        }
        play("hurt");
        setHeroHurt(true);
        flashOn("#FF3B4A", "hero");
        whiteFlash(hb);
        animate(hb, { rotate: [0, -24, 8, 0], scaleY: [1, 0.86, 1.04, 1] }, { duration: 0.6, ease });
        animate(h, { x: [0, -56, -30, 0], y: [0, -18, 0, 0] }, { duration: 0.6, ease });
        burst(at, ["#FF5A5F", "#FFB3B6", p.enemy.color], 12, 80);
        dust(center(h, 1));
        float(`-${damage}`, { x: at.x, y: at.y - 50 }, "#FF5A5F", knockout);
        punch(at, 0.05);
        shake(knockout ? 14 : strongHit ? 10 : 6);
        if (!knockout) setTimeout(() => setHeroHurt(false), 650);
      };
      // Small stagger for volley shots that don't deal the damage.
      const graze = () => {
        if (blocked) {
          burst({ x: center(h).x + heroSize * 0.4, y: center(h).y }, ["#7DF9FF", "#FFFFFF"], 6, 50);
          return;
        }
        whiteFlash(hb);
        burst(center(h), [p.enemy.color, "#FFFFFF"], 6, 50);
        animate(hb, { x: [0, -10, 0], rotate: [0, -6, 0] }, { duration: 0.18, ease });
      };

      if (kind === "lunge") {
        // Tremble and rear back, charge in with afterimages, bite, hop away.
        animate(fb, { x: [0, -5, 5, -5, 5, 0] }, { duration: 0.3 });
        await animate(f, { x: 26, rotate: 10 }, { duration: 0.3, ease });
        play("whoosh");
        dust(center(f, 1), true);
        streak(center(f), -1, p.enemy.color);
        const stop = trail(f, "foe");
        await animate(f, { x: -d, y: -14, rotate: -16 }, { duration: 0.16, ease: easeIn });
        stop();
        onHit();
        animate(fb, { scaleX: [1, 1.18, 1], scaleY: [1, 0.86, 1] }, { duration: 0.25, ease });
        await sleep(260);
        if (!blocked) await animate(f, { x: [-d, -d * 0.5, 0], y: [-14, -54, 0], rotate: [-16, 8, 0] }, { duration: 0.46, ease: "easeInOut" });
        else await animate(f, { x: 0, y: 0, rotate: 0 }, { duration: 0.4, ease });
        dust(center(f, 1));
      } else if (kind === "slam") {
        // Squash, launch high, hang over the warrior, crash down.
        await animate(fb, { scaleY: 0.74, scaleX: 1.16 }, { duration: 0.16, ease });
        play("whoosh");
        dust(center(f, 1), true);
        animate(fb, { scaleY: [0.74, 1.16, 1], scaleX: [1.16, 0.9, 1] }, { duration: 0.4, ease });
        await animate(f, { x: -d * 0.8, y: p.compact ? -95 : -130, rotate: -12 }, { duration: 0.4, ease: [0.2, 0.8, 0.3, 1] });
        await sleep(100);
        const stop = trail(f, "foe", 26);
        await animate(f, { x: -d * 0.92, y: 0, rotate: 0 }, { duration: 0.13, ease: easeIn });
        stop();
        animate(fb, { scaleY: [1, 0.72, 1.06, 1], scaleX: [1, 1.2, 0.96, 1] }, { duration: 0.42, ease });
        const at = center(h);
        ring({ x: at.x, y: at.y + heroSize * 0.45 }, p.enemy.color, heroSize * 1.8);
        dust({ x: at.x - heroSize * 0.4, y: at.y + heroSize * 0.5 }, true);
        dust({ x: at.x + heroSize * 0.4, y: at.y + heroSize * 0.5 }, true);
        onHit();
        await sleep(240);
        await animate(f, { x: [-d * 0.92, -d * 0.45, 0], y: [0, -64, 0] }, { duration: 0.46, ease: "easeInOut" });
        dust(center(f, 1));
      } else {
        // Channel a signature-sigil volley. Only the last shot deals damage.
        animate(fb, { x: [0, -4, 4, -4, 4, 0] }, { duration: 0.32 });
        await animate(fb, { scaleY: 1.16, scaleX: 1.1 }, { duration: 0.3, ease });
        for (let i = 0; i < 3; i++) {
          play("whoosh");
          animate(fb, { x: [0, 16, 0], scaleY: [1.16, 0.94, 1.1], scaleX: [1.1, 1.08, 1.06] }, { duration: 0.16, ease });
          const to = center(h);
          add<Shot>(setShots, { id: ++uid, from: center(f, 0.45), to: { x: to.x + (i - 1) * 14, y: to.y + (i - 1) * 16 }, color: p.enemy.accent, kind: "rune", ms: 300 }, 360);
          setTimeout(i < 2 ? graze : () => onHit(false), 290);
          await sleep(130);
        }
        animate(fb, { scaleY: 1, scaleX: 1, x: 0 }, { duration: 0.3, ease });
        await sleep(520);
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
      float(kind === "shield" ? "FIREWALL UP" : kind === "surge" ? "POWER SURGE" : "HINT", { x: at.x, y: at.y - 70 }, color, true);
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
            <HeroArt body={p.avatar.body} armor={p.avatar.armor} energy={en} finish={p.avatar.finish} aura={p.avatar.aura} size={heroSize} hurt={heroHurt} />
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
            <FoeArt enemy={p.enemy} boss={p.boss} size={foeSize} hurt={foeHurt} />
          </div>
        </div>

        {/* effects */}
        {rings.map((r) => (
          <motion.div key={r.id} className="pointer-events-none absolute z-20 rounded-[50%] border-[5px]" style={{ left: r.at.x - r.size / 2, top: r.at.y - (r.inward ? r.size / 2 : r.size * 0.18), width: r.size, height: r.inward ? r.size : r.size * 0.36, borderColor: r.color, boxShadow: `0 0 12px ${r.color}` }} initial={r.inward ? { scale: 1.3, opacity: 0 } : { scale: 0.2, opacity: 1 }} animate={r.inward ? { scale: 0.15, opacity: [0, 1, 0.8] } : { scale: 1, opacity: 0 }} transition={{ duration: r.inward ? 0.45 : 0.6, ease: r.inward ? easeIn : ease }} />
        ))}
        {ghosts.map((g) => (
          <motion.div key={g.id} className="pointer-events-none absolute z-[9]" style={{ left: g.x, top: g.y, width: g.w, filter: `drop-shadow(0 0 6px ${g.who === "hero" ? en : p.enemy.color}) saturate(1.4)` }} initial={{ opacity: 0.55 }} animate={{ opacity: 0 }} transition={{ duration: 0.34, ease: "easeOut" }}>
            {g.who === "hero" ? (
              <HeroArt body={p.avatar.body} armor={p.avatar.armor} energy={p.avatar.energy} finish={p.avatar.finish} size={g.w} idle={false} />
            ) : (
              <FoeArt enemy={p.enemy} boss={p.boss} size={g.w} idle={false} />
            )}
          </motion.div>
        ))}
        {streaks.map((k) => (
          <div key={k.id} className="pointer-events-none absolute z-[8]" style={{ left: k.at.x, top: k.at.y }}>
            {[-46, -22, 0, 20, 44].map((dy, i) => (
              <motion.span
                key={i}
                className="absolute h-[4px] rounded-full"
                style={{ top: dy, width: 70 + (i % 3) * 40, background: `linear-gradient(${k.dir > 0 ? 270 : 90}deg, ${k.color}, transparent)` }}
                initial={{ x: k.dir > 0 ? -40 : 40, opacity: 0, scaleX: 0.4 }}
                animate={{ x: k.dir > 0 ? -160 : 160, opacity: [0, 0.9, 0], scaleX: 1 }}
                transition={{ duration: 0.4, delay: i * 0.02, ease: "easeOut" }}
              />
            ))}
          </div>
        ))}
        {slashes.map((s) => <SlashFx key={s.id} s={s} />)}
        {shots.map((s) =>
          s.kind === "wave" ? (
            <motion.svg key={s.id} viewBox="0 0 60 100" className="pointer-events-none absolute z-30" style={{ left: 0, top: 0, width: 84, height: 140, filter: `drop-shadow(-18px 0 10px ${s.color}) drop-shadow(0 0 8px ${s.color})` }} initial={{ x: s.from.x - 42, y: s.from.y - 70, opacity: 0.5, scale: 0.5 }} animate={{ x: s.to.x - 42, y: s.to.y - 70, opacity: 1, scale: 1.25 }} transition={{ duration: s.ms / 1000, ease: easeIn }}>
              <path d="M14 6 Q60 50 14 94 Q36 50 14 6 Z" fill={s.color} />
              <path d="M18 18 Q46 50 18 82" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
            </motion.svg>
          ) : (
            <motion.svg key={s.id} viewBox="0 0 60 60" className="pointer-events-none absolute z-30" style={{ left: 0, top: 0, width: 44, height: 44, color: s.color }} initial={{ x: s.from.x - 22, y: s.from.y - 22, scale: 0.6, rotate: -45 }} animate={{ x: s.to.x - 22, y: s.to.y - 22, scale: 1.15, rotate: 135 }} transition={{ duration: s.ms / 1000, ease: "easeIn" }}>
              <circle cx="30" cy="30" r="25" fill="#10172B" fillOpacity="0.7" stroke="currentColor" strokeWidth="3"/>
              <path d="M30 7 L53 30 L30 53 L7 30 Z" fill="none" stroke="currentColor" strokeWidth="3"/>
              <path d="M30 17 L42 30 L30 43 L18 30 Z" fill="currentColor"/>
              <circle cx="30" cy="30" r="4" fill="#FFFFFF"/>
            </motion.svg>
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

// A crescent sword arc that sweeps across the target, with a bright leading edge.
const ARC = "M26 52 Q150 40 172 168 Q132 86 26 52 Z";
const EDGE = "M26 52 Q150 40 172 168";
function SlashFx({ s }: { s: Slash }) {
  const turns: Record<SlashKind, [number, number][]> = {
    arcR: [[-30, 8]],
    arcL: [[210, 172]],
    up: [[110, 74]],
    down: [[-62, -22]],
    cross: [[-30, 8], [210, 172]],
  };
  const gid = `sl-${s.id}`;
  return (
    <svg viewBox="0 0 200 200" className="pointer-events-none absolute z-30" style={{ left: s.at.x - s.size / 2, top: s.at.y - s.size / 2, width: s.size, height: s.size, overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={s.color} stopOpacity="0" />
          <stop offset="55%" stopColor={s.color} stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      {turns[s.kind].map(([from, to], k) => (
        <motion.g
          key={k}
          style={{ originX: "100px", originY: "100px", transformBox: "view-box" }}
          initial={{ rotate: from, scale: 0.75, opacity: 0 }}
          animate={{ rotate: to, scale: 1.08, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.36, delay: k * 0.07, times: [0, 0.15, 0.6, 1], ease: [0.2, 0.9, 0.3, 1] }}
        >
          <path d={ARC} fill={`url(#${gid})`} />
          <motion.path d={EDGE} fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.12, delay: k * 0.07 }} />
          <path d={EDGE} fill="none" stroke={s.color} strokeWidth="14" strokeLinecap="round" opacity="0.25" />
        </motion.g>
      ))}
    </svg>
  );
}
