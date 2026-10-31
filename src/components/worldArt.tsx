"use client";

import { motion } from "framer-motion";
import { memo } from "react";
import type { Decor, Scene, Theme } from "@/lib/game";

// Deterministic pseudo-random numbers so every render draws the same world.
const rnd = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const loop = (duration: number, extra: object = {}) => ({ duration, repeat: Infinity, ease: "easeInOut" as const, ...extra });

type G = { W: number; H: number; hz: number; t: Theme };

// ---------------------------------------------------------------------------
// Far layer: everything on or above the horizon, unique to each world.
// ---------------------------------------------------------------------------
export const Backdrop = memo(function Backdrop({ W, H, hz, t }: G) {
  const s = t.scene;
  return (
    <svg aria-hidden className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {s === "shore" && <Shore W={W} H={H} hz={hz} t={t} />}
      {s === "woods" && <Woods W={W} H={H} hz={hz} t={t} />}
      {s === "lagoon" && <Lagoon W={W} H={H} hz={hz} t={t} />}
      {s === "peaks" && <Peaks W={W} H={H} hz={hz} t={t} />}
      {s === "caverns" && <Caverns W={W} H={H} hz={hz} t={t} />}
      {s === "castle" && <Castle W={W} H={H} hz={hz} t={t} />}
      {s === "citadel" && <Citadel W={W} H={H} hz={hz} t={t} />}
    </svg>
  );
});

function Sun({ x, y, r, color = "#FFF7C7", glow = "rgba(255,243,176,.55)" }: { x: number; y: number; r: number; color?: string; glow?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 2.6} fill={glow} opacity="0.35" />
      <circle cx={x} cy={y} r={r * 1.6} fill={glow} opacity="0.5" />
      <circle cx={x} cy={y} r={r} fill={color} />
    </g>
  );
}

function Cloud({ x, y, w, drift, opacity = 0.85 }: { x: number; y: number; w: number; drift: number; opacity?: number }) {
  return (
    <motion.g animate={{ x: [0, drift, 0] }} transition={loop(22 + Math.abs(drift) / 3)} opacity={opacity}>
      <ellipse cx={x} cy={y} rx={w * 0.5} ry={w * 0.13} fill="#FFFFFF" />
      <ellipse cx={x - w * 0.18} cy={y - w * 0.08} rx={w * 0.2} ry={w * 0.13} fill="#FFFFFF" />
      <ellipse cx={x + w * 0.1} cy={y - w * 0.12} rx={w * 0.24} ry={w * 0.16} fill="#FFFFFF" />
    </motion.g>
  );
}

function Stars({ W, top, n = 40 }: { W: number; top: number; n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <motion.circle key={i} cx={rnd(i) * W} cy={rnd(i + 99) * top} r={i % 5 ? 1.2 : 2} fill="#FFFFFF" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2 + (i % 5) * 0.6, repeat: Infinity, delay: (i % 9) * 0.3 }} />
      ))}
    </>
  );
}

// Syntax Shore: open sea on the horizon, a lighthouse island and a semicolon sailboat.
function Shore({ W, H, hz }: G) {
  const sea = H * 0.075;
  return (
    <>
      <Sun x={W * 0.44} y={hz * 0.3} r={W * 0.04} />
      <Cloud x={W * 0.64} y={hz * 0.36} w={W * 0.16} drift={30} />
      <Cloud x={W * 0.86} y={hz * 0.5} w={W * 0.11} drift={-24} />
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2F8FD0" />
          <stop offset="100%" stopColor="#6FD0F2" />
        </linearGradient>
      </defs>
      <rect x="0" y={hz - sea} width={W} height={sea + 2} fill="url(#sea)" />
      {/* island with lighthouse */}
      <path d={`M${W * 0.7} ${hz - sea + 2} Q${W * 0.78} ${hz - sea - H * 0.05} ${W * 0.88} ${hz - sea + 2} Z`} fill="#E9C77E" />
      <path d={`M${W * 0.73} ${hz - sea} Q${W * 0.78} ${hz - sea - H * 0.035} ${W * 0.84} ${hz - sea} Z`} fill="#58B368" />
      <g transform={`translate(${W * 0.8} ${hz - sea - H * 0.03})`}>
        <motion.polygon points={`0,${-H * 0.075} ${W * 0.22},${-H * 0.11} ${W * 0.22},${-H * 0.04}`} fill="#FFF6B8" opacity="0.4" style={{ originX: 0, originY: 0.5 }} animate={{ rotate: [-14, 10, -14], opacity: [0.15, 0.45, 0.15] }} transition={loop(4)} />
        <rect x={-W * 0.008} y={-H * 0.07} width={W * 0.016} height={H * 0.07} fill="#FFFFFF" />
        <rect x={-W * 0.008} y={-H * 0.05} width={W * 0.016} height={H * 0.012} fill="#E5484D" />
        <rect x={-W * 0.008} y={-H * 0.026} width={W * 0.016} height={H * 0.012} fill="#E5484D" />
        <rect x={-W * 0.011} y={-H * 0.083} width={W * 0.022} height={H * 0.014} rx="2" fill="#FFE066" />
        <path d={`M${-W * 0.012} ${-H * 0.083} L0 ${-H * 0.096} L${W * 0.012} ${-H * 0.083} Z`} fill="#E5484D" />
      </g>
      {/* semicolon sailboat */}
      <motion.g animate={{ x: [W * 0.08, W * 0.5, W * 0.08] }} transition={loop(40)}>
        <motion.g animate={{ rotate: [-3, 3, -3] }} transition={loop(2.6)}>
          <path d={`M0 ${hz - sea * 0.55} h${W * 0.05} l${-W * 0.008} ${sea * 0.25} h${-W * 0.034} z`} fill="#8A5A2E" />
          <path d={`M${W * 0.024} ${hz - sea * 0.55} V${hz - sea * 0.55 - H * 0.07} L${W * 0.05} ${hz - sea * 0.62} Z`} fill="#FFFFFF" />
          <text x={W * 0.032} y={hz - sea * 0.72} fontSize={H * 0.03} fontWeight="800" fill="#2D9CDB" textAnchor="middle" fontFamily="JetBrains Mono, monospace">;</text>
        </motion.g>
      </motion.g>
      {/* sparkles and foam */}
      {Array.from({ length: 9 }).map((_, i) => (
        <motion.rect key={i} x={rnd(i + 5) * W} y={hz - sea * (0.2 + rnd(i + 40) * 0.7)} width={W * 0.025} height="2" rx="1" fill="#FFFFFF" animate={{ opacity: [0, 0.9, 0], x: [0, 14, 0] }} transition={loop(2.4 + (i % 4) * 0.5, { delay: i * 0.35 })} />
      ))}
      <motion.path d={`M0 ${hz} ${Array.from({ length: 13 }).map((_, i) => `Q${(i + 0.5) * (W / 12)} ${hz - 6} ${(i + 1) * (W / 12)} ${hz}`).join(" ")}`} fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" animate={{ x: [0, -W / 24, 0] }} transition={loop(3)} />
    </>
  );
}

