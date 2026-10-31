"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import QuestionCard, { type Phase } from "../QuestionCard";
import { Button } from "../ui";
import Markdown, { CodeBlock } from "./Markdown";
import type { Course, LearnPrefs } from "@/lib/db";
import { isRight } from "@/lib/questions/core";
import { answerText, describeForTutor, fingerprint, followUp, givenText, type PracticeItem } from "@/lib/learn/practice";
import { recordAttempt } from "@/lib/learn/store";
import { lessonById } from "@/lib/learn/lessons";
import { checkTutor, gradeExplanation, isTutorError, type TutorStatus } from "@/lib/tutor/client";
import type { Grade } from "../../../tutor-server/src/protocol";
import { play } from "@/lib/sfx";

export type AskTutor = (focus: string, action: string, text: string) => void;
export type RunSummary = { total: number; firstTry: number; missedSkills: string[] };

type Props = {
  accountId: string;
  course: Course;
  prefs: LearnPrefs;
  items: PracticeItem[];
  source: "practice" | "lesson";
  onAskTutor?: AskTutor;
  onDone: (s: RunSummary) => void;
  doneLabel?: string;
};

type Result = { firstTry: boolean; correct: boolean; skill: string; explain?: boolean };

// Runs a set of verified questions: two tries, an optional hint, explanation after answering,
// and a follow-up question on the same idea after a miss. Every answer is recorded.
export default function PracticeRunner({ accountId, course, prefs, items: initial, source, onAskTutor, onDone, doneLabel = "SEE RESULTS" }: Props) {
  const [items, setItems] = useState(initial);
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<Phase>("answering");
  const [attempt, setAttempt] = useState(0);
  const [hinted, setHinted] = useState(false);
  const [lastGiven, setLastGiven] = useState<string | undefined>();
  const [results, setResults] = useState<Record<number, Result>>({});
  const [followNote, setFollowNote] = useState<string | null>(null);
  const seen = useRef(new Set(initial.flatMap((it) => (it.type === "question" ? [fingerprint(it.q)] : []))));
  const followed = useRef(new Set<number>()); // positions that already got a follow-up
  const followFps = useRef(new Set<string>()); // follow-up questions, for the label

  useEffect(() => {
    setItems(initial);
    setPos(0);
    setPhase("answering");
    setAttempt(0);
    setHinted(false);
    setResults({});
    setLastGiven(undefined);
    followed.current = new Set();
    followFps.current = new Set();
    seen.current = new Set(initial.flatMap((it) => (it.type === "question" ? [fingerprint(it.q)] : [])));
  }, [initial]);

  const item = items[pos];
  const last = pos >= items.length - 1;

  const record = (it: PracticeItem, correct: boolean, firstTry: boolean, given?: string) => {
    if (it.type !== "question") return;
    void recordAttempt({ accountId, source, course, world: it.world, skill: it.q.skill, kind: it.q.label === "Find and fix the bug" ? "bug" : it.q.kind, qid: it.q.id, correct, firstTry, given, expected: answerText(it.q), prompt: it.q.prompt, code: it.q.code });
  };

  const resolve = (correct: boolean, firstTry: boolean, given?: string) => {
    if (!item || item.type !== "question") return;
    record(item, correct, firstTry, given);
    setResults((r) => ({ ...r, [pos]: { correct, firstTry, skill: item.q.skill } }));
    // A miss earns one follow-up on the same idea, right after this question.
    if (!firstTry && !followed.current.has(pos)) {
      followed.current.add(pos);
      const next = followUp(item, course, seen.current, Date.now() % 100000);
      if (next && next.type === "question") {
        seen.current.add(fingerprint(next.q));
        followFps.current.add(fingerprint(next.q));
        setItems((xs) => [...xs.slice(0, pos + 1), next, ...xs.slice(pos + 1)]);
        followed.current.add(pos + 1); // no follow-up chains
        setFollowNote(next.q.skill === item.q.skill ? `Next: another ${item.q.skill} question to lock this in.` : `Next: a related question (${next.q.skill}).`);
      }
    }
  };

  const submit = (value: string | number | string[]) => {
    if (!item || item.type !== "question") return;
    const q = item.q;
    const ok = isRight(q, value as never);
    const given = givenText(q, value);
    setLastGiven(given);
    if (ok) {
      play("learnRight");
      setPhase("correct");
      resolve(true, attempt === 0 && !hinted, given);
    } else if (attempt === 0) {
      play("learnWrong");
      setAttempt(1);
      setPhase("retry");
    } else {
      play("learnWrong");
      setPhase("revealed");
      resolve(false, false, given);
    }
  };

  const reveal = () => {
    if (!item || item.type !== "question") return;
    setPhase("revealed");
    resolve(false, false, lastGiven ?? "(asked to see the answer)");
  };

  const next = () => {
    setFollowNote(null);
    if (last) {
      const rs = Object.values(results).filter((r) => !r.explain);
      const missed = [...new Set(rs.filter((r) => !r.firstTry).map((r) => r.skill))];
      onDone({ total: rs.length, firstTry: rs.filter((r) => r.firstTry).length, missedSkills: missed });
      return;
    }
    setPos((p) => p + 1);
    setPhase("answering");
    setAttempt(0);
    setHinted(false);
    setLastGiven(undefined);
  };

  // Test hook (debug mode only): lets automated playtests read the current answer.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    try {
      if (localStorage.getItem("cw.debug") !== "1" || !item) return;
      (window as unknown as Record<string, unknown>).__cwLearn = item.type === "question" ? { type: "question", kind: item.q.kind, answer: item.q.kind === "choice" ? item.q.correct : item.q.kind === "order" ? item.q.lines : item.q.answers?.[0], skill: item.q.skill, phase, pos, total: items.length } : { type: "explain", pos, total: items.length };
    } catch {}
  }, [item, phase, pos, items.length]);

  if (!item) return null;
  const answered = phase === "correct" || phase === "revealed";
  const lesson = lessonById(item.lessonId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 text-sm font-black text-ink-mute">
        <span>
          Question {pos + 1} of {items.length}
          {item.type === "question" && followFps.current.has(fingerprint(item.q)) ? " · follow-up on the same idea" : ""}
        </span>
        <span className="flex gap-1" aria-hidden>
          {items.map((_, i) => (
            <span key={i} className="h-2 w-5 rounded-full" style={{ background: results[i] ? (results[i].explain ? "#9B8CFF" : results[i].firstTry ? "#3EC46D" : "#FF8A8F") : i === pos ? "#2D9CDB" : "#D5E4F5" }} />
          ))}
        </span>
      </div>

      {item.type === "question" ? (
        <QuestionCard
          key={`${pos}-${item.q.id}`}
          variant="learn"
          q={item.q}
          phase={phase}
          attempt={attempt}
          hint={hinted ? item.q.hint : null}
          onSubmit={submit}
          onContinue={next}
          continueLabel={last ? doneLabel : "NEXT"}
          tools={
            <>
              {!hinted && (
                <Button size="sm" tone="white" onClick={() => setHinted(true)}>
                  HINT
                </Button>
              )}
              {(hinted || attempt > 0) && (
                <Button size="sm" tone="white" onClick={reveal}>
                  SHOW ANSWER
                </Button>
              )}
              {onAskTutor && (
                <Button size="sm" tone="white" onClick={() => onAskTutor(describeForTutor(item, false, lastGiven), "hint", "Can you give me a hint for this question? Don't give the answer yet.")}>
                  ASK TUTOR
                </Button>
              )}
            </>
          }
          resultExtra={
            <div className="mt-3 flex flex-wrap gap-2">
              {onAskTutor && phase === "revealed" && (
                <Button size="sm" tone="white" onClick={() => onAskTutor(describeForTutor(item, true, lastGiven), "why-wrong", `Why was my answer wrong? I answered: ${lastGiven ?? "(no answer)"}`)}>
                  WHY WAS I WRONG?
                </Button>
              )}
              {onAskTutor && answered && (
                <Button size="sm" tone="white" onClick={() => onAskTutor(describeForTutor(item, true, lastGiven), "explain-differently", "Can you explain this differently?")}>
                  EXPLAIN DIFFERENTLY
                </Button>
              )}
              {followNote && <span className="self-center text-sm font-black text-xp-deep">{followNote}</span>}
            </div>
          }
        />
      ) : (
        <ExplainCard key={`${pos}-${item.task.id}`} item={item} course={course} prefs={prefs} lessonTitle={lesson?.title} onNext={() => { setResults((r) => ({ ...r, [pos]: { correct: true, firstTry: true, skill: item.task.skill, explain: true } })); next(); }} last={last} doneLabel={doneLabel} onAskTutor={onAskTutor} />
      )}
    </div>
  );
}

