// Learn Mode, tutor server and sound engine tests (no browser needed).
import assert from "node:assert/strict";
import { LESSONS, gensForSkill, isCspSkill, lessonsFor } from "../src/lib/learn/lessons";
import { DIFFICULTY, buildPracticeSet, describeForTutor, fingerprint, followUp, type PracticeItem } from "../src/lib/learn/practice";
import { LEVEL_LABEL, levelFor, recentMistakes, recommend, skillEvidence, tutorContext } from "../src/lib/learn/insights";
import { DEFAULT_PREFS, type Attempt, type LearnProfile, type Progress } from "../src/lib/db";
import { isRight } from "../src/lib/questions/core";
import { handle, resetRateLimits } from "../tutor-server/src/handler";
import { parseGrade, LIMITS } from "../tutor-server/src/protocol";
import { ProviderError, providerFromEnv, workersAI, type Provider } from "../tutor-server/src/providers";
import { systemPrompt } from "../tutor-server/src/prompt";
import { fitHistory } from "../src/lib/tutor/client";
import { PLAYER_MOVESETS } from "../src/lib/playerCombat";
import { ENEMY_MOVESETS } from "../src/lib/enemyCombat";

let checks = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); checks++; };

// ---------- lessons ----------
const ids = new Set<string>();
for (const l of LESSONS) {
  ok(!ids.has(l.id), `duplicate lesson id ${l.id}`);
  ids.add(l.id);
  ok(l.objective && l.body.length >= 2 && l.example.steps.length >= 2 && l.misconception.wrong && l.misconception.right && l.prompts.length >= 2, `${l.id}: lesson is missing a required part`);
  ok(l.skills.length >= 3, `${l.id}: needs at least three bank skills`);
  for (const s of l.skills) ok(gensForSkill(s).length > 0, `${l.id}: unknown skill ${s}`);
  // CSA lessons never pull CSP pseudocode and vice versa.
  for (const s of l.skills) ok(l.course === "csp" || !s.startsWith("CSP "), `${l.id}: CSA lesson includes CSP skill ${s}`);
  if (l.course === "csp") {
    ok(typeof l.example.reference === "function", `${l.id}: CSP example needs a reference`);
    assert.equal(l.example.reference!(), l.example.output, `${l.id}: CSP example output disagrees with its reference program`);
    checks++;
    ok(!/\[0\]/.test(l.example.code), `${l.id}: CSP example uses index 0`);
  }
  for (const q of l.extras) {
    ok(q.prompt && q.hint && q.explain, `${l.id}: extra question missing text`);
    if (q.kind === "choice") {
      ok(q.options?.length === 4 && new Set(q.options).size === 4, `${l.id}: ${q.skill} needs four distinct options`);
      ok(isRight(q, q.correct!), `${l.id}: ${q.skill} grading`);
      ok([0, 1, 2, 3].filter((i) => isRight(q, i)).length === 1, `${l.id}: ${q.skill} exactly one right option`);
    }
    if (l.course === "csp") {
      ok(typeof q.reference === "function", `${l.id}: CSP extra ${q.skill} needs a reference`);
      assert.equal(q.reference!(), q.options![q.correct!], `${l.id}: ${q.skill} answer key disagrees with its reference program`);
      checks++;
    }
  }
  for (const t of l.explain || []) ok(t.keyPoints.length >= 2 && t.model && t.prompt, `${l.id}: explain task incomplete`);
}
ok(lessonsFor("csa").length >= 12 && lessonsFor("csp").length >= 6, "lesson counts");

