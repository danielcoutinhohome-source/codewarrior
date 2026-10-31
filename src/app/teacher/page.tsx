"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink, Logo } from "@/components/ui";
import Assignments from "@/components/teacher/Assignments";
import Overview from "@/components/teacher/Overview";
import Reports from "@/components/teacher/Reports";
import Roster from "@/components/teacher/Roster";
import SessionModal from "@/components/teacher/SessionModal";
import Settings from "@/components/teacher/Settings";
import StudentDetail from "@/components/teacher/StudentDetail";
import { runLabel } from "@/components/teacher/labels";
import type { Summary } from "@/components/teacher/types";
import { api, classroomEnabled, errorText, setCloud, useCloud } from "@/lib/cloud/client";
import { useLive } from "@/lib/cloud/live";
import type { ClassInfo } from "@/lib/cloud/protocol";

const TABS = [
  ["overview", "Overview"],
  ["roster", "Roster"],
  ["assignments", "Assignments"],
  ["reports", "Reports"],
  ["settings", "Settings"],
] as const;
type Tab = (typeof TABS)[number][0];

export default function TeacherPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-sky" />}>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const router = useRouter();
  const params = useSearchParams();
  const cloud = useCloud();
  const [ready, setReady] = useState(false);
  const [classes, setClasses] = useState<ClassInfo[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<{ sessionId?: string; label?: string } | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => setReady(true), []);
  const isTeacher = cloud?.me.role === "teacher";
  useEffect(() => {
    if (cloud?.me.mustChangePassword) router.replace("/account/?change=1");
  }, [cloud, router]);

  const classId = params.get("c") || classes?.find((c) => !c.archived)?.id || classes?.[0]?.id || null;
  const tab = (TABS.some(([t]) => t === params.get("tab")) ? params.get("tab") : "overview") as Tab;
  const studentId = params.get("student");
  const go = useCallback(
    (patch: Record<string, string | null>) => {
      const q = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) (v ? q.set(k, v) : q.delete(k));
      router.replace(`/teacher/?${q}`, { scroll: false });
    },
    [params, router],
  );

  const loadClasses = useCallback(async () => {
    try {
      const r = await api<{ classes: ClassInfo[] }>("GET", "/classes");
      setClasses(r.classes);
      setError(null);
    } catch (e) {
      setError(errorText(e));
    }
  }, []);
  useEffect(() => {
    if (isTeacher && !cloud?.me.mustChangePassword) void loadClasses();
  }, [isTeacher, cloud?.me.mustChangePassword, loadClasses]);

  // Only the latest request for the current class may update the screen.
  const req = useRef(0);
  const lastLoad = useRef(0);
  const loadSummary = useCallback(async () => {
    if (!classId) return;
    const n = ++req.current;
    lastLoad.current = Date.now();
    try {
      const s = await api<Summary>("GET", `/classes/${classId}/summary`);
      if (n !== req.current) return;
      setSummary(s);
      setRefreshedAt(Date.now());
      setVersion((v) => v + 1);
      setError(null);
    } catch (e) {
      if (n === req.current) setError(errorText(e));
    }
  }, [classId]);
  useEffect(() => {
    setSummary(null);
    void loadSummary();
  }, [loadSummary]);

  // Live updates: a short wait collects a burst (several students finishing at once) into one
  // reload, and reloads happen at most every 3 seconds, which keeps database reads low. While the
  // tab is hidden nothing reloads; coming back catches up once if anything changed meanwhile.
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const classesToo = useRef(false);
  const changedWhileHidden = useRef(false);
  const onLive = useCallback(
    (what: string) => {
      if (what === "class" || what === "roster") classesToo.current = true;
      if (what === "visible") {
        if (!changedWhileHidden.current && Date.now() - lastLoad.current < 60_000) return;
        changedWhileHidden.current = false;
      } else if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        changedWhileHidden.current = true;
        return;
      }
      if (debounce.current) return; // a reload is already scheduled
      const wait = Math.max(600, 3000 - (Date.now() - lastLoad.current));
      debounce.current = setTimeout(() => {
        debounce.current = null;
        void loadSummary();
        if (classesToo.current) void loadClasses();
        classesToo.current = false;
      }, wait);
    },
    [loadSummary, loadClasses],
  );
  useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current); }, []);
  const live = useLive(isTeacher && !cloud?.me.mustChangePassword ? classId : null, cloud?.token ?? null, onLive);

  if (!ready) return <div className="min-h-dvh bg-sky" />;
  if (!classroomEnabled())
    return (
      <Shell>
        <Card title="Class accounts aren't set up on this site">
          <p className="font-bold text-ink-soft">You can still use the <Link href="/teacher/codes/" className="font-black text-ocean-deep">offline progress-code table</Link>.</p>
        </Card>
      </Shell>
    );
  if (!cloud)
    return (
      <Shell>
        <Card title="Teacher dashboard">
          <p className="font-bold text-ink-soft">Sign in with your teacher account to see your classes. Results from your students&apos; devices appear here automatically.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink href="/login/?as=teacher">TEACHER SIGN IN</ButtonLink>
          </div>
          <p className="mt-3 text-sm font-bold text-ink-mute">Not using class accounts? The <Link href="/teacher/codes/" className="font-black text-ocean-deep">offline progress-code table</Link> still works.</p>
        </Card>
      </Shell>
    );
  if (!isTeacher)
    return (
      <Shell>
        <Card title="This area is for teachers">
          <p className="font-bold text-ink-soft">You&apos;re signed in as a student. Your classes and assignments are on your Class page.</p>
          <div className="mt-3"><ButtonLink href="/classroom/">GO TO MY CLASS</ButtonLink></div>
        </Card>
      </Shell>
    );
  if (cloud.me.mustChangePassword) return <div className="min-h-dvh bg-sky" />;

  const signOut = async () => {
    try {
      await api("POST", "/auth/logout");
    } catch {}
    setCloud(null);
    router.push("/");
  };
  const liveLabel = live === "live" ? ["#3EC46D", "Live"] : live === "connecting" ? ["#C5D7EC", "Connecting…"] : live === "reconnecting" ? ["#FFB84D", "Reconnecting…"] : ["#FFB84D", "Live updates paused, checking every 30 s"];

  return (
    <Shell
      right={
        <div className="flex flex-wrap items-center gap-2 text-sm font-black">
          <span className="text-ink-soft">{cloud.me.displayName}</span>
          <Link href="/account/" className="rounded-xl bg-white px-3 py-1.5 text-ink-soft hover:text-ink">Account</Link>
          <button type="button" onClick={() => void signOut()} className="rounded-xl bg-white px-3 py-1.5 text-ink-soft hover:text-ink">Sign out</button>
        </div>
      }
    >
      <div className="grid items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="card flex flex-col gap-2 p-4" aria-label="Classes">
          <h2 className="text-[13px] font-black uppercase tracking-wider text-ink-mute">Classes</h2>
          {classes === null ? <p className="text-sm font-bold text-ink-mute">Loading…</p> : classes.length === 0 && !creating ? <p className="text-sm font-bold text-ink-mute">No classes yet.</p> : null}
          {classes?.map((c) => (
            <button key={c.id} type="button" onClick={() => go({ c: c.id, student: null, tab: tab === "settings" ? "settings" : tab })} aria-current={c.id === classId ? "true" : undefined} className="rounded-xl px-3 py-2 text-left" style={{ background: c.id === classId ? "#E2F3FF" : undefined }}>
              <div className="font-black text-ink">{c.name}</div>
              <div className="text-xs font-bold text-ink-mute">{c.course === "csa" ? "AP CSA" : "AP CSP"}{c.section ? ` · ${c.section}` : ""} · {c.memberCount} student{c.memberCount === 1 ? "" : "s"}{c.archived ? " · archived" : ""}</div>
            </button>
          ))}
          {creating ? <NewClass onDone={async (id) => { setCreating(false); await loadClasses(); if (id) go({ c: id, tab: "settings", student: null }); }} /> : <Button size="sm" tone="ocean" onClick={() => setCreating(true)}>NEW CLASS</Button>}
          <Link href="/teacher/codes/" className="mt-2 text-xs font-bold text-ink-mute hover:text-ink">Offline progress codes</Link>
        </aside>

        <main className="flex min-w-0 flex-col gap-4">
          {error && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#FFF1E6] px-4 py-3 font-bold text-[#9A3412]">
              <span>{error}</span>
              <Button size="sm" tone="white" onClick={() => { void loadClasses(); void loadSummary(); }}>RETRY</Button>
            </div>
          )}
          {!classId ? (
            classes && <Card title="Create your first class"><p className="font-bold text-ink-soft">Use “New class” on the left. You&apos;ll get a code to share with students.</p></Card>
          ) : !summary ? (
            <Card title="Loading class…"><p className="font-bold text-ink-mute">Getting the latest results.</p></Card>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-none">{summary.class.name}</h1>
                  <p className="text-sm font-bold text-ink-mute">{summary.class.course === "csa" ? "AP CSA" : "AP CSP"}{summary.class.section ? ` · ${summary.class.section}` : ""} · class code <span className="font-mono font-black text-ink">{summary.class.joinCode}</span>{summary.class.archived ? " · archived" : !summary.class.joinEnabled ? " · joining off" : ""}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-black text-ink-soft" role="status" aria-live="polite">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: liveLabel[0] }} aria-hidden />
                  <span>{liveLabel[1]}</span>
                  {refreshedAt && <span className="font-bold text-ink-mute">· updated {new Date(refreshedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>}
                  <button type="button" onClick={() => void loadSummary()} className="rounded-lg bg-white px-2 py-1 text-ocean-deep">Refresh</button>
                </div>
              </div>
              <nav className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1" aria-label="Class sections">
                {TABS.map(([t, label]) => (
                  <button key={t} type="button" onClick={() => go({ tab: t, student: null })} aria-current={tab === t && !studentId ? "page" : undefined} className="flex-none rounded-xl px-4 py-2 text-sm font-black" style={{ background: tab === t && !studentId ? "#2D9CDB" : "transparent", color: tab === t && !studentId ? "#FFFFFF" : "#4A5175" }}>
                    {label}
                  </button>
                ))}
              </nav>
              {studentId ? (
                <StudentDetail classId={summary.class.id} studentId={studentId} version={version} feedbackFor={feedbackFor} onBack={() => { setFeedbackFor(null); go({ student: null }); }} onSession={setSessionId} />
              ) : tab === "overview" ? (
                <Overview data={summary} onSession={setSessionId} onStudent={(id) => go({ student: id })} />
              ) : tab === "roster" ? (
                <Roster data={summary} onStudent={(id) => go({ student: id })} onChanged={() => void loadSummary()} />
              ) : tab === "assignments" ? (
                <Assignments data={summary} onChanged={() => void loadSummary()} />
              ) : tab === "reports" ? (
                <Reports data={summary} />
              ) : (
                <Settings key={summary.class.id} data={summary} onChanged={() => { void loadSummary(); void loadClasses(); }} />
              )}
            </>
          )}
        </main>
      </div>
      {summary && (
        <SessionModal
          classId={summary.class.id}
          sessionId={sessionId}
          onClose={() => setSessionId(null)}
          onFeedback={(s) => {
            setSessionId(null);
            setFeedbackFor({ sessionId: s.id, label: `${s.studentName}: ${runLabel(s)}` });
            go({ student: s.studentId });
            setTimeout(() => document.getElementById("feedback")?.scrollIntoView({ behavior: "smooth" }), 400);
          }}
        />
      )}
    </Shell>
  );
}

