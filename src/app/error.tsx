"use client";

// Shown instead of a blank page if a screen crashes.
export default function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-sky p-6">
      <div className="card flex max-w-md flex-col items-center gap-3 p-6 text-center">
        <h1 className="font-display text-3xl">Something went wrong</h1>
        <p className="font-bold text-ink-soft">Your progress is saved. Reloading usually fixes this.</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => location.reload()} className="rounded-xl bg-ocean px-4 py-2 font-black text-white">Reload</button>
          <button type="button" onClick={reset} className="rounded-xl border-[3px] border-line bg-white px-4 py-2 font-black text-ink">Try again</button>
        </div>
        <p className="text-xs font-bold text-ink-mute">{error?.message}</p>
      </div>
    </div>
  );
}
