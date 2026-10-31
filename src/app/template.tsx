"use client";

import { motion } from "framer-motion";

// Re-mounts on every route change, so each screen eases in. It only slides: fading in
// from opacity 0 made every screen change flash blank.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ y: 10 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}
