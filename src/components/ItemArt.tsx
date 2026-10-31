"use client";

import Warrior from "./Warrior";
import { PowerIcon } from "./icons";
import type { Avatar } from "@/lib/db";
import type { ShopItem } from "@/lib/game";
import { RAINBOW_STOPS, paintCss } from "@/lib/color";

// A small picture of a shop item, drawn on the player's own warrior where it helps.
export default function ItemArt({ it, avatar, size = 84 }: { it: ShopItem; avatar: Avatar; size?: number }) {
  if (it.kind === "power") return <PowerIcon kind={it.id} size={size * 0.62} />;
  if (it.kind === "armor")
    return (
      <span
        className={`block rounded-full ${it.value === "rainbow" ? "cw-spin" : ""}`}
        style={{ width: size * 0.6, height: size * 0.6, background: paintCss(it.value), boxShadow: it.value === "gold" ? "0 0 14px 2px rgba(255,200,61,.65), 0 4px 0 rgba(31,36,64,.18)" : "0 4px 0 rgba(31,36,64,.18)" }}
      />
    );
  if (it.kind === "energy") {
    const g = `cw-ie-${it.id}`;
    const fill = it.value === "rainbow" || it.value === "gold" ? `url(#${g})` : it.value;
    return (
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 40 40" aria-hidden>
        <defs>
          <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
            {(it.value === "gold" ? ["#FFF6C8", "#FFC83D", "#B97F00"] : RAINBOW_STOPS).map((c, i, a) => (
              <stop key={i} offset={`${(i / (a.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </linearGradient>
        </defs>
        <rect x="16" y="2" width="8" height="28" rx="4" fill={fill} opacity="0.45" style={{ filter: "blur(2px)" }} />
        <path d="M17.5 29 V7 L20 2.5 L22.5 7 V29 Z" fill={fill} />
        <rect x="19.3" y="6" width="1.4" height="21" rx="0.7" fill="#FFFFFF" />
        <path d="M11 30 Q15.5 28 20 29.5 Q24.5 28 29 30 Q24.5 32.5 20 31.5 Q15.5 32.5 11 30 Z" fill="#FFC83D" stroke="#9A6A00" strokeWidth="0.6" />
        <rect x="18.2" y="31.5" width="3.6" height="6" rx="1.6" fill="#3B4058" />
      </svg>
    );
  }
  if (it.kind === "title")
    return <span className="rounded-xl bg-ink px-2 py-1 text-center font-display text-[13px] leading-tight text-gold">{it.value}</span>;
  // body, finish and aura: show them on the warrior
  return (
    <Warrior
      body={it.kind === "body" ? it.value : avatar.body}
      armor={avatar.armor}
      energy={avatar.energy}
      finish={it.kind === "finish" ? it.value : avatar.finish}
      aura={it.kind === "aura" ? it.value : "none"}
      size={size * (it.kind === "aura" ? 0.56 : 0.62)}
      idle={it.kind === "aura"}
    />
  );
}
