// Pure battle rules. The battle screen calls these and animates the events they return.
import { BOSS, PLAYER_HP, enemyHit } from "./game";
import type { Question } from "./questions/core";

export const FULL_HIT = 100; // damage for a first-try answer
export const RETRY_HIT = 60; // damage when right on the second try
export const HINT_HIT = 50; // damage when a hint scroll was used
export const POTION_HEAL = 35;

export type BattleState = {
  world: number;
  battle: number;
  questions: Question[];
  queue: number[]; // indexes into questions, in play order
  pos: number; // position in queue
  round: number; // 0 = first pass; later rounds replay missed questions
  attempt: number; // 0 or 1 on the current question
  hinted: boolean; // hint scroll used on the current question
  playerHp: number;
  enemyHp: number;
  enemyMax: number;
  combo: number;
  bestCombo: number;
  shield: boolean;
  surge: boolean;
  // first-round results per question index: true = right first try without a hint
  firstTry: Record<number, boolean>;
  cleared: Record<number, boolean>; // the latest answer to this question was clean
  over: null | "victory" | "defeat";
};

export type BattleEvent =
  | { type: "attack"; damage: number; crit: boolean; surge: boolean; combo: number; finisher: boolean }
  | { type: "hurt"; damage: number; blocked: boolean; knockout: boolean }
  | { type: "reveal" } // second miss: show the answer
  | { type: "retry" }; // first miss: one more chance

export function startBattle(world: number, battle: number, questions: Question[]): BattleState {
  return {
    world,
    battle,
    questions,
    queue: questions.map((_, i) => i),
    pos: 0,
    round: 0,
    attempt: 0,
    hinted: false,
    playerHp: PLAYER_HP,
    enemyHp: questions.length * FULL_HIT,
    enemyMax: questions.length * FULL_HIT,
    combo: 0,
    bestCombo: 0,
    shield: false,
    surge: false,
    firstTry: {},
    cleared: {},
    over: null,
  };
}

export const current = (s: BattleState) => s.questions[s.queue[s.pos]];
export const comboMultiplier = (combo: number) => (combo >= 5 ? 1.5 : combo >= 3 ? 1.25 : 1);

// Applies one answer. Returns the new state and what to animate.
export function answer(s: BattleState, right: boolean): { state: BattleState; events: BattleEvent[] } {
  if (s.over) return { state: s, events: [] };
  const qi = s.queue[s.pos];
  const n: BattleState = { ...s, firstTry: { ...s.firstTry }, cleared: { ...s.cleared } };
  const events: BattleEvent[] = [];
  const firstRound = s.round === 0;

  if (right) {
    const clean = s.attempt === 0 && !s.hinted;
    if (firstRound && !(qi in n.firstTry)) n.firstTry[qi] = clean;
    n.cleared[qi] = clean;
    n.combo = clean ? s.combo + 1 : 0;
    n.bestCombo = Math.max(s.bestCombo, n.combo);
    const base = s.hinted ? HINT_HIT : s.attempt === 0 ? FULL_HIT : RETRY_HIT;
    const mult = (clean ? comboMultiplier(n.combo) : 1) * (s.surge ? 2 : 1);
    const damage = Math.round(base * mult);
    n.surge = false;
    n.enemyHp = Math.max(0, s.enemyHp - damage);
    const finisher = n.enemyHp === 0;
    events.push({ type: "attack", damage, crit: mult > 1, surge: s.surge, combo: n.combo, finisher });
    if (finisher) n.over = "victory";
    return { state: n, events };
  }

  // Wrong: the enemy strikes back.
  n.combo = 0;
  const hit = enemyHit(s.world, s.battle === BOSS);
  const blocked = s.shield;
  n.shield = false;
  n.playerHp = blocked ? s.playerHp : Math.max(0, s.playerHp - hit);
  const knockout = n.playerHp === 0;
  events.push({ type: "hurt", damage: blocked ? 0 : hit, blocked, knockout });
  if (knockout) {
    if (firstRound && !(qi in n.firstTry)) n.firstTry[qi] = false;
    n.over = "defeat";
    return { state: n, events };
  }
  if (s.attempt === 0) {
    n.attempt = 1;
    events.push({ type: "retry" });
  } else {
    if (firstRound && !(qi in n.firstTry)) n.firstTry[qi] = false;
    n.cleared[qi] = false;
    events.push({ type: "reveal" });
  }
  return { state: n, events };
}

// Moves to the next question. When the queue runs out and the enemy still stands,
// every question not answered cleanly comes back for another round.
export function advance(s: BattleState): BattleState {
  if (s.over) return s;
  const n = { ...s, attempt: 0, hinted: false };
  if (s.pos + 1 < s.queue.length) return { ...n, pos: s.pos + 1 };
  const missed = s.questions.map((_, i) => i).filter((i) => !s.cleared[i]);
  const again = missed.length ? missed : s.questions.map((_, i) => i);
  return { ...n, queue: again, pos: 0, round: s.round + 1 };
}

export function useHint(s: BattleState): BattleState {
  return { ...s, hinted: true };
}
export function usePotion(s: BattleState): BattleState {
  return { ...s, playerHp: Math.min(PLAYER_HP, s.playerHp + POTION_HEAL) };
}
export const useShield = (s: BattleState): BattleState => ({ ...s, shield: true });
export const useSurge = (s: BattleState): BattleState => ({ ...s, surge: true });

// First-round summary for scoring and teacher stats.
export function summary(s: BattleState) {
  const total = Object.keys(s.firstTry).length; // answered in the first round
  const firstTry = s.questions.filter((_, i) => s.firstTry[i]).length;
  const skills: Record<string, [number, number]> = {};
  s.questions.forEach((q, i) => {
    if (!(i in s.firstTry)) return;
    const k = skills[q.skill] || [0, 0];
    if (s.firstTry[i]) k[0]++;
    else k[1]++;
    skills[q.skill] = k;
  });
  return { total, firstTry, skills };
}
