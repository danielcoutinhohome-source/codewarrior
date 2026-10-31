import type { Course } from "../db";
import type { Question } from "../questions/core";

// A worked example. Java examples are compiled and run by scripts/verify-questions;
// CSP pseudocode examples carry a JavaScript reference that tests check against `output`.
export type WorkedExample = {
  title: string;
  lang: "java" | "csp";
  code: string;
  output: string;
  steps: string[];
  java?: { src: string; wrap: "main" | "class" | "file" };
  reference?: () => string;
};

// Written explanation task. Graded by the AI tutor when it is connected (and labeled as
// AI feedback), otherwise the student compares against the key points themselves.
export type ExplainTask = {
  id: string;
  skill: string;
  prompt: string;
  code?: string;
  keyPoints: string[];
  model: string;
};

export type Lesson = {
  id: string;
  course: Course;
  world: number; // game world this lesson prepares for; -1 if none
  unit: string; // AP unit or big idea label
  title: string;
  minutes: number;
  objective: string;
  body: string[]; // short paragraphs; `code` and **bold** are rendered
  example: WorkedExample;
  misconception: { wrong: string; right: string; code?: string };
  // Bank skills this lesson covers. Checkpoints and practice draw verified questions from them.
  skills: string[];
  // Extra authored questions (bug fixes, CSP pseudocode). Java ones are compiler-verified;
  // CSP ones carry a JavaScript reference answer checked by the tests.
  extras: (Question & { reference?: () => string })[];
  explain?: ExplainTask[];
  prompts: string[]; // suggested tutor questions for this lesson
};
