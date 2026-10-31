import { withEquipment, equipmentSelected } from "./equipment";
import { db, type Account, type Progress } from "./db";
import { BOSS, SHOP, WORLDS, XP_PER_CORRECT, item, key, levelFor, rewardFor, type Power } from "./game";

export const won = (p: Progress, w: number, b: number) => !!p.stars[key(w, b)];
export const worldUnlocked = (p: Progress, w: number) => w === 0 || won(p, w - 1, BOSS);
export const battleUnlocked = (p: Progress, w: number, b: number) => worldUnlocked(p, w) && (b === 0 || won(p, w, b - 1));

// The furthest world the player can reach, and the next battle in it.
export function frontier(p: Progress) {
  let w = 0;
  while (w < WORLDS.length - 1 && won(p, w, BOSS)) w++;
  const b = [0, 1, 2, 3, 4].find((x) => !won(p, w, x)) ?? BOSS;
  return { w, b };
}

export type BattleOutcome = {
  world: number;
  battle: number;
  victory: boolean;
  firstTry: number; // right on the first try with no hint, first round only
  total: number; // questions in the first round
  skills: Record<string, [number, number]>;
};

export type Rewards = {
  stars: number;
  coins: number;
  xp: number;
  replay: boolean;
  levelUp: boolean;
  newTitle?: string;
  unlockedWorld?: number;
};

export const starsFor = (firstTry: number, total: number) => {
  const r = total ? firstTry / total : 0;
  return r >= 0.9 ? 3 : r >= 0.6 ? 2 : 1;
};

export async function recordBattle(id: string, o: BattleOutcome): Promise<Rewards | null> {
  return db.transaction("rw", db.progress, async () => {
    const p = await db.progress.get(id);
    if (!p) return null;
    const k = key(o.world, o.battle);
    const boss = o.battle === BOSS;
    const replay = !!p.stars[k];
    const stats = { ...p.stats, battles: p.stats.battles + 1, questions: p.stats.questions + o.total, firstTry: p.stats.firstTry + o.firstTry };
    const skills = { ...p.skills };
    for (const [s, [r, m]] of Object.entries(o.skills)) {
      const prev = skills[s] || [0, 0];
      skills[s] = [prev[0] + r, prev[1] + m];
    }
    if (!o.victory) {
      await db.progress.update(id, { stats: { ...stats, losses: stats.losses + 1 }, skills, updatedAt: Date.now() });
      return null;
    }
    const stars = starsFor(o.firstTry, o.total);
    const r = rewardFor(stars, boss, replay);
    const xp = r.winXp + o.firstTry * XP_PER_CORRECT;
    const owned = [...p.owned];
    let newTitle: string | undefined;
    if (boss) {
      const tid = `title-boss-${o.world}`;
      if (!owned.includes(tid)) {
        owned.push(tid);
        newTitle = WORLDS[o.world].bossTitle;
      }
    }
    await db.progress.update(id, {
      stars: { ...p.stars, [k]: Math.max(stars, p.stars[k] || 0) },
      coins: p.coins + r.coins,
      xp: p.xp + xp,
      owned,
      stats: { ...stats, wins: stats.wins + 1, bosses: stats.bosses + (boss && !replay ? 1 : 0) },
      skills,
      updatedAt: Date.now(),
    });
    return {
      stars,
      coins: r.coins,
      xp,
      replay,
      levelUp: levelFor(p.xp + xp) > levelFor(p.xp),
      newTitle,
      unlockedWorld: boss && !replay && o.world < WORLDS.length - 1 ? o.world + 1 : undefined,
    };
  });
}

export async function buy(id: string, itemId: string): Promise<{ ok: boolean; reason?: string }> {
  const it = item(itemId);
  if (!it || it.price < 0) return { ok: false, reason: "That item can't be bought." };
  return db.transaction("rw", db.progress, async () => {
    const p = await db.progress.get(id);
    if (!p) return { ok: false, reason: "No warrior found." };
    if (it.kind !== "power" && p.owned.includes(itemId)) return { ok: false, reason: "You already own this." };
    if (p.coins < it.price) return { ok: false, reason: `You need ${it.price - p.coins} more coins.` };
    if (it.kind === "power") {
      await db.progress.update(id, { coins: p.coins - it.price, inventory: { ...p.inventory, [itemId]: (p.inventory[itemId] || 0) + 1 }, updatedAt: Date.now() });
    } else {
      await db.progress.update(id, { coins: p.coins - it.price, owned: [...p.owned, itemId], updatedAt: Date.now() });
    }
    return { ok: true };
  });
}

