import type { Course } from "../db";
import { rng, type Question, type Rng, type Tier } from "../questions/core";
import { BANK_GENS, gensForSkill, lessonById, lessonForSkill, lessonsFor } from "./lessons";
import type { ExplainTask, Lesson } from "./types";

// A practice item is either a verified question (bank generator, compiler-checked bug fix,
// or reference-checked CSP pseudocode) or a short written explanation.
export type PracticeItem =
  | { type: "question"; q: Question; lessonId: string; world: number; tier: Tier; origin: "bank" | "lesson" }
  | { type: "explain"; task: ExplainTask; lessonId: string; world: number; tier: Tier };

export type Difficulty = "warmup" | "core" | "exam" | "mixed";
export const DIFFICULTY: { id: Difficulty; label: string; tiers: Tier[] }[] = [
  { id: "warmup", label: "Warm-up", tiers: [0] },
  { id: "core", label: "Core", tiers: [1] },
  { id: "exam", label: "Exam level", tiers: [2] },
  { id: "mixed", label: "Mixed", tiers: [0, 1, 2] },
];

export const fingerprint = (q: Question) => JSON.stringify([q.kind, q.prompt, q.code, q.options && [...q.options].sort(), q.lines]);

type Candidate = { make: (r: Rng) => PracticeItem; tier: Tier; key: string; skill: string; repeatable: boolean };

function candidates(lesson: Lesson, includeExplain: boolean): Candidate[] {
  const out: Candidate[] = [];
  for (const skill of lesson.skills)
    for (const g of gensForSkill(skill)) {
      // CSA lessons never pull CSP pseudocode, and the reverse.
      out.push({ tier: g.tier, skill: g.skill, key: `bank:${g.skill}:${g.world}`, repeatable: !g.once, make: (r) => ({ type: "question", q: g.make(r), lessonId: lesson.id, world: g.world, tier: g.tier, origin: "bank" }) });
    }
  lesson.extras.forEach((q, i) => out.push({ tier: 1, skill: q.skill, key: `extra:${lesson.id}:${i}`, repeatable: false, make: () => ({ type: "question", q: { ...q }, lessonId: lesson.id, world: lesson.world, tier: 1, origin: "lesson" }) }));
  if (includeExplain)
    (lesson.explain || []).forEach((task) => out.push({ tier: 1, skill: task.skill, key: `explain:${task.id}`, repeatable: false, make: () => ({ type: "explain", task, lessonId: lesson.id, world: lesson.world, tier: 1 }) }));
  return out;
}

export type SetOptions = {
  course: Course;
  lessonId?: string; // one lesson's topic; omitted means across the course
  skill?: string; // focus one skill (misconception follow-up)
  difficulty?: Difficulty;
  count?: number;
  seed?: number;
  includeExplain?: boolean;
  seen?: Set<string>; // fingerprints to avoid
};

// Builds a practice set. Questions come only from verified sources.
export function buildPracticeSet(opts: SetOptions): PracticeItem[] {
  const r = rng(opts.seed ?? Date.now());
  const count = opts.count ?? 5;
  const tiers = DIFFICULTY.find((d) => d.id === (opts.difficulty || "mixed"))!.tiers;
  const lessons = opts.lessonId ? [lessonById(opts.lessonId)].filter(Boolean) as Lesson[] : lessonsFor(opts.course);
  let pool = lessons.flatMap((l) => candidates(l, opts.includeExplain ?? true));
  if (opts.skill) {
    const focus = pool.filter((c) => c.skill === opts.skill);
    if (focus.length) pool = focus;
  }
  const inTier = pool.filter((c) => tiers.includes(c.tier));
  // Fall back to the nearest tiers when a topic has few questions at the asked level.
  const ordered = [...r.shuffle(inTier), ...r.shuffle(pool.filter((c) => !tiers.includes(c.tier)))];

  const seen = new Set(opts.seen || []);
  const out: PracticeItem[] = [];
  const usedKeys = new Set<string>();
  let explainCount = 0;
  for (const c of ordered) {
    if (out.length >= count) break;
    if (usedKeys.has(c.key)) continue;
    const item = c.make(r);
    if (item.type === "explain") {
      if (explainCount >= 1 || out.length === 0) continue; // at most one, never first
      explainCount++;
    } else {
      const fp = fingerprint(item.q);
      if (seen.has(fp)) continue;
      seen.add(fp);
    }
    usedKeys.add(c.key);
    out.push(item);
  }
  // Repeatable generators can produce fresh numbers if the topic ran out.
  for (let i = 0; out.length < count && i < 40; i++) {
    const c = r.pick(pool.filter((p) => p.repeatable));
    if (!c) break;
    const item = c.make(r);
    if (item.type !== "question" || seen.has(fingerprint(item.q))) continue;
    seen.add(fingerprint(item.q));
    out.push(item);
  }
  // Never open with an ordering puzzle or a written explanation.
  const first = out.findIndex((it) => it.type === "question" && it.q.kind !== "order");
  if (first > 0) out.unshift(...out.splice(first, 1));
  return out;
}

