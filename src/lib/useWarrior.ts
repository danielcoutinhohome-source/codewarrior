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
    (async () => {
      await touchStreak(id);
      const r = await refresh();
      if (!r?.account || !r.progress) {
        logOut();
        router.replace("/");
      }
    })();
  }, [router, refresh]);

  return {
    account,
    progress,
    refresh,
    signOut() {
      cache = null;
      logOut();
      router.replace("/");
    },
  };
}
