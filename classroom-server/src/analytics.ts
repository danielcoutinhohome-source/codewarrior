import type { SqlStorage, SqlStorageValue } from "@cloudflare/workers-types";
// Aggregate traffic only: no accounts, IPs, URLs, answers, or session recordings.
const DAY = 86_400_000;
export const ACTIVE_MS = 90_000;
import type { TrafficReport } from "../../src/lib/traffic";
type Meter = (read: number, written: number) => void;
function queries(sql: SqlStorage, meter?: Meter) {
  return <T extends Record<string, SqlStorageValue> = Record<string, SqlStorageValue>>(query: string, ...args: SqlStorageValue[]) => {
    const cursor = sql.exec<T>(query, ...args);
    const rows = cursor.toArray();
    meter?.(cursor.rowsRead, cursor.rowsWritten);
    return { toArray: () => rows };
  };
}
export function recordTraffic(sql: SqlStorage, body: Record<string, unknown>, time = Date.now(), meter?: Meter): boolean {
  const exec = queries(sql, meter);
  if (typeof body.visitor !== 'string' || !/^[a-f0-9-]{36}$/.test(body.visitor) || typeof body.view !== 'boolean') return false;
  if (body.view && (typeof body.event !== "string" || !/^[a-f0-9-]{36}$/.test(body.event))) return false;
  const id = body.visitor;
  const day = new Date(time).toISOString().slice(0, 10);
  // A heartbeat has at most one accepted write per browser per 25 seconds, across all tabs.
  const prior = exec<{ first_day: string; last_seen: number }>('SELECT first_day, last_seen FROM traffic_visitors WHERE id = ? AND last_seen >= ?', id, time - 365 * DAY).toArray()[0];
  if (prior && time - prior.last_seen < 25_000 && !body.view) return true;
  exec('INSERT INTO traffic_visitors(id,first_day,last_seen) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen', id, prior?.first_day || day, time);
  const view = body.view && !exec('SELECT 1 FROM traffic_views WHERE id=?', body.event as string).toArray().length;
  if (view) exec('INSERT INTO traffic_views(id,day) VALUES(?,?)', body.event as string, day);
  const firstToday = !exec('SELECT 1 FROM traffic_seen WHERE day=? AND visitor=?', day, id).toArray().length;
  if (firstToday) exec('INSERT INTO traffic_seen(day,visitor) VALUES(?,?)', day, id);
  const active = exec<{ n: number }>('SELECT COUNT(*) AS n FROM traffic_visitors WHERE last_seen > ?', time - ACTIVE_MS).toArray()[0].n;
  exec(`INSERT INTO traffic_daily(day,visitors,new_visitors,page_views,peak) VALUES(?,?,?,?,?)
    ON CONFLICT(day) DO UPDATE SET visitors=visitors+excluded.visitors,new_visitors=new_visitors+excluded.new_visitors,
    page_views=page_views+excluded.page_views,peak=MAX(peak,excluded.peak)`, day, Number(firstToday), Number(firstToday && !prior), Number(view), active);
  // Cleanup once per UTC day. Anonymous IDs expire after a year; daily aggregates remain.
  const cleanup = exec<{ v: string }>("SELECT v FROM meta WHERE k='traffic_cleanup'").toArray()[0]?.v;
  if (cleanup !== day) {
    exec('DELETE FROM traffic_seen WHERE day < ?', day);
    exec('DELETE FROM traffic_views WHERE day < ?', day);
    exec('DELETE FROM traffic_visitors WHERE last_seen < ?', time - 365 * DAY);
    exec("INSERT INTO meta(k,v) VALUES('traffic_cleanup',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", day);
  }
  return true;
}
export function trafficReport(sql: SqlStorage, count: number, time = Date.now(), meter?: Meter): TrafficReport {
  const exec = queries(sql, meter);
  const since = new Date(time - (count - 1) * DAY).toISOString().slice(0, 10);
  const rows = exec<{ day: string; visitors: number; new_visitors: number; page_views: number; peak: number }>('SELECT * FROM traffic_daily WHERE day >= ? ORDER BY day', since).toArray();
  const byDay = new Map(rows.map(r => [r.day, r]));
  return { generatedAt: time, activeNow: exec<{ n: number }>('SELECT COUNT(*) AS n FROM traffic_visitors WHERE last_seen > ?', time - ACTIVE_MS).toArray()[0].n,
    days: Array.from({ length: count }, (_, i) => {
      const day = new Date(time - (count - 1 - i) * DAY).toISOString().slice(0, 10), r = byDay.get(day);
      return { day, visitors: r?.visitors || 0, newVisitors: r?.new_visitors || 0, returningVisitors: (r?.visitors || 0) - (r?.new_visitors || 0), pageViews: r?.page_views || 0, peakConcurrent: r?.peak || 0 };
    }) };
}
