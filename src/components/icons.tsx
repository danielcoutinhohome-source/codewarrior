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
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <rect x="12" y="3" width="8" height="6" rx="2" fill="#B98250" />
        <path d="M11 9h10v3l5 8a7 7 0 0 1-6 10h-8a7 7 0 0 1-6-10l5-8z" fill="#3EC46D" stroke="#2BA155" strokeWidth="2" />
        <path d="M9 21h14" stroke="#B6F5C8" strokeWidth="2" strokeLinecap="round" />
        <circle cx="13" cy="24" r="1.6" fill="#FFFFFF" opacity=".8" />
      </svg>
    );
  if (kind === "shield")
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <polygon points="16,3 28,10 28,22 16,29 4,22 4,10" fill="#7FC8FF" stroke="#2D7DB5" strokeWidth="2" />
        <polygon points="16,8 23,12 23,20 16,24 9,20 9,12" fill="#D9F1FF" />
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
