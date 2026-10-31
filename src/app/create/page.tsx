"use client";

import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Warrior from "@/components/Warrior";
import { Button, Logo, Pedestal, Sky, Swatch } from "@/components/ui";
import { createAccount, validateSignup } from "@/lib/auth";
import { api, classroomEnabled, setCloud } from "@/lib/cloud/client";
import { enterGame } from "@/lib/cloud/progressSync";
import { MIN_PASSWORD, USERNAME_RE, type Me } from "@/lib/cloud/protocol";
import { BODIES, ENERGIES, TITLES } from "@/lib/game";

export default function CreatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [mode, setMode] = useState<"class" | "device">(() => (classroomEnabled() ? "class" : "device"));
  const [display, setDisplay] = useState("");
  const [confirm, setConfirm] = useState("");
  const [body, setBody] = useState(BODIES[0].value);
  const armor = "#D6DEEB"; // armor color retired: energy paints the accents
  const [energy, setEnergy] = useState(ENERGIES[0].color);
  const [title, setTitle] = useState(TITLES[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forged, setForged] = useState(false);
  const formShake = useAnimationControls();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem =
      mode === "class"
        ? !USERNAME_RE.test(name.trim())
          ? "Usernames are 3 to 20 letters, numbers or underscores."
          : pass.length < MIN_PASSWORD
            ? `Passwords need at least ${MIN_PASSWORD} characters.`
            : pass !== confirm
              ? "Those passwords don't match."
              : null
        : validateSignup(name.trim(), pass, confirm);
    if (problem) {
      setError(problem);
      formShake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.4 } });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "class") {
        const r = await api<{ token: string; me: Me }>("POST", "/auth/register", { username: name.trim(), password: pass, displayName: display.trim() || undefined }, { token: null });
        setCloud(r);
        await enterGame(r.me, { body, armor, energy, title });
        setForged(true);
        setTimeout(() => router.push("/classroom/"), 1100);
        return;
      }
      await createAccount(name.trim(), pass, { body, armor, energy, title });
      setForged(true);
      setTimeout(() => router.push("/map/"), 1100);
    } catch (err) {
      setError((err as Error).message);
      formShake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.4 } });
      setBusy(false);
    }
  }

  const avatarKey = body + armor + energy;

  return (
    <Sky clouds={false}>
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
        <Link href="/" aria-label="CodeWarrior home"><Logo /></Link>
        <span className="font-bold">
          Already a warrior? <Link href="/login/" className="font-black text-ocean-deep underline-offset-4 hover:underline">Log in</Link>
        </span>
      </header>

      <main className="mx-auto flex max-w-6xl flex-wrap items-stretch gap-8 px-6 pb-16 pt-2">
        <motion.form
          onSubmit={submit}
          animate={formShake}
          noValidate
          className="card flex min-w-0 flex-[1_1_360px] flex-col gap-5 p-8"
        >
          <div>
            <h1 className="font-display text-[44px] leading-none">Create your warrior</h1>
            <p className="mt-2 text-[17px] font-bold text-ink-soft">No email or Google account. Just a name and a password.</p>
          </div>
          {classroomEnabled() && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[13px] font-black uppercase tracking-wider text-ink-soft">Where should your warrior live?</legend>
              {([
                ["class", "Class account", "Saves online so you can join your teacher's class and play on any device."],
                ["device", "Only this device", "Nothing leaves this browser. You can't join a class with it."],
              ] as const).map(([v, label, text]) => (
                <label key={v} className="flex cursor-pointer items-start gap-3 rounded-2xl border-[3px] px-4 py-3" style={{ borderColor: mode === v ? "#2D9CDB" : "#D5E4F5", background: mode === v ? "#E2F3FF" : "#FFFFFF" }}>
                  <input type="radio" name="cw-mode" value={v} checked={mode === v} onChange={() => { setMode(v); setError(null); }} className="mt-1.5 h-4 w-4 accent-[#2D9CDB]" />
                  <span>
                    <span className="block font-black text-ink">{label}</span>
                    <span className="text-sm font-bold text-ink-soft">{text}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <label className="field-label" htmlFor="cw-name">
            {mode === "class" ? "Username" : "Warrior name"}
            <input id="cw-name" className="field" autoComplete="username" maxLength={mode === "class" ? 20 : 16} value={name} onChange={(e) => { setName(e.target.value); setError(null); }} placeholder="ByteKnight" />
          </label>
          {mode === "class" && (
            <label className="field-label" htmlFor="cw-display">
              Name your teacher sees <span className="font-bold normal-case text-ink-mute">(optional)</span>
              <input id="cw-display" className="field" maxLength={40} value={display} onChange={(e) => setDisplay(e.target.value)} placeholder="First name and last initial" />
            </label>
          )}
          <label className="field-label" htmlFor="cw-pass">
            Secret password
            <input id="cw-pass" className="field" type="password" autoComplete="new-password" value={pass} onChange={(e) => { setPass(e.target.value); setError(null); }} />
          </label>
          <label className="field-label" htmlFor="cw-confirm">
            Type it again
            <input id="cw-confirm" className="field" type="password" autoComplete="new-password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(null); }} />
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

          <div className="flex items-start gap-3 rounded-2xl bg-gold-soft px-4 py-3 text-[15px] font-bold text-[#5C4A12]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B07D00" strokeWidth="2.4" strokeLinecap="round" aria-hidden className="mt-0.5 flex-none">
              <rect x="4" y="10" width="16" height="11" rx="3" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <span>
              {mode === "class"
                ? "Your progress saves to your class account. After you join a class, your battles and answers are shared with that teacher. Don't use a password you use anywhere else."
                : "Your warrior and progress save only on this device."}
            </span>
          </div>

          <Button type="submit" size="lg" disabled={busy} className="mt-auto w-full">
            {busy ? "FORGING..." : "FORGE MY WARRIOR"}
          </Button>
        </motion.form>

        <section className="card flex min-w-0 flex-[1.25_1_460px] flex-col gap-5 p-7">
          <Pedestal>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={avatarKey}
                initial={{ scale: 0.85, opacity: 0.4, rotate: -4 }}
                animate={{ scale: forged ? 1.15 : 1, opacity: 1, rotate: 0, y: forged ? -30 : 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 18 }}
              >
                <Warrior body={body} armor={armor} energy={energy} size={200} />
              </motion.div>
            </AnimatePresence>
            <AnimatePresence>
              {forged && (
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute inset-x-0 top-1/3 text-center font-display text-4xl text-gold drop-shadow-[0_4px_0_rgba(0,0,0,.35)]"
                >
                  WARRIOR FORGED!
                </motion.div>
              )}
            </AnimatePresence>
          </Pedestal>
          <div className="-mt-1 flex items-baseline justify-between gap-3">
            <span className="truncate font-display text-[26px] leading-tight">{name.trim() || "Your warrior"}</span>
            <span className="flex-none text-sm font-extrabold text-ink-mute">{title} · Level 1</span>
          </div>

          <Picker label="Warrior">
            {BODIES.map((o) => {
              const on = o.value === body;
              return (
                <motion.button
                  key={o.value}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${o.name}: ${o.blurb}`}
                  onClick={() => setBody(o.value)}
                  whileTap={{ scale: 0.95 }}
                  className="flex w-[104px] flex-col items-center gap-1 rounded-2xl border-[3px] px-2 pb-2 pt-1 text-sm font-black transition-colors"
                  style={{ background: on ? "#E8F5FF" : "#FFFFFF", borderColor: on ? "#2D9CDB" : "#D5E4F5", boxShadow: `0 4px 0 ${on ? "#1F7DB5" : "#D5E4F5"}` }}
                >
                  <Warrior body={o.value} armor={armor} energy={energy} size={62} idle={false} />
                  {o.name}
                </motion.button>
              );
            })}
          </Picker>
          <Picker label="Energy color">
            {ENERGIES.map((a) => (
              <Swatch key={a.color} color={a.color} label={`${a.name} energy`} selected={energy === a.color} onClick={() => setEnergy(a.color)} />
            ))}
          </Picker>
          <p className="-mt-3 text-[13px] font-bold text-ink-mute">Your energy color paints your armor accents, headwear and weapon. More colors, plus Rainbow and Solid Gold, are in the shop.</p>
          <Picker label="Title">
            {TITLES.map((t) => {
              const on = t === title;
              return (
                <motion.button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTitle(t)}
                  whileTap={{ y: 3 }}
                  className="rounded-2xl border-[3px] px-4 py-2.5 text-base font-black transition-colors"
                  style={{ color: on ? "#FFFFFF" : "#1F2440", background: on ? "#2D9CDB" : "#FFFFFF", borderColor: on ? "#1F7DB5" : "#D5E4F5", boxShadow: `0 4px 0 ${on ? "#1F7DB5" : "#D5E4F5"}` }}
                >
                  {t}
                </motion.button>
              );
            })}
          </Picker>
        </section>
      </main>
    </Sky>
  );
}

function Picker({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[13px] font-black uppercase tracking-wider text-ink-soft">{label}</div>
      <div className="flex flex-wrap gap-3">{children}</div>
    </div>
  );
}
