// Cross-device progress merge rules (src/lib/cloud/protocol.ts mergeProgress).
// Earned things (xp, stars, skills, owned items, stats) never go backwards when two copies meet.
// Spendable things (coins, consumable inventory) follow the newer copy, so spending on one
// device isn't refunded by an older copy from the server or another device.
import { mergeProgress, type ProgressDoc } from "../src/lib/cloud/protocol";

let failed = 0;
const check = (name: string, ok: boolean, detail?: unknown) => {
  if (ok) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.log(`  ✗ ${name}`, detail ?? "");
  }
};

const base = (o: Partial<ProgressDoc> = {}): ProgressDoc => ({
  avatar: { body: "bot" },
  xp: 100,
  coins: 200,
  streak: 2,
  lastActiveDay: "2026-10-30",
  stars: { "w0-b0": 2 },
  inventory: { heal: 2 },
  owned: ["sword"],
  stats: { wins: 3 },
  skills: { loops: [3, 4] },
  imports: [],
  updatedAt: 1000,
  ...o,
});

// A purchase on this device: coins down, item owned, newer timestamp.
const server = base();
const bought = base({ coins: 150, owned: ["sword", "shield"], updatedAt: 2000 });
let m = mergeProgress(server, bought);
check("a purchase isn't refunded by the older server copy", m.coins === 150, m.coins);
check("the purchased item stays owned", m.owned.includes("shield"));
m = mergeProgress(bought, server);
check("merge order doesn't matter for spending", m.coins === 150, m.coins);

// Using a power-up: inventory count down on the newer copy.
const used = base({ inventory: { heal: 1 }, updatedAt: 2000 });
m = mergeProgress(server, used);
check("a used power-up doesn't come back", m.inventory.heal === 1, m.inventory);

// Earning on an older copy and spending on a newer one: earned progress is kept.
const olderEarn = base({ xp: 180, stars: { "w0-b0": 3, "w0-b1": 1 }, skills: { loops: [5, 6] }, updatedAt: 1500 });
m = mergeProgress(olderEarn, bought);
check("xp, stars and skills from the older copy are kept", m.xp === 180 && m.stars["w0-b1"] === 1 && m.stars["w0-b0"] === 3 && m.skills.loops[0] === 5, m);
check("coins follow the newer copy", m.coins === 150, m.coins);

// A brand-new device copy (updatedAt 0) never overrides the server's coins.
const fresh = base({ coins: 50, inventory: {}, updatedAt: 0 });
m = mergeProgress(server, fresh);
check("a fresh device takes the server's coins and items", m.coins === 200 && m.inventory.heal === 2, m);

// Equipment changes ride on the timestamp too (equip() bumps it).
const equipped = base({ avatar: { body: "bot", weapon: "axe" }, updatedAt: 2000 });
m = mergeProgress(server, equipped);
check("a newer equipment change survives the merge", (m.avatar as { weapon?: string }).weapon === "axe", m.avatar);

// A missed day resets the streak; the stale higher streak elsewhere must not come back.
const reset = base({ streak: 1, lastActiveDay: "2026-11-02", updatedAt: 900 });
const stale = base({ streak: 9, lastActiveDay: "2026-10-28", updatedAt: 1000 });
m = mergeProgress(stale, reset);
check("a reset streak isn't replaced by an older, longer one", m.streak === 1 && m.lastActiveDay === "2026-11-02", m);
const playedYesterdayElsewhere = base({ streak: 6, lastActiveDay: "2026-11-01" });
const staleDeviceToday = base({ streak: 1, lastActiveDay: "2026-11-02" });
m = mergeProgress(playedYesterdayElsewhere, staleDeviceToday);
check("a streak kept up on another device continues", m.streak === 7, m.streak);
check("...and merging again doesn't add another day", mergeProgress(m, playedYesterdayElsewhere).streak === 7 && mergeProgress(staleDeviceToday, m).streak === 7);
check("month boundary counts as consecutive", mergeProgress(base({ streak: 2, lastActiveDay: "2026-10-31" }), base({ streak: 1, lastActiveDay: "2026-11-01" })).streak === 3);
m = mergeProgress(base({ streak: 4 }), base({ streak: 3 }));
check("same day: the longer streak wins", m.streak === 4, m.streak);

// Merging is stable: merging the result again with either input changes nothing.
const once = mergeProgress(server, bought);
check("merge is idempotent", JSON.stringify(mergeProgress(once, bought)) === JSON.stringify(once) && JSON.stringify(mergeProgress(server, once)) === JSON.stringify(once));

if (failed) {
  console.log(`progress merge: ${failed} failed`);
  process.exit(1);
}
console.log("progress merge tests passed");