// After a miss, the next question tests the same idea: the same skill with new values when the
// generator allows it, otherwise another skill from the same lesson at a nearby difficulty.
export function followUp(missed: PracticeItem, course: Course, seen: Set<string>, seed: number): PracticeItem | null {
  if (missed.type !== "question") return null;
  const r = rng(seed);
  const skill = missed.q.skill;
  for (const g of r.shuffle(gensForSkill(skill))) {
    if (g.once) continue;
    for (let k = 0; k < 6; k++) {
      const q = g.make(r);
      if (!seen.has(fingerprint(q))) return { type: "question", q, lessonId: missed.lessonId, world: g.world, tier: g.tier, origin: "bank" };
    }
  }
  const lesson = lessonById(missed.lessonId) || lessonForSkill(skill, course);
  if (!lesson) return null;
  // Prefer skills whose names share a key word with the missed one (e.g. "substring").
  const words = skill.toLowerCase().split(/[^a-z0-9#]+/).filter((w) => w.length > 3);
  const related = (s: string) => words.some((w) => s.toLowerCase().includes(w));
  const pool = candidates(lesson, false)
    .map((c) => c.make(r))
    .filter((it): it is Extract<PracticeItem, { type: "question" }> => it.type === "question" && !seen.has(fingerprint(it.q)));
  const ranked = [...pool].sort((a, b) => Number(related(b.q.skill)) - Number(related(a.q.skill)) || Math.abs(a.tier - missed.tier) - Math.abs(b.tier - missed.tier));
  return ranked[0] || null;
}

// A short description of the current question for the tutor. Never includes the answer key
// unless the student has already answered (reveal = true).
export function describeForTutor(item: PracticeItem, reveal: boolean, given?: string) {
  if (item.type === "explain") return `Written explanation task: ${item.task.prompt}${item.task.code ? `\nCode:\n${item.task.code}` : ""}`;
  const q = item.q;
  const parts = [`Question (${q.label || q.kind}, skill: ${q.skill}): ${q.prompt}`];
  if (q.code) parts.push(`Code:\n${q.code}`);
  if (q.options) parts.push(`Options:\n${q.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}`);
  if (q.lines) parts.push(`Lines to order (shown shuffled to the student):\n${q.lines.join("\n")}`);
  if (given !== undefined) parts.push(`Student answered: ${given}`);
  if (reveal) parts.push(`Verified correct answer: ${answerText(q)}\nVerified explanation: ${q.explain}`);
  return parts.join("\n\n");
}

export const answerText = (q: Question) =>
  q.kind === "choice" ? q.options![q.correct!] : q.kind === "order" ? q.lines!.join("\n") : q.answers![0];

export const givenText = (q: Question, value: string | number | string[]) =>
  q.kind === "choice" ? q.options![value as number] ?? "" : Array.isArray(value) ? value.join("\n") : String(value);

export { BANK_GENS };
