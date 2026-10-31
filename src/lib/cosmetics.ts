import type { ShopItem } from "./game";

export const WEAPON_PALETTES = [
  { id: "crimson", name: "Crimson", color: "#FF426C" },
  { id: "glacier", name: "Glacier", color: "#58DFFF" },
  { id: "violet", name: "Void", color: "#A77BFF" },
  { id: "jade", name: "Jade", color: "#47F5B5" },
  { id: "solar", name: "Solar", color: "#FFD368" },
] as const;
export const WEAPON_TYPES = ["scythe", "hammer", "glaive"] as const;
export type WeaponType = (typeof WEAPON_TYPES)[number];
export const WEAPONS = WEAPON_TYPES.flatMap((type) => WEAPON_PALETTES.map((palette) => ({
  value: `${type}-${palette.id}`, type, color: palette.color,
  name: `${palette.name} ${type === "scythe" ? "Scythe" : type === "hammer" ? "Warhammer" : "Glaive"}`,
  price: type === "scythe" ? 450 : type === "hammer" ? 400 : 500,
})));
export const weaponSpec = (value?: string) => WEAPONS.find((weapon) => weapon.value === value);

export const HEADWEAR = [
  { value: "wizard", name: "Arcane Wizard", price: 350, blurb: "A sweeping sorcerer's hat with a star charm." },
  { value: "cap", name: "Backwards Cap", price: 200, blurb: "Streetwear with an energy-lit snapback." },
  { value: "beanie", name: "Pixel Beanie", price: 200, blurb: "A ribbed knit cap with a glowing pom-pom." },
  { value: "crown", name: "Glitch Crown", price: 600, blurb: "A sharp digital crown for a future champion." },
  { value: "samurai", name: "Ronin Kabuto", price: 500, blurb: "A samurai crest with sweeping energy horns." },
  { value: "headphones", name: "Bass Breaker", price: 300, blurb: "Oversized headphones with waveform earcups." },
  { value: "cat", name: "Cyber Cat", price: 300, blurb: "Angular cat ears with luminous inner panels." },
  { value: "bear", name: "Circuit Bear", price: 250, blurb: "Round bear ears with bright circuit centers." },
  { value: "antlers", name: "Forest Monarch", price: 450, blurb: "Branching crystalline antlers." },
  { value: "afro", name: "Cosmic Afro", price: 350, blurb: "A huge cloud of starlit curls." },
  { value: "mohawk", name: "Voltage Mohawk", price: 350, blurb: "A towering row of electric spikes." },
  { value: "spikes", name: "Supernova Hair", price: 450, blurb: "Wild, gravity-defying anime hair." },
  { value: "ponytail", name: "Comet Ponytail", price: 300, blurb: "A high ponytail with a long comet sweep." },
  { value: "beard", name: "Rune Beard", price: 300, blurb: "A braided wizard beard with a rune clasp." },
  { value: "top-hat", name: "Midnight Magician", price: 400, blurb: "A tilted top hat with a diamond band." },
] as const;

export const EXTRA_FINISHES = [
  { value: "carbon", name: "Carbon Weave", price: 300, blurb: "Dark woven carbon with diagonal metallic fibers." },
  { value: "obsidian", name: "Obsidian Rift", price: 500, blurb: "Volcanic glass split by energy-colored fractures." },
  { value: "hologram", name: "Holographic", price: 550, blurb: "Translucent scan bands and interference lines." },
  { value: "scales", name: "Dragon Scale", price: 450, blurb: "Overlapping energy-edged dragon scales." },
  { value: "galaxy", name: "Pocket Galaxy", price: 700, blurb: "A midnight shell filled with a tiny starfield." },
  { value: "prism", name: "Prismatic", price: 650, blurb: "Faceted armor that refracts a spectrum of color." },
  { value: "frozen", name: "Permafrost", price: 500, blurb: "Icy branches and frosted crystal edges." },
  { value: "magma", name: "Molten Core", price: 600, blurb: "Dark plates separated by rivers of glowing energy." },
] as const;

export const EXTRA_AURAS = [
  { value: "singularity", name: "Event Horizon", price: 1500, colors: ["#A172FF", "#FF79D5"], blurb: "A dark singularity with warped, spinning accretion arcs." },
  { value: "meteor", name: "Meteor Shower", price: 850, colors: ["#FF654A", "#FFDA75"], blurb: "Blazing meteors streak past your warrior." },
  { value: "crystal", name: "Crystal Ascension", price: 1100, colors: ["#B89AFF", "#BDF7FF"], blurb: "A floating constellation of violet crystal shards." },
  { value: "tentacles", name: "Abyssal Grasp", price: 1400, colors: ["#D950E5", "#FFB3E8"], blurb: "Four spectral tentacles rise from the void." },
  { value: "matrix", name: "Code Rain", price: 1000, colors: ["#6CF88C", "#D3FFA2"], blurb: "Cascading columns of green binary code." },
  { value: "spirit-koi", name: "Twin Spirit Koi", price: 1300, colors: ["#41D9E8", "#FFAA68"], blurb: "Two luminous koi weave around you in opposite directions." },
  { value: "thornbloom", name: "Thorn Sovereign", price: 950, colors: ["#43DBA7", "#FF91C5"], blurb: "Living emerald vines with pink energy blossoms." },
  { value: "solar", name: "Solar Flare", price: 1200, colors: ["#FFBD40", "#FFF1AB"], blurb: "A blazing corona of long, rotating solar rays." },
  { value: "planets", name: "Orbital System", price: 1500, colors: ["#5E9FFF", "#B5BFFF"], blurb: "A miniature planetary system with three orbiting worlds." },
  { value: "sandstorm", name: "Desert Phantom", price: 900, colors: ["#DE9855", "#FFE5B0"], blurb: "Spiraling gold dust with ancient floating glyphs." },
] as const;
export const EXTRA_AURA_COLORS: Record<string, readonly [string, string]> = Object.fromEntries(EXTRA_AURAS.map((a) => [a.value, a.colors]));

export const EXTRA_COSMETICS: ShopItem[] = [
  { id: "weapon-saber", kind: "weapon", name: "Classic Energy Blade", price: 0, value: "saber", blurb: "Your original blade, matching your energy color." },
  ...WEAPONS.map((w): ShopItem => ({ id: `weapon-${w.value}`, kind: "weapon", name: w.name, price: w.price, value: w.value,
    blurb: w.type === "scythe" ? "A long reaper's staff and a sweeping crescent blade." : w.type === "hammer" ? "A heavy impact head with an exposed energy reactor." : "A double-ended polearm with crystalline spearheads." })),
  { id: "headwear-none", kind: "headwear", name: "Original Look", price: 0, value: "none", blurb: "Your frame's original crest or hairstyle." },
  ...HEADWEAR.map((h): ShopItem => ({ ...h, id: `headwear-${h.value}`, kind: "headwear", blurb: `${h.blurb} Matches your energy color.` })),
  ...EXTRA_FINISHES.map((f): ShopItem => ({ ...f, id: `finish-${f.value}`, kind: "finish" })),
  ...EXTRA_AURAS.map((a): ShopItem => ({ id: `aura-${a.value}`, kind: "aura", name: a.name, price: a.price, value: a.value, blurb: a.blurb })),
];
