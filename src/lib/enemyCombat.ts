import type { EnemyDesign } from "./game";

export type Choreography = "rush" | "sweep" | "rise" | "dive" | "volley" | "orbit" | "beam" | "snare" | "quake" | "blink" | "summon" | "vortex";
export const TRAVEL_MS: Record<Choreography, number> = { rush: 320, sweep: 390, rise: 460, dive: 450, volley: 390, orbit: 460, beam: 310, snare: 360, quake: 390, blink: 330, summon: 430, vortex: 510 };
export type EnemyMove = { name: string; motion: Choreography; glyph: 0 | 1 | 2 | 3; windup: number; beats: number };
export type Moveset = { attacks: [EnemyMove, EnemyMove, EnemyMove]; finisher: EnemyMove; defeat: "shatter" | "sink" | "unravel" | "decompile" | "eclipse" };
type Entry = [string, Choreography, number?];
const set = (a: Entry, b: Entry, c: Entry, finale: Entry, defeat: Moveset["defeat"]): Moveset => {
  const make = ([name, motion, beats = 1]: Entry, glyph: EnemyMove["glyph"]): EnemyMove => ({ name, motion, glyph, beats, windup: glyph === 3 ? 440 : 250 + glyph * 55 });
  return { attacks: [make(a, 0), make(b, 1), make(c, 2)], finisher: make(finale, 3), defeat };
};

