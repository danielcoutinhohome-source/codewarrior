"use client";

import { AnimatePresence, Reorder, motion, useAnimationControls } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Code from "./Code";
import { Button } from "./ui";
import { rng, type Question } from "@/lib/questions/core";

export type Phase = "answering" | "busy" | "retry" | "correct" | "revealed" | "over";

type Props = {
  q: Question;
  phase: Phase;
  attempt: number;
  hint: string | null;
  resultNote?: string; // e.g. "+100 damage" or "Counts as a miss"
  onSubmit: (value: string | number | string[]) => void;
  onContinue: () => void;
  variant?: "battle" | "learn"; // learn: calm wording for lessons and practice
  resultExtra?: ReactNode; // shown with the explanation after answering
  tools?: ReactNode; // shown next to the submit button while answering (e.g. a hint button)
  continueLabel?: string;
};

const KIND = { predict: "Predict the output", fill: "Fill the blank", choice: "Pick one", order: "Drag the lines into order" } as const;

export default function QuestionCard({ q, phase, attempt, hint, resultNote, onSubmit, onContinue, variant = "battle", resultExtra, tools, continueLabel = "CONTINUE" }: Props) {
  const learn = variant === "learn";
  const [text, setText] = useState("");
  const [sel, setSel] = useState<number | null>(null);
  const initialOrder = useMemo(() => {
    if (q.kind !== "order" || !q.lines) return [];
    const idx = q.lines.map((_, i) => i);
    let shuffled = rng(q.id.length * 977 + q.lines.join("").length).shuffle(idx);
    if (shuffled.every((v, i) => v === i)) shuffled = [...idx].reverse();
    return shuffled;
  }, [q]);
  const [orderIdx, setOrderIdx] = useState<number[]>(initialOrder);
  const shakeCtl = useAnimationControls();
  const inputRef = useRef<HTMLInputElement>(null);
  const contRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setText("");
    setSel(null);
    setOrderIdx(initialOrder);
  }, [q, initialOrder]);

  useEffect(() => {
    if (phase === "retry") {
      shakeCtl.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.4 } });
      inputRef.current?.select();
    }
    if (phase === "correct" || phase === "revealed") setTimeout(() => contRef.current?.focus(), 50);
    if (phase === "answering") setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 80);
  }, [phase, shakeCtl]);

  const locked = phase !== "answering" && phase !== "retry";

  // Number keys pick multiple-choice answers.
  useEffect(() => {
    if (q.kind !== "choice" || locked) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const n = Number(e.key);
      if (n >= 1 && n <= (q.options?.length || 0)) {
        e.preventDefault();
        setSel(n - 1);
      } else if (e.key === "Enter" && sel !== null) {
        e.preventDefault();
        onSubmit(sel);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, locked, sel, onSubmit]);
  const filled = q.kind === "choice" ? sel !== null : q.kind === "order" ? true : text.trim() !== "";
  const submit = () => {
    if (locked || !filled) return;
    if (q.kind === "choice") onSubmit(sel!);
    else if (q.kind === "order") onSubmit(orderIdx.map((i) => q.lines![i]));
    else onSubmit(text);
  };

  const showAnswer = phase === "revealed";
  const correctText = q.kind === "choice" ? q.options![q.correct!] : q.kind === "order" ? null : q.answers![0];

  const move = (pos: number, dir: -1 | 1) => {
    const to = pos + dir;
    if (to < 0 || to >= orderIdx.length) return;
    const next = [...orderIdx];
    [next[pos], next[to]] = [next[to], next[pos]];
    setOrderIdx(next);
  };

  return (
    <motion.section
      key={q.id}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="card flex min-w-0 flex-col gap-4 p-5 sm:p-6"
      onKeyDown={(e) => {
        if (e.key === "Enter" && !(e.target as HTMLElement).closest("button") && !(q.kind === "choice" && !locked)) {
          e.preventDefault();
          if (phase === "correct" || phase === "revealed") onContinue();
          else submit();
        }
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-black uppercase tracking-wider text-xp">{(q.label || KIND[q.kind])}</span>
        <span className="rounded-full bg-sky px-3 py-1 text-xs font-black text-ocean-deep">{q.skill}</span>
      </div>
      <h2 className="font-display text-[clamp(22px,3vw,28px)] leading-tight">{q.prompt}</h2>

      <motion.div animate={shakeCtl} className="flex flex-col gap-4">
        {q.kind === "fill" && q.code ? (
          <Code code={q.code} blank={{ value: text, onChange: setText, disabled: locked, inputRef, solved: showAnswer ? q.answers![0] : undefined }} />
        ) : q.code ? (
          <Code code={q.code} />
        ) : null}

        {q.kind === "predict" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-black uppercase tracking-wider text-ink-soft">Output</span>
            <input
              ref={inputRef}
              value={showAnswer ? q.answers![0] : text}
              onChange={(e) => setText(e.target.value)}
              disabled={locked}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Type exactly what prints"
              className="w-full max-w-md rounded-2xl border-[3px] border-line bg-[#F5FAFF] px-4 py-3 font-mono text-lg text-ink outline-none transition-colors focus:border-ocean disabled:opacity-80"
            />
          </label>
        )}

        {q.kind === "choice" && (
          <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup">
            {q.options!.map((o, i) => {
              const on = sel === i;
              const isAns = showAnswer && i === q.correct;
              return (
                <motion.button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={locked}
                  onClick={() => setSel(i)}
                  whileTap={locked ? undefined : { scale: 0.97 }}
                  className={`flex items-center gap-3 rounded-2xl border-[3px] px-4 py-3 text-left transition-colors ${q.options!.some((x) => x.length > 28) ? "font-body font-bold" : "font-mono"}`}
                  style={{
                    borderColor: isAns ? "#3EC46D" : on ? "#2D9CDB" : "#D5E4F5",
                    background: isAns ? "#E3F9EA" : on ? "#E2F3FF" : "#FFFFFF",
                    boxShadow: `0 4px 0 ${isAns ? "#2BA155" : on ? "#1F7DB5" : "#D5E4F5"}`,
                  }}
                >
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-lg border-2 border-line font-body text-sm font-black text-ink-mute">{i + 1}</span>
                  <span className="min-w-0 break-words">{o}</span>
                </motion.button>
              );
            })}
          </div>
        )}

        {q.kind === "order" && (
          <div>
            <p className="mb-2 text-sm font-bold text-ink-mute">Drag the lines, or use the arrows.</p>
            <Reorder.Group axis="y" values={orderIdx} onReorder={(v) => !locked && setOrderIdx(v)} className="flex flex-col gap-2">
              {(showAnswer ? q.lines!.map((_, i) => i) : orderIdx).map((li, pos) => (
                <Reorder.Item
                  key={li}
                  value={li}
                  dragListener={!locked}
                  whileDrag={{ scale: 1.03, boxShadow: "0 14px 28px rgba(31,36,64,.18)", zIndex: 5 }}
                  className="flex items-center gap-2 rounded-xl border-[3px] border-line bg-white py-1.5 pl-3 pr-1.5 font-mono text-[14px]"
                  style={{ cursor: locked ? "default" : "grab", touchAction: "none", borderColor: showAnswer ? "#3EC46D" : undefined }}
                >
                  <span aria-hidden className="grid flex-none grid-cols-2 gap-[3px]">
                    {Array.from({ length: 6 }).map((_, k) => <i key={k} className="block h-1 w-1 rounded-full bg-line-deep" />)}
                  </span>
                  <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre text-ink">{q.lines![li]}</code>
                  {!locked && (
                    <span className="flex flex-none gap-1">
                      <button type="button" aria-label="Move line up" onClick={() => move(pos, -1)} className="grid h-7 w-7 place-items-center rounded-lg bg-sky text-ocean-deep hover:bg-ocean-soft">▲</button>
                      <button type="button" aria-label="Move line down" onClick={() => move(pos, 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-sky text-ocean-deep hover:bg-ocean-soft">▼</button>
                    </span>
                  )}
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {hint && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-2xl bg-xp-soft px-4 py-3 font-bold text-ink">
              <span className="font-black text-xp-deep">{learn ? "Hint: " : "Hint scroll: "}</span>
              {hint}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {phase === "retry" && (
          <motion.div key="retry" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl bg-danger-soft px-4 py-3 font-extrabold text-danger-deep">
            {learn ? "Not quite. Try once more, or take a hint." : "Ouch! Not quite. You have one more try."}
          </motion.div>
        )}
        {(phase === "correct" || phase === "revealed") && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
            style={{ background: phase === "correct" ? "#E3F9EA" : "#FFE8EA" }}
          >
            <div className="min-w-0 flex-[1_1_260px]">
              <div className="font-display text-xl" style={{ color: phase === "correct" ? "#2BA155" : "#D9434A" }}>
                {learn ? (phase === "correct" ? (attempt === 0 ? "Correct" : "Correct on the second try") : "Not this time") : phase === "correct" ? (attempt === 0 ? "Direct hit!" : "Got it!") : "Out of tries"}
                {resultNote && <span className="ml-2 font-body text-sm font-black opacity-80">{resultNote}</span>}
              </div>
              {showAnswer && correctText && (
                <div className="mt-1 font-bold text-ink">
                  Answer: <code className="rounded bg-white px-1.5 py-0.5 font-mono">{correctText}</code>
                </div>
              )}
              <div className="mt-1 text-[15px] font-semibold text-ink-soft">{q.explain}</div>
              {resultExtra}
            </div>
            <Button ref={contRef} tone={phase === "correct" ? "ocean" : "white"} onClick={onContinue}>
              {continueLabel}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {(phase === "answering" || phase === "retry" || phase === "busy") && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {tools}
          <Button size="lg" onClick={submit} disabled={!filled || locked} className="min-w-[180px]">
            {phase === "busy" ? "..." : learn ? "CHECK" : "STRIKE!"}
          </Button>
        </div>
      )}
    </motion.section>
  );
}