// Free defaults stay accessible to older saves without rewriting their inventory.
export const ownsItem = (p: Progress, itemId: string) => p.owned.includes(itemId) || item(itemId)?.price === 0;

export async function equip(id: string, itemId: string) {
  const it = item(itemId);
  if (!it || it.kind === "power") return false;
  // Serialize quick changes to different slots so the later save cannot
  // overwrite another slot with a stale copy of the avatar.
  return db.transaction("rw", db.accounts, db.progress, async () => {
    const [p, a] = await Promise.all([db.progress.get(id), db.accounts.get(id)]);
    if (!p || !a || !ownsItem(p, itemId)) return false;
    await db.accounts.update(id, { avatar: withEquipment(a.avatar, it) });
    return true;
  });
}

export const isEquipped = (a: Account, itemId: string) => {
  const it = item(itemId);
  if (!it) return false;
  return equipmentSelected(a.avatar, it);
};

export async function useItem(id: string, power: Power) {
  return db.transaction("rw", db.progress, async () => {
    const p = await db.progress.get(id);
    if (!p || (p.inventory[power] || 0) < 1) return false;
    await db.progress.update(id, { inventory: { ...p.inventory, [power]: p.inventory[power] - 1 }, updatedAt: Date.now() });
    return true;
  });
}

// ---- Backups (a file the student keeps) ----
export async function exportBackup(id: string) {
  const [account, progress] = await Promise.all([db.accounts.get(id), db.progress.get(id)]);
  return JSON.stringify({ app: "codewarrior", v: 2, account, progress });
}

export async function importBackup(text: string) {
  const data = JSON.parse(text);
  if (data?.app !== "codewarrior" || !data.account?.id || !data.progress?.id) throw new Error("That file isn't a CodeWarrior backup.");
  await db.transaction("rw", db.accounts, db.progress, async () => {
    await db.accounts.put(data.account as Account);
    await db.progress.put(data.progress as Progress);
  });
  return data.account as Account;
}

export async function deleteWarrior(id: string) {
  await db.transaction("rw", db.accounts, db.progress, async () => {
    await db.accounts.delete(id);
    await db.progress.delete(id);
  });
}

// ---- Progress codes for teachers ----
// A compact, copyable summary. It is not encrypted: it only holds game progress.
export type Report = {
  u: string; // username
  t: string; // title
  x: number; // xp
  s: Record<string, number>; // stars
  q: number; // first-round questions
  f: number; // first-try right
  k: Record<string, [number, number]>; // skills
  d: number; // timestamp
};

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
const unb64 = (s: string) => decodeURIComponent(escape(atob(s)));

export function makeReport(a: Account, p: Progress) {
  const r: Report = { u: a.username, t: a.avatar.title, x: p.xp, s: p.stars, q: p.stats.questions, f: p.stats.firstTry, k: p.skills, d: Date.now() };
  return "CW1." + b64(JSON.stringify(r));
}

export function readReport(code: string): Report {
  const c = code.trim();
  if (!c.startsWith("CW1.")) throw new Error("That doesn't look like a CodeWarrior progress code.");
  const r = JSON.parse(unb64(c.slice(4))) as Report;
  if (typeof r.u !== "string" || typeof r.s !== "object") throw new Error("That progress code is damaged.");
  return r;
}

export const totalStars = (stars: Record<string, number>) => Object.values(stars).reduce((a, b) => a + b, 0);
export const ALL_ITEMS = SHOP;

// ---- Test account: unlocks everything ----
export const LEGEND_NAME = "big3lfg";
export const LEGEND_PASS = "123456";
export const isLegend = (username: string, password: string) => username.trim().toLowerCase() === LEGEND_NAME && password === LEGEND_PASS;

export async function unlockEverything(id: string) {
  const stars: Record<string, number> = {};
  WORLDS.forEach((_, w) => [0, 1, 2, 3, 4].forEach((b) => (stars[key(w, b)] = 3)));
  await db.progress.update(id, {
    stars,
    owned: SHOP.filter((s) => s.kind !== "power").map((s) => s.id),
    coins: 99999,
    xp: Math.max(3000, 0),
    inventory: { potion: 99, shield: 99, surge: 99, scroll: 99 },
    updatedAt: Date.now(),
  });
}
