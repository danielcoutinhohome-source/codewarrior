import { useSyncExternalStore } from "react";

// Animation is how the game shows what happened (attacks, hits, the walk down the road),
// so it does not follow the operating system's "Reduce motion" switch, which many Macs and
// school laptops have on. Players who want calmer animation turn it on in the Armory.
const KEY = "cw.reduceMotion";
const listeners = new Set<() => void>();

export function getReduceMotion() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setReduceMotion(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {}
  applyReduceMotionClass();
  listeners.forEach((l) => l());
}

export function applyReduceMotionClass() {
  if (typeof document !== "undefined") document.documentElement.classList.toggle("cw-reduce-motion", getReduceMotion());
}

// Framer Motion reads the OS "Reduce motion" switch through matchMedia and, for elements
// animated directly (every attack, hit and dash in battle), skips all movement when it is
// on: the warrior never left its spot and only the slash effect showed. Answer that one
// query from the game's own setting instead. Runs on module load, before anything animates.
if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  const original = window.matchMedia.bind(window);
  window.matchMedia = (query: string) => {
    if (!/prefers-reduced-motion/.test(query)) return original(query);
    // A plain stand-in: the real MediaQueryList's `matches` is read-only.
    return {
      matches: getReduceMotion(),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList;
  };
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useReduceMotion() {
  return useSyncExternalStore(subscribe, getReduceMotion, () => false);
}
