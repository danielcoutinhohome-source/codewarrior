// Static game data: worlds, enemies, rewards and the shop catalog.

export type Body = "blob" | "imp" | "bat" | "ghost" | "golem" | "crab" | "serpent" | "tower" | "eye";

export type Enemy = {
  name: string;
  body: Body;
  color: string;
  label: string; // the bug it carries, shown on its sign
  eyes?: 1 | 2 | 3;
  horns?: boolean;
};

export type Decor = "palm" | "pine" | "rock" | "crystal" | "pillar" | "lily" | "obelisk";

export type Theme = {
  skyTop: string;
  skyBottom: string;
  far: string; // distant hills or peaks
  groundNear: string;
  groundFar: string;
  road: string;
  roadEdge: string;
  roadLine: string;
  fog: string;
  decor: Decor[];
  night?: boolean;
  peaks?: boolean;
};

export type Bridge = { n: number; name: string; url: string };

export type World = {
  name: string;
  topic: string;
  enemies: Enemy[]; // 4 battles then the boss
  theme: Theme;
  bossTitle: string; // title earned for beating the boss
  bridges: Bridge[]; // LeetCode problems this world prepares you for
};

const lc = (n: number, name: string, slug: string): Bridge => ({ n, name, url: `https://leetcode.com/problems/${slug}/` });

