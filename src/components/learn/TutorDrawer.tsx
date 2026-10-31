"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import ChatPanel, { type ChatSeed } from "./ChatPanel";
import type { Attempt, LearnProfile, Progress } from "@/lib/db";

// The tutor in a side panel, so a student can ask about a question without leaving it.
export default function TutorDrawer({ open, onClose, seed, accountId, profile, progress, attempts, lessonId }: { open: boolean; onClose: () => void; seed: ChatSeed | null; accountId: string; profile: LearnProfile; progress: Progress | null; attempts: Attempt[]; lessonId?: string }) {
  const [convoId, setConvoId] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const prior = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prior?.focus?.();
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[900] bg-[#1F2440]/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="AI tutor"
            className="fixed inset-y-0 right-0 z-[901] flex w-full max-w-[520px] flex-col gap-2 bg-sky p-3 shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="flex items-center justify-between px-1">
              <span className="font-display text-2xl">Tutor</span>
              <button ref={closeRef} type="button" onClick={onClose} className="rounded-xl bg-white px-3 py-1.5 text-sm font-black text-ink shadow-card-sm">
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ChatPanel compact accountId={accountId} profile={profile} progress={progress} attempts={attempts} conversationId={convoId} lessonId={lessonId} seed={seed} onConversation={(c) => setConvoId(c.id)} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