function ExplainCard({ item, course, prefs, lessonTitle, onNext, last, doneLabel, onAskTutor }: { item: Extract<PracticeItem, { type: "explain" }>; course: Course; prefs: LearnPrefs; lessonTitle?: string; onNext: () => void; last: boolean; doneLabel: string; onAskTutor?: AskTutor }) {
  const t = item.task;
  const [text, setText] = useState("");
  const [status, setStatus] = useState<TutorStatus>({ state: "checking" });
  const [busy, setBusy] = useState(false);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [self, setSelf] = useState(false);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    checkTutor().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
      ctl.current?.abort();
    };
  }, []);

  const online = status.state === "online";
  const submit = async () => {
    if (!text.trim()) return;
    if (!online) {
      setSelf(true);
      return;
    }
    setBusy(true);
    setError(null);
    ctl.current = new AbortController();
    const r = await gradeExplanation(t, text.trim(), { course, prefs: { length: prefs.length, level: prefs.level, style: prefs.style }, lesson: lessonTitle ? { title: lessonTitle, objective: t.prompt } : undefined }, ctl.current.signal);
    setBusy(false);
    if (isTutorError(r)) {
      if (r.code !== "cancelled") setError(r.message);
      return;
    }
    setGrade(r.grade);
    play(r.grade.verdict === "correct" ? "learnRight" : "learnWrong");
  };

  const finished = !!grade || self;
  const verdictColor = grade?.verdict === "correct" ? "#2BA155" : grade?.verdict === "partial" ? "#B35A00" : "#D9434A";
  return (
    <motion.section initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="card flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-black uppercase tracking-wider text-xp">Explain it in your own words</span>
        <span className="rounded-full bg-sky px-3 py-1 text-xs font-black text-ocean-deep">{t.skill}</span>
      </div>
      <h2 className="font-display text-[clamp(20px,2.6vw,26px)] leading-tight">
        <Markdown text={t.prompt} />
      </h2>
      {t.code && <CodeBlock code={t.code} lang={course === "csa" ? "java" : undefined} />}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-black uppercase tracking-wider text-ink-soft">Your explanation</span>
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 1500))} disabled={finished || busy} rows={4} className="w-full rounded-2xl border-[3px] border-line bg-[#F5FAFF] px-4 py-3 text-[16px] font-semibold text-ink outline-none focus:border-ocean disabled:opacity-80" placeholder="One or two sentences is enough." />
        <span className="self-end text-xs font-bold text-ink-mute">{text.length} / 1500</span>
      </label>
      {!finished && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-sm font-bold text-ink-mute">
            {status.state === "checking" ? "Checking the tutor…" : online ? "The AI tutor will give feedback." : "The AI tutor is offline, so you'll compare with the key points yourself."}
          </span>
          {busy ? (
            <Button tone="white" onClick={() => ctl.current?.abort()}>STOP</Button>
          ) : (
            <Button onClick={submit} disabled={!text.trim()}>
              {online ? "GET FEEDBACK" : "COMPARE"}
            </Button>
          )}
        </div>
      )}
      {busy && <p className="text-sm font-bold text-ink-mute" role="status">Reading your explanation…</p>}
      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-danger-soft px-4 py-3 font-bold text-danger-deep">
          {error}
          <span className="flex gap-2">
            <Button size="sm" tone="white" onClick={submit}>RETRY</Button>
            <Button size="sm" tone="white" onClick={() => { setError(null); setSelf(true); }}>COMPARE MYSELF</Button>
          </span>
        </div>
      )}
      <AnimatePresence>
        {finished && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 rounded-2xl bg-sky px-4 py-3">
            {grade && (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-xl" style={{ color: verdictColor }}>
                    {grade.verdict === "correct" ? "Covers the key ideas" : grade.verdict === "partial" ? "Partly there" : "Not quite"}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-ink-mute">AI feedback · not compiler-verified</span>
                </div>
                <div className="mt-1 font-semibold text-ink">
                  <Markdown text={grade.feedback} />
                </div>
                {grade.missing.length > 0 && <p className="mt-1 text-sm font-bold text-ink-soft">Missing: {grade.missing.join("; ")}</p>}
              </div>
            )}
            <div>
              <div className="text-[13px] font-black uppercase tracking-wider text-ink-soft">{grade ? "Key points" : "Check yours against these key points"}</div>
              <ul className="mt-1 list-disc pl-6 font-semibold text-ink">
                {t.keyPoints.map((k) => <li key={k}>{k}</li>)}
              </ul>
              <p className="mt-2 text-[15px] font-semibold text-ink-soft">
                <span className="font-black text-ink">Model answer: </span>
                {t.model}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {onAskTutor && (
                <Button size="sm" tone="white" onClick={() => onAskTutor(`Written explanation task: ${t.prompt}\n\nStudent's explanation: ${text}\n\nReference answer: ${t.model}`, "check-reasoning", "Can you check my explanation?")}>
                  DISCUSS WITH TUTOR
                </Button>
              )}
              <Button onClick={onNext}>{last ? doneLabel : "NEXT"}</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
