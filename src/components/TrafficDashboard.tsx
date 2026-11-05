"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorText, setCloud, useCloud } from "@/lib/cloud/client";
import type { Me } from "@/lib/cloud/protocol";
import type { TrafficReport, TrafficDay } from "@/lib/traffic";

export default function TrafficDashboard({ embedded = false }: { embedded?: boolean }) {
  const cloud = useCloud();
  useEffect(() => {
    if (embedded || !cloud?.token) return;
    const token = cloud.token;
    let active = true;
    void api<{ me: Me }>("GET", "/me").then(r => { if (active) setCloud({ token, me: r.me }); }).catch(() => {});
    return () => { active = false; };
  }, [embedded, cloud?.token]);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<TrafficReport | null>(null);
  const [error, setError] = useState("");
  const [metric, setMetric] = useState<keyof Omit<TrafficDay, "day">>("visitors");
  const [optOut, setOptOut] = useState(false);
  useEffect(() => { try { setOptOut(localStorage.getItem("cw.traffic.optOut") === "1"); } catch {} }, []);
  useEffect(() => {
    setData(null);
    if (!cloud?.me.canViewAnalytics || cloud.me.mustChangePassword) return;
    let alive = true, busy = false;
    const load = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try { const next = await api<TrafficReport>("GET", `/analytics?days=${days}`); if (alive) { setData(next); setError(""); } }
      catch (e) { if (alive) setError(errorText(e)); }
      finally { busy = false; }
    };
    void load();
    const timer = setInterval(load, 60_000);
    document.addEventListener("visibilitychange", load);
    return () => { alive = false; clearInterval(timer); document.removeEventListener("visibilitychange", load); };
  }, [cloud?.token, cloud?.me.canViewAnalytics, cloud?.me.mustChangePassword, days]);
  const exportCsv = () => {
    if (!data) return;
    const csv = ["date_utc,visitors,new_browsers,returning_browsers,page_views,peak_concurrent", ...data.days.map(r => [r.day,r.visitors,r.newVisitors,r.returningVisitors,r.pageViews,r.peakConcurrent].join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "codewarrior-traffic.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const today = data?.days.at(-1);
  const max = Math.max(1, ...data?.days.map(r => r[metric]) || []);
  const Container = embedded ? "section" : "main";
  return <Container id="site-traffic" className={embedded ? "card p-4 text-ink sm:p-6" : "min-h-dvh bg-sky p-4 text-ink sm:p-8"}><div className="mx-auto max-w-5xl space-y-6">
    {!embedded && <Link href="/teacher/" className="font-bold underline">← Teacher dashboard</Link>}
    <h1 className="text-3xl font-black">Site traffic</h1>
    <p>Anonymous browser counts across CodeWarrior. Days use UTC. Updates every minute while this page is visible.</p>
    <label className="flex items-center gap-2"><input type="checkbox" checked={optOut} onChange={e => { setOptOut(e.target.checked); try { localStorage.setItem("cw.traffic.optOut", e.target.checked ? "1" : "0"); } catch { setError("Browser storage is blocked. Use Do Not Track to disable analytics."); } }} />Exclude this browser from future traffic updates</label>
    {!cloud ? <p>This dashboard is private. <Link href="/login/?as=teacher" className="underline">Sign in</Link> with an authorized account.</p> : cloud.me.mustChangePassword ? <p><Link href="/account/" className="underline">Change your starter password</Link> to continue.</p> : !cloud.me.canViewAnalytics ? <p>This dashboard is private. Your account does not have access.</p> : <>
      {error && <p role="alert" className="rounded-xl bg-white p-4">{error} {data && "Showing older data; updates will retry."}</p>}
      {!data && !error && <p role="status">Loading traffic…</p>}
      {data && <>
        <p className="text-sm">Last updated: {new Date(data.generatedAt).toLocaleString()}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Active now",data.activeNow],["Visitors today",today?.visitors],["New browsers today",today?.newVisitors],["Peak today",today?.peakConcurrent]].map(([label,value]) => <div key={label} className="rounded-2xl bg-white p-4"><p className="text-sm font-bold">{label}</p><p className="text-3xl font-black">{value ?? 0}</p></div>)}</div>
        <div className="flex flex-wrap gap-4">
          <label>Period <select className="rounded p-2" value={days} onChange={e => setDays(Number(e.target.value))}>{[7,30,90].map(n => <option key={n} value={n}>{n} days</option>)}</select></label>
          <label>Graph <select className="rounded p-2" value={metric} onChange={e => setMetric(e.target.value as typeof metric)}>{Object.entries({ visitors:"Visitors",newVisitors:"New browsers",returningVisitors:"Returning browsers",pageViews:"Page views",peakConcurrent:"Peak concurrent" }).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <button onClick={exportCsv} className="rounded bg-white px-4 font-bold underline">Download CSV</button>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="mb-2 text-sm">Daily {metric.replace(/([A-Z])/g, " $1").toLowerCase()} · scale 0–{max}</p>
          <svg role="img" aria-label={`Daily ${metric}; exact values in the table below`} viewBox="0 0 900 200" className="w-full">
            {data.days.map((r,i) => { const width = 900 / data.days.length; const height = r[metric] / max * 180; return <rect key={r.day} x={i*width+1} y={190-height} width={Math.max(1,width-2)} height={height} fill="#26768c"><title>{r.day}: {r[metric]}</title></rect>; })}
          </svg><div className="flex justify-between text-sm"><span>{data.days[0].day}</span><span>{today?.day}</span></div>
        </div>
        {!data.days.some(r => r.visitors) && <p>No visits recorded in this period. Tracking begins after deployment.</p>}
        <div className="overflow-x-auto rounded-2xl bg-white p-4"><table className="w-full text-left text-sm"><caption className="mb-3 text-left font-bold">Daily traffic log</caption><thead><tr>{["Date (UTC)","Visitors","New","Returning","Views","Peak"].map(v => <th className="p-2" key={v}>{v}</th>)}</tr></thead><tbody>{[...data.days].reverse().map(r => <tr key={r.day} className="border-t">{[r.day,r.visitors,r.newVisitors,r.returningVisitors,r.pageViews,r.peakConcurrent].map((v,i) => <td className="p-2" key={i}>{v}</td>)}</tr>)}</tbody></table></div>
      </>}
    </>}
    <p className="text-sm">A visitor is a browser, not a verified person. Active means a visible tab reported within 90 seconds; peak is the highest observed daily count. New means first seen here (anonymous IDs expire after a year of inactivity). Clearing storage, shared devices, blocked analytics, and offline visits affect counts. No names, answers, IP addresses, or page URLs are stored in traffic records. Do Not Track and Global Privacy Control are respected.</p>
  </div></Container>;
}
