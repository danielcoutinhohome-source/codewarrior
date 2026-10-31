import type { Course } from "../db";
import { BANKS } from "../questions";
import type { Gen } from "../questions/core";
import { CSA_LESSONS } from "./lessons-csa";
import { CSP_LESSONS } from "./lessons-csp";
import type { Lesson } from "./types";

export const LESSONS: Lesson[] = [...CSA_LESSONS, ...CSP_LESSONS];
export const lessonById = (id?: string | null) => LESSONS.find((l) => l.id === id);
export const lessonsFor = (course: Course) => LESSONS.filter((l) => l.course === course);

export const COURSE_LABEL: Record<Course, string> = { csa: "AP CSA · Java", csp: "AP CSP · Pseudocode" };
export const COURSE_NOTE: Record<Course, string> = {
  csa: "Java: assignment is =, equality is ==, arrays and Strings start at index 0, int / int truncates.",
  csp: "AP CSP exam pseudocode: assignment is ←, equality is =, lists start at index 1, / keeps decimals.",
};

// Every bank generator, tagged with the world it lives in.
export type BankGen = Gen & { world: number };
export const BANK_GENS: BankGen[] = BANKS.flatMap((bank, world) => bank.map((g) => ({ ...g, world })));

const bySkill = new Map<string, BankGen[]>();
for (const g of BANK_GENS) bySkill.set(g.skill, [...(bySkill.get(g.skill) || []), g]);
export const gensForSkill = (skill: string) => bySkill.get(skill) || [];

// The lesson a skill belongs to, preferring the student's course.
export function lessonForSkill(skill: string, course?: Course): Lesson | undefined {
  const all = LESSONS.filter((l) => l.skills.includes(skill) || l.extras.some((q) => q.skill === skill));
  return all.find((l) => l.course === course) || all[0];
}

export const isCspSkill = (skill: string) => CSP_LESSONS.some((l) => l.skills.includes(skill));
