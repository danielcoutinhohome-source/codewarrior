"use client";

import { useCallback, useEffect, useState } from "react";
import type { Attempt, LearnProfile } from "../db";
import { useWarrior } from "../useWarrior";
import { getProfile, recentAttempts } from "./store";

// Loads the signed-in warrior plus their Learn profile and recent answers.
export function useLearn() {
  const w = useWarrior();
  const [profile, setProfile] = useState<LearnProfile | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const id = w.account?.id;

  const reload = useCallback(async () => {
    if (!id) return;
    const [p, a] = await Promise.all([getProfile(id), recentAttempts(id)]);
    setProfile(p);
    setAttempts(a);
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...w, profile, setProfile, attempts, reload };
}
