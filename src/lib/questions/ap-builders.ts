// Handwritten AP-style practice; these are original questions, not released exam items.
import { choice, fill, fixed, predict, predictWith, type Gen, type Question, type Tier } from "./core";

export function trace(tier: Tier, skill: string, code: string, answer: string | number | boolean, explain: string): Gen {
  return fixed(skill, tier, () => predict(skill, code, answer, "Track each variable after every statement; use Java's evaluation order.", explain));
}

export function method(tier: Tier, skill: string, declaration: string, call: string, answer: string | number | boolean, explain: string): Gen {
  return fixed(skill, tier, () => predictWith(skill, `${declaration}\n// In main:\nSystem.out.println(${call});`, answer,
    "Trace the arguments, local variables, and return value separately.", explain,
    { src: `${declaration}\npublic static void main(String[] args) { System.out.println(${call}); }`, wrap: "class" }));
}

export function objects(tier: Tier, skill: string, classes: string, use: string, answer: string | number | boolean, explain: string): Gen {
  return fixed(skill, tier, () => predictWith(skill, `${classes}\n// In main:\n${use}`, answer,
    "Draw a separate box for each new object, and arrows for references to it.", explain,
    { src: `${classes}\npublic class Main { public static void main(String[] args) { ${use} } }`, wrap: "file" }));
}

export function mc(tier: Tier, skill: string, prompt: string, options: string[], correct: number, explain: string, code?: string, java?: Question["java"]): Gen {
  // Shuffle the key along with its option, so new items do not favor position A.
  return { skill, tier, once: true, make: (r) => {
    const choices = r.shuffle(options.map((text, index) => ({ text, index })));
    return choice(skill, prompt, choices.map((c) => c.text), choices.findIndex((c) => c.index === correct),
      "Check the stated preconditions and boundary cases before choosing.", explain, code, java);
  } };
}

export function blank(tier: Tier, skill: string, prompt: string, code: string, answers: string[], expect: string, explain: string, src = code, wrap: "main" | "class" | "file" = "main"): Gen {
  return fixed(skill, tier, () => fill(skill, prompt, code, answers,
    "Use the variable names in the code and check the smallest valid input.", explain, { src, wrap, expect }));
}
