import { questionContentKey } from "./core";
import type { Attempt } from "../db";

// Skill-level review evidence plus a bounded recent-content window. Several
// randomized templates may teach the same saved skill.
export type QuestionHistory = {
  lastSeen: Map<string, number>; // skill -> time last answered
  recentContent?: Set<string>; // displayed questions from the last 100 answers
  review: Set<string>; // skills to bring back: missed and not yet right twice in a row since
};

export const emptyHistory = (): QuestionHistory => ({ lastSeen: new Map(), review: new Set(), recentContent: new Set() });

// A miss (not right on the first try, or a hint used) puts a template on review. It leaves
// review after two first-try rights in a row.
export function buildHistory(attempts: (Pick<Attempt, "skill" | "firstTry" | "at"> & Partial<Pick<Attempt, "kind" | "prompt" | "code">>)[]): QuestionHistory {
  const h = emptyHistory();
  const streak = new Map<string, number>();
  const chronological = [...attempts].sort((x, y) => x.at - y.at);
  for (const a of chronological.slice(-100)) {
    if (a.kind && a.prompt) h.recentContent!.add(questionContentKey({ kind: a.kind, prompt: a.prompt, code: a.code }));
  }
  for (const a of chronological) {
    h.lastSeen.set(a.skill, a.at);
    if (!a.firstTry) {
      h.review.add(a.skill);
      streak.set(a.skill, 0);
    } else {
      const n = (streak.get(a.skill) || 0) + 1;
      streak.set(a.skill, n);
      if (n >= 2) h.review.delete(a.skill);
    }
  }
  return h;
}
