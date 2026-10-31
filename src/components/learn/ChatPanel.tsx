"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui";
import Markdown from "./Markdown";
import type { Attempt, ChatMessage, Conversation, LearnProfile, Progress } from "@/lib/db";
import { BOSS, WORLDS } from "@/lib/game";
import { frontier } from "@/lib/progress";
import { lessonById } from "@/lib/learn/lessons";
import { recentMistakes, tutorContext } from "@/lib/learn/insights";
import { appendMessages, addRecent, createConversation, getConversation } from "@/lib/learn/store";
import { HELPER_ACTIONS, helperFallback, helperReply } from "@/lib/tutor/helper";
import { askTutor, checkTutor, isTutorError, type TutorError, type TutorStatus } from "@/lib/tutor/client";
import { useSpeechInput, useSpeechOutput } from "@/lib/tutor/voice";
import type { TutorContext } from "../../../tutor-server/src/protocol";
import { LIMITS } from "../../../tutor-server/src/protocol";

export type ChatSeed = { focus?: string; action?: string; text?: string; lessonId?: string; title?: string; key: number };

type Props = {
  accountId: string;
  profile: LearnProfile;
  progress: Progress | null;
  attempts: Attempt[];
  conversationId?: string | null;
  lessonId?: string;
  seed?: ChatSeed | null; // an action from elsewhere (practice, lesson, dashboard) to send now
  onConversation?: (c: Conversation) => void;
  compact?: boolean;
};

const ACTIONS: { id: string; label: string; text: string; needsFocus?: boolean; needsMiss?: boolean }[] = [
  { id: "explain-differently", label: "Explain this differently", text: "Can you explain this differently?" },
  { id: "simpler-example", label: "Show me a simpler example", text: "Show me a simpler example." },
  { id: "hint", label: "Give me a hint", text: "Give me a hint, but not the answer yet." },
  { id: "check-reasoning", label: "Check my reasoning", text: "Here's my reasoning: " },
  { id: "why-wrong", label: "Why was my answer wrong?", text: "Why was my answer wrong?", needsMiss: true },
  { id: "quiz", label: "Quiz me on this topic", text: "Quiz me on this topic, one question at a time." },
  { id: "harder-problem", label: "Give me a harder problem", text: "Give me a harder problem on this." },
  { id: "boss-prep", label: "Help me prepare for this boss", text: "Help me prepare for the next boss battle." },
];

