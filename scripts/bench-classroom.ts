// Measures Durable Object SQL rows read/written for the busiest classroom requests, against a
// realistic class (the free plan allows 5M rows read and 100k written per day). Starts its own
// local server like test-classroom.ts. Usage: npx tsx scripts/bench-classroom.ts
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.CLASSROOM_BENCH_PORT || 8799);
const BASE = `http://localhost:${PORT}/v1`;
const ADMIN = "bench-admin-token-" + "x".repeat(32);
const STUDENTS = Number(process.env.STUDENTS || 30);
const BATTLES = Number(process.env.BATTLES || 30); // per student
const QUESTIONS = 12;

async function call(method: string, path: string, token?: string, body?: unknown) {
  if (path === "/sync" && body) body = { ...(body as object), sentAt: Date.now() };
  const r = await fetch(BASE + path, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const rows = r.headers.get("x-rows") || "";
  const json = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${method} ${path} ${r.status} ${JSON.stringify(json)}`);
  return { json: json as any, read: Number(/read=(\d+)/.exec(rows)?.[1] || 0), written: Number(/written=(\d+)/.exec(rows)?.[1] || 0) };
}
const uid = () => crypto.randomUUID();

function stop(p: ChildProcess) {
  try {
    process.kill(-p.pid!, "SIGTERM");
  } catch {
    p.kill("SIGTERM");
  }
}

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "cw-bench-"));
  const proc = spawn("npx", ["wrangler", "dev", "--port", String(PORT), "--persist-to", dir, "--var", `ADMIN_TOKEN:${ADMIN}`, "--log-level", "warn"], { cwd: join(__dirname, "..", "classroom-server"), stdio: "ignore", detached: true, env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
  try {
    for (let i = 0; ; i++) {
      try {
        if ((await fetch(`${BASE}/health`)).ok) break;
      } catch {}
      if (i > 120) throw new Error("server didn't start");
      await new Promise((r) => setTimeout(r, 500));
    }
    await fetch(`${BASE}/admin/provision-teacher`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${ADMIN}` }, body: JSON.stringify({ username: "benchteacher", password: "starter-pass-1" }) });
    let t = (await call("POST", "/auth/login", undefined, { username: "benchteacher", password: "starter-pass-1" })).json.token;
    await call("POST", "/auth/password", t, { current: "starter-pass-1", next: "bench-pass-22" });
    const cls = (await call("POST", "/classes", t, { name: "Bench", course: "csa" })).json.class;
    for (let a = 0; a < 5; a++) {
      await call("POST", `/classes/${cls.id}/assignments`, t, { title: `A${a}`, instructions: "", target: { kind: "battles", battles: [[a, 0], [a, 1], [a, 2]] }, dueAt: null, dueTz: "UTC", status: "published", requireLaunch: false });
    }
    let syncRead = 0, syncWritten = 0, syncCalls = 0;
    for (let s = 0; s < STUDENTS; s++) {
      const st = (await call("POST", "/auth/register", undefined, { username: `bench_s${s}`, password: "student-pass-1", displayName: `Student ${s}` })).json.token;
      await call("POST", "/join", st, { code: cls.joinCode });
      const events: unknown[] = [];
      for (let b = 0; b < BATTLES; b++) {
        const sid = uid();
        const at = Date.now() - (BATTLES - b) * 60_000;
        events.push({ id: uid(), type: "session.start", at, session: { id: sid, kind: "battle", world: Math.floor(b / 5) % 7, battle: b % 5, questionCount: QUESTIONS, contentVersion: "bench" } });
        for (let q = 0; q < QUESTIONS; q++) {
          events.push({ id: uid(), type: "attempt", at: at + q * 1000, sessionId: sid, attempt: { index: q, round: 0, tryNo: 0, questionId: `q${q}`, skill: `skill-${(b * QUESTIONS + q) % 25}`, kind: "mc", prompt: "What does this print? ".repeat(4), given: "A", expected: "B", correct: q % 4 !== 0 } });
        }
        events.push({ id: uid(), type: "session.finish", at: at + 30_000, sessionId: sid, result: { outcome: "won", hintsUsed: 0 } });
      }
      for (let i = 0; i < events.length; i += 200) {
        const r = await call("POST", "/sync", st, { events: events.slice(i, i + 200) });
        syncRead += r.read;
        syncWritten += r.written;
        syncCalls++;
      }
    }
    const perBattle = (n: number) => (n / (STUDENTS * BATTLES)).toFixed(0);
    console.log(`class: ${STUDENTS} students x ${BATTLES} battles x ${QUESTIONS} answers, 5 assignments`);
    console.log(`upload: ${perBattle(syncRead)} rows read, ${perBattle(syncWritten)} written per battle`);
    const sum = await call("GET", `/classes/${cls.id}/summary`, t);
    console.log(`teacher summary: ${sum.read} rows read`);
    const student = sum.json.students[0].id;
    const det = await call("GET", `/classes/${cls.id}/students/${student}`, t);
    console.log(`student detail: ${det.read} rows read`);
    const st0 = (await call("POST", "/auth/login", undefined, { username: "bench_s0", password: "student-pass-1" })).json.token;
    const home = await call("GET", "/student/home", st0);
    console.log(`student home: ${home.read} rows read`);
    const exp = await call("GET", `/classes/${cls.id}/export`, t);
    console.log(`export: ${exp.read} rows read`);
    console.log(`daily budget: ~${Math.floor(5_000_000 / sum.read)} teacher summary loads at this class size`);
  } finally {
    stop(proc);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
