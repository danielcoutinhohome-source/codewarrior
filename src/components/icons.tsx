"use client";

import { useEffect, useState } from "react";
import { isMuted, play, setMuted } from "@/lib/sfx";
import type { Power } from "@/lib/game";

export const CoinIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="9.5" fill="#FFC83D" stroke="#E5A300" strokeWidth="2.5" />
    <text x="12" y="15.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#8A6400" fontFamily="JetBrains Mono, monospace">{"{}"}</text>
  </svg>
);

export const FlameIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" fill="#FF8A00" />
  </svg>
);

export const StarIcon = ({ size = 18, on = true }: { size?: number; on?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill={on ? "#FFC83D" : "#D7DEEA"} stroke={on ? "#E5A300" : "#B8C2D4"} strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export function PowerIcon({ kind, size = 30 }: { kind: Power | string; size?: number }) {
  if (kind === "potion")
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id="cw-pot-liq" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#FF9AB0" />
            <stop offset="55%" stopColor="#FF2E63" />
            <stop offset="100%" stopColor="#A3002E" />
          </radialGradient>
          <linearGradient id="cw-pot-cap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF1B0" />
            <stop offset="100%" stopColor="#C98E00" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="20" r="11" fill="#FF2E63" opacity="0.22" />
        <path d="M12.5 8.5 h7 v4.2 a9 9 0 1 1 -7 0 z" fill="#EAF6FF" fillOpacity="0.55" stroke="#4A2A55" strokeWidth="1.6" />
        <path d="M7.5 17 q4.25 -2.6 8.5 0 t8.5 0 A9 9 0 1 1 7.5 17 z" fill="url(#cw-pot-liq)" />
        <path d="M16 20.4 c-1-1.3-3-0.7-2.7 0.9 c0.25 1.2 1.7 2 2.7 2.9 c1-0.9 2.45-1.7 2.7-2.9 c0.3-1.6-1.7-2.2-2.7-0.9 z" fill="#FFFFFF" opacity="0.95" />
        <circle cx="11" cy="22.5" r="1.1" fill="#FFFFFF" opacity="0.6" />
        <circle cx="21.5" cy="24.5" r="0.9" fill="#FFFFFF" opacity="0.6" />
        <circle cx="19.5" cy="17.6" r="0.7" fill="#FFFFFF" opacity="0.7" />
        <path d="M10.4 15.2 q-1.6 2.6 -1 5.4" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.85" />
        <rect x="11.2" y="5" width="9.6" height="4.4" rx="1.6" fill="url(#cw-pot-cap)" stroke="#8A5A00" strokeWidth="1" />
        <circle cx="16" cy="7.2" r="1.2" fill="#FF2E63" />
        <path d="M26 5 l0.8 1.8 1.8 0.8 -1.8 0.8 -0.8 1.8 -0.8 -1.8 -1.8 -0.8 1.8 -0.8 z" fill="#FFE066" />
      </svg>
    );
  if (kind === "shield")
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="cw-fw" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7DF9FF" />
            <stop offset="100%" stopColor="#2D7DB5" />
          </linearGradient>
        </defs>
        <path d="M16 3 C11 6 7 6 4.5 6 C4.5 17 8 25 16 29.5 C24 25 27.5 17 27.5 6 C25 6 21 6 16 3 Z" fill="url(#cw-fw)" stroke="#1D4F7A" strokeWidth="1.6" strokeLinejoin="round" />
        <g stroke="#E6FBFF" strokeWidth="1.3" strokeOpacity="0.8" fill="none">
          <path d="M6.5 12 H25.5 M7.5 17 H24.5 M9.5 22 H22.5" />
          <path d="M12 7.5 V12 M20 7.5 V12 M16 12 V17 M11 17 V22 M21 17 V22 M16 22 V27" />
        </g>
        <path d="M16 9 c2.6 2.4 3.6 4.6 2.2 7 c1-0.4 1.6-1.2 1.8-2.2 c1.6 2.6 0.6 6.2-4 6.8 c-4.6-0.6-5.6-4.6-3.4-7.4 c0 1 0.6 1.8 1.4 2.2 c-0.8-2.2 0.4-4.4 2-6.4 z" fill="#FF8A00" stroke="#FFFFFF" strokeWidth="1" strokeLinejoin="round" />
      </svg>
    );
  if (kind === "surge")
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="13" fill="#FFF1C2" stroke="#FFC83D" strokeWidth="2" />
        <path d="M18 4L9 18h6l-2 10 10-15h-6z" fill="#FF8A00" stroke="#D96F00" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect x="6" y="5" width="20" height="22" rx="3" fill="#F3E8C8" stroke="#A8865A" strokeWidth="2" />
      <rect x="4" y="3" width="24" height="5" rx="2.5" fill="#C9A26B" />
      <rect x="4" y="24" width="24" height="5" rx="2.5" fill="#C9A26B" />
      <path d="M10 13h12M10 17h9M10 21h11" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SoundToggle({ dark = false }: { dark?: boolean }) {
  const [muted, setM] = useState(false);
  useEffect(() => setM(isMuted()), []);
  return (
    <button
      type="button"
      onClick={() => {
        const m = !muted;
        setMuted(m);
        setM(m);
        if (!m) play("coin");
      }}
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
      aria-pressed={!muted}
      className="grid h-10 w-10 place-items-center rounded-xl transition-colors"
      style={{ background: dark ? "rgba(255,255,255,.12)" : "#E2F3FF", color: dark ? "#FFFFFF" : "#1F7DB5" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" />}
      </svg>
    </button>
  );
}
