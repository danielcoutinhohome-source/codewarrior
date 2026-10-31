"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRef, useState } from "react";
import ItemArt from "@/components/ItemArt";
import TopBar from "@/components/TopBar";
import Warrior from "@/components/Warrior";
import { StarIcon } from "@/components/icons";
import { Button, Pedestal } from "@/components/ui";
import { BOSS, SHOP, WORLDS, key, levelFor, type ItemKind } from "@/lib/game";
import { deleteWarrior, equip, ownsItem, exportBackup, isEquipped, makeReport, totalStars } from "@/lib/progress";
import { play } from "@/lib/sfx";
import { useWarrior } from "@/lib/useWarrior";

const SLOTS: { kind: ItemKind; label: string }[] = [
  { kind: "body", label: "Body" },
  { kind: "armor", label: "Armor" },
  { kind: "energy", label: "Energy" },
  { kind: "weapon", label: "Weapon" },
  { kind: "headwear", label: "Headwear" },
  { kind: "finish", label: "Finish" },
  { kind: "aura", label: "Aura" },
  { kind: "title", label: "Title" },
];

export default function ProfilePage() {
  const { account, progress, refresh, signOut } = useWarrior();
  const [slot, setSlot] = useState<ItemKind>("armor");
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteName, setDeleteName] = useState("");
  const codeRef = useRef<HTMLTextAreaElement>(null);

  if (!account || !progress) return <div className="min-h-dvh bg-sky" />;
  const a = account.avatar;
  const st = progress.stats;
  const accuracy = st.questions ? Math.round((st.firstTry / st.questions) * 100) : 0;
  const owned = SHOP.filter((s) => s.kind === slot && ownsItem(progress, s.id));
  const skills = Object.entries(progress.skills)
    .map(([k, [r, m]]) => ({ k, r, m, rate: r / Math.max(1, r + m) }))
    .filter((s) => s.r + s.m >= 2);
  const weak = [...skills].sort((x, y) => x.rate - y.rate).slice(0, 4).filter((s) => s.rate < 0.8);
  const strong = [...skills].sort((x, y) => y.rate - x.rate).slice(0, 4).filter((s) => s.rate >= 0.8);

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      play("coin");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      codeRef.current?.select();
    }
  };

  const download = async () => {
    const text = await exportBackup(account.id);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `codewarrior-${account.username}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="min-h-dvh bg-sky">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-12 pt-4 sm:px-5">
        <TopBar account={account} progress={progress} />
        <div>
          <div className="text-[13px] font-black uppercase tracking-[0.15em] text-ocean-deep">Your warrior</div>
          <h1 className="font-display text-[clamp(34px,5vw,48px)] leading-none">Armory</h1>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
          <section className="card flex flex-col gap-4 p-5">
            <Pedestal>
              <AnimatePresence mode="popLayout">
                <motion.div key={JSON.stringify(a)} initial={{ scale: 0.85, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 380, damping: 18 }}>
                  <Warrior weapon={a.weapon} headwear={a.headwear} body={a.body} armor={a.armor} energy={a.energy} finish={a.finish} aura={a.aura} size={180} />
                </motion.div>
              </AnimatePresence>
            </Pedestal>
            <div className="text-center">
              <div className="font-display text-3xl">{account.username}</div>
              <div className="font-extrabold text-ink-mute">{a.title} · Level {levelFor(progress.xp)}</div>
            </div>
            <div className="flex gap-1 overflow-x-auto rounded-2xl bg-sky p-1" role="tablist">
              {SLOTS.map((s) => (
                <button key={s.kind} role="tab" aria-selected={slot === s.kind} onClick={() => setSlot(s.kind)} className="relative flex-1 rounded-xl px-2.5 py-1.5 text-sm font-black" style={{ color: slot === s.kind ? "#FFFFFF" : "#4A5175" }}>
                  {slot === s.kind && <motion.span layoutId="slot-tab" className="absolute inset-0 rounded-xl bg-ocean" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                  <span className="relative">{s.label}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {owned.map((it) => {
                const on = isEquipped(account, it.id);
                return (
                  <motion.button
                    key={it.id}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => { await equip(account.id, it.id); play("click"); await refresh(); }}
                    aria-pressed={on}
                    className="flex flex-col items-center gap-1 rounded-2xl border-[3px] bg-white p-2 text-xs font-black"
                    style={{ borderColor: on ? "#3EC46D" : "#D5E4F5", background: on ? "#E3F9EA" : "#FFFFFF" }}
                  >
                    <span className="grid h-14 place-items-center"><ItemArt it={it} avatar={a} size={70} /></span>
                    <span className="leading-tight">{it.name}</span>
                  </motion.button>
                );
              })}
            </div>
            <Link href="/shop/" className="text-center text-sm font-black text-ocean-deep hover:underline">Get more in the shop</Link>
          </section>

          <section className="flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Battles won" value={st.wins} />
              <Stat label="Bosses beaten" value={st.bosses} />
              <Stat label="Stars" value={totalStars(progress.stars)} />
              <Stat label="First-try accuracy" value={`${accuracy}%`} />
              <Stat label="Total XP" value={progress.xp} />
              <Stat label="Day streak" value={progress.streak} />
            </div>

            <div className="card p-5">
              <h2 className="font-display text-2xl">World progress</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {WORLDS.map((w, i) => {
                  const s = [0, 1, 2, 3, 4].reduce((acc, b) => acc + (progress.stars[key(i, b)] || 0), 0);
                  const cleared = !!progress.stars[key(i, BOSS)];
                  return (
                    <li key={w.name} className="flex items-center gap-3">
                      <span className="w-40 flex-none truncate font-black">{w.name}</span>
                      <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-sky">
                        <motion.div className="h-full rounded-full" style={{ background: cleared ? "#3EC46D" : "#FFC83D" }} initial={{ width: 0 }} animate={{ width: `${(s / 15) * 100}%` }} transition={{ type: "spring", stiffness: 80, damping: 18, delay: i * 0.05 }} />
                      </div>
                      <span className="inline-flex w-16 flex-none items-center justify-end gap-1 text-sm font-black tabular-nums"><StarIcon size={15} /> {s}/15</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card p-5">
                <h2 className="font-display text-xl">Practice next</h2>
                {weak.length ? (
                  <ul className="mt-2 flex flex-col gap-1.5 font-bold">
                    {weak.map((s) => <li key={s.k} className="flex justify-between gap-2"><span>{s.k}</span><span className="text-danger-deep">{Math.round(s.rate * 100)}%</span></li>)}
                  </ul>
                ) : (
                  <p className="mt-2 font-bold text-ink-mute">No weak spots yet. Fight a few more battles to see what to practice.</p>
                )}
              </div>
              <div className="card p-5">
                <h2 className="font-display text-xl">Strongest skills</h2>
                {strong.length ? (
                  <ul className="mt-2 flex flex-col gap-1.5 font-bold">
                    {strong.map((s) => <li key={s.k} className="flex justify-between gap-2"><span>{s.k}</span><span className="text-[#2BA155]">{Math.round(s.rate * 100)}%</span></li>)}
                  </ul>
                ) : (
                  <p className="mt-2 font-bold text-ink-mute">Answer questions right on the first try to build these up.</p>
                )}
              </div>
            </div>

            <div className="card flex flex-col gap-3 p-5">
              <h2 className="font-display text-2xl">Send progress to your teacher</h2>
              <p className="font-bold text-ink-soft">This makes a code with your stars, accuracy and skills. Paste it where your teacher asks, and they add it on the CodeWarrior teacher page.</p>
              {code ? (
                <>
                  <textarea ref={codeRef} readOnly value={code} rows={3} onFocus={(e) => e.target.select()} className="w-full rounded-2xl border-[3px] border-line bg-[#F5FAFF] p-3 font-mono text-xs text-ink" aria-label="Your progress code" />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" tone="ocean" onClick={copy}>{copied ? "COPIED!" : "COPY CODE"}</Button>
                    <Button size="sm" tone="white" onClick={() => setCode(makeReport(account, progress))}>REFRESH</Button>
                  </div>
                </>
              ) : (
                <div><Button tone="ocean" onClick={() => setCode(makeReport(account, progress))}>MAKE MY CODE</Button></div>
              )}
              <p className="text-sm font-bold text-ink-mute">Teachers: open the <Link href="/teacher/" className="text-ocean-deep hover:underline">teacher dashboard</Link>.</p>
            </div>

            <div className="card flex flex-col gap-3 p-5">
              <h2 className="font-display text-2xl">Saves and account</h2>
              <p className="font-bold text-ink-soft">Your warrior lives in this browser. Download a backup to keep it safe or move it to another computer, then restore it from the log in page.</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" tone="white" onClick={download}>DOWNLOAD BACKUP</Button>
                <Button size="sm" tone="white" onClick={signOut}>LOG OUT</Button>
                <Button size="sm" tone="danger" onClick={() => setConfirmDelete(true)}>DELETE WARRIOR</Button>
              </div>
              <AnimatePresence>
                {confirmDelete && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="rounded-2xl bg-danger-soft p-4">
                      <p className="font-black text-danger-deep">This permanently deletes {account.username} and all progress from this browser. Type the warrior name to confirm.</p>
                      <input value={deleteName} onChange={(e) => setDeleteName(e.target.value)} aria-label="Type the warrior name to confirm" className="field mt-2 max-w-xs" />
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" tone="white" onClick={() => { setConfirmDelete(false); setDeleteName(""); }}>CANCEL</Button>
                        <Button size="sm" tone="danger" disabled={deleteName !== account.username} onClick={async () => { await deleteWarrior(account.id); signOut(); }}>DELETE FOREVER</Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-[11px] font-black uppercase tracking-wider text-ink-mute">{label}</div>
      <div className="font-display text-3xl tabular-nums">{value}</div>
    </div>
  );
}