// Branch Woods: layered tree lines, sun rays through the canopy, a forked trail sign.
function Woods({ W, H, hz }: G) {
  const back = Array.from({ length: 26 }).map((_, i) => {
    const x = (i / 25) * W, h = H * (0.06 + rnd(i) * 0.06), w = W * 0.035;
    return `M${x - w} ${hz} L${x} ${hz - h} L${x + w} ${hz} Z`;
  });
  const front = Array.from({ length: 16 }).map((_, i) => ({ x: (i / 15) * W + rnd(i + 3) * 20, r: W * (0.03 + rnd(i + 7) * 0.02) }));
  return (
    <>
      <Cloud x={W * 0.3} y={hz * 0.25} w={W * 0.14} drift={20} opacity={0.7} />
      {[0.18, 0.42, 0.7].map((x, i) => (
        <motion.polygon key={x} points={`${W * x},0 ${W * (x + 0.07)},0 ${W * (x + 0.16)},${hz} ${W * (x + 0.04)},${hz}`} fill="#FFFBE0" animate={{ opacity: [0.12, 0.3, 0.12] }} transition={loop(5 + i, { delay: i })} />
      ))}
      <path d={back.join(" ")} fill="#4E9A68" opacity="0.7" />
      {front.map((f, i) => (
        <g key={i}>
          <rect x={f.x - 3} y={hz - f.r * 1.6} width="6" height={f.r * 1.6} fill="#6B4B2A" />
          <circle cx={f.x} cy={hz - f.r * 1.7} r={f.r} fill={i % 2 ? "#3F8A4F" : "#4FA35D"} />
          <circle cx={f.x - f.r * 0.3} cy={hz - f.r * 2} r={f.r * 0.45} fill="#7CCB78" opacity="0.6" />
        </g>
      ))}
    </>
  );
}

// Loop Lagoon: drowned basalt architecture and a bioluminescent tidal basin.
function Lagoon({ W, H, hz }: G) {
 return <g data-lagoon="drowned-observatory">
  <rect width={W} height={hz} fill="#102839"/>
  <circle cx={W*.67} cy={hz*.35} r={H*.035} fill="#B7E9DF" opacity=".45"/>
  <path d={`M0 ${hz} L0 ${hz*.7} L${W*.14} ${hz*.48} L${W*.26} ${hz*.75} L${W*.42} ${hz*.55} L${W*.58} ${hz*.8} L${W*.82} ${hz*.5} L${W} ${hz*.7} V${hz} Z`} fill="#173D49"/>
  {[.12,.29,.73,.88].map((x,i)=><g key={x}><path d={`M${W*x} ${hz} V${hz*(.45+i%2*.18)} h${W*.028} V${hz}Z`} fill="#284B54"/><path d={`M${W*(x+.012)} ${hz*.8} v${hz*.13}`} stroke="#7DE8D0" strokeWidth="2" opacity=".55"/></g>)}
  <path d={`M${W*.38} ${hz} V${hz*.6} Q${W*.5} ${hz*.08} ${W*.62} ${hz*.6} V${hz}`} fill="none" stroke="#31555D" strokeWidth={W*.014}/>
  <rect y={hz-H*.025} width={W} height={H*.06} fill="#123B48"/>
  {[.22,.46,.68,.85].map((x,i)=><path key={x} d={`M${W*x} ${hz+H*(.005+i%2*.02)} h${W*.09}`} stroke="#70DCC9" strokeWidth="1.5" opacity=".4"/>) }
 </g>;
}

// String Peaks: snow-capped ranges and a "STRING" bunting strung across the sky.
function Peaks({ W, H, hz }: G) {
  const range = (seed: number, hgt: number, n: number) => {
    const pts: [number, number][] = [[0, hz]];
    for (let i = 0; i <= n; i++) pts.push([(i / n) * W, hz - H * hgt * (i % 2 ? 0.45 + rnd(seed + i) * 0.3 : 0.9 + rnd(seed + i) * 0.3)]);
    pts.push([W, hz]);
    return pts;
  };
  const backPts = range(1, 0.16, 8);
  const frontPts = range(30, 0.11, 10);
  const caps = (pts: [number, number][], scale: number) =>
    pts.slice(1, -1).filter((_, i) => i % 2 === 0).map(([x, y], i) => <path key={i} d={`M${x} ${y} L${x - W * 0.028 * scale} ${y + H * 0.035 * scale} L${x - W * 0.01 * scale} ${y + H * 0.028 * scale} L${x} ${y + H * 0.04 * scale} L${x + W * 0.012 * scale} ${y + H * 0.028 * scale} L${x + W * 0.028 * scale} ${y + H * 0.035 * scale} Z`} fill="#FFFFFF" />);
  const word = '"STRING"'.split("");
  const y0 = hz * 0.44, sag = hz * 0.08;
  return (
    <>
      <Cloud x={W * 0.78} y={hz * 0.62} w={W * 0.14} drift={-20} opacity={0.7} />
      <path d={`M${backPts.map((p) => p.join(" ")).join(" L")} Z`} fill="#B8C6EA" />
      {caps(backPts, 1)}
      <path d={`M${frontPts.map((p) => p.join(" ")).join(" L")} Z`} fill="#DCE5F7" />
      {caps(frontPts, 0.8)}
      {/* bunting */}
      <path d={`M${W * 0.04} ${y0} Q${W * 0.5} ${y0 + sag * 2} ${W * 0.96} ${y0}`} fill="none" stroke="#5B6B94" strokeWidth="2" />
      {word.map((ch, i) => {
        const u = (i + 0.5) / word.length;
        const x = W * (0.04 + 0.92 * u);
        const y = y0 + sag * 2 * 2 * u * (1 - u) * 0.98;
        const fw = Math.min(W * 0.05, 46);
        return (
          <motion.g key={i} style={{ originX: 0.5, originY: 0 }} animate={{ rotate: [-6, 6, -6] }} transition={loop(2 + (i % 3) * 0.4, { delay: i * 0.15 })}>
            <path d={`M${x - fw / 2} ${y} H${x + fw / 2} L${x} ${y + fw * 1.25} Z`} fill={["#FF6B6B", "#FFB84D", "#4DB8FF", "#9B7BFF", "#4CD27E"][i % 5]} />
            <text x={x} y={y + fw * 0.55} textAnchor="middle" fontSize={fw * 0.5} fontWeight="800" fill="#FFFFFF" fontFamily="JetBrains Mono, monospace">{ch}</text>
          </motion.g>
        );
      })}
    </>
  );
}