// ---------- practice ----------
for (const l of LESSONS) {
  for (const d of DIFFICULTY) {
    for (const seed of [1, 2, 3]) {
      const set = buildPracticeSet({ course: l.course, lessonId: l.id, difficulty: d.id, count: 5, seed });
      ok(set.length >= 3, `${l.id}/${d.id}: practice set too small (${set.length})`);
      const fps = set.flatMap((i) => (i.type === "question" ? [fingerprint(i.q)] : []));
      ok(new Set(fps).size === fps.length, `${l.id}/${d.id}: repeated question in one set`);
      ok(set[0].type === "question" && (set[0] as { q: { kind: string } }).q.kind !== "order", `${l.id}: set opens with an order puzzle or explanation`);
      ok(set.filter((i) => i.type === "explain").length <= 1, `${l.id}: more than one written task`);
      for (const it of set) {
        if (it.type !== "question") continue;
        const q = it.q;
        if (l.course === "csa") ok(!isCspSkill(q.skill) || !q.skill.startsWith("CSP"), `${l.id}: CSA practice served CSP skill ${q.skill}`);
        // Unanswered descriptions never leak the answer key.
        const hidden = describeForTutor(it, false);
        ok(!hidden.includes("Verified correct answer"), `${l.id}: answer leaked before answering`);
      }
    }
  }
}
// Course-wide sets stay in their course.
for (const seed of [4, 5, 6]) {
  for (const it of buildPracticeSet({ course: "csp", count: 8, seed })) if (it.type === "question") ok(LESSONS.some((l) => l.course === "csp" && (l.skills.includes(it.q.skill) || l.extras.some((e) => e.skill === it.q.skill))), `CSP set served non-CSP skill ${it.q.skill}`);
}
// Focused practice on one skill uses only that skill when it has questions.
const focus = buildPracticeSet({ course: "csa", lessonId: "csa-substring", skill: "substring(a, b)", count: 3, seed: 9 });
ok(focus.every((i) => i.type !== "question" || i.q.skill === "substring(a, b)"), "skill focus leaked other skills");
// Follow-ups test the same idea.
const seen = new Set<string>();
for (const l of LESSONS) {
  const [first] = buildPracticeSet({ course: l.course, lessonId: l.id, count: 1, seed: 11, includeExplain: false });
  if (!first || first.type !== "question") continue;
  seen.add(fingerprint(first.q));
  const f = followUp(first, l.course, seen, 12);
  ok(f && f.type === "question", `${l.id}: no follow-up available`);
  if (f && f.type === "question") {
    ok(f.lessonId === l.id || f.q.skill === first.q.skill, `${l.id}: follow-up left the lesson`);
    ok(fingerprint(f.q) !== fingerprint(first.q), `${l.id}: follow-up repeated the missed question`);
  }
}
const sub = buildPracticeSet({ course: "csa", lessonId: "csa-substring", skill: "substring(a, b)", count: 1, seed: 3 })[0] as Extract<PracticeItem, { type: "question" }>;
const subFollow = followUp(sub, "csa", new Set([fingerprint(sub.q)]), 5) as Extract<PracticeItem, { type: "question" }>;
ok(subFollow.q.skill === "substring(a, b)", "substring endpoint miss should be followed by another substring(a, b) question");

// ---------- insights ----------
const ev = (right: number, missed: number) => ({ right, missed, n: right + missed });
assert.equal(levelFor(ev(2, 1)), "none");
assert.equal(levelFor(ev(1, 4)), "practice");
assert.equal(levelFor(ev(5, 1)), "growing"); // 83%, not yet strong
assert.equal(levelFor(ev(6, 0)), "strong");
assert.equal(LEVEL_LABEL.none, "Not enough data yet");
checks += 5;
const progress = { id: "u", xp: 0, coins: 0, streak: 1, lastActiveDay: "", stars: {}, inventory: {}, owned: [], stats: { battles: 0, wins: 0, losses: 0, questions: 0, firstTry: 0, bosses: 0 }, skills: { "Integer division": [2, 1] as [number, number] }, updatedAt: 0 } satisfies Progress;
const now = Date.now();
const attempt = (skill: string, firstTry: boolean, source: Attempt["source"], at: number): Attempt => ({ accountId: "u", at, source, course: "csa", world: 0, skill, kind: "predict", qid: "x", correct: firstTry, firstTry, prompt: "What does this print?", given: "3.5", expected: "3" });
const attempts = [attempt("Integer division", false, "battle", now - 1000), attempt("Integer division", true, "practice", now - 500), attempt("substring(a, b)", false, "practice", now - 200)];
const e = skillEvidence(progress, attempts).get("Integer division")!;
assert.deepEqual(e, { right: 3, missed: 1, n: 4 }, "battle attempts are not double counted");
checks++;
const misses = recentMistakes(attempts, "csa");
ok(misses[0].skill === "substring(a, b)", "newest mistake first");
const profile: LearnProfile = { id: "u", course: "csa", prefs: { ...DEFAULT_PREFS }, lessons: {}, recent: [], updatedAt: 0 };
const recs = recommend(profile, progress, attempts);
ok(recs[0].kind === "mistake" && recs[0].skill === "substring(a, b)", "unfixed recent mistake is recommended first");
ok(!recs.some((r) => r.kind === "mistake" && r.skill === "Integer division"), "a mistake fixed later is not recommended");
const ctx = tutorContext(profile, progress, attempts);
ok(!JSON.stringify(ctx).includes('"u"') && ctx.recentMistakes.includes("substring(a, b)"), "tutor context is minimal and includes mistakes");

