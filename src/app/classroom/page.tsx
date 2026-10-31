"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button, ButtonLink, Logo } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { api, classroomEnabled, errorText, localIdFor, useCloud } from "@/lib/cloud/client";
import { cachedHome, fetchHome, type StudentHome } from "@/lib/cloud/home";
import { flush, useSyncState } from "@/lib/cloud/outbox";
import { enterGame } from "@/lib/cloud/progressSync";
import type { ClassInfo, StudentAssignment } from "@/lib/cloud/protocol";
import { BOSS, WORLDS } from "@/lib/game";

const COURSE: Record<string, string> = { csa: "AP CSA", csp: "AP CSP" };
const when = (t: number | null) => (t ? new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
const dueText = (a: StudentAssignment) => {
  if (!a.dueAt) return "No due date";
  const local = new Date(a.dueAt).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  let teacher = "";
  try {
    const mine = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (a.dueTz && a.dueTz !== mine) teacher = ` (${new Date(a.dueAt).toLocaleString(undefined, { timeZone: a.dueTz, hour: "numeric", minute: "2-digit", timeZoneName: "short" })} for your teacher)`;
  } catch {}
  return `Due ${local}${teacher}`;
};
const STATE: Record<string, [string, string, string]> = {
  completed: ["Completed", "#1E7A3E", "#E3F9EA"],
  in_progress: ["In progress", "#1F7DB5", "#E2F3FF"],
  not_started: ["Not started", "#4A5175", "#EEF4FB"],
  overdue: ["Overdue", "#B42318", "#FFE8EA"],
};
const battleName = (w: number, b: number) => `${WORLDS[w].name}: ${b === BOSS ? `Boss, ${WORLDS[w].enemies[b].name}` : `Battle ${b + 1}, ${WORLDS[w].enemies[b].name}`}`;

export default function ClassroomPage() {
  const router = useRouter();
  const cloud = useCloud();
  const sync = useSyncState();
  const [home, setHome] = useState<StudentHome | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [share, setShare] = useState(true);
  const [joinMsg, setJoinMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [playingAs, setPlayingAs] = useState<string | null>(null);

  useEffect(() => setPlayingAs(getSession()), []);
  useEffect(() => {
    if (cloud?.me.role === "teacher") router.replace("/teacher/");
  }, [cloud, router]);

  const load = useCallback(async () => {
    if (!cloud || cloud.me.role !== "student") return;
    try {
      setHome(await fetchHome());
      setLoadError(null);
    } catch (e) {
      setHome((h) => h ?? cachedHome());
      setLoadError(errorText(e));
    }
  }, [cloud]);
  useEffect(() => {
    setHome(cachedHome());
    void load();
    const onFocus = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [load]);
  // New results change assignment status: refresh after uploads finish.
  useEffect(() => {
    if (sync.lastSyncAt) void load();
  }, [sync.lastSyncAt, load]);

  if (!classroomEnabled())
    return (
      <Shell>
        <section className="card p-6">
          <h1 className="font-display text-3xl">Classes aren&apos;t set up yet</h1>
          <p className="mt-2 font-bold text-ink-soft">This copy of CodeWarrior isn&apos;t connected to a class server.</p>
        </section>
      </Shell>
    );

  if (!cloud)
    return (
      <Shell>
        <section className="card flex flex-col gap-3 p-6">
          <h1 className="font-display text-3xl">Join your class</h1>
          <p className="font-bold text-ink-soft">To join a class you need a class account. It saves your progress online, so it works on any device, and shares your work with your teacher after you join.</p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/create/">CREATE A CLASS ACCOUNT</ButtonLink>
            <ButtonLink href="/login/" tone="white">SIGN IN</ButtonLink>
          </div>
          <p className="text-sm font-bold text-ink-mute">Already have a warrior on this device? After you sign in, you can bring its progress into your class account from Account settings.</p>
        </section>
      </Shell>
    );

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setJoinMsg(null);
    try {
      const r = await api<{ class: ClassInfo; already: boolean }>("POST", "/join", { code, sharePlay: share });
      setJoinMsg({ ok: true, text: r.already ? `You're already in ${r.class.name}.` : `You joined ${r.class.name} with ${r.class.teacherName}. Your work from now on is shared with them.` });
      setCode("");
      await load();
    } catch (err) {
      setJoinMsg({ ok: false, text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };
  const toggleShare = async (c: ClassInfo) => {
    try {
      await api("PATCH", `/classes/${c.id}/membership`, { sharePlay: !c.sharePlay });
      await load();
    } catch (e) {
      setLoadError(errorText(e));
    }
  };
  const leave = async (id: string) => {
    try {
      await api("POST", `/classes/${id}/leave`);
      setLeaving(null);
      await load();
    } catch (e) {
      setLoadError(errorText(e));
    }
  };

  const mine = localIdFor(cloud.me.id);
  const groups: [string, StudentAssignment[]][] = home
    ? [
        ["To do", home.assignments.filter((a) => a.state !== "completed")],
        ["Done", home.assignments.filter((a) => a.state === "completed")],
      ]
    : [];

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[13px] font-black uppercase tracking-[0.15em] text-ocean-deep">Class</div>
          <h1 className="font-display text-[clamp(32px,5vw,44px)] leading-none">Hi, {cloud.me.displayName}</h1>
        </div>
        {playingAs !== mine && (
          <Button tone="ocean" onClick={async () => { await enterGame(cloud.me); setPlayingAs(mine); router.push("/map/"); }}>
            PLAY AS {cloud.me.username.toUpperCase()}
          </Button>
        )}
      </div>

      <SyncPanel />
      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#FFF1E6] px-4 py-3 font-bold text-[#9A3412]">
          <span>{loadError}{home ? " Showing what was saved on this device." : ""}</span>
          <Button size="sm" tone="white" onClick={() => void load()}>RETRY</Button>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="card p-5" aria-labelledby="asg-title">
            <h2 id="asg-title" className="font-display text-2xl">Assignments</h2>
            {!home ? (
              <p className="mt-2 font-bold text-ink-mute">Loading…</p>
            ) : home.assignments.length === 0 ? (
              <p className="mt-2 font-bold text-ink-mute">{home.classes.length ? "No assignments yet. Your teacher's published work shows up here." : "Join a class to see assignments."}</p>
            ) : (
              groups.map(([label, list]) =>
                list.length ? (
                  <div key={label} className="mt-3">
                    <h3 className="text-[13px] font-black uppercase tracking-wider text-ink-mute">{label}</h3>
                    <ul className="mt-2 flex flex-col gap-3">
                      {list.map((a) => <AssignmentCard key={a.id} a={a} multi={home.classes.length > 1} />)}
                    </ul>
                  </div>
                ) : null,
              )
            )}
          </section>

          <section className="card p-5" aria-labelledby="fb-title">
            <h2 id="fb-title" className="font-display text-2xl">Feedback from your teacher</h2>
            {!home?.feedback.length ? (
              <p className="mt-2 font-bold text-ink-mute">No feedback yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {home.feedback.map((f) => (
                  <li key={f.id} className="rounded-2xl bg-sky px-4 py-3">
                    <p className="whitespace-pre-wrap font-bold text-ink">{f.body}</p>
                    <p className="mt-1 text-xs font-bold text-ink-mute">{f.teacherName} · {f.className} · {when(f.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5" aria-labelledby="recent-title">
            <h2 id="recent-title" className="font-display text-2xl">Recent results saved</h2>
            {!home?.recent.length ? (
              <p className="mt-2 font-bold text-ink-mute">Battles and practice you finish show up here once they&apos;re saved.</p>
            ) : (
              <ul className="mt-3 divide-y-2 divide-line">
                {home.recent.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm font-bold">
                    <span className="text-ink">{r.kind === "battle" && r.world !== null && r.battle !== null ? battleName(r.world, r.battle) : `Practice${r.lessonId ? `: ${r.lessonId}` : ""}`}</span>
                    <span className="text-ink-soft">
                      {r.outcome === "in_progress" ? "Saving…" : r.outcome === "abandoned" ? "Left early" : r.outcome === "won" ? `Won · ${r.stars}★` : r.outcome === "lost" ? "Knocked out" : "Completed"} · {r.firstTry}/{r.questionCount} first try
                      {r.assignmentTitle ? ` · ${r.assignmentTitle}` : ""} · {when(r.receivedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="card p-5" aria-labelledby="join-title">
            <h2 id="join-title" className="font-display text-2xl">Join a class</h2>
            <form onSubmit={join} className="mt-2 flex flex-col gap-3">
              <label className="field-label" htmlFor="join-code">
                Class code from your teacher
                <input id="join-code" className="field font-mono uppercase tracking-[0.2em]" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 12))} placeholder="ABCD2345" autoComplete="off" />
              </label>
              <label className="flex items-start gap-2 text-sm font-bold text-ink-soft">
                <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="mt-1 h-4 w-4 accent-[#2D9CDB]" />
                <span>Also share battles and practice I do on my own (not just assignments). You can change this later.</span>
              </label>
              <p className="text-xs font-bold text-ink-mute">Your teacher sees your name, your results and your answers from the moment you join. Nothing from before.</p>
              <Button type="submit" tone="ocean" disabled={busy || code.replace(/[^A-Z0-9]/g, "").length < 8}>{busy ? "JOINING…" : "JOIN CLASS"}</Button>
              {joinMsg && <p role="status" className="rounded-2xl px-3 py-2 text-sm font-black" style={{ color: joinMsg.ok ? "#1E7A3E" : "#B42318", background: joinMsg.ok ? "#E3F9EA" : "#FFE8EA" }}>{joinMsg.text}</p>}
            </form>
          </section>

          <section className="card p-5" aria-labelledby="classes-title">
            <h2 id="classes-title" className="font-display text-2xl">My classes</h2>
            {!home?.classes.length ? (
              <p className="mt-2 font-bold text-ink-mute">You haven&apos;t joined a class yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {home.classes.map((c) => (
                  <li key={c.id} className="rounded-2xl border-2 border-line p-3">
                    <div className="font-black text-ink">{c.name}</div>
                    <div className="text-xs font-bold text-ink-mute">{COURSE[c.course]}{c.section ? ` · ${c.section}` : ""} · {c.teacherName} · joined {new Date(c.joinedAt || 0).toLocaleDateString()}</div>
                    <label className="mt-2 flex items-center gap-2 text-sm font-bold text-ink-soft">
                      <input type="checkbox" checked={!!c.sharePlay} onChange={() => void toggleShare(c)} className="h-4 w-4 accent-[#2D9CDB]" />
                      Share my own battles and practice
                    </label>
                    {leaving === c.id ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-black">
                        <span className="text-danger-deep">Leave {c.name}? Your teacher keeps what you already did.</span>
                        <Button size="sm" tone="white" onClick={() => setLeaving(null)}>STAY</Button>
                        <Button size="sm" tone="danger" onClick={() => void leave(c.id)}>LEAVE</Button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setLeaving(c.id)} className="mt-1 text-xs font-black text-ink-mute hover:text-danger-deep">Leave class</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
}

function AssignmentCard({ a, multi }: { a: StudentAssignment; multi: boolean }) {
  const [label, color, bg] = STATE[a.state];
  const launches =
    a.target.kind === "battles"
      ? a.target.battles.map(([w, b]) => ({ key: `${w}-${b}`, href: `/battle/?w=${w}&b=${b}&assignment=${a.id}`, label: battleName(w, b) }))
      : [{ key: a.target.lessonId, href: `/learn/practice/?lesson=${a.target.lessonId}&difficulty=${a.target.difficulty}&count=${a.target.count}&assignment=${a.id}`, label: `Practice: ${a.target.lessonTitle} (${a.target.count} questions)` }];
  const credit = (k: string) => a.credits?.find((c) => c.target === k);
  return (
    <li className="rounded-2xl border-2 border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-black text-ink">{a.title}</div>
          <div className="text-xs font-bold text-ink-mute">{multi ? `${a.className} · ` : ""}{dueText(a)}</div>
        </div>
        <span className="rounded-full px-2.5 py-1 text-xs font-black" style={{ color, background: bg }}>{label}{a.late ? " (late)" : ""}</span>
      </div>
      {a.instructions && <p className="mt-2 whitespace-pre-wrap text-sm font-bold text-ink-soft">{a.instructions}</p>}
      <div className="mt-2 text-xs font-black text-ink-mute">
        {a.done} of {a.needed} done ·{" "}
        {a.requireLaunch ? "your teacher wants these played from here: only work started from these buttons counts" : "battles you already won count too"}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {launches.map((l) => {
          const c = credit(l.key);
          return (
            <Link key={l.href} href={l.href} className="rounded-xl border-2 px-3 py-1.5 text-sm font-black hover:bg-ocean-soft" style={{ borderColor: c ? "#3EC46D" : "#2D9CDB", color: c ? "#1E7A3E" : "#1F7DB5", background: c ? "#E3F9EA" : "#FFFFFF" }}>
              {c ? "✓ " : ""}{l.label}{c ? (c.viaAssignment ? "" : " (already won)") : " →"}
            </Link>
          );
        })}
      </div>
    </li>
  );
}

function SyncPanel() {
  const s = useSyncState();
  const text =
    s.pending === 0 && s.state !== "error"
      ? s.lastSyncAt
        ? `Everything is saved. Last upload ${new Date(s.lastSyncAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.`
        : "Everything is saved."
      : s.state === "offline"
        ? `${s.pending} result${s.pending === 1 ? "" : "s"} saved on this device, waiting for a connection.`
        : s.state === "signed-out"
          ? `${s.pending} result${s.pending === 1 ? "" : "s"} waiting. Sign in again to send them.`
          : s.state === "error"
            ? `${s.pending} result${s.pending === 1 ? "" : "s"} couldn't sync yet: ${s.lastError}. They're safe on this device.`
            : `Saving ${s.pending} result${s.pending === 1 ? "" : "s"}…`;
  const warn = s.state === "error" || s.state === "signed-out";
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-2.5 text-sm font-black" style={{ background: warn ? "#FFF1E6" : "#FFFFFF", color: warn ? "#9A3412" : "#4A5175" }}>
      <span>{text}</span>
      {s.pending > 0 && <Button size="sm" tone="white" onClick={() => void flush()}>SYNC NOW</Button>}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-sky">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-12 pt-5 sm:px-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" aria-label="CodeWarrior home"><Logo size={28} /></Link>
          <nav className="flex flex-wrap gap-2 text-sm font-black" aria-label="Class">
            <Link href="/map/" className="rounded-xl bg-white px-3 py-1.5 text-ink-soft hover:text-ink">World map</Link>
            <Link href="/learn/" className="rounded-xl bg-white px-3 py-1.5 text-ink-soft hover:text-ink">Learn</Link>
            <Link href="/account/" className="rounded-xl bg-white px-3 py-1.5 text-ink-soft hover:text-ink">Account</Link>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