// Array Caverns: a stalactite ceiling, glowing crystal walls and lanterns hung by index.
function Caverns({ W, H, hz }: G) {
  const n = 22;
  const ceil = [`M0 0 H${W} V${H * 0.08}`];
  for (let i = n; i >= 0; i--) {
    const x = (i / n) * W;
    const d = H * (0.06 + (i % 3 === 0 ? 0.08 + rnd(i) * 0.08 : rnd(i + 50) * 0.04));
    ceil.push(`L${x + W / n / 2} ${H * 0.07} L${x} ${d}`);
  }
  ceil.push("Z");
  const wall = Array.from({ length: 13 }).map((_, i) => [(i / 12) * W, hz - H * (0.05 + rnd(i + 20) * 0.08)] as const);
  return (
    <>
      <path d={`M0 ${hz} ${wall.map(([x, y]) => `L${x} ${y}`).join(" ")} L${W} ${hz} Z`} fill="#2E2659" />
      {wall.filter((_, i) => i % 2).map(([x, y], i) => (
        <motion.g key={i} animate={{ opacity: [0.6, 1, 0.6] }} transition={loop(2 + i * 0.4)}>
          <path d={`M${x - 10} ${y + 14} L${x - 4} ${y - 8} L${x + 2} ${y + 14} Z`} fill={i % 2 ? "#7DF9FF" : "#C59BFF"} />
          <path d={`M${x} ${y + 14} L${x + 6} ${y - 2} L${x + 11} ${y + 14} Z`} fill={i % 2 ? "#C59BFF" : "#7DF9FF"} />
        </motion.g>
      ))}
      <path d={ceil.join(" ")} fill="#1A1538" />
      {/* lanterns on a cable: arr[0] .. arr[4] */}
      <path d={`M0 ${H * 0.13} Q${W * 0.5} ${H * 0.24} ${W} ${H * 0.13}`} fill="none" stroke="#0E0B24" strokeWidth="2" />
      {[0, 1, 2, 3, 4].map((i) => {
        const u = (i + 1) / 6;
        const x = W * u, y = H * 0.13 + H * 0.11 * 4 * u * (1 - u);
        return (
          <motion.g key={i} style={{ originX: 0.5, originY: 0 }} animate={{ rotate: [-4, 4, -4] }} transition={loop(2.4, { delay: i * 0.3 })}>
            <line x1={x} y1={y} x2={x} y2={y + 10} stroke="#0E0B24" strokeWidth="2" />
            <motion.circle cx={x} cy={y + 24} r={20} fill="#FFC83D" opacity="0.25" animate={{ opacity: [0.15, 0.35, 0.15] }} transition={loop(1.6, { delay: i * 0.2 })} />
            <rect x={x - 10} y={y + 10} width="20" height="26" rx="5" fill="#FFD66B" stroke="#8A5A00" strokeWidth="2" />
            <text x={x} y={y + 28} textAnchor="middle" fontSize="10" fontWeight="800" fill="#5C3F00" fontFamily="JetBrains Mono, monospace">{i}</text>
          </motion.g>
        );
      })}
    </>
  );
}

// Class Castle: a sunset castle with lit windows and waving flags.
function Castle({ W, H, hz }: G) {
  const cx = W * 0.5, base = hz, bw = W * 0.34, wallH = H * 0.07;
  const towers = [-0.5, -0.2, 0.2, 0.5].map((f, i) => ({ x: cx + f * bw, h: H * (i === 1 || i === 2 ? 0.17 : 0.12) }));
  return (
    <>
      <Sun x={W * 0.78} y={hz - H * 0.02} r={W * 0.07} color="#FFD27A" glow="rgba(255,170,110,.6)" />
      <Cloud x={W * 0.25} y={hz * 0.3} w={W * 0.16} drift={18} opacity={0.6} />
      <path d={`M0 ${hz} Q${W * 0.15} ${hz - H * 0.07} ${W * 0.32} ${hz - H * 0.02} L${W * 0.32} ${hz} Z M${W * 0.68} ${hz} L${W * 0.68} ${hz - H * 0.03} Q${W * 0.85} ${hz - H * 0.08} ${W} ${hz - H * 0.03} V${hz} Z`} fill="#B06D74" />
      <g fill="#6E4A6B">
        <rect x={cx - bw / 2} y={base - wallH} width={bw} height={wallH} />
        {Array.from({ length: 12 }).map((_, i) => <rect key={i} x={cx - bw / 2 + (i * bw) / 12 + 2} y={base - wallH - 8} width={bw / 24} height="9" />)}
        {towers.map((tw, i) => (
          <g key={i}>
            <rect x={tw.x - W * 0.025} y={base - tw.h} width={W * 0.05} height={tw.h} />
            <path d={`M${tw.x - W * 0.032} ${base - tw.h} L${tw.x} ${base - tw.h - H * 0.06} L${tw.x + W * 0.032} ${base - tw.h} Z`} fill="#4E3253" />
          </g>
        ))}
      </g>
      <path d={`M${cx - W * 0.03} ${base} V${base - wallH * 0.6} Q${cx} ${base - wallH * 1.05} ${cx + W * 0.03} ${base - wallH * 0.6} V${base} Z`} fill="#3A2440" />
      {towers.map((tw, i) => (
        <g key={i}>
          <motion.rect x={tw.x - 4} y={base - tw.h * 0.7} width="8" height="12" rx="4" fill="#FFD66B" animate={{ opacity: [0.7, 1, 0.7] }} transition={loop(1.5 + i * 0.3)} />
          <line x1={tw.x} y1={base - tw.h - H * 0.06} x2={tw.x} y2={base - tw.h - H * 0.09} stroke="#3A2440" strokeWidth="2" />
          <motion.path d={`M${tw.x} ${base - tw.h - H * 0.09} l${W * 0.03} ${H * 0.008} l${-W * 0.03} ${H * 0.012} Z`} fill={i % 2 ? "#FFC83D" : "#E5484D"} style={{ originX: 0, originY: 0.5 }} animate={{ scaleX: [1, 0.75, 1], skewY: [0, 8, 0] }} transition={loop(1.2 + i * 0.2)} />
        </g>
      ))}
      <text x={cx} y={base - wallH * 0.25} textAnchor="middle" fontSize={H * 0.022} fontWeight="800" fill="#FFD66B" fontFamily="JetBrains Mono, monospace">class</text>
    </>
  );
}

