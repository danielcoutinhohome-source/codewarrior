"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

const tones = {
  ember: { bg: "#FF8A00", edge: "#D96F00", fg: "#FFFFFF" },
  ocean: { bg: "#2D9CDB", edge: "#1F7DB5", fg: "#FFFFFF" },
  white: { bg: "#FFFFFF", edge: "#C5D7EC", fg: "#1F7DB5" },
  danger: { bg: "#FF5A5F", edge: "#D9434A", fg: "#FFFFFF" },
};
type Tone = keyof typeof tones;

const spring = { type: "spring", stiffness: 600, damping: 30 } as const;

// Chunky 3D button: it sits on a darker edge and presses down into it.
export function Button({
  tone = "ember",
  size = "md",
  className = "",
  children,
  ...rest
}: { tone?: Tone; size?: "md" | "lg" } & HTMLMotionProps<"button">) {
  const t = tones[tone];
  return (
    <motion.button
      {...rest}
      whileHover={rest.disabled ? undefined : { y: -2 }}
      whileTap={rest.disabled ? undefined : { y: 5, boxShadow: `0 1px 0 ${t.edge}` }}
      transition={spring}
      style={{ background: t.bg, color: t.fg, boxShadow: `0 6px 0 ${t.edge}`, ...(tone === "white" ? { border: "3px solid #D5E4F5" } : {}) }}
      className={`rounded-btn font-display tracking-wide disabled:cursor-not-allowed disabled:opacity-60 ${
        size === "lg" ? "px-7 py-4 text-2xl" : "px-5 py-2.5 text-lg"
      } ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function ButtonLink({ href, tone = "ember", size = "md", className = "", children }: { href: string; tone?: Tone; size?: "md" | "lg"; className?: string; children: ReactNode }) {
  const t = tones[tone];
  return (
    <motion.div whileHover={{ y: -2 }} whileTap={{ y: 5 }} transition={spring} className="inline-block">
      <Link
        href={href}
        style={{ background: t.bg, color: t.fg, boxShadow: `0 6px 0 ${t.edge}`, ...(tone === "white" ? { border: "3px solid #D5E4F5" } : {}) }}
        className={`block rounded-btn text-center font-display tracking-wide ${size === "lg" ? "px-7 py-4 text-2xl" : "px-5 py-2.5 text-lg"} ${className}`}
      >
        {children}
      </Link>
    </motion.div>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width={size * 1.2} height={size * 1.38} viewBox="0 0 44 50" aria-hidden="true">
        <path d="M22 2 L40 9 V24 C40 36 32 44 22 48 C12 44 4 36 4 24 V9 Z" fill="#FF8A00" stroke="#D96F00" strokeWidth="3" />
        <text x="22" y="31" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontWeight="800" fontSize="13" fill="#FFFFFF">
          {"</>"}
        </text>
      </svg>
      <span className="font-display tracking-wide text-ink" style={{ fontSize: size }}>
        Code<span className="text-ember">Warrior</span>
      </span>
    </span>
  );
}

// Soft sky with slowly drifting clouds and a grass band.
export function Sky({ children, ground = true, clouds = true }: { children: ReactNode; ground?: boolean; clouds?: boolean }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-sky">
      {clouds && (<>
      <motion.div
        aria-hidden
        className="absolute bottom-52 left-[34%] h-11 w-40 rounded-full bg-white/90"
        animate={{ x: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-64 right-[6%] h-14 w-56 rounded-full bg-white/80"
        animate={{ x: [0, -36, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      </>)}
      {ground && <div aria-hidden className="absolute inset-x-0 bottom-0 h-36 border-t-[10px] border-grass-deep bg-grass" />}
      <div className="relative">{children}</div>
    </div>
  );
}

// A 3D platform the avatar hovers over, with a slowly spinning ring.
export function Pedestal({ children, night = true }: { children: ReactNode; night?: boolean }) {
  return (
    <div
      className="relative flex h-[340px] items-end justify-center overflow-hidden rounded-[22px]"
      style={{ background: night ? "#2B2F5E" : "#A9DEFF", perspective: 700 }}
    >
      <div aria-hidden className="absolute left-1/2 top-8 h-[300px] w-[300px] -translate-x-1/2 rounded-full" style={{ background: "radial-gradient(circle, #5D63C9 0%, rgba(43,47,94,0) 70%)" }} />
      {[
        [28, 34, 6, "#FFE27A"],
        [86, 140, 4, "#FFFFFF"],
        [300, 70, 5, "#FFFFFF"],
        [360, 180, 3, "#FFE27A"],
      ].map(([x, y, s, c], i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute rounded-full"
          style={{ left: x as number, top: y as number, width: s as number, height: s as number, background: c as string }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2 + i * 0.7, repeat: Infinity }}
        />
      ))}
      <div aria-hidden className="absolute bottom-0 left-1/2 h-[300px] w-[300px] -translate-x-1/2" style={{ transformStyle: "preserve-3d" }}>
        <motion.div
          className="absolute inset-x-5 -bottom-[110px] h-[260px] rounded-full border-4 border-dashed border-[#8E95FF]"
          style={{ rotateX: 72 }}
          animate={{ rotateZ: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div aria-hidden className="absolute bottom-7 left-1/2 h-[54px] w-[250px] -translate-x-1/2 rounded-[50%] bg-gold" style={{ boxShadow: "0 16px 0 #E5A300, 0 34px 26px rgba(0,0,0,.35)" }} />
      <div className="relative z-[2] mb-12">{children}</div>
    </div>
  );
}

export function Swatch({ color, selected, label, onClick }: { color: string; selected: boolean; label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      animate={{ scale: selected ? 1.1 : 1 }}
      transition={spring}
      className="h-12 w-12 rounded-full"
      style={{ background: color, border: `4px solid ${selected ? "#1F2440" : "#FFFFFF"}`, boxShadow: "0 4px 0 rgba(31,36,64,.18)" }}
    />
  );
}
