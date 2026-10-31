"use client";

import { useState } from "react";
import { Button } from "../ui";
import { api, errorText } from "@/lib/cloud/client";
import type { Summary } from "./types";

export default function Settings({ data, onChanged }: { data: Summary; onChanged: () => void }) {
  const c = data.class;
  const [name, setName] = useState(c.name);
  const [section, setSection] = useState(c.section);
  const [description, setDescription] = useState(c.description);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<"rotate" | "archive" | null>(null);
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      setMsg({ ok: true, text: ok });
      setConfirm(null);
      onChanged();
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    }
  };
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="font-display text-2xl">Class code</h2>
        {c.joinCode ? <div className="font-mono text-4xl font-black tracking-[0.25em] text-ink">{c.joinCode}</div> : <p className="font-bold text-ink-mute">No code.</p>}
        <p className="text-sm font-bold text-ink-soft">Students enter this on their Class page. It only lets a signed-in student ask to join; it never shows them the roster or anything of yours.</p>
        <p className="text-sm font-black" style={{ color: c.archived || !c.joinEnabled ? "#B42318" : "#1E7A3E" }}>{c.archived ? "Archived: nobody can join." : c.joinEnabled ? "Accepting new students." : "Joining is turned off."}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" tone="white" disabled={!c.joinCode} onClick={() => act(() => navigator.clipboard.writeText(c.joinCode || ""), "Code copied.")}>COPY CODE</Button>
          <Button size="sm" tone="white" disabled={c.archived} onClick={() => act(() => api("PATCH", `/classes/${c.id}`, { joinEnabled: !c.joinEnabled }), c.joinEnabled ? "Joining turned off." : "Joining turned on.")}>{c.joinEnabled ? "TURN OFF JOINING" : "TURN ON JOINING"}</Button>
          {confirm === "rotate" ? (
            <span className="flex flex-wrap items-center gap-2 text-sm font-black">
              New code? The old one stops working; current students stay.
              <Button size="sm" tone="white" onClick={() => setConfirm(null)}>NO</Button>
              <Button size="sm" tone="ocean" onClick={() => act(() => api("POST", `/classes/${c.id}/rotate-code`), "New code made.")}>YES</Button>
            </span>
          ) : (
            <Button size="sm" tone="white" onClick={() => setConfirm("rotate")}>NEW CODE</Button>
          )}
        </div>
      </section>

      <form className="card flex flex-col gap-3 p-5" onSubmit={(e) => { e.preventDefault(); void act(() => api("PATCH", `/classes/${c.id}`, { name, section, description }), "Saved."); }}>
        <h2 className="font-display text-2xl">Details</h2>
        <label className="field-label" htmlFor="s-name">Class name<input id="s-name" className="field" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field-label" htmlFor="s-sec">Section<input id="s-sec" className="field" maxLength={40} value={section} onChange={(e) => setSection(e.target.value)} /></label>
        <label className="field-label" htmlFor="s-desc">Description<textarea id="s-desc" className="field" maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <p className="text-sm font-bold text-ink-soft">Course: {c.course === "csa" ? "AP CSA (Java)" : "AP CSP (pseudocode)"}. The course is fixed once a class exists.</p>
        <div><Button type="submit" tone="ocean" disabled={!name.trim()}>SAVE</Button></div>
      </form>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="font-display text-2xl">{c.archived ? "Archived class" : "Archive"}</h2>
        <p className="text-sm font-bold text-ink-soft">Archiving keeps every record and report, stops new students from joining and stops new assignments from being published. Students&apos; work on existing assignments is saved as their own play. Classes can&apos;t be deleted here, so records aren&apos;t lost by accident.</p>
        {c.archived ? (
          <div><Button tone="white" onClick={() => act(() => api("POST", `/classes/${c.id}/archive`, { archived: false }), "Class unarchived.")}>UNARCHIVE</Button></div>
        ) : confirm === "archive" ? (
          <div className="flex flex-wrap items-center gap-2 text-sm font-black">
            Archive {c.name}?
            <Button size="sm" tone="white" onClick={() => setConfirm(null)}>NO</Button>
            <Button size="sm" tone="danger" onClick={() => act(() => api("POST", `/classes/${c.id}/archive`, { archived: true }), "Class archived.")}>ARCHIVE</Button>
          </div>
        ) : (
          <div><Button tone="white" onClick={() => setConfirm("archive")}>ARCHIVE CLASS</Button></div>
        )}
      </section>
      {msg && <p role="status" className="rounded-2xl px-4 py-2 font-black lg:col-span-2" style={{ color: msg.ok ? "#1E7A3E" : "#B42318", background: msg.ok ? "#E3F9EA" : "#FFE8EA" }}>{msg.text}</p>}
    </div>
  );
}