// LeetCode Citadel: a neon tower with a sweeping beacon over a glowing grid.
function Citadel({ W, H, hz }: G) {
  const cx = W * 0.5;
  const th = H * 0.27;
  const spires = [0.12, 0.22, 0.3, 0.7, 0.79, 0.9].map((x, i) => ({ x: W * x, h: H * (0.06 + rnd(i + 11) * 0.09), w: W * (0.025 + rnd(i) * 0.02) }));
  return (
    <>
      <Stars W={W} top={hz * 0.9} />
      <circle cx={W * 0.7} cy={hz * 0.42} r={W * 0.03} fill="#FFF6D6" />
      <circle cx={W * 0.7} cy={hz * 0.42} r={W * 0.06} fill="#FFF6D6" opacity="0.15" />
      {/* beacon */}
      <motion.polygon points={`${cx},${hz - th} ${cx - W * 0.6},${-H * 0.1} ${cx - W * 0.45},${-H * 0.1}`} fill="#FFC83D" opacity="0.18" style={{ originX: 1, originY: 1 }} animate={{ rotate: [0, 70, 0] }} transition={loop(7)} />
      {spires.map((sp, i) => (
        <g key={i}>
          <rect x={sp.x - sp.w / 2} y={hz - sp.h} width={sp.w} height={sp.h} fill="#1B1E46" />
          {Array.from({ length: 4 }).map((_, k) => (
            <motion.rect key={k} x={sp.x - sp.w / 4} y={hz - sp.h + 8 + k * (sp.h / 5)} width={sp.w / 2} height="3" fill="#7DF9FF" animate={{ opacity: [0.3, 1, 0.3] }} transition={loop(1.5 + k * 0.4, { delay: i * 0.2 })} />
          ))}
        </g>
      ))}
      <path d={`M${cx - W * 0.06} ${hz} L${cx - W * 0.025} ${hz - th} H${cx + W * 0.025} L${cx + W * 0.06} ${hz} Z`} fill="#22265C" />
      <path d={`M${cx} ${hz} V${hz - th}`} stroke="#FFC83D" strokeWidth="2" opacity="0.7" />
      {[0.3, 0.55, 0.8].map((f, i) => (
        <motion.ellipse key={f} cx={cx} cy={hz - th * f} rx={W * (0.07 - f * 0.04)} ry={H * 0.008} fill="none" stroke="#B14BFF" strokeWidth="2.5" animate={{ opacity: [0.4, 1, 0.4] }} transition={loop(2, { delay: i * 0.4 })} />
      ))}
      <motion.circle cx={cx} cy={hz - th - 8} r="9" fill="#FFC83D" animate={{ opacity: [0.7, 1, 0.7], r: [8, 11, 8] }} transition={loop(1.2)} />
      {/* neon grid on the floor */}
      <g stroke="#7A6CFF" strokeOpacity="0.35" strokeWidth="1.5">
        {Array.from({ length: 15 }).map((_, i) => {
          const x = ((i - 7) / 7) * W * 1.6 + cx;
          return <line key={`v${i}`} x1={cx + (x - cx) * 0.02} y1={hz} x2={x} y2={H} />;
        })}
        {Array.from({ length: 8 }).map((_, i) => {
          const y = hz + (H - hz) * Math.pow((i + 1) / 8, 2);
          return <line key={`h${i}`} x1="0" y1={y} x2={W} y2={y} />;
        })}
      </g>
    </>
  );
}

// ---------------------------------------------------------------------------
// Road details drawn under the road markings: rails, boardwalk edges.
// ---------------------------------------------------------------------------
export function RoadExtras({ W, H, hz, t, half }: G & { half: number }) {
  if (t.scene === "caverns")
    return (
      <svg aria-hidden className="absolute inset-0" width={W} height={H}>
        {[-1, 1].map((s) => (
          <polygon key={s} points={`${W / 2 + s * half * 0.6 - 4},${H} ${W / 2 + s * half * 0.6 + 4},${H} ${W / 2 + s * 1.2},${hz} ${W / 2 + s * 0.8},${hz}`} fill="#C9CCE0" />
        ))}
      </svg>
    );
  if (t.scene === "lagoon")
    return (
      <svg aria-hidden className="absolute inset-0" width={W} height={H}>
        {Array.from({ length: 8 }).map((_, i) => {
          const y = hz + (H - hz) * Math.pow((i + 1) / 8, 1.6);
          const k = (y - hz) / (H - hz);
          return [-1, 1].map((s) => <rect key={`${i}${s}`} x={W / 2 + s * half * 1.1 * k - 3 * k} y={y - 6 * k} width={6 * k + 1} height={22 * k + 2} fill="#6B4523" />);
        })}
      </svg>
    );
  return null;
}

