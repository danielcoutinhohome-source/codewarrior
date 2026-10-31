"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { StarIcon } from "@/components/icons";
import { Button, Logo } from "@/components/ui";
import { BOSS, WORLDS, key, levelFor } from "@/lib/game";
import { readReport, totalStars, type Report } from "@/lib/progress";

const STORE = "cw.teacher.v1";
type Saved = { className: string; students: Report[] };

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || "");
    if (s && Array.isArray(s.students)) return s;
  } catch {}
  return { className: "My class", students: [] };
}

const ago = (t: number) => {
  const d = Math.floor((Date.now() - t) / 86_400_000);
  return d <= 0 ? "Today" : d === 1 ? "1 day ago" : `${d} days ago`;
};

// A teacher dashboard that works with no server: students paste in progress codes.
export default function TeacherPage() {
  const [data, setData] = useState<Saved | null>(null);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState<{ text: string; good: boolean } | null>(null);
  const [sort, setSort] = useState<"name" | "stars" | "accuracy" | "updated">("stars");
  const [open, setOpen] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => setData(load()), []);
  const save = (d: Saved) => {
    setData(d);
    try {
      localStorage.setItem(STORE, JSON.stringify(d));
    } catch {}
  };

  const add = () => {
    if (!data) return;
    const codes = paste.split(/\s+/).filter((c) => c.startsWith("CW1."));
    if (!codes.length) {
      setMsg({ text: "Paste one or more codes that start with CW1.", good: false });
      return;
    }
    let added = 0, updated = 0, bad = 0;
    const students = [...data.students];
    for (const c of codes) {
      try {
        const r = readReport(c);
        const i = students.findIndex((s) => s.u.toLowerCase() === r.u.toLowerCase());
        if (i >= 0) {
          if (r.d >= students[i].d) students[i] = r;
          updated++;
        } else {
          students.push(r);
          added++;
        }
      } catch {
        bad++;
      }
    }
    save({ ...data, students });
    setPaste("");
    setMsg({ text: `${added} added, ${updated} updated${bad ? `, ${bad} couldn't be read` : ""}.`, good: bad === 0 });
  };

  const rows = useMemo(() => {
    if (!data) return [];
    const r = data.students.map((s) => ({
      s,
      stars: totalStars(s.s),
      acc: s.q ? Math.round((s.f / s.q) * 100) : 0,
      cleared: WORLDS.filter((_, i) => s.s[key(i, BOSS)]).length,
      won: Object.keys(s.s).length,
    }));
    const by = { name: (a: (typeof r)[0], b: (typeof r)[0]) => a.s.u.localeCompare(b.s.u), stars: (a: (typeof r)[0], b: (typeof r)[0]) => b.stars - a.stars, accuracy: (a: (typeof r)[0], b: (typeof r)[0]) => b.acc - a.acc, updated: (a: (typeof r)[0], b: (typeof r)[0]) => b.s.d - a.s.d };
    return r.sort(by[sort]);
  }, [data, sort]);

  const classSkills = useMemo(() => {
    const agg: Record<string, [number, number]> = {};
    data?.students.forEach((s) =>
      Object.entries(s.k || {}).forEach(([k, [r, m]]) => {
        const a = agg[k] || [0, 0];
        agg[k] = [a[0] + r, a[1] + m];
      }),
    );
    return Object.entries(agg)
      .map(([k, [r, m]]) => ({ k, miss: m / Math.max(1, r + m), n: r + m }))
      .filter((x) => x.n >= 2 && x.miss > 0)
      .sort((a, b) => b.miss - a.miss)
      .slice(0, 6);
  }, [data]);

  if (!data) return <div className="min-h-dvh bg-sky" />;

  const csv = () => {
    const head = ["Student", "Title", "Level", "Worlds cleared", "Battles won", "Stars", "First-try accuracy %", "Updated"];
    const lines = rows.map((r) => [r.s.u, r.s.t, levelFor(r.s.x), r.cleared, r.won, r.stars, r.acc, new Date(r.s.d).toLocaleDateString()].map((v) => (/[",]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(","));
    return [head.join(","), ...lines].join("\n");
  };

  return (
    <div className="min-h-dvh bg-sky">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-12 pt-5 sm:px-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" aria-label="CodeWarrior home"><Logo size={28} /></Link>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-ocean-deep">Teacher dashboard</span>
        </header>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <label htmlFor="class-name" className="text-[13px] font-black uppercase tracking-[0.15em] text-ocean-deep">Class</label>
            <input id="class-name" value={data.className} onChange={(e) => save({ ...data, className: e.target.value })} className="block w-full max-w-md rounded-xl bg-transparent font-display text-[clamp(30px,5vw,44px)] leading-none text-ink outline-none focus:bg-white" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" tone="white" onClick={async () => { try { await navigator.clipboard.writeText(csv()); setMsg({ text: "Class table copied as CSV.", good: true }); } catch { setMsg({ text: "Copy was blocked by the browser.", good: false }); } }} disabled={!rows.length}>COPY CSV</Button>
          </div>
        </div>

        <section className="card grid gap-4 p-5 md:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="font-display text-2xl">Add students</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 font-bold text-ink-soft">
              <li>Students open <b>Armory → Send progress to your teacher</b> and copy their code.</li>
              <li>They paste it into your form, chat or LMS assignment.</li>
              <li>Paste one or many codes here. Newer codes replace older ones.</li>
            </ol>
            <p className="mt-2 text-sm font-bold text-ink-mute">Everything stays in this browser. Nothing is uploaded.</p>
          </div>
          <div className="flex flex-col gap-2">
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} placeholder="CW1.eyJ1Ijoi..." aria-label="Paste progress codes" className="w-full rounded-2xl border-[3px] border-line bg-[#F5FAFF] p-3 font-mono text-xs text-ink outline-none focus:border-ocean" />
            <div className="flex items-center gap-3">
              <Button tone="ocean" onClick={add} disabled={!paste.trim()}>ADD CODES</Button>
              <AnimatePresence>{msg && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status" className="font-black" style={{ color: msg.good ? "#2BA155" : "#D9434A" }}>{msg.text}</motion.span>}</AnimatePresence>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="Students" value={rows.length} />
          <Tile label="Avg stars" value={rows.length ? (rows.reduce((a, r) => a + r.stars, 0) / rows.length).toFixed(1) : "–"} />
          <Tile label="Avg accuracy" value={rows.length ? `${Math.round(rows.reduce((a, r) => a + r.acc, 0) / rows.length)}%` : "–"} />
          <Tile label="Not updated in 7+ days" value={rows.filter((r) => Date.now() - r.s.d > 7 * 86_400_000).length} warn />
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="card min-w-0 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-2xl">Class progress</h2>
              <label className="flex items-center gap-2 text-sm font-black text-ink-soft">
                Sort by
                <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-xl border-2 border-line bg-white px-2 py-1 text-ink">
                  <option value="stars">Stars</option>
                  <option value="accuracy">Accuracy</option>
                  <option value="name">Name</option>
                  <option value="updated">Last updated</option>
                </select>
              </label>
            </div>
            {rows.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-sky p-6 text-center font-bold text-ink-mute">No students yet. Paste progress codes above to fill this table.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-black uppercase tracking-wider text-ink-mute">
                      <th className="py-2 pr-2">Student</th>
                      {WORLDS.map((w, i) => <th key={w.name} className="px-1 py-2 text-center" title={w.name}>W{i + 1}</th>)}
                      <th className="px-2 py-2 text-right">Stars</th>
                      <th className="px-2 py-2 text-right">Accuracy</th>
                      <th className="px-2 py-2 text-right">Updated</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <Fragment key={r.s.u}>
                        <tr className="cursor-pointer border-t-2 border-line hover:bg-sky/60" onClick={() => setOpen(open === r.s.u ? null : r.s.u)}>
                          <td className="py-2 pr-2">
                            <div className="font-black">{r.s.u}</div>
                            <div className="text-xs font-bold text-ink-mute">{r.s.t} · Lv {levelFor(r.s.x)}</div>
                          </td>
                          {WORLDS.map((_, i) => {
                            const s = [0, 1, 2, 3, 4].reduce((a, b) => a + (r.s.s[key(i, b)] || 0), 0);
                            const won = [0, 1, 2, 3, 4].filter((b) => r.s.s[key(i, b)]).length;
                            const cleared = !!r.s.s[key(i, BOSS)];
                            return (
                              <td key={i} className="px-1 py-2 text-center">
                                <span className="inline-grid h-7 w-10 place-items-center rounded-full text-[11px] font-black" title={`${won}/5 battles, ${s} stars`} style={{ background: cleared ? "#3EC46D" : won ? "#E2F3FF" : "#F3F6FA", color: cleared ? "#FFFFFF" : won ? "#1F7DB5" : "#A0A8BE" }}>
                                  {cleared ? "✓" : won ? `${won}/5` : "·"}
                                </span>
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 text-right font-black tabular-nums"><span className="inline-flex items-center gap-1"><StarIcon size={14} />{r.stars}</span></td>
                          <td className="px-2 py-2 text-right font-black tabular-nums" style={{ color: r.acc < 60 ? "#D9434A" : "#1F2440" }}>{r.acc}%</td>
                          <td className="px-2 py-2 text-right text-xs font-bold text-ink-mute">{ago(r.s.d)}</td>
                          <td className="py-2 pl-1 text-right">
                            <button type="button" aria-label={`Remove ${r.s.u}`} onClick={(e) => { e.stopPropagation(); save({ ...data, students: data.students.filter((x) => x.u !== r.s.u) }); }} className="rounded-lg px-2 py-1 text-xs font-black text-ink-mute hover:bg-danger-soft hover:text-danger-deep">Remove</button>
                          </td>
                        </tr>
                        {open === r.s.u && (
                          <tr>
                            <td colSpan={WORLDS.length + 5} className="pb-3">
                              <div className="rounded-2xl bg-sky p-3 text-sm font-bold">
                                <div className="mb-1 font-black">Skills (right first try / missed)</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(r.s.k || {}).sort((a, b) => b[1][1] - a[1][1]).map(([k, [ok, miss]]) => (
                                    <span key={k} className="rounded-full bg-white px-2.5 py-1" style={{ color: miss > ok ? "#D9434A" : "#1F2440" }}>{k}: {ok}/{miss}</span>
                                  ))}
                                  {!Object.keys(r.s.k || {}).length && <span className="text-ink-mute">No answers yet.</span>}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-display text-2xl">Where they get stuck</h2>
            <p className="text-sm font-bold text-ink-mute">Share of first tries missed across the class.</p>
            {classSkills.length ? (
              <ul className="mt-3 flex flex-col gap-3">
                {classSkills.map((s) => (
                  <li key={s.k}>
                    <div className="flex justify-between gap-2 text-sm font-black"><span>{s.k}</span><span className="text-danger-deep">{Math.round(s.miss * 100)}%</span></div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-sky"><motion.div className="h-full rounded-full bg-danger" initial={{ width: 0 }} animate={{ width: `${s.miss * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 font-bold text-ink-mute">Shows up once students have answered a few questions.</p>
            )}
            {rows.length > 0 && (
              <div className="mt-5 border-t-2 border-line pt-4">
                {confirmClear ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-danger-deep">Remove every student?</span>
                    <Button size="sm" tone="white" onClick={() => setConfirmClear(false)}>NO</Button>
                    <Button size="sm" tone="danger" onClick={() => { save({ ...data, students: [] }); setConfirmClear(false); }}>YES, CLEAR</Button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmClear(true)} className="text-sm font-black text-ink-mute hover:text-danger-deep">Clear class</button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, warn }: { label: string; value: React.ReactNode; warn?: boolean }) {
  return (
    <div className="card px-4 py-3" style={warn && Number(value) > 0 ? { borderColor: "#FFC9C9", background: "#FFE8EA" } : undefined}>
      <div className="text-[11px] font-black uppercase tracking-wider text-ink-mute">{label}</div>
      <div className="font-display text-3xl tabular-nums" style={{ color: warn && Number(value) > 0 ? "#D9434A" : undefined }}>{value}</div>
    </div>
  );
}
