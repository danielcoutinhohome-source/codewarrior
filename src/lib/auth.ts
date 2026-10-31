import { db, emptyStats, type Account, type Avatar, type Progress } from "./db";
import { STARTER_COINS, STARTER_INVENTORY, STARTER_OWNED } from "./game";
import { isLegend, unlockEverything } from "./progress";

const SESSION_KEY = "cw.session";
const ITERATIONS = 150_000;

const toB64 = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf : new Uint8Array(buf))));
const fromB64 = (s: string) => new Uint8Array(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer as ArrayBuffer);

async function hashPassword(password: string, salt: Uint8Array<ArrayBuffer>) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256);
  return toB64(bits);
}

export const USERNAME_RULE = /^[A-Za-z0-9_]{3,16}$/;

export function validateSignup(username: string, password: string, confirm: string): string | null {
  if (!USERNAME_RULE.test(username)) return "Warrior names are 3 to 16 letters, numbers or underscores.";
  if (password.length < 6) return "Passwords need at least 6 characters.";
  if (password !== confirm) return "Those passwords don't match.";
  return null;
}

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function createAccount(username: string, password: string, avatar: Avatar) {
  const id = username.toLowerCase();
  if (await db.accounts.get(id)) throw new Error("That warrior name is already taken on this device.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const account: Account = {
    id,
    username,
    passwordHash: await hashPassword(password, salt),
    salt: toB64(salt),
    avatar,
    createdAt: Date.now(),
  };
  const progress: Progress = {
    id,
    xp: 0,
    coins: STARTER_COINS,
    streak: 1,
    lastActiveDay: todayKey(),
    stars: {},
    inventory: { ...STARTER_INVENTORY },
    owned: [...STARTER_OWNED],
    stats: emptyStats(),
    skills: {},
    updatedAt: Date.now(),
  };
  await db.transaction("rw", db.accounts, db.progress, async () => {
    await db.accounts.add(account);
    await db.progress.add(progress);
  });
  if (isLegend(username, password)) await unlockEverything(id);
  setSession(id);
  return account;
}

export async function logIn(username: string, password: string) {
  const id = username.trim().toLowerCase();
  const account = await db.accounts.get(id);
  if (!account) throw new Error("No warrior with that name on this device.");
  const hash = await hashPassword(password, fromB64(account.salt));
  if (hash !== account.passwordHash) throw new Error("Wrong password. Try again.");
  if (isLegend(username, password)) await unlockEverything(id);
  await touchStreak(id);
  setSession(id);
  return account;
}

// Counts consecutive days played. Missing a day resets to 1.
export async function touchStreak(id: string) {
  const p = await db.progress.get(id);
  if (!p) return;
  const today = todayKey();
  if (p.lastActiveDay === today) return;
  const yesterday = todayKey(new Date(Date.now() - 86_400_000));
  await db.progress.update(id, { streak: p.lastActiveDay === yesterday ? p.streak + 1 : 1, lastActiveDay: today });
}

export function setSession(id: string) {
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {}
}
export function getSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}
export function logOut() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

// Warriors saved only on this device (class-account warriors sign in through the server).
export async function listWarriors() {
  return (await db.accounts.orderBy("createdAt").reverse().toArray()).filter((a) => !a.cloudUserId);
}

// Checks a device warrior's password without signing in (used to prove ownership before
// importing its progress into a class account).
export async function verifyLocal(id: string, password: string) {
  const a = await db.accounts.get(id);
  if (!a || a.cloudUserId) return false;
  return (await hashPassword(password, fromB64(a.salt))) === a.passwordHash;
}
