// Integration tests for the classroom server. Starts the real Worker + Durable Object locally
// (wrangler dev, SQLite storage) and drives it with separate student and teacher accounts,
// using only ordinary bearer tokens (plus the provisioning token for the bootstrap teacher).
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.CLASSROOM_TEST_PORT || 8798);
const BASE = `http://localhost:${PORT}/v1`;
const ADMIN = "test-admin-token-" + "x".repeat(32);
let checks = 0;
const ok = (c: unknown, msg: string) => { assert.ok(c, msg); checks++; };
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); checks++; };

type Res = { status: number; body: any };
async function call(method: string, path: string, token?: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res> {
  // Uploads carry the device clock, like the real client.
  if (path === "/sync" && body && typeof body === "object") body = { ...(body as object), sentAt: Date.now() };
  const r = await fetch(BASE + path, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch {}
  return { status: r.status, body: parsed };
}
const uid = () => crypto.randomUUID();

async function start(): Promise<{ proc: ChildProcess; dir: string }> {
  const dir = mkdtempSync(join(tmpdir(), "cw-classroom-"));
  try {
    await fetch(`${BASE}/health`);
    throw new Error(`port ${PORT} is already in use; stop the old server first`);
  } catch (e) {
    if (String(e).includes("already in use")) throw e;
  }
  // detached: the server gets its own process group so it can be stopped with its children.
  const proc = spawn("npx", ["wrangler", "dev", "--port", String(PORT), "--persist-to", dir, "--var", `ADMIN_TOKEN:${ADMIN}`, "--log-level", "warn"], { cwd: join(__dirname, "..", "classroom-server"), stdio: ["ignore", "pipe", "pipe"], detached: true, env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
  let log = "";
  proc.stdout?.on("data", (d) => (log += d));
  proc.stderr?.on("data", (d) => (log += d));
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return { proc, dir };
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  stop(proc);
  throw new Error("classroom server didn't start:\n" + log.slice(-3000));
}

function stop(proc: ChildProcess) {
  try {
    process.kill(-proc.pid!, "SIGTERM");
  } catch {
    proc.kill("SIGTERM");
  }
}

async function signup(username: string, extra: Record<string, unknown> = {}) {
  const r = await call("POST", "/auth/register", undefined, { username, password: "correct-horse-1", displayName: username.replace(/_/g, " "), ...extra });
  eq(r.status, 201, `register ${username}: ${JSON.stringify(r.body)}`);
  return r.body as { token: string; me: { id: string; role: string } };
}

function battleEvents(sessionId: string, opts: { assignmentId?: string; world?: number; battle?: number; answers: boolean[]; outcome: "won" | "lost" }) {
  // A fast runner may reach this fixture less than 300 ms after enrollment.
  // Stamp this simulated instant battle at creation time so it cannot silently
  // move before a join (or back inside a membership after leaving). Array order
  // preserves start / attempts / finish ordering even within one millisecond.
  const at = Date.now();
  const events: any[] = [{ id: uid(), type: "session.start", at, session: { id: sessionId, kind: "battle", world: opts.world ?? 0, battle: opts.battle ?? 0, assignmentId: opts.assignmentId, questionCount: opts.answers.length, contentVersion: "test-1" } }];
  opts.answers.forEach((right, i) => {
    events.push({ id: uid(), type: "attempt", at, sessionId, attempt: { index: i, round: 0, tryNo: 0, questionId: `q${i}`, skill: i % 2 ? "Integer division" : "Casting", kind: "choice", prompt: `Question ${i}?`, options: ["A", "B"], given: right ? "A" : "B", expected: "A", correct: right, hinted: false } });
    if (!right) events.push({ id: uid(), type: "attempt", at, sessionId, attempt: { index: i, round: 0, tryNo: 1, questionId: `q${i}`, skill: i % 2 ? "Integer division" : "Casting", kind: "fill", prompt: `Question ${i}?`, code: "int x = ___;", given: "x = 7 / 2", expected: "3", correct: true, hinted: false } });
  });
  events.push({ id: uid(), type: "session.finish", at, sessionId, result: { outcome: opts.outcome, itemsUsed: { potion: 1 }, hintsUsed: 0, bestCombo: 3 } });
  return events;
}

function waitFor(ws: WebSocket, pred: (m: any) => boolean, ms = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { ws.removeEventListener("message", on); reject(new Error("timed out waiting for a live message")); }, ms);
    const on = (e: MessageEvent) => {
      const m = JSON.parse(String(e.data));
      if (pred(m)) { clearTimeout(t); ws.removeEventListener("message", on); resolve(m); }
    };
    ws.addEventListener("message", on);
  });
}

async function main() {
  const { proc, dir } = await start();
  try {
    // ---- bootstrap teacher (server-only provisioning) ----
    eq((await call("POST", "/admin/provision-teacher", "wrong-token", { username: "DetrickTest", password: "Starter123x" })).status, 401, "wrong admin token rejected");
    eq((await call("POST", "/admin/provision-teacher", undefined, { username: "DetrickTest", password: "Starter123x" })).status, 401, "missing admin token rejected");
    eq((await call("POST", "/admin/provision-teacher", ADMIN, { username: "DetrickTest", password: "Starter123x" })).body.status, "created", "teacher provisioned");
    eq((await call("POST", "/admin/provision-teacher", ADMIN, { username: "DetrickTest", password: "Different999" })).body.status, "exists", "provisioning is idempotent");
    eq((await call("POST", "/auth/login", undefined, { username: "detricktest", password: "Different999" })).status, 401, "re-provisioning did not change the password");

    let t1 = await call("POST", "/auth/login", undefined, { username: "detricktest", password: "Starter123x" });
    eq(t1.status, 200, "teacher signs in with starter password (case-insensitive username)");
    ok(t1.body.me.role === "teacher" && t1.body.me.mustChangePassword, "starter password must be changed");
    const starterToken = t1.body.token;
    eq((await call("GET", "/classes", starterToken)).body.error, "password_change_required", "classroom records locked until password change");
    eq((await call("POST", "/auth/password", starterToken, { current: "nope", next: "NewSecret456" })).status, 401, "wrong current password");
    eq((await call("POST", "/auth/password", starterToken, { current: "Starter123x", next: "short" })).status, 400, "weak password rejected");
    const changed = await call("POST", "/auth/password", starterToken, { current: "Starter123x", next: "NewSecret456" });
    ok(changed.status === 200 && !changed.body.me.mustChangePassword, "password changed");
    let T = starterToken;
    // An explicit reset (admin only) restores a starter password and ends sessions.
    eq((await call("POST", "/admin/provision-teacher", ADMIN, { username: "DetrickTest", password: "Reset-pass-9", reset: true })).body.status, "reset", "admin reset");
    eq((await call("GET", "/me", T)).status, 401, "reset signed the teacher out");
    const relog = await call("POST", "/auth/login", undefined, { username: "DetrickTest", password: "Reset-pass-9" });
    ok(relog.body.me.mustChangePassword, "reset password must be changed again");
    const T_ = relog.body.token;
    eq((await call("POST", "/auth/password", T_, { current: "Reset-pass-9", next: "NewSecret456b" })).status, 200, "changed after reset");
    T = T_;

    // ---- classes ----
    const created = await call("POST", "/classes", T, { name: "AP CSA Period 3", course: "csa", section: "P3" });
    eq(created.status, 201, "class created");
    const cls = created.body.class;
    ok(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/.test(cls.joinCode), `readable 8-character code (${cls.joinCode})`);

    // ---- students: public signup is student-only ----
    const s1 = await signup("ava_student", { role: "teacher" });
    eq(s1.me.role, "student", "role in the request body is ignored");
    const s2 = await signup("ben_student");
    eq((await call("POST", "/auth/register", undefined, { username: "Ava_Student", password: "whatever123" })).status, 409, "usernames are unique ignoring case");
    eq((await call("PATCH", "/me", s1.token, { role: "teacher", displayName: "Ava" })).body.me.role, "student", "profile update can't change role");
    eq((await call("POST", "/classes", s1.token, { name: "Hack", course: "csa" })).status, 403, "student can't create classes");
    eq((await call("POST", "/teacher/invites", T)).status, 404, "there is no teacher invite endpoint");
    eq((await call("POST", "/admin/provision-teacher", s1.token, { username: "evil", password: "password123" })).status, 401, "student token isn't an admin token");
    eq((await call("GET", `/classes/${cls.id}/summary`, s1.token)).status, 403, "student can't read teacher summary");
    const sneaky = await call("POST", "/auth/register", undefined, { username: "fake_teacher", password: "password123", invite: "ABCD-EFGH-JKMN", role: "teacher" });
    eq(sneaky.body.me.role, "student", "sign-up can never make a teacher");

    // ---- joining ----
    eq((await call("POST", "/join", s1.token, { code: "ZZZZZZZZ" })).body.error, "invalid_code", "wrong code");
    const j1 = await call("POST", "/join", s1.token, { code: cls.joinCode.toLowerCase().replace(/(....)/, "$1-") });
    ok(j1.status === 200 && !j1.body.already && j1.body.class.joinCode === null, "student joins (code is case/dash tolerant) and never sees the code back");
    eq((await call("POST", "/join", s1.token, { code: cls.joinCode })).body.already, true, "duplicate join handled");
    eq((await call("POST", "/join", T, { code: cls.joinCode })).status, 403, "teacher can't join as a student");
    await call("POST", "/join", s2.token, { code: cls.joinCode });
    const roster = await call("GET", `/classes/${cls.id}/summary`, T);
    eq(roster.body.students.map((s: any) => s.username).sort(), ["ava_student", "ben_student"], "teacher sees both students");

    // Guessing is rate limited per student.
    const guesser = await signup("guesser");
    let limited = false;
    for (let i = 0; i < 12; i++) if ((await call("POST", "/join", guesser.token, { code: `AAAAAAA${"BCDEFGHJKMNP"[i]}` })).status === 429) limited = true;
    ok(limited, "class code guessing is rate limited");

    // Rotating the code keeps members.
    const rotated = await call("POST", `/classes/${cls.id}/rotate-code`, T);
    ok(rotated.body.class.joinCode !== cls.joinCode, "code rotated");
    eq((await call("GET", `/classes/${cls.id}/summary`, T)).body.students.length, 2, "rotation kept members");
    eq((await call("POST", "/join", (await signup("late_kid")).token, { code: cls.joinCode })).body.error, "invalid_code", "old code no longer works");

    // ---- a second teacher (provisioned server-side, like every teacher) is isolated ----
    eq((await call("POST", "/admin/provision-teacher", ADMIN, { username: "other_teacher", password: "password456" })).body.status, "created", "second teacher provisioned");
    const t2pre = await call("POST", "/auth/login", undefined, { username: "other_teacher", password: "password456" });
    const t2 = await call("POST", "/auth/password", t2pre.body.token, { current: "password456", next: "password789" });
    eq(t2.body.me.role, "teacher", "second teacher signed in");
    t2.body.token = t2pre.body.token;
    const T2 = t2.body.token;
    eq((await call("GET", `/classes/${cls.id}/summary`, T2)).status, 404, "other teacher can't see the class");
    eq((await call("PATCH", `/classes/${cls.id}`, T2, { name: "mine now" })).status, 404, "other teacher can't edit the class");
    eq((await call("GET", `/classes/${cls.id}/students/${s1.me.id}`, T2)).status, 404, "other teacher can't read the student");
    eq((await call("GET", "/classes", T2)).body.classes.length, 0, "other teacher lists only their own classes");

    // ---- assignments ----
    const asg = await call("POST", `/classes/${cls.id}/assignments`, T, { title: "Beat Byte Raider", instructions: "Win battle 1.", target: { kind: "battles", battles: [[0, 0], [0, 0]] }, dueAt: Date.now() + 86_400_000, dueTz: "America/New_York", status: "published" });
    eq(asg.status, 201, "assignment created");
    eq(asg.body.assignment.target.battles, [[0, 0]], "duplicate targets collapsed");
    const draft = await call("POST", `/classes/${cls.id}/assignments`, T, { title: "Draft", target: { kind: "practice", lessonId: "csa-int-math", lessonTitle: "Integer math", difficulty: "mixed", count: 5 }, status: "draft" });
    let home = await call("GET", "/student/home", s1.token);
    eq(home.body.assignments.map((a: any) => a.title), ["Beat Byte Raider"], "students see only published work");
    eq(home.body.assignments[0].state, "not_started", "not started yet");
    eq((await call("GET", `/classes/${cls.id}/assignments`, s1.token)).body.assignments.length, 1, "student assignment list hides drafts");

    // ---- live updates ----
    const ws = new WebSocket(`ws://localhost:${PORT}/v1/live`);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    ws.send(JSON.stringify({ type: "auth", token: T }));
    await waitFor(ws, (m) => m.type === "ready");
    ws.send(JSON.stringify({ type: "subscribe", classId: cls.id }));
    await waitFor(ws, (m) => m.type === "subscribed");
    const ws2 = new WebSocket(`ws://localhost:${PORT}/v1/live`);
    await new Promise((r) => (ws2.onopen = r));
    ws2.send(JSON.stringify({ type: "auth", token: T2 }));
    await waitFor(ws2, (m) => m.type === "ready");
    ws2.send(JSON.stringify({ type: "subscribe", classId: cls.id }));
    eq((await waitFor(ws2, (m) => m.type === "error" || m.type === "subscribed")).type, "error", "other teacher can't subscribe to the class");
    const wsStudent = new WebSocket(`ws://localhost:${PORT}/v1/live`);
    await new Promise((r) => (wsStudent.onopen = r));
    const closed = new Promise<number>((r) => (wsStudent.onclose = (e) => r(e.code)));
    wsStudent.send(JSON.stringify({ type: "auth", token: s1.token }));
    eq(await closed, 4003, "students can't open the teacher live feed");

    // ---- ingestion: assigned battle, replay, tamper ----
    const sid = uid();
    const events = battleEvents(sid, { assignmentId: asg.body.assignment.id, answers: [true, true, false, true, true], outcome: "won" });
    const live = waitFor(ws, (m) => m.type === "changed" && m.what === "results");
    const t0 = Date.now();
    const up = await call("POST", "/sync", s1.token, { events });
    ok(up.body.acks.every((a: any) => a.status === "ok"), "all events accepted");
    await live;
    ok(Date.now() - t0 < 5000, "teacher notified within seconds");
    const replay = await call("POST", "/sync", s1.token, { events });
    ok(replay.body.acks.every((a: any) => a.status === "duplicate"), "replay is acknowledged as duplicate");
    const sameIdsNewEvents = await call("POST", "/sync", s1.token, { events: battleEvents(sid, { assignmentId: asg.body.assignment.id, answers: [true, true, true, true, true], outcome: "won" }) });
    ok(sameIdsNewEvents.body.acks.every((a: any) => a.status === "ok" || a.status === "duplicate"), "retry with fresh event ids is accepted but can't change a finished run");
    ok(sameIdsNewEvents.body.acks.filter((a: any) => a.status === "duplicate").length === 5, "re-sent answers are recognised by their content, not their event id");
    eq((await call("POST", "/sync", s2.token, { events: [events[0]] })).body.acks[0].status, "rejected", "another account can't reuse an event id");
    eq((await call("POST", "/sync", s2.token, { events: [{ id: uid(), type: "attempt", at: Date.now(), sessionId: sid, attempt: events[1].attempt }] })).body.acks[0].status, "rejected", "another account can't write into the run");

    let sum = await call("GET", `/classes/${cls.id}/summary`, T);
    const run = sum.body.recent.find((r: any) => r.id === sid);
    ok(run && run.outcome === "won" && run.assignmentId === asg.body.assignment.id, "result linked to assignment");
    eq([run.firstTry, run.questionCount, run.stars, run.retries], [4, 5, 2, 1], "stars and first-try derived by the server from recorded answers");
    eq(sum.body.recent.filter((r: any) => r.id === sid).length, 1, "no duplicate rows after replays");
    eq(sum.body.assignmentStates[asg.body.assignment.id][s1.me.id].state, "completed", "assignment completed from linked work");
    eq(sum.body.assignmentStates[asg.body.assignment.id][s2.me.id].state, "not_started", "other student unaffected");
    const detail = await call("GET", `/classes/${cls.id}/sessions/${sid}`, T);
    ok(detail.body.attempts.some((a: any) => a.given === "x = 7 / 2" && a.code === "int x = ___;"), "teacher sees the actual answers and code");
    ok(detail.body.attempts.some((a: any) => a.kind === "choice" && a.given === "B" && !a.code), "multiple choice stores the selected answer, no invented code");
    eq(detail.body.session.contentVersion, "test-1", "content version recorded");

    // An unrelated battle doesn't complete an assignment; a bogus assignment is downgraded.
    const asg2 = await call("POST", `/classes/${cls.id}/assignments`, T, { title: "Boss", target: { kind: "battles", battles: [[0, 4]] }, status: "published", requireLaunch: true });
    eq(asg2.body.assignment.requireLaunch, true, "teacher can require playing from the assignment");
    const other = uid();
    await call("POST", "/sync", s2.token, { events: battleEvents(other, { world: 0, battle: 4, answers: [true, true, true], outcome: "won" }) });
    eq((await call("GET", `/classes/${cls.id}/summary`, T)).body.assignmentStates[asg2.body.assignment.id][s2.me.id].state, "not_started", "with 'must play from assignment', an earlier win doesn't count");
    // Default: an earlier win of the same battle counts, and the teacher can see which run.
    const asg3 = await call("POST", `/classes/${cls.id}/assignments`, T, { title: "Boss (earlier wins ok)", target: { kind: "battles", battles: [[0, 4], [0, 3]] }, status: "published" });
    eq(asg3.body.assignment.requireLaunch, false, "earlier wins count by default");
    let st3 = (await call("GET", `/classes/${cls.id}/summary`, T)).body.assignmentStates[asg3.body.assignment.id][s2.me.id];
    ok(st3.state === "in_progress" && st3.done === 1 && st3.credits[0].sessionId === other && st3.credits[0].viaAssignment === false, "earlier boss win credited; the other battle still needed");
    eq((await call("GET", `/classes/${cls.id}/summary`, T)).body.assignmentStates[asg3.body.assignment.id][s1.me.id].state, "not_started", "a student without the win gets no credit");
    await call("POST", "/sync", s2.token, { events: battleEvents(uid(), { world: 0, battle: 3, answers: [true], outcome: "won" }) });
    st3 = (await call("GET", `/classes/${cls.id}/summary`, T)).body.assignmentStates[asg3.body.assignment.id][s2.me.id];
    eq(st3.state, "completed", "finishing the remaining battle anywhere completes it");
    await call("POST", "/sync", s2.token, { events: battleEvents(uid(), { world: 0, battle: 2, answers: [true], outcome: "lost" }) });
    const asg4 = await call("POST", `/classes/${cls.id}/assignments`, T, { title: "Battle 3", target: { kind: "battles", battles: [[0, 2]] }, status: "published" });
    eq((await call("GET", `/classes/${cls.id}/summary`, T)).body.assignmentStates[asg4.body.assignment.id][s2.me.id].state, "not_started", "a lost battle never earns credit");
    const req = await call("PATCH", `/assignments/${asg3.body.assignment.id}`, T, { requireLaunch: true });
    ok(req.body.assignment.requireLaunch && req.body.assignment.version === 2, "teacher can switch the rule later (bumps the version)");
    eq((await call("GET", `/classes/${cls.id}/summary`, T)).body.assignmentStates[asg3.body.assignment.id][s2.me.id].state, "not_started", "after switching, earlier wins stop counting");
    await call("PATCH", `/assignments/${asg3.body.assignment.id}`, T, { requireLaunch: false });
    const mismatch = uid();
    await call("POST", "/sync", s2.token, { events: battleEvents(mismatch, { assignmentId: asg2.body.assignment.id, world: 1, battle: 0, answers: [true], outcome: "won" }) });
    const outsider = await signup("outsider");
    const sneak = uid();
    await call("POST", "/sync", outsider.token, { events: battleEvents(sneak, { assignmentId: asg.body.assignment.id, answers: [true], outcome: "won" }) });
    sum = await call("GET", `/classes/${cls.id}/summary`, T);
    ok(!sum.body.recent.some((r: any) => r.id === sneak), "a non-member's work never reaches the class");
    const mm = sum.body.recent.find((r: any) => r.id === mismatch);
    if (!mm || mm.assignmentId !== null) {
      const det = await call("GET", `/classes/${cls.id}/students/${s2.me.id}`, T);
      console.log((process.env.GITHUB_ACTIONS ? "::warning title=debug::" : "DEBUG ") + JSON.stringify({ mm, periods: det.body.periods, sessions: det.body.sessions?.map((x: any) => [x.id.slice(0, 6), x.startedAt, x.receivedAt, x.assignmentId, x.contextNote]), recent: sum.body.recent.map((r: any) => [r.id.slice(0, 6), r.studentName]), mismatch: mismatch.slice(0, 6), now: Date.now() }));
    }
    ok(mm && mm.assignmentId === null, "battle outside the assignment isn't credited to it");

    // Losses and abandoned runs are recorded separately.
    const lost = uid(), quit = uid();
    await call("POST", "/sync", s2.token, { events: battleEvents(lost, { world: 0, battle: 1, answers: [false, false, true], outcome: "lost" }) });
    await call("POST", "/sync", s2.token, { events: [battleEvents(quit, { answers: [true], outcome: "won" })[0], { id: uid(), type: "session.abandon", at: Date.now(), sessionId: quit }] });
    sum = await call("GET", `/classes/${cls.id}/summary`, T);
    eq(sum.body.recent.find((r: any) => r.id === lost)?.outcome, "lost", "losses recorded");
    eq(sum.body.recent.find((r: any) => r.id === quit)?.outcome, "abandoned", "abandoned run is not a completed battle");
    const ben = sum.body.students.find((s: any) => s.username === "ben_student");
    eq([ben.wins, ben.losses, ben.abandoned], [3, 2, 1], "roster counts wins, losses and abandoned runs separately");

    // A device whose clock is 10 minutes slow: times are corrected, so play right after joining
    // is still shared (it would look like it happened before the join otherwise).
    const skewKid = await signup("skew_kid");
    await call("POST", "/join", skewKid.token, { code: rotated.body.class.joinCode });
    const slow = uid();
    const slowEvents = battleEvents(slow, { world: 0, battle: 0, answers: [true], outcome: "won" }).map((e: any) => ({ ...e, at: e.at - 600_000 }));
    await fetch(`${BASE}/sync`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${skewKid.token}` }, body: JSON.stringify({ events: slowEvents, sentAt: Date.now() - 600_000 }) });
    ok((await call("GET", `/classes/${cls.id}/summary`, T)).body.recent.some((r: any) => r.id === slow), "a device with a slow clock still shares play made after joining");

    // ---- sharing policy ----
    await call("PATCH", `/classes/${cls.id}/membership`, s2.token, { sharePlay: false });
    sum = await call("GET", `/classes/${cls.id}/summary`, T);
    ok(!sum.body.recent.some((r: any) => r.id === other), "turning sharing off hides unassigned play");
    eq((await call("GET", `/classes/${cls.id}/sessions/${other}`, T)).status, 200, "a run that earned assignment credit stays viewable even with sharing off");
    eq((await call("GET", `/classes/${cls.id}/sessions/${other}`, T2)).status, 404, "but never by another teacher");
    await call("PATCH", `/classes/${cls.id}/membership`, s2.token, { sharePlay: true });
    await call("POST", `/classes/${cls.id}/leave`, s2.token);
    const afterLeave = uid();
    await call("POST", "/sync", s2.token, { events: battleEvents(afterLeave, { world: 0, battle: 2, answers: [true], outcome: "won" }) });
    sum = await call("GET", `/classes/${cls.id}/summary`, T);
    ok(!sum.body.recent.some((r: any) => r.id === afterLeave), "leaving stops future sharing");
    ok(sum.body.formerMembers.some((m: any) => m.name === "ben student"), "former member listed");
    ok((await call("GET", `/classes/${cls.id}/students/${s2.me.id}`, T)).body.sessions.some((s: any) => s.id === lost), "history from the enrollment period is retained");

    // ---- feedback ----
    const fb = await call("POST", `/classes/${cls.id}/feedback`, T, { studentId: s1.me.id, body: "Nice work on casting!", sessionId: sid });
    eq(fb.status, 201, "feedback saved");
    home = await call("GET", "/student/home", s1.token);
    ok(home.body.feedback.some((f: any) => f.body === "Nice work on casting!"), "student sees feedback");
    ok(!(await call("GET", "/student/home", outsider.token)).body.feedback.length, "other students don't");
    eq((await call("PATCH", `/feedback/${fb.body.feedback.id}`, T2, { body: "hijack" })).status, 404, "other teacher can't edit feedback");
    eq((await call("POST", `/classes/${cls.id}/feedback`, T, { studentId: outsider.me.id, body: "x" })).status, 404, "can't leave feedback for a non-member");

    // ---- assignment editing policy ----
    eq((await call("PATCH", `/assignments/${asg.body.assignment.id}`, T, { target: { kind: "battles", battles: [[1, 0]] } })).status, 409, "targets locked once work exists");
    const edited = await call("PATCH", `/assignments/${asg.body.assignment.id}`, T, { title: "Beat Byte Raider (updated)" });
    eq(edited.body.assignment.version, 2, "editing bumps the version");
    eq((await call("DELETE", `/assignments/${asg.body.assignment.id}`, T)).status, 409, "can't delete an assignment with work");
    eq((await call("DELETE", `/assignments/${draft.body.assignment.id}`, T)).status, 200, "draft deleted");

    // ---- export ----
    const ex = await call("GET", `/classes/${cls.id}/export?student=${s1.me.id}&topic=Casting`, T);
    ok(ex.body.attempts.length > 0 && ex.body.attempts.every((a: any) => a.skill === "Casting" && a.studentName === "Ava"), "export filters by student and topic");

    // ---- cross-device progress ----
    const doc = { avatar: {}, xp: 50, coins: 10, streak: 1, lastActiveDay: "2026-10-31", stars: { "w0-b0": 2 }, inventory: {}, owned: [], stats: {}, skills: {}, imports: [], updatedAt: Date.now() };
    eq((await call("PUT", "/progress", s1.token, { baseVersion: 0, doc })).body.version, 1, "progress saved");
    eq((await call("PUT", "/progress", s1.token, { baseVersion: 0, doc })).body.conflict, true, "stale write is a conflict, not an overwrite");
    const device2 = await call("POST", "/auth/login", undefined, { username: "ava_student", password: "correct-horse-1" });
    eq((await call("GET", "/progress", device2.body.token)).body.doc.stars, { "w0-b0": 2 }, "second device loads progress");
    eq((await call("GET", "/progress", s2.token)).body.doc, null, "progress is per account");

    // ---- archive ----
    await call("POST", `/classes/${cls.id}/archive`, T, { archived: true });
    eq((await call("POST", "/join", (await signup("too_late")).token, { code: rotated.body.class.joinCode })).body.error, "class_closed", "archived class stops enrollment");
    eq((await call("POST", `/classes/${cls.id}/assignments`, T, { title: "x", target: { kind: "battles", battles: [[0, 1]] }, status: "published" })).status, 409, "archived class can't publish");
    ok((await call("GET", `/classes/${cls.id}/summary`, T)).body.recent.length > 0, "archived class keeps its history");

    // ---- sign out ----
    await call("POST", "/auth/logout", s1.token);
    eq((await call("GET", "/me", s1.token)).status, 401, "signed-out token stops working");
    ok((await call("GET", "/me", device2.body.token)).status === 200, "other device stays signed in");
    eq((await call("POST", "/auth/login", undefined, { username: "ava_student", password: "wrong" })).status, 401, "wrong password");

    ws.close();
    ws2.close();
    console.log(`classroom tests passed: ${checks} checks (auth, roles, provisioning, enrollment, isolation, ingestion, idempotency, sharing, assignments, feedback, export, progress, live updates)`);
  } finally {
    stop(proc);
    rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=classroom tests::${String(e?.message || e).replace(/\n/g, " ").slice(0, 900)}`);
  process.exit(1);
});
