import { EXTRA_COSMETICS } from "./cosmetics";

// Static game data: worlds, enemies, rewards and the shop catalog.

export const ENEMY_DESIGNS = ["byte-raider", "semicolon-mimic", "cast-corsair", "division-ray", "compiler-leviathan", "fork-stalker", "boolean-owl", "modulo-mantis", "nested-basilisk", "elder-else", "counter-crab", "while-jelly", "offset-angler", "break-turtle", "ouroboros", "index-yeti", "substring-wyvern", "char-sabertooth", "echo-wraith", "null-lich", "bounds-bat", "length-crawler", "swap-spider", "list-driller", "index-colossus", "grid-sentinel", "constructor-raven", "this-duelist", "base-gargoyle", "stack-tyrant", "sum-twins", "stock-mage", "mirror-paladin", "merge-minotaur", "final-judge"] as const;
export type EnemyDesign = (typeof ENEMY_DESIGNS)[number];

export type Enemy = {
  design: EnemyDesign;
  accent: string;
  lore: string;
  attackName: string;
  attackStyle: "lunge" | "slam" | "spit";
  name: string;
  color: string;
  label: string; // programming cue engraved on its sigil
};

export type Decor =
  | "palm" | "umbrella" | "sandcastle" | "shell"
  | "pine" | "oak" | "mushroom" | "signpost" | "bush"
  | "lily" | "reed" | "buoy" | "rockisle"
  | "rock" | "snowpine" | "snowman" | "iceblock"
  | "crystal" | "stalagmite" | "crates" | "torch" | "minecart"
  | "pillar" | "banner" | "hedge" | "lamp"
  | "obelisk" | "holo" | "server";

export type Scene = "shore" | "woods" | "lagoon" | "peaks" | "caverns" | "castle" | "citadel";