// ---------- tutor protocol ----------
ok(parseGrade('{"verdict":"partial","feedback":"Close.","missing":["x"]}')?.verdict === "partial", "grade parses");
ok(parseGrade('Sure! {"verdict":"correct","feedback":"Good."}')?.verdict === "correct", "grade inside prose parses");
ok(parseGrade('{"verdict":"great","feedback":"x"}') === null, "unknown verdict rejected");
ok(parseGrade("no json here") === null, "missing JSON rejected");
ok(parseGrade({ verdict: "correct", feedback: "" }) === null, "empty feedback rejected");
const long = Array.from({ length: 30 }, (_, i) => ({ role: (i % 2 ? "assistant" : "user") as "user" | "assistant", content: "x".repeat(i === 29 ? 9000 : 1500) }));
const fit = fitHistory(long);
ok(fit.length <= LIMITS.maxMessages && fit[0].role === "user" && fit.reduce((n, m) => n + m.content.length, 0) <= LIMITS.maxTotalChars, "history trimmed to limits");
const sys = systemPrompt({ course: "csp", prefs: { length: "steps", level: "exam", style: "direct" } }, "chat");
ok(sys.includes("indexed from 1") && sys.includes("step by step") && sys.includes("Never claim code was compiled"), "system prompt reflects course and preferences");

// ---------- tutor server ----------
const okProvider = (reply: string, delay = 0): Provider => ({ name: "test", model: "t", complete: ({ signal }) => new Promise((res, rej) => { const t = setTimeout(() => res(reply), delay); signal.addEventListener("abort", () => { clearTimeout(t); rej(new ProviderError("timeout", "slow")); }); }) });
const origin = "http://localhost:4321";
const post = (body: unknown, extra: Record<string, string> = {}) => new Request("http://x/v1/tutor", { method: "POST", headers: { origin, "content-type": "application/json", ...extra }, body: JSON.stringify(body) });
const chat = (content: string) => ({ mode: "chat", messages: [{ role: "assistant", content: "hello" }, { role: "user", content }], context: { course: "csa", prefs: {}, focus: "q", learner: { recentMistakes: ["a"] } } });

