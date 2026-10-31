"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import ChatPanel, { type ChatSeed } from "@/components/learn/ChatPanel";
import LearnShell from "@/components/learn/LearnShell";
import { Button } from "@/components/ui";
import type { Conversation, Course } from "@/lib/db";
import { recentMistakes } from "@/lib/learn/insights";
import { lessonById } from "@/lib/learn/lessons";
import { deleteConversation, listConversations, setCourse } from "@/lib/learn/store";
import { useLearn } from "@/lib/learn/useLearn";

export default function TutorPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-sky" />}>
      <Tutor />
    </Suspense>
  );
}

function Tutor() {
  const params = useSearchParams();
  const router = useRouter();
  const { account, progress, profile, attempts, reload, warm } = useLearn();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(params.get("c"));
  const [seed, setSeed] = useState<ChatSeed | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [panelKey, setPanelKey] = useState(0); // changes only when the student switches conversations
  const lessonId = params.get("lesson") || undefined;

  const refresh = useCallback(async () => {
    if (account) setConvos(await listConversations(account.id));
  }, [account]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => setActive(params.get("c")), [params]);

  // "Why was I wrong?" links from the dashboard bring the most recent matching miss.
  useEffect(() => {
    const why = params.get("why");
    if (!why || !profile || !attempts.length) return;
    const m = recentMistakes(attempts, profile.course, 30).find((x) => why === "1" || x.skill === why);
    if (!m) return;
    const a = m.attempt;
    setActive(null);
    setPanelKey((k) => k + 1);
    setSeed({
      focus: `A question the student missed (${a.source}, skill: ${a.skill}): ${a.prompt || ""}${a.code ? `\nCode:\n${a.code}` : ""}\nStudent answered: ${a.given ?? "(unknown)"}\nVerified correct answer: ${a.expected ?? "(not stored)"}`,
      action: "why-wrong",
      text: `Why was my answer wrong on this ${a.skill} question?`,
      lessonId: m.lessonId,
      title: `Why wrong: ${a.skill}`,
      key: Date.now(),
    });
    router.replace("/learn/tutor/", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, profile?.course, attempts.length]);

  if (!account || !progress) return <div className="min-h-dvh bg-sky" />;
  const change = async (c: Course) => {
    await setCourse(account.id, c);
    await reload();
  };
  const open = (id: string | null) => {
    setSeed(null);
    setActive(id);
    setPanelKey((k) => k + 1);
    router.replace(id ? `/learn/tutor/?c=${id}` : "/learn/tutor/", { scroll: false });
  };
  const remove = async (id: string) => {
    await deleteConversation(id);
    setConfirm(null);
    if (active === id) open(null);
    await refresh();
  };

  return (
    <LearnShell account={account} progress={progress} profile={profile} warm={warm} onCourse={change}>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="card flex max-h-[min(78dvh,760px)] flex-col gap-2 overflow-hidden p-4" aria-label="Conversations">
          <Button tone="violet" onClick={() => open(null)}>NEW CONVERSATION</Button>
          <div className="flex min-h-0 flex-col gap-1.5 overflow-y-auto">
            {convos.length === 0 && <p className="px-1 text-sm font-bold text-ink-mute">Your conversations are saved on this device and appear here.</p>}
            {convos.map((c) => (
              <div key={c.id} className="group flex items-start gap-1 rounded-xl px-2 py-1.5" style={{ background: active === c.id ? "#F1EAFF" : undefined }}>
                <button type="button" onClick={() => open(c.id)} className="min-w-0 flex-1 text-left" aria-current={active === c.id ? "true" : undefined}>
                  <div className="truncate text-sm font-black text-ink">{c.title}</div>
                  <div className="truncate text-xs font-bold text-ink-mute">
                    {lessonById(c.lessonId)?.title || c.course.toUpperCase()} · {new Date(c.updatedAt).toLocaleDateString()}
                  </div>
                </button>
                {confirm === c.id ? (
                  <span className="flex flex-none gap-1">
                    <button type="button" onClick={() => remove(c.id)} className="rounded-lg bg-danger px-2 py-1 text-xs font-black text-white">Delete</button>
                    <button type="button" onClick={() => setConfirm(null)} className="rounded-lg bg-white px-2 py-1 text-xs font-black text-ink">Keep</button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirm(c.id)} aria-label={`Delete conversation ${c.title}`} className="flex-none rounded-lg px-2 py-1 text-xs font-black text-ink-mute hover:bg-danger-soft hover:text-danger-deep">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>
        <div className="min-w-0">
          {profile && (
            <ChatPanel
              key={panelKey}
              accountId={account.id}
              profile={profile}
              progress={progress}
              attempts={attempts}
              conversationId={active}
              lessonId={lessonId}
              seed={seed}
              onConversation={(c) => {
                if (active !== c.id) {
                  setActive(c.id);
                  router.replace(`/learn/tutor/?c=${c.id}`, { scroll: false });
                }
                void refresh();
              }}
            />
          )}
        </div>
      </div>
    </LearnShell>
  );
}
