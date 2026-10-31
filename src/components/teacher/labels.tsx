import { BOSS, WORLDS } from "@/lib/game";
import { LESSONS } from "@/lib/learn/lessons";
import type { SessionSummary } from "@/lib/cloud/protocol";

export const battleLabel = (w: number, b: number) => `${WORLDS[w]?.name ?? `World ${w + 1}`} · ${b === BOSS ? "Boss" : `Battle ${b + 1}`} · ${WORLDS[w]?.enemies[b]?.name ?? ""}`;
export const lessonTitle = (id: string | null) => (id ? LESSONS.find((l) => l.id === id)?.title ?? id : "Practice");
export const runLabel = (s: Pick<SessionSummary, "kind" | "world" | "battle" | "lessonId">) =>
  s.kind === "battle" && s.world !== null && s.battle !== null ? battleLabel(s.world, s.battle) : `Practice · ${lessonTitle(s.lessonId)}`;
export const OUTCOME: Record<string, [string, string, string]> = {
  won: ["Won", "#1E7A3E", "#E3F9EA"],
  lost: ["Lost", "#B42318", "#FFE8EA"],
  completed: ["Completed", "#1E7A3E", "#E3F9EA"],
  abandoned: ["Left early", "#6B4A00", "#FFF6E5"],
  in_progress: ["In progress", "#1F7DB5", "#E2F3FF"],
};
export const STATE_LABEL: Record<string, [string, string, string]> = {
  completed: ["Completed", "#1E7A3E", "#E3F9EA"],
  in_progress: ["In progress", "#1F7DB5", "#E2F3FF"],
  not_started: ["Not started", "#4A5175", "#EEF4FB"],
  overdue: ["Overdue", "#B42318", "#FFE8EA"],
};
export function Pill({ v, map }: { v: string; map: Record<string, [string, string, string]> }) {
  const [label, color, bg] = map[v] || [v, "#4A5175", "#EEF4FB"];
  return <span className="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-black" style={{ color, background: bg }}>{label}</span>;
}
