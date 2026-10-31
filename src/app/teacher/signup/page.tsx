"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Logo } from "@/components/ui";
import { api, errorText, setCloud } from "@/lib/cloud/client";
import { MIN_PASSWORD, USERNAME_RE, type Me } from "@/lib/cloud/protocol";

// Teacher accounts need a single-use invite from an existing teacher. Without a valid invite
// the server makes a student account, whatever this form sends.
export default function TeacherSignup() {
  const router = useRouter();
  const [invite, setInvite] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite.trim()) return setError("Enter the invite code another teacher gave you.");
    if (!USERNAME_RE.test(username)) return setError("Usernames are 3 to 20 letters, numbers or underscores.");
    if (pass.length < MIN_PASSWORD) return setError(`Passwords need at least ${MIN_PASSWORD} characters.`);
    if (pass !== confirm) return setError("Those passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ token: string; me: Me }>("POST", "/auth/register", { username, password: pass, displayName: name.trim() || undefined, invite }, { token: null });
      setCloud(r);
      router.push(r.me.role === "teacher" ? "/teacher/" : "/classroom/");
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <div className="min-h-dvh bg-sky">
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-12 pt-5">
        <Link href="/" aria-label="CodeWarrior home"><Logo size={28} /></Link>
        <form onSubmit={submit} className="card flex flex-col gap-4 p-6">
          <h1 className="font-display text-3xl">Create a teacher account</h1>
          <p className="font-bold text-ink-soft">You need an invite code from a teacher who already uses CodeWarrior. Students should <Link href="/create/" className="font-black text-ocean-deep">create a class account</Link> instead.</p>
          <label className="field-label" htmlFor="t-inv">
            Invite code
            <input id="t-inv" className="field font-mono uppercase tracking-wider" value={invite} onChange={(e) => setInvite(e.target.value.toUpperCase())} placeholder="ABCD-EFGH-JKMN" autoComplete="off" />
          </label>
          <label className="field-label" htmlFor="t-user">
            Username
            <input id="t-user" className="field" autoComplete="username" maxLength={20} value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label className="field-label" htmlFor="t-name">
            Name students see
            <input id="t-name" className="field" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ms. Rivera" />
          </label>
          <label className="field-label" htmlFor="t-pass">
            Password
            <input id="t-pass" className="field" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
          </label>
          <label className="field-label" htmlFor="t-confirm">
            Password again
            <input id="t-confirm" className="field" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          {error && <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 font-extrabold text-danger-deep">{error}</p>}
          <Button type="submit" tone="ocean" disabled={busy}>{busy ? "CREATING…" : "CREATE TEACHER ACCOUNT"}</Button>
          <p className="text-sm font-bold text-ink-mute">Already have one? <Link href="/login/" className="font-black text-ocean-deep">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
