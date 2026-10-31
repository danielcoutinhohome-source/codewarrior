"use client";

import { useSyncExternalStore } from "react";
import type { ApiError, Me } from "./protocol";

// ---- configuration ----
// The classroom server's public URL is set at build time. A per-browser override exists for
// local testing (localStorage "cw.classroomUrl").
export function classroomUrl(): string | null {
  let url = process.env.NEXT_PUBLIC_CLASSROOM_URL || "";
  try {
    const o = localStorage.getItem("cw.classroomUrl");
    if (o) url = o;
  } catch {}
  return /^https?:\/\/[^\s]+$/.test(url) ? url.replace(/\/$/, "") : null;
}
export const classroomEnabled = () => !!classroomUrl();
export const CONTENT_VERSION = process.env.NEXT_PUBLIC_CONTENT_VERSION || "dev";

// ---- signed-in class account (one per browser) ----
export type CloudSession = { token: string; me: Me };
const KEY = "cw.cloud.session";
const listeners = new Set<() => void>();
let cached: { raw: string | null; value: CloudSession | null } = { raw: null, value: null };

function read(): CloudSession | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw === cached.raw) return cached.value;
  let value: CloudSession | null = null;
  try {
    const v = raw ? JSON.parse(raw) : null;
    if (v && typeof v.token === "string" && v.me?.id) value = v;
  } catch {}
  cached = { raw, value };
  return value;
}
export const getCloud = () => (typeof window === "undefined" ? null : read());
export function setCloud(s: CloudSession | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}
if (typeof window !== "undefined") window.addEventListener("storage", (e) => e.key === KEY && listeners.forEach((l) => l()));
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useCloud = () => useSyncExternalStore(subscribe, getCloud, () => null);

// The local warrior that mirrors a class account.
export const localIdFor = (userId: string) => `c:${userId}`;

// ---- requests ----
export class CloudError extends Error {
  constructor(public status: number, public code: ApiError["error"] | "network" | "unconfigured", message: string, public retryAfter?: number) {
    super(message);
  }
}

export async function api<T = unknown>(method: string, path: string, body?: unknown, opts: { token?: string | null; timeoutMs?: number } = {}): Promise<T> {
  const base = classroomUrl();
  if (!base) throw new CloudError(0, "unconfigured", "Class accounts aren't set up on this site yet.");
  const token = opts.token === undefined ? getCloud()?.token : opts.token;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 20_000);
  let res: Response;
  try {
    res = await fetch(`${base}/v1${path}`, {
      method,
      headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctl.signal,
    });
  } catch {
    throw new CloudError(0, "network", "Couldn't reach the class server. Check your connection.");
  } finally {
    clearTimeout(t);
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const e = (data || {}) as Partial<ApiError>;
    // A dead session (signed out elsewhere, expired) signs this browser out of the class account.
    if (res.status === 401 && token && token === getCloud()?.token && path !== "/auth/password") setCloud(null);
    throw new CloudError(res.status, (e.error as ApiError["error"]) || "server_error", e.message || "Something went wrong. Try again.", e.retryAfter);
  }
  return data as T;
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");
