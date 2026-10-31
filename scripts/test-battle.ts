import assert from "node:assert";
import { advance, answer, current, startBattle, summary, useShield, useSurge } from "../src/lib/battle";
import { buildBattle, isRight } from "../src/lib/questions/index";

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
// 3) two misses reveal and the question comes back later
s = startBattle(0, 0, qs);
s = answer(s, false).state; r = answer(s, false);
assert.deepEqual(r.events.map((e) => e.type), ["hurt", "reveal"]);
s = r.state; for (let i = 0; i < 4; i++) { s = advance(s); s = answer(s, true).state; }
assert.ok(!s.over || s.over === "victory");
if (!s.over) { s = advance(s); assert.equal(s.round, 1); assert.deepEqual(s.queue, [0]); s = answer(s, true).state; assert.equal(s.over, "victory"); }
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
