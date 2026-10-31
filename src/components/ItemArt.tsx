"use client";

import Warrior from "./Warrior";
import { useId } from "react";
import { Headwear, WeaponArt } from "./WarriorGear";
import { weaponSpec } from "@/lib/cosmetics";
import { PowerIcon } from "./icons";
import type { Avatar } from "@/lib/db";
import type { ShopItem } from "@/lib/game";
import { RAINBOW_STOPS, paintCss, solid, lighten, darken } from "@/lib/color";

// A small picture of a shop item, drawn on the player's own warrior where it helps.
export default function ItemArt({ it, avatar, size = 84 }: { it: ShopItem; avatar: Avatar; size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const hairId = `item-hair-${uid}`;
  const spec = it.kind === "weapon" ? weaponSpec(it.value) : undefined;
  if (spec) return <svg width={size * 0.8} height={size * 0.9} viewBox="115 -8 112 246" aria-hidden="true"><WeaponArt value={it.value} paint={(name) => name === "weapon" ? solid(avatar.energy) : "#64748B"}/></svg>;
  if (it.kind === "headwear" && it.value !== "none") {
    const color = solid(avatar.energy);
    const stops = avatar.energy === "rainbow" ? RAINBOW_STOPS : avatar.energy === "gold" ? ["#FFF6C8", "#FFC83D", "#B97F00"] : [lighten(color, 0.4), color, darken(color, 0.45)];
    return <svg width={size * 0.9} height={size * 0.85} viewBox={it.value === "beard" ? "36 78 128 70" : "10 -48 180 158"} aria-hidden="true">
      <defs><linearGradient id={hairId} x1="0" y1="0" x2="0" y2="1">{stops.map((color, i) => <stop key={i} offset={`${i / (stops.length - 1) * 100}%`} stopColor={color}/>)}</linearGradient></defs>
      <Headwear kind={it.value} paint={() => `url(#${hairId})`}/>
    </svg>;
  }
  if (it.kind === "power") return <PowerIcon kind={it.id} size={size * 0.62} />;
  if (it.kind === "energy" || it.kind === "armor")
    return (
      <span
        className={`block rounded-full ${it.value === "rainbow" ? "cw-spin" : ""}`}
        style={{ width: size * 0.6, height: size * 0.6, background: paintCss(it.value), border: "4px solid #FFFFFF", boxShadow: it.value === "gold" ? "0 0 14px 2px rgba(255,200,61,.65), 0 4px 0 rgba(31,36,64,.18)" : `0 0 12px ${solid(it.value)}66, 0 4px 0 rgba(31,36,64,.18)` }}
      />
    );

  if (it.kind === "title")
    return <span className="rounded-xl bg-ink px-2 py-1 text-center font-display text-[13px] leading-tight text-gold">{it.value}</span>;
  // body, finish and aura: show them on the warrior
  return (
    <Warrior
      body={it.kind === "body" ? it.value : avatar.body}
      armor={avatar.armor}
      energy={avatar.energy}
      weapon={it.kind === "weapon" ? it.value : avatar.weapon}
      headwear={it.kind === "headwear" ? it.value : avatar.headwear}
      finish={it.kind === "finish" ? it.value : avatar.finish}
      aura={it.kind === "aura" ? it.value : "none"}
      size={size * (it.kind === "aura" ? 0.56 : 0.62)}
      idle={false}
    />
  );
}
