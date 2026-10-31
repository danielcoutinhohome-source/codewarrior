"use client";

import { motion } from "framer-motion";
import { useReduceMotion } from "@/lib/motionPref";
import { useId } from "react";
import { darken, lighten } from "@/lib/color";
import type { Enemy } from "@/lib/game";
import EnemyArt, { type EnemyPalette } from "./EnemyArt";

type Props = {
  enemy: Enemy;
  boss?: boolean;
  size?: number;
  idle?: boolean;
  hurt?: boolean;
  silhouette?: boolean;
  className?: string;
};

export default function Monster({ enemy, boss = false, size = 200, idle = true, hurt = false, silhouette = false, className }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (name: string) => `enemy-${uid}-${name}`;
  const paint = (name: string) => `url(#${id(name)})`;
  const reducedMotion = useReduceMotion();
  // Hidden bosses reveal a silhouette only: no name, programming cue or lore.
  const loop = idle && !reducedMotion && !hurt;
  const floating = ["division-ray", "boolean-owl", "while-jelly", "substring-wyvern", "echo-wraith", "null-lich", "bounds-bat", "constructor-raven", "stock-mage", "final-judge"].includes(enemy.design);
  const crawling = ["cast-corsair", "counter-crab", "offset-angler", "length-crawler", "swap-spider", "char-sabertooth", "nested-basilisk"].includes(enemy.design);
  const glow = silhouette ? "#FF647C" : enemy.accent;
  const p: EnemyPalette = {
    skin: paint("armor"), metal: paint("metal"), dark: silhouette ? "#101529" : darken(enemy.color, 0.6),
    light: silhouette ? "#171E33" : "#DCECF3", glow, muted: silhouette, hurt,
  };
  const pose = floating
    ? { y: [0, -7, 0], rotate: [-1.2, 1.2, -1.2] }
    : crawling ? { y: [0, -2, 0], rotate: [-1, 1, -1] }
    : { y: [0, -2, 0], scaleY: [1, 1.018, 1] };

  return (
    <svg viewBox="0 0 240 240" width={size} height={size} role="img" aria-labelledby={id("title")} className={className} style={{ overflow: "visible", flexShrink: 0 }}>
      <title id={id("title")}>{silhouette ? "Unknown boss" : enemy.name}</title>
      {!silhouette && <desc>{enemy.lore}</desc>}
      <defs>
        <linearGradient id={id("armor")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={silhouette ? "#242C43" : lighten(enemy.color, 0.3)}/>
          <stop offset="0.5" stopColor={silhouette ? "#171D30" : enemy.color}/>
          <stop offset="1" stopColor={silhouette ? "#0D1325" : darken(enemy.color, 0.35)}/>
        </linearGradient>
        <linearGradient id={id("metal")} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={silhouette ? "#293047" : lighten(enemy.accent, 0.25)}/>
          <stop offset="0.48" stopColor={silhouette ? "#1B2238" : enemy.accent}/>
          <stop offset="1" stopColor={silhouette ? "#101529" : darken(enemy.accent, 0.42)}/>
        </linearGradient>
        <radialGradient id={id("aura")}>
          <stop offset="0" stopColor={glow} stopOpacity={boss ? 0.24 : 0.12}/>
          <stop offset="1" stopColor={glow} stopOpacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="120" cy="121" r="113" fill={paint("aura")}/>
      <ellipse cx="120" cy="217" rx={boss ? 80 : 61} ry="8" fill="#10172B" opacity="0.23"/>
      {boss && !silhouette && <g fill="none" stroke={glow} opacity="0.45">
        <ellipse cx="120" cy="215" rx="91" ry="13" strokeWidth="2"/>
        <ellipse cx="120" cy="215" rx="78" ry="9" strokeDasharray="8 7"/>
      </g>}
      <motion.g animate={loop ? pose : undefined} transition={{ duration: floating ? 3.4 : crawling ? 2.2 : 2.8, repeat: Infinity, ease: "easeInOut" }} style={{ originX: "120px", originY: "210px" }}>
        <g stroke={silhouette ? "#101529" : "#162238"} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
          <EnemyArt design={enemy.design} p={p}/>
        </g>
      </motion.g>
      {!silhouette && size >= 100 && <g aria-hidden="true">
        <rect x="72" y="222" width="96" height="17" rx="8.5" fill="#11192B" stroke={glow} strokeWidth="1"/>
        <text x="120" y="233.5" textAnchor="middle" fill={glow} fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="700">{enemy.label}</text>
      </g>}
    </svg>
  );
}
