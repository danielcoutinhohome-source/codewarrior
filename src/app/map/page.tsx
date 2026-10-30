"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import Warrior from "@/components/Warrior";
import { Button, Logo } from "@/components/ui";
import { WORLDS, XP_PER_LEVEL, levelFor } from "@/lib/game";
import { useWarrior } from "@/lib/useWarrior";

// Node positions on the island, as % of width (x) and px from the top (y) of a 520px-tall map.
const NODES = [
  { x: 11, y: 410 },
  { x: 30, y: 350 },
  { x: 47, y: 400 },
  { x: 64, y: 300 },
  { x: 84, y: 175 },
];
const PATH = "M110 410 C 200 440, 230 350, 300 350 S 420 420, 470 400 S 580 300, 640 300 S 780 250, 840 175";

export default function MapPage() {
  const { account, progress, signOut } = useWarrior();
  const [picked, setPicked] = useState<number | null>(null);

  if (!account || !progress) return <div className="min-h-dvh bg-sky" />;

  const worldIdx = progress.currentWorld;
  const world = WORLDS[worldIdx];
  const won = (b: number) => !!progress.battlesWon[`w${worldIdx}-b${b}`];
  const current = world.battles.findIndex((_, b) => !won(b));
  const selected = picked ?? (current === -1 ? 4 : current);
  const level = levelFor(progress.xp);
  const xpInto = progress.xp % XP_PER_LEVEL;
  const { armor, energy, title } = account.avatar;

  return (
    <div className="min-h-dvh bg-sky">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 pb-10 pt-5">
        <header className="card flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-16 w-16 flex-none place-items-center overflow-hidden rounded-full border-[3px] border-gold bg-sky-night">
              <Warrior armor={armor} energy={energy} size={60} idle={false} className="mt-4" />
            </span>
            <div>
              <div className="font-display text-2xl leading-none">{account.username}</div>
              <div className="text-[13px] font-extrabold text-ink-soft">{title} · Level {level}</div>
            </div>
          </div>
          <div className="min-w-0 flex-[1_1_200px]">
            <div className="flex justify-between text-[13px] font-black text-xp-deep">
              <span>XP</span>
              <span>{xpInto} / {XP_PER_LEVEL}</span>
            </div>
            <div className="mt-1 h-4 overflow-hidden rounded-full bg-xp-soft">
              <motion.div
                className="h-full rounded-full bg-xp"
                style={{ boxShadow: "inset 0 -4px 0 #6D4BD8" }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(3, (xpInto / XP_PER_LEVEL) * 100)}%` }}
                transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.2 }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Stat bg="#FFF1E0" fg="#B35A00" icon={<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" fill="#FF8A00" />}>
              {progress.streak} day streak
            </Stat>
            <Stat bg="#FFF6DB" fg="#8A6400" icon={<circle cx="12" cy="12" r="9" fill="#FFC83D" stroke="#E5A300" strokeWidth="2.5" />}>
              {progress.coins} coins
            </Stat>
          </div>
          <button onClick={signOut} className="ml-auto text-sm font-black text-ink-mute hover:text-ink">Log out</button>
        </header>

        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-sm font-black uppercase tracking-[0.15em] text-ocean-deep">World {worldIdx + 1} of 7</div>
            <h1 className="font-display text-[clamp(36px,5vw,48px)] leading-none">{world.name}</h1>
          </div>
          <div className="font-extrabold text-ink-soft">
            {world.topic} · Boss: <b className="text-danger-deep">{world.battles[4]}</b>
          </div>
        </div>

        <div className="relative h-[520px] overflow-hidden rounded-[30px] border-[3px] border-[#4FB4E3] bg-[#6CCBF5]" style={{ boxShadow: "0 10px 0 #3C9CCB" }}>
          {[
            [4, 40, 120],
            [30, 120, 90],
            [78, 470, 160],
          ].map(([l, t, w], i) => (
            <motion.div
              key={i}
              aria-hidden
              className="absolute h-2.5 rounded-full bg-[#A8E3FA]"
              style={{ left: `${l}%`, top: t, width: w }}
              animate={{ x: [0, -18, 0] }}
              transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
          <div aria-hidden className="absolute left-[4%] top-[250px] h-[240px] w-[58%] rounded-[50%] bg-grass" style={{ boxShadow: "0 18px 0 #D8B36A" }} />
          <div aria-hidden className="absolute left-[44%] top-[150px] h-[270px] w-[50%] rounded-[48%] bg-grass" style={{ boxShadow: "0 18px 0 #D8B36A" }} />
          <div aria-hidden className="absolute left-[72%] top-[70px] h-[200px] w-[24%] rounded-[46%] bg-[#7CC95A]" style={{ boxShadow: "0 18px 0 #C99A5B" }} />

          <svg viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full">
            <path d={PATH} fill="none" stroke="#F4E3B5" strokeWidth="22" strokeLinecap="round" />
            <motion.path
              d={PATH} fill="none" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="2 16" strokeLinecap="round"
              animate={{ strokeDashoffset: [0, -36] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            />
          </svg>

          {NODES.map((n, b) => {
            const boss = b === 4;
            const done = won(b);
            const isCurrent = b === current;
            const locked = !done && !isCurrent;
            const size = boss ? 120 : isCurrent ? 92 : 80;
            const fill = done ? "#FFC83D" : isCurrent ? "#FF8A00" : boss ? "#E5484D" : "#D7DEEA";
            const edge = done ? "#E5A300" : isCurrent ? "#D96F00" : boss ? "#B3343A" : "#AEB8CC";
            return (
              <motion.button
                key={b}
                type="button"
                onClick={() => setPicked(b)}
                aria-label={`${boss ? "Boss" : `Battle ${b + 1}`}: ${world.battles[b]}${done ? ", won" : locked ? ", locked" : ""}`}
                className="absolute grid place-items-center rounded-full border-4 border-white"
                style={{ left: `calc(${n.x}% - ${size / 2}px)`, top: n.y - size / 2, width: size, height: size, background: fill, opacity: locked && !boss ? 0.9 : 1 }}
                initial={{ scale: 0, y: 20 }}
                animate={{
                  scale: selected === b ? 1.08 : 1,
                  y: 0,
                  boxShadow: isCurrent
                    ? [`0 10px 0 ${edge}, 0 0 0 0 rgba(255,138,0,.5)`, `0 10px 0 ${edge}, 0 0 0 22px rgba(255,138,0,0)`]
                    : `0 10px 0 ${edge}`,
                }}
                transition={{
                  scale: { type: "spring", stiffness: 400, damping: 18, delay: b * 0.06 },
                  y: { type: "spring", stiffness: 400, damping: 18, delay: b * 0.06 },
                  boxShadow: isCurrent ? { duration: 1.8, repeat: Infinity } : { duration: 0.2 },
                }}
                whileHover={{ y: -4 }}
                whileTap={{ y: 4 }}
              >
                <NodeIcon kind={done ? "done" : boss ? "boss" : isCurrent ? "fight" : "lock"} />
              </motion.button>
            );
          })}

          {current !== -1 && (
            <motion.div
              className="pointer-events-none absolute"
              style={{ left: `calc(${NODES[current].x}% - 45px)`, top: NODES[current].y - 46 - 120 }}
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.4 }}
            >
              <Warrior armor={armor} energy={energy} size={90} />
            </motion.div>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.section
            key={selected}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="card flex flex-wrap items-center justify-between gap-4 p-5"
          >
            <div>
              <div className="text-[13px] font-black uppercase tracking-wider text-ember">{selected === 4 ? "Boss battle" : `Battle ${selected + 1}`}</div>
              <div className="font-display text-[28px] leading-tight">{world.battles[selected]}</div>
              <div className="font-bold text-ink-soft">
                {selected === 4 ? "8 questions in 3 phases · 3 hearts · no hint potions · +150 XP" : "5 questions · hint potions allowed · +50 XP"}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button disabled size="lg">FIGHT!</Button>
              <span className="text-sm font-bold text-ink-mute">Battles unlock in the next build</span>
            </div>
          </motion.section>
        </AnimatePresence>

        <nav aria-label="Worlds" className="grid grid-cols-[repeat(7,minmax(130px,1fr))] gap-2.5 overflow-x-auto pb-2">
          {WORLDS.map((w, i) => {
            const here = i === worldIdx;
            const done = i < worldIdx;
            const final = i === 6;
            return (
              <div
                key={w.name}
                className="rounded-[18px] border-[3px] px-3 py-2.5"
                style={{
                  background: here ? "#FF8A00" : final ? "#2B2F5E" : done ? "#FFFFFF" : "#EEF2F8",
                  borderColor: here ? "#FF8A00" : final ? "#2B2F5E" : done ? "#BFE9C8" : "#D7DEEA",
                  color: here || final ? "#FFFFFF" : done ? "#1F2440" : "#6B7294",
                  boxShadow: `0 6px 0 ${here ? "#D96F00" : final ? "#171A3D" : done ? "#9BD3A8" : "#C3CCDB"}`,
                }}
              >
                <div className="text-xs font-black" style={{ color: final && !here ? "#FFC83D" : undefined }}>
                  {final ? "FINAL WORLD" : `WORLD ${i + 1}`}{here ? " · HERE" : done ? " · DONE" : ""}
                </div>
                <div className="font-black">{w.name}</div>
              </div>
            );
          })}
        </nav>

        <footer className="flex justify-center pt-2 opacity-70"><Logo size={20} /></footer>
      </div>
    </div>
  );
}

function Stat({ bg, fg, icon, children }: { bg: string; fg: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 font-black" style={{ background: bg, color: fg }}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>{icon}</svg>
      {children}
    </span>
  );
}

function NodeIcon({ kind }: { kind: "done" | "fight" | "lock" | "boss" }) {
  if (kind === "done")
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#8A6400" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
    );
  if (kind === "fight")
    return (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
        <path d="M4 4l11 11M15 15l-2 4M15 15l4-2M20 4L9 15M9 15l2 4M9 15l-4-2" />
      </svg>
    );
  if (kind === "lock")
    return (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#7D879E" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
        <rect x="5" y="11" width="14" height="10" rx="3" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    );
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <path d="M18 18 L24 8 L32 16 L40 8 L46 18 Z" fill="#FFC83D" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
      <rect x="16" y="20" width="32" height="30" rx="10" fill="#FFFFFF" />
      <circle cx="26" cy="33" r="4" fill="#E5484D" />
      <circle cx="38" cy="33" r="4" fill="#E5484D" />
      <path d="M22 27 L30 30 M42 27 L34 30" stroke="#1F2440" strokeWidth="3" strokeLinecap="round" />
      <path d="M26 43 Q32 39 38 43" fill="none" stroke="#1F2440" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
