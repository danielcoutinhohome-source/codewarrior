"use client";

import { useEffect } from "react";
import { getSession } from "@/lib/auth";
import { classroomEnabled, getCloud, localIdFor, useCloud } from "@/lib/cloud/client";
import { flush, startSync } from "@/lib/cloud/outbox";
import { scheduleProgressSync, syncProgress } from "@/lib/cloud/progressSync";
import { recoverAbandoned } from "@/lib/cloud/reporter";
import { db } from "@/lib/db";

// Mounted once in the root layout: uploads queued classroom events and keeps a class
// account's game progress in sync while the student plays.
export default function CloudSync() {
  useEffect(() => {
    if (!classroomEnabled()) return;
    void recoverAbandoned().finally(() => startSync());
    // Runs left behind by another tab that was closed while this one keeps playing.
    const sweep = setInterval(() => void recoverAbandoned().catch(() => {}), 60_000);
    const c = getCloud();
    if (c?.me.role === "student" && getSession() === localIdFor(c.me.id)) void syncProgress().catch(() => {});
    const onChange = (_mods: unknown, key: unknown) => {
      if (String(key).startsWith("c:")) scheduleProgressSync();
    };
    const onCreate = (key: unknown) => {
      if (String(key).startsWith("c:")) scheduleProgressSync();
    };
    db.progress.hook("updating", onChange);
    db.accounts.hook("updating", onChange);
    db.progress.hook("creating", onCreate);
    const onVisible = () => {
      if (document.visibilityState === "visible") void flush();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(sweep);
      db.progress.hook("updating").unsubscribe(onChange);
      db.accounts.hook("updating").unsubscribe(onChange);
      db.progress.hook("creating").unsubscribe(onCreate);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  // Signing in (or switching accounts) uploads whatever that account has queued here.
  const userId = useCloud()?.me.id;
  useEffect(() => {
    if (classroomEnabled() && userId) void flush();
  }, [userId]);
  return null;
}
