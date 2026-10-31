import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ENEMY_DESIGNS, WORLDS } from "../src/lib/game";
import { ENEMY_MOVESETS, enemyMove, performEnemyMove, type AttackContext } from "../src/lib/enemyCombat";
import EnemyAttackFx, { EnemyGlyph } from "../src/components/EnemyAttackFx";
import WorldLandmark, { WorldDiscovery, WorldGroundDetails } from "../src/components/WorldLandmark";
import WorldScene from "../src/components/WorldScene";
import { worldDetails } from "../src/lib/worldDetails";
Object.assign(globalThis, { React });

async function main() {
  assert.deepEqual(Object.keys(ENEMY_MOVESETS), [...ENEMY_DESIGNS]);
  const names = new Set<string>(), finales = new Set<string>();
  let renderCount = 0, runs = 0;
  for (const enemy of WORLDS.flatMap(w => w.enemies)) {
    const set = ENEMY_MOVESETS[enemy.design];
    assert.equal(new Set(set.attacks.map(m => m.motion)).size, 3, `${enemy.design} needs three movement patterns`);
    for (let i = 0; i < 9; i++) assert.equal(enemyMove(enemy.design, i), set.attacks[i % 3]);
    assert.equal(enemyMove(enemy.design, 2, true), set.finisher);
    for (const move of [...set.attacks, set.finisher]) {
      assert.ok(!names.has(move.name), move.name); names.add(move.name);
      const glyph = renderToStaticMarkup(<svg><EnemyGlyph design={enemy.design} variant={move.glyph} color={enemy.accent} base={enemy.color}/></svg>);
      assert.ok(glyph.includes("<path") && !/NaN|undefined/.test(glyph));
      if (move.glyph === 3) { assert.ok(!finales.has(glyph), `${enemy.design} finisher art must be unique`); finales.add(glyph); }
      for (const reducedMotion of [false, true]) {
        let hits = 0; const phases: string[] = [];
        const ctx: AttackContext = { signal: new AbortController().signal, distance: 160, compact: false, reducedMotion,
          animate: async () => {}, wait: async () => {}, hit: () => { hits++; }, effect: phase => phases.push(phase) };
        assert.equal(await performEnemyMove(move, ctx), true);
        assert.equal(hits, 1, `${move.name} must trigger one visual hit`);
        assert.deepEqual(phases, reducedMotion ? ["telegraph", "impact"] : ["telegraph", "travel", "impact"]);
        runs++;
        for (const phase of ["telegraph", "travel", "impact", "defeat"] as const) {
          const svg = renderToStaticMarkup(<EnemyAttackFx fx={{ id: 1, enemy, move, phase, from: {x: 360, y: 140}, to: {x: 90,y:140}, compact: reducedMotion, reduced: reducedMotion }}/>);
          assert.ok(!/NaN|undefined/.test(svg)); renderCount++;
        }
      }
    }
  }
  assert.equal(names.size, 140); assert.equal(finales.size, 35);
  // Cancellation before impact and during reset must resolve without stale hits
  // or unhandled rejections. A new encounter must never inherit a delayed hit.
  for (const cancelAt of ["before", "windup", "travel", "reset"] as const) {
    const controller = new AbortController(); let hits = 0, calls = 0;
    if (cancelAt === "before") controller.abort();
    const ctx: AttackContext = { signal: controller.signal, distance: 100, compact: true, reducedMotion: false,
      animate: async () => { calls++; if ((cancelAt === "windup" && calls === 1) || (cancelAt === "reset" && calls === 3)) controller.abort(); },
      wait: async () => {}, hit: () => { hits++; }, effect: phase => { if (cancelAt === "travel" && phase === "travel") controller.abort(); } };
    await performEnemyMove(enemyMove("byte-raider", 0), ctx);
    assert.equal(hits, cancelAt === "reset" ? 1 : 0);
  }
  const interrupted = new AbortController();
  let interruptedHits = 0;
  const pending = performEnemyMove(enemyMove("byte-raider", 0), {
    signal: interrupted.signal, distance: 100, compact: false, reducedMotion: false,
    animate: () => new Promise(() => {}), wait: async () => {}, effect: () => {}, hit: () => { interruptedHits++; },
  });
  queueMicrotask(() => interrupted.abort());
  assert.equal(await pending, false, "An interrupted animation must resolve even if its animation promise never does");
  assert.equal(interruptedHits, 0);
  const worldShapes = new Set<string>();
  for (const world of WORLDS) {
    for (const mobile of [false,true]) {
      const layout = worldDetails(world.theme,mobile);
      const scene = renderToStaticMarkup(<WorldScene worldIndex={WORLDS.indexOf(world)} world={world} avatar={{ armor: "#6179A0", energy: "#58DFFF", title: "Byte Knight", aura: "storm", finish: "metal" }} stars={[]} unlocked={[true,true,true,true,true]} selected={0} onSelect={() => {}} height={560} width={mobile?390:1000}/>);
      assert.ok(!/NaN|undefined/.test(scene));
      assert.equal((scene.match(/data-landmark=/g)||[]).length,mobile?8:12);
      assert.equal((scene.match(/aria-label="Battle /g)||[]).length,4);
      assert.ok(scene.includes('aria-label="Boss:'));
      const ground = renderToStaticMarkup(<WorldGroundDetails theme={world.theme} width={mobile?390:1000} height={560}/>);
      assert.ok(!/NaN|undefined/.test(ground));
      assert.deepEqual(layout,worldDetails(world.theme,mobile));
      assert.equal(layout.props.length,mobile?60:96);
      assert.equal(layout.landmarks.length,mobile?8:12);
      assert.ok(layout.props.every(d=>Math.abs(d.lat)>=.92 && Number.isFinite(d.z) && world.theme.decor.includes(d.kind)));
      assert.ok(layout.landmarks.every(d=>Math.abs(d.lat)>=1.8));
      // Initial view, every encounter stop, and charge camera still have scenery.
      for (const cam of [0,.2,2,3.8,5.6,7.9,9.25]) {
        assert.ok(layout.props.filter(d=>d.z-cam>1 && d.z-cam<6).length>=8);
        assert.ok(layout.landmarks.some(d=>d.z-cam>1 && d.z-cam<6));
      }
    }
    for (let v=0;v<3;v++) {
      const svg = renderToStaticMarkup(<WorldLandmark theme={world.theme} variant={v}/>);
      assert.ok(!/NaN|undefined/.test(svg)); assert.ok(svg.includes('aria-hidden="true"'));
      assert.ok(!worldShapes.has(svg)); worldShapes.add(svg);
      assert.ok(renderToStaticMarkup(<WorldDiscovery theme={world.theme} variant={v}/>).includes("<text"));
    }
  }
  console.log(`Enemy moves: ${names.size} moves, ${runs} choreography runs, ${renderCount} effect renders; 21 landmarks and seven map layouts passed.`);
}
main().catch(error=>{ console.error(error); process.exitCode=1; });
