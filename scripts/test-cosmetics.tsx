import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Warrior from "../src/components/Warrior";
import ItemArt from "../src/components/ItemArt";
import { WeaponArt } from "../src/components/WarriorGear";
import { HEADWEAR, WEAPONS, WEAPON_TYPES, EXTRA_AURAS, EXTRA_FINISHES, EXTRA_COSMETICS, weaponSpec } from "../src/lib/cosmetics";
import { SHOP } from "../src/lib/game";
import { equipmentSelected, withEquipment } from "../src/lib/equipment";
import { ownsItem } from "../src/lib/progress";
import type { Avatar, Progress } from "../src/lib/db";

Object.assign(globalThis, { React });
assert.equal(WEAPONS.length, 3, "One weapon per type");
assert.equal(HEADWEAR.length, 15);
assert.equal(new Set(SHOP.map((item) => item.id)).size, SHOP.length, "Shop IDs must stay unique");
for (const type of WEAPON_TYPES) {
  const variants = WEAPONS.filter((weapon) => weapon.type === type);
  assert.equal(variants.length, 1);
  for (const weapon of variants) assert.ok(SHOP.some((item) => item.kind === "weapon" && item.value === weapon.value));
}
const geometries = WEAPON_TYPES.map((type) => renderToStaticMarkup(<svg><WeaponArt value={type} paint={() => "#123456"}/></svg>).match(/\bd="[^"]+"/g)?.join(""));
assert.equal(new Set(geometries).size, 3, "Weapon families must have different silhouettes");
assert.equal(new Set(EXTRA_AURAS.map((aura) => aura.colors.join())).size, EXTRA_AURAS.length);

const legacy: Avatar = { armor: "#6179A0", energy: "#58DFFF", title: "Byte Knight", aura: "storm", finish: "metal" };
const original = structuredClone(legacy);
const weaponItem = SHOP.find((item) => item.id === "weapon-scythe")!;
const hatItem = SHOP.find((item) => item.id === "headwear-wizard")!;
const geared = withEquipment(withEquipment(legacy, weaponItem), hatItem);
assert.deepEqual(legacy, original, "Previewing must not mutate saved equipment");
assert.deepEqual(geared, { ...legacy, weapon: "scythe", headwear: "wizard" });
// Saves from before the merge keep their weapon: "scythe-crimson" is the scythe, and owning it owns the scythe.
assert.ok(equipmentSelected({ ...legacy, weapon: "scythe-crimson" }, weaponItem));
assert.ok(ownsItem({ owned: ["weapon-scythe-crimson"] } as unknown as Progress, "weapon-scythe"));
assert.ok(equipmentSelected(geared, weaponItem) && equipmentSelected(geared, hatItem));
assert.ok(equipmentSelected(legacy, SHOP.find((item) => item.id === "weapon-saber")!));
assert.ok(equipmentSelected(legacy, SHOP.find((item) => item.id === "headwear-none")!));
const oldInventory = { owned: [] } as unknown as Progress;
assert.ok(ownsItem(oldInventory, "weapon-saber") && ownsItem(oldInventory, "headwear-none"), "Older saves can always restore their original look");
assert.ok(!ownsItem(oldInventory, weaponItem.id) && !ownsItem(oldInventory, hatItem.id));
const changedEnergy = withEquipment(geared, SHOP.find((item) => item.id === "energy-rainbow")!);
assert.equal(changedEnergy.headwear, "wizard");
assert.equal(weaponSpec(changedEnergy.weapon)?.type, "scythe");
assert.equal(changedEnergy.aura, "storm");

function checkSvg(svg: string) {
  assert.ok(!svg.includes("NaN") && !svg.includes("undefined"));
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "SVG definitions cannot collide");
  for (const match of svg.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(match[1]), `Missing paint or clip: ${match[1]}`);
}
let renders = 0;
const bodies = ["bot", "titan", "valkyrie"];
const energies = ["#58DFFF", "gold", "rainbow"];
for (const body of bodies) for (const facing of ["front", "back"] as const) {
  for (const energy of energies) {
    for (const head of HEADWEAR) {
      const svg = renderToStaticMarkup(<Warrior {...legacy} body={body} facing={facing} energy={energy} headwear={head.value} idle={false}/>);
      assert.ok(svg.includes(`data-headwear="${head.value}"`));
      const hair = svg.match(/<linearGradient id="hair-[^"]+"[^>]*>(.*?)<\/linearGradient>/s)?.[1] || "";
      assert.ok(hair.includes(energy === "gold" ? "#FFD65C" : energy === "rainbow" ? "#FF4D6D" : energy));
      checkSvg(svg); renders++;
    }
    for (const weapon of WEAPONS) {
      const svg = renderToStaticMarkup(<Warrior {...legacy} body={body} facing={facing} energy={energy} weapon={weapon.value} idle={false}/>);
      const wg = svg.match(/<linearGradient id="weapon-[^"]+"[^>]*>(.*?)<\/linearGradient>/s)?.[1] || "";
      assert.ok(svg.includes(`data-weapon="${weapon.value}"`) && wg.includes(energy === "gold" ? "#FFD65C" : energy === "rainbow" ? "#FF4D6D" : energy), "Weapons glow in the energy color");
      checkSvg(svg); renders++;
    }
    for (const finish of EXTRA_FINISHES) {
      const svg = renderToStaticMarkup(<Warrior {...legacy} body={body} facing={facing} energy={energy} finish={finish.value} idle={false}/>);
      assert.equal(svg.split(`data-finish="${finish.value}"`).length - 1, 2, "Finishes cover torso and helmet separately");
      checkSvg(svg); renders++;
    }
  }
  for (const aura of EXTRA_AURAS) {
    const svg = renderToStaticMarkup(<Warrior {...geared} body={body} facing={facing} aura={aura.value} idle={false}/>);
    assert.ok(svg.includes(`data-aura="${aura.value}"`) && svg.includes('data-aura-layer="front"') && svg.includes('data-aura-layer="back"'));
    checkSvg(svg); renders++;
  }
}
// Multiple equipped avatars, shop icons, and new finishes must coexist on one page.
const gallery = renderToStaticMarkup(<div>{EXTRA_COSMETICS.map((item) => <ItemArt key={item.id} it={item} avatar={geared}/>)}<Warrior {...geared} finish="galaxy" idle={false}/></div>);
checkSvg(gallery);
checkSvg(renderToStaticMarkup(<Warrior {...legacy} weapon="unknown" headwear="unknown" idle={false}/>));
console.log(`cosmetics tests passed: 3 weapons, 15 headwear, ${EXTRA_AURAS.length} auras, ${EXTRA_FINISHES.length} finishes; ${renders} render combinations and legacy equipment checks`);
