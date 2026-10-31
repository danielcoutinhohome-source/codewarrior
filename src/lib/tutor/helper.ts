import type { Course } from "../db";
import { lessonForSkill, lessonsFor } from "../learn/lessons";
import type { Lesson } from "../learn/types";

// The built-in study helper. It is not AI: every reply is assembled from the lessons and the
// verified answer keys already in the site, so it is free, unlimited, instant and works with
// no connection. It answers the tutor buttons (hints, explanations, examples, "why was I
// wrong", boss prep). Open-ended questions go to the AI tutor when it is online.

export const HELPER_ACTIONS = new Set(["hint", "explain-differently", "simpler-example", "why-wrong", "boss-prep"]);

export type HelperInput = {
  action?: string;
  text: string;
  focus?: string;
  lesson?: Lesson;
  course: Course;
  round: number; // how many times this action was already answered in this conversation
  boss?: { name: string; world: number; worldName: string; topic: string };
};

export type Focus = {
  question?: string;
  skill?: string;
  code?: string;
  given?: string;
  answer?: string;
  explanation?: string;
  hint?: string;
  task?: string;
  reference?: string;
};

export function parseFocus(focus?: string): Focus {
  if (!focus) return {};
  const pick = (re: RegExp) => focus.match(re)?.[1]?.trim() || undefined;
  // First line looks like "Question (predict, skill: Remainder (%)): What does this print?".
  // Skill names can contain parentheses, so split at the last "): " on that line.
  const head = focus.match(/skill:\s*([^\n]*)\):\s*([^\n]*)/);
  return {
    question: head?.[2]?.trim() || undefined,
    skill: head?.[1]?.trim() || undefined,
    code: pick(/\nCode:\n([\s\S]*?)(?:\n\n|\nStudent answered:|\nVerified|$)/),
    given: pick(/Student answered:\s*([^\n]*)/),
    answer: pick(/Verified correct answer:\s*([\s\S]*?)(?:\nVerified explanation:|$)/),
    explanation: pick(/Verified explanation:\s*([\s\S]*?)(?:\n\n|$)/),
    hint: pick(/Question hint:\s*([^\n]+)/),
    task: pick(/Written explanation task:\s*([^\n]+)/),
    reference: pick(/Reference answer:\s*([\s\S]*)$/),
  };
}

const STOP = new Set("the a an and or of to in on is are was what how why does do i my me you it this that with for be can when vs versus between difference explain about use using work works mean means happen happens get gets operator thing".split(" "));
const words = (s: string) => (s.toLowerCase().match(/[a-z0-9_.=%!<>+-]+/g) || []).filter((w) => w.length > 1 && !STOP.has(w));

