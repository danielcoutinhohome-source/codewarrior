import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup as render } from "react-dom/server";
import WorldScene from "../src/components/WorldScene";
import { Backdrop, Scenery } from "../src/components/worldArt";
import { WORLDS } from "../src/lib/game";
Object.assign(globalThis, { React });
for (const width of [390, 1100]) for (const [worldIndex, world] of WORLDS.entries()) {
  const scene = (stars: (number | undefined)[], unlocked: boolean[], selected: number) => render(<WorldScene worldIndex={worldIndex} world={world} avatar={{ armor: "#345", energy: "#8FF", title: "" }} stars={stars} unlocked={unlocked} selected={selected} onSelect={() => {}} height={650} width={width} />);
  const initial = scene([], [true, false, false, false, false], 0);
  assert.ok(initial.includes('data-boss-camera="travel"'), "Locked gates do not trigger the arrival camera");
  assert.equal((initial.match(/brightness\(0\)/g) || []).length, 4, "All four future enemies are blacked out");
  assert.equal((initial.match(/Unknown (?:boss|enemy)/g) || []).length, 4, "Every future enemy renders its silhouette");
  const next = scene([3], [true, true, false, false, false], 1);
  assert.equal((next.match(/brightness\(0\)/g) || []).length, 3);
  assert.ok(next.includes("data-defeated"));
  assert.ok(next.includes(world.enemies[1].name));
  const boss = scene([3, 3, 3, 3], [true, true, true, true, true], 4);
  assert.ok(boss.includes('data-boss-camera="arrival"'));
  assert.ok(scene([3, 3, 3, 3, 3], [true, true, true, true, true], 4).includes('data-boss-camera="travel"'), "Completed gates do not replay the arrival");
  assert.ok(!boss.includes("brightness(0)"), "The boss is revealed at the threshold");
}
assert.notEqual(render(<Scenery kind="crystal" scene="citadel" />), render(<Scenery kind="crystal" scene="caverns" />));
assert.ok(render(<Scenery kind="crystal" scene="citadel" />).includes("data-citadel-prism"));
const lagoon = render(<Backdrop W={1100} H={650} hz={247} t={WORLDS[2].theme} />);
assert.equal((lagoon.match(/data-map-waterfall/g) || []).length, 2);
assert.ok(lagoon.includes("#298AAF"));
assert.ok(render(<Backdrop W={1100} H={650} hz={247} t={WORLDS[3].theme} />).includes("glacial-observatory"));
console.log("world path reveal and scenery regression tests passed");
