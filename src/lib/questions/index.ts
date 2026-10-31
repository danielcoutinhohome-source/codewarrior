import { BOSS, QUESTIONS_PER_BATTLE, QUESTIONS_PER_BOSS } from "../game";
import { rng, type Gen, type Question, type Tier } from "./core";
import type { QuestionHistory } from "./history";
import { W0, W1, W2 } from "./worlds-a";
import { W3, W4, W5, W6 } from "./worlds-b";
import { SYNTAX } from "./ap-syntax";
import { BRANCHES } from "./ap-branches";
import { LOOPS } from "./ap-loops";
import { STRINGS } from "./ap-strings";
import { ARRAYS } from "./ap-arrays";
import { CLASSES } from "./ap-classes";
import { ALGORITHMS } from "./ap-algorithms";
import { W0_MORE } from "./more-w1";
import { W1_MORE } from "./more-w2";

export * from "./core";
// Each world has 60 distinct templates: 15 novice, 30 intermediate, 15 hard.
// Retain the original generators (and their skills for saved progress).
export const BANKS: Gen[][] = [
  [...W0, ...SYNTAX, ...W0_MORE], [...W1, ...BRANCHES, ...W1_MORE], [...W2, ...LOOPS],
  [...W3, ...STRINGS], [...W4, ...ARRAYS], [...W5, ...CLASSES], [...W6, ...ALGORITHMS],
];

// The mix rises across all 35 encounters, rather than resetting each world.
export function difficultyTargets(world: number, battle: number, count: number) {
  const progress = Math.max(0, Math.min(1, (world * 5 + battle) / 34));
  const hard = Math.round(count * (.05 + .65 * progress));
  const novice = Math.min(count - hard, Math.round(count * .75 * (1 - progress)));
  return [novice, count - novice - hard, hard];
}

// IDs include a generator counter. Compare content, including shuffled choices,
// so a new ID or a different option order cannot disguise a repeated question.
export function questionFingerprint(q: Question) {
  return JSON.stringify([q.kind, q.prompt.trim(), q.code?.trim(), q.options ? [...q.options].sort() : null, q.lines ?? null]);
}

// With a history, question types the student keeps missing come back first (up to about 40% of
// a battle), then types they haven't seen, then the ones seen longest ago. Types they got right
// stay away until the world's supply runs out. Difficulty targets apply either way.
function orderByHistory(gens: Gen[], history: QuestionHistory | undefined, reviewLeft: { n: number }) {
  if (!history) return gens;
  const review = gens.filter((g) => history.review.has(g.skill));
  const unseen = gens.filter((g) => !history.lastSeen.has(g.skill));
  const seen = gens.filter((g) => history.lastSeen.has(g.skill) && !history.review.has(g.skill)).sort((a, b) => history.lastSeen.get(a.skill)! - history.lastSeen.get(b.skill)!);
  const now = review.slice(0, reviewLeft.n);
  reviewLeft.n -= now.length;
  return [...now, ...unseen, ...seen, ...review.slice(now.length)];
}

export function freshBattleQuestions(world: number, battle: number, seed: number, count: number, seen: Question[] = [], history?: QuestionHistory): Question[] {
  const r = rng(seed * 7919 + world * 101 + battle * 13);
  const bank = BANKS[world];
  const used = new Set(seen.map(questionFingerprint));
  const skills = new Set<string>();
  const out: Question[] = [];
  const targets = difficultyTargets(world, battle, count);
  const take = (g: Gen) => {
    if (skills.has(g.skill)) return;
    const q = { ...g.make(r), tier: g.tier };
    const key = questionFingerprint(q);
    if (used.has(key)) return;
    used.add(key);
    skills.add(g.skill);
    out.push(q);
  };
  const reviewLeft = { n: Math.ceil(count * 0.4) };
  for (const tier of [0, 1, 2] as Tier[]) {
    for (const g of orderByHistory(r.shuffle(bank.filter(g => g.tier === tier)), history, reviewLeft)) {
      if (out.filter(q => q.tier === tier).length >= targets[tier]) break;
      take(g);
    }
  }
  // A depleted tier may borrow another tier, but never repeat displayed content.
  for (const g of orderByHistory(r.shuffle(bank), history, { n: 0 })) {
    if (out.length >= count) break;
    take(g);
  }
  const shuffled = r.shuffle(out);
  const opener = shuffled.findIndex(q => q.kind !== "order");
  if (opener > 0) [shuffled[0], shuffled[opener]] = [shuffled[opener], shuffled[0]];
  return shuffled;
}

export function buildBattle(world: number, battle: number, seed: number, history?: QuestionHistory): Question[] {
  return freshBattleQuestions(world, battle, seed, battle === BOSS ? QUESTIONS_PER_BOSS : QUESTIONS_PER_BATTLE, [], history);
}

export const allSkills = () => BANKS.map((b) => [...new Set(b.map((g) => g.skill))]);