export const WORLDS: World[] = [
  {
    name: "Syntax Shore",
    topic: "Variables, math, return",
    bossTitle: "Compile Crusher",
    bridges: [],
    enemies: [
      { name: "Typo Imp", body: "imp", color: "#FF8FA3", label: "Sytem.out" },
      { name: "Semicolon Slime", body: "blob", color: "#7BD389", label: "x = 5" },
      { name: "Type Mismatch Crab", body: "crab", color: "#FFB347", label: 'int s="hi"' },
      { name: "Rounding Bat", body: "bat", color: "#9B8CFF", label: "7/2 = 3" },
      { name: "The Compile Error", body: "golem", color: "#E5484D", label: "ERROR", horns: true },
    ],
    theme: { skyTop: "#5CB8F5", skyBottom: "#D9F2FF", far: "#7CCDF2", groundNear: "#F0D58C", groundFar: "#F7E7B8", road: "#FFF6DD", roadEdge: "#E3C27A", roadLine: "#E8D3A0", fog: "#F2FAFF", decor: ["palm", "rock"] },
  },
  {
    name: "Branch Woods",
    topic: "if / else, booleans",
    bossTitle: "Branch Breaker",
    bridges: [],
    enemies: [
      { name: "Else Sprite", body: "ghost", color: "#7FDCD9", label: "else" },
      { name: "Boolean Bat", body: "bat", color: "#6C63FF", label: "true" },
      { name: "Modulo Crab", body: "crab", color: "#F7A072", label: "% 2" },
      { name: "Nested Newt", body: "serpent", color: "#7ED957", label: "if{if{" },
      { name: "The Dangling Else", body: "ghost", color: "#5B4B8A", label: "else ?", eyes: 3 },
    ],
    theme: { skyTop: "#7FCBA0", skyBottom: "#E6F7DD", far: "#5FA873", groundNear: "#5DB54C", groundFar: "#8ED37A", road: "#D9B27A", roadEdge: "#A87E47", roadLine: "#C69D63", fog: "#EEF8EA", decor: ["pine", "rock"] },
  },
  {
    name: "Loop Lagoon",
    topic: "for, while, counting",
    bossTitle: "Loop Legend",
    bridges: [lc(412, "Fizz Buzz", "fizz-buzz")],
    enemies: [
      { name: "Counter Crab", body: "crab", color: "#FF7B54", label: "i++" },
      { name: "While Wisp", body: "ghost", color: "#8FD3FF", label: "while" },
      { name: "Off-By-One Goblin", body: "imp", color: "#4CC764", label: "i <= n", eyes: 1 },
      { name: "Break Beetle", body: "crab", color: "#5A6B9C", label: "break" },
      { name: "The Infinite Serpent", body: "serpent", color: "#21B8A8", label: "while(true)", horns: true },
    ],
    theme: { skyTop: "#4FC3F0", skyBottom: "#D3F3FF", far: "#86D9C7", groundNear: "#3DB5DA", groundFar: "#7FD3EA", road: "#C99A5E", roadEdge: "#8E6538", roadLine: "#A8793F", fog: "#E8F8FF", decor: ["lily", "palm"] },
  },
  {
    name: "String Peaks",
    topic: "length, substring, equals",
    bossTitle: "String Sorcerer",
    bridges: [lc(344, "Reverse String", "reverse-string")],
    enemies: [
      { name: "Index Yeti", body: "golem", color: "#DCE6F7", label: "[0]" },
      { name: "Substring Snake", body: "serpent", color: "#C77DFF", label: "sub(0,3)" },
      { name: "Char Chimera", body: "imp", color: "#FF9F8A", label: "'c'", horns: true },
      { name: "Equals Echo", body: "ghost", color: "#AFB8FF", label: "==" },
      { name: "The Null Phantom", body: "ghost", color: "#3E436E", label: "null", eyes: 1, horns: true },
    ],
    theme: { skyTop: "#9DB4FF", skyBottom: "#EEF2FF", far: "#FFFFFF", groundNear: "#E3EAF6", groundFar: "#F3F6FC", road: "#C2CDE2", roadEdge: "#97A6C4", roadLine: "#AEBBD6", fog: "#F7F9FF", decor: ["pine", "crystal"], peaks: true },
  },
  {
    name: "Array Caverns",
    topic: "arrays, ArrayList",
    bossTitle: "Array Admiral",
    bridges: [lc(1, "Two Sum", "two-sum")],
    enemies: [
      { name: "Bounds Bat", body: "bat", color: "#8E7DFF", label: "[5]" },
      { name: "Length Lurker", body: "blob", color: "#5E60CE", label: ".length", eyes: 3 },
      { name: "Swap Spider", body: "crab", color: "#FF6B9A", label: "tmp" },
      { name: "ArrayList Ant", body: "imp", color: "#F4A261", label: "add()" },
      { name: "The Out-of-Bounds Ogre", body: "golem", color: "#7B4FC4", label: "[-1]", horns: true },
    ],
    theme: { skyTop: "#2A2350", skyBottom: "#5B4D9E", far: "#3A3070", groundNear: "#3D3466", groundFar: "#5A4E92", road: "#7C6DC0", roadEdge: "#5A4C99", roadLine: "#A699E8", fog: "#8F7FE0", decor: ["crystal", "rock"], night: true },
  },
  {
    name: "Class Castle",
    topic: "2D arrays, classes, recursion",
    bossTitle: "Stack Survivor",
    bridges: [lc(1480, "Running Sum of 1d Array", "running-sum-of-1d-array")],
    enemies: [
      { name: "Grid Gremlin", body: "imp", color: "#7FC8A9", label: "[r][c]" },
      { name: "Constructor Crow", body: "bat", color: "#3B3F5C", label: "new" },
      { name: "This Thief", body: "ghost", color: "#B8C1CC", label: "this." },
      { name: "Base Case Bat", body: "bat", color: "#E76F51", label: "n <= 1", eyes: 3 },
      { name: "The Stack Overflow", body: "tower", color: "#8B5CF6", label: "fact(n)" },
    ],
    theme: { skyTop: "#FF9F86", skyBottom: "#FFE0B8", far: "#C77E78", groundNear: "#8F92A6", groundFar: "#B5B7C6", road: "#C9CBD8", roadEdge: "#8D90A4", roadLine: "#A9ACBE", fog: "#FFF0E3", decor: ["pillar", "rock"] },
  },
  {
    name: "LeetCode Citadel",
    topic: "Real interview problems",
    bossTitle: "LeetCode Legend",
    bridges: [
      lc(1, "Two Sum", "two-sum"),
      lc(121, "Best Time to Buy and Sell Stock", "best-time-to-buy-and-sell-stock"),
      lc(125, "Valid Palindrome", "valid-palindrome"),
      lc(88, "Merge Sorted Array", "merge-sorted-array"),
      lc(485, "Max Consecutive Ones", "max-consecutive-ones"),
      lc(217, "Contains Duplicate", "contains-duplicate"),
    ],
    enemies: [
      { name: "Two Sum Titan", body: "golem", color: "#FFC83D", label: "#1" },
      { name: "Stock Sorcerer", body: "imp", color: "#3FB58F", label: "#121", horns: true },
      { name: "Palindrome Paladin", body: "ghost", color: "#4CC9F0", label: "#125" },
      { name: "Merge Minotaur", body: "crab", color: "#F94144", label: "#88", horns: true },
      { name: "The Final Judge", body: "eye", color: "#FF3D7F", label: "Accepted?" },
    ],
    theme: { skyTop: "#14173A", skyBottom: "#3B3F8F", far: "#23275C", groundNear: "#262A55", groundFar: "#363B7A", road: "#FFC83D", roadEdge: "#C99400", roadLine: "#FFF1B0", fog: "#6D72D6", decor: ["obelisk", "crystal"], night: true },
  },
];

export const BATTLES_PER_WORLD = 5; // 4 battles + boss
export const BOSS = 4;
export const QUESTIONS_PER_BATTLE = 5;
export const QUESTIONS_PER_BOSS = 8;

