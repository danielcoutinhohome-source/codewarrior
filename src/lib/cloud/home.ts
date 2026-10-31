"use client";

import { api, getCloud } from "./client";
import type { ClassInfo, Feedback, SessionSummary, StudentAssignment } from "./protocol";

export type StudentHome = {
  classes: ClassInfo[];
  assignments: StudentAssignment[];
  feedback: (Feedback & { className: string })[];
  recent: (SessionSummary & { className: string | null })[];
  serverTime: number;
};

// The last student dashboard, cached per account so assignment launches work offline.
const key = (uid: string) => `cw.cloud.home.${uid}`;
export function cachedHome(): StudentHome | null {
  const c = getCloud();
  if (!c) return null;
  try {
    return JSON.parse(localStorage.getItem(key(c.me.id)) || "null");
  } catch {
    return null;
  }
}
export async function fetchHome(): Promise<StudentHome> {
  const c = getCloud();
  const h = await api<StudentHome>("GET", "/student/home");
  if (c) {
    try {
      localStorage.setItem(key(c.me.id), JSON.stringify(h));
    } catch {}
  }
  return h;
}

// An assignment launch is honored only if the cached dashboard has that published
// assignment and it includes this battle. The server checks again when the result arrives.
export function assignmentFor(assignmentId: string | null, check: (a: StudentAssignment) => boolean) {
  if (!assignmentId) return null;
  const a = cachedHome()?.assignments.find((x) => x.id === assignmentId);
  return a && check(a) ? a : null;
}
