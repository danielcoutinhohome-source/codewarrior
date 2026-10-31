"use client";

import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Warrior from "@/components/Warrior";
import { Button, Logo, Sky } from "@/components/ui";
import { listWarriors, logIn } from "@/lib/auth";
import type { Account } from "@/lib/db";
import { importBackup } from "@/lib/progress";
import { api, classroomEnabled, setCloud } from "@/lib/cloud/client";
import { enterGame } from "@/lib/cloud/progressSync";
import type { Me } from "@/lib/cloud/protocol";

export default function LoginPage() {
  const router = useRouter();
  const [warriors, setWarriors] = useState<Account[] | null>(null);
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"student" | "teacher" | "device">("device");
  useEffect(() => {
    if (classroomEnabled()) setMode(new URLSearchParams(window.location.search).get("as") === "teacher" ? "teacher" : "student");
  }, []);
  const shake = useAnimationControls();

  useEffect(() => {
    listWarriors().then((list) => {
      setWarriors(list);
      if (list.length === 1) setName(list[0].username);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode !== "device") {
        const r = await api<{ token: string; me: Me }>("POST", "/auth/login", { username: name.trim(), password: pass }, { token: null });
        // Teachers sign in on the Teacher tab, students on the Student tab.
        if ((mode === "teacher") !== (r.me.role === "teacher")) {
          await api("POST", "/auth/logout", undefined, { token: r.token }).catch(() => {});
          throw new Error(r.me.role === "teacher" ? "That's a teacher account. Use the Teacher tab." : "That's a student account. Use the Student tab.");
        }
        setCloud(r);
        if (r.me.mustChangePassword) return router.push("/account/?change=1");
        if (r.me.role === "teacher") return router.push("/teacher/");
        await enterGame(r.me);
        return router.push("/map/");
      }
      await logIn(name, pass);
      router.push("/map/");
    } catch (err) {
      setError((err as Error).message);
      shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.4 } });
      setBusy(false);
    }
  }

  return (
    <Sky clouds={false}>
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-5">
        <Link href="/" aria-label="CodeWarrior home"><Logo /></Link>
        <span className="font-bold">
          New here? <Link href="/create/" className="font-black text-ocean-deep underline-offset-4 hover:underline">Create a warrior</Link>
        </span>
      </header>

      <main className="mx-auto flex max-w-5xl flex-wrap items-start gap-8 px-6 pb-48 pt-2">
        <motion.form onSubmit={submit} animate={shake} className="card flex min-w-0 flex-[1_1_360px] flex-col gap-5 p-8">
          <h1 className="font-display text-[44px] leading-none">Welcome back</h1>
          {classroomEnabled() && (
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-sky p-1" role="tablist" aria-label="Account type">
              {([["student", "Student"], ["teacher", "Teacher"], ["device", "This device"]] as const).map(([v, label]) => (
                <button key={v} type="button" role="tab" aria-selected={mode === v} onClick={() => { setMode(v); setError(null); }} className="rounded-xl py-2 text-sm font-black" style={{ background: mode === v ? "#FFFFFF" : "transparent", color: mode === v ? "#1F2440" : "#4A5175", boxShadow: mode === v ? "0 2px 0 #D5E4F5" : undefined }}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {mode === "student" && <p className="-mt-2 text-sm font-bold text-ink-soft">Sign in to your class account, on any device.</p>}
          {mode === "teacher" && <p className="-mt-2 text-sm font-bold text-ink-soft">Teacher accounts are set up by CodeWarrior. There&apos;s no sign-up for teachers.</p>}
          {mode === "device" && classroomEnabled() && <p className="-mt-2 text-sm font-bold text-ink-soft">Warriors saved only in this browser.</p>}
          <label className="field-label" htmlFor="li-name">
            {mode === "device" ? "Warrior name" : "Username"}
            <input id="li-name" className="field" autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field-label" htmlFor="li-pass">
            Secret password
            <input id="li-pass" className="field" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
          </label>
          <AnimatePresence>
            {error && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-2xl bg-danger-soft px-4 py-3 font-extrabold text-danger-deep"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
          <Button type="submit" size="lg" disabled={busy || !name || !pass} className="w-full">
            {busy ? "ENTERING..." : "ENTER THE BATTLE"}
          </Button>
        </motion.form>

        <section className="card min-w-0 flex-[1_1_320px] p-7" hidden={mode !== "device"}>
          <h2 className="font-display text-2xl">Warriors on this device</h2>
          {warriors === null ? null : warriors.length === 0 ? (
            <p className="mt-3 font-bold text-ink-soft">
              No warriors saved here yet. <Link href="/create/" className="font-black text-ocean-deep">Create one</Link> to start.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {warriors.map((w, i) => {
                const on = w.username.toLowerCase() === name.trim().toLowerCase();
                return (
                  <motion.li key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <motion.button
                      type="button"
                      onClick={() => setName(w.username)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ y: 2 }}
                      className="flex w-full items-center gap-4 rounded-2xl border-[3px] bg-white px-4 py-3 text-left transition-colors"
                      style={{ borderColor: on ? "#2D9CDB" : "#D5E4F5", background: on ? "#E2F3FF" : "#FFFFFF" }}
                    >
                      <span className="grid h-14 w-14 flex-none place-items-center overflow-hidden rounded-full border-[3px] border-gold bg-sky-night">
                        <Warrior weapon={w.avatar.weapon} headwear={w.avatar.headwear} body={w.avatar.body} armor={w.avatar.armor} energy={w.avatar.energy} size={52} idle={false} className="mt-3" />
                      </span>
                      <span>
                        <span className="block font-display text-xl leading-tight">{w.username}</span>
                        <span className="text-sm font-extrabold text-ink-mute">{w.avatar.title}</span>
                      </span>
                    </motion.button>
                  </motion.li>
                );
              })}
            </ul>
          )}
          <div className="mt-5 border-t-2 border-line pt-4">
            <label className="text-sm font-black text-ink-soft" htmlFor="restore">Have a backup file?</label>
            <input
              id="restore"
              type="file"
              accept="application/json,.json"
              className="mt-2 block w-full text-sm font-bold text-ink-soft file:mr-3 file:rounded-xl file:border-0 file:bg-ocean-soft file:px-3 file:py-2 file:font-black file:text-ocean-deep"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const acc = await importBackup(await f.text());
                  setWarriors(await listWarriors());
                  setName(acc.username);
                  setError(null);
                } catch (err) {
                  setError((err as Error).message);
                }
              }}
            />
          </div>
        </section>
      </main>
    </Sky>
  );
}
