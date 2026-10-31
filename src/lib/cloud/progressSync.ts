"use client";

import { db, emptyStats, type Account, type Avatar, type Progress } from "../db";
import { STARTER_COINS, STARTER_INVENTORY, STARTER_OWNED } from "../game";
import { setSession, todayKey } from "../auth";
import { api, getCloud, localIdFor } from "./client";
import { mergeProgress, type Me, type ProgressDoc } from "./protocol";

// Game progress for a class account lives on the server so it follows the student to other
// devices. This device keeps a copy (the local warrior "c:<user id>") and the two are merged
// with mergeProgress whenever they meet. Classroom records (battles, answers) are separate,
// append-only and synced through the outbox.

export const DEFAULT_AVATAR: Avatar = { body: "bot", armor: "#D6DEEB", energy: "#FF5A5F", title: "Byte Knight" };

export function toDoc(a: Account, p: Progress, imports: string[] = []): ProgressDoc {
  return {
    avatar: a.avatar,
    xp: p.xp,
    coins: p.coins,
    streak: p.streak,
    lastActiveDay: p.lastActiveDay,
    stars: p.stars,
    inventory: p.inventory,
    owned: p.owned,
    stats: p.stats as unknown as Record<string, number>,
    skills: p.skills,
    imports,
    updatedAt: p.updatedAt,
  };
}

const IMPORTS_KEY = (uid: string) => `cw.cloud.imports.${uid}`;
const getImports = (uid: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(IMPORTS_KEY(uid)) || "[]");
  } catch {
    return [];
  }
};
const setImports = (uid: string, v: string[]) => {
  try {
    localStorage.setItem(IMPORTS_KEY(uid), JSON.stringify(v));
  } catch {}
};

async function writeLocal(me: Me, doc: ProgressDoc) {
  const id = localIdFor(me.id);
  await db.transaction("rw", db.accounts, db.progress, async () => {
    const a = await db.accounts.get(id);
    await db.accounts.put({ id, username: me.username, passwordHash: "", salt: "", cloudUserId: me.id, avatar: (doc.avatar as Avatar) || a?.avatar || DEFAULT_AVATAR, createdAt: a?.createdAt ?? Date.now() });
    await db.progress.put({
      id,
      xp: doc.xp,
      coins: doc.coins,
      streak: doc.streak,
      lastActiveDay: doc.lastActiveDay,
      stars: doc.stars,
      inventory: doc.inventory,
      owned: doc.owned,
      stats: { ...emptyStats(), ...(doc.stats as object) },
      skills: doc.skills,
      updatedAt: doc.updatedAt,
    });
  });
  setImports(me.id, doc.imports || []);
}

// Makes sure this device has the class account's warrior, signs the game into it, and
// syncs progress. `avatar` is used for a brand-new account with no saved progress.
export async function enterGame(me: Me, avatar?: Avatar) {
  const id = localIdFor(me.id);
  const existing = await db.progress.get(id);
  if (!existing) {
    const fresh: ProgressDoc = {
      avatar: avatar || DEFAULT_AVATAR,
      xp: 0,
      coins: STARTER_COINS,
      streak: 1,
      lastActiveDay: todayKey(),
      stars: {},
      inventory: { ...STARTER_INVENTORY },
      owned: [...STARTER_OWNED],
      stats: emptyStats() as unknown as Record<string, number>,
      skills: {},
      imports: [],
      updatedAt: 0, // anything on the server wins
    };
    await writeLocal(me, fresh);
  }
  setSession(id);
  await syncProgress().catch(() => {});
}

let inflight: Promise<void> | null = null;
let lastPushed = "";

// Pulls the server copy, merges, writes back whichever side is behind.
export function syncProgress(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const c = getCloud();
      if (!c || c.me.role !== "student") return;
      const id = localIdFor(c.me.id);
      for (let attempt = 0; attempt < 3; attempt++) {
        const [a, p] = await Promise.all([db.accounts.get(id), db.progress.get(id)]);
        if (!a || !p) return;
        const local = toDoc(a, p, getImports(c.me.id));
        const server = await api<{ version: number; doc: ProgressDoc | null }>("GET", "/progress");
        const merged = server.doc ? mergeProgress(server.doc, local) : local;
        if (JSON.stringify(merged) !== JSON.stringify(local)) await writeLocal(c.me, merged);
        const text = JSON.stringify(merged);
        if (server.doc && JSON.stringify(mergeProgress(server.doc, merged)) === JSON.stringify(server.doc)) return; // server already has it
        if (text === lastPushed && server.doc) return;
        const r = await api<{ conflict: boolean; version: number }>("PUT", "/progress", { baseVersion: server.version, doc: merged });
        if (!r.conflict) {
          lastPushed = text;
          return;
        }
      }
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

let debounce: ReturnType<typeof setTimeout> | null = null;
export function scheduleProgressSync(ms = 2500) {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => void syncProgress().catch(() => {}), ms);
}

// Merges a warrior saved only on this device into the class account, once. The student must
// prove it's theirs with that warrior's password; nothing about the old account is uploaded
// except its game progress. Earlier battles are not shared with any class.
export async function importLegacy(localId: string) {
  const c = getCloud();
  if (!c) throw new Error("Sign in to your class account first.");
  if (localId.startsWith("c:")) throw new Error("That's already a class account.");
  const [la, lp] = await Promise.all([db.accounts.get(localId), db.progress.get(localId)]);
  if (!la || !lp) throw new Error("That warrior isn't on this device.");
  const imports = getImports(c.me.id);
  if (imports.includes(localId)) return { already: true };
  const id = localIdFor(c.me.id);
  const [ca, cp] = await Promise.all([db.accounts.get(id), db.progress.get(id)]);
  if (!ca || !cp) throw new Error("Open the game once with your class account, then try again.");
  const merged = mergeProgress(toDoc(ca, cp, imports), { ...toDoc(la, lp), avatar: ca.avatar, updatedAt: 0, imports: [localId] });
  merged.updatedAt = Date.now();
  await writeLocal(c.me, merged);
  await syncProgress();
  return { already: false };
}

export const importedIds = () => {
  const c = getCloud();
  return c ? getImports(c.me.id) : [];
};