async function server() {
  const env = { ALLOWED_ORIGINS: origin, RATE_PER_10MIN: "5", TIMEOUT_MS: "200" };
  resetRateLimits();
  let r = await handle(new Request("http://x/v1/health", { headers: { origin } }), env, "a", okProvider("x"));
  ok(r.status === 200 && (await r.json()).ok === true, "health reports a provider");
  r = await handle(new Request("http://x/v1/health"), {}, "a");
  ok((await r.json()).ok === false, "health with no key says not configured");
  r = await handle(post(chat("hi")), {}, "a");
  ok(r.status === 503, "no provider configured gives 503");
  r = await handle(post(chat("hi"), { origin: "https://evil.example" }), env, "a", okProvider("x"));
  ok(r.status === 403, "unknown origin is refused");
  r = await handle(post(chat("hi")), env, "a", okProvider("Here you go"));
  let j = await r.json();
  ok(r.status === 200 && j.reply === "Here you go" && r.headers.get("access-control-allow-origin") === origin, "chat works with CORS");
  r = await handle(post({ mode: "chat", messages: [{ role: "user", content: "x".repeat(LIMITS.maxMessageChars + 1) }], context: { course: "csa", prefs: {} } }), env, "b", okProvider("x"));
  ok(r.status === 413, "oversized message refused");
  r = await handle(post({ mode: "chat", messages: [], context: { course: "csa", prefs: {} } }), env, "b", okProvider("x"));
  ok(r.status === 400, "empty conversation refused");
  r = await handle(post({ mode: "chat", messages: [{ role: "user", content: "hi" }], context: { course: "java" } }), env, "b", okProvider("x"));
  ok(r.status === 400, "invalid course refused");
  r = await handle(new Request("http://x/v1/tutor", { method: "POST", headers: { origin }, body: "{not json" }), env, "b", okProvider("x"));
  ok(r.status === 400, "invalid JSON refused");
  r = await handle(post(chat("slow")), env, "c", okProvider("late", 1000));
  ok(r.status === 504 && (await r.json()).error === "timeout", "slow provider times out");
  r = await handle(post({ mode: "grade", context: { course: "csa", prefs: {} }, task: { prompt: "p", keyPoints: ["a", "b"], model: "m" }, answer: "my answer" }), env, "d", okProvider("not json at all"));
  ok(r.status === 502 && (await r.json()).error === "malformed", "malformed grade rejected");
  r = await handle(post({ mode: "grade", context: { course: "csa", prefs: {} }, task: { prompt: "p", keyPoints: ["a", "b"], model: "m" }, answer: "my answer" }), env, "d", okProvider('{"verdict":"incorrect","feedback":"Missing the copy idea.","missing":["a"]}'));
  j = await r.json();
  ok(r.status === 200 && j.grade.verdict === "incorrect", "valid grade passes");
  // rate limit: 5 per 10 minutes for one client
  for (let i = 0; i < 5; i++) await handle(post(chat(`n${i}`)), env, "rl", okProvider("x"));
  r = await handle(post(chat("one too many")), env, "rl", okProvider("x"));
  ok(r.status === 429 && Number(r.headers.get("retry-after")) > 0, "rate limited with Retry-After");
  r = await handle(post(chat("other student")), env, "rl2", okProvider("x"));
  ok(r.status === 200, "other clients unaffected");
  // provider errors map to clear codes
  const failing = (kind: ProviderError["kind"]): Provider => ({ name: "f", model: "f", complete: async () => { throw new ProviderError(kind, "x"); } });
  r = await handle(post(chat("x")), env, "e", failing("unavailable"));
  ok(r.status === 503, "provider outage is 503");
  r = await handle(post(chat("x")), env, "e2", failing("rate_limited"));
  ok(r.status === 429, "provider rate limit is 429");
  // Free Cloudflare Workers AI provider (binding, no key).
  const fakeAI = (impl: (m: string, i: Record<string, unknown>) => Promise<unknown>) => ({ run: impl });
  const wa = providerFromEnv({ AI: fakeAI(async () => ({ response: "ok" })) });
  ok(wa?.name === "workers-ai" && wa.model.includes("mistral"), "Workers AI is the default when the binding exists");
  let seenInput: Record<string, unknown> = {};
  r = await handle(post(chat("hi")), env, "w1", workersAI(fakeAI(async (_m, i) => { seenInput = i; return { response: "Free reply" }; }), "@cf/test"));
  ok(r.status === 200 && (await r.json()).reply === "Free reply", "Workers AI reply returned");
  ok(Array.isArray(seenInput.messages) && (seenInput.messages as { role: string }[])[0].role === "system", "system prompt sent as first message");
  r = await handle(post(chat("hi")), env, "w2", workersAI(fakeAI(async () => { throw new Error("4006: you have used up your daily free allocation of 10,000 neurons"); }), "@cf/test"));
  j = await r.json();
  ok(r.status === 429 && /resets tomorrow/.test(j.message), "used-up free allowance explained");
  r = await handle(post(chat("hi")), env, "w3", workersAI(fakeAI(async () => ({ response: "" })), "@cf/test"));
  ok(r.status === 502, "empty Workers AI reply is malformed");
  r = await handle(post(chat("hi")), env, "w4", workersAI(fakeAI(() => new Promise(() => {})), "@cf/test"));
  ok(r.status === 504, "hung Workers AI call times out");
}

