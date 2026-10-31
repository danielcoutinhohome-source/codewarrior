import { BOSS, QUESTIONS_PER_BATTLE, QUESTIONS_PER_BOSS } from "../game";
import { rng, type Gen, type Question, type Tier } from "./core";
import { W0, W1, W2 } from "./worlds-a";
import { W3, W4, W5, W6 } from "./worlds-b";
import { SYNTAX } from "./ap-syntax";
import { BRANCHES } from "./ap-branches";
import { LOOPS } from "./ap-loops";
import { STRINGS } from "./ap-strings";
import { ARRAYS } from "./ap-arrays";
import { CLASSES } from "./ap-classes";
import { ALGORITHMS } from "./ap-algorithms";

export * from "./core";
// Each world has 60 distinct templates: 15 novice, 30 intermediate, 15 hard.
// Retain the original generators (and their skills for saved progress).
export const BANKS: Gen[][] = [
  [...W0, ...SYNTAX], [...W1, ...BRANCHES], [...W2, ...LOOPS],
  [...W3, ...STRINGS], [...W4, ...ARRAYS], [...W5, ...CLASSES], [...W6, ...ALGORITHMS],
];

const TIERS: Tier[][] = [[0], [0, 1], [1], [1, 2], [0, 1, 2]];

// Picks the questions for one battle. Different seeds give different numbers and order.
export function buildBattle(world: number, battle: number, seed: number): Question[] {
  const r = rng(seed * 7919 + world * 101 + battle * 13);
  const bank = BANKS[world];
  const boss = battle === BOSS;
  const count = boss ? QUESTIONS_PER_BOSS : QUESTIONS_PER_BATTLE;
  const allowed = TIERS[battle];
  let pool = r.shuffle(bank.filter((g) => allowed.includes(g.tier)));
  if (boss) {
    // Bosses lean on the harder material.
    pool = [...pool.filter((g) => g.tier === 2), ...pool.filter((g) => g.tier === 1), ...pool.filter((g) => g.tier === 0)];
  }

  const picked: Gen[] = [];
  const skills = new Set<string>();
  const take = (gens: Gen[]) => {
    for (const g of gens) {
      if (picked.length >= count) break;
      if (skills.has(g.skill)) continue;
      skills.add(g.skill);
      picked.push(g);
    }
  };
  take(pool);
  // Not enough distinct skills: borrow from the next tier up before repeating anything.
  const nextTier = Math.min(2, Math.max(...allowed) + 1);
  if (picked.length < count) take(r.shuffle(bank.filter((g) => g.tier === nextTier)));
  // Still short: reuse generators, which produce new numbers each time.
  const repeatable = pool.filter((g) => !g.once);
  let i = 0;
  while (picked.length < count && repeatable.length) picked.push(repeatable[i++ % repeatable.length]);

  const qs = picked.map((g) => g.make(r));
  // Keep at least one non-"predict" question in the mix, and never open with an ordering puzzle.
  const out = r.shuffle(qs);
  if (out[0]?.kind === "order") out.push(out.shift()!);
  return out;
}

export const allSkills = () => BANKS.map((b) => [...new Set(b.map((g) => g.skill))]);

