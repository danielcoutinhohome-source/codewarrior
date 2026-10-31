import assert from "node:assert/strict";
import { BANKS, VARIANT_BANKS, buildBattle, freshBattleQuestions, isRight, questionContentKey, questionFingerprint, rng } from "../src/lib/questions";
import { buildHistory } from "../src/lib/questions/history";
import { W6 } from "../src/lib/questions/worlds-b";
import { ALGORITHMS } from "../src/lib/questions/ap-algorithms";
import { W6_MORE } from "../src/lib/questions/more-w7";

let templates = 0, generated = 0, minimumUnique = 200;
for (const [world, bank] of VARIANT_BANKS.entries()) {
  assert.equal(bank.length, 12);
  assert.deepEqual([0, 1, 2].map(t => bank.filter(g => g.tier === t).length), [3, 6, 3]);
  for (const g of bank) {
    templates++;
    const content = new Set<string>(), answers = new Set<string>(), positions = new Set<number>(), fillShapes = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const q = g.make(rng(seed + 271));
      const repeated = g.make(rng(seed + 271));
      assert.equal(questionFingerprint(q), questionFingerprint(repeated), "Seeds reproduce displayed content");
      assert.deepEqual(q.answers, repeated.answers); assert.equal(q.correct, repeated.correct);
      assert.ok(q.java, `Every generated case has an executable reference: ${g.skill}`);
      assert.equal(q.skill, g.skill, "Preserve topic-based progress and lesson integration");
      const right = q.kind === "choice" ? q.correct! : q.answers![0];
      assert.ok(isRight(q, right));
      content.add(questionContentKey(q)); answers.add(String(q.kind === "choice" ? q.options![q.correct!] : q.answers![0]));
      if (q.kind === "choice") {
        assert.equal(new Set(q.options).size, 4); positions.add(q.correct!);
        if (world === 1) {
          const branchValues = [...q.java!.src.matchAll(/result = (-?\d+)/g)].map(m => m[1]);
          assert.ok(branchValues.every(v => q.options!.includes(v)), "Include alternative branch outcomes so options do not reveal the answer without tracing");
        }
      }
      if (q.kind === "fill") {
        assert.ok(q.code?.includes("___"));
        assert.ok(q.literalAnswer);
        fillShapes.add(q.code!.split("\n").filter(line => line.includes("___")).join("\n").replace(/"[^"\n]*"/g, '"text"').replace(/-?\d+/g, "N"));
        const answer = q.answers![0];
        assert.equal(isRight(q, answer.startsWith('"') ? answer.slice(1, -1) : '"' + answer + '"'), false, "Literal blanks distinguish String literals from numbers/identifiers");
      }
      generated++;
    }
    minimumUnique = Math.min(minimumUnique, content.size);
    assert.ok(content.size >= 140, `${world}:${g.skill}: insufficient varied programs (${content.size}/200)`);
    assert.ok(answers.size >= 4, `${world}:${g.skill}: answers should change too`);
    if (positions.size) assert.equal(positions.size, 4, "Correct choices are shuffled across every position");
    if (fillShapes.size) assert.ok(fillShapes.size >= 2, "Blanks vary their operation/placement as well as the requested output");
  }
  assert.equal(BANKS[world].length, 112);
  assert.deepEqual([0, 1, 2].map(t => BANKS[world].filter(g => g.tier === t).length), [28, 56, 28]);

  // Both correct and incorrect recent content is excluded, not just fresh IDs.
  let attempts: { skill: string; firstTry: boolean; at: number; kind: "predict" | "choice" | "fill" | "order"; prompt: string; code?: string }[] = [];
  for (let encounter = 0; encounter < 30; encounter++) {
    const history = buildHistory(attempts);
    const qs = buildBattle(world, encounter % 5, 2026 + encounter, history);
    assert.equal(qs.length, encounter % 5 === 4 ? 8 : 5);
    assert.equal(new Set(qs.map(q => q.skill)).size, qs.length);
    assert.ok(qs.every(q => !history.recentContent!.has(questionContentKey(q))), "No recent correct or incorrect display returns");
    const fresh = freshBattleQuestions(world, encounter % 5, 3000 + encounter, 5, qs, history);
    assert.equal(fresh.length, 5);
    assert.ok(fresh.every(q => !qs.some(old => questionFingerprint(old) === questionFingerprint(q))));
    assert.ok(fresh.every(q => !history.recentContent!.has(questionContentKey(q))));
    attempts.push(...qs.map((q, i) => ({ skill: q.skill, firstTry: i % 2 === 0, at: attempts.length + i, kind: q.kind, prompt: q.prompt, code: q.code })));
  }
  const history = buildHistory(attempts);
  assert.ok(history.recentContent!.size <= 100);
  assert.ok(buildBattle(world, 0, 2026, buildHistory([{ skill: "legacy", at: 1, firstTry: false }])).length === 5);
}
// World 7 is precisely the same generator list; no new content or harder scope leaks into it.
assert.deepEqual(BANKS[6], [...W6, ...ALGORITHMS, ...W6_MORE]);
assert.equal(BANKS[6].length, 100);
console.log(`Question variety passed: ${templates} templates, ${generated} cases, minimum ${minimumUnique}/200 distinct displays per template; 180 simulated encounters and legacy history checks.`);
