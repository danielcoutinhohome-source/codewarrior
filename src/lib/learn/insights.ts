import type { Attempt, Course, LearnProfile, Progress } from "../db";
import { BOSS, WORLDS, key } from "../game";
import { frontier } from "../progress";
import { lessonForSkill, lessonsFor } from "./lessons";
import type { Lesson } from "./types";

export type Evidence = { right: number; missed: number; n: number };
export type Level = "none" | "practice" | "growing" | "strong";
export const LEVEL_LABEL: Record<Level, string> = {
  none: "Not enough data yet",
  practice: "Needs more practice",
  growing: "Getting there",
  strong: "Strong so far",
};

// Honest labels: a handful of answers never counts as mastery.
export function levelFor(e: Evidence): Level {
  if (e.n < 4) return "none";
  const acc = e.right / e.n;
  if (acc < 0.6) return "practice";
  if (acc >= 0.85 && e.n >= 6) return "strong";
  return "growing";
}

// Skill evidence: battle first-round tallies (saved in progress) plus practice and lesson
// checkpoint answers. Battle attempts in the attempts table are skipped to avoid counting twice.
export function skillEvidence(progress: Progress | null, attempts: Attempt[]): Map<string, Evidence> {
  const m = new Map<string, Evidence>();
  const add = (skill: string, right: number, missed: number) => {
    const e = m.get(skill) || { right: 0, missed: 0, n: 0 };
    e.right += right;
    e.missed += missed;
    e.n = e.right + e.missed;
    m.set(skill, e);
  };
  for (const [skill, [r, x]] of Object.entries(progress?.skills || {})) add(skill, r, x);
  for (const a of attempts) if (a.source !== "battle") add(a.skill, a.firstTry ? 1 : 0, a.firstTry ? 0 : 1);
  return m;
}

export function lessonEvidence(lesson: Lesson, ev: Map<string, Evidence>): Evidence {
  const skills = new Set([...lesson.skills, ...lesson.extras.map((q) => q.skill)]);
  const out = { right: 0, missed: 0, n: 0 };
  for (const s of skills) {
    const e = ev.get(s);
    if (e) {
      out.right += e.right;
      out.missed += e.missed;
    }
  }
  out.n = out.right + out.missed;
  return out;
}

export type Mistake = { skill: string; lessonId?: string; at: number; source: Attempt["source"]; world: number; attempt: Attempt };

// Recent misses, newest first, one per skill.
export function recentMistakes(attempts: Attempt[], course: Course, days = 21): Mistake[] {
  const since = Date.now() - days * 86_400_000;
  const seen = new Set<string>();
  const out: Mistake[] = [];
  for (const a of [...attempts].sort((x, y) => y.at - x.at)) {
    if (a.at < since || a.firstTry) continue;
    if (seen.has(a.skill)) continue;
    seen.add(a.skill);
    out.push({ skill: a.skill, lessonId: lessonForSkill(a.skill, course)?.id, at: a.at, source: a.source, world: a.world, attempt: a });
  }
  return out;
}

export type Recommendation =
  | { kind: "mistake"; title: string; reason: string; lessonId?: string; skill: string }
  | { kind: "lesson"; title: string; reason: string; lessonId: string }
  | { kind: "practice"; title: string; reason: string; lessonId: string }
  | { kind: "boss"; title: string; reason: string; world: number; lessonId?: string };

const WHERE: Record<Attempt["source"], string> = { battle: "in a battle", practice: "in practice", lesson: "in a lesson checkpoint" };

export function recommend(profile: LearnProfile, progress: Progress | null, attempts: Attempt[]): Recommendation[] {
  const course = profile.course;
  const lessons = lessonsFor(course);
  const ev = skillEvidence(progress, attempts);
  const out: Recommendation[] = [];

  // 1. Something the student missed recently, if it was not fixed since.
  const fixedLater = (m: Mistake) => attempts.some((a) => a.skill === m.skill && a.at > m.at && a.firstTry);
  const miss = recentMistakes(attempts, course).find((m) => !fixedLater(m));
  if (miss) {
    const where = miss.source === "battle" && miss.world >= 0 ? `in ${WORLDS[miss.world]?.name ?? "a battle"}` : WHERE[miss.source];
    out.push({ kind: "mistake", title: `Fix: ${miss.skill}`, reason: `You missed this ${where}. A short targeted practice checks the exact idea.`, lessonId: miss.lessonId, skill: miss.skill });
  }

  // 2. The next lesson for the world the student is on in the game.
  const f = progress ? frontier(progress) : { w: 0, b: 0 };
  const nextLesson = lessons.find((l) => l.world === f.w && profile.lessons[l.id]?.status !== "done") || lessons.find((l) => profile.lessons[l.id]?.status !== "done");
  if (nextLesson) {
    const tied = nextLesson.world === f.w && progress;
    out.push({ kind: "lesson", title: nextLesson.title, reason: tied ? `Matches ${WORLDS[f.w].name}, where you are in the game.` : "Next lesson in your course.", lessonId: nextLesson.id });
  }

  // 3. The weakest topic with enough evidence to say so.
  const weak = lessons
    .map((l) => ({ l, e: lessonEvidence(l, ev) }))
    .filter(({ e }) => levelFor(e) === "practice")
    .sort((a, b) => a.e.right / a.e.n - b.e.right / b.e.n)[0];
  if (weak) out.push({ kind: "practice", title: `Practice: ${weak.l.title}`, reason: `${weak.e.right} of ${weak.e.n} first tries right so far.`, lessonId: weak.l.id });

  // 4. Boss prep when the next fight is a boss.
  if (progress && f.b === BOSS && !progress.stars[key(f.w, BOSS)]) {
    const l = lessons.find((x) => x.world === f.w);
    out.push({ kind: "boss", title: `Prepare for ${WORLDS[f.w].enemies[BOSS].name}`, reason: `The ${WORLDS[f.w].name} boss uses harder ${WORLDS[f.w].topic.toLowerCase()} questions.`, world: f.w, lessonId: l?.id });
  }
  return out;
}

// The compact, minimal learning context the tutor may receive (only when the student allows it).
export function tutorContext(profile: LearnProfile, progress: Progress | null, attempts: Attempt[]) {
  const ev = skillEvidence(progress, attempts);
  const lessons = lessonsFor(profile.course);
  const f = progress ? frontier(progress) : null;
  const needs = lessons.filter((l) => levelFor(lessonEvidence(l, ev)) === "practice").map((l) => l.title).slice(0, 4);
  const strong = lessons.filter((l) => levelFor(lessonEvidence(l, ev)) === "strong").map((l) => l.title).slice(0, 4);
  const done = lessons.filter((l) => profile.lessons[l.id]?.status === "done").map((l) => l.title).slice(0, 10);
  const mistakes = recentMistakes(attempts, profile.course, 14).slice(0, 4).map((m) => m.skill);
  const worldsCleared = progress ? WORLDS.filter((_, w) => progress.stars[key(w, BOSS)]).map((w) => w.name) : [];
  return {
    currentWorld: f ? `${WORLDS[f.w].name} (${WORLDS[f.w].topic})` : undefined,
    worldsCleared,
    lessonsCompleted: done,
    needsPractice: needs,
    strengths: strong,
    recentMistakes: mistakes,
  };
}