// Every encounter owns a full moveset. Choreography controls the actor and effect
// trajectories; its design-specific glyph supplies the actual weapon/creature art.
export const ENEMY_MOVESETS: Record<EnemyDesign, Moveset> = {
  "byte-raider": set(["Cutlass Compile", "rush"], ["Hook the Return", "snare"], ["Bootleg Byte Bombs", "volley", 3], ["Dead Man's Debug", "sweep", 4], "sink"),
  "semicolon-mimic": set(["Cache Snap", "sweep"], ["Counterfeit Coinstorm", "volley", 5], ["Chest Compression", "quake"], ["Recursive Devour", "vortex", 4], "shatter"),
  "cast-corsair": set(["Trident Typecast", "rush"], ["Reef Harpoon", "beam"], ["Pincer Conversion", "snare", 2], ["Three-Pronged Verdict", "rise", 3], "sink"),
  "division-ray": set(["Quotient Glide", "dive"], ["Remainder Blades", "orbit", 3], ["Split Current", "beam", 2], ["Divide the Horizon", "sweep", 4], "unravel"),
  "compiler-leviathan": set(["Wrecking Tide", "quake", 2], ["Compiler Cannon", "beam"], ["Anchor Array", "summon", 3], ["Fatal Compile: Oceanfall", "vortex", 5], "sink"),
  "fork-stalker": set(["False-Path Ambush", "blink"], ["Antler Fork", "rush", 2], ["Bramble Condition", "snare"], ["No Else Escape", "summon", 4], "unravel"),
  "boolean-owl": set(["Truefeather Volley", "volley", 3], ["False Moon Dive", "dive"], ["Oracle's Orbit", "orbit", 2], ["Truth Table Eclipse", "vortex", 4], "eclipse"),
  "modulo-mantis": set(["Remainder Reap", "sweep", 2], ["Leap Modulo", "rise"], ["Zero Residue", "blink"], ["Perfect Division", "rush", 5], "shatter"),
  "nested-basilisk": set(["Coiled Condition", "snare"], ["Nested Venom", "volley", 3], ["Scale Recursion", "orbit", 2], ["Else Beneath Else", "vortex", 5], "unravel"),
  "elder-else": set(["Root Decision", "snare", 3], ["Branch Collapse", "quake", 2], ["Falling Outcomes", "summon", 4], ["The Last Decision", "rise", 5], "unravel"),
  "counter-crab": set(["Tick-Tock Pincer", "sweep", 2], ["Increment Charge", "rush"], ["Clockwork Depth Charge", "summon", 3], ["Counter Overflow", "quake", 5], "shatter"),
  "while-jelly": set(["Pulse Cycle", "orbit", 3], ["Tentacle Condition", "snare", 2], ["Biolume Beam", "beam"], ["Repeat Until Darkness", "vortex", 5], "eclipse"),
  "offset-angler": set(["False Endpoint", "blink"], ["Lure and Launch", "rise"], ["One More Bite", "rush", 2], ["Beyond the Last Index", "dive", 4], "sink"),
  "break-turtle": set(["Shell Interrupt", "quake"], ["Breakpoint Ricochet", "rush", 2], ["Reef Barricade", "summon", 3], ["Hard Stop", "dive", 4], "shatter"),
  "ouroboros": set(["Twin Tide", "beam", 2], ["Coil Without Exit", "snare", 3], ["Looping Undertow", "orbit", 4], ["Infinity Swallows All", "vortex", 5], "unravel"),
  "index-yeti": set(["Zero-Point Fist", "rush"], ["Glacial Index", "summon", 3], ["Frostguard Quake", "quake", 2], ["Absolute Zero", "rise", 5], "shatter"),
  "substring-wyvern": set(["Slice the Sky", "dive"], ["Crystal Subsequence", "volley", 4], ["End-Exclusive Tail", "sweep"], ["Skyline Severance", "beam", 5], "shatter"),
  "char-sabertooth": set(["Single Bite", "rush"], ["Frostfang Pounce", "rise", 2], ["Character Crosscut", "blink", 3], ["Last Character", "dive", 4], "shatter"),
  "echo-wraith": set(["Reference Reflection", "blink", 2], ["Equals Echoes", "orbit", 3], ["False Identity", "beam"], ["A Thousand Equal Faces", "summon", 5], "unravel"),
  "null-lich": set(["Empty Reference", "snare"], ["Null Pointer Lance", "beam"], ["Hollow Crown", "orbit", 3], ["Absolute Null: Erasure", "vortex", 5], "eclipse"),
  "bounds-bat": set(["Boundary Dive", "dive"], ["Shard Check", "volley", 3], ["Forbidden Orbit", "orbit", 2], ["Past the Boundary", "blink", 4], "shatter"),
  "length-crawler": set(["Segment Surge", "rush"], ["Length Extension", "snare", 3], ["Tunnel Unroll", "quake", 2], ["Devour the Entire Array", "sweep", 5], "decompile"),
  "swap-spider": set(["Swap Ambush", "blink"], ["Temporary Web", "snare", 2], ["Decoy Eggs", "summon", 3], ["In-Place Execution", "orbit", 5], "unravel"),
  "list-driller": set(["Insert Impact", "rise"], ["Drill Traverse", "rush", 2], ["Fragment Ejection", "volley", 4], ["Bedrock Breakpoint", "quake", 5], "shatter"),
  "index-colossus": set(["Bounds Rupture", "quake", 3], ["Indexed Monoliths", "summon", 4], ["Faultline Fist", "rush"], ["ArrayIndex: Cataclysm", "rise", 5], "decompile"),
  "grid-sentinel": set(["Row Sweep", "sweep"], ["Column Lance", "beam"], ["Grid Lock", "snare", 3], ["Checkmate Matrix", "summon", 5], "decompile"),
  "constructor-raven": set(["Forge Feather", "volley", 3], ["New Instance", "summon", 2], ["Constructor Dive", "dive"], ["Rebuild the Flock", "orbit", 5], "shatter"),
  "this-duelist": set(["Reference Riposte", "sweep", 2], ["Stolen Identity", "blink"], ["This Is Mine", "rush", 3], ["Usurper's Final Claim", "rise", 5], "unravel"),
  "base-gargoyle": set(["Terminal Dive", "dive"], ["Stone Return", "quake", 2], ["Basecase Wings", "sweep"], ["No Return", "rush", 4], "shatter"),
  "stack-tyrant": set(["Push the Fortress", "summon", 3], ["Recursive Siege", "volley", 4], ["Call-Stack Tremor", "quake", 2], ["Stack Overflow: Kingdomfall", "dive", 5], "decompile"),
  "sum-twins": set(["Pair Impact", "rush", 2], ["Complement Cannons", "beam", 2], ["Target Convergence", "snare"], ["One Target, Two Titans", "sweep", 4], "decompile"),
  "stock-mage": set(["Buy the Dip", "blink"], ["Profit Projection", "beam"], ["Bear-Market Spiral", "orbit", 3], ["Timeline Liquidation", "vortex", 5], "eclipse"),
  "mirror-paladin": set(["Mirror Cut", "sweep", 2], ["Reverse Advance", "blink"], ["Symmetric Spears", "volley", 2], ["Perfect Reflection", "orbit", 4], "shatter"),
  "merge-minotaur": set(["Left-Right Cleave", "sweep", 2], ["Sorted Stampede", "rush", 3], ["Merge Convergence", "quake"], ["The Final Merge", "rise", 5], "shatter"),
  "final-judge": set(["Test Case: Failed", "summon", 3], ["Complexity Beam", "beam"], ["Verdict Orbit", "orbit", 4], ["REJECTED: Final Verdict", "vortex", 6], "eclipse"),
};

export function enemyMove(design: EnemyDesign, turn: number, knockout = false): EnemyMove {
  const moveset = ENEMY_MOVESETS[design];
  return knockout ? moveset.finisher : moveset.attacks[((Math.trunc(turn) % 3) + 3) % 3];
}

