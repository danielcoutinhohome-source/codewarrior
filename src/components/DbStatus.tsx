"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";

// If the save can't be opened, say why instead of leaving a blank screen.
export default function DbStatus() {
  const [problem, setProblem] = useState<null | "blocked" | "slow" | { error: string }>(null);

  useEffect(() => {
    let open = false;
    const onEvent = (e: Event) => !open && setProblem((e as CustomEvent).detail);
    window.addEventListener("cw-db", onEvent);
    const timer = window.setTimeout(() => !open && setProblem((p) => p ?? "slow"), 6000);
    db.open()
      .then(() => {
        open = true;
        setProblem(null);
      })
      .catch((e: unknown) => {
        const err = e as { name?: string; message?: string; inner?: { name?: string; message?: string } };
        const inner = err.inner ? ` (${err.inner.name}: ${err.inner.message})` : "";
        setProblem({ error: `${err.name || "Error"}: ${err.message || e}${inner}` });
      });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("cw-db", onEvent);
    };
  }, []);

  if (!problem) return null;
  const stuck = problem === "blocked" || problem === "slow";
  return (
    <div role="alertdialog" aria-labelledby="cw-db-title" className="fixed inset-0 z-[100] grid place-items-center bg-[#1F2440]/40 p-6">
      <div className="card flex max-w-md flex-col items-center gap-3 p-6 text-center">
        <h1 id="cw-db-title" className="font-display text-2xl">{stuck ? "Close your other CodeWarrior tabs" : "Your save couldn't open"}</h1>
        <p className="font-bold text-ink-soft">
          {stuck
            ? "CodeWarrior is open in another tab that is running an older version, and it is holding your save. Close the other CodeWarrior tabs or windows, then press Reload."
            : "This browser wouldn't open the saved progress. Press Reload. If it keeps happening, send this message to the CodeWarrior team:"}
        </p>
        {!stuck && <code className="max-w-full break-words rounded-lg bg-[#F3F7FC] px-2 py-1 text-xs text-ink">{problem.error}</code>}
        <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-ocean px-5 py-2 font-black text-white">Reload</button>
      </div>
    </div>
  );
}
