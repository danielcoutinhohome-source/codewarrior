"use client";

import { AnimatePresence, motion, useAnimate } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
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
};

type Float = { id: number; text: string; x: number; y: number; color: string; big?: boolean };
type Burst = { id: number; x: number; y: number; colors: string[]; count: number; spread: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let uid = 0;

const Arena = forwardRef<ArenaHandle, Props>(function Arena(p, ref) {
  const [scope, animate] = useAnimate();
  const heroRef = useRef<HTMLDivElement>(null);
  const foeRef = useRef<HTMLDivElement>(null);
  const [floats, setFloats] = useState<Float[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [slash, setSlash] = useState<{ id: number; crit: boolean } | null>(null);
  const [claw, setClaw] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ id: number; color: string } | null>(null);
  const [foeHurt, setFoeHurt] = useState(false);
  const [heroHurt, setHeroHurt] = useState(false);
  const [aura, setAura] = useState<{ id: number; color: string } | null>(null);

  // Center of an element relative to the arena, in px.
  const center = useCallback((el: HTMLElement | null) => {
    const root = scope.current as HTMLElement | null;
    if (!el || !root) return { x: 0, y: 0 };
    const a = el.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    return { x: a.left + a.width / 2 - b.left, y: a.top + a.height / 2 - b.top };
  }, [scope]);

  const float = (text: string, at: { x: number; y: number }, color: string, big = false) => {
    const f = { id: ++uid, text, x: at.x, y: at.y, color, big };
    setFloats((v) => [...v, f]);
    setTimeout(() => setFloats((v) => v.filter((x) => x.id !== f.id)), 1300);
  };
  const burst = (at: { x: number; y: number }, colors: string[], count = 12, spread = 90) => {
    const b = { id: ++uid, x: at.x, y: at.y, colors, count, spread };
    setBursts((v) => [...v, b]);
    setTimeout(() => setBursts((v) => v.filter((x) => x.id !== b.id)), 900);
  };
  const shake = (amt = 8) => animate(scope.current, { x: [0, -amt, amt, -amt * 0.6, amt * 0.6, 0], y: [0, amt * 0.4, -amt * 0.4, 0, 0, 0] }, { duration: 0.38 });

  const dash = () => {
    const a = center(heroRef.current), b = center(foeRef.current);
    return Math.max(60, b.x - a.x - (p.compact ? 70 : 120));
  };

  useImperativeHandle(ref, () => ({
    async intro() {
      if (!heroRef.current || !foeRef.current) return;
      animate(heroRef.current, { x: [-220, 0], opacity: [0, 1] }, { type: "spring", stiffness: 140, damping: 16 });
      await animate(foeRef.current, { x: [220, 0], opacity: [0, 1] }, { type: "spring", stiffness: 140, damping: 16, delay: 0.1 });
    },

    async attack({ damage, crit, surge, finisher }) {
      const hero = heroRef.current, foe = foeRef.current;
      if (!hero || !foe) return;
      const d = dash();
      play("whoosh");
      await animate(hero, { x: d, y: -24, rotate: 10, scale: 1.05 }, { duration: 0.22, ease: [0.3, 0, 0.2, 1] });
      setSlash({ id: ++uid, crit: crit || surge });
      play(crit || surge ? "crit" : "slash");
      await sleep(90);
      const at = center(foe);
      setFoeHurt(true);
      animate(foe, { x: [0, 34, -8, 0], scaleX: [1, 0.86, 1.06, 1], scaleY: [1, 1.1, 0.96, 1] }, { duration: 0.42 });
      setFlash({ id: ++uid, color: "#FFFFFF" });
      burst(at, surge ? ["#FFC83D", "#FFFFFF", p.avatar.energy] : [p.avatar.energy, "#FFFFFF", "#FFE066"], crit || surge ? 18 : 12, crit || surge ? 130 : 90);
      float(`-${damage}`, { x: at.x, y: at.y - 40 }, crit || surge ? "#FFC83D" : "#FFFFFF", crit || surge);
      if (crit || surge) {
        float(surge ? "POWER SURGE!" : "CRITICAL!", { x: at.x, y: at.y - 92 }, "#FF8A00", true);
        shake(10);
      }
      if (finisher) shake(14);
      await sleep(260);
      setFoeHurt(finisher);
      await animate(hero, { x: 0, y: 0, rotate: 0, scale: 1 }, { type: "spring", stiffness: 260, damping: 22 });
    },

    async hurt({ damage, blocked, knockout }) {
      const hero = heroRef.current, foe = foeRef.current;
      if (!hero || !foe) return;
      const d = dash();
      play("whoosh");
      await animate(foe, { x: -d, y: -18, rotate: -12, scale: 1.12 }, { duration: 0.24, ease: [0.3, 0, 0.2, 1] });
      const at = center(hero);
      if (blocked) {
        play("shield");
        burst(at, ["#7DF9FF", "#FFFFFF", "#A9C7FF"], 14, 80);
        float("BLOCKED", { x: at.x, y: at.y - 70 }, "#7DF9FF", true);
        animate(hero, { x: [0, -10, 0] }, { duration: 0.3 });
      } else {
        play("hurt");
        setClaw(++uid);
        setHeroHurt(true);
        setFlash({ id: ++uid, color: "#FF3B4A" });
        animate(hero, { x: [0, -46, -30, 0], rotate: [0, -14, -8, 0], opacity: [1, 0.4, 1, 0.5, 1] }, { duration: 0.6 });
        burst(at, ["#FF5A5F", "#FFB3B6"], 10, 70);
        float(`-${damage}`, { x: at.x, y: at.y - 50 }, "#FF5A5F", knockout);
        shake(knockout ? 14 : 9);
      }
      await sleep(320);
      animate(foe, { x: 0, y: 0, rotate: 0, scale: 1 }, { type: "spring", stiffness: 240, damping: 20 });
      await sleep(280);
      if (!knockout) setHeroHurt(false);
    },

    async heal(amount) {
      const at = center(heroRef.current);
      play("potion");
      setAura({ id: ++uid, color: "#3EC46D" });
      burst(at, ["#3EC46D", "#B6F5C8", "#FFFFFF"], 16, 70);
      float(`+${amount}`, { x: at.x, y: at.y - 60 }, "#3EC46D", true);
      await sleep(600);
    },

    async powerUp(kind) {
      const at = center(heroRef.current);
      if (kind === "shield") play("shield");
      else play("potion");
      const color = kind === "shield" ? "#7DF9FF" : kind === "surge" ? "#FFC83D" : "#B394FF";
      setAura({ id: ++uid, color });
      burst(at, [color, "#FFFFFF"], 14, 70);
      float(kind === "shield" ? "SHIELD UP" : kind === "surge" ? "POWER SURGE" : "HINT", { x: at.x, y: at.y - 70 }, color, true);
      await sleep(500);
    },

    async enemyDefeated() {
      const foe = foeRef.current;
      if (!foe) return;
      const at = center(foe);
      setFoeHurt(true);
      await sleep(150);
      burst(at, [p.enemy.color, "#FFFFFF", "#FFE066"], 26, 170);
      await animate(foe, { scale: [1, 1.15, 0], rotate: [0, -8, 30], opacity: [1, 1, 0], y: [0, -10, 40] }, { duration: 0.6, ease: "easeIn" });
    },

    async playerDefeated() {
      const hero = heroRef.current;
      if (!hero) return;
      setHeroHurt(true);
      await animate(hero, { rotate: -80, y: 50, x: -30, opacity: 0.45 }, { duration: 0.7, ease: "easeIn" });
    },
  }));

  const ink = p.theme.night ? "#FFFFFF" : "#1F2440";
  const heroSize = p.compact ? 120 : 170;
  const foeSize = p.compact ? (p.boss ? 150 : 128) : p.boss ? 220 : 180;

  return (
    <div
      ref={scope}
      className="relative overflow-hidden rounded-[26px] border-[3px]"
      style={{ height: p.compact ? 270 : 400, background: `linear-gradient(180deg, ${p.theme.skyTop} 0%, ${p.theme.skyBottom} 62%)`, borderColor: p.theme.roadEdge }}
    >
      {p.theme.night &&
        [12, 28, 47, 66, 84].map((x, i) => (
          <motion.span key={x} aria-hidden className="absolute h-1 w-1 rounded-full bg-white" style={{ left: `${x}%`, top: `${8 + (i % 3) * 9}%` }} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2 + i * 0.4, repeat: Infinity }} />
        ))}
      <div aria-hidden className="absolute inset-x-[-10%] bottom-[-30%] h-[62%] rounded-[50%]" style={{ background: `linear-gradient(180deg, ${p.theme.groundFar}, ${p.theme.groundNear})` }} />

      {/* HP bars */}
      <HpBar label={p.name} hp={p.playerHp} max={p.playerMax} color="#3EC46D" edge="#2BA155" side="left" ink={ink} />
      <HpBar label={p.enemy.name} hp={p.enemyHp} max={p.enemyMax} color={p.boss ? "#E5484D" : "#FF5A5F"} edge="#C2333A" side="right" ink={ink} boss={p.boss} />

      <AnimatePresence>
        {p.combo >= 2 && (
          <motion.div
            key={p.combo}
            initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: -4 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 500, damping: 14 }}
            className="absolute left-1/2 top-[22%] z-20 -translate-x-1/2 rounded-2xl px-3 py-1 font-display text-white"
            style={{ background: p.combo >= 5 ? "#FF8A00" : "#8B5CF6", boxShadow: `0 4px 0 ${p.combo >= 5 ? "#D96F00" : "#6D4BD8"}`, fontSize: p.compact ? 18 : 24 }}
          >
            {p.combo}x COMBO
          </motion.div>
        )}
      </AnimatePresence>

      {/* pedestals */}
      <div aria-hidden className="absolute bottom-[9%] left-[6%] h-[13%] w-[34%] rounded-[50%]" style={{ background: p.theme.road, boxShadow: `0 10px 0 ${p.theme.roadEdge}` }} />
      <div aria-hidden className="absolute bottom-[9%] right-[5%] h-[14%] w-[38%] rounded-[50%]" style={{ background: p.theme.road, boxShadow: `0 10px 0 ${p.theme.roadEdge}` }} />

      {/* fighters */}
      <div ref={heroRef} className="absolute bottom-[14%] left-[8%] z-10" style={{ width: heroSize }}>
        <div className="relative">
          <Warrior armor={p.avatar.armor} energy={p.avatar.energy} finish={p.avatar.finish} aura={p.avatar.aura} size={heroSize} hurt={heroHurt} />
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
      <div ref={foeRef} className="absolute bottom-[14%] right-[8%] z-10" style={{ width: foeSize }}>
        <Monster enemy={p.enemy} boss={p.boss} size={foeSize} hurt={foeHurt} />
      </div>

      {/* effects */}
      <AnimatePresence>
        {slash && (
          <motion.svg key={slash.id} viewBox="0 0 200 200" className="pointer-events-none absolute z-20" style={{ right: "8%", bottom: "16%", width: foeSize, height: foeSize }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 0.32, duration: 0.25 }} onAnimationComplete={() => setSlash(null)}>
            {[0, ...(slash.crit ? [1] : [])].map((k) => (
              <g key={k}>
                <motion.path d={k ? "M30 40 Q100 110 176 172" : "M176 34 Q90 96 26 168"} fill="none" stroke={p.avatar.energy} strokeWidth="18" strokeLinecap="round" opacity="0.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.16, delay: k * 0.08 }} style={{ filter: "blur(4px)" }} />
                <motion.path d={k ? "M30 40 Q100 110 176 172" : "M176 34 Q90 96 26 168"} fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.16, delay: k * 0.08 }} />
              </g>
            ))}
          </motion.svg>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {claw && (
          <motion.svg key={claw} viewBox="0 0 100 100" className="pointer-events-none absolute z-20" style={{ left: "8%", bottom: "20%", width: heroSize, height: heroSize }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 0.35, duration: 0.3 }} onAnimationComplete={() => setClaw(null)}>
            {[0, 14, 28].map((o, i) => (
              <motion.path key={o} d={`M${24 + o} 20 L${44 + o} 80`} stroke="#FF3B4A" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.12, delay: i * 0.04 }} />
            ))}
          </motion.svg>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {flash && (
          <motion.div key={flash.id} className="pointer-events-none absolute inset-0 z-30" style={{ background: flash.color === "#FFFFFF" ? "radial-gradient(circle at 75% 60%, rgba(255,255,255,.7), transparent 50%)" : "radial-gradient(circle at 25% 60%, transparent 30%, rgba(255,59,74,.45))" }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.45 }} onAnimationComplete={() => setFlash(null)} />
        )}
        {aura && (
          <motion.div key={aura.id} className="pointer-events-none absolute z-0 rounded-full" style={{ left: "6%", bottom: "8%", width: heroSize * 1.2, height: heroSize * 1.2, background: `radial-gradient(circle, ${aura.color}88, transparent 65%)` }} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1.4, opacity: [0, 1, 0] }} transition={{ duration: 0.8 }} onAnimationComplete={() => setAura(null)} />
        )}
      </AnimatePresence>
      {bursts.map((b) =>
        Array.from({ length: b.count }).map((_, i) => {
          const ang = (i / b.count) * Math.PI * 2 + (b.id % 7);
          const dist = b.spread * (0.6 + ((i * 37) % 10) / 20);
          return (
            <motion.span
              key={`${b.id}-${i}`}
              className="pointer-events-none absolute z-30 rounded-full"
              style={{ left: b.x, top: b.y, width: i % 3 ? 8 : 12, height: i % 3 ? 8 : 12, background: b.colors[i % b.colors.length], marginLeft: -5, marginTop: -5 }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: Math.cos(ang) * dist, y: Math.sin(ang) * dist + 20, opacity: 0, scale: 0.3 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          );
        }),
      )}
      {floats.map((f) => (
        <motion.div
          key={f.id}
          className="pointer-events-none absolute z-40 whitespace-nowrap font-display"
          style={{ left: f.x, top: f.y, color: f.color, fontSize: f.big ? (p.compact ? 26 : 36) : p.compact ? 22 : 30, WebkitTextStroke: "2px rgba(31,36,64,.85)", paintOrder: "stroke", x: "-50%" }}
          initial={{ y: 10, scale: 0.4, opacity: 0 }}
          animate={{ y: -50, scale: 1, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.2, times: [0, 0.15, 0.7, 1], ease: "easeOut" }}
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
    <div className="absolute top-3 z-20 w-[44%] max-w-[260px] rounded-2xl bg-white/90 px-3 py-2 backdrop-blur" style={{ [side]: 12, boxShadow: "0 4px 0 rgba(31,36,64,.25)" }}>
      <div className="flex items-baseline justify-between gap-2 text-[13px] font-black text-ink">
        <span className="truncate">{boss && <span className="mr-1 text-danger-deep">BOSS</span>}{label}</span>
        <span className="flex-none tabular-nums" style={{ color: ink === "#FFFFFF" ? "#1F2440" : "#4A5175" }}>{Math.ceil(hp)}</span>
      </div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-[#E3E8F1]">
        <motion.div className="h-full rounded-full" style={{ background: color, boxShadow: `inset 0 -3px 0 ${edge}` }} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 18 }} />
      </div>
    </div>
  );
}

export default Arena;
