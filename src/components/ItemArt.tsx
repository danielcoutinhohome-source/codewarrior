"use client";

import Warrior from "./Warrior";
import { PowerIcon } from "./icons";
import type { Avatar } from "@/lib/db";
import type { ShopItem } from "@/lib/game";
import { darken, lighten } from "@/lib/color";

// A small picture of a shop item, drawn on the player's own warrior where it helps.
export default function ItemArt({ it, avatar, size = 84 }: { it: ShopItem; avatar: Avatar; size?: number }) {
  if (it.kind === "power") return <PowerIcon kind={it.id} size={size * 0.62} />;
  if (it.kind === "armor")
    return (
      <span className="block rounded-full" style={{ width: size * 0.6, height: size * 0.6, background: `radial-gradient(circle at 35% 30%, ${lighten(it.value, 0.5)}, ${it.value} 55%, ${darken(it.value, 0.5)})`, boxShadow: "0 4px 0 rgba(31,36,64,.18)" }} />
    );
  if (it.kind === "energy")
    return (
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 40 40" aria-hidden>
        <rect x="16" y="2" width="8" height="28" rx="4" fill={it.value} opacity="0.45" style={{ filter: "blur(2px)" }} />
        <rect x="17.5" y="3" width="5" height="26" rx="2.5" fill={it.value} />
        <rect x="19.2" y="5" width="1.6" height="22" rx="0.8" fill="#FFFFFF" />
        <rect x="12" y="29" width="16" height="4" rx="2" fill="#FFC83D" />
        <rect x="18" y="33" width="4" height="6" rx="2" fill="#3B4058" />
      </svg>
    );
  if (it.kind === "title")
    return <span className="rounded-xl bg-ink px-2 py-1 text-center font-display text-[13px] leading-tight text-gold">{it.value}</span>;
  // finish and aura: show them on the warrior
  return (
    <Warrior
      armor={avatar.armor}
      energy={avatar.energy}
      finish={it.kind === "finish" ? it.value : avatar.finish}
      aura={it.kind === "aura" ? it.value : "none"}
      size={size * 0.62}
      idle={it.kind === "aura"}
    />
  );
}
