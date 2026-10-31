import type { Choreography, EnemyMove } from "./enemyCombat";
import type { PlayerMove } from "./playerCombat";
import { play, type Sfx } from "./sfx";

// Maps combat animation events to sounds. Called from the exact animation callbacks
// (charge, strike, contact, impact), so audio lands on the frame the hit lands.
const HERO = -0.25; // hero stands left
const FOE = 0.25; // enemy stands right

export function heroPhase(move: PlayerMove, phase: "charge" | "strike" | "impact") {
  if (phase === "charge") {
    if (move.finisher) play("finisherCharge", { pan: HERO });
    return;
  }
  if (phase !== "strike") return;
  const swing: Record<PlayerMove["weapon"], Sfx> = {
    saber: "bladeSwing",
    scythe: move.style === "hook" ? "scytheHook" : "scytheSweep",
    hammer: "hammerSwing",
    glaive: move.style === "vault" || move.style === "lances" || move.style === "heaven" ? "glaiveSpin" : "glaiveThrust",
  };
  play(swing[move.weapon], { pan: HERO });
}

// The blow that deals damage. Finishers get the full release; crits and surges get a bright layer.
export function heroImpact(move: PlayerMove, strong: boolean) {
  if (move.finisher) {
    play("finisherRelease", { pan: FOE });
    return;
  }
  const impact: Record<PlayerMove["weapon"], Sfx> = {
    saber: "bladeImpact",
    scythe: "scytheImpact",
    hammer: move.style === "quake" ? "groundSlam" : "hammerImpact",
    glaive: "glaiveImpact",
  };
  play(impact[move.weapon], { pan: FOE });
  if (strong) play("critLayer", { pan: FOE });
}

// Intermediate contacts in a combo are lighter than the final blow.
export function contactSound(who: "hero" | "foe", stage: string, index: number) {
  const pan = who === "hero" ? FOE : HERO; // sound comes from whoever gets hit
  if (stage === "stagger") play("comboHit", { pan, index });
  else if (stage === "launch") play("launcher", { pan });
  else if (stage === "juggle") play("airHit", { pan, index });
  else if (stage === "freeze") play("suspense", { pan: 0 });
}

const TRAVEL: Record<Choreography, Sfx> = {
  rush: "enemyRush",
  sweep: "enemySweep",
  rise: "enemyRise",
  dive: "enemyDive",
  volley: "enemyVolley",
  orbit: "enemyOrbit",
  beam: "enemyBeam",
  snare: "enemySnare",
  quake: "enemyQuake",
  blink: "enemyBlink",
  summon: "enemySummon",
  vortex: "enemyVortex",
};
const HEAVY = new Set<Choreography>(["quake", "dive", "rise", "vortex", "rush"]);

export function enemyPhase(move: EnemyMove, phase: string) {
  if (phase === "telegraph") play(move.glyph === 3 ? "finisherCharge" : "enemyGrowl", { pan: FOE, intensity: move.glyph === 3 ? 0.8 : 1 });
  else if (phase === "travel") play(TRAVEL[move.motion], { pan: FOE, index: move.beats });
}

export function enemyImpact(move: EnemyMove, blocked: boolean) {
  if (blocked) {
    play("block", { pan: HERO });
    return;
  }
  play("enemyImpact", { pan: HERO, intensity: HEAVY.has(move.motion) || move.glyph === 3 ? 1.3 : 1 });
  if (move.glyph === 3) play("finisherRelease", { pan: HERO, intensity: 0.7 });
  play("hurt", { pan: HERO, intensity: 0.7 });
}
