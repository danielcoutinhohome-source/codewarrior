"use client";

import { useEffect, useRef, useState } from "react";
import { classroomUrl } from "./client";

export type LiveState = "connecting" | "live" | "reconnecting" | "polling";

// Live class updates for the teacher dashboard: one WebSocket, subscribed to one class at a
// time and re-created whenever the class changes (so no listener outlives its class). The
// server re-checks ownership on subscribe. While the socket is down the hook falls back to
// polling every 30 seconds, only while the tab is visible.
export function useLive(classId: string | null, token: string | null, onChange: (what: string) => void) {
  const [state, setState] = useState<LiveState>("connecting");
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!classId || !token) return;
    const base = classroomUrl();
    if (!base) return;
    let ws: WebSocket | null = null;
    let closed = false;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let ping: ReturnType<typeof setInterval> | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let live = false;

    const startPolling = () => {
      if (poll) return;
      poll = setInterval(() => {
        if (document.visibilityState === "visible") cb.current("poll");
      }, 30_000);
    };
    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };
    const connect = () => {
      if (closed) return;
      setState(attempt === 0 ? "connecting" : "reconnecting");
      try {
        ws = new WebSocket(`${base.replace(/^http/, "ws")}/v1/live`);
      } catch {
        return scheduleRetry();
      }
      ws.onopen = () => ws?.send(JSON.stringify({ type: "auth", token }));
      ws.onmessage = (e) => {
        if (e.data === "pong") return;
        let m: { type?: string; classId?: string; what?: string };
        try {
          m = JSON.parse(String(e.data));
        } catch {
          return;
        }
        if (m.type === "ready") ws?.send(JSON.stringify({ type: "subscribe", classId }));
        else if (m.type === "subscribed" && m.classId === classId) {
          live = true;
          attempt = 0;
          stopPolling();
          setState("live");
          cb.current("subscribed"); // catch up on anything missed while disconnected
        } else if (m.type === "changed" && m.classId === classId) cb.current(m.what || "changed");
      };
      ws.onclose = () => {
        live = false;
        if (ping) clearInterval(ping);
        if (!closed) scheduleRetry();
      };
      ws.onerror = () => ws?.close();
      if (ping) clearInterval(ping);
      ping = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) ws.send("ping");
      }, 25_000);
    };
    const scheduleRetry = () => {
      if (closed) return;
      attempt++;
      setState(attempt > 3 ? "polling" : "reconnecting");
      startPolling();
      retry = setTimeout(connect, Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5)) * (0.8 + Math.random() * 0.4));
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      cb.current("visible");
      if (!live && ws?.readyState !== WebSocket.CONNECTING) {
        if (retry) clearTimeout(retry);
        connect();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    connect();
    return () => {
      closed = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (retry) clearTimeout(retry);
      if (ping) clearInterval(ping);
      stopPolling();
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [classId, token]);

  return state;
}
