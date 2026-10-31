"use client";

import { useCloud } from "@/lib/cloud/client";
import { cachedHome } from "@/lib/cloud/home";
import { flush, useSyncState } from "@/lib/cloud/outbox";

// Truthful save status for one battle or practice run. "Saved" appears only after the server
// has acknowledged every event of the run.
export default function SyncStatus({ sessionId, assigned }: { sessionId: string | null; assigned?: boolean }) {
  const cloud = useCloud();
  const sync = useSyncState();
  if (!sessionId || !cloud) return null;
  const saved = !!sync.saved[sessionId];
  const shared = !!cachedHome()?.classes.some((c) => c.sharePlay);
  let tone = "#4A5175", bg = "#EEF4FB", text: string, retry = false;
  if (saved) {
    tone = "#1E7A3E";
    bg = "#E3F9EA";
    text = assigned ? "Saved to your class." : shared ? "Saved and shared with your class." : "Saved to your account.";
  } else if (sync.state === "signed-out") {
    text = "Saved on this device. Sign in to your class account again to send it.";
  } else if (sync.state === "offline") {
    text = "Saved on this device. Will sync when you're back online.";
  } else if (sync.state === "error") {
    tone = "#9A3412";
    bg = "#FFF1E6";
    text = "Couldn't sync yet. It's safe on this device.";
    retry = true;
  } else {
    text = "Saving…";
  }
  return (
    <div role="status" className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black" style={{ color: tone, background: bg }}>
      <span>{text}</span>
      {retry && (
        <button type="button" onClick={() => void flush()} className="rounded-lg bg-white px-2 py-0.5 text-xs font-black text-ocean-deep">
          Retry
        </button>
      )}
    </div>
  );
}
