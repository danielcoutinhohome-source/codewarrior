"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { darken, lighten } from "@/lib/color";
import type { Enemy } from "@/lib/game";

type Props = {
  enemy: Enemy;
  boss?: boolean;
  size?: number; // width in px (square art)
  idle?: boolean;
  hurt?: boolean; // dizzy X eyes
  silhouette?: boolean; // dark shape with glowing eyes, for the fog
  className?: string;
};

// Where each body keeps its face, the top of its head (for a crown) and its sign.
const ANCHOR: Record<Enemy["body"], { fx: number; fy: number; gap: number; top: number; sign?: [number, number] }> = {
  blob: { fx: 100, fy: 112, gap: 22, top: 50, sign: [118, 150] },
  imp: { fx: 100, fy: 112, gap: 20, top: 66, sign: [126, 146] },
  bat: { fx: 100, fy: 98, gap: 16, top: 58, sign: [112, 146] },
  ghost: { fx: 100, fy: 100, gap: 20, top: 42, sign: [120, 150] },
  golem: { fx: 100, fy: 64, gap: 18, top: 36, sign: [112, 132] },
  crab: { fx: 100, fy: 66, gap: 22, top: 44, sign: [64, 150] },
  serpent: { fx: 112, fy: 62, gap: 15, top: 30, sign: [20, 150] },
  tower: { fx: 100, fy: 46, gap: 18, top: 18 },
  eye: { fx: 100, fy: 92, gap: 0, top: 30, sign: [112, 164] },
};

