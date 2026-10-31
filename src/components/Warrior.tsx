"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { darken, lighten } from "@/lib/color";

type Props = {
  armor?: string;
  energy?: string;
  eye?: string;
  finish?: string; // "standard" | "metal" | "circuit"
  aura?: string; // "none" | "ember" | "frost" | "storm" | "royal"
  facing?: "front" | "back";
  size?: number; // width in px; height keeps the 200x240 ratio
  idle?: boolean; // hover, blink and glow loops
  hurt?: boolean; // eyes squeeze shut
  className?: string;
};

const loopT = (duration: number, extra: object = {}) => ({ duration, repeat: Infinity, ease: "easeInOut" as const, ...extra });

// The player's avatar: a hovering bot knight with an energy blade and a hex shield.
export default function Warrior({
  armor = "#2D9CDB",
  energy = "#FF5A5F",
  eye = "#7DF9FF",
  finish = "standard",
  aura = "none",
  facing = "front",
  size = 200,
  idle = true,
  hurt = false,
  className,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${s}-${uid}`;
  const url = (s: string) => `url(#${id(s)})`;
  const light = lighten(armor, 0.45);
  const deep = darken(armor, 0.5);
  const reduce = useReducedMotion();
  const loop = idle && !reduce;
  const back = facing === "back";

  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} role="img" aria-label="Warrior avatar" className={className} style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={id("body")} cx={back ? "60%" : "34%"} cy="28%" r="78%">
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
        <filter id={id("soft")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      <Aura kind={aura} loop={loop} id={id} />

      <motion.ellipse
        cx="100" cy="228" rx="50" ry="7" fill="#0B0D24" opacity={0.22}
        animate={loop ? { rx: [50, 42, 50], opacity: [0.22, 0.14, 0.22] } : undefined}
        transition={loopT(2.6)}
      />

      <motion.g animate={loop ? { y: [0, -9, 0] } : undefined} transition={loopT(2.6)}>
        {/* thruster flame */}
        <motion.ellipse cx="100" cy="206" rx="30" ry="18" fill={url("glow")} animate={loop ? { opacity: [0.7, 1, 0.7], ry: [16, 20, 16] } : undefined} transition={loopT(0.9)} />
        <path d="M84 176 H116 L110 196 Q100 202 90 196 Z" fill={deep} />
        <rect x="88" y="190" width="24" height="6" rx="3" fill={energy} />

        {back ? (
          <BackView energy={energy} deep={deep} url={url} loop={loop} finish={finish} id={id} />
        ) : (
          <FrontView energy={energy} deep={deep} url={url} loop={loop} finish={finish} eye={eye} hurt={hurt} id={id} />
        )}
      </motion.g>
    </svg>
  );
}

type ViewProps = { energy: string; deep: string; url: (s: string) => string; loop: boolean; finish: string; id: (s: string) => string };

function Blade({ url, energy, loop, id }: { url: ViewProps["url"]; energy: string; loop: boolean; id: ViewProps["id"] }) {
  return (
    <g transform="rotate(20 160 134)">
      <motion.rect x="150" y="30" width="20" height="100" rx="10" fill={energy} filter={`url(#${id("blur")})`} animate={loop ? { opacity: [0.4, 0.8, 0.4] } : { opacity: 0.55 }} transition={loopT(1.4)} />
      <rect x="154" y="34" width="12" height="94" rx="6" fill={url("blade")} />
      <rect x="158" y="40" width="4" height="82" rx="2" fill="#FFFFFF" />
      <rect x="146" y="126" width="28" height="9" rx="4.5" fill={url("gold")} />
      <rect x="155" y="134" width="10" height="15" rx="4" fill="#3B4058" />
    </g>
  );
}

function Finish({ kind, energy, id, back }: { kind: string; energy: string; id: ViewProps["id"]; back?: boolean }) {
  if (kind === "metal")
    return (
      <g pointerEvents="none">
        <path d={back ? "M118 116 L128 108 L136 150 L126 160 Z" : "M70 118 L80 110 L88 152 L78 162 Z"} fill="#FFFFFF" opacity="0.32" />
        <path d={back ? "M120 30 L130 30 L138 100 L128 100 Z" : "M66 34 L74 30 L80 98 L72 100 Z"} fill="#FFFFFF" opacity="0.28" />
        <ellipse cx={back ? 128 : 74} cy="132" rx="5" ry="14" fill="#FFFFFF" opacity="0.4" />
      </g>
    );
  if (kind === "circuit")
    return (
      <g pointerEvents="none" fill="none" stroke={energy} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <g filter={`url(#${id("soft")})`} opacity="0.9">
          <path d="M62 140 H74 L80 132 H88 M138 140 H126 L120 150 H112 M76 168 L86 160 H98 M124 166 L116 160" />
          <path d="M56 50 H64 L68 44 M144 50 H136 L132 44" />
        </g>
        <path d="M62 140 H74 L80 132 H88 M138 140 H126 L120 150 H112 M76 168 L86 160 H98 M124 166 L116 160" />
        <path d="M56 50 H64 L68 44 M144 50 H136 L132 44" />
        <circle cx="88" cy="132" r="2.2" fill={energy} />
        <circle cx="112" cy="150" r="2.2" fill={energy} />
        <circle cx="98" cy="160" r="2.2" fill={energy} />
      </g>
    );
  return null;
}

function FrontView({ energy, deep, url, loop, finish, eye, hurt, id }: ViewProps & { eye: string; hurt: boolean }) {
  return (
    <>
      <ellipse cx="100" cy="146" rx="46" ry="42" fill={url("body")} />
      <ellipse cx="100" cy="176" rx="34" ry="8" fill="#0B0D24" opacity="0.18" />
      <path d="M66 130 Q100 116 134 130" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
      <Finish kind={finish} energy={energy} id={id} />
      <circle cx="100" cy="148" r="17" fill="#0E1130" />
      <motion.circle cx="100" cy="148" r="16" fill={url("glow")} animate={loop ? { opacity: [0.75, 1, 0.75] } : undefined} transition={loopT(1.8)} />
      <text x="100" y="152" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFFFFF" fontFamily="JetBrains Mono, monospace">{"</>"}</text>

      <Blade url={url} energy={energy} loop={loop} id={id} />
      <circle cx="163" cy="146" r="13" fill={url("hand")} />
      <ellipse cx="159" cy="141" rx="4" ry="2.5" fill="#FFFFFF" opacity="0.6" />

      <polygon points="40,118 68,134 68,166 40,182 12,166 12,134" fill={url("gold")} stroke="#9A6A00" strokeWidth="2" />
      <polygon points="40,128 59,139 59,161 40,172 21,161 21,139" fill={url("body")} />
      <text x="40" y="155" textAnchor="middle" fontSize="13" fontWeight="800" fill="#FFFFFF" fontFamily="JetBrains Mono, monospace">{"</>"}</text>
      <circle cx="56" cy="168" r="12" fill={url("hand")} />

      <path d="M100 2 L114 30 H86 Z" fill={energy} />
      <path d="M100 2 L107 30 H100 Z" fill="#FFFFFF" opacity="0.35" />
      <circle cx="50" cy="66" r="13" fill={url("hand")} />
      <circle cx="150" cy="66" r="13" fill={url("hand")} />
      <circle cx="50" cy="66" r="5" fill={energy} />
      <circle cx="150" cy="66" r="5" fill={energy} />
      <rect x="52" y="24" width="96" height="84" rx="40" fill={url("body")} />
      <ellipse cx="80" cy="38" rx="15" ry="6" transform="rotate(-18 80 38)" fill="#FFFFFF" opacity="0.65" />
      <rect x="63" y="48" width="74" height="42" rx="21" fill={url("visor")} />
      <path d="M70 56 Q84 50 104 52 L76 84 Q66 76 70 56 Z" fill="#FFFFFF" opacity="0.1" />

      {hurt ? (
        <g stroke={eye} strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M78 64 L92 74 M92 64 L78 74" />
          <path d="M108 64 L122 74 M122 64 L108 74" />
        </g>
      ) : (
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
      )}
    </>
  );
}

// Seen from behind, for the first-person world view.
function BackView({ energy, deep, url, loop, finish, id }: ViewProps) {
  return (
    <>
      {/* shield on the left arm, seen from the back */}
      <polygon points="40,118 68,134 68,166 40,182 12,166 12,134" fill="#9A6A00" />
      <polygon points="40,124 63,137 63,163 40,176 17,163 17,137" fill={url("gold")} opacity="0.75" />
      <rect x="30" y="140" width="20" height="6" rx="3" fill="#5C3F00" />
      <rect x="30" y="154" width="20" height="6" rx="3" fill="#5C3F00" />

      <ellipse cx="100" cy="146" rx="46" ry="42" fill={url("body")} />
      <ellipse cx="100" cy="176" rx="34" ry="8" fill="#0B0D24" opacity="0.2" />
      <Finish kind={finish} energy={energy} id={id} back />
      {/* jet pack */}
      <rect x="76" y="122" width="48" height="48" rx="14" fill={deep} />
      <rect x="82" y="128" width="36" height="8" rx="4" fill="#0E1130" opacity="0.6" />
      <rect x="82" y="140" width="36" height="8" rx="4" fill="#0E1130" opacity="0.6" />
      <circle cx="88" cy="162" r="6" fill="#0E1130" />
      <circle cx="112" cy="162" r="6" fill="#0E1130" />
      <motion.circle cx="88" cy="162" r="4" fill={energy} animate={loop ? { opacity: [0.6, 1, 0.6] } : undefined} transition={loopT(0.6)} />
      <motion.circle cx="112" cy="162" r="4" fill={energy} animate={loop ? { opacity: [1, 0.6, 1] } : undefined} transition={loopT(0.6)} />

      <Blade url={url} energy={energy} loop={loop} id={id} />
      <circle cx="160" cy="146" r="13" fill={url("hand")} />

      <path d="M100 2 L114 30 H86 Z" fill={energy} />
      <path d="M100 2 L93 30 H100 Z" fill="#FFFFFF" opacity="0.3" />
      <circle cx="50" cy="66" r="13" fill={url("hand")} />
      <circle cx="150" cy="66" r="13" fill={url("hand")} />
      <rect x="52" y="24" width="96" height="84" rx="40" fill={url("body")} />
      <ellipse cx="122" cy="38" rx="15" ry="6" transform="rotate(18 122 38)" fill="#FFFFFF" opacity="0.55" />
      {/* helmet vents */}
      <rect x="96" y="28" width="8" height="58" rx="4" fill={deep} opacity="0.7" />
      <g stroke="#0E1130" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round">
        <path d="M74 70 H88 M74 78 H88 M112 70 H126 M112 78 H126" />
      </g>
    </>
  );
}

function Aura({ kind, loop, id }: { kind: string; loop: boolean; id: (s: string) => string }) {
  if (!kind || kind === "none") return null;
  const palette: Record<string, [string, string]> = {
    ember: ["#FF8A00", "#FFD166"],
    frost: ["#7FD6FF", "#FFFFFF"],
    storm: ["#8B5CF6", "#7DF9FF"],
    royal: ["#FFC83D", "#FFF3B0"],
  };
  const [a, b] = palette[kind] || palette.ember;
  const motes = [30, 60, 140, 170, 50, 150];
  return (
    <g pointerEvents="none">
      <motion.ellipse cx="100" cy="222" rx="80" ry="16" fill={a} opacity={0.35} filter={`url(#${id("blur")})`} animate={loop ? { opacity: [0.25, 0.5, 0.25] } : undefined} transition={loopT(2)} />
      {kind === "storm" && (
        <>
          <motion.ellipse cx="100" cy="222" rx="74" ry="14" fill="none" stroke={b} strokeWidth="2.5" strokeDasharray="10 8" animate={loop ? { strokeDashoffset: [0, -36] } : undefined} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          {[[38, 150], [164, 110]].map(([x, y], i) => (
            <motion.path key={i} d={`M${x} ${y} l-8 14 h8 l-6 16`} fill="none" stroke={b} strokeWidth="3" strokeLinejoin="round" animate={loop ? { opacity: [0, 1, 0, 0, 1, 0] } : { opacity: 0.6 }} transition={{ duration: 1.6 + i * 0.5, repeat: Infinity }} />
          ))}
        </>
      )}
      {kind === "royal" && (
        <motion.ellipse cx="100" cy="-6" rx="36" ry="8" fill="none" stroke={a} strokeWidth="5" animate={loop ? { cy: [-6, -10, -6], opacity: [0.8, 1, 0.8] } : undefined} transition={loopT(2.6)} />
      )}
      {(kind === "ember" || kind === "frost" || kind === "royal") &&
        motes.map((x, i) => (
          <motion.circle
            key={i}
            cx={x}
            r={kind === "frost" ? 3 : 2.5}
            fill={i % 2 ? a : b}
            initial={{ cy: kind === "frost" ? 40 : 220, opacity: 0 }}
            animate={loop ? (kind === "frost" ? { cy: [40, 220], opacity: [0, 1, 0] } : { cy: [220, 60], opacity: [0, 1, 0] }) : { cy: 140, opacity: 0.6 }}
            transition={{ duration: 2.4 + (i % 3) * 0.5, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
          />
        ))}
    </g>
  );
}
