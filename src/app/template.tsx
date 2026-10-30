"use client";

import { motion } from "framer-motion";

// Re-mounts on every route change, so each screen eases in.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}
