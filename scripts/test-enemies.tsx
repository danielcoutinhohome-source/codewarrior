// Render every encounter in the same states used by maps and battles.
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Monster from "../src/components/Monster";
import { ENEMY_DESIGNS, WORLDS } from "../src/lib/game";

// The project's JSX is transformed by Next in production. tsx's standalone
// runner uses the classic JSX transform for imported components.
Object.assign(globalThis, { React });

assert.equal(WORLDS.length, 7);
const enemies = WORLDS.flatMap((world) => {
  assert.equal(world.enemies.length, 5, `${world.name}: four encounters and a boss`);
  return world.enemies;
});
assert.equal(enemies.length, 35);
assert.equal(new Set(enemies.map((e) => e.name)).size, 35, "Every enemy needs its own name");
assert.deepEqual(new Set(enemies.map((e) => e.design)), new Set(ENEMY_DESIGNS), "Every design has one encounter");
assert.equal(new Set(enemies.map((e) => e.design)).size, 35);

let states = 0;
for (const enemy of enemies) {
  assert.match(enemy.color, /^#[0-9a-f]{6}$/i);
  assert.match(enemy.accent, /^#[0-9a-f]{6}$/i);
  assert.ok(enemy.lore.length > 20 && enemy.attackName && enemy.label);
  assert.ok(["lunge", "slam", "spit"].includes(enemy.attackStyle));
  for (const state of [
    { size: 58 }, { size: 74 }, { size: 178 },
    { size: 220, boss: true }, { size: 220, hurt: true },
    { size: 220, silhouette: true, boss: true },
  ]) {
    const svg = renderToStaticMarkup(<Monster enemy={enemy} idle={false} {...state}/>);
    assert.ok(svg.includes('viewBox="0 0 240 240"') && svg.includes("<path"), enemy.design);
    assert.ok(!svg.includes("NaN") && !svg.includes("undefined"), enemy.design);
    if ("silhouette" in state) {
      assert.ok(svg.includes("Unknown boss"));
      assert.ok(!svg.includes(enemy.name) && !svg.includes(enemy.lore) && !svg.includes(`>${enemy.label}<`), "Hidden bosses must not reveal identity");
    } else {
      assert.ok(svg.includes("<desc>") && svg.includes(enemy.name.replaceAll("&", "&amp;")));
    }
    if (state.size < 100) assert.ok(!svg.includes('font-size="9"'), "Tiny portraits omit unreadable cue text");
    states++;
  }
}

const lineup = renderToStaticMarkup(<div>{enemies.map((enemy) => <Monster key={enemy.design} enemy={enemy} idle={false}/>)}</div>);
const ids = [...lineup.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
assert.equal(new Set(ids).size, ids.length, "Multiple monsters must not share SVG definition IDs");
for (const match of lineup.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(match[1]), `Missing SVG paint ${match[1]}`);
console.log(`enemy tests passed: 35 unique designs, ${states} render states, isolated SVG definitions`);
