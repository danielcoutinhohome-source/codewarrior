import Dexie, { type EntityTable } from "dexie";

export type Avatar = {
  armor: string;
  energy: string;
  title: string;
};

export type Account = {
  id: string; // lowercased username, unique per device
  username: string; // as typed
  passwordHash: string;
  salt: string;
  avatar: Avatar;
  createdAt: number;
};

export type Progress = {
  id: string; // same as Account.id
  xp: number;
  coins: number;
  streak: number;
  lastActiveDay: string; // YYYY-MM-DD, local time
  currentWorld: number; // 0-based
  battlesWon: Record<string, boolean>; // "w0-b2" -> true
};

// All saves live in this browser's IndexedDB. Nothing here is sent anywhere.
export const db = new Dexie("codewarrior") as Dexie & {
  accounts: EntityTable<Account, "id">;
  progress: EntityTable<Progress, "id">;
};

db.version(1).stores({
  accounts: "id, createdAt",
  progress: "id",
});
