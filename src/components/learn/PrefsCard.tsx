"use client";

import { useState } from "react";
import { Button } from "../ui";
import type { LearnPrefs, LearnProfile } from "@/lib/db";
import { resetPersonalization, setPrefs } from "@/lib/learn/store";

const OPTIONS: { key: keyof Omit<LearnPrefs, "useProgress">; label: string; choices: { v: string; label: string }[] }[] = [
  { key: "length", label: "Explanations", choices: [{ v: "short", label: "Short" }, { v: "steps", label: "Step by step" }] },
  { key: "level", label: "Style of language", choices: [{ v: "beginner", label: "Beginner-friendly" }, { v: "exam", label: "AP exam style" }] },
  { key: "style", label: "When I'm stuck", choices: [{ v: "guided", label: "Guide me with hints" }, { v: "direct", label: "Explain it directly" }] },
];

export default function PrefsCard({ profile, onChange }: { profile: LearnProfile; onChange: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const p = profile.prefs;
  const update = async (patch: Partial<LearnPrefs>) => {
    await setPrefs(profile.id, patch);
    onChange();
  };
  return (
    <section className="card flex flex-col gap-4 p-5" aria-labelledby="prefs-title">
      <div>
        <h2 id="prefs-title" className="font-display text-2xl">How the tutor teaches you</h2>
        <p className="text-sm font-bold text-ink-mute">Saved on this device. The tutor uses these in every conversation.</p>
      </div>
      {OPTIONS.map((o) => (
        <div key={o.key} className="flex flex-col gap-1.5">
          <span className="text-[13px] font-black uppercase tracking-wider text-ink-soft">{o.label}</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={o.label}>
            {o.choices.map((c) => {
              const on = p[o.key] === c.v;
              return (
                <button key={c.v} type="button" role="radio" aria-checked={on} onClick={() => update({ [o.key]: c.v } as Partial<LearnPrefs>)} className="rounded-xl border-[3px] px-3 py-1.5 text-sm font-black" style={{ borderColor: on ? "#8B5CF6" : "#D5E4F5", background: on ? "#F1EAFF" : "#FFFFFF", color: on ? "#6D4BD8" : "#4A5175" }}>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <label className="flex items-start gap-3 rounded-2xl bg-sky px-3 py-2.5">
        <input type="checkbox" className="mt-1 h-5 w-5 accent-[#8B5CF6]" checked={p.useProgress} onChange={(e) => update({ useProgress: e.target.checked })} />
        <span className="text-sm font-bold text-ink-soft">
          <span className="font-black text-ink">Let the tutor see my progress.</span> It gets your current world, finished lessons, topics that need practice and recent mistakes, so it can tailor help. Never your name or password.
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {confirm ? (
          <>
            <span className="text-sm font-bold text-danger-deep">Reset preferences and clear practice and mistake history? Game progress and saved conversations stay.</span>
            <Button size="sm" tone="danger" onClick={async () => { await resetPersonalization(profile.id); setConfirm(false); setDone(true); onChange(); }}>RESET</Button>
            <Button size="sm" tone="white" onClick={() => setConfirm(false)}>CANCEL</Button>
          </>
        ) : (
          <Button size="sm" tone="white" onClick={() => { setDone(false); setConfirm(true); }}>RESET PERSONALIZATION</Button>
        )}
        {done && <span role="status" className="text-sm font-black text-[#2BA155]">Personalization reset.</span>}
      </div>
    </section>
  );
}
