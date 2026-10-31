"use client";

import { useEffect, useRef } from "react";

// One burst of confetti over the whole screen.
export default function Confetti({ run, colors = ["#2D9CDB", "#3EC46D", "#FFC83D", "#FF5A5F", "#8B5CF6", "#FF8A00"] }: { run: boolean; colors?: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!run || !ref.current) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const c = ref.current;
    const W = (c.width = window.innerWidth), H = (c.height = window.innerHeight);
    const x = c.getContext("2d");
    if (!x) return;
    const P = Array.from({ length: 140 }, (_, i) => ({
      x: W / 2 + (Math.random() - 0.5) * 160,
      y: H * 0.38,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 15 - 5,
      r: Math.random() * 7 + 5,
      a: Math.random() * 6,
      va: (Math.random() - 0.5) * 0.4,
      c: colors[i % colors.length],
    }));
    const t0 = performance.now();
    let raf = 0;
    const f = (t: number) => {
      const k = (t - t0) / 2200;
      x.clearRect(0, 0, W, H);
      for (const p of P) {
        p.vy += 0.36;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.va;
        x.save();
        x.globalAlpha = Math.max(0, 1 - k);
        x.translate(p.x, p.y);
        x.rotate(p.a);
        x.fillStyle = p.c;
        x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        x.restore();
      }
      if (k < 1) raf = requestAnimationFrame(f);
      else x.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [run, colors]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[60]" />;
}