export type ActorPose = Partial<Record<"x" | "y" | "rotate" | "scale" | "scaleX" | "scaleY" | "opacity", number | number[]>>;
export type AttackPhase = "telegraph" | "travel" | "impact" | "defeat";
export type AttackContext = {
  signal: AbortSignal;
  distance: number;
  compact: boolean;
  reducedMotion: boolean;
  animate: (actor: "foe" | "body", pose: ActorPose, ms: number) => Promise<unknown>;
  wait: (ms: number) => Promise<unknown>;
  effect: (phase: AttackPhase) => void;
  hit: () => void;
};

// Race each animation against cancellation. Leaving a battle never leaves a
// pending promise or a delayed damage callback running against the next battle.
async function guarded(task: Promise<unknown>, signal: AbortSignal) {
  if (signal.aborted) throw new Error("attack-cancelled");
  let stop: () => void = () => {};
  try {
    await Promise.race([task, new Promise((_, reject) => {
      stop = () => reject(new Error("attack-cancelled"));
      signal.addEventListener("abort", stop, { once: true });
    })]);
    if (signal.aborted) throw new Error("attack-cancelled");
  } finally { signal.removeEventListener("abort", stop); }
}

export async function performEnemyMove(move: EnemyMove, ctx: AttackContext): Promise<boolean> {
  if (ctx.signal.aborted) return false;
  const d = ctx.distance, air = ctx.compact ? 58 : 96;
  const act = (actor: "foe" | "body", pose: ActorPose, ms: number) => {
    if (ctx.signal.aborted) return Promise.reject(new Error("attack-cancelled"));
    return guarded(ctx.animate(actor, pose, ms), ctx.signal);
  };
  const wait = (ms: number) => guarded(ctx.wait(ms), ctx.signal);
  try {
    ctx.effect("telegraph");
    if (ctx.reducedMotion) {
      await wait(140); ctx.effect("impact"); ctx.hit(); await wait(160); return true;
    }
    await act("body", { scaleX: [1, 1.06, 1], scaleY: [1, 0.92, 1] }, move.windup);
    ctx.effect("travel");
    switch (move.motion) {
      case "rush": await act("foe", { x: [0, 18, -d], y: [0, 0, -10], rotate: [0, 8, -12] }, 320); break;
      case "sweep": await act("foe", { x: -d * 0.8, rotate: [0, -22, 18, -8] }, 390); break;
      case "rise": await act("foe", { x: [0, -d * 0.65, -d * 0.9], y: [0, -air, 0], rotate: [0, -20, 7] }, 460); break;
      case "dive": await act("foe", { x: [0, 12, -d], y: [0, -air, -6], rotate: [0, 20, -18] }, 450); break;
      case "blink": await act("foe", { opacity: [1, 0, 0], x: [0, 0, -d], y: [0, -15, -15] }, 210); await act("foe", { opacity: [0, 1], rotate: [-18, 0] }, 120); break;
      case "quake": await act("foe", { y: [0, -air * 0.55, 3], scaleY: [1, 1.1, 0.86] }, 390); break;
      case "beam": await act("body", { x: [0, 10, -4], scaleX: [1, 0.9, 1.06] }, 310); break;
      case "volley": await act("body", { rotate: [0, 8, -8, 6, 0], x: [0, 7, 0] }, 390); break;
      case "orbit": await act("foe", { y: [0, -18, -7], rotate: [0, 8, -8, 0] }, 460); break;
      case "snare": await act("body", { y: [0, -5, 0], scaleX: [1, 1.1, 1] }, 360); break;
      case "summon": await act("foe", { y: [0, -22, -12], scale: [1, 1.05, 1] }, 430); break;
      case "vortex": await act("foe", { y: [0, -24, -12], rotate: [0, 12, -12, 0], scale: [1, 1.08, 1] }, 510); break;
    }
    ctx.effect("impact"); ctx.hit(); // Exactly one gameplay hit, including multi-hit-looking attacks.
    await wait(move.glyph === 3 ? 430 : 170);
    return true;
  } catch (error) {
    if (!ctx.signal.aborted) throw error;
    return false;
  } finally {
    if (!ctx.signal.aborted) {
      try {
      await act("foe", { x: 0, y: 0, rotate: 0, scale: 1, scaleY: 1, opacity: 1 }, ctx.reducedMotion ? 0 : 220);
      await act("body", { x: 0, y: 0, rotate: 0, scale: 1, scaleX: 1, scaleY: 1, opacity: 1 }, 0);
      } catch (error) { if (!ctx.signal.aborted) throw error; }
    }
  }
}
