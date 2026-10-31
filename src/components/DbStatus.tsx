"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";

type Problem = null | "blocked" | { title: string; text: string; detail?: string };

const describe = (e: unknown) => {
  const err = e as { name?: string; message?: string; inner?: { name?: string; message?: string }; stack?: string };
  if (!err || typeof err !== "object") return String(e);
  const inner = err.inner ? ` (${err.inner.name}: ${err.inner.message})` : "";
  return `${err.name || "Error"}: ${err.message || String(e)}${inner}`;
};

// Screens wait on the save in this browser. If that fails or hangs, say what happened
// instead of leaving a blank screen, with the error text so it can be reported.
export default function DbStatus() {
  const [problem, setProblem] = useState<Problem>(null);

  useEffect(() => {
    let lastError = "";
    let watchdog = 0;
    const onError = (e: ErrorEvent) => e.message && (lastError = e.message);
    const onRejection = (e: PromiseRejectionEvent) => (lastError = describe(e.reason));
    const onDb = (e: Event) => (e as CustomEvent).detail === "blocked" && setProblem("blocked");
    const onLoad = (e: Event) => {
      const d = (e as CustomEvent).detail;
      window.clearTimeout(watchdog);
      if (d === "loading") {
        watchdog = window.setTimeout(() => {
          setProblem((p) => p ?? {
            title: "Your save is taking too long to open",
            text: "Press Reload. If this screen comes back, send this to the CodeWarrior team:",
            detail: `${lastError || "no error reported"} · save ${db.isOpen() ? "open" : "not open"} · ${navigator.userAgent}`,
          });
        }, 8000);
      } else if (d === "ready") setProblem((p) => (p === "blocked" ? p : null));
      else if (d && typeof d === "object" && "error" in d)
        setProblem({ title: "Your save couldn't open", text: "Press Reload. If it keeps happening, send this to the CodeWarrior team:", detail: describe((d as { error: unknown }).error) });
    };
    addEventListener("error", onError);
    addEventListener("unhandledrejection", onRejection);
    addEventListener("cw-db", onDb);
    addEventListener("cw-load", onLoad);
    db.open().then(
      () => setProblem((p) => (p === "blocked" ? null : p)),
      (e: unknown) => setProblem({ title: "Your save couldn't open", text: "Press Reload. If it keeps happening, send this to the CodeWarrior team:", detail: describe(e) }),
    );
    return () => {
      window.clearTimeout(watchdog);
      removeEventListener("error", onError);
      removeEventListener("unhandledrejection", onRejection);
      removeEventListener("cw-db", onDb);
      removeEventListener("cw-load", onLoad);
    };
  }, []);

  if (!problem) return null;
  const p = problem === "blocked"
    ? { title: "Close your other CodeWarrior tabs", text: "CodeWarrior is open in another tab that is running an older version, and it is holding your save. Close the other CodeWarrior tabs or windows, then press Reload.", detail: undefined }
    : problem;
  return (
    <div role="alertdialog" aria-labelledby="cw-db-title" className="fixed inset-0 z-[100] grid place-items-center bg-[#1F2440]/40 p-6">
      <div className="card flex max-w-md flex-col items-center gap-3 p-6 text-center">
        <h1 id="cw-db-title" className="font-display text-2xl">{p.title}</h1>
        <p className="font-bold text-ink-soft">{p.text}</p>
        {p.detail && <code className="max-w-full select-all break-words rounded-lg bg-[#F3F7FC] px-2 py-1 text-left text-xs text-ink">{p.detail}</code>}
        <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-ocean px-5 py-2 font-black text-white">Reload</button>
      </div>
    </div>
  );
}