export const key = (w: number, b: number) => `w${w}-b${b}`;

// Rewards
export const XP_PER_LEVEL = 300;
export const levelFor = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;
export function rewardFor(stars: number, boss: boolean, replay: boolean) {
  const coins = boss ? 60 + 15 * stars : 20 + 5 * stars;
  const xp = boss ? 100 : 30;
  return { coins: replay ? Math.round(coins / 2) : coins, winXp: replay ? Math.round(xp / 2) : xp };
}
export const XP_PER_CORRECT = 10;

// Battle tuning
export const PLAYER_HP = 100;
export const enemyHit = (world: number, boss: boolean) => (boss ? 30 + 2 * world : 16 + 2 * world);

// Shop
export type ItemKind = "power" | "body" | "armor" | "energy" | "finish" | "aura" | "title";
export type ShopItem = {
  id: string;
  kind: ItemKind;
  name: string;
  price: number; // 0 = free starter item, -1 = earned only
  value: string; // color, finish id, aura id, or title text
  blurb: string;
  earnedBy?: string;
};

export const POWERS = ["potion", "shield", "surge", "scroll"] as const;
export type Power = (typeof POWERS)[number];

export const SHOP: ShopItem[] = [
  { id: "potion", kind: "power", name: "Health Potion", price: 40, value: "potion", blurb: "Heals 35 HP in battle." },
  { id: "shield", kind: "power", name: "Firewall", price: 50, value: "shield", blurb: "Raises an energy wall that blocks the next enemy hit." },
  { id: "surge", kind: "power", name: "Power Surge", price: 60, value: "surge", blurb: "Your next correct answer hits twice as hard." },
  { id: "scroll", kind: "power", name: "Hint Scroll", price: 30, value: "scroll", blurb: "Shows a hint. That question counts as a miss." },

  { id: "body-bot", kind: "body", name: "Classic", price: 0, value: "bot", blurb: "Round hover bot." },
  { id: "body-titan", kind: "body", name: "Titan", price: 0, value: "titan", blurb: "Big, blocky and tough." },
  { id: "body-valkyrie", kind: "body", name: "Valkyrie", price: 0, value: "valkyrie", blurb: "Sleek triangle frame with long flowing hair." },

  { id: "armor-ocean", kind: "armor", name: "Ocean", price: 0, value: "#2D9CDB", blurb: "Starter armor." },
  { id: "armor-ember", kind: "armor", name: "Ember", price: 0, value: "#FF8A00", blurb: "Starter armor." },
  { id: "armor-shadow", kind: "armor", name: "Shadow", price: 0, value: "#3B4058", blurb: "Starter armor." },
  { id: "armor-jade", kind: "armor", name: "Jade", price: 120, value: "#27AE60", blurb: "Bright green plating." },
  { id: "armor-violet", kind: "armor", name: "Violet", price: 120, value: "#8B5CF6", blurb: "Royal purple shell." },
  { id: "armor-ruby", kind: "armor", name: "Ruby", price: 140, value: "#E5484D", blurb: "Gem red." },
  { id: "armor-forest", kind: "armor", name: "Forest", price: 150, value: "#2F7A45", blurb: "Deep green plating." },
  { id: "armor-crimson", kind: "armor", name: "Crimson", price: 250, value: "#A8172B", blurb: "Battle-hardened red." },
  { id: "armor-chrome", kind: "armor", name: "Chrome", price: 300, value: "#A3AEC2", blurb: "Polished steel." },
  { id: "armor-glacier", kind: "armor", name: "Glacier", price: 350, value: "#6FD3FF", blurb: "Ice-blue shell." },
  { id: "armor-obsidian", kind: "armor", name: "Obsidian", price: 450, value: "#1E2238", blurb: "Near-black. Looks best with Circuit." },
  { id: "armor-rainbow", kind: "armor", name: "Rainbow", price: 1000, value: "rainbow", blurb: "Shifting colors that never sit still." },
  { id: "armor-gold", kind: "armor", name: "Solid Gold", price: 1500, value: "gold", blurb: "The rarest armor. Pure shining gold." },

  { id: "energy-red", kind: "energy", name: "Red", price: 0, value: "#FF5A5F", blurb: "Starter energy." },
  { id: "energy-sky", kind: "energy", name: "Sky", price: 0, value: "#5CC8FF", blurb: "Starter energy." },
  { id: "energy-mint", kind: "energy", name: "Mint", price: 0, value: "#34D399", blurb: "Starter energy." },
  { id: "energy-gold", kind: "energy", name: "Amber", price: 120, value: "#FFC83D", blurb: "Warm orange-yellow glow." },
  { id: "energy-pink", kind: "energy", name: "Pink", price: 120, value: "#FF7EB6", blurb: "Hot pink blade." },
  { id: "energy-toxic", kind: "energy", name: "Toxic", price: 150, value: "#A3FF12", blurb: "Radioactive green blade." },
  { id: "energy-plasma", kind: "energy", name: "Plasma", price: 200, value: "#B14BFF", blurb: "Hot purple plasma." },
  { id: "energy-solar", kind: "energy", name: "Solar", price: 250, value: "#FFF3B0", blurb: "Blinding white-gold." },
  { id: "energy-void", kind: "energy", name: "Void", price: 300, value: "#4D3BFF", blurb: "Deep electric blue." },
  { id: "energy-rainbow", kind: "energy", name: "Rainbow", price: 900, value: "rainbow", blurb: "A blade in every color." },
  { id: "energy-goldx", kind: "energy", name: "Solid Gold", price: 1200, value: "gold", blurb: "A gleaming gold blade and thrusters." },

  { id: "finish-standard", kind: "finish", name: "Standard", price: 0, value: "standard", blurb: "Clean matte shell." },
  { id: "finish-metal", kind: "finish", name: "Metal Shine", price: 200, value: "metal", blurb: "Polished highlights." },
  { id: "finish-circuit", kind: "finish", name: "Circuit Lines", price: 350, value: "circuit", blurb: "Glowing code traces in your energy color." },

  { id: "aura-none", kind: "aura", name: "No Aura", price: 0, value: "none", blurb: "Keep it simple." },
  { id: "aura-ember", kind: "aura", name: "Ember Aura", price: 300, value: "ember", blurb: "A blazing glow with rising flames." },
  { id: "aura-frost", kind: "aura", name: "Frost Aura", price: 300, value: "frost", blurb: "An icy glow with falling snowflakes." },
  { id: "aura-storm", kind: "aura", name: "Storm Aura", price: 450, value: "storm", blurb: "A spinning lightning ring with bolts." },
  { id: "aura-halo-cyan", kind: "aura", name: "Cyber Angel", price: 1600, value: "halo-cyan", blurb: "Cyan halo and wings." },
  { id: "aura-halo-pink", kind: "aura", name: "Rose Angel", price: 1600, value: "halo-pink", blurb: "Pink halo and wings." },
  { id: "aura-halo-violet", kind: "aura", name: "Nebula Angel", price: 1800, value: "halo-violet", blurb: "Violet halo and wings." },
  { id: "aura-halo-white", kind: "aura", name: "Seraph", price: 2000, value: "halo-white", blurb: "Pure white halo and wings." },
  { id: "aura-royal", kind: "aura", name: "Golden Angel", price: 2500, value: "royal", blurb: "The most legendary look: a golden halo and golden wings." },

  { id: "title-byte", kind: "title", name: "Byte Knight", price: 0, value: "Byte Knight", blurb: "Starter title." },
  { id: "title-loop", kind: "title", name: "Loop Ranger", price: 0, value: "Loop Ranger", blurb: "Starter title." },
  { id: "title-logic", kind: "title", name: "Logic Mage", price: 0, value: "Logic Mage", blurb: "Starter title." },
  { id: "title-bug", kind: "title", name: "Bug Slayer", price: 120, value: "Bug Slayer", blurb: "For the exterminators." },
  { id: "title-semi", kind: "title", name: "Semicolon Sage", price: 160, value: "Semicolon Sage", blurb: "Never forgets one." },
  { id: "title-obo", kind: "title", name: "Off-By-One Avenger", price: 220, value: "Off-By-One Avenger", blurb: "Counts from zero." },
  ...WORLDS.map((w, i) => ({
    id: `title-boss-${i}`,
    kind: "title" as const,
    name: w.bossTitle,
    price: -1,
    value: w.bossTitle,
    blurb: `Beat ${w.enemies[BOSS].name}.`,
    earnedBy: w.enemies[BOSS].name,
  })),
];

export const item = (id: string) => SHOP.find((s) => s.id === id);
export const STARTER_OWNED = SHOP.filter((s) => s.price === 0).map((s) => s.id);
export const STARTER_COINS = 100;
export const STARTER_INVENTORY: Record<Power, number> = { potion: 1, shield: 1, surge: 1, scroll: 3 };

// Starter choices on the create screen.
const starters = (k: ItemKind) => SHOP.filter((s) => s.kind === k && s.price === 0);
export const ARMORS = starters("armor").map((s) => ({ name: s.name, color: s.value }));
export const ENERGIES = starters("energy").map((s) => ({ name: s.name, color: s.value }));
export const TITLES = starters("title").map((s) => s.value);
export const BODIES = starters("body").map((s) => ({ name: s.name, value: s.value, blurb: s.blurb }));
