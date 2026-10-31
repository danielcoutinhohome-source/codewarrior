"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId, type ReactNode } from "react";
import { RAINBOW_STOPS, darken, lighten, solid } from "@/lib/color";

type Props = {
  body?: string; // "bot" | "titan" | "valkyrie"
  armor?: string; // hex, "gold" or "rainbow"
  energy?: string; // hex, "gold" or "rainbow"
  eye?: string;
  finish?: string; // "standard" | "metal" | "circuit"
  aura?: string; // "none" | "ember" | "frost" | "storm" | "royal" | "halo-*"
  facing?: "front" | "back";
  size?: number; // width in px; height keeps the 200x240 ratio
  idle?: boolean; // hover, blink and glow loops
  hurt?: boolean; // eyes squeeze shut
  className?: string;
};

const loopT = (duration: number, extra: object = {}) => ({ duration, repeat: Infinity, ease: "easeInOut" as const, ...extra });

const GOLD_STOPS = ["#FFF6C8", "#FFD65C", "#E5A50A", "#9A6A00"];

// Aura palettes: [main, light]. Halo auras also get wings.
export const AURA_COLORS: Record<string, [string, string]> = {
  ember: ["#FF7A00", "#FFD166"],
  frost: ["#4CC3FF", "#FFFFFF"],
  storm: ["#8B5CF6", "#7DF9FF"],
  royal: ["#FFC83D", "#FFF3B0"],
  "halo-cyan": ["#22D3EE", "#D5FBFF"],
  "halo-pink": ["#FF5DA2", "#FFE0EE"],
  "halo-violet": ["#9B5CFF", "#EBDFFF"],
  "halo-white": ["#BFD4FF", "#FFFFFF"],
};
export const hasWings = (aura?: string) => aura === "royal" || !!aura?.startsWith("halo-");

type Shape = { torso: ReactNode; helmet: ReactNode };

// Torso and helmet outlines per body type, filled with the given paint.
function shapes(body: string, fill: string): Shape {
  if (body === "titan")
    return {
      torso: <rect x="50" y="104" width="100" height="84" rx="24" fill={fill} />,
      helmet: <rect x="50" y="22" width="100" height="86" rx="30" fill={fill} />,
    };
  if (body === "valkyrie")
    return {
      torso: <path d="M100 100 C108 100 112 104 116 112 L148 176 C152 186 146 192 136 192 H64 C54 192 48 186 52 176 L84 112 C88 104 92 100 100 100 Z" fill={fill} />,
      helmet: <rect x="56" y="26" width="88" height="80" rx="40" fill={fill} />,
    };
  return {
    torso: <ellipse cx="100" cy="146" rx="46" ry="42" fill={fill} />,
    helmet: <rect x="52" y="24" width="96" height="84" rx="40" fill={fill} />,
  };
}

