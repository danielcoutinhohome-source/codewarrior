"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, logOut, touchStreak } from "./auth";
import { db, type Account, type Progress } from "./db";

// Loads the signed-in warrior from this device, or sends the player to the start screen.
export function useWarrior() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    const id = getSession();
    if (!id) {
      router.replace("/");
      return;
    }
    (async () => {
      await touchStreak(id);
      const [a, p] = await Promise.all([db.accounts.get(id), db.progress.get(id)]);
      if (!a || !p) {
        logOut();
        router.replace("/");
        return;
      }
      setAccount(a);
      setProgress(p);
    })();
  }, [router]);

  return {
    account,
    progress,
    signOut() {
      logOut();
      router.replace("/");
    },
  };
}