// ---------- sound engine ----------
async function sounds() {
  // A minimal fake Web Audio API: enough to build every sound graph and catch runtime errors.
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime(v: number) { if (!(v > 0)) throw new Error(`exponential ramp to ${v}`); } });
  let started = 0;
  const node = () => ({ connect(n: unknown) { return n; }, disconnect() {} });
  const source = () => ({ ...node(), start() { started++; }, stop() {}, onended: null as unknown, frequency: param(), detune: param(), type: "", buffer: null as unknown, loop: false });
  class FakeCtx {
    currentTime = 1; sampleRate = 8000; state = "running"; destination = node();
    createGain() { return { ...node(), gain: param() }; }
    createOscillator() { return source(); }
    createBufferSource() { return source(); }
    createBiquadFilter() { return { ...node(), type: "", frequency: param(), Q: param() }; }
    createStereoPanner() { return { ...node(), pan: param() }; }
    createDynamicsCompressor() { return { ...node(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }; }
    createBuffer(_c: number, n: number) { return { getChannelData: () => new Float32Array(n) }; }
    resume() { return Promise.resolve(); }
  }
  const store: Record<string, string> = {};
  Object.assign(globalThis, { window: { AudioContext: FakeCtx }, localStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } } });
  const sfx = await import("../src/lib/sfx");
  const names = ["click", "coin", "buy", "potion", "level", "victory", "defeat", "right", "wrong", "whoosh", "slash", "crit", "hit", "hurt", "shield", "bladeSwing", "bladeImpact", "scytheSweep", "scytheHook", "scytheImpact", "hammerSwing", "hammerImpact", "groundSlam", "glaiveThrust", "glaiveSpin", "glaiveImpact", "comboHit", "launcher", "airHit", "critLayer", "finisherCharge", "suspense", "finisherRelease", "knockout", "enemyGrowl", "enemyRush", "enemySweep", "enemyRise", "enemyDive", "enemyVolley", "enemyOrbit", "enemyBeam", "enemySnare", "enemyQuake", "enemyBlink", "enemySummon", "enemyVortex", "enemyImpact", "block", "sealBreak", "chamberOpen", "learnRight", "learnWrong", "milestone"] as const;
  for (const n of names) {
    const before = started;
    sfx.stopAll();
    sfx.play(n, { pan: 0.2, index: 2 });
    ok(started > before, `sound ${n} produced no voices`);
  }
  // Mute blocks everything.
  sfx.setMuted(true);
  const before = started;
  sfx.play("crit");
  ok(started === before, "muted sounds still played");
  sfx.setMuted(false);
  // Every weapon move and enemy choreography maps to a defined sound.
  const combat = await import("../src/lib/combatSfx");
  for (const moves of Object.values(PLAYER_MOVESETS)) for (const m of moves) { sfx.stopAll(); combat.heroPhase(m, "charge"); combat.heroPhase(m, "strike"); combat.heroImpact(m, true); }
  for (const set of Object.values(ENEMY_MOVESETS)) for (const m of [...set.attacks, set.finisher]) { sfx.stopAll(); combat.enemyPhase(m, "telegraph"); combat.enemyPhase(m, "travel"); combat.enemyImpact(m, false); combat.enemyImpact(m, true); }
  for (const stage of ["stagger", "launch", "juggle", "freeze"]) combat.contactSound("hero", stage, 1);
  checks++;
}

(async () => {
  await server();
  await sounds();
  console.log(`learn tests passed: ${LESSONS.length} lessons, ${checks} checks (lessons, practice, insights, tutor server, sounds)`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
