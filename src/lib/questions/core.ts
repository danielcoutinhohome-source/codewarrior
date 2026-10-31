// Question model, a seeded random generator, and small builders shared by every world.

export type Kind = "predict" | "fill" | "choice" | "order";

export type Question = {
  id: string; // stable per skill + variant
  skill: string; // what a teacher would call it, e.g. "Integer division"
  kind: Kind;
  prompt: string;
  code?: string; // shown to the student; "___" marks the blank in fill questions
  answers?: string[]; // predict / fill: accepted answers, first is canonical
  options?: string[]; // choice
  correct?: number; // choice: index of the right option
  lines?: string[]; // order: lines in the correct order
  hint: string;
  explain: string;
  // For automated checking with real Java (scripts/verify-questions).
  java?: { src: string; wrap: "main" | "class" | "file"; expect: string };
};

export type Tier = 0 | 1 | 2;
export type Gen = { skill: string; tier: Tier; make: (r: Rng) => Question; once?: boolean };

// ---- seeded RNG (mulberry32) ----
export type Rng = { next: () => number; int: (lo: number, hi: number) => number; pick: <T>(a: readonly T[]) => T; shuffle: <T>(a: T[]) => T[] };
export function rng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = <T,>(a: readonly T[]) => a[Math.floor(next() * a.length)];
  const shuffle = <T,>(a: T[]) => {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };
  return { next, int, pick, shuffle };
}

// ---- builders ----
let counter = 0;
const nid = (skill: string, v: string | number) => `${skill.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${v}:${counter++}`;

// "What does this print?" for statements that run inside main.
export function predict(skill: string, code: string, out: string | number | boolean, hint: string, explain: string, prompt = "What does this print?"): Question {
  const o = String(out);
  return { id: nid(skill, o), skill, kind: "predict", prompt, code, answers: [o], hint, explain, java: { src: code, wrap: "main", expect: o } };
}

// Same, but the code uses methods or classes, so verification needs its own program.
export function predictWith(skill: string, code: string, out: string | number | boolean, hint: string, explain: string, java: { src: string; wrap: "class" | "file" }, prompt = "What does this print?"): Question {
  const o = String(out);
  return { id: nid(skill, o), skill, kind: "predict", prompt, code, answers: [o], hint, explain, java: { ...java, expect: o } };
}

// Fill the blank. `java.src` contains "___" and is run once per accepted answer.
export function fill(skill: string, prompt: string, code: string, answers: string[], hint: string, explain: string, java: { src: string; wrap: "main" | "class" | "file"; expect: string }): Question {
  return { id: nid(skill, answers[0]), skill, kind: "fill", prompt, code, answers, hint, explain, java };
}

export function choice(skill: string, prompt: string, options: string[], correct: number, hint: string, explain: string, code?: string, java?: Question["java"]): Question {
  return { id: nid(skill, correct), skill, kind: "choice", prompt, code, options, correct, hint, explain, java };
}

// Put lines in order. `java.src` contains "@@LINES@@" where the ordered lines go.
export function order(skill: string, prompt: string, lines: string[], hint: string, explain: string, java: { src: string; wrap: "main" | "class" | "file"; expect: string }): Question {
  return { id: nid(skill, lines.length), skill, kind: "order", prompt, lines, hint, explain, java };
}

export const fixed = (skill: string, tier: Tier, q: () => Question): Gen => ({ skill, tier, make: () => q(), once: true });

// Answer checking used by the battle screen.
export function normalize(s: string) {
  const t = s.trim().replace(/\s+/g, " ").replace(/^"(.*)"$/, "$1");
  return /^(true|false)$/i.test(t) ? t.toLowerCase() : t;
}
export function isRight(q: Question, given: string | number | string[]) {
  if (q.kind === "choice") return given === q.correct;
  if (q.kind === "order") return Array.isArray(given) && given.join("\n") === (q.lines || []).join("\n");
  const g = normalize(String(given));
  return (q.answers || []).some((a) => normalize(a) === g);
}

// Small Java-semantics helpers for generators.
export const jdiv = (a: number, b: number) => Math.trunc(a / b);
export const jmod = (a: number, b: number) => a % b;
export const arr = (xs: (number | string)[]) => `{${xs.join(", ")}}`;
export const jstr = (xs: (number | string)[]) => `[${xs.join(", ")}]`;