export default function ChatPanel({ accountId, profile, progress, attempts, conversationId, lessonId, seed, onConversation, compact }: Props) {
  const [convo, setConvo] = useState<Conversation | null>(null);
  const [status, setStatus] = useState<TutorStatus>({ state: "checking" });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<(TutorError & { pending: { action?: string } }) | null>(null);
  const [showContext, setShowContext] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const handled = useRef<number | null>(null);
  const convoRef = useRef<Conversation | null>(null);
  convoRef.current = convo;

  const lesson = lessonById(convo?.lessonId || lessonId);
  const online = status.state === "online";

  useEffect(() => {
    let alive = true;
    checkTutor().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
      ctl.current?.abort();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!conversationId) {
      if (!convoRef.current?.messages.length) setConvo(null);
      return;
    }
    if (conversationId === convoRef.current?.id) return; // already showing it (e.g. just created)
    getConversation(conversationId).then((c) => alive && c && c.accountId === accountId && setConvo(c));
    return () => {
      alive = false;
    };
  }, [conversationId, accountId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [convo?.messages.length, busy]);

  const learner = profile.prefs.useProgress ? tutorContext(profile, progress, attempts) : undefined;
  const context = useCallback(
    (action?: string, focus?: string): TutorContext => {
      const l = lessonById(convoRef.current?.lessonId || lessonId);
      return {
        course: profile.course,
        prefs: { length: profile.prefs.length, level: profile.prefs.level, style: profile.prefs.style },
        lesson: l ? { title: l.title, objective: l.objective, unit: l.unit } : undefined,
        focus: (focus || convoRef.current?.focus)?.slice(0, LIMITS.maxFocusChars),
        action,
        learner,
      };
    },
    [profile, lessonId, learner],
  );

  const ensureConvo = async (firstText: string, extra: Partial<Conversation> = {}) => {
    if (convoRef.current) return convoRef.current;
    const c = await createConversation(accountId, profile.course, extra.title || firstText.replace(/\s+/g, " ").slice(0, 60), { lessonId, ...extra });
    setConvo(c);
    convoRef.current = c;
    onConversation?.(c);
    void addRecent(accountId, "tutor", c.id, c.title);
    return c;
  };

  // Sends the conversation (already containing the user's message) and stores the reply.
  const request = async (c: Conversation, action?: string) => {
    setBusy(true);
    setError(null);
    ctl.current = new AbortController();
    const r = await askTutor(c.messages.map((m) => ({ role: m.role, content: m.content })), context(action, c.focus), ctl.current.signal);
    setBusy(false);
    if (isTutorError(r)) {
      // Free allowance used up or the server is unreachable: answer from the built-in helper.
      if (r.code === "rate_limited" || r.code === "network" || r.code === "unavailable" || r.code === "unconfigured") {
        const last = c.messages[c.messages.length - 1];
        await local(c, helperFallback(helperInput(c, last?.content || "", action), r.code === "rate_limited" ? "limit" : "offline"), action);
        return;
      }
      setError({ ...r, pending: { action } });
      return;
    }
    const reply: ChatMessage = { role: "assistant", content: r.reply, at: Date.now(), meta: { provider: r.provider, action } };
    const next = await appendMessages(c.id, [reply]);
    if (next) {
      setConvo(next);
      onConversation?.(next);
    }
  };

  const helperInput = (c: Conversation, body: string, action?: string) => {
    const f = progress ? frontier(progress) : null;
    const w = f ? WORLDS[f.w] : null;
    return {
      action,
      text: body,
      focus: c.focus,
      lesson: lessonById(c.lessonId || lessonId),
      course: profile.course,
      round: c.messages.filter((m) => m.role === "assistant" && m.meta?.action === action).length,
      boss: f && w ? { name: w.enemies[BOSS].name, world: f.w, worldName: w.name, topic: w.topic } : undefined,
    };
  };

  // Stores a built-in helper reply (not AI).
  const local = async (c: Conversation, content: string, action?: string) => {
    const next = await appendMessages(c.id, [{ role: "assistant", content, at: Date.now(), meta: { provider: "helper", action } }]);
    if (next) {
      setConvo(next);
      onConversation?.(next);
    }
  };

  const send = async (raw: string, action?: string, extra: Partial<Conversation> = {}) => {
    const body = raw.trim();
    if (!body || busy) return;
    if (body.length > LIMITS.maxMessageChars) {
      setError({ code: "too_large", message: `That message is ${body.length} characters; the limit is ${LIMITS.maxMessageChars}. Shorten it or paste less code.`, pending: {} });
      return;
    }
    const c = await ensureConvo(body, extra);
    const msg: ChatMessage = { role: "user", content: body, at: Date.now(), meta: action ? { action } : undefined };
    const withMsg = await appendMessages(c.id, [msg]);
    if (!withMsg) return;
    setConvo(withMsg);
    setText("");
    // Buttons the helper can answer never use the AI (keeps the free AI allowance for real questions).
    const canned = action && (HELPER_ACTIONS.has(action) || action === "check-reasoning") ? helperReply(helperInput(withMsg, body, action)) : null;
    if (canned && (HELPER_ACTIONS.has(action!) || !online)) return local(withMsg, canned, action);
    if (!online) return local(withMsg, helperFallback(helperInput(withMsg, body, action), "offline"), action);
    await request(withMsg, action);
  };

  // Actions from other screens arrive as a seed and are sent once.
  useEffect(() => {
    if (!seed || handled.current === seed.key || status.state === "checking") return;
    handled.current = seed.key;
    const startNew = !!seed.focus && seed.focus !== convoRef.current?.focus;
    const go = async () => {
      if (startNew && convoRef.current) {
        convoRef.current = null;
        setConvo(null);
      }
      await send(seed.text || "Can you help me with this?", seed.action, { focus: seed.focus, lessonId: seed.lessonId || lessonId, title: seed.title });
    };
    void go();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, status.state]);

  const retry = async () => {
    const c = convoRef.current;
    if (!c || !error) return;
    await request(c, error.pending.action);
  };

  const stop = () => ctl.current?.abort();

  const voice = useSpeechInput((final, interim) => setText((t) => {
    const base = t.replace(/​.*$/s, "");
    return (final ? `${base}${base && !base.endsWith(" ") ? " " : ""}${final}` : base) + (interim ? `​${interim}` : "");
  }));
  const speech = useSpeechOutput();
  const cleanText = text.replace(/​/g, "");

  const miss = recentMistakes(attempts, profile.course, 14)[0];
  const hasMiss = !!convo?.focus?.includes("Student answered") || !!miss;
  const f = progress ? frontier(progress) : null;
  const bossNext = f && f.b === BOSS;
  const practiceHref = (difficulty: string) => `/learn/practice/?lesson=${lesson?.id || ""}&difficulty=${difficulty}`;

  const runAction = async (a: (typeof ACTIONS)[number]) => {
    if (a.id === "check-reasoning") {
      setText(a.text);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(a.text.length, a.text.length);
      }, 20);
      return;
    }
    if (a.id === "why-wrong" && !convo?.focus && miss) {
      const m = miss.attempt;
      const focus = `A question the student missed recently (${m.source}, skill: ${m.skill}): ${m.prompt || ""}${m.code ? `\nCode:\n${m.code}` : ""}\nStudent answered: ${m.given ?? "(unknown)"}\nVerified correct answer: ${m.expected ?? "(not stored)"}`;
      convoRef.current = null;
      setConvo(null);
      await send(`Why was my answer wrong on this ${m.skill} question?`, a.id, { focus, title: `Why wrong: ${m.skill}`, lessonId: miss.lessonId });
      return;
    }
    if (a.id === "boss-prep" && f) {
      const w = WORLDS[f.w];
      const focus = `Upcoming boss: ${w.enemies[BOSS].name} in ${w.name}. World topics: ${w.topic}.`;
      await send(a.text, a.id, { focus: convo?.focus || focus, title: `Boss prep: ${w.enemies[BOSS].name}` });
      return;
    }
    await send(a.text, a.id);
  };

  const suggestions = convo?.messages.length ? [] : lesson ? lesson.prompts : miss ? [`Explain ${miss.skill} to me.`, "What should I practice next?"] : ["What's the difference between == and .equals?", "Explain integer division.", "How do I trace a nested loop?"];

  return (
    <div className={`flex min-h-0 flex-col ${compact ? "h-full" : "h-[min(78dvh,760px)]"} overflow-hidden rounded-[26px] border-[3px] border-line bg-white`}>
      {/* status bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-line bg-sky px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: online ? (status.test ? "#FFB84D" : "#3EC46D") : status.state === "checking" ? "#C5D7EC" : "#FFB84D" }} />
          <span className="truncate text-sm font-black text-ink">
            {status.state === "checking" ? "Connecting to the tutor…" : online ? (status.test ? "TEST MODE · mock replies, not a real AI" : "AI tutor online · study helper built in") : "Study helper ready · AI tutor offline"}
          </span>
          {lesson && <span className="hidden truncate rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-ocean-deep sm:inline">{lesson.title}</span>}
        </div>
        <button type="button" onClick={() => setShowContext((v) => !v)} className="text-xs font-black text-ocean-deep underline-offset-2 hover:underline" aria-expanded={showContext}>
          What the tutor sees
        </button>
      </div>

      <AnimatePresence>
        {showContext && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b-2 border-line bg-[#FBFDFF]">
            <div className="max-h-56 overflow-y-auto px-4 py-3 text-sm font-semibold text-ink-soft">
              <p>Each message sends only: your course ({profile.course.toUpperCase()}), your explanation preferences, the current lesson or question, and the recent messages in this conversation. Never your warrior name, password or account.</p>
              {learner ? (
                <ul className="mt-2 list-disc pl-5">
                  {learner.currentWorld && <li>Current world: {learner.currentWorld}</li>}
                  {!!learner.worldsCleared.length && <li>Worlds cleared: {learner.worldsCleared.join(", ")}</li>}
                  {!!learner.lessonsCompleted.length && <li>Lessons finished: {learner.lessonsCompleted.join(", ")}</li>}
                  {!!learner.needsPractice.length && <li>Needs practice: {learner.needsPractice.join(", ")}</li>}
                  {!!learner.strengths.length && <li>Strong so far: {learner.strengths.join(", ")}</li>}
                  {!!learner.recentMistakes.length && <li>Recent mistakes: {learner.recentMistakes.join(", ")}</li>}
                </ul>
              ) : (
                <p className="mt-2">Progress sharing is off, so the tutor sees no game or practice progress.</p>
              )}
              <p className="mt-2">Change this in Learn settings.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* messages */}
      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite">
        {(status.state === "unconfigured" || status.state === "offline") && !convo?.messages.length ? (
          <div className="rounded-2xl bg-[#FFF6E5] px-4 py-3 text-[15px] font-semibold text-[#6B4A00]">
            <p className="font-black">The AI tutor is offline, but the study helper works.</p>
            <p className="mt-1">The buttons below (hints, explanations, examples, why was I wrong) are answered by the built-in study helper from the lessons and verified answers. It isn&apos;t AI, so typed questions get matched to the closest lesson.</p>
          </div>
        ) : null}
        {convo?.focus && (
          <details className="rounded-2xl bg-sky px-4 py-2 text-sm font-semibold text-ink-soft">
            <summary className="cursor-pointer font-black text-ink">About this question</summary>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-[13px]">{convo.focus.replace(/\n\nVerified correct answer:[\s\S]*$/, "").replace(/\n\nQuestion hint:[^\n]*/, "")}</pre>
          </details>
        )}
        {!convo?.messages.length && status.state !== "checking" && (
          <div className="text-[15px] font-semibold text-ink-soft">
            <p>{online ? <>Ask anything about {profile.course === "csa" ? "AP CSA Java" : "AP CSP"}: a concept, a mistake, or paste code you&apos;re stuck on.</> : "Pick a button below or type a topic."}</p>
          </div>
        )}
        {convo?.messages.map((m, i) => {
          const id = `${convo.id}-${i}`;
          return m.role === "user" ? (
            <div key={id} className="ml-auto max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-ocean px-4 py-2.5 font-semibold text-white">
              {m.content}
            </div>
          ) : (
            <div key={id} className="mr-auto w-full max-w-[96%] rounded-2xl rounded-bl-md bg-[#F3F7FD] px-4 py-3 text-[15.5px] font-semibold text-ink">
              <Markdown text={m.content} />
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-ink-mute">
                <span>{m.meta?.provider === "mock" ? "Mock reply (test mode)" : m.meta?.provider === "helper" ? "Study helper · built in, not AI · from verified lessons" : "AI tutor · can make mistakes"}</span>
                {speech.supported && (
                  <button type="button" className="font-black text-ocean-deep hover:underline" onClick={() => (speech.speakingId === id ? speech.stop() : speech.speak(id, m.content))} aria-pressed={speech.speakingId === id}>
                    {speech.speakingId === id ? "■ Stop reading" : "▶ Read aloud"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {busy && (
          <div className="mr-auto flex items-center gap-2 rounded-2xl bg-[#F3F7FD] px-4 py-3" role="status" aria-label="The tutor is thinking">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="h-2 w-2 rounded-full bg-ocean" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
            ))}
            <span className="text-sm font-bold text-ink-mute">Thinking…</span>
          </div>
        )}
        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-danger-soft px-4 py-3 font-bold text-danger-deep">
            <span>{error.message}{error.retryAfter ? ` (about ${Math.ceil(error.retryAfter / 60)} min)` : ""}</span>
            {error.code !== "too_large" && convo && convo.messages[convo.messages.length - 1]?.role === "user" && (
              <Button size="sm" tone="white" onClick={retry}>RETRY</Button>
            )}
          </div>
        )}
      </div>

      {/* actions */}
      <div className="flex gap-2 overflow-x-auto border-t-2 border-line px-3 py-2 sm:flex-wrap" role="toolbar" aria-label="Tutor actions">
        {ACTIONS.filter((a) => (a.id !== "why-wrong" || hasMiss) && (a.id !== "boss-prep" || bossNext)).map((a) => {
          const verified = (a.id === "quiz" || a.id === "harder-problem") && lesson;
          if (verified)
            return (
              <Link key={a.id} href={practiceHref(a.id === "quiz" ? "mixed" : "exam")} className="flex-none rounded-full border-2 border-grass bg-white px-3 py-1.5 text-sm font-black text-[#2BA155] hover:bg-[#E3F9EA]">
                {a.label} (verified practice)
              </Link>
            );
          return (
            <button key={a.id} type="button" disabled={busy || ((a.id === "quiz" || a.id === "harder-problem") && !online)} onClick={() => runAction(a)} className="flex-none rounded-full border-2 border-line bg-white px-3 py-1.5 text-sm font-black text-ink hover:border-ocean disabled:opacity-45">
              {a.label}
            </button>
          );
        })}
        {lesson && (
          <Link href={practiceHref("mixed")} className="flex-none rounded-full border-2 border-grass bg-white px-3 py-1.5 text-sm font-black text-[#2BA155] hover:bg-[#E3F9EA]">
            Verified practice set
          </Link>
        )}
      </div>

      {suggestions.length > 0 && status.state !== "checking" && (
        <div className="flex flex-wrap gap-2 px-3 pb-2">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} disabled={busy} className="rounded-xl bg-sky px-3 py-1.5 text-left text-sm font-bold text-ocean-deep hover:bg-ocean-soft disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* composer */}
      <form
        className="flex items-end gap-2 border-t-2 border-line bg-[#FBFDFF] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(cleanText);
        }}
      >
        <label className="sr-only" htmlFor="tutor-input">Message the tutor</label>
        <textarea
          id="tutor-input"
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send(cleanText);
            }
          }}
          rows={Math.min(8, Math.max(1, cleanText.split("\n").length))}
          placeholder={online ? "Ask a question or paste code" : "Type a topic, e.g. integer division"}
          className="min-h-[46px] flex-1 resize-none rounded-2xl border-[3px] border-line bg-white px-3.5 py-2.5 font-mono text-[15px] text-ink outline-none focus:border-ocean disabled:opacity-60"
          style={{ fontFamily: cleanText.includes("\n") || /[;{}]/.test(cleanText) ? undefined : "Nunito, sans-serif" }}
        />
        {voice.supported && (
          <button
            type="button"
            onClick={() => (voice.listening ? voice.stop() : voice.start())}
            aria-pressed={voice.listening}
            aria-label={voice.listening ? "Stop voice input" : "Start voice input"}
            className="grid h-[46px] w-[46px] flex-none place-items-center rounded-2xl border-[3px] font-black"
            style={{ borderColor: voice.listening ? "#E5484D" : "#D5E4F5", background: voice.listening ? "#FFE8EA" : "#FFFFFF", color: voice.listening ? "#D9434A" : "#4A5175" }}
          >
            {voice.listening ? <motion.span animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.9, repeat: Infinity }}>●</motion.span> : "🎤"}
          </button>
        )}
        {busy ? (
          <Button type="button" tone="white" onClick={stop}>STOP</Button>
        ) : (
          <Button type="submit" disabled={!cleanText.trim()}>SEND</Button>
        )}
      </form>
      {(voice.listening || voice.error) && (
        <p className="px-4 pb-2 text-xs font-bold" style={{ color: voice.error ? "#D9434A" : "#4A5175" }} role="status">
          {voice.error || "Listening… press the red button when you're done. Your browser's speech service turns speech into text (in Chrome, that uses Google's servers)."}
        </p>
      )}
      <p className="px-4 pb-2 text-[11px] font-bold text-ink-mute">{cleanText.length > LIMITS.maxMessageChars * 0.8 ? `${cleanText.length} / ${LIMITS.maxMessageChars} characters` : "The tutor can make mistakes. Practice answers marked verified were checked by a compiler or reference program."}</p>
    </div>
  );
}
