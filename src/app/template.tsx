"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { applyReduceMotionClass } from "@/lib/motionPref";

// Re-mounts on every route change, so each screen eases in. It only slides: fading in
// from opacity 0 made every screen change flash blank.
export default function Template({ children }: { children: React.ReactNode }) {
  useEffect(applyReduceMotionClass, []);
  return (
    <motion.div
      initial={{ opacity: 0.7, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