// The repeating mark down the middle of the road, unique per world.
export function RoadMark({ t }: { t: Theme }) {
  switch (t.scene) {
    case "lagoon":
      return <div className="h-full w-full rounded-sm" style={{ background: "#8E6538", boxShadow: "inset 0 -3px 0 rgba(0,0,0,.2)" }} />;
    case "caverns":
      return <div className="h-full w-full rounded-sm" style={{ background: "#5A3F2A" }} />;
    case "castle":
      return (
        <div className="flex h-full w-full gap-[6%]">
          {[0, 1, 2].map((i) => <div key={i} className="h-full flex-1 rounded-[40%]" style={{ background: i === 1 ? "#B9BCCB" : "#ABAEC0", boxShadow: "inset 0 -3px 0 rgba(0,0,0,.15)" }} />)}
        </div>
      );
    case "peaks":
    case "shore":
      return (
        <div className="relative h-full w-full">
          <div className="absolute left-0 top-0 h-[42%] w-[38%] rounded-[50%]" style={{ background: t.roadLine }} />
          <div className="absolute bottom-0 right-0 h-[42%] w-[38%] rounded-[50%]" style={{ background: t.roadLine }} />
        </div>
      );
    case "woods":
      return <div className="h-full w-full rounded-[45%]" style={{ background: "#B89262", boxShadow: "inset 0 -3px 0 rgba(0,0,0,.18)" }} />;
    case "citadel":
      return (
        <svg viewBox="0 0 40 20" width="100%" height="100%" preserveAspectRatio="none">
          <path d="M4 18 L20 4 L36 18" fill="none" stroke="#FFF1B0" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}
// Width and height of the road mark relative to the scene width.
export const roadMarkSize = (t: Theme, W: number, half: number) =>
  t.scene === "lagoon" || t.scene === "caverns"
    ? { w: half * (t.scene === "lagoon" ? 2 : 1.5), h: Math.max(6, W * 0.012), gap: t.scene === "lagoon" ? 0.28 : 0.45 }
    : t.scene === "castle"
      ? { w: half * 1.2, h: Math.max(8, W * 0.02), gap: 0.5 }
      : t.scene === "woods"
        ? { w: half * 0.55, h: Math.max(8, W * 0.022), gap: 0.7 }
        : t.scene === "citadel"
          ? { w: half * 0.45, h: Math.max(8, W * 0.02), gap: 0.6 }
          : { w: Math.max(14, W * 0.03), h: Math.max(14, W * 0.03), gap: 0.7 };

// ---------------------------------------------------------------------------
// Ambient life drawn over the scene: weather, critters, floating glyphs.
// ---------------------------------------------------------------------------
export const Ambient = memo(function Ambient({ W, H, hz, t }: G) {
  const s = t.scene;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 450 }}>
      {(s === "shore" || s === "castle") &&
        [0, 1, 2].map((i) => (
          <motion.svg key={i} width="34" height="16" viewBox="0 0 34 16" className="absolute" style={{ top: hz * (0.2 + i * 0.15) }} initial={{ x: -60 }} animate={{ x: [-60, W + 60] }} transition={{ duration: 16 + i * 5, repeat: Infinity, delay: i * 4, ease: "linear" }}>
            <motion.path d="M1 4 Q9 0 17 9 Q25 0 33 4" fill="none" stroke={s === "castle" ? "#5A3A55" : "#FFFFFF"} strokeWidth="2.6" strokeLinecap="round" animate={{ d: ["M1 4 Q9 0 17 9 Q25 0 33 4", "M1 12 Q9 12 17 9 Q25 12 33 12", "M1 4 Q9 0 17 9 Q25 0 33 4"] }} transition={{ duration: 0.6, repeat: Infinity }} />
          </motion.svg>
        ))}
      {s === "woods" &&
        Array.from({ length: 12 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute block"
            style={{ left: rnd(i) * W, top: -20, width: 12, height: 8, borderRadius: "70% 0 70% 0", background: ["#E9A23B", "#D9622B", "#8BC34A", "#F2C94C"][i % 4] }}
            animate={{ y: [0, H + 40], x: [0, 40, -20, 30], rotate: [0, 200, 400] }}
            transition={{ duration: 8 + (i % 4) * 2, repeat: Infinity, delay: i * 0.9, ease: "linear" }}
          />
        ))}
      {s === "lagoon" && (
        <>
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.span key={i} className="absolute block rounded-[50%] border-2 border-white/70" style={{ left: rnd(i + 3) * W, top: hz + (H - hz) * (0.15 + rnd(i + 8) * 0.75), width: 40, height: 12, x: "-50%" }} animate={{ scale: [0.3, 2.2], opacity: [0.9, 0] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }} />
          ))}
          {[0, 1].map((i) => (
            <motion.svg key={i} width="30" height="16" viewBox="0 0 30 16" className="absolute" style={{ left: W * (i ? 0.78 : 0.14), top: hz + (H - hz) * 0.35 }} animate={{ x: [0, 50, 100], y: [0, -70, 0], rotate: [-30, 0, 30], opacity: [0, 1, 1, 0] }} transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 3 + i * 2, ease: "easeInOut" }}>
              <path d="M2 8 Q12 0 22 8 Q12 16 2 8 Z M22 8 L29 2 V14 Z" fill="#FF8A3D" />
              <circle cx="8" cy="7" r="1.5" fill="#1F2440" />
            </motion.svg>
          ))}
        </>
      )}
      {s === "peaks" &&
        Array.from({ length: 30 }).map((_, i) => (
          <motion.span key={i} className="absolute block rounded-full bg-white" style={{ left: rnd(i) * W, top: -10, width: i % 3 ? 5 : 8, height: i % 3 ? 5 : 8, boxShadow: "0 0 4px rgba(160,180,230,.8)" }} animate={{ y: [0, H + 20], x: [0, 30, 0, 30] }} transition={{ duration: 6 + (i % 5), repeat: Infinity, delay: rnd(i + 4) * 6, ease: "linear" }} />
        ))}
      {s === "caverns" && (
        <>
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.span key={i} className="absolute block rounded-full" style={{ left: rnd(i) * W, top: hz + rnd(i + 30) * (H - hz), width: 5, height: 5, background: i % 2 ? "#7DF9FF" : "#C59BFF", boxShadow: `0 0 10px ${i % 2 ? "#7DF9FF" : "#C59BFF"}` }} animate={{ y: [0, -H * 0.5], opacity: [0, 1, 0] }} transition={{ duration: 5 + (i % 4), repeat: Infinity, delay: i * 0.5, ease: "easeOut" }} />
          ))}
          {[0.15, 0.4, 0.62, 0.88].map((x, i) => (
            <motion.span key={x} className="absolute block rounded-full bg-[#9FE8FF]" style={{ left: W * x, top: H * 0.14, width: 4, height: 7 }} animate={{ y: [0, H * 0.7], opacity: [1, 1, 0] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2 + i, ease: "easeIn" }} />
          ))}
        </>
      )}
      {s === "castle" &&
        Array.from({ length: 10 }).map((_, i) => (
          <motion.span key={i} className="absolute block rounded-full" style={{ left: rnd(i + 2) * W, top: H, width: 5, height: 5, background: "#FFB86B", boxShadow: "0 0 8px #FFB86B" }} animate={{ y: [0, -H * 0.9], x: [0, 20, -10], opacity: [0, 1, 0] }} transition={{ duration: 7 + (i % 4), repeat: Infinity, delay: i * 0.8, ease: "easeOut" }} />
        ))}
      {s === "citadel" && (
        <>
          {["O(n)", "{ }", "[ ]", "#1", "=>", "&&", "i++", "O(1)", "!=", "return"].map((g, i) => (
            <motion.span key={g} className="absolute font-mono text-sm font-extrabold" style={{ left: rnd(i + 6) * W * 0.9, top: hz + rnd(i) * (H - hz) * 0.8, color: i % 2 ? "#7DF9FF" : "#FFC83D", textShadow: "0 0 8px currentColor" }} animate={{ y: [0, -H * 0.4], opacity: [0, 0.9, 0] }} transition={{ duration: 6 + (i % 4), repeat: Infinity, delay: i * 0.9, ease: "easeOut" }}>
              {g}
            </motion.span>
          ))}
          <motion.span className="absolute block h-[2px] w-24 rounded-full" style={{ top: hz * 0.2, left: W * 0.7, background: "linear-gradient(90deg, transparent, #FFFFFF)", rotate: -20 }} animate={{ x: [0, -W * 0.5], y: [0, hz * 0.3], opacity: [0, 1, 0] }} transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 5 }} />
        </>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Roadside scenery.
