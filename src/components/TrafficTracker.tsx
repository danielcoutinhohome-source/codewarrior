"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { classroomUrl } from "@/lib/cloud/client";

export default function TrafficTracker() {
  const path = usePathname();
  const view = useRef({ path: "", id: "" });
  useEffect(() => {
    const base = classroomUrl();
    if (!base || navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    let visitor: string;
    try {
      if (localStorage.getItem("cw.traffic.optOut") === "1") return;
      visitor = localStorage.getItem("cw.traffic.visitor") || crypto.randomUUID();
      localStorage.setItem("cw.traffic.visitor", visitor);
    } catch { return; } // Blocked storage must never break the game or inflate visitors.
    if (view.current.path !== path || !view.current.id) view.current = { path, id: crypto.randomUUID() };
    const event = view.current.id;
    let pendingView = true;
    const send = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        if (localStorage.getItem("cw.traffic.optOut") === "1") return;
        const last = Number(localStorage.getItem("cw.traffic.last") || 0);
        if (Date.now() - last < 30_000 && !pendingView) return;
        localStorage.setItem("cw.traffic.last", String(Date.now()));
        const res = await fetch(`${base}/v1/analytics/heartbeat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ visitor, view: pendingView, event }), signal: AbortSignal.timeout(8000), credentials: "omit" });
        if (res.ok) pendingView = false;
      } catch {} // Analytics is best effort; no outbox, credentials, or gameplay blocking.
    };
    void send();
    const timer = setInterval(() => void send(), 30_000);
    document.addEventListener("visibilitychange", send);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", send); };
  }, [path]);
  return null;
}