function NewClass({ onDone }: { onDone: (id?: string) => void }) {
  const [name, setName] = useState("");
  const [course, setCourse] = useState<"csa" | "csp">("csa");
  const [section, setSection] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-2 rounded-2xl bg-sky p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const r = await api<{ class: ClassInfo }>("POST", "/classes", { name, course, section });
          onDone(r.class.id);
        } catch (e2) {
          setErr(errorText(e2));
        }
      }}
    >
      <label className="text-xs font-black text-ink-soft" htmlFor="nc-name">Class name<input id="nc-name" className="field mt-1" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="AP CSA Period 3" /></label>
      <label className="text-xs font-black text-ink-soft" htmlFor="nc-course">Course
        <select id="nc-course" className="field mt-1" value={course} onChange={(e) => setCourse(e.target.value as "csa")}>
          <option value="csa">AP CSA (Java)</option>
          <option value="csp">AP CSP (pseudocode)</option>
        </select>
      </label>
      <label className="text-xs font-black text-ink-soft" htmlFor="nc-sec">Section (optional)<input id="nc-sec" className="field mt-1" maxLength={40} value={section} onChange={(e) => setSection(e.target.value)} /></label>
      {err && <p role="alert" className="text-xs font-black text-danger-deep">{err}</p>}
      <div className="flex gap-2">
        <Button size="sm" tone="white" type="button" onClick={() => onDone()}>CANCEL</Button>
        <Button size="sm" tone="ocean" type="submit" disabled={!name.trim()}>CREATE</Button>
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h1 className="font-display text-3xl">{title}</h1>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-sky">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pb-12 pt-5 sm:px-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="CodeWarrior home"><Logo size={28} /></Link>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-ocean-deep">Teacher dashboard</span>
          </div>
          {right}
        </header>
        {children}
      </div>
    </div>
  );
}
