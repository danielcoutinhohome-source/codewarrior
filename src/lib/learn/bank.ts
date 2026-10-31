import { BANKS } from "../questions";
import type { Gen } from "../questions/core";

// Every battle-bank generator, tagged with the world it lives in. Kept apart from lessons.ts
// so pages that only need lesson titles (the teacher dashboard) don't load the question bank.
export type BankGen = Gen & { world: number };
export const BANK_GENS: BankGen[] = BANKS.flatMap((bank, world) => bank.map((g) => ({ ...g, world })));

const bySkill = new Map<string, BankGen[]>();
for (const g of BANK_GENS) bySkill.set(g.skill, [...(bySkill.get(g.skill) || []), g]);
export const gensForSkill = (skill: string) => bySkill.get(skill) || [];
