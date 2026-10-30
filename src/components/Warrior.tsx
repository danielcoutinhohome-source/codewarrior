"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";

type Props = {
  armor?: string;
  energy?: string;
  eye?: string;
  size?: number; // rendered width in px; height keeps the 200x240 ratio
  idle?: boolean; // hover and blink loops
  className?: string;
};

function mix(hex: string, f: number, toWhite: boolean) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (toWhite ? v + (255 - v) * f : v * f));
  return "#" + ch.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

// The player's avatar: a hovering bot knight with an energy blade and a hex shield.
export default function Warrior({ armor = "#2D9CDB", energy = "#FF5A5F", eye = "#7DF9FF", size = 200, idle = true, className }: Props) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${s}-${uid}`;
  const light = mix(armor, 0.45, true);
  const deep = mix(armor, 0.5, false);
  const reduce = useReducedMotion();
  const loop = idle && !reduce;

  return (
    <motion.svg
      viewBox="0 0 200 240"
      width={size}
      height={size * 1.2}
      role="img"
      aria-label="Warrior avatar"
      className={className}
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id={id("body")} cx="34%" cy="28%" r="78%">
          <stop offset="0%" stopColor={light} />
          <stop offset="52%" stopColor={armor} />
          <stop offset="100%" stopColor={deep} />
        </radialGradient>
        <radialGradient id={id("hand")} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={deep} />
        </radialGradient>
        <linearGradient id={id("visor")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#262B5C" />
          <stop offset="100%" stopColor="#0A0C22" />
        </linearGradient>
        <radialGradient id={id("glow")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={energy} stopOpacity="0.95" />
          <stop offset="60%" stopColor={energy} stopOpacity="0.35" />
          <stop offset="100%" stopColor={energy} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("blade")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={energy} />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor={energy} />
        </linearGradient>
        <radialGradient id={id("gold")} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFF1B0" />
          <stop offset="50%" stopColor="#FFC83D" />
          <stop offset="100%" stopColor="#B97F00" />
        </radialGradient>
        <filter id={id("blur")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <motion.ellipse
        cx="100" cy="228" rx="50" ry="7" fill="#0B0D24" opacity={0.22}
        animate={loop ? { rx: [50, 42, 50], opacity: [0.22, 0.14, 0.22] } : undefined}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.g
        animate={loop ? { y: [0, -9, 0] } : undefined}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.ellipse
          cx="100" cy="206" rx="30" ry="18" fill={`url(#${id("glow")})`}
          animate={loop ? { opacity: [0.7, 1, 0.7], ry: [16, 20, 16] } : undefined}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
        />
        <path d="M84 176 H116 L110 196 Q100 202 90 196 Z" fill={deep} />
        <rect x="88" y="190" width="24" height="6" rx="3" fill={energy} />

        <ellipse cx="100" cy="146" rx="46" ry="42" fill={`url(#${id("body")})`} />
        <ellipse cx="100" cy="176" rx="34" ry="8" fill="#0B0D24" opacity="0.18" />
        <path d="M66 130 Q100 116 134 130" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="148" r="17" fill="#0E1130" />
        <motion.circle
          cx="100" cy="148" r="16" fill={`url(#${id("glow")})`}
          animate={loop ? { opacity: [0.75, 1, 0.75] } : undefined}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <text x="100" y="152" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFFFFF" fontFamily="JetBrains Mono, monospace">
          {"</>"}
        </text>

        <g transform="rotate(20 160 134)">
          <motion.rect
            x="150" y="30" width="20" height="100" rx="10" fill={energy} filter={`url(#${id("blur")})`}
            animate={loop ? { opacity: [0.4, 0.75, 0.4] } : { opacity: 0.55 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <rect x="154" y="34" width="12" height="94" rx="6" fill={`url(#${id("blade")})`} />
          <rect x="158" y="40" width="4" height="82" rx="2" fill="#FFFFFF" />
          <rect x="146" y="126" width="28" height="9" rx="4.5" fill={`url(#${id("gold")})`} />
          <rect x="155" y="134" width="10" height="15" rx="4" fill="#3B4058" />
        </g>
        <circle cx="163" cy="146" r="13" fill={`url(#${id("hand")})`} />
        <ellipse cx="159" cy="141" rx="4" ry="2.5" fill="#FFFFFF" opacity="0.6" />

        <polygon points="40,118 68,134 68,166 40,182 12,166 12,134" fill={`url(#${id("gold")})`} stroke="#9A6A00" strokeWidth="2" />
        <polygon points="40,128 59,139 59,161 40,172 21,161 21,139" fill={`url(#${id("body")})`} />
        <text x="40" y="155" textAnchor="middle" fontSize="13" fontWeight="800" fill="#FFFFFF" fontFamily="JetBrains Mono, monospace">
          {"</>"}
        </text>
        <circle cx="56" cy="168" r="12" fill={`url(#${id("hand")})`} />

        <path d="M100 2 L114 30 H86 Z" fill={energy} />
        <path d="M100 2 L107 30 H100 Z" fill="#FFFFFF" opacity="0.35" />
        <circle cx="50" cy="66" r="13" fill={`url(#${id("hand")})`} />
        <circle cx="150" cy="66" r="13" fill={`url(#${id("hand")})`} />
        <circle cx="50" cy="66" r="5" fill={energy} />
        <circle cx="150" cy="66" r="5" fill={energy} />
        <rect x="52" y="24" width="96" height="84" rx="40" fill={`url(#${id("body")})`} />
        <ellipse cx="80" cy="38" rx="15" ry="6" transform="rotate(-18 80 38)" fill="#FFFFFF" opacity="0.65" />
        <rect x="63" y="48" width="74" height="42" rx="21" fill={`url(#${id("visor")})`} />
        <path d="M70 56 Q84 50 104 52 L76 84 Q66 76 70 56 Z" fill="#FFFFFF" opacity="0.1" />

        <motion.g
          style={{ originY: "70px", transformBox: "fill-box" }}
          animate={loop ? { scaleY: [1, 1, 0.1, 1, 1] } : undefined}
          transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.9, 0.93, 0.96, 1] }}
        >
          <path d="M76 62 L96 67 L95 76 Q85 78 78 73 Z" fill={eye} filter={`url(#${id("blur")})`} opacity="0.8" />
          <path d="M124 62 L104 67 L105 76 Q115 78 122 73 Z" fill={eye} filter={`url(#${id("blur")})`} opacity="0.8" />
          <path d="M76 62 L96 67 L95 76 Q85 78 78 73 Z" fill={eye} />
          <path d="M124 62 L104 67 L105 76 Q115 78 122 73 Z" fill={eye} />
          <rect x="82" y="68" width="5" height="3" rx="1.5" fill="#FFFFFF" />
          <rect x="110" y="68" width="5" height="3" rx="1.5" fill="#FFFFFF" />
        </motion.g>
      </motion.g>
    </motion.svg>
  );
}
