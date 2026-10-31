import assert from "node:assert";
import { advance, answer, current, startBattle, summary, useShield, useSurge } from "../src/lib/battle";
import { buildBattle, isRight, questionFingerprint, freshBattleQuestions, difficultyTargets } from "../src/lib/questions/index";

const qs = buildBattle(0, 0, 1);
// 1) all right: enemy falls, possibly early from combos
let s = startBattle(0, 0, qs);
let turns = 0;
while (!s.over) { s = answer(s, true).state; if (!s.over) s = advance(s); turns++; }
assert.equal(s.over, "victory"); assert.ok(turns <= 5);
assert.deepEqual(summary(s).firstTry, summary(s).total);
// 2) first try wrong then right: one hit taken, retry event
s = startBattle(0, 0, qs);
let r = answer(s, false);
assert.deepEqual(r.events.map((e) => e.type), ["hurt", "retry"]);
assert.equal(r.state.playerHp, 100 - 16);
r = answer(r.state, true);
assert.equal(r.events[0].type, "attack"); assert.equal((r.events[0] as { damage: number }).damage, 60);
// 3) Two misses reveal the answer; a later round must use fresh content.
s = startBattle(0, 0, qs);
s = answer(s, false).state; r = answer(s, false);
assert.deepEqual(r.events.map((e) => e.type), ["hurt", "reveal"]);
s = r.state; for (let i = 0; i < 4; i++) { s = advance(s); s = answer(s, true).state; }
assert.ok(!s.over || s.over === "victory");
if (!s.over) { s = advance(s); assert.equal(s.round, 1); assert.ok(s.queue.every(i => i >= qs.length)); assert.ok(!qs.some(q => questionFingerprint(q) === questionFingerprint(current(s)))); s = answer(s, true).state; assert.equal(s.over, "victory"); }
// 4) shield blocks, surge doubles
s = useShield(startBattle(0, 0, qs)); r = answer(s, false);
assert.equal(r.state.playerHp, 100); assert.equal((r.events[0] as { blocked: boolean }).blocked, true);
s = useSurge(startBattle(0, 0, qs)); r = answer(s, true);
assert.equal((r.events[0] as { damage: number }).damage, 200);
// 5) enough misses knock you out
s = startBattle(6, 4, buildBattle(6, 4, 3));
let hits = 0; while (!s.over) { const x = answer(s, false); s = x.state; hits++; if (!s.over && x.events.some((e) => e.type === "reveal")) s = advance(s); }
assert.equal(s.over, "defeat"); assert.equal(hits, 3);
// 6) isRight for each kind
for (const q of buildBattle(2, 4, 9)) {
  const ans = q.kind === "choice" ? q.correct! : q.kind === "order" ? q.lines! : q.answers![0];
  assert.ok(isRight(q, ans as never), q.skill);
}
assert.ok(current(startBattle(0, 0, qs)));
console.log("battle tests passed");

// Every encounter keeps its size, skill variety, uniqueness, and difficulty quota.
for (let w = 0; w < 7; w++) for (let b = 0; b < 5; b++) for (let seed = 0; seed < 40; seed++) {
  const initial = buildBattle(w, b, seed);
  assert.equal(initial.length, b === 4 ? 8 : 5);
  assert.equal(new Set(initial.map(questionFingerprint)).size, initial.length);
  assert.equal(new Set(initial.map(q => q.skill)).size, initial.length);
  assert.deepEqual([0, 1, 2].map(t => initial.filter(q => q.tier === t).length), difficultyTargets(w, b, initial.length));
  const history = [...initial];
  for (let round = 0; round < 3; round++) {
    const fresh = freshBattleQuestions(w, b, seed + round * 97, 5, history);
    assert.equal(fresh.length, 5);
    const used = new Set(history.map(questionFingerprint));
    assert.ok(fresh.every(q => !used.has(questionFingerprint(q))));
    history.push(...fresh);
  }
}
let previous = -1;
for (let w = 0; w < 7; w++) {
  const mix = difficultyTargets(w, 0, 100);
  const score = mix[1] + 2 * mix[2];
  assert.ok(score > previous);
  previous = score;
}
// Same displayed choice with a different ID / option order is still a repeat.
const choiceA = { ...qs[0], kind: "choice" as const, options: ["a", "b", "c", "d"] };
assert.equal(questionFingerprint(choiceA), questionFingerprint({ ...choiceA, id: "new", options: ["d", "c", "a", "b"] }));
console.log("campaign progression and fresh-question regression tests passed");
