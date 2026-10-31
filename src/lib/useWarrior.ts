"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getSession, logOut, touchStreak } from "./auth";
import { db, type Account, type Progress } from "./db";

// Loads the signed-in warrior from this device, or sends the player to the start screen.
export function useWarrior() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  const refresh = useCallback(async () => {
    const id = getSession();
    if (!id) return;
    const [a, p] = await Promise.all([db.accounts.get(id), db.progress.get(id)]);
    if (a) setAccount(a);
    if (p) setProgress(p);
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
      logOut();
      router.replace("/");
    },
  };
}