export default function Monster({ enemy, boss = false, size = 200, idle = true, hurt = false, silhouette = false, className }: Props) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${s}-${uid}`;
  const url = (s: string) => `url(#${id(s)})`;
  const reduce = useReducedMotion();
  const loop = idle && !reduce;
  const base = silhouette ? "#171A38" : enemy.color;
  const light = silhouette ? "#232750" : lighten(base, 0.5);
  const deep = silhouette ? "#0C0E24" : darken(base, 0.45);
  const a = ANCHOR[enemy.body];
  const eyes = enemy.eyes ?? (enemy.body === "eye" ? 1 : 2);
  const floats = enemy.body === "bat" || enemy.body === "ghost" || enemy.body === "eye";

  const B = { base, light, deep, url, id, loop, label: enemy.label, silhouette };

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={enemy.name} className={className} style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={id("skin")} cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor={light} />
          <stop offset="55%" stopColor={base} />
          <stop offset="100%" stopColor={deep} />
        </radialGradient>
        <radialGradient id={id("sclera")} cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#D7DEEC" />
        </radialGradient>
        <radialGradient id={id("aura")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={silhouette ? "#FF3B5C" : enemy.color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={silhouette ? "#FF3B5C" : enemy.color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("plank")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF6DD" />
          <stop offset="100%" stopColor="#F0DDB0" />
        </linearGradient>
      </defs>

      {boss && (
        <motion.circle cx="100" cy="110" r="98" fill={url("aura")} animate={loop ? { r: [92, 104, 92], opacity: [0.8, 1, 0.8] } : undefined} transition={{ duration: 2.2, repeat: Infinity }} />
      )}
      <motion.ellipse cx="100" cy="192" rx={enemy.body === "serpent" || enemy.body === "crab" ? 74 : 58} ry="8" fill="#0B0D24" opacity="0.22"
        animate={loop && floats ? { rx: [58, 46, 58], opacity: [0.22, 0.12, 0.22] } : undefined} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />

      <motion.g
        style={{ originX: "100px", originY: "190px" }}
        animate={loop ? (floats ? { y: [0, -10, 0] } : { scaleY: [1, 0.96, 1], scaleX: [1, 1.03, 1] }) : undefined}
        transition={{ duration: floats ? 2.2 : 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <BodyShape kind={enemy.body} {...B} />
        {enemy.horns && enemy.body !== "tower" && (
          <g fill={silhouette ? "#0C0E24" : "#FFF4D6"} stroke={silhouette ? "none" : darken(base, 0.55)} strokeWidth="2">
            <path d={`M${a.fx - 26} ${a.top + 16} Q${a.fx - 40} ${a.top - 4} ${a.fx - 30} ${a.top - 20} Q${a.fx - 22} ${a.top} ${a.fx - 14} ${a.top + 10} Z`} />
            <path d={`M${a.fx + 26} ${a.top + 16} Q${a.fx + 40} ${a.top - 4} ${a.fx + 30} ${a.top - 20} Q${a.fx + 22} ${a.top} ${a.fx + 14} ${a.top + 10} Z`} />
          </g>
        )}
        {enemy.body !== "eye" && <Face fx={a.fx} fy={a.fy} gap={a.gap} eyes={eyes} hurt={hurt} silhouette={silhouette} url={url} loop={loop} />}
        {boss && <Crown x={a.fx} y={a.top} silhouette={silhouette} />}
        {a.sign && !silhouette && <Sign x={a.sign[0]} y={a.sign[1]} text={enemy.label} url={url} />}
      </motion.g>
    </svg>
  );
}

type BodyProps = { base: string; light: string; deep: string; url: (s: string) => string; id: (s: string) => string; loop: boolean; label: string; silhouette: boolean };

function BodyShape({ kind, base, deep, url, loop, label, silhouette }: BodyProps & { kind: Enemy["body"] }) {
  const skin = url("skin");
  const shine = silhouette ? null : <ellipse cx="74" cy="76" rx="16" ry="7" transform="rotate(-25 74 76)" fill="#FFFFFF" opacity="0.45" />;
  switch (kind) {
    case "blob":
      return (
        <g>
          <path d="M28 182 Q16 118 58 74 Q100 34 142 74 Q184 118 172 182 Q150 192 128 182 Q114 196 100 184 Q84 196 70 182 Q50 192 28 182 Z" fill={skin} />
          <path d="M48 168 Q100 186 152 168" fill="none" stroke={deep} strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" />
          {shine}
        </g>
      );
    case "imp":
      return (
        <g>
          <path d="M52 108 L18 78 L60 92 Z" fill={base} />
          <path d="M148 108 L182 78 L140 92 Z" fill={base} />
          <ellipse cx="78" cy="184" rx="18" ry="9" fill={deep} />
          <ellipse cx="122" cy="184" rx="18" ry="9" fill={deep} />
          <ellipse cx="100" cy="128" rx="60" ry="56" fill={skin} />
          <ellipse cx="100" cy="156" rx="34" ry="22" fill="#FFFFFF" opacity={silhouette ? 0 : 0.22} />
          {shine}
        </g>
      );
    case "bat":
      return (
        <g>
          <motion.g style={{ originX: "70px", originY: "100px" }} animate={loop ? { rotate: [0, -14, 0] } : undefined} transition={{ duration: 0.5, repeat: Infinity }}>
            <path d="M70 96 Q30 56 4 74 Q20 92 14 112 Q30 104 36 122 Q48 108 62 120 Z" fill={deep} />
          </motion.g>
          <motion.g style={{ originX: "130px", originY: "100px" }} animate={loop ? { rotate: [0, 14, 0] } : undefined} transition={{ duration: 0.5, repeat: Infinity }}>
            <path d="M130 96 Q170 56 196 74 Q180 92 186 112 Q170 104 164 122 Q152 108 138 120 Z" fill={deep} />
          </motion.g>
          <path d="M74 72 L66 46 L88 64 Z M126 72 L134 46 L112 64 Z" fill={base} />
          <circle cx="100" cy="104" r="44" fill={skin} />
          <path d="M88 146 v12 M112 146 v12" stroke={deep} strokeWidth="5" strokeLinecap="round" />
          {shine}
        </g>
      );
    case "ghost":
      return (
        <g opacity={silhouette ? 1 : 0.96}>
          <path d="M42 180 V100 a58 58 0 0 1 116 0 V180 l-15 -12 l-14 12 l-15 -12 l-14 12 l-15 -12 l-14 12 l-15 -12 Z" fill={skin} />
          <path d="M42 128 Q24 132 22 112 M158 128 Q176 132 178 112" fill="none" stroke={base} strokeWidth="12" strokeLinecap="round" />
          {shine}
        </g>
      );
    case "golem":
      return (
        <g>
          <rect x="18" y="92" width="34" height="68" rx="16" fill={deep} />
          <rect x="148" y="92" width="34" height="68" rx="16" fill={deep} />
          <rect x="62" y="166" width="28" height="22" rx="8" fill={deep} />
          <rect x="110" y="166" width="28" height="22" rx="8" fill={deep} />
          <rect x="42" y="84" width="116" height="92" rx="22" fill={skin} />
          <rect x="58" y="30" width="84" height="64" rx="20" fill={skin} />
          <path d="M70 110 l14 10 l-6 14 M134 140 l-12 6 l4 12" fill="none" stroke={deep} strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
          {!silhouette && <ellipse cx="78" cy="42" rx="12" ry="5" fill="#FFFFFF" opacity="0.45" />}
        </g>
      );
    case "crab":
      return (
        <g>
          <g stroke={deep} strokeWidth="7" strokeLinecap="round" fill="none">
            <path d="M54 140 L22 160 M50 152 L24 182 M60 160 L40 190 M146 140 L178 160 M150 152 L176 182 M140 160 L160 190" />
            <path d="M60 116 Q34 92 30 70 M140 116 Q166 92 170 70" />
            <path d="M84 104 L80 74 M116 104 L120 74" strokeWidth="6" />
          </g>
          <path d="M14 64 a20 20 0 1 1 30 -4 l-12 -8 Z" fill={skin} />
          <path d="M186 64 a20 20 0 1 0 -30 -4 l12 -8 Z" fill={skin} />
          <ellipse cx="100" cy="136" rx="66" ry="40" fill={skin} />
          <path d="M60 128 Q100 112 140 128" fill="none" stroke="#FFFFFF" strokeOpacity={silhouette ? 0 : 0.3} strokeWidth="4" strokeLinecap="round" />
          <circle cx="78" cy="66" r="15" fill={skin} />
          <circle cx="122" cy="66" r="15" fill={skin} />
        </g>
      );
    case "serpent":
      return (
        <g>
          <ellipse cx="96" cy="176" rx="76" ry="18" fill={deep} />
          <ellipse cx="96" cy="170" rx="72" ry="16" fill={skin} />
          <ellipse cx="100" cy="146" rx="56" ry="15" fill={skin} />
          <path d="M70 140 Q66 100 96 92 Q128 86 124 70" fill="none" stroke={base} strokeWidth="30" strokeLinecap="round" />
          <path d="M70 140 Q66 100 96 92 Q128 86 124 70" fill="none" stroke="#FFFFFF" strokeOpacity={silhouette ? 0 : 0.2} strokeWidth="8" strokeLinecap="round" />
          <ellipse cx="112" cy="58" rx="40" ry="32" fill={skin} />
          {!silhouette && (
            <motion.path d="M150 70 l18 2 l6 -6 M168 72 l6 6" fill="none" stroke="#FF3B5C" strokeWidth="3" strokeLinecap="round" animate={loop ? { opacity: [0, 1, 1, 0] } : undefined} transition={{ duration: 1.6, repeat: Infinity }} />
          )}
          {!silhouette && <ellipse cx="96" cy="40" rx="12" ry="5" fill="#FFFFFF" opacity="0.45" />}
        </g>
      );
    case "tower": {
      const blocks = ["main()", "fact(1)", "fact(2)", "fact(3)"];
      return (
        <g>
          {blocks.map((t, i) => {
            const w = 150 - i * 18;
            const x = 100 - w / 2;
            const y = 166 - i * 30;
            return (
              <g key={t}>
                <rect x={x} y={y + 8} width={w} height="26" rx="9" fill={deep} />
                <rect x={x} y={y} width={w} height="26" rx="9" fill={i % 2 ? (silhouette ? base : lighten(base, 0.2)) : skin} />
                {!silhouette && (
                  <text x="100" y={y + 18} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontWeight="800" fontSize="12" fill="#FFFFFF">{t}</text>
                )}
              </g>
            );
          })}
          <rect x="52" y="22" width="96" height="58" rx="18" fill={deep} />
          <rect x="52" y="14" width="96" height="58" rx="18" fill={skin} />
          {!silhouette && <text x="100" y="78" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontWeight="800" fontSize="10" fill="#FFFFFF" opacity="0.8">{label}</text>}
        </g>
      );
    }
    case "eye":
      return (
        <g>
          {[40, 70, 100, 130, 160].map((x, i) => (
            <motion.path
              key={x}
              d={`M${x} 140 q${i % 2 ? 10 : -10} 24 0 44`}
              fill="none" stroke={deep} strokeWidth="10" strokeLinecap="round"
              animate={loop ? { rotate: [0, i % 2 ? 8 : -8, 0] } : undefined}
              style={{ originX: `${x}px`, originY: "140px" }}
              transition={{ duration: 1.4 + i * 0.2, repeat: Infinity }}
            />
          ))}
          <circle cx="100" cy="92" r="64" fill={skin} />
          <circle cx="100" cy="92" r="44" fill={silhouette ? "#0C0E24" : url("sclera")} />
          <motion.g animate={loop ? { x: [-8, 8, -8] } : undefined} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
            <circle cx="100" cy="92" r="22" fill={silhouette ? "#FF3B5C" : base} />
            <circle cx="100" cy="92" r="11" fill="#0E1130" />
            <circle cx="94" cy="86" r="4" fill="#FFFFFF" />
          </motion.g>
          <path d="M40 70 Q100 30 160 70" fill="none" stroke={deep} strokeWidth="10" strokeLinecap="round" />
        </g>
      );
  }
}

function Face({ fx, fy, gap, eyes, hurt, silhouette, url, loop }: { fx: number; fy: number; gap: number; eyes: number; hurt: boolean; silhouette: boolean; url: (s: string) => string; loop: boolean }) {
  const xs = eyes === 1 ? [fx] : eyes === 2 ? [fx - gap, fx + gap] : [fx - gap * 1.4, fx, fx + gap * 1.4];
  const r = eyes === 1 ? 17 : eyes === 3 ? 9 : 12;
  return (
    <g>
      {xs.map((x, i) => {
        const y = eyes === 3 && i === 1 ? fy - 8 : fy;
        if (silhouette)
          return (
            <motion.ellipse key={i} cx={x} cy={y} rx={r * 0.8} ry={r * 0.45} fill="#FF3B5C" animate={loop ? { opacity: [0.6, 1, 0.6] } : undefined} transition={{ duration: 1.6, repeat: Infinity }} />
          );
        if (hurt)
          return (
            <path key={i} d={`M${x - r * 0.6} ${y - r * 0.6} L${x + r * 0.6} ${y + r * 0.6} M${x + r * 0.6} ${y - r * 0.6} L${x - r * 0.6} ${y + r * 0.6}`} stroke="#1A1D3A" strokeWidth="4" strokeLinecap="round" />
          );
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={r} fill={url("sclera")} stroke="#1A1D3A" strokeOpacity="0.25" strokeWidth="2" />
            <circle cx={x + r * 0.25} cy={y + r * 0.15} r={r * 0.5} fill="#1A1D3A" />
            <circle cx={x + r * 0.4} cy={y - r * 0.05} r={r * 0.18} fill="#FFFFFF" />
          </g>
        );
      })}
      {!silhouette && !hurt && (
        <path d={`M${xs[0] - r} ${fy - r - 6} L${xs[0] + r * 0.6} ${fy - r + 1} M${xs[xs.length - 1] + r} ${fy - r - 6} L${xs[xs.length - 1] - r * 0.6} ${fy - r + 1}`} stroke="#1A1D3A" strokeWidth="5" strokeLinecap="round" />
      )}
      {!silhouette && (
        hurt ? (
          <ellipse cx={fx} cy={fy + 28} rx="9" ry="7" fill="#2A1B33" />
        ) : (
          <g>
            <path d={`M${fx - 18} ${fy + 22} Q${fx} ${fy + 38} ${fx + 18} ${fy + 22} Z`} fill="#2A1B33" />
            <path d={`M${fx - 12} ${fy + 24} l4 8 l4 -7 Z M${fx + 12} ${fy + 24} l-4 8 l-4 -7 Z`} fill="#FFFFFF" />
          </g>
        )
      )}
    </g>
  );
}

function Crown({ x, y, silhouette }: { x: number; y: number; silhouette: boolean }) {
  return (
    <path
      d={`M${x - 28} ${y + 4} L${x - 22} ${y - 22} L${x - 9} ${y - 6} L${x} ${y - 28} L${x + 9} ${y - 6} L${x + 22} ${y - 22} L${x + 28} ${y + 4} Z`}
      fill={silhouette ? "#2A0F1A" : "#FFC83D"}
      stroke={silhouette ? "#FF3B5C" : "#B97F00"}
      strokeWidth="3"
      strokeLinejoin="round"
    />
  );
}

function Sign({ x, y, text, url }: { x: number; y: number; text: string; url: (s: string) => string }) {
  const w = Math.max(44, text.length * 7.4 + 16);
  return (
    <g transform={`rotate(-6 ${x} ${y})`}>
      <rect x={x + w / 2 - 3} y={y + 20} width="6" height="22" rx="3" fill="#8E6538" />
      <rect x={x} y={y} width={w} height="24" rx="6" fill={url("plank")} stroke="#8E6538" strokeWidth="2.5" />
      <text x={x + w / 2} y={y + 16.5} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontWeight="800" fontSize="12" fill="#5A3A18">
        {text}
      </text>
    </g>
  );
}
