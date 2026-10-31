"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Button, ButtonLink, Logo } from "@/components/ui";
import { getSession, listWarriors, logOut, verifyLocal } from "@/lib/auth";
import { api, errorText, localIdFor, setCloud, useCloud } from "@/lib/cloud/client";
import { useSyncState } from "@/lib/cloud/outbox";
import { importLegacy, importedIds } from "@/lib/cloud/progressSync";
import { MIN_PASSWORD, type Me } from "@/lib/cloud/protocol";
import type { Account } from "@/lib/db";

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-sky" />}>
      <AccountSettings />
    </Suspense>
  );
}

function AccountSettings() {
  const router = useRouter();
  const cloud = useCloud();
  const sync = useSyncState();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div className="min-h-dvh bg-sky" />;
  if (!cloud)
    return (
      <Shell>
        <section className="card flex flex-col gap-3 p-6">
          <h1 className="font-display text-3xl">Not signed in</h1>
          <p className="font-bold text-ink-soft">Sign in with your class account to change its settings.</p>
          <div className="flex gap-2"><ButtonLink href="/login/">SIGN IN</ButtonLink></div>
        </section>
      </Shell>
    );
  const me = cloud.me;
  const signOut = async (everywhere: boolean) => {
    try {
      await api("POST", everywhere ? "/auth/logout-all" : "/auth/logout");
    } catch {}
    setCloud(null);
    if (getSession() === localIdFor(me.id)) logOut();
    router.push("/");
  };

  return (
    <Shell>
      <div>
        <div className="text-[13px] font-black uppercase tracking-[0.15em] text-ocean-deep">{me.role === "teacher" ? "Teacher account" : "Class account"}</div>
        <h1 className="font-display text-[clamp(32px,5vw,44px)] leading-none">{me.displayName}</h1>
        <p className="font-bold text-ink-mute">Signed in as {me.username}</p>
      </div>
      {me.mustChangePassword && (
        <div role="alert" className="rounded-2xl bg-[#FFF1E6] px-4 py-3 font-black text-[#9A3412]">
          This account is using a starter password. Choose your own password to open your classes.
        </div>
      )}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <PasswordCard me={me} onChanged={(m) => { setCloud({ token: cloud.token, me: m }); if (m.role === "teacher") router.push("/teacher/"); }} />
        {!me.mustChangePassword && <NameCard me={me} token={cloud.token} />}
        {!me.mustChangePassword && me.role === "teacher" && <InvitesCard />}
        {!me.mustChangePassword && me.role === "student" && <ImportCard />}
        <section className="card flex flex-col gap-3 p-5">
          <h2 className="font-display text-2xl">Sign out</h2>
          {sync.pending > 0 && (
            <p className="rounded-2xl bg-[#FFF1E6] px-3 py-2 text-sm font-black text-[#9A3412]">
              {sync.pending} result{sync.pending === 1 ? " hasn't" : "s haven't"} uploaded yet. They stay on this device and upload the next time you sign in here. They never go to a different account.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button tone="white" onClick={() => void signOut(false)}>SIGN OUT</Button>
            <Button tone="white" onClick={() => void signOut(true)}>SIGN OUT ON ALL DEVICES</Button>
          </div>
        </section>
      </div>
    </Shell>
  );
}

function PasswordCard({ me, onChanged }: { me: Me; onChanged: (m: Me) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < MIN_PASSWORD) return setMsg({ ok: false, text: `Use at least ${MIN_PASSWORD} characters.` });
    if (next !== confirm) return setMsg({ ok: false, text: "The new passwords don't match." });
    setBusy(true);
    try {
      const r = await api<{ me: Me }>("POST", "/auth/password", { current, next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setMsg({ ok: true, text: "Password changed. Other devices were signed out." });
      onChanged(r.me);
    } catch (err) {
      setMsg({ ok: false, text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="card flex flex-col gap-3 p-5" aria-labelledby="pw-title">
      <h2 id="pw-title" className="font-display text-2xl">{me.mustChangePassword ? "Choose your password" : "Change password"}</h2>
      <label className="field-label" htmlFor="pw-cur">
        {me.mustChangePassword ? "Starter password" : "Current password"}
        <input id="pw-cur" className="field" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <label className="field-label" htmlFor="pw-new">
        New password
        <input id="pw-new" className="field" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      </label>
      <label className="field-label" htmlFor="pw-confirm">
        New password again
        <input id="pw-confirm" className="field" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      <p className="text-xs font-bold text-ink-mute">At least {MIN_PASSWORD} characters. There&apos;s no email recovery, so keep it somewhere safe. {me.role === "teacher" ? "If you forget it, the site administrator can set a new starter password." : "There's no password reset for students yet: if you forget it, make a new class account and rejoin your class."}</p>
      {msg && <p role="status" className="rounded-2xl px-3 py-2 text-sm font-black" style={{ color: msg.ok ? "#1E7A3E" : "#B42318", background: msg.ok ? "#E3F9EA" : "#FFE8EA" }}>{msg.text}</p>}
      <Button type="submit" tone="ocean" disabled={busy || !current || !next}>{busy ? "SAVING…" : "SAVE PASSWORD"}</Button>
    </form>
  );
}

function NameCard({ me, token }: { me: Me; token: string }) {
  const [name, setName] = useState(me.displayName);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="card flex flex-col gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const r = await api<{ me: Me }>("PATCH", "/me", { displayName: name });
          setCloud({ token, me: r.me });
          setMsg("Saved.");
        } catch (err) {
          setMsg(errorText(err));
        }
      }}
    >
      <h2 className="font-display text-2xl">Your name</h2>
      <label className="field-label" htmlFor="disp">
        {me.role === "teacher" ? "Name students see" : "Name your teacher sees"}
        <input id="disp" className="field" maxLength={40} value={name} onChange={(e) => { setName(e.target.value); setMsg(null); }} />
      </label>
      {msg && <p role="status" className="text-sm font-black text-ink-soft">{msg}</p>}
      <Button type="submit" tone="white" disabled={!name.trim() || name === me.displayName}>SAVE NAME</Button>
    </form>
  );
}

type Invite = { id: string; hint: string; createdAt: number; expiresAt: number; usedAt: number | null; usedBy: string | null; revoked: boolean };
function InvitesCard() {
  const [list, setList] = useState<Invite[] | null>(null);
  const [fresh, setFresh] = useState<{ code: string; expiresAt: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setList((await api<{ invites: Invite[] }>("GET", "/teacher/invites")).invites);
    } catch (e) {
      setErr(errorText(e));
    }
  }, []);
  useEffect(() => void load(), [load]);
  return (
    <section className="card flex flex-col gap-3 p-5">
      <h2 className="font-display text-2xl">Invite another teacher</h2>
      <p className="text-sm font-bold text-ink-soft">Each invite works once and expires in 7 days. Share it only with the teacher it&apos;s for. They create their account at <span className="font-mono">/teacher/signup</span>.</p>
      <Button tone="white" onClick={async () => { try { setFresh(await api("POST", "/teacher/invites")); await load(); } catch (e) { setErr(errorText(e)); } }}>CREATE INVITE CODE</Button>
      {fresh && (
        <div className="rounded-2xl bg-gold-soft px-3 py-2">
          <div className="font-mono text-lg font-black tracking-wider">{fresh.code}</div>
          <div className="text-xs font-bold text-ink-soft">Shown once. Expires {new Date(fresh.expiresAt).toLocaleDateString()}.</div>
          <button type="button" className="mt-1 text-xs font-black text-ocean-deep" onClick={() => void navigator.clipboard?.writeText(fresh.code)}>Copy</button>
        </div>
      )}
      {err && <p role="alert" className="text-sm font-black text-danger-deep">{err}</p>}
      {!!list?.length && (
        <ul className="flex flex-col gap-1 text-sm font-bold text-ink-soft">
          {list.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>…{i.hint} · {i.usedAt ? `used by ${i.usedBy}` : i.revoked ? "revoked" : i.expiresAt < Date.now() ? "expired" : `unused, expires ${new Date(i.expiresAt).toLocaleDateString()}`}</span>
              {!i.usedAt && !i.revoked && i.expiresAt > Date.now() && (
                <button type="button" className="text-xs font-black text-danger-deep" onClick={async () => { await api("DELETE", `/teacher/invites/${i.id}`); await load(); }}>Revoke</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ImportCard() {
  const [warriors, setWarriors] = useState<Account[]>([]);
  const [pick, setPick] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    void listWarriors().then(setWarriors);
    setDone(importedIds());
  }, []);
  const choices = warriors.filter((w) => !done.includes(w.id));
  return (
    <section className="card flex flex-col gap-3 p-5">
      <h2 className="font-display text-2xl">Bring in a warrior from this device</h2>
      <p className="text-sm font-bold text-ink-soft">Adds that warrior&apos;s stars, XP, coins and items to your class account. Its old battles stay private: only new work is shared with your class.</p>
      {choices.length === 0 ? (
        <p className="text-sm font-bold text-ink-mute">{warriors.length ? "Every warrior on this device has already been brought in." : "No other warriors are saved on this device."}</p>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setMsg(null);
            if (!(await verifyLocal(pick, pass))) return setMsg({ ok: false, text: "That password doesn't match that warrior." });
            try {
              const r = await importLegacy(pick);
              setMsg({ ok: true, text: r.already ? "Already brought in." : "Progress added to your class account." });
              setDone(importedIds());
              setPass("");
            } catch (err) {
              setMsg({ ok: false, text: errorText(err) });
            }
          }}
        >
          <label className="field-label" htmlFor="imp-w">
            Warrior
            <select id="imp-w" className="field" value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Choose…</option>
              {choices.map((w) => <option key={w.id} value={w.id}>{w.username}</option>)}
            </select>
          </label>
          <label className="field-label" htmlFor="imp-p">
            That warrior&apos;s password
            <input id="imp-p" className="field" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
          </label>
          <p className="text-xs font-bold text-ink-mute">The password is checked on this device only and is never sent anywhere.</p>
          <Button type="submit" tone="white" disabled={!pick || !pass}>BRING IN PROGRESS</Button>
        </form>
      )}
      {msg && <p role="status" className="rounded-2xl px-3 py-2 text-sm font-black" style={{ color: msg.ok ? "#1E7A3E" : "#B42318", background: msg.ok ? "#E3F9EA" : "#FFE8EA" }}>{msg.text}</p>}
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const cloud = useCloud();
  return (
    <div className="min-h-dvh bg-sky">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pb-12 pt-5 sm:px-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" aria-label="CodeWarrior home"><Logo size={28} /></Link>
          <nav className="flex gap-2 text-sm font-black">
            {cloud?.me.role === "teacher" && !cloud.me.mustChangePassword && <Link href="/teacher/" className="rounded-xl bg-white px-3 py-1.5 text-ink-soft">Dashboard</Link>}
            {cloud?.me.role === "student" && <Link href="/classroom/" className="rounded-xl bg-white px-3 py-1.5 text-ink-soft">Class</Link>}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