// ---------------------------------------------------------------------------
export function Scenery({ kind }: { kind: Decor }) {
  const box = (children: React.ReactNode) => (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
      {children}
    </svg>
  );
  switch (kind) {
    case "palm":
      return box(
        <>
          <path d="M50 100 Q44 70 54 38" stroke="#9C6B3C" strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M48 90 h8 M47 78 h8 M48 66 h8 M50 54 h7" stroke="#7A5129" strokeWidth="2" />
          <path d="M54 38 Q30 26 10 42 M54 38 Q78 24 94 40 M54 38 Q40 14 20 16 M54 38 Q70 12 88 18 M54 38 Q56 18 50 6" stroke="#2FAE55" strokeWidth="9" fill="none" strokeLinecap="round" />
          <circle cx="50" cy="42" r="4" fill="#8A5A2E" />
          <circle cx="57" cy="43" r="4" fill="#8A5A2E" />
        </>,
      );
    case "umbrella":
      return box(
        <>
          <ellipse cx="50" cy="98" rx="30" ry="4" fill="#000" opacity="0.1" />
          <rect x="48" y="40" width="4" height="60" fill="#8A5A2E" />
          <path d="M10 44 Q50 4 90 44 Z" fill="#FF6B6B" />
          <path d="M30 44 Q50 4 50 44 Z M70 44 Q50 4 50 44 Z" fill="#FFFFFF" opacity="0.9" />
          <path d="M26 92 h40 l6 -10 h-40 z" fill="#4DB8FF" />
        </>,
      );
    case "sandcastle":
      return box(
        <>
          <rect x="22" y="70" width="56" height="30" fill="#E9C77E" />
          <rect x="16" y="56" width="18" height="44" fill="#F0D58C" />
          <rect x="66" y="56" width="18" height="44" fill="#F0D58C" />
          <rect x="40" y="46" width="20" height="54" fill="#F0D58C" />
          {[16, 22, 28, 66, 72, 78, 40, 46, 52].map((x, i) => <rect key={i} x={x} y={i < 6 ? 51 : 41} width="5" height="6" fill="#F0D58C" />)}
          <path d="M44 100 v-14 a6 6 0 0 1 12 0 v14 z" fill="#C9A160" />
          <line x1="50" y1="41" x2="50" y2="22" stroke="#8A5A2E" strokeWidth="2" />
          <path d="M50 22 l14 4 l-14 4 z" fill="#2D9CDB" />
          <text x="55" y="29" fontSize="7" fontWeight="800" fill="#FFFFFF" fontFamily="JetBrains Mono, monospace">;</text>
        </>,
      );
    case "shell":
      return box(
        <>
          <path d="M30 100 L50 78 L70 100 Z" fill="#FF9F8A" />
          <path d="M50 100 L36 86 M50 100 L50 80 M50 100 L64 86" stroke="#E5706A" strokeWidth="2" />
          <path d="M72 100 l5 -10 l5 10 l-10 -6 h10 z" fill="#FFB84D" />
        </>,
      );
    case "pine":
      return box(
        <>
          <rect x="45" y="78" width="10" height="22" rx="3" fill="#8A5A2E" />
          <path d="M50 4 L80 50 H64 L86 80 H14 L36 50 H20 Z" fill="#2E8B57" />
          <path d="M50 4 L80 50 H64 L86 80 H50 Z" fill="#257A4B" />
        </>,
      );
    case "oak":
      return box(
        <>
          <path d="M44 100 L46 60 L54 60 L56 100 Z" fill="#7A5129" />
          <path d="M50 72 L36 58 M52 70 L64 56" stroke="#7A5129" strokeWidth="4" strokeLinecap="round" />
          <circle cx="50" cy="40" r="28" fill="#4FA35D" />
          <circle cx="30" cy="52" r="18" fill="#3F8A4F" />
          <circle cx="70" cy="50" r="18" fill="#3F8A4F" />
          <circle cx="42" cy="30" r="12" fill="#7CCB78" opacity="0.7" />
        </>,
      );
    case "mushroom":
      return box(
        <>
          <path d="M42 100 Q40 80 44 70 H56 Q60 80 58 100 Z" fill="#FFF3E0" />
          <path d="M18 72 Q50 30 82 72 Z" fill="#E5484D" />
          <circle cx="36" cy="60" r="5" fill="#FFFFFF" />
          <circle cx="56" cy="50" r="6" fill="#FFFFFF" />
          <circle cx="70" cy="64" r="4" fill="#FFFFFF" />
          <path d="M70 100 Q69 92 71 88 H77 Q79 92 78 100 Z" fill="#FFF3E0" />
          <path d="M64 89 Q74 74 84 89 Z" fill="#F2994A" />
        </>,
      );
    case "signpost":
      return box(
        <>
          <rect x="46" y="20" width="8" height="80" fill="#8A5A2E" />
          <path d="M54 26 H86 L94 34 L86 42 H54 Z" fill="#D9B27A" stroke="#8A5A2E" strokeWidth="2" />
          <path d="M46 48 H14 L6 56 L14 64 H46 Z" fill="#D9B27A" stroke="#8A5A2E" strokeWidth="2" />
          <text x="70" y="38" textAnchor="middle" fontSize="11" fontWeight="800" fill="#2E5E3E" fontFamily="JetBrains Mono, monospace">if</text>
          <text x="27" y="60" textAnchor="middle" fontSize="10" fontWeight="800" fill="#7A3B2E" fontFamily="JetBrains Mono, monospace">else</text>
        </>,
      );
    case "bush":
      return box(
        <>
          <circle cx="34" cy="82" r="18" fill="#3F8A4F" />
          <circle cx="56" cy="76" r="22" fill="#4FA35D" />
          <circle cx="74" cy="86" r="14" fill="#3F8A4F" />
          <circle cx="50" cy="70" r="3" fill="#E5484D" />
          <circle cx="62" cy="80" r="3" fill="#E5484D" />
          <circle cx="38" cy="78" r="3" fill="#E5484D" />
        </>,
      );
    case "lily":
      return box(
        <>
          <ellipse cx="50" cy="88" rx="40" ry="11" fill="#3FAE6A" />
          <path d="M50 88 L90 82 A40 11 0 0 0 82 78 Z" fill="#3DB5DA" />
          <ellipse cx="50" cy="86" rx="32" ry="7" fill="#57C27E" />
          <g transform="translate(42 76)">
            {[0, 60, 120, 180, 240, 300].map((r) => <ellipse key={r} cx="0" cy="-7" rx="4" ry="8" fill="#FF8FB1" transform={`rotate(${r})`} />)}
            <circle r="4" fill="#FFE066" />
          </g>
        </>,
      );
    case "reed":
      return box(
        <>
          {[30, 42, 54, 66].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 100 Q${x + (i % 2 ? 4 : -4)} 60 ${x + (i % 2 ? 2 : -2)} ${28 + i * 4}`} stroke="#4E9A3A" strokeWidth="3" fill="none" />
              {i % 2 === 0 && <rect x={x - 5} y={30 + i * 4} width="7" height="20" rx="3.5" fill="#8A5A2E" />}
            </g>
          ))}
          <ellipse cx="48" cy="99" rx="30" ry="4" fill="#2C8FB5" opacity="0.6" />
        </>,
      );
    case "buoy":
      return box(
        <>
          <ellipse cx="50" cy="96" rx="26" ry="6" fill="#2C8FB5" opacity="0.6" />
          <path d="M34 94 L40 50 H60 L66 94 Z" fill="#FF5A5F" />
          <rect x="37" y="66" width="26" height="10" fill="#FFFFFF" />
          <rect x="47" y="30" width="6" height="20" fill="#5A6B9C" />
          <motion.circle cx="50" cy="28" r="6" fill="#FFE066" animate={{ opacity: [0.4, 1, 0.4] }} transition={loop(1.2)} />
        </>,
      );
    case "rockisle":
      return box(
        <>
          <ellipse cx="50" cy="96" rx="44" ry="6" fill="#2C8FB5" opacity="0.6" />
          <path d="M14 98 L24 70 L46 60 L74 66 L88 98 Z" fill="#9AA5B8" />
          <path d="M46 60 L74 66 L88 98 L56 98 Z" fill="#7E8AA0" />
          <path d="M24 70 Q40 56 50 62 Q62 58 74 66 Q60 62 46 66 Q34 64 24 70 Z" fill="#6CC46F" />
        </>,
      );
    case "rock":
      return box(
        <>
          <path d="M14 100 L24 64 L46 52 L72 60 L88 100 Z" fill="#A9B2C3" />
          <path d="M46 52 L72 60 L88 100 L56 100 Z" fill="#8E98AC" />
        </>,
      );
    case "snowpine":
      return box(
        <>
          <rect x="45" y="80" width="10" height="20" rx="3" fill="#7A5129" />
          <path d="M50 4 L80 50 H64 L86 82 H14 L36 50 H20 Z" fill="#2F6E58" />
          <path d="M50 4 L64 26 Q56 30 50 24 Q44 30 36 26 Z" fill="#FFFFFF" />
          <path d="M36 50 Q50 58 64 50 L70 58 Q50 64 30 58 Z" fill="#FFFFFF" />
          <path d="M14 82 Q50 90 86 82 L80 76 Q50 84 20 76 Z" fill="#FFFFFF" />
        </>,
      );
    case "snowman":
      return box(
        <>
          <circle cx="50" cy="82" r="18" fill="#FFFFFF" stroke="#C9D6EE" strokeWidth="2" />
          <circle cx="50" cy="54" r="13" fill="#FFFFFF" stroke="#C9D6EE" strokeWidth="2" />
          <circle cx="50" cy="32" r="10" fill="#FFFFFF" stroke="#C9D6EE" strokeWidth="2" />
          <rect x="40" y="40" width="20" height="5" rx="2" fill="#E5484D" />
          <rect x="54" y="42" width="5" height="14" rx="2" fill="#E5484D" />
          <path d="M50 33 l10 2 l-10 2 z" fill="#FF8A00" />
          <circle cx="46" cy="29" r="1.6" fill="#1F2440" />
          <circle cx="54" cy="29" r="1.6" fill="#1F2440" />
          <rect x="41" y="14" width="18" height="10" fill="#1F2440" />
          <rect x="37" y="22" width="26" height="3" fill="#1F2440" />
          <text x="50" y="58" textAnchor="middle" fontSize="8" fontWeight="800" fill="#2D9CDB" fontFamily="JetBrains Mono, monospace">{'"hi"'}</text>
        </>,
      );
    case "iceblock":
      return box(
        <>
          <path d="M20 100 L26 62 L56 56 L80 66 L84 100 Z" fill="#BFE9FF" />
          <path d="M56 56 L80 66 L84 100 L60 100 Z" fill="#8FD3FF" />
          <path d="M30 70 L44 66 M34 80 L50 76" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        </>,
      );
    case "crystal":
      return box(
        <>
          <path d="M40 100 L30 50 L44 20 L56 52 Z" fill="#B394FF" />
          <path d="M44 20 L56 52 L52 100 L40 100 Z" fill="#8B5CF6" />
          <path d="M60 100 L58 60 L70 36 L80 62 L74 100 Z" fill="#7DF9FF" opacity="0.9" />
          <motion.circle cx="56" cy="60" r="26" fill="#C59BFF" opacity="0.15" animate={{ opacity: [0.08, 0.25, 0.08] }} transition={loop(2.2)} />
        </>,
      );
    case "stalagmite":
      return box(
        <>
          <path d="M26 100 L40 30 L52 100 Z" fill="#5A4E92" />
          <path d="M40 30 L52 100 L44 100 Z" fill="#463B7A" />
          <path d="M50 100 L62 52 L74 100 Z" fill="#6A5DA8" />
        </>,
      );
    case "crates":
      return box(
        <>
          {[[16, 64, "0"], [50, 64, "1"], [33, 30, "2"]].map(([x, y, n]) => (
            <g key={n as string}>
              <rect x={x as number} y={y as number} width="34" height="34" fill="#B07A43" stroke="#6B4523" strokeWidth="3" />
              <path d={`M${x} ${y} l34 34 M${(x as number) + 34} ${y} l-34 34`} stroke="#6B4523" strokeWidth="2" opacity="0.5" />
              <rect x={(x as number) + 8} y={(y as number) + 10} width="18" height="14" rx="3" fill="#FFE8B0" />
              <text x={(x as number) + 17} y={(y as number) + 21} textAnchor="middle" fontSize="10" fontWeight="800" fill="#6B4523" fontFamily="JetBrains Mono, monospace">{`[${n}]`}</text>
            </g>
          ))}
        </>,
      );
    case "torch":
      return box(
        <>
          <motion.circle cx="50" cy="30" r="26" fill="#FFB84D" opacity="0.2" animate={{ opacity: [0.12, 0.3, 0.12], r: [22, 28, 22] }} transition={loop(0.9)} />
          <rect x="46" y="40" width="8" height="60" fill="#5C3F2A" />
          <path d="M40 40 H60 L56 48 H44 Z" fill="#8A8FA8" />
          <motion.path d="M50 14 Q60 28 56 36 Q50 42 44 36 Q40 28 50 14 Z" fill="#FF8A00" style={{ originX: 0.5, originY: 1 }} animate={{ scaleY: [1, 1.18, 0.92, 1], scaleX: [1, 0.9, 1.05, 1] }} transition={loop(0.6)} />
          <path d="M50 24 Q55 32 52 36 Q50 38 48 36 Q46 32 50 24 Z" fill="#FFE066" />
        </>,
      );
    case "minecart":
      return box(
        <>
          <path d="M16 56 H84 L78 88 H22 Z" fill="#6C7393" stroke="#3E4463" strokeWidth="3" />
          <path d="M22 56 L30 44 L40 50 L52 40 L62 48 L76 42 L84 56 Z" fill="#8B5CF6" />
          <path d="M40 50 L52 40 L62 48 Z" fill="#7DF9FF" />
          <circle cx="32" cy="92" r="8" fill="#2B2F45" />
          <circle cx="68" cy="92" r="8" fill="#2B2F45" />
        </>,
      );
    case "pillar":
      return box(
        <>
          <rect x="34" y="20" width="32" height="76" fill="#D7D9E3" />
          <rect x="54" y="20" width="12" height="76" fill="#B9BCCB" />
          <rect x="28" y="12" width="44" height="10" rx="2" fill="#C5C8D6" />
          <rect x="28" y="92" width="44" height="8" rx="2" fill="#C5C8D6" />
          <path d="M40 30 h20 v30 l-10 -6 l-10 6 z" fill="#E5484D" />
          <text x="50" y="46" textAnchor="middle" fontSize="9" fontWeight="800" fill="#FFE066" fontFamily="JetBrains Mono, monospace">{"{}"}</text>
        </>,
      );
    case "banner":
      return box(
        <>
          <rect x="30" y="8" width="5" height="92" fill="#5C3F2A" />
          <circle cx="32.5" cy="8" r="4" fill="#FFC83D" />
          <motion.path d="M35 14 H76 V58 L56 48 L35 58 Z" fill="#8B5CF6" style={{ originX: 0, originY: 0.5 }} animate={{ skewY: [0, 4, 0, -3, 0] }} transition={loop(2.4)} />
          <text x="55" y="38" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFE066" fontFamily="JetBrains Mono, monospace">new</text>
        </>,
      );
    case "hedge":
      return box(
        <>
          <rect x="14" y="60" width="72" height="40" rx="12" fill="#3F8A4F" />
          <rect x="20" y="54" width="60" height="16" rx="8" fill="#4FA35D" />
          <circle cx="50" cy="40" r="14" fill="#4FA35D" />
          <circle cx="46" cy="36" r="5" fill="#7CCB78" opacity="0.7" />
        </>,
      );
    case "lamp":
      return box(
        <>
          <rect x="47" y="30" width="6" height="70" fill="#3A2440" />
          <path d="M38 30 H62 L58 12 H42 Z" fill="#3A2440" />
          <motion.rect x="43" y="15" width="14" height="13" fill="#FFD66B" animate={{ opacity: [0.75, 1, 0.75] }} transition={loop(1.6)} />
          <motion.circle cx="50" cy="22" r="22" fill="#FFD66B" opacity="0.18" animate={{ opacity: [0.1, 0.25, 0.1] }} transition={loop(1.6)} />
        </>,
      );
    case "obelisk":
      return box(
        <>
          <path d="M40 100 L44 20 L50 8 L56 20 L60 100 Z" fill="#3B3F8F" />
          <path d="M50 8 L56 20 L60 100 L50 100 Z" fill="#2B2F6B" />
          <text x="50" y="56" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontWeight="800" fontSize="9" fill="#FFC83D">{"{}"}</text>
          <motion.circle cx="50" cy="22" r="3" fill="#FFC83D" animate={{ r: [2.5, 4, 2.5] }} transition={loop(1.4)} />
        </>,
      );
    case "holo":
      return box(
        <>
          <ellipse cx="50" cy="96" rx="20" ry="5" fill="#7DF9FF" opacity="0.6" />
          <rect x="34" y="88" width="32" height="10" rx="3" fill="#22265C" />
          <motion.path d="M38 88 L42 20 H58 L62 88 Z" fill="#7DF9FF" opacity="0.18" animate={{ opacity: [0.1, 0.28, 0.1] }} transition={loop(1.8)} />
          <motion.g animate={{ y: [0, -6, 0] }} transition={loop(2.2)}>
            <path d="M50 30 L62 46 L50 62 L38 46 Z" fill="none" stroke="#7DF9FF" strokeWidth="3" />
            <text x="50" y="50" textAnchor="middle" fontSize="9" fontWeight="800" fill="#FFC83D" fontFamily="JetBrains Mono, monospace">O(1)</text>
          </motion.g>
        </>,
      );
    case "server":
      return box(
        <>
          <rect x="30" y="24" width="40" height="76" rx="4" fill="#1B1E46" stroke="#4D52A8" strokeWidth="2" />
          {[32, 48, 64, 80].map((y, i) => (
            <g key={y}>
              <rect x="36" y={y} width="28" height="10" rx="2" fill="#2B2F6B" />
              <motion.circle cx="58" cy={y + 5} r="2.2" fill={i % 2 ? "#3EE07A" : "#FFC83D"} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.6 + i * 0.25, repeat: Infinity }} />
            </g>
          ))}
        </>,
      );
  }
}
