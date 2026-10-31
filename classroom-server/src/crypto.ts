// Passwords: PBKDF2-SHA256 through Web Crypto (the supported option in Workers), a random
// 16-byte salt per user, and the iteration count stored per user so it can be raised later
// (rehashed on the next successful login). The Workers Free plan allows ~10 ms of CPU per
// request, which caps how many iterations are practical; rate limits on login make up for it.
export const PBKDF2_ITERATIONS = 40_000;

const enc = new TextEncoder();
export const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));
export const randomId = () => crypto.randomUUID();

export async function hashPassword(password: string, salt?: string, iterations = PBKDF2_ITERATIONS) {
  const s = salt ? fromB64url(salt) : randomBytes(16);
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: s, iterations }, key, 256);
  return { hash: b64url(bits), salt: b64url(s), iterations };
}

export async function sha256(s: string) {
  return b64url(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}

// Constant-time comparison of two strings of possibly different length.
export function safeEqual(a: string, b: string) {
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export async function verifyPassword(password: string, hash: string, salt: string, iterations: number) {
  const h = await hashPassword(password, salt, iterations);
  return safeEqual(h.hash, hash);
}

// Opaque bearer tokens. Only their SHA-256 is stored, so a database read can't be replayed.
export const newToken = () => b64url(randomBytes(32));

export function randomCode(alphabet: string, length: number) {
  // Rejection sampling keeps every character equally likely.
  const out: string[] = [];
  const limit = 256 - (256 % alphabet.length);
  while (out.length < length) {
    for (const b of randomBytes(length * 2)) {
      if (b < limit && out.length < length) out.push(alphabet[b % alphabet.length]);
    }
  }
  return out.join("");
}