// Lessons ranked by how well they match a question. Title and skills count most.
export function searchLessons(query: string, course: Course, n = 3): Lesson[] {
  const q = words(query);
  if (!q.length) return [];
  const scored = lessonsFor(course).map((l) => {
    const fields: [string, number][] = [[l.title, 4], [l.skills.join(" "), 3], [l.objective, 2], [l.body.join(" ") + " " + l.misconception.wrong + " " + l.misconception.right, 1]];
    let score = 0;
    for (const [text, weight] of fields) {
      const t = ` ${words(text).join(" ")} `;
      for (const w of q) if (t.includes(` ${w} `)) score += weight;
    }
    return { l, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, n).map((s) => s.l);
}

const fence = (code: string, lang: string) => "```" + (lang === "java" ? "java" : "") + "\n" + code + "\n```";

const example = (l: Lesson) =>
  [`**Worked example: ${l.example.title}**`, fence(l.example.code, l.example.lang), ...l.example.steps.map((s, i) => `${i + 1}. ${s}`), `Output:`, fence(l.example.output, "")].join("\n\n");

const mixup = (l: Lesson) =>
  [`**A common mix-up:** ${l.misconception.wrong}`, `**What actually happens:** ${l.misconception.right}`, l.misconception.code ? fence(l.misconception.code, l.course === "csa" ? "java" : "") : ""].filter(Boolean).join("\n\n");

const keyIdea = (l: Lesson) => `**Key idea (${l.title}):** ${l.objective}\n\n${l.body[0]}`;

const practiceLine = (l?: Lesson, skill?: string) =>
  l ? `Next step: a short verified practice set on **${skill || l.title}** (Practice → ${l.title}).` : "";

function lessonFor(input: HelperInput, f: Focus) {
  return input.lesson && (!f.skill || input.lesson.skills.includes(f.skill))
    ? input.lesson
    : (f.skill && lessonForSkill(f.skill, input.course)) || input.lesson || searchLessons(`${f.skill || ""} ${f.question || ""} ${input.text}`, input.course, 1)[0];
}

export function helperReply(input: HelperInput): string | null {
  const f = parseFocus(input.focus);
  const l = lessonFor(input, f);
  const r = input.round;

  switch (input.action) {
    case "hint": {
      if (f.question || f.task) {
        if (r === 0) return f.hint ? `**Hint 1:** ${f.hint}` : l ? `**Hint 1:** ${l.objective}` : null;
        if (r === 1 && l) return `**Hint 2:** ${l.misconception.right}${l.misconception.code ? `\n\n${fence(l.misconception.code, l.course === "csa" ? "java" : "")}` : ""}`;
        if (l) return `**Hint 3:** here is the same idea worked through step by step. Apply each step to your question.\n\n${example(l)}\n\nAnswer it, and if you miss it, press **WHY WAS I WRONG?** for the full explanation.`;
        return null;
      }
      if (!l) return null;
      return [keyIdea(l), mixup(l), example(l)][Math.min(r, 2)];
    }
    case "explain-differently": {
      if (!l && !f.explanation) return null;
      const views = [
        f.explanation ? `**In short:** ${f.explanation}${l ? `\n\n${mixup(l)}` : ""}` : l ? mixup(l) : "",
        l ? example(l) : "",
        l ? `**${l.title}**\n\n${l.body.join("\n\n")}` : "",
      ].filter(Boolean);
      return views[r % views.length];
    }
    case "simpler-example": {
      if (!l) return null;
      return r % 2 === 0 ? example(l) : l.misconception.code ? `**Side by side:**\n\n${fence(l.misconception.code, l.course === "csa" ? "java" : "")}\n\n${l.misconception.right}` : example(l);
    }
    case "why-wrong": {
      if (!f.answer) return null;
      const parts = [
        f.given ? `You answered \`${f.given}\`. The verified answer is ${f.answer.includes("\n") ? `\n\n${fence(f.answer, input.course === "csa" ? "java" : "")}` : `\`${f.answer}\`.`}` : `The verified answer is \`${f.answer}\`.`,
        f.explanation ? `**Why:** ${f.explanation}` : "",
        l ? mixup(l) : "",
        practiceLine(l, f.skill),
      ];
      return parts.filter(Boolean).join("\n\n");
    }
    case "check-reasoning": {
      if (!f.reference) return null;
      return `I can't grade free writing (I'm the built-in helper, not AI), but you can check yourself against the reference answer:\n\n> ${f.reference.replace(/\n/g, "\n> ")}\n\nDid yours say the same thing in your own words? If a key idea is missing, add it and you've got it.`;
    }
    case "boss-prep": {
      if (!input.boss) return null;
      const ls = lessonsFor(input.course).filter((x) => x.world === input.boss!.world);
      return [
        `**Boss prep: ${input.boss.name}** (${input.boss.worldName})`,
        `This world covers: ${input.boss.topic}.`,
        ls.length ? `Review these, then run an **Exam** difficulty practice set on each:\n\n${ls.map((x) => `- **${x.title}**: ${x.objective}`).join("\n")}` : "",
        ls[0] ? mixup(ls[0]) : "",
      ].filter(Boolean).join("\n\n");
    }
  }
  return null;
}

// For typed questions when the AI tutor is offline or its free daily allowance is used up.
export function helperFallback(input: HelperInput, why: "offline" | "limit"): string {
  const found = searchLessons(`${input.text} ${parseFocus(input.focus).skill || ""}`, input.course, 3);
  const head = why === "limit"
    ? "The AI tutor has hit its free limit for now. I'm the built-in study helper, not AI, so I can't answer open questions, but this should help:"
    : "The AI tutor is offline right now. I'm the built-in study helper, not AI, so I can't answer open questions, but this should help:";
  if (!found.length) return `${head}\n\nI couldn't match that to a lesson. Try the buttons below (hint, explain, example), or open **Lessons** and pick a topic.`;
  const [top, ...rest] = found;
  return [head, keyIdea(top), mixup(top), rest.length ? `Also related: ${rest.map((x) => `**${x.title}**`).join(", ")}.` : ""].filter(Boolean).join("\n\n");
}
