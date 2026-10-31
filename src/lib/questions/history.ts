import type { Attempt } from "../db";

// What a student has already seen, per question template (identified by skill name, which is
// unique within a world). Built from the answers this device already records.
export type QuestionHistory = {
  lastSeen: Map<string, number>; // skill -> time last answered
  review: Set<string>; // skills to bring back: missed and not yet right twice in a row since
};

export const emptyHistory = (): QuestionHistory => ({ lastSeen: new Map(), review: new Set() });

// A miss (not right on the first try, or a hint used) puts a template on review. It leaves
// review after two first-try rights in a row.
export function buildHistory(attempts: Pick<Attempt, "skill" | "firstTry" | "at">[]): QuestionHistory {
  const h = emptyHistory();
  const streak = new Map<string, number>();
  for (const a of [...attempts].sort((x, y) => x.at - y.at)) {
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
