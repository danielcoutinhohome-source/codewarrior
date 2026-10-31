import Dexie, { type EntityTable } from "dexie";
import { STARTER_COINS, STARTER_INVENTORY, STARTER_OWNED } from "./game";

export type Avatar = {
  armor: string;
  energy: string;
  title: string;
  finish?: string; // "standard" | "metal" | "circuit"
  aura?: string; // "none" | "ember" | "frost" | "storm" | "royal"
};

export type Account = {
  id: string; // lowercased username, unique per device
  username: string; // as typed
  passwordHash: string;
  salt: string;
  avatar: Avatar;
  createdAt: number;
};

export type Stats = {
  battles: number;
  wins: number;
  losses: number;
  questions: number; // answered in a first round
  firstTry: number; // right on the first try, no hint
  bosses: number;
};

export type Progress = {
  id: string; // same as Account.id
  xp: number;
  coins: number;
  streak: number;
  lastActiveDay: string; // YYYY-MM-DD, local time
  stars: Record<string, number>; // "w0-b2" -> 1..3; present means won
  inventory: Record<string, number>; // power-up id -> count
  owned: string[]; // shop item ids
  stats: Stats;
  skills: Record<string, [number, number]>; // skill -> [right first try, missed]
  updatedAt: number;
};

export const emptyStats = (): Stats => ({ battles: 0, wins: 0, losses: 0, questions: 0, firstTry: 0, bosses: 0 });

// All saves live in this browser's IndexedDB. Nothing here is sent anywhere.
export const db = new Dexie("codewarrior") as Dexie & {
  accounts: EntityTable<Account, "id">;
  progress: EntityTable<Progress, "id">;
};

db.version(1).stores({
  accounts: "id, createdAt",
  progress: "id",
});

// v2: stars, inventory, shop, stats. Older saves are upgraded in place.
db.version(2)
  .stores({ accounts: "id, createdAt", progress: "id" })
  .upgrade((tx) =>
    tx
      .table("progress")
      .toCollection()
      .modify((p: Record<string, unknown>) => {
        const won = (p.battlesWon as Record<string, boolean>) || {};
        p.stars = Object.fromEntries(Object.keys(won).map((k) => [k, 1]));
        delete p.battlesWon;
        delete p.currentWorld;
        p.inventory = { ...STARTER_INVENTORY };
        p.owned = [...STARTER_OWNED];
        p.coins = Math.max(Number(p.coins) || 0, STARTER_COINS);
        p.stats = emptyStats();
        p.skills = {};
        p.updatedAt = Date.now();
      }),
  );
