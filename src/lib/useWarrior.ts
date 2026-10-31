"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getSession, logOut, touchStreak } from "./auth";
import { db, type Account, type Progress } from "./db";

// The last warrior loaded, kept in memory across screens. Without it every screen
// started empty and flashed blank while the save loaded from IndexedDB.
let cache: { account: Account; progress: Progress } | null = null;
const cached = () => (cache && cache.account.id === getSession() ? cache : null);

// Loads the signed-in warrior from this device, or sends the player to the start screen.
export function useWarrior() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(() => cached()?.account ?? null);
  const [progress, setProgress] = useState<Progress | null>(() => cached()?.progress ?? null);
  // True when this screen could draw right away from memory.
  const [warm] = useState(() => !!cached());

  const refresh = useCallback(async () => {
    const id = getSession();
    if (!id) return;
    const [a, p] = await Promise.all([db.accounts.get(id), db.progress.get(id)]);
    if (a) setAccount(a);
    if (p) setProgress(p);
    cache = a && p ? { account: a, progress: p } : null;
    return { account: a, progress: p };
  }, []);

  useEffect(() => {
    const id = getSession();
    if (!id) {
      router.replace("/");
      return;
    }
    // Tell the save watchdog (DbStatus) that a screen is waiting on the save.
    const say = (detail: unknown) => window.dispatchEvent(new CustomEvent("cw-load", { detail }));
    say("loading");
    (async () => {
      try {
        await touchStreak(id);
        const r = await refresh();
        if (!r?.account || !r.progress) {
          say("ready");
          logOut();
          router.replace("/");
          return;
        }
        say("ready");
      } catch (e) {
        say({ error: e });
      }
    })();
  }, [router, refresh]);

  return {
    account,
    progress,
    warm,
    refresh,
    signOut() {
      cache = null;
      logOut();
      router.replace("/");
    },
  };
}