export type Theme = {
  scene: Scene;
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
      { name: "Byte Raider", design: "byte-raider", color: "#137E9F", accent: "#72FCE4", label: "Sytem.out", attackName: "Cutlass Rush", attackStyle: "lunge", lore: "A shipwreck scavenger with a cutlass forged from broken syntax." },
      { name: "Semicolon Mimic", design: "semicolon-mimic", color: "#A85B35", accent: "#FFCE70", label: "x = 5", attackName: "Cache Crash", attackStyle: "slam", lore: "That treasure chest has been waiting for your next missing semicolon." },
      { name: "Cast Corsair", design: "cast-corsair", color: "#DD6942", accent: "#7DF3FF", label: 'int s="hi"', attackName: "Trident Cast", attackStyle: "lunge", lore: "An armored reef hunter that steals values and changes their type." },
      { name: "Division Ray", design: "division-ray", color: "#5761BC", accent: "#BEA7FF", label: "7/2 = 3", attackName: "Split Current", attackStyle: "spit", lore: "A storm-winged ray that splits every current into smaller pieces." },
      { name: "Compiler Leviathan", design: "compiler-leviathan", color: "#174B67", accent: "#FFB84D", label: "ERROR", attackName: "Compile Breaker", attackStyle: "slam", lore: "The wreck of a compiler, rebuilt into the shore’s last line of defense." },
    ],
    theme: { scene: "shore", skyTop: "#5CB8F5", skyBottom: "#D9F2FF", far: "#7CCDF2", groundNear: "#F0D58C", groundFar: "#F7E7B8", road: "#FFF6DD", roadEdge: "#E3C27A", roadLine: "#E8D3A0", fog: "#F2FAFF", decor: ["palm", "umbrella", "sandcastle", "palm", "shell", "rock"] },
  },
  {
    name: "Branch Woods",
    topic: "if / else, booleans",
    bossTitle: "Branch Breaker",
    bridges: [],
    enemies: [
      { name: "Fork Stalker", design: "fork-stalker", color: "#386C56", accent: "#BDF77C", label: "else", attackName: "Forked Strike", attackStyle: "lunge", lore: "An antlered hunter waiting where the forest path divides." },
      { name: "Boolean Oracle", design: "boolean-owl", color: "#58519D", accent: "#B3F3C1", label: "true", attackName: "Truth Bolt", attackStyle: "spit", lore: "One eye sees true. The other sees every path you should not take." },
      { name: "Modulo Mantis", design: "modulo-mantis", color: "#658E40", accent: "#F5D971", label: "% 2", attackName: "Remainder Reap", attackStyle: "lunge", lore: "A leaf-armored predator with crescent blades that leave no remainder." },
      { name: "Nested Basilisk", design: "nested-basilisk", color: "#257B77", accent: "#A2F6C0", label: "if{if{", attackName: "Nested Venom", attackStyle: "spit", lore: "Every armored coil hides another decision beneath it." },
      { name: "Elder Else", design: "elder-else", color: "#55435B", accent: "#EAB96B", label: "else ?", attackName: "Branch Collapse", attackStyle: "slam", lore: "The ancient decision tree. Every branch leads back to its throne." },
    ],
    theme: { scene: "woods", skyTop: "#7FCBA0", skyBottom: "#E6F7DD", far: "#5FA873", groundNear: "#5DB54C", groundFar: "#8ED37A", road: "#D9B27A", roadEdge: "#A87E47", roadLine: "#C69D63", fog: "#EEF8EA", decor: ["oak", "pine", "mushroom", "signpost", "pine", "bush"] },
  },
  {
    name: "Loop Lagoon",
    topic: "for, while, counting",
    bossTitle: "Loop Legend",
    bridges: [lc(412, "Fizz Buzz", "fizz-buzz")],
    enemies: [
      { name: "Counter Corsair", design: "counter-crab", color: "#C85C51", accent: "#7DEBEA", label: "i++", attackName: "Counter Crush", attackStyle: "slam", lore: "A clockwork crustacean that counts each step toward its target." },
      { name: "While Specter", design: "while-jelly", color: "#326AA8", accent: "#9CFBFF", label: "while", attackName: "Pulse Cycle", attackStyle: "spit", lore: "A luminous deep-water specter trapped in a repeating pulse." },
      { name: "Offset Angler", design: "offset-angler", color: "#385B7C", accent: "#BEF667", label: "i <= n", attackName: "False Endpoint", attackStyle: "lunge", lore: "Its lure always hangs one position beyond where you expect." },
      { name: "Breakpoint Bastion", design: "break-turtle", color: "#52766F", accent: "#FFCB70", label: "break", attackName: "Reef Break", attackStyle: "slam", lore: "A reef fortress that stops the current with one armored impact." },
      { name: "Ouroboros, Unbound", design: "ouroboros", color: "#136E7C", accent: "#63FFCB", label: "while(true)", attackName: "Endless Tide", attackStyle: "spit", lore: "A twin-headed sea dragon locked in a cycle without an exit." },
    ],
    theme: { scene: "lagoon", skyTop: "#285E77", skyBottom: "#639AAC", far: "#487E76", groundNear: "#246C8B", groundFar: "#3F92AD", road: "#415A60", roadEdge: "#263E47", roadLine: "#79B5AC", fog: "#76AFA9", night: true, decor: ["lily", "reed", "buoy", "lily", "rockisle", "reed"] },
  },
  {
    name: "String Peaks",
    topic: "length, substring, equals",
    bossTitle: "String Sorcerer",
    bridges: [lc(344, "Reverse String", "reverse-string")],
    enemies: [
      { name: "Index Frostguard", design: "index-yeti", color: "#86ABCB", accent: "#C4FAFF", label: "[0]", attackName: "Zero Point", attackStyle: "slam", lore: "An ice-armored giant guarding the first step into the peaks." },
      { name: "Substring Wyvern", design: "substring-wyvern", color: "#7B60B7", accent: "#D5A8FF", label: "sub(0,3)", attackName: "Shard Slice", attackStyle: "lunge", lore: "Its crystal wings slice clean ranges out of the mountain sky." },
      { name: "Char Sabertooth", design: "char-sabertooth", color: "#6C8DA9", accent: "#FFE5A8", label: "'c'", attackName: "Single Bite", attackStyle: "lunge", lore: "A frost hunter whose twin fangs cut one character at a time." },
      { name: "Equals Echo", design: "echo-wraith", color: "#6B7DC5", accent: "#BDEAFF", label: "==", attackName: "Mirror Pulse", attackStyle: "spit", lore: "Two mirrored masks. One identity that is never what it seems." },
      { name: "Null, the Hollow King", design: "null-lich", color: "#383F74", accent: "#A5F0FF", label: "null", attackName: "Absolute Null", attackStyle: "spit", lore: "An empty crown above a frozen kingdom. Nothing waits behind the mask." },
    ],
    theme: { scene: "peaks", skyTop: "#9DB4FF", skyBottom: "#EEF2FF", far: "#FFFFFF", groundNear: "#E3EAF6", groundFar: "#F3F6FC", road: "#C2CDE2", roadEdge: "#97A6C4", roadLine: "#AEBBD6", fog: "#F7F9FF", decor: ["snowpine", "snowman", "iceblock", "snowpine", "crystal"], peaks: true },
  },
  {
    name: "Array Caverns",
    topic: "arrays, ArrayList",
    bossTitle: "Array Admiral",
    bridges: [lc(1, "Two Sum", "two-sum")],
    enemies: [
      { name: "Bounds Shardwing", design: "bounds-bat", color: "#765AB5", accent: "#BBF4FF", label: "[5]", attackName: "Boundary Dive", attackStyle: "lunge", lore: "A cave predator with wings cut from forbidden crystal indexes." },
      { name: "Length Devourer", design: "length-crawler", color: "#445E8D", accent: "#8FFFC9", label: ".length", attackName: "Segment Surge", attackStyle: "lunge", lore: "A segmented tunnel hunter that grows with every value it consumes." },
      { name: "Swap Widow", design: "swap-spider", color: "#A34C8B", accent: "#FFB5DC", label: "tmp", attackName: "Swap Ambush", attackStyle: "lunge", lore: "A crystal arachnid that trades its prey’s position with a decoy." },
      { name: "Listbreaker Drill", design: "list-driller", color: "#B97A46", accent: "#93E8FF", label: "add()", attackName: "Insert Impact", attackStyle: "slam", lore: "A tunnel machine that inserts itself through solid bedrock." },
      { name: "Index Colossus", design: "index-colossus", color: "#564477", accent: "#D5A4FF", label: "[-1]", attackName: "Bounds Rupture", attackStyle: "slam", lore: "A living fault line built from the cavern’s shattered boundaries." },
    ],
    theme: { scene: "caverns", skyTop: "#2A2350", skyBottom: "#5B4D9E", far: "#3A3070", groundNear: "#3D3466", groundFar: "#5A4E92", road: "#7C6DC0", roadEdge: "#5A4C99", roadLine: "#A699E8", fog: "#8F7FE0", decor: ["crystal", "stalagmite", "crates", "torch", "crystal", "minecart"], night: true },
  },
  {
    name: "Class Castle",
    topic: "2D arrays, classes, recursion",
    bossTitle: "Stack Survivor",
    bridges: [lc(1480, "Running Sum of 1d Array", "running-sum-of-1d-array")],
    enemies: [
      { name: "Grid Sentinel", design: "grid-sentinel", color: "#4B7885", accent: "#8CFFE0", label: "[r][c]", attackName: "Grid Lock", attackStyle: "slam", lore: "A rook-armored guardian whose shield maps every row and column." },
      { name: "Constructor Raven", design: "constructor-raven", color: "#3C456A", accent: "#FFCE73", label: "new", attackName: "Forge Feather", attackStyle: "spit", lore: "A brass-winged familiar that builds its own next incarnation." },
      { name: "This, the Usurper", design: "this-duelist", color: "#576887", accent: "#E3B0FF", label: "this.", attackName: "Reference Riposte", attackStyle: "lunge", lore: "A stolen suit of royal armor searching for its rightful reference." },
      { name: "Basecase Gargoyle", design: "base-gargoyle", color: "#8C6165", accent: "#FFBA7A", label: "n <= 1", attackName: "Terminal Dive", attackStyle: "lunge", lore: "An awakened stone guardian perched at the end of every descent." },
      { name: "Stack Tyrant", design: "stack-tyrant", color: "#6251A0", accent: "#F6C778", label: "fact(n)", attackName: "Stack Collapse", attackStyle: "slam", lore: "A walking citadel rising one forbidden call above its own foundations." },
    ],
    theme: { scene: "castle", skyTop: "#FF9F86", skyBottom: "#FFE0B8", far: "#C77E78", groundNear: "#8F92A6", groundFar: "#B5B7C6", road: "#C9CBD8", roadEdge: "#8D90A4", roadLine: "#A9ACBE", fog: "#FFF0E3", decor: ["pillar", "banner", "hedge", "lamp", "pillar", "hedge"] },
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
      { name: "Two-Sum Titans", design: "sum-twins", color: "#8B703F", accent: "#FFE390", label: "#1", attackName: "Pair Impact", attackStyle: "slam", lore: "Two linked war machines. One target. No room for a repeated position." },
      { name: "Market Chronomancer", design: "stock-mage", color: "#2E6C68", accent: "#84FFD1", label: "#121", attackName: "Time Dividend", attackStyle: "spit", lore: "A keeper of fractured timelines who buys your mistakes before they happen." },
      { name: "Palindrome Paladin", design: "mirror-paladin", color: "#426E9E", accent: "#A7F2FF", label: "#125", attackName: "Mirror Cut", attackStyle: "lunge", lore: "A mirror-armored knight whose every attack has an equal reflection." },
      { name: "Merge Minotaur", design: "merge-minotaur", color: "#9E4B54", accent: "#FFD193", label: "#88", attackName: "Merge Cleaver", attackStyle: "lunge", lore: "A bronze-horned executioner that joins two blades into a single verdict." },
      { name: "The Final Judge", design: "final-judge", color: "#433A75", accent: "#FFB868", label: "Accepted?", attackName: "Final Verdict", attackStyle: "spit", lore: "The citadel’s celestial arbiter. Every unfinished algorithm ends here." },
    ],
    theme: { scene: "citadel", skyTop: "#14173A", skyBottom: "#3B3F8F", far: "#23275C", groundNear: "#262A55", groundFar: "#363B7A", road: "#FFC83D", roadEdge: "#C99400", roadLine: "#FFF1B0", fog: "#6D72D6", decor: ["obelisk", "holo", "server", "obelisk", "crystal"], night: true },
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
export type ItemKind = "power" | "body" | "armor" | "energy" | "finish" | "aura" | "title" | "weapon" | "headwear";
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
  ...EXTRA_COSMETICS,
  { id: "potion", kind: "power", name: "Health Potion", price: 40, value: "potion", blurb: "Heals 35 HP in battle." },
  { id: "shield", kind: "power", name: "Firewall", price: 50, value: "shield", blurb: "Raises an energy wall that blocks the next enemy hit." },
  { id: "surge", kind: "power", name: "Power Surge", price: 60, value: "surge", blurb: "Your next correct answer hits twice as hard." },
  { id: "scroll", kind: "power", name: "Hint Scroll", price: 30, value: "scroll", blurb: "Shows a hint. That question counts as a miss." },

  { id: "body-bot", kind: "body", name: "Classic", price: 0, value: "bot", blurb: "Round hover bot." },
  { id: "body-titan", kind: "body", name: "Titan", price: 0, value: "titan", blurb: "Big, blocky and tough." },
  { id: "body-valkyrie", kind: "body", name: "Valkyrie", price: 0, value: "valkyrie", blurb: "Sleek triangle frame with long flowing hair." },


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
export const ENERGIES = starters("energy").map((s) => ({ name: s.name, color: s.value }));
export const TITLES = starters("title").map((s) => s.value);
export const BODIES = starters("body").map((s) => ({ name: s.name, value: s.value, blurb: s.blurb }));