// The player's avatar: a hovering bot knight with an energy blade and a hex shield.
export default function Warrior({
  body = "bot",
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
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (s: string) => `${s}-${uid}`;
  const url = (s: string) => `url(#${id(s)})`;
  const reduce = useReducedMotion();
  const loop = idle && !reduce;
  const back = facing === "back";
  const b = body === "titan" || body === "valkyrie" ? body : "bot";

  const gold = armor === "gold";
  const rainbow = armor === "rainbow";
  const base = solid(armor);
  const light = gold ? "#FFF6C8" : rainbow ? "#FFFFFF" : lighten(base, 0.45);
  const deep = gold ? "#8A5E00" : rainbow ? "#3B2A6B" : darken(base, 0.5);
  const enS = solid(energy);
  const en = energy === "rainbow" ? url("ebow") : energy === "gold" ? url("egold") : energy;
  const special = energy === "rainbow" || energy === "gold";
  const halo = hasWings(aura);
  const [auraA, auraB] = AURA_COLORS[aura] || ["#FFFFFF", "#FFFFFF"];

  const v = { b, en, enS, deep, url, id, loop, finish, back, gold };

  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} role="img" aria-label="Warrior avatar" className={className} style={{ overflow: "visible" }}>
      <defs>
        {rainbow ? (
          <linearGradient id={id("body")} x1="0" y1="0" x2="1" y2="1">
            {RAINBOW_STOPS.map((c, i) => <stop key={i} offset={`${(i / (RAINBOW_STOPS.length - 1)) * 100}%`} stopColor={c} />)}
            {loop && <animateTransform attributeName="gradientTransform" type="rotate" values="0 .5 .5;360 .5 .5" dur="6s" repeatCount="indefinite" />}
          </linearGradient>
        ) : gold ? (
          <radialGradient id={id("body")} cx={back ? "62%" : "32%"} cy="26%" r="80%">
            {GOLD_STOPS.map((c, i) => <stop key={i} offset={`${[0, 35, 70, 100][i]}%`} stopColor={c} />)}
          </radialGradient>
        ) : (
          <radialGradient id={id("body")} cx={back ? "60%" : "34%"} cy="28%" r="78%">
            <stop offset="0%" stopColor={light} />
            <stop offset="52%" stopColor={base} />
            <stop offset="100%" stopColor={deep} />
          </radialGradient>
        )}
        {/* soft 3D shading laid over special paints */}
        <radialGradient id={id("shade")} cx={back ? "64%" : "32%"} cy="26%" r="85%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#0B0D24" stopOpacity="0.4" />
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
          <stop offset="0%" stopColor={enS} stopOpacity="0.95" />
          <stop offset="60%" stopColor={enS} stopOpacity="0.35" />
          <stop offset="100%" stopColor={enS} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("bglow")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={enS} stopOpacity="0" />
          <stop offset="50%" stopColor={enS} stopOpacity="0.85" />
          <stop offset="100%" stopColor={enS} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id("blade")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={enS} />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor={enS} />
        </linearGradient>
        <linearGradient id={id("ebow")} x1="0" y1="0" x2="0" y2="1">
          {RAINBOW_STOPS.map((c, i) => <stop key={i} offset={`${(i / (RAINBOW_STOPS.length - 1)) * 100}%`} stopColor={c} />)}
        </linearGradient>
        <linearGradient id={id("egold")} x1="0" y1="0" x2="1" y2="1">
          {GOLD_STOPS.map((c, i) => <stop key={i} offset={`${[0, 35, 70, 100][i]}%`} stopColor={c} />)}
        </linearGradient>
        <radialGradient id={id("gold")} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFF1B0" />
          <stop offset="50%" stopColor="#FFC83D" />
          <stop offset="100%" stopColor="#B97F00" />
        </radialGradient>
        <linearGradient id={id("hair")} x1="0" y1="0" x2="0" y2="1">
          {(energy === "rainbow" ? RAINBOW_STOPS : energy === "gold" ? GOLD_STOPS : [lighten(enS, 0.4), enS, darken(enS, 0.45)]).map((c, i, a) => (
            <stop key={i} offset={`${(i / (a.length - 1)) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
        <linearGradient id={id("wing")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor={auraB} />
          <stop offset="100%" stopColor={auraA} />
        </linearGradient>
        <radialGradient id={id("aura")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={auraA} stopOpacity="0.9" />
          <stop offset="50%" stopColor={auraA} stopOpacity="0.45" />
          <stop offset="100%" stopColor={auraA} stopOpacity="0" />
        </radialGradient>
        <clipPath id={id("shell")}>
          {shapes(b, "#000").torso}
          {shapes(b, "#000").helmet}
        </clipPath>
        <filter id={id("blur")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id={id("soft")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      <Aura kind={aura} loop={loop} url={url} a={auraA} c={auraB} layer="back" />

      <motion.ellipse
        cx="100" cy="228" rx="50" ry="7" fill="#0B0D24" opacity={0.22}
        animate={loop ? { rx: [50, 42, 50], opacity: [0.22, 0.14, 0.22] } : undefined}
        transition={loopT(2.6)}
      />

      <motion.g animate={loop ? { y: [0, -9, 0] } : undefined} transition={loopT(2.6)}>
        {/* thruster flame */}
        <g transform={`translate(0 ${b === "titan" ? 10 : b === "valkyrie" ? 14 : 0})`}>
          <motion.ellipse cx="100" cy="206" rx="30" ry="18" fill={url("glow")} animate={loop ? { opacity: [0.7, 1, 0.7], ry: [16, 20, 16] } : undefined} transition={loopT(0.9)} />
          <path d="M84 176 H116 L110 196 Q100 202 90 196 Z" fill={deep} />
          <rect x="88" y="190" width="24" height="6" rx="3" fill={en} />
        </g>

        {halo && !back && <Wings url={url} loop={loop} stroke={auraA} />}
        {back ? <BackView {...v} special={special} halo={halo} /> : <FrontView {...v} special={special} eye={eye} hurt={hurt} />}
        {halo && <Halo a={auraA} c={auraB} loop={loop} y={b === "valkyrie" ? 4 : 0} />}
      </motion.g>
      <Aura kind={aura} loop={loop} url={url} a={auraA} c={auraB} layer="front" />
    </svg>
  );
}

type ViewProps = {
  b: string;
  en: string;
  enS: string;
  deep: string;
  url: (s: string) => string;
  id: (s: string) => string;
  loop: boolean;
  finish: string;
  back: boolean;
  special: boolean;
  gold: boolean;
};

// Torso and helmet with the special-paint shading on top.
function Shell({ b, url, part }: { b: string; url: ViewProps["url"]; part: "torso" | "helmet" }) {
  return (
    <>
      {shapes(b, url("body"))[part]}
      {shapes(b, url("shade"))[part]}
    </>
  );
}

// Energy sword held at the side: the hand grips below the crossguard.
function Sword({ url, en, special, loop }: { url: ViewProps["url"]; en: string; special: boolean; loop: boolean }) {
  return (
    <g transform="rotate(16 160 146)">
      <motion.rect x="146" y="14" width="28" height="118" rx="14" fill={url("bglow")} animate={loop ? { opacity: [0.45, 0.95, 0.45] } : { opacity: 0.6 }} transition={loopT(1.4)} />
      <path d="M153 128 V42 L160 16 L167 42 V128 Z" fill={special ? en : url("blade")} />
      <path d="M158.8 124 V44 L160 34 L161.2 44 V124 Z" fill="#FFFFFF" />
      <rect x="155.5" y="130" width="9" height="26" rx="4" fill="#2B2F45" />
      <circle cx="160" cy="160" r="5" fill={url("gold")} stroke="#8A5E00" strokeWidth="1" />
      <circle cx="160" cy="146" r="12" fill={url("hand")} />
      <ellipse cx="156" cy="141" rx="4" ry="2.4" fill="#FFFFFF" opacity="0.55" />
      <path d="M134 129 Q146 119 160 125 Q174 119 186 129 Q174 137 160 133 Q146 137 134 129 Z" fill={url("gold")} stroke="#8A5E00" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="160" cy="129" r="3.8" fill={en} stroke="#FFFFFF" strokeWidth="1" />
    </g>
  );
}

// Hex shield held in front of the hand.
function Shield({ url, en, front }: { url: ViewProps["url"]; en: string; front: boolean }) {
  const outer = "44,119 71,134.5 71,165.5 44,181 17,165.5 17,134.5";
  const inner = "44,128 63,139 63,161 44,172 25,161 25,139";
  if (!front)
    return (
      <>
        <polygon points={outer} fill="#7A5300" />
        <polygon points="44,124 66,137 66,163 44,176 22,163 22,137" fill={url("gold")} opacity="0.7" />
        <rect x="32" y="140" width="24" height="6" rx="3" fill="#4A3300" />
        <rect x="32" y="156" width="24" height="6" rx="3" fill="#4A3300" />
        <circle cx="46" cy="151" r="11" fill={url("hand")} />
        <ellipse cx="49" cy="146" rx="3.5" ry="2" fill="#FFFFFF" opacity="0.45" />
      </>
    );
  return (
    <>
      <circle cx="62" cy="156" r="12" fill={url("hand")} />
      <polygon points={outer} fill={url("gold")} stroke="#8A5E00" strokeWidth="2" strokeLinejoin="round" />
      <polygon points={inner} fill={url("body")} />
      <polygon points={inner} fill={url("shade")} />
      <polygon points={inner} fill="none" stroke={en} strokeWidth="2" strokeOpacity="0.9" />
      <path d="M28 135 L44 126 L52 130" fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" />
      <text x="44" y="155" textAnchor="middle" fontSize="13" fontWeight="800" fill="#FFFFFF" fontFamily="JetBrains Mono, monospace">{"{ }"}</text>
    </>
  );
}

function Finish({ kind, en, id, back }: { kind: string; en: string; id: ViewProps["id"]; back?: boolean }) {
  if (kind === "metal")
    return (
      <g pointerEvents="none" clipPath={`url(#${id("shell")})`}>
        <path d={back ? "M118 116 L128 108 L136 150 L126 160 Z" : "M70 118 L80 110 L88 152 L78 162 Z"} fill="#FFFFFF" opacity="0.32" />
        <path d={back ? "M120 30 L130 30 L138 100 L128 100 Z" : "M66 34 L74 30 L80 98 L72 100 Z"} fill="#FFFFFF" opacity="0.28" />
        <ellipse cx={back ? 128 : 74} cy="132" rx="5" ry="14" fill="#FFFFFF" opacity="0.4" />
      </g>
    );
  if (kind === "circuit")
    return (
      <g pointerEvents="none" fill="none" stroke={en} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" clipPath={`url(#${id("shell")})`}>
        <g filter={`url(#${id("soft")})`} opacity="0.9">
          <path d="M62 140 H74 L80 132 H88 M138 140 H126 L120 150 H112 M76 168 L86 160 H98 M124 166 L116 160" />
          <path d="M56 50 H64 L68 44 M144 50 H136 L132 44" />
        </g>
        <path d="M62 140 H74 L80 132 H88 M138 140 H126 L120 150 H112 M76 168 L86 160 H98 M124 166 L116 160" />
        <path d="M56 50 H64 L68 44 M144 50 H136 L132 44" />
        <circle cx="88" cy="132" r="2.2" fill={en} />
        <circle cx="112" cy="150" r="2.2" fill={en} />
        <circle cx="98" cy="160" r="2.2" fill={en} />
      </g>
    );
  return null;
}

// Gold armor gets a light sweep across it.
function Sheen({ id, loop }: { id: ViewProps["id"]; loop: boolean }) {
  if (!loop) return null;
  return (
    <g clipPath={`url(#${id("shell")})`} pointerEvents="none">
      <motion.rect x="0" y="0" width="22" height="240" fill="#FFFFFF" opacity="0.45" transform="skewX(-20)" animate={{ x: [-60, 260] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }} />
    </g>
  );
}

// Long flowing hair for the Valkyrie: the part behind the body.
function HairBack({ url }: { url: ViewProps["url"] }) {
  return (
    <g>
      <path d="M58 52 Q38 110 46 172 Q58 182 70 168 Q62 128 74 94 Z" fill={url("hair")} />
      <path d="M142 52 Q162 110 154 172 Q142 182 130 168 Q138 128 126 94 Z" fill={url("hair")} />
      <path d="M52 100 Q50 140 56 166 M148 100 Q150 140 144 166" stroke="#0B0D24" strokeOpacity="0.18" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}
// Swept bangs over the top of the helmet.
function Fringe({ url, en }: { url: ViewProps["url"]; en: string }) {
  return (
    <g>
      <path d="M54 62 Q52 20 100 18 Q148 20 146 62 Q138 44 124 46 Q116 32 102 42 Q88 30 76 46 Q62 44 54 62 Z" fill={url("hair")} />
      <path d="M70 34 Q86 24 104 26" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M120 20 L128 12 L136 20 L128 28 Z" fill={en} stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  );
}

function FrontView({ b, en, deep, url, id, loop, finish, special, gold, eye, hurt }: ViewProps & { eye: string; hurt: boolean }) {
  const core = b === "valkyrie" ? { y: 140, r: 13 } : { y: b === "titan" ? 146 : 148, r: 16 };
  return (
    <>
      {b === "valkyrie" && <HairBack url={url} />}
      <Shell b={b} url={url} part="torso" />
      {b === "titan" ? (
        <>
          <ellipse cx="100" cy="186" rx="40" ry="6" fill="#0B0D24" opacity="0.18" />
          <path d="M62 116 Q100 106 138 116" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
          <rect x="70" y="164" width="60" height="8" rx="4" fill={deep} opacity="0.6" />
        </>
      ) : b === "valkyrie" ? (
        <>
          <path d="M90 112 Q100 106 110 112" fill="none" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
          <rect x="64" y="163" width="72" height="7" rx="3.5" fill={deep} />
          <circle cx="100" cy="166.5" r="4.5" fill={en} stroke="#FFFFFF" strokeWidth="1.2" />
        </>
      ) : (
        <>
          <ellipse cx="100" cy="176" rx="34" ry="8" fill="#0B0D24" opacity="0.18" />
          <path d="M66 130 Q100 116 134 130" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      <Finish kind={finish} en={en} id={id} />
      <circle cx="100" cy={core.y} r={core.r + 1} fill="#0E1130" />
      <motion.circle cx="100" cy={core.y} r={core.r} fill={url("glow")} animate={loop ? { opacity: [0.75, 1, 0.75] } : undefined} transition={loopT(1.8)} />
      <text x="100" y={core.y + 4} textAnchor="middle" fontSize={core.r < 15 ? 9 : 11} fontWeight="800" fill="#FFFFFF" fontFamily="JetBrains Mono, monospace">{"</>"}</text>

      {b === "titan" && (
        <>
          <rect x="32" y="98" width="38" height="28" rx="13" fill={url("body")} />
          <rect x="32" y="98" width="38" height="28" rx="13" fill={url("shade")} />
          <rect x="130" y="98" width="38" height="28" rx="13" fill={url("body")} />
          <rect x="130" y="98" width="38" height="28" rx="13" fill={url("shade")} />
          <rect x="40" y="104" width="22" height="5" rx="2.5" fill={en} />
          <rect x="138" y="104" width="22" height="5" rx="2.5" fill={en} />
        </>
      )}

      <Sword url={url} en={en} special={special} loop={loop} />
      <Shield url={url} en={en} front />

      {b !== "valkyrie" && (
        <>
          <path d="M100 2 L114 30 H86 Z" fill={en} />
          <path d="M100 2 L107 30 H100 Z" fill="#FFFFFF" opacity="0.35" />
        </>
      )}
      {b === "titan" ? (
        <>
          <rect x="38" y="50" width="16" height="34" rx="7" fill={url("hand")} />
          <rect x="146" y="50" width="16" height="34" rx="7" fill={url("hand")} />
          <rect x="43" y="58" width="6" height="18" rx="3" fill={en} />
          <rect x="151" y="58" width="6" height="18" rx="3" fill={en} />
        </>
      ) : (
        <>
          <circle cx={b === "valkyrie" ? 56 : 50} cy="66" r={b === "valkyrie" ? 10 : 13} fill={url("hand")} />
          <circle cx={b === "valkyrie" ? 144 : 150} cy="66" r={b === "valkyrie" ? 10 : 13} fill={url("hand")} />
          <circle cx={b === "valkyrie" ? 56 : 50} cy="66" r={b === "valkyrie" ? 4 : 5} fill={en} />
          <circle cx={b === "valkyrie" ? 144 : 150} cy="66" r={b === "valkyrie" ? 4 : 5} fill={en} />
        </>
      )}
      <Shell b={b} url={url} part="helmet" />
      <ellipse cx="80" cy="38" rx="15" ry="6" transform="rotate(-18 80 38)" fill="#FFFFFF" opacity="0.65" />
      <rect x="63" y="48" width="74" height="42" rx={b === "titan" ? 16 : 21} fill={url("visor")} />
      <path d="M70 56 Q84 50 104 52 L76 84 Q66 76 70 56 Z" fill="#FFFFFF" opacity="0.1" />
      {b === "valkyrie" && <Fringe url={url} en={en} />}
      {gold && <Sheen id={id} loop={loop} />}

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
          {b === "valkyrie" && <path d="M77 62 L70 56 M77 64 L69 61 M123 62 L130 56 M123 64 L131 61" stroke={eye} strokeWidth="2.2" strokeLinecap="round" />}
        </motion.g>
      )}
    </>
  );
}

// Seen from behind, for the first-person world view.
function BackView({ b, en, deep, url, id, loop, finish, special, gold, halo }: ViewProps & { halo: boolean }) {
  const pack = b === "valkyrie" ? { y: 118, h: 40 } : b === "titan" ? { y: 120, h: 52 } : { y: 122, h: 48 };
  return (
    <>
      <Shield url={url} en={en} front={false} />

      <Shell b={b} url={url} part="torso" />
      <ellipse cx="100" cy={b === "titan" ? 184 : 176} rx="34" ry="8" fill="#0B0D24" opacity="0.2" />
      <Finish kind={finish} en={en} id={id} back />
      {b === "titan" && (
        <>
          <rect x="32" y="98" width="38" height="28" rx="13" fill={url("body")} />
          <rect x="130" y="98" width="38" height="28" rx="13" fill={url("body")} />
        </>
      )}
      {/* jet pack */}
      <rect x="76" y={pack.y} width="48" height={pack.h} rx="14" fill={deep} />
      <rect x="82" y={pack.y + 6} width="36" height="8" rx="4" fill="#0E1130" opacity="0.6" />
      <rect x="82" y={pack.y + 18} width="36" height="8" rx="4" fill="#0E1130" opacity="0.6" />
      <circle cx="88" cy={pack.y + pack.h - 8} r="6" fill="#0E1130" />
      <circle cx="112" cy={pack.y + pack.h - 8} r="6" fill="#0E1130" />
      <motion.circle cx="88" cy={pack.y + pack.h - 8} r="4" fill={en} animate={loop ? { opacity: [0.6, 1, 0.6] } : undefined} transition={loopT(0.6)} />
      <motion.circle cx="112" cy={pack.y + pack.h - 8} r="4" fill={en} animate={loop ? { opacity: [1, 0.6, 1] } : undefined} transition={loopT(0.6)} />

      {halo && <Wings url={url} loop={loop} stroke="none" back />}
      <Sword url={url} en={en} special={special} loop={loop} />

      {b !== "valkyrie" && (
        <>
          <path d="M100 2 L114 30 H86 Z" fill={en} />
          <path d="M100 2 L93 30 H100 Z" fill="#FFFFFF" opacity="0.3" />
        </>
      )}
      {b === "titan" ? (
        <>
          <rect x="38" y="50" width="16" height="34" rx="7" fill={url("hand")} />
          <rect x="146" y="50" width="16" height="34" rx="7" fill={url("hand")} />
        </>
      ) : (
        <>
          <circle cx={b === "valkyrie" ? 56 : 50} cy="66" r={b === "valkyrie" ? 10 : 13} fill={url("hand")} />
          <circle cx={b === "valkyrie" ? 144 : 150} cy="66" r={b === "valkyrie" ? 10 : 13} fill={url("hand")} />
        </>
      )}
      <Shell b={b} url={url} part="helmet" />
      <ellipse cx="122" cy="38" rx="15" ry="6" transform="rotate(18 122 38)" fill="#FFFFFF" opacity="0.55" />
      {gold && <Sheen id={id} loop={loop} />}
      {b === "valkyrie" ? (
        <>
          {/* long hair down the back */}
          <path d="M62 48 Q64 20 100 18 Q136 20 138 48 Q146 100 136 150 Q124 144 116 156 Q108 146 100 160 Q92 146 84 156 Q76 144 64 150 Q54 100 62 48 Z" fill={url("hair")} />
          <path d="M80 40 Q76 90 80 140 M100 30 Q98 90 100 146 M120 40 Q124 90 120 140" stroke="#0B0D24" strokeOpacity="0.16" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M112 26 Q130 30 138 46" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M92 20 L100 12 L108 20 L100 28 Z" fill={en} stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <rect x="96" y="28" width="8" height="58" rx="4" fill={deep} opacity="0.7" />
          <g stroke="#0E1130" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round">
            <path d="M74 70 H88 M74 78 H88 M112 70 H126 M112 78 H126" />
          </g>
        </>
      )}
    </>
  );
}

// Feathered wings for the halo auras. Drawn behind the body from the front, on the back from behind.
function Wings({ url, loop, stroke, back }: { url: ViewProps["url"]; loop: boolean; stroke: string; back?: boolean }) {
  const wing = (
    <>
      <path d="M118 126 C134 96 164 70 198 54 C198 74 192 88 184 98 C194 98 198 102 198 108 C188 118 178 122 170 124 C178 128 182 132 182 138 C166 146 148 146 132 140 Z" fill={url("wing")} stroke={stroke === "none" ? "#FFFFFF" : stroke} strokeOpacity="0.8" strokeWidth="2" strokeLinejoin="round" />
      <path d="M130 128 C148 108 168 90 192 70 M134 134 C154 124 172 114 190 106 M138 138 C152 136 164 134 176 134" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  );
  const flap = (k: number) => ({
    style: { originX: 0.03, originY: 0.8 },
    animate: loop ? { rotate: [0, -10 * k, 0] } : undefined,
    transition: loopT(1.3),
  });
  return (
    <g opacity={back ? 1 : 0.98}>
      <motion.g {...flap(1)}>{wing}</motion.g>
      <g transform="translate(200 0) scale(-1 1)">
        <motion.g {...flap(1)}>{wing}</motion.g>
      </g>
    </g>
  );
}

function Halo({ a, c, loop, y }: { a: string; c: string; loop: boolean; y: number }) {
  return (
    <motion.g animate={loop ? { y: [y, y - 4, y] } : { y }} transition={loopT(2.2)} pointerEvents="none">
      <ellipse cx="100" cy="2" rx="40" ry="10" fill="none" stroke={a} strokeWidth="12" opacity="0.3" />
      <ellipse cx="100" cy="2" rx="36" ry="8" fill="none" stroke={a} strokeWidth="6" />
      <ellipse cx="100" cy="2" rx="36" ry="8" fill="none" stroke={c} strokeWidth="2" />
    </motion.g>
  );
}

const flake = "M0 -6 V6 M-5.2 -3 L5.2 3 M-5.2 3 L5.2 -3";
const sparkle = "M0 -7 L1.6 -1.6 L7 0 L1.6 1.6 L0 7 L-1.6 1.6 L-7 0 L-1.6 -1.6 Z";

// The animated effect around the warrior. Drawn big and bright so it reads at a glance.
function Aura({ kind, loop, url, a, c, layer }: { kind: string; loop: boolean; url: ViewProps["url"]; a: string; c: string; layer: "back" | "front" }) {
  if (!kind || kind === "none" || !AURA_COLORS[kind]) return null;
  const halo = hasWings(kind);
  if (layer === "front") return <AuraFront kind={kind} loop={loop} a={a} c={c} halo={halo} />;
  return (
    <g pointerEvents="none">
      {/* backdrop glow */}
      <motion.ellipse cx="100" cy="128" rx="96" ry="112" fill={url("aura")} animate={loop ? { opacity: [0.7, 1, 0.7], rx: [92, 100, 92] } : { opacity: 0.85 }} transition={loopT(2.2)} />
      {kind === "storm" && <motion.ellipse cx="100" cy="140" rx="84" ry="24" fill="none" stroke={c} strokeWidth="4" strokeDasharray="18 12" opacity="0.6" animate={loop ? { strokeDashoffset: [0, -60] } : undefined} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />}
      {/* ground ring */}
      <ellipse cx="100" cy="226" rx="74" ry="15" fill={a} opacity="0.28" />
      <motion.ellipse cx="100" cy="226" rx="70" ry="13" fill="none" stroke={kind === "storm" ? c : a} strokeWidth="5" strokeDasharray={kind === "storm" ? "12 8" : undefined} animate={loop ? (kind === "storm" ? { strokeDashoffset: [0, -40] } : { opacity: [0.5, 1, 0.5] }) : undefined} transition={kind === "storm" ? { duration: 0.8, repeat: Infinity, ease: "linear" } : loopT(1.6)} />

      {kind === "ember" &&
        [36, 62, 100, 138, 164].map((x, i) => (
          <motion.path
            key={x}
            d={`M${x} 228 q-14 -26 0 -${46 + (i % 2) * 18} q14 26 0 ${46 + (i % 2) * 18} z`}
            fill={i % 2 ? c : a}
            opacity="0.75"
            style={{ originX: 0.5, originY: 1 }}
            animate={loop ? { scaleY: [0.7, 1.15, 0.7], opacity: [0.45, 0.85, 0.45] } : { scaleY: 1 }}
            transition={loopT(0.7 + (i % 3) * 0.2, { delay: i * 0.12 })}
          />
        ))}
    </g>
  );
}

// Effects drawn over the warrior so the aura reads clearly.
function AuraFront({ kind, loop, a, c, halo }: { kind: string; loop: boolean; a: string; c: string; halo: boolean }) {
  return (
    <g pointerEvents="none">
      {kind === "storm" && (
        <>
          <motion.path d="M16 140 A84 24 0 0 0 184 140" fill="none" stroke={c} strokeWidth="5" strokeDasharray="18 12" strokeLinecap="round" animate={loop ? { strokeDashoffset: [0, -60] } : undefined} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />
          {[[30, 120], [170, 90], [24, 30], [176, 170]].map(([x, y], i) => (
            <motion.path key={i} d={`M${x} ${y} l-12 22 h12 l-10 24`} fill="none" stroke={c} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" animate={loop ? { opacity: [0, 1, 0, 0, 1, 0] } : { opacity: 0.7 }} transition={{ duration: 1.3 + i * 0.4, repeat: Infinity }} />
          ))}
        </>
      )}
      {kind === "frost" &&
        [24, 52, 84, 116, 148, 176].map((x, i) => (
          <motion.path
            key={x}
            d={flake}
            stroke={i % 2 ? c : a}
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ x, y: 10, opacity: 0, scale: 1.6 }}
            animate={loop ? { y: [10, 220], opacity: [0, 1, 0], rotate: [0, 180], scale: 1.6 } : { y: 60 + i * 24, opacity: 0.8, scale: 1.6 }}
            transition={{ duration: 3 + (i % 3) * 0.6, repeat: Infinity, delay: i * 0.45, ease: "linear" }}
          />
        ))}
      {(kind === "ember" || halo) &&
        [30, 60, 90, 120, 150, 170, 46, 136].map((x, i) => (
          <motion.circle
            key={i}
            cx={x}
            r={i % 3 ? 2.6 : 3.6}
            fill={i % 2 ? a : c}
            initial={{ cy: 220, opacity: 0 }}
            animate={loop ? { cy: [220, 30], opacity: [0, 1, 0] } : { cy: 80 + (i % 4) * 30, opacity: 0.7 }}
            transition={{ duration: 2.2 + (i % 3) * 0.5, repeat: Infinity, delay: i * 0.3, ease: "easeOut" }}
          />
        ))}
      {halo &&
        [[24, 60], [178, 46], [16, 170], [184, 150]].map(([x, y], i) => (
          <motion.path key={i} d={sparkle} fill={c} stroke={a} strokeWidth="1" initial={{ x, y, scale: 0 }} animate={loop ? { scale: [0, 1.3, 0] } : { scale: 1 }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4 }} />
        ))}
    </g>
  );
}
