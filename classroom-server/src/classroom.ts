import { DurableObject } from "cloudflare:workers";
import { BOSS, POWERS, WORLDS } from "../../src/lib/game";
import {
  CLASS_CODE_RE,
  CODE_ALPHABET,
  COURSES,
  MAX_PASSWORD,
  MIN_PASSWORD,
  USERNAME_RE,
  normalizeCode,
  starsFor,
  type ApiError,
  type Assignment,
  type AssignmentState,
  type AssignmentTarget,
  type ClassInfo,
  type Me,
  type SyncAck,
  type SyncEvent,
} from "../../src/lib/cloud/protocol";
import { PBKDF2_ITERATIONS, hashPassword, newToken, randomCode, randomId, safeEqual, sha256, verifyPassword } from "./crypto";
import { MIGRATIONS } from "./schema";

export type Env = {
  CLASSROOM: DurableObjectNamespace<Classroom>;
  ALLOWED_ORIGINS?: string;
  ADMIN_TOKEN?: string; // set only while provisioning a teacher; see README
};

type Row = Record<string, SqlStorageValue>;
type User = { id: string; username: string; display_name: string; role: "student" | "teacher"; must_change_pw: number; disabled: number; created_at: number; pw_hash: string; pw_salt: string; pw_iter: number };

class HttpError extends Error {
  constructor(public status: number, public code: ApiError["error"], message: string, public retryAfter?: number) {
    super(message);
  }
}

const SESSION_MS = 30 * 86_400_000;
const DAY = 86_400_000;
const now = () => Date.now();

// ---------- input helpers ----------
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
function str(v: unknown, max: number, field: string, opts: { min?: number; trim?: boolean } = {}): string {
  if (typeof v !== "string") {
    if (opts.min === 0 || opts.min === undefined) return "";
    throw new HttpError(400, "bad_request", `${field} is required.`);
  }
  let s = clean(v);
  if (opts.trim !== false) s = s.trim();
  if (s.length < (opts.min ?? 0)) throw new HttpError(400, "bad_request", `${field} is required.`);
  if (s.length > max) throw new HttpError(400, "bad_request", `${field} is too long (max ${max} characters).`);
  return s;
}
const optStr = (v: unknown, max: number) => (typeof v === "string" ? clean(v).slice(0, max) : undefined);
function int(v: unknown, lo: number, hi: number, field: string): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < lo || v > hi) throw new HttpError(400, "bad_request", `${field} must be a whole number from ${lo} to ${hi}.`);
  return v;
}
const isId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9-]{8,64}$/.test(v);
const bool = (v: unknown) => (v ? 1 : 0);

function checkPassword(pw: unknown, username: string) {
  if (typeof pw !== "string" || pw.length < MIN_PASSWORD) throw new HttpError(400, "bad_request", `Passwords need at least ${MIN_PASSWORD} characters.`);
  if (pw.length > MAX_PASSWORD) throw new HttpError(400, "bad_request", "That password is too long.");
  if (pw.toLowerCase() === username.toLowerCase()) throw new HttpError(400, "bad_request", "Your password can't be your username.");
  return pw;
}

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

// ---------- the Durable Object ----------
export class Classroom extends DurableObject<Env> {
  private sql: SqlStorage;
  private calls = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    ctx.blockConcurrencyWhile(async () => this.migrate());
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  private migrate() {
    this.sql.exec("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)");
    const cur = Number(this.one<{ v: string }>("SELECT v FROM meta WHERE k = 'schema_version'")?.v || 0);
    for (const m of MIGRATIONS) {
      if (m.version <= cur) continue;
      this.ctx.storage.transactionSync(() => {
        this.sql.exec(m.sql);
        this.sql.exec("INSERT INTO meta (k, v) VALUES ('schema_version', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", String(m.version));
      });
    }
  }

  private all<T = Row>(q: string, ...args: unknown[]): T[] {
    return this.sql.exec(q, ...(args as SqlStorageValue[])).toArray() as T[];
  }
  private one<T = Row>(q: string, ...args: unknown[]): T | null {
    return (this.all<T>(q, ...args)[0] ?? null) as T | null;
  }
  private run(q: string, ...args: unknown[]) {
    this.sql.exec(q, ...(args as SqlStorageValue[]));
  }
  private schemaVersion() {
    return Number(this.one<{ v: string }>("SELECT v FROM meta WHERE k = 'schema_version'")?.v || 0);
  }

  // ---------- rate limiting (fixed windows, stored durably) ----------
  private hits(k: string, windowMs: number) {
    const r = this.one<{ window_start: number; count: number }>("SELECT window_start, count FROM rate_limits WHERE k = ?", k);
    if (!r || now() - r.window_start >= windowMs) return { count: 0, start: now() };
    return { count: r.count, start: r.window_start };
  }
  private bump(k: string, windowMs: number) {
    const h = this.hits(k, windowMs);
    this.run("INSERT INTO rate_limits (k, window_start, count) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET window_start = excluded.window_start, count = excluded.count", k, h.start, h.count + 1);
    if (++this.calls % 200 === 0) this.run("DELETE FROM rate_limits WHERE window_start < ?", now() - 2 * DAY);
  }
  private guard(k: string, max: number, windowMs: number, message: string) {
    const h = this.hits(k, windowMs);
    if (h.count >= max) throw new HttpError(429, "rate_limited", message, Math.ceil((h.start + windowMs - now()) / 1000));
  }

  // ---------- auth ----------
  private me(u: User): Me {
    return { id: u.id, username: u.username, displayName: u.display_name, role: u.role, mustChangePassword: !!u.must_change_pw, createdAt: u.created_at };
  }

  private async authed(req: Request, opts: { allowPasswordChange?: boolean } = {}): Promise<User> {
    const h = req.headers.get("authorization") || "";
    const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
    if (!token || token.length > 200) throw new HttpError(401, "unauthorized", "Please sign in.");
    const s = this.one<{ user_id: string; expires_at: number; last_seen: number }>("SELECT user_id, expires_at, last_seen FROM auth_sessions WHERE token_hash = ?", await sha256(token));
    if (!s || s.expires_at < now()) throw new HttpError(401, "unauthorized", "Your session ended. Please sign in again.");
    const u = this.one<User>("SELECT * FROM users WHERE id = ?", s.user_id);
    if (!u || u.disabled) throw new HttpError(401, "unauthorized", "This account can't sign in.");
    if (now() - s.last_seen > 5 * 60_000) this.run("UPDATE auth_sessions SET last_seen = ? WHERE token_hash = ?", now(), await sha256(token));
    if (u.must_change_pw && !opts.allowPasswordChange) throw new HttpError(403, "password_change_required", "Change your starter password before continuing.");
    return u;
  }
  private async teacher(req: Request) {
    const u = await this.authed(req);
    if (u.role !== "teacher") throw new HttpError(403, "forbidden", "Only teacher accounts can do that.");
    return u;
  }
  private async student(req: Request) {
    const u = await this.authed(req);
    if (u.role !== "student") throw new HttpError(403, "forbidden", "Only student accounts can do that.");
    return u;
  }

  private async startSession(userId: string) {
    const token = newToken();
    const t = now();
    this.run("INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at, last_seen) VALUES (?, ?, ?, ?, ?)", await sha256(token), userId, t, t + SESSION_MS, t);
    if (++this.calls % 50 === 0) this.run("DELETE FROM auth_sessions WHERE expires_at < ?", t);
    return token;
  }

  private async register(body: Record<string, unknown>, ip: string) {
    this.guard(`reg:${ip}`, 60, 3600_000, "Too many new accounts from this network. Try again later.");
    const username = str(body.username, 20, "Username", { min: 3 });
    if (!USERNAME_RE.test(username)) throw new HttpError(400, "bad_request", "Usernames are 3 to 20 letters, numbers or underscores.");
    const password = checkPassword(body.password, username);
    const displayName = str(body.displayName, 40, "Name") || username;
    let role: "student" | "teacher" = "student";
    let inviteHash: string | null = null;
    if (body.invite !== undefined && body.invite !== "") {
      this.guard(`invite-fail:${ip}`, 10, 3600_000, "Too many invalid invite codes. Try again later.");
      inviteHash = await sha256(normalizeCode(str(body.invite, 40, "Invite code", { min: 1 })));
      const inv = this.one<{ expires_at: number; used_by: string | null; revoked_at: number | null }>("SELECT expires_at, used_by, revoked_at FROM teacher_invites WHERE code_hash = ?", inviteHash);
      if (!inv || inv.used_by || inv.revoked_at || inv.expires_at < now()) {
        this.bump(`invite-fail:${ip}`, 3600_000);
        throw new HttpError(400, "invalid_code", "That teacher invite code isn't valid. It may be used, expired or mistyped.");
      }
      role = "teacher";
    }
    if (this.one("SELECT 1 FROM users WHERE username_lc = ?", username.toLowerCase())) throw new HttpError(409, "username_taken", "That username is taken. Try another.");
    const h = await hashPassword(password);
    // Re-check after the await: another request may have taken the name or the invite meanwhile.
    const id = randomId();
    const t = now();
    this.ctx.storage.transactionSync(() => {
      if (this.one("SELECT 1 FROM users WHERE username_lc = ?", username.toLowerCase())) throw new HttpError(409, "username_taken", "That username is taken. Try another.");
      if (inviteHash) {
        const inv = this.one<{ used_by: string | null; revoked_at: number | null; expires_at: number }>("SELECT used_by, revoked_at, expires_at FROM teacher_invites WHERE code_hash = ?", inviteHash);
        if (!inv || inv.used_by || inv.revoked_at || inv.expires_at < now()) throw new HttpError(400, "invalid_code", "That teacher invite code isn't valid anymore.");
      }
      this.run(
        "INSERT INTO users (id, username, username_lc, display_name, role, pw_hash, pw_salt, pw_iter, must_change_pw, created_via, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)",
        id, username, username.toLowerCase(), displayName, role, h.hash, h.salt, h.iterations, inviteHash ? "invite" : "signup", t, t,
      );
      if (inviteHash) this.run("UPDATE teacher_invites SET used_by = ?, used_at = ? WHERE code_hash = ?", id, t, inviteHash);
    });
    this.bump(`reg:${ip}`, 3600_000);
    const token = await this.startSession(id);
    return { token, me: this.me(this.one<User>("SELECT * FROM users WHERE id = ?", id)!) };
  }

  private async login(body: Record<string, unknown>, ip: string) {
    const username = str(body.username, 40, "Username", { min: 1 });
    const password = typeof body.password === "string" ? body.password.slice(0, MAX_PASSWORD) : "";
    const lc = username.toLowerCase();
    this.guard(`login-ip:${ip}`, 300, 600_000, "Too many sign-in attempts from this network. Wait a few minutes.");
    this.guard(`login-fail:${lc}`, 10, 900_000, "Too many wrong passwords for this account. Wait 15 minutes and try again.");
    this.bump(`login-ip:${ip}`, 600_000);
    const u = this.one<User>("SELECT * FROM users WHERE username_lc = ?", lc);
    // Hash even when the user doesn't exist, so response time doesn't reveal which names exist.
    const ok = u ? await verifyPassword(password, u.pw_hash, u.pw_salt, u.pw_iter) : (await hashPassword(password), false);
    if (!u || !ok) {
      this.bump(`login-fail:${lc}`, 900_000);
      throw new HttpError(401, "invalid_credentials", "That username and password don't match.");
    }
    if (u.disabled) throw new HttpError(403, "forbidden", "This account is disabled.");
    if (u.pw_iter < PBKDF2_ITERATIONS) {
      const h = await hashPassword(password);
      this.run("UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, updated_at = ? WHERE id = ?", h.hash, h.salt, h.iterations, now(), u.id);
    }
    this.run("DELETE FROM rate_limits WHERE k = ?", `login-fail:${lc}`);
    const token = await this.startSession(u.id);
    return { token, me: this.me(u) };
  }

  private async changePassword(req: Request, body: Record<string, unknown>) {
    const u = await this.authed(req, { allowPasswordChange: true });
    this.guard(`pw-fail:${u.id}`, 10, 900_000, "Too many wrong passwords. Wait 15 minutes.");
    const current = typeof body.current === "string" ? body.current : "";
    if (!(await verifyPassword(current, u.pw_hash, u.pw_salt, u.pw_iter))) {
      this.bump(`pw-fail:${u.id}`, 900_000);
      throw new HttpError(401, "invalid_credentials", "Your current password isn't right.");
    }
    const next = checkPassword(body.next, u.username);
    if (next === current) throw new HttpError(400, "bad_request", "Choose a new password that's different from the current one.");
    const h = await hashPassword(next);
    const keep = await sha256((req.headers.get("authorization") || "").slice(7).trim());
    this.ctx.storage.transactionSync(() => {
      this.run("UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, must_change_pw = 0, updated_at = ? WHERE id = ?", h.hash, h.salt, h.iterations, now(), u.id);
      this.run("DELETE FROM auth_sessions WHERE user_id = ? AND token_hash != ?", u.id, keep); // sign out other devices
    });
    this.closeSockets(u.id);
    return { me: this.me(this.one<User>("SELECT * FROM users WHERE id = ?", u.id)!) };
  }

  // Server-only teacher provisioning. Needs the ADMIN_TOKEN secret, which exists only while
  // the provisioning workflow runs. Idempotent: an existing teacher is left unchanged.
  private async provision(req: Request, body: Record<string, unknown>, ip: string) {
    const admin = this.env.ADMIN_TOKEN;
    if (!admin || admin.length < 32) throw new HttpError(404, "not_found", "Not found.");
    this.guard(`admin:${ip}`, 20, 3600_000, "Too many attempts.");
    const given = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
    if (!safeEqual(await sha256(given), await sha256(admin))) {
      this.bump(`admin:${ip}`, 3600_000);
      throw new HttpError(401, "unauthorized", "Not authorized.");
    }
    const username = str(body.username, 20, "Username", { min: 3 });
    if (!USERNAME_RE.test(username)) throw new HttpError(400, "bad_request", "Invalid username.");
    const existing = this.one<User>("SELECT * FROM users WHERE username_lc = ?", username.toLowerCase());
    if (existing) {
      if (existing.role !== "teacher") throw new HttpError(409, "conflict", "A student account already uses that username. It was not changed.");
      if (body.reset !== true) return { status: "exists", username: existing.username };
      // Explicit reset (manual workflow run): new starter password, must change, all sessions end.
      const pw = checkPassword(body.password, existing.username);
      const h = await hashPassword(pw);
      this.ctx.storage.transactionSync(() => {
        this.run("UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, must_change_pw = 1, updated_at = ? WHERE id = ?", h.hash, h.salt, h.iterations, now(), existing.id);
        this.run("DELETE FROM auth_sessions WHERE user_id = ?", existing.id);
      });
      this.closeSockets(existing.id);
      return { status: "reset", username: existing.username };
    }
    const password = checkPassword(body.password, username);
    const displayName = str(body.displayName, 40, "Name") || username;
    const h = await hashPassword(password);
    const t = now();
    this.run(
      "INSERT INTO users (id, username, username_lc, display_name, role, pw_hash, pw_salt, pw_iter, must_change_pw, created_via, created_at, updated_at) VALUES (?, ?, ?, ?, 'teacher', ?, ?, ?, 1, 'provision', ?, ?)",
      randomId(), username, username.toLowerCase(), displayName, h.hash, h.salt, h.iterations, t, t,
    );
    return { status: "created", username };
  }

  private async createInvite(req: Request) {
    const u = await this.teacher(req);
    this.guard(`invites:${u.id}`, 20, DAY, "You've made a lot of invites today. Try again tomorrow.");
    const code = randomCode(CODE_ALPHABET, 12);
    const t = now();
    this.run("INSERT INTO teacher_invites (code_hash, created_by, created_at, expires_at, hint) VALUES (?, ?, ?, ?, ?)", await sha256(code), u.id, t, t + 7 * DAY, code.slice(-4));
    this.bump(`invites:${u.id}`, DAY);
    return { code: `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`, expiresAt: t + 7 * DAY };
  }
  private async listInvites(req: Request) {
    const u = await this.teacher(req);
    return {
      invites: this.all<{ hint: string; created_at: number; expires_at: number; used_at: number | null; revoked_at: number | null; used_name: string | null; code_hash: string }>(
        "SELECT i.code_hash, i.hint, i.created_at, i.expires_at, i.used_at, i.revoked_at, u.display_name AS used_name FROM teacher_invites i LEFT JOIN users u ON u.id = i.used_by WHERE i.created_by = ? ORDER BY i.created_at DESC LIMIT 50",
        u.id,
      ).map((i) => ({ id: i.code_hash.slice(0, 16), hint: i.hint, createdAt: i.created_at, expiresAt: i.expires_at, usedAt: i.used_at, usedBy: i.used_name, revoked: !!i.revoked_at })),
    };
  }
  private async revokeInvite(req: Request, id: string) {
    const u = await this.teacher(req);
    this.run("UPDATE teacher_invites SET revoked_at = ? WHERE created_by = ? AND substr(code_hash, 1, 16) = ? AND used_by IS NULL", now(), u.id, id);
    return { ok: true };
  }

  // ---------- classes ----------
  private classInfo(c: Row, forTeacher: boolean, extra: Partial<ClassInfo> = {}): ClassInfo {
    return {
      id: c.id as string,
      name: c.name as string,
      course: c.course as ClassInfo["course"],
      section: (c.section as string) || "",
      description: (c.description as string) || "",
      joinCode: forTeacher ? ((c.join_code as string) ?? null) : null,
      joinEnabled: !!c.join_enabled,
      archived: !!c.archived_at,
      createdAt: c.created_at as number,
      teacherName: (c.teacher_name as string) || "",
      ...extra,
    };
  }
  private ownedClass(u: User, id: string) {
    const c = this.one("SELECT c.*, u.display_name AS teacher_name FROM classes c JOIN users u ON u.id = c.teacher_id WHERE c.id = ?", id);
    // Same answer whether the class doesn't exist or belongs to someone else.
    if (!c || c.teacher_id !== u.id) throw new HttpError(404, "not_found", "Class not found.");
    return c;
  }
  private newJoinCode() {
    for (let i = 0; i < 20; i++) {
      const code = randomCode(CODE_ALPHABET, 8);
      if (!this.one("SELECT 1 FROM classes WHERE join_code = ?", code)) return code;
    }
    throw new HttpError(500, "server_error", "Couldn't make a class code. Try again.");
  }

  private async listClasses(req: Request) {
    const u = await this.authed(req);
    if (u.role === "teacher") {
      const rows = this.all(
        "SELECT c.*, ? AS teacher_name, (SELECT COUNT(*) FROM memberships m WHERE m.class_id = c.id AND m.left_at IS NULL) AS members FROM classes c WHERE c.teacher_id = ? ORDER BY c.archived_at IS NOT NULL, c.created_at DESC",
        u.display_name, u.id,
      );
      return { classes: rows.map((c) => this.classInfo(c, true, { memberCount: c.members as number })) };
    }
    const rows = this.all(
      "SELECT c.*, t.display_name AS teacher_name, m.joined_at, m.share_play FROM memberships m JOIN classes c ON c.id = m.class_id JOIN users t ON t.id = c.teacher_id WHERE m.student_id = ? AND m.left_at IS NULL ORDER BY m.joined_at DESC",
      u.id,
    );
    return { classes: rows.map((c) => this.classInfo(c, false, { joinedAt: c.joined_at as number, sharePlay: !!c.share_play })) };
  }

  private async createClass(req: Request, body: Record<string, unknown>) {
    const u = await this.teacher(req);
    this.guard(`classes:${u.id}`, 50, DAY, "You've created many classes today. Try again tomorrow.");
    const name = str(body.name, 80, "Class name", { min: 1 });
    const course = body.course;
    if (!COURSES.includes(course as never)) throw new HttpError(400, "bad_request", "Pick AP CSA or AP CSP.");
    const id = randomId();
    const t = now();
    this.run(
      "INSERT INTO classes (id, teacher_id, name, course, section, description, join_code, join_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
      id, u.id, name, course, str(body.section, 40, "Section"), str(body.description, 300, "Description"), this.newJoinCode(), t, t,
    );
    this.bump(`classes:${u.id}`, DAY);
    return { class: this.classInfo(this.ownedClass(u, id), true, { memberCount: 0 }) };
  }

  private async updateClass(req: Request, id: string, body: Record<string, unknown>) {
    const u = await this.teacher(req);
    const c = this.ownedClass(u, id);
    const name = body.name !== undefined ? str(body.name, 80, "Class name", { min: 1 }) : (c.name as string);
    const section = body.section !== undefined ? str(body.section, 40, "Section") : (c.section as string);
    const description = body.description !== undefined ? str(body.description, 300, "Description") : (c.description as string);
    const joinEnabled = body.joinEnabled !== undefined ? bool(body.joinEnabled) : (c.join_enabled as number);
    this.run("UPDATE classes SET name = ?, section = ?, description = ?, join_enabled = ?, updated_at = ? WHERE id = ?", name, section, description, joinEnabled, now(), id);
    this.broadcast(id, "class");
    return { class: this.classInfo(this.ownedClass(u, id), true) };
  }
  private async rotateCode(req: Request, id: string) {
    const u = await this.teacher(req);
    this.ownedClass(u, id);
    this.run("UPDATE classes SET join_code = ?, updated_at = ? WHERE id = ?", this.newJoinCode(), now(), id);
    return { class: this.classInfo(this.ownedClass(u, id), true) };
  }
  private async archiveClass(req: Request, id: string, body: Record<string, unknown>) {
    const u = await this.teacher(req);
    this.ownedClass(u, id);
    this.run("UPDATE classes SET archived_at = ?, updated_at = ? WHERE id = ?", body.archived === false ? null : now(), now(), id);
    this.broadcast(id, "class");
    return { class: this.classInfo(this.ownedClass(u, id), true) };
  }

  private async join(req: Request, body: Record<string, unknown>, ip: string) {
    const u = await this.authed(req);
    if (u.role !== "student") throw new HttpError(403, "forbidden", "Teacher accounts can't join classes. Sign in with a student account.");
    this.guard(`join-fail:${u.id}`, 10, 900_000, "Too many wrong class codes. Wait 15 minutes and check the code with your teacher.");
    this.guard(`join-fail-ip:${ip}`, 100, 900_000, "Too many wrong class codes from this network. Wait a few minutes.");
    const code = normalizeCode(typeof body.code === "string" ? body.code.slice(0, 40) : "");
    const c = CLASS_CODE_RE.test(code) ? this.one("SELECT c.*, t.display_name AS teacher_name FROM classes c JOIN users t ON t.id = c.teacher_id WHERE c.join_code = ?", code) : null;
    if (!c) {
      this.bump(`join-fail:${u.id}`, 900_000);
      this.bump(`join-fail-ip:${ip}`, 900_000);
      throw new HttpError(404, "invalid_code", "That class code didn't match a class. Check it with your teacher.");
    }
    if (c.archived_at || !c.join_enabled) throw new HttpError(403, "class_closed", "That class isn't accepting new students right now. Ask your teacher.");
    const open = this.one<{ joined_at: number; share_play: number }>("SELECT joined_at, share_play FROM memberships WHERE class_id = ? AND student_id = ? AND left_at IS NULL", c.id, u.id);
    if (open) return { class: this.classInfo(c, false, { joinedAt: open.joined_at, sharePlay: !!open.share_play }), already: true };
    const sharePlay = body.sharePlay === false ? 0 : 1;
    const t = now();
    this.run("INSERT INTO memberships (class_id, student_id, joined_at, share_play) VALUES (?, ?, ?, ?)", c.id, u.id, t, sharePlay);
    this.broadcast(c.id as string, "roster");
    return { class: this.classInfo(c, false, { joinedAt: t, sharePlay: !!sharePlay }), already: false };
  }
  private async leave(req: Request, id: string) {
    const u = await this.student(req);
    this.run("UPDATE memberships SET left_at = ?, left_reason = 'left' WHERE class_id = ? AND student_id = ? AND left_at IS NULL", now(), id, u.id);
    this.broadcast(id, "roster");
    return { ok: true };
  }
  private async setSharing(req: Request, id: string, body: Record<string, unknown>) {
    const u = await this.student(req);
    const r = this.one("SELECT id FROM memberships WHERE class_id = ? AND student_id = ? AND left_at IS NULL", id, u.id);
    if (!r) throw new HttpError(404, "not_found", "You're not in that class.");
    this.run("UPDATE memberships SET share_play = ? WHERE id = ?", bool(body.sharePlay), r.id);
    this.broadcast(id, "roster");
    return { ok: true, sharePlay: !!body.sharePlay };
  }
  private async removeMember(req: Request, id: string, studentId: string) {
    const u = await this.teacher(req);
    this.ownedClass(u, id);
    this.run("UPDATE memberships SET left_at = ?, left_reason = 'removed' WHERE class_id = ? AND student_id = ? AND left_at IS NULL", now(), id, studentId);
    this.broadcast(id, "roster");
    return { ok: true };
  }

  // ---------- assignments ----------
  private parseTarget(v: unknown): AssignmentTarget {
    const t = (v || {}) as Record<string, unknown>;
    if (t.kind === "battles") {
      if (!Array.isArray(t.battles) || !t.battles.length || t.battles.length > WORLDS.length * (BOSS + 1)) throw new HttpError(400, "bad_request", "Pick at least one battle.");
      const seen = new Set<string>();
      const battles: [number, number][] = [];
      for (const p of t.battles) {
        if (!Array.isArray(p) || p.length !== 2) throw new HttpError(400, "bad_request", "Invalid battle.");
        const w = int(p[0], 0, WORLDS.length - 1, "World"), b = int(p[1], 0, BOSS, "Battle");
        if (!seen.has(`${w}-${b}`)) battles.push([w, b]);
        seen.add(`${w}-${b}`);
      }
      return { kind: "battles", battles: battles.sort((a, b) => a[0] - b[0] || a[1] - b[1]) };
    }
    if (t.kind === "practice") {
      const lessonId = str(t.lessonId, 60, "Lesson", { min: 3 });
      if (!/^[a-z0-9-]+$/.test(lessonId)) throw new HttpError(400, "bad_request", "Invalid lesson.");
      const difficulty = t.difficulty;
      if (!["warmup", "core", "exam", "mixed"].includes(difficulty as string)) throw new HttpError(400, "bad_request", "Invalid difficulty.");
      return { kind: "practice", lessonId, lessonTitle: str(t.lessonTitle, 120, "Lesson title", { min: 1 }), difficulty: difficulty as "mixed", count: int(t.count, 3, 20, "Question count") };
    }
    throw new HttpError(400, "bad_request", "Pick battles or a practice topic.");
  }
  private assignmentOut(a: Row): Assignment {
    const sessions = Number(this.one<{ n: number }>("SELECT COUNT(*) AS n FROM play_sessions WHERE assignment_id = ?", a.id)?.n || 0);
    return {
      id: a.id as string,
      classId: a.class_id as string,
      title: a.title as string,
      instructions: a.instructions as string,
      target: JSON.parse(a.target_json as string),
      dueAt: (a.due_at as number) ?? null,
      dueTz: a.due_tz as string,
      status: a.status as Assignment["status"],
      version: a.version as number,
      createdAt: a.created_at as number,
      updatedAt: a.updated_at as number,
      publishedAt: (a.published_at as number) ?? null,
      targetsLocked: a.status === "published" && sessions > 0,
    };
  }
  private readAssignmentBody(body: Record<string, unknown>, partial: boolean) {
    const out: Record<string, unknown> = {};
    if (!partial || body.title !== undefined) out.title = str(body.title, 120, "Title", { min: 1 });
    if (!partial || body.instructions !== undefined) out.instructions = str(body.instructions, 2000, "Instructions");
    if (!partial || body.target !== undefined) out.target = this.parseTarget(body.target);
    if (!partial || body.dueAt !== undefined) {
      if (body.dueAt === null || body.dueAt === undefined) out.dueAt = null;
      else out.dueAt = int(body.dueAt, now() - 365 * DAY, now() + 730 * DAY, "Due date");
    }
    if (!partial || body.dueTz !== undefined) {
      const tz = optStr(body.dueTz, 64) || "UTC";
      if (!/^[A-Za-z0-9_/+\-]+$/.test(tz)) throw new HttpError(400, "bad_request", "Invalid time zone.");
      out.dueTz = tz;
    }
    if (!partial || body.status !== undefined) {
      if (body.status !== "draft" && body.status !== "published") throw new HttpError(400, "bad_request", "Status must be draft or published.");
      out.status = body.status;
    }
    return out;
  }
  private async createAssignment(req: Request, classId: string, body: Record<string, unknown>) {
    const u = await this.teacher(req);
    const c = this.ownedClass(u, classId);
    const a = this.readAssignmentBody(body, false);
    if (a.status === "published" && c.archived_at) throw new HttpError(409, "conflict", "This class is archived. Unarchive it to publish assignments.");
    const id = randomId();
    const t = now();
    this.run(
      "INSERT INTO assignments (id, class_id, title, instructions, target_json, due_at, due_tz, status, version, created_at, updated_at, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)",
      id, classId, a.title, a.instructions, JSON.stringify(a.target), a.dueAt, a.dueTz, a.status, t, t, a.status === "published" ? t : null,
    );
    this.broadcast(classId, "assignments");
    return { assignment: this.assignmentOut(this.one("SELECT * FROM assignments WHERE id = ?", id)!) };
  }
  private ownedAssignment(u: User, id: string) {
    const a = this.one("SELECT a.*, c.teacher_id, c.archived_at AS class_archived FROM assignments a JOIN classes c ON c.id = a.class_id WHERE a.id = ? AND a.deleted_at IS NULL", id);
    if (!a || a.teacher_id !== u.id) throw new HttpError(404, "not_found", "Assignment not found.");
    return a;
  }
  // Editing policy: drafts can change freely. Once published work exists, the battles/topic
  // are locked (create a new assignment instead); title, instructions and due date can still
  // change, and each change bumps the version recorded on later submissions.
  private async updateAssignment(req: Request, id: string, body: Record<string, unknown>) {
    const u = await this.teacher(req);
    const a = this.ownedAssignment(u, id);
    const p = this.readAssignmentBody(body, true);
    const cur = this.assignmentOut(a);
    if (p.target && cur.targetsLocked && JSON.stringify(p.target) !== JSON.stringify(cur.target))
      throw new HttpError(409, "conflict", "Students already have work recorded on this assignment, so its battles or topic can't change. Create a new assignment instead.");
    if (p.status === "published" && a.class_archived) throw new HttpError(409, "conflict", "This class is archived. Unarchive it to publish assignments.");
    const next = {
      title: (p.title as string) ?? cur.title,
      instructions: (p.instructions as string) ?? cur.instructions,
      target: (p.target as AssignmentTarget) ?? cur.target,
      dueAt: p.dueAt !== undefined ? (p.dueAt as number | null) : cur.dueAt,
      dueTz: (p.dueTz as string) ?? cur.dueTz,
      status: (p.status as string) ?? cur.status,
    };
    const contentChanged = next.title !== cur.title || next.instructions !== cur.instructions || JSON.stringify(next.target) !== JSON.stringify(cur.target) || next.dueAt !== cur.dueAt || next.dueTz !== cur.dueTz;
    this.run(
      "UPDATE assignments SET title = ?, instructions = ?, target_json = ?, due_at = ?, due_tz = ?, status = ?, version = version + ?, updated_at = ?, published_at = COALESCE(published_at, ?) WHERE id = ?",
      next.title, next.instructions, JSON.stringify(next.target), next.dueAt, next.dueTz, next.status, contentChanged ? 1 : 0, now(), next.status === "published" ? now() : null, id,
    );
    this.broadcast(a.class_id as string, "assignments");
    return { assignment: this.assignmentOut(this.one("SELECT * FROM assignments WHERE id = ?", id)!) };
  }
  private async deleteAssignment(req: Request, id: string) {
    const u = await this.teacher(req);
    const a = this.ownedAssignment(u, id);
    if (Number(this.one<{ n: number }>("SELECT COUNT(*) AS n FROM play_sessions WHERE assignment_id = ?", id)?.n || 0) > 0)
      throw new HttpError(409, "conflict", "Students have work recorded on this assignment. Unpublish it instead so their work stays available.");
    this.run("UPDATE assignments SET deleted_at = ? WHERE id = ?", now(), id);
    this.broadcast(a.class_id as string, "assignments");
    return { ok: true };
  }
  private async listAssignments(req: Request, classId: string) {
    const u = await this.authed(req);
    if (u.role === "teacher") {
      this.ownedClass(u, classId);
      return { assignments: this.all("SELECT * FROM assignments WHERE class_id = ? AND deleted_at IS NULL ORDER BY created_at DESC", classId).map((a) => this.assignmentOut(a)) };
    }
    if (!this.one("SELECT 1 FROM memberships WHERE class_id = ? AND student_id = ? AND left_at IS NULL", classId, u.id)) throw new HttpError(404, "not_found", "Class not found.");
    return { assignments: this.all("SELECT * FROM assignments WHERE class_id = ? AND deleted_at IS NULL AND status = 'published' ORDER BY COALESCE(due_at, 9e15), created_at", classId).map((a) => this.assignmentOut(a)) };
  }

  // Completion comes only from work launched from this assignment (assignment_id on the
  // session), so an unrelated battle can never complete it.
  private assignmentProgress(a: Assignment, studentId: string): { state: AssignmentState; done: number; needed: number; completedAt: number | null; late: boolean } {
    let done = 0, needed = 1, completedAt: number | null = null;
    if (a.target.kind === "battles") {
      needed = a.target.battles.length;
      for (const [w, b] of a.target.battles) {
        const r = this.one<{ t: number | null }>("SELECT MIN(COALESCE(finished_at, finished_received_at)) AS t FROM play_sessions WHERE assignment_id = ? AND student_id = ? AND kind = 'battle' AND world = ? AND battle = ? AND outcome = 'won'", a.id, studentId, w, b);
        if (r?.t) {
          done++;
          completedAt = Math.max(completedAt ?? 0, r.t);
        }
      }
    } else {
      const r = this.one<{ t: number | null }>("SELECT MIN(COALESCE(finished_at, finished_received_at)) AS t FROM play_sessions WHERE assignment_id = ? AND student_id = ? AND kind = 'practice' AND outcome = 'completed' AND answered >= ?", a.id, studentId, a.target.count);
      if (r?.t) {
        done = 1;
        completedAt = r.t;
      }
    }
    const started = !!this.one("SELECT 1 FROM play_sessions WHERE assignment_id = ? AND student_id = ? LIMIT 1", a.id, studentId);
    const complete = done >= needed;
    const state: AssignmentState = complete ? "completed" : a.dueAt && now() > a.dueAt ? "overdue" : started ? "in_progress" : "not_started";
    return { state, done, needed, completedAt: complete ? completedAt : null, late: !!(complete && a.dueAt && completedAt && completedAt > a.dueAt) };
  }

  // ---------- ingestion ----------
  private async sync(req: Request, body: Record<string, unknown>) {
    const u = await this.authed(req);
    const events = body.events;
    if (!Array.isArray(events) || events.length > 200) throw new HttpError(400, "bad_request", "Send 1 to 200 events.");
    this.guard(`sync:${u.id}`, 600, 600_000, "Too many uploads. Retrying shortly.");
    this.bump(`sync:${u.id}`, 600_000);
    const acks: SyncAck[] = [];
    const touched = new Set<string>();
    // Device clocks are often off. The device sends its clock reading at upload time; the
    // difference from server time corrects every event time in the batch (queued offline
    // events too, since they were stamped by the same clock).
    const sentAt = typeof body.sentAt === "number" && Number.isFinite(body.sentAt) ? body.sentAt : null;
    const skew = sentAt === null ? 0 : now() - sentAt;
    for (const raw of events as SyncEvent[]) {
      const id = (raw as { id?: unknown })?.id;
      if (!isId(id)) {
        acks.push({ id: String(id ?? ""), status: "rejected", reason: "invalid event id" });
        continue;
      }
      const prior = this.one<{ user_id: string; status: string; reason: string | null }>("SELECT user_id, status, reason FROM receipts WHERE event_id = ?", id);
      if (prior) {
        acks.push(prior.user_id === u.id ? { id, status: "duplicate" } : { id, status: "rejected", reason: "event id already used" });
        continue;
      }
      try {
        const sessionId = this.ctx.storage.transactionSync(() => {
          const sid = this.applyEvent(u, raw, skew);
          this.run("INSERT INTO receipts (event_id, user_id, status, received_at) VALUES (?, ?, 'ok', ?)", id, u.id, now());
          return sid;
        });
        // Teachers are notified when a run starts or ends, not for every answer.
        if (sessionId && raw.type !== "attempt") touched.add(sessionId);
        acks.push({ id, status: "ok" });
      } catch (e) {
        const reason = e instanceof HttpError ? e.message : "invalid event";
        if (!(e instanceof HttpError)) console.error("sync event failed", e);
        this.run("INSERT OR IGNORE INTO receipts (event_id, user_id, status, reason, received_at) VALUES (?, ?, 'rejected', ?, ?)", id, u.id, reason, now());
        acks.push({ id, status: "rejected", reason });
      }
    }
    const classes = new Set<string>();
    for (const sid of touched) for (const c of this.classesSeeing(sid)) classes.add(c);
    for (const c of classes) this.broadcast(c, "results");
    return { acks, serverTime: now() };
  }

  private clampTime(t: unknown, lo: number, hi: number) {
    const n = typeof t === "number" && Number.isFinite(t) ? t : hi;
    return Math.min(hi, Math.max(lo, Math.round(n)));
  }

  private applyEvent(u: User, raw: SyncEvent, skew: number): string | null {
    const t = now();
    const e = typeof raw.at === "number" ? ({ ...raw, at: raw.at + skew } as SyncEvent) : raw;
    if (e.type === "session.start") {
      const s = e.session || ({} as SyncEvent & { session: never })["session"];
      if (!s || !isId(s.id)) throw new HttpError(400, "bad_request", "invalid session id");
      const existing = this.one<{ student_id: string }>("SELECT student_id FROM play_sessions WHERE id = ?", s.id);
      if (existing) {
        if (existing.student_id !== u.id) throw new HttpError(409, "conflict", "session id belongs to another account");
        return s.id; // replay with a new event id
      }
      const kind = s.kind === "practice" ? "practice" : s.kind === "battle" ? "battle" : null;
      if (!kind) throw new HttpError(400, "bad_request", "invalid kind");
      let world: number | null = null, battle: number | null = null, enemy: string | null = null, lessonId: string | null = null;
      if (kind === "battle") {
        world = int(s.world, 0, WORLDS.length - 1, "world");
        battle = int(s.battle, 0, BOSS, "battle");
        enemy = WORLDS[world].enemies[battle].name;
      } else {
        lessonId = typeof s.lessonId === "string" && /^[a-z0-9-]{3,60}$/.test(s.lessonId) ? s.lessonId : null;
      }
      const questionCount = int(s.questionCount, 1, 60, "questionCount");
      const contentVersion = str(s.contentVersion, 40, "contentVersion", { min: 1 });
      const startedAt = this.clampTime(e.at, t - 30 * DAY, t);
      // Classroom context is accepted only if it checks out now: a published assignment in a
      // class the student is enrolled in, covering this battle or topic. Otherwise the run is
      // still saved, as unassigned play, with a note.
      let classId: string | null = null, assignmentId: string | null = null, assignmentVersion: number | null = null, note: string | null = null;
      if (s.assignmentId !== undefined && s.assignmentId !== null) {
        const a = isId(s.assignmentId) ? this.one("SELECT a.*, c.archived_at AS class_archived FROM assignments a JOIN classes c ON c.id = a.class_id WHERE a.id = ? AND a.deleted_at IS NULL", s.assignmentId) : null;
        const member = a && this.one("SELECT 1 FROM memberships WHERE class_id = ? AND student_id = ? AND left_at IS NULL", a.class_id, u.id);
        const target = a ? (JSON.parse(a.target_json as string) as AssignmentTarget) : null;
        const fits = target && (target.kind === "battles" ? kind === "battle" && target.battles.some(([w, b]) => w === world && b === battle) : kind === "practice" && target.lessonId === lessonId);
        if (!a) note = "assignment not found";
        else if (!member) note = "not enrolled in the assignment's class";
        else if (a.status !== "published") note = "assignment not published";
        else if (a.class_archived) note = "class archived";
        else if (!fits) note = "activity isn't part of the assignment";
        else if (s.classId && s.classId !== a.class_id) note = "class didn't match the assignment";
        else {
          classId = a.class_id as string;
          assignmentId = a.id as string;
          assignmentVersion = a.version as number;
        }
      }
      this.run(
        `INSERT INTO play_sessions (id, student_id, kind, world, battle, enemy, lesson_id, class_id, assignment_id, assignment_version, context_note, question_count, content_version, outcome, started_at, received_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', ?, ?)`,
        s.id, u.id, kind, world, battle, enemy, lessonId, classId, assignmentId, assignmentVersion, note, questionCount, contentVersion, startedAt, t,
      );
      return s.id;
    }

    const sid = (e as { sessionId?: unknown }).sessionId;
    if (!isId(sid)) throw new HttpError(400, "bad_request", "invalid session id");
    const ses = this.one<{ student_id: string; outcome: string; started_at: number; kind: string; question_count: number }>("SELECT student_id, outcome, started_at, kind, question_count FROM play_sessions WHERE id = ?", sid);
    if (!ses || ses.student_id !== u.id) throw new HttpError(404, "not_found", "unknown session");

    if (e.type === "attempt") {
      const a = e.attempt || ({} as never);
      const index = int(a.index, 0, 200, "index"), round = int(a.round, 0, 30, "round"), tryNo = int(a.tryNo, 0, 10, "tryNo");
      const options = Array.isArray(a.options) ? a.options.slice(0, 12).map((o) => String(o).slice(0, 600)) : null;
      const correct = a.correct === null || a.correct === undefined ? null : a.correct ? 1 : 0;
      this.run(
        `INSERT OR IGNORE INTO attempts (session_id, idx, round, try_no, student_id, question_id, skill, kind, prompt, code, options_json, given, expected, correct, hinted, client_at, received_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        sid, index, round, tryNo, u.id, str(a.questionId, 120, "questionId", { min: 1 }), str(a.skill, 120, "skill", { min: 1 }), str(a.kind, 20, "kind", { min: 1 }),
        str(a.prompt, 4000, "prompt", { trim: false }), optStr(a.code, 8000) ?? null, options ? JSON.stringify(options) : null, str(a.given, 4000, "given", { trim: false }),
        optStr(a.expected, 4000) ?? null, correct, a.hinted ? 1 : 0, this.clampTime(e.at, ses.started_at, t), t,
      );
      // Totals are derived once the run ends (saves a write per answer); an answer arriving
      // after the end (out-of-order upload) updates them right away.
      if (ses.outcome !== "in_progress") this.recompute(sid);
      return sid;
    }
    if (e.type === "session.finish") {
      if (ses.outcome !== "in_progress" && ses.outcome !== "abandoned") return sid; // already final: append-only
      const r = e.result || ({} as never);
      const outcome = ses.kind === "battle" ? (r.outcome === "won" || r.outcome === "lost" ? r.outcome : null) : r.outcome === "completed" ? "completed" : null;
      if (!outcome) throw new HttpError(400, "bad_request", "invalid outcome");
      const items: Record<string, number> = {};
      for (const p of POWERS) if (typeof r.itemsUsed?.[p] === "number") items[p] = Math.max(0, Math.min(99, Math.round(r.itemsUsed[p])));
      const hints = typeof r.hintsUsed === "number" ? Math.max(0, Math.min(99, Math.round(r.hintsUsed))) : 0;
      const combo = typeof r.bestCombo === "number" ? Math.max(0, Math.min(999, Math.round(r.bestCombo))) : null;
      this.run(
        "UPDATE play_sessions SET outcome = ?, finished_at = ?, finished_received_at = ?, items_json = ?, hints_used = MAX(hints_used, ?), best_combo = ? WHERE id = ?",
        outcome, this.clampTime(e.at, ses.started_at, t), t, JSON.stringify(items), hints, combo, sid,
      );
      this.recompute(sid);
      return sid;
    }
    if (e.type === "session.abandon") {
      if (ses.outcome === "in_progress") {
        this.run("UPDATE play_sessions SET outcome = 'abandoned', finished_at = ?, finished_received_at = ? WHERE id = ?", this.clampTime(e.at, ses.started_at, t), t, sid);
        this.recompute(sid);
      }
      return sid;
    }
    throw new HttpError(400, "bad_request", "unknown event type");
  }

  // Summary columns are always derived from the stored attempts, never from client totals.
  private recompute(sid: string) {
    const s = this.one<{ outcome: string; question_count: number; kind: string; hints_used: number }>("SELECT outcome, question_count, kind, hints_used FROM play_sessions WHERE id = ?", sid)!;
    const agg = this.one<{ first: number; answered: number; retries: number; hinted: number }>(
      `SELECT
         COUNT(DISTINCT CASE WHEN round = 0 AND try_no = 0 AND correct = 1 AND hinted = 0 THEN idx END) AS first,
         COUNT(DISTINCT idx) AS answered,
         SUM(CASE WHEN try_no > 0 OR round > 0 THEN 1 ELSE 0 END) AS retries,
         COUNT(DISTINCT CASE WHEN hinted = 1 THEN idx END) AS hinted
       FROM attempts WHERE session_id = ?`,
      sid,
    )!;
    const stars = s.kind === "battle" && s.outcome === "won" ? starsFor(agg.first, s.question_count) : null;
    this.run("UPDATE play_sessions SET first_try = ?, answered = ?, retries = ?, hints_used = MAX(hints_used, ?), stars = ? WHERE id = ?", agg.first, agg.answered, agg.retries || 0, agg.hinted, stars, sid);
  }

  // Which classes may see a run: its assignment's class, or (for unassigned play) every class
  // the student was enrolled in with sharing on when the run started.
  private classesSeeing(sid: string): string[] {
    const s = this.one<{ class_id: string | null; student_id: string; started_at: number }>("SELECT class_id, student_id, started_at FROM play_sessions WHERE id = ?", sid);
    if (!s) return [];
    if (s.class_id) return [s.class_id];
    return this.all<{ class_id: string }>(
      "SELECT DISTINCT class_id FROM memberships WHERE student_id = ? AND share_play = 1 AND joined_at <= ? AND (left_at IS NULL OR left_at > ?)",
      s.student_id, s.started_at, s.started_at,
    ).map((r) => r.class_id);
  }

  // Runs a teacher may see for class ?: linked to the class, or shared unassigned play
  // inside an enrollment period with sharing on.
  private static VIS = `
    WITH vis AS (
      SELECT s.* FROM play_sessions s WHERE s.class_id = ?1
      UNION
      SELECT s.* FROM play_sessions s JOIN memberships m ON m.student_id = s.student_id AND m.class_id = ?1
      WHERE s.class_id IS NULL AND m.share_play = 1 AND s.started_at >= m.joined_at AND (m.left_at IS NULL OR s.started_at < m.left_at)
    )`;

  private sessionOut(s: Row) {
    return {
      id: s.id as string,
      studentId: s.student_id as string,
      studentName: (s.student_name as string) || "",
      kind: s.kind as "battle",
      world: (s.world as number) ?? null,
      battle: (s.battle as number) ?? null,
      enemy: (s.enemy as string) ?? null,
      lessonId: (s.lesson_id as string) ?? null,
      classId: (s.class_id as string) ?? null,
      assignmentId: (s.assignment_id as string) ?? null,
      assignmentTitle: (s.assignment_title as string) ?? null,
      outcome: s.outcome as "won",
      stars: (s.stars as number) ?? null,
      firstTry: s.first_try as number,
      questionCount: s.question_count as number,
      answered: s.answered as number,
      retries: s.retries as number,
      hintsUsed: s.hints_used as number,
      startedAt: s.started_at as number,
      finishedAt: (s.finished_at as number) ?? null,
      receivedAt: s.received_at as number,
      contextNote: (s.context_note as string) ?? null,
      itemsUsed: JSON.parse((s.items_json as string) || "{}"),
    };
  }
  private attemptOut(a: Row) {
    return {
      sessionId: a.session_id as string,
      index: a.idx as number,
      round: a.round as number,
      tryNo: a.try_no as number,
      questionId: a.question_id as string,
      skill: a.skill as string,
      kind: a.kind as string,
      prompt: a.prompt as string,
      code: (a.code as string) ?? undefined,
      options: a.options_json ? JSON.parse(a.options_json as string) : undefined,
      given: a.given as string,
      expected: (a.expected as string) ?? undefined,
      correct: a.correct === null ? null : !!a.correct,
      hinted: !!a.hinted,
      receivedAt: a.received_at as number,
      contentVersion: (a.content_version as string) || "",
    };
  }

  // ---------- teacher views ----------
  private async summary(req: Request, classId: string) {
    const u = await this.teacher(req);
    const c = this.ownedClass(u, classId);
    const roster = this.all(
      `SELECT m.student_id, m.joined_at, m.share_play, u.display_name, u.username FROM memberships m JOIN users u ON u.id = m.student_id
       WHERE m.class_id = ? AND m.left_at IS NULL ORDER BY u.display_name COLLATE NOCASE`,
      classId,
    );
    const stats = new Map(
      this.all(
        `${Classroom.VIS}
         SELECT student_id, COUNT(*) AS runs,
           SUM(outcome = 'won') AS wins, SUM(outcome = 'lost') AS losses, SUM(outcome = 'abandoned') AS abandoned,
           SUM(CASE WHEN outcome IN ('won','lost') THEN first_try ELSE 0 END) AS first_try,
           SUM(CASE WHEN outcome IN ('won','lost') THEN question_count ELSE 0 END) AS first_total,
           SUM(hints_used) AS hints, SUM(retries) AS retries,
           MAX(COALESCE(finished_received_at, received_at)) AS last_activity
         FROM vis GROUP BY student_id`,
        classId,
      ).map((r) => [r.student_id as string, r]),
    );
    const assignments = this.all("SELECT * FROM assignments WHERE class_id = ? AND deleted_at IS NULL ORDER BY COALESCE(due_at, 9e15), created_at", classId).map((a) => this.assignmentOut(a));
    const published = assignments.filter((a) => a.status === "published");
    const states: Record<string, Record<string, ReturnType<Classroom["assignmentProgress"]>>> = {};
    for (const a of published) {
      states[a.id] = {};
      for (const r of roster) states[a.id][r.student_id as string] = this.assignmentProgress(a, r.student_id as string);
    }
    const recent = this.all(
      `${Classroom.VIS}
       SELECT vis.*, u.display_name AS student_name, a.title AS assignment_title FROM vis JOIN users u ON u.id = vis.student_id LEFT JOIN assignments a ON a.id = vis.assignment_id
       ORDER BY COALESCE(vis.finished_received_at, vis.received_at) DESC LIMIT 40`,
      classId,
    ).map((s) => this.sessionOut(s));
    const skills = this.all(
      `${Classroom.VIS}
       SELECT a.skill, COUNT(*) AS n, SUM(a.correct = 0 OR a.hinted = 1) AS missed, COUNT(DISTINCT a.student_id) AS students
       FROM attempts a JOIN vis ON vis.id = a.session_id
       WHERE a.round = 0 AND a.try_no = 0 AND a.correct IS NOT NULL
       GROUP BY a.skill ORDER BY n DESC LIMIT 200`,
      classId,
    ).map((r) => ({ skill: r.skill as string, firstTries: r.n as number, missed: (r.missed as number) || 0, students: r.students as number }));
    const studentSkills = this.all(
      `${Classroom.VIS}
       SELECT a.student_id, a.skill, COUNT(*) AS n, SUM(a.correct = 0 OR a.hinted = 1) AS missed
       FROM attempts a JOIN vis ON vis.id = a.session_id
       WHERE a.round = 0 AND a.try_no = 0 AND a.correct IS NOT NULL
       GROUP BY a.student_id, a.skill`,
      classId,
    );
    const formerMembers = this.all(
      `SELECT m.student_id, MAX(m.left_at) AS left_at, u.display_name FROM memberships m JOIN users u ON u.id = m.student_id
       WHERE m.class_id = ? AND m.left_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM memberships o WHERE o.class_id = m.class_id AND o.student_id = m.student_id AND o.left_at IS NULL)
       GROUP BY m.student_id ORDER BY left_at DESC`,
      classId,
    ).map((r) => ({ id: r.student_id as string, name: r.display_name as string, leftAt: r.left_at as number }));
    return {
      class: this.classInfo(c, true, { memberCount: roster.length }),
      students: roster.map((r) => {
        const s = stats.get(r.student_id as string);
        return {
          id: r.student_id as string,
          name: r.display_name as string,
          username: r.username as string,
          joinedAt: r.joined_at as number,
          sharePlay: !!r.share_play,
          runs: Number(s?.runs || 0),
          wins: Number(s?.wins || 0),
          losses: Number(s?.losses || 0),
          abandoned: Number(s?.abandoned || 0),
          firstTry: Number(s?.first_try || 0),
          firstTotal: Number(s?.first_total || 0),
          hints: Number(s?.hints || 0),
          retries: Number(s?.retries || 0),
          lastActivity: (s?.last_activity as number) ?? null,
          skills: studentSkills.filter((k) => k.student_id === r.student_id).map((k) => ({ skill: k.skill as string, firstTries: k.n as number, missed: (k.missed as number) || 0 })),
        };
      }),
      formerMembers,
      assignments,
      assignmentStates: states,
      recent,
      skills,
      serverTime: now(),
    };
  }

  private studentInClass(classId: string, studentId: string) {
    if (!isId(studentId) || !this.one("SELECT 1 FROM memberships WHERE class_id = ? AND student_id = ?", classId, studentId)) throw new HttpError(404, "not_found", "Student not found in this class.");
  }

  private async studentDetail(req: Request, classId: string, studentId: string) {
    const u = await this.teacher(req);
    this.ownedClass(u, classId);
    this.studentInClass(classId, studentId);
    const student = this.one("SELECT id, display_name, username FROM users WHERE id = ?", studentId)!;
    const periods = this.all("SELECT joined_at, left_at, left_reason, share_play FROM memberships WHERE class_id = ? AND student_id = ? ORDER BY joined_at", classId, studentId);
    const sessions = this.all(
      `${Classroom.VIS}
       SELECT vis.*, a.title AS assignment_title, s.content_version FROM vis LEFT JOIN assignments a ON a.id = vis.assignment_id JOIN play_sessions s ON s.id = vis.id
       WHERE vis.student_id = ?2 ORDER BY vis.started_at DESC LIMIT 300`,
      classId, studentId,
    );
    const attempts = this.all(
      `${Classroom.VIS}
       SELECT a.*, vis.content_version FROM attempts a JOIN vis ON vis.id = a.session_id WHERE vis.student_id = ?2 ORDER BY a.received_at DESC LIMIT 3000`,
      classId, studentId,
    );
    const assignments = this.all("SELECT * FROM assignments WHERE class_id = ? AND deleted_at IS NULL AND status = 'published'", classId).map((a) => this.assignmentOut(a));
    return {
      student: { id: student.id, name: student.display_name, username: student.username },
      periods: periods.map((p) => ({ joinedAt: p.joined_at, leftAt: p.left_at ?? null, leftReason: p.left_reason ?? null, sharePlay: !!p.share_play })),
      sessions: sessions.map((s) => this.sessionOut(s)),
      attempts: attempts.map((a) => this.attemptOut(a)),
      assignments: assignments.map((a) => ({ ...a, ...this.assignmentProgress(a, studentId) })),
      feedback: this.feedbackFor(classId, studentId),
    };
  }

  private async sessionDetail(req: Request, classId: string, sessionId: string) {
    const u = await this.teacher(req);
    this.ownedClass(u, classId);
    const s = this.one(`${Classroom.VIS} SELECT vis.*, u.display_name AS student_name, a.title AS assignment_title FROM vis JOIN users u ON u.id = vis.student_id LEFT JOIN assignments a ON a.id = vis.assignment_id WHERE vis.id = ?2`, classId, sessionId);
    if (!s) throw new HttpError(404, "not_found", "Result not found in this class.");
    const attempts = this.all("SELECT a.*, ? AS content_version FROM attempts a WHERE session_id = ? ORDER BY idx, round, try_no", s.content_version, sessionId);
    return { session: { ...this.sessionOut(s), contentVersion: s.content_version }, attempts: attempts.map((a) => this.attemptOut(a)) };
  }

  private async exportRows(req: Request, classId: string, url: URL) {
    const u = await this.teacher(req);
    this.ownedClass(u, classId);
    const q = url.searchParams;
    const conds: string[] = [];
    const args: unknown[] = [classId];
    const student = q.get("student");
    if (student) { conds.push(`vis.student_id = ?${args.length + 1}`); args.push(student); }
    const assignment = q.get("assignment");
    if (assignment) { conds.push(`vis.assignment_id = ?${args.length + 1}`); args.push(assignment); }
    const from = Number(q.get("from") || 0), to = Number(q.get("to") || 0);
    if (from) { conds.push(`vis.started_at >= ?${args.length + 1}`); args.push(from); }
    if (to) { conds.push(`vis.started_at < ?${args.length + 1}`); args.push(to); }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const sessions = this.all(
      `${Classroom.VIS} SELECT vis.*, u.display_name AS student_name, a.title AS assignment_title FROM vis JOIN users u ON u.id = vis.student_id LEFT JOIN assignments a ON a.id = vis.assignment_id ${where} ORDER BY vis.started_at LIMIT 5000`,
      ...args,
    ).map((s) => this.sessionOut(s));
    const topic = q.get("topic");
    const attemptArgs = [...args];
    let topicCond = "";
    if (topic) { topicCond = `${conds.length ? " AND" : " WHERE"} a.skill = ?${attemptArgs.length + 1}`; attemptArgs.push(topic); }
    const attempts = this.all(
      `${Classroom.VIS} SELECT a.*, vis.content_version, u.display_name AS student_name, vis.world, vis.battle, vis.enemy, vis.lesson_id, vis.assignment_id FROM attempts a JOIN vis ON vis.id = a.session_id JOIN users u ON u.id = a.student_id ${where}${topicCond} ORDER BY a.received_at LIMIT 20000`,
      ...attemptArgs,
    ).map((a) => ({ ...this.attemptOut(a), studentName: a.student_name, world: a.world, battle: a.battle, enemy: a.enemy, lessonId: a.lesson_id, assignmentId: a.assignment_id }));
    return { sessions: topic ? sessions.filter((s) => attempts.some((a) => a.sessionId === s.id)) : sessions, attempts };
  }

  // ---------- feedback ----------
  private feedbackFor(classId: string, studentId: string) {
    return this.all(
      "SELECT f.*, t.display_name AS teacher_name FROM feedback f JOIN users t ON t.id = f.teacher_id WHERE f.class_id = ? AND f.student_id = ? AND f.deleted_at IS NULL ORDER BY f.created_at DESC",
      classId, studentId,
    ).map((f) => ({ id: f.id, classId: f.class_id, studentId: f.student_id, assignmentId: f.assignment_id ?? null, sessionId: f.session_id ?? null, body: f.body, teacherName: f.teacher_name, createdAt: f.created_at, updatedAt: f.updated_at }));
  }
  private async addFeedback(req: Request, classId: string, body: Record<string, unknown>) {
    const u = await this.teacher(req);
    this.ownedClass(u, classId);
    const studentId = body.studentId as string;
    this.studentInClass(classId, studentId);
    const text = str(body.body, 2000, "Feedback", { min: 1 });
    const assignmentId = body.assignmentId ? (this.one("SELECT id FROM assignments WHERE id = ? AND class_id = ?", body.assignmentId, classId)?.id as string) ?? null : null;
    const sessionId = body.sessionId && isId(body.sessionId) ? (this.one(`${Classroom.VIS} SELECT id FROM vis WHERE id = ?2 AND student_id = ?3`, classId, body.sessionId, studentId)?.id as string) ?? null : null;
    const id = randomId();
    const t = now();
    this.run("INSERT INTO feedback (id, class_id, student_id, teacher_id, assignment_id, session_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", id, classId, studentId, u.id, assignmentId, sessionId, text, t, t);
    return { feedback: this.feedbackFor(classId, studentId).find((f) => f.id === id) };
  }
  private async editFeedback(req: Request, id: string, body: Record<string, unknown> | null) {
    const u = await this.teacher(req);
    const f = this.one("SELECT * FROM feedback WHERE id = ? AND teacher_id = ? AND deleted_at IS NULL", id, u.id);
    if (!f) throw new HttpError(404, "not_found", "Feedback not found.");
    if (body === null) this.run("UPDATE feedback SET deleted_at = ? WHERE id = ?", now(), id);
    else this.run("UPDATE feedback SET body = ?, updated_at = ? WHERE id = ?", str(body.body, 2000, "Feedback", { min: 1 }), now(), id);
    return { ok: true };
  }

  // ---------- student views ----------
  private async studentHome(req: Request) {
    const u = await this.student(req);
    const classes = this.all(
      "SELECT c.*, t.display_name AS teacher_name, m.joined_at, m.share_play FROM memberships m JOIN classes c ON c.id = m.class_id JOIN users t ON t.id = c.teacher_id WHERE m.student_id = ? AND m.left_at IS NULL ORDER BY m.joined_at DESC",
      u.id,
    );
    const assignments = classes.flatMap((c) =>
      this.all("SELECT * FROM assignments WHERE class_id = ? AND deleted_at IS NULL AND status = 'published' ORDER BY COALESCE(due_at, 9e15), created_at", c.id).map((row) => {
        const a = this.assignmentOut(row);
        return { ...a, className: c.name as string, ...this.assignmentProgress(a, u.id) };
      }),
    );
    const feedback = classes.flatMap((c) => this.feedbackFor(c.id as string, u.id).map((f) => ({ ...f, className: c.name as string })));
    const recent = this.all("SELECT s.*, a.title AS assignment_title, c.name AS class_name FROM play_sessions s LEFT JOIN assignments a ON a.id = s.assignment_id LEFT JOIN classes c ON c.id = s.class_id WHERE s.student_id = ? ORDER BY s.received_at DESC LIMIT 15", u.id).map((s) => ({ ...this.sessionOut(s), className: (s.class_name as string) ?? null }));
    return { classes: classes.map((c) => this.classInfo(c, false, { joinedAt: c.joined_at as number, sharePlay: !!c.share_play })), assignments, feedback, recent, serverTime: now() };
  }

  // ---------- cross-device progress ----------
  private async getProgress(req: Request) {
    const u = await this.authed(req);
    const r = this.one<{ version: number; doc: string }>("SELECT version, doc FROM progress WHERE user_id = ?", u.id);
    return { version: r?.version ?? 0, doc: r ? JSON.parse(r.doc) : null };
  }
  private async putProgress(req: Request, body: Record<string, unknown>) {
    const u = await this.authed(req);
    const base = int(body.baseVersion, 0, 1e9, "baseVersion");
    const doc = body.doc as Record<string, unknown>;
    if (!doc || typeof doc !== "object" || typeof doc.xp !== "number" || typeof doc.stars !== "object" || !Array.isArray(doc.owned)) throw new HttpError(400, "bad_request", "Invalid progress.");
    const text = JSON.stringify(doc);
    if (text.length > 200_000) throw new HttpError(400, "bad_request", "Progress is too large.");
    const cur = this.one<{ version: number; doc: string }>("SELECT version, doc FROM progress WHERE user_id = ?", u.id);
    if ((cur?.version ?? 0) !== base) return { conflict: true, version: cur?.version ?? 0, doc: cur ? JSON.parse(cur.doc) : null };
    const v = base + 1;
    this.run("INSERT INTO progress (user_id, version, doc, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET version = excluded.version, doc = excluded.doc, updated_at = excluded.updated_at", u.id, v, text, now());
    return { conflict: false, version: v };
  }

  // ---------- realtime ----------
  private broadcast(classId: string, what: string) {
    const msg = JSON.stringify({ type: "changed", classId, what, at: now() });
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment() as { classId?: string } | null;
      if (a?.classId === classId) {
        try {
          ws.send(msg);
        } catch {}
      }
    }
  }
  private closeSockets(userId: string) {
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment() as { uid?: string } | null;
      if (a?.uid === userId) {
        try {
          ws.close(4001, "signed out");
        } catch {}
      }
    }
  }
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string" || message.length > 2000) return ws.close(1003, "bad message");
    let m: { type?: string; token?: string; classId?: string };
    try {
      m = JSON.parse(message);
    } catch {
      return ws.close(1003, "bad message");
    }
    const att = (ws.deserializeAttachment() || {}) as { uid?: string; token?: string; classId?: string };
    if (m.type === "auth" && typeof m.token === "string") {
      try {
        const u = await this.authed(new Request("https://x/", { headers: { authorization: `Bearer ${m.token}` } }));
        if (u.role !== "teacher") return ws.close(4003, "teachers only");
        ws.serializeAttachment({ uid: u.id, token: m.token });
        ws.send(JSON.stringify({ type: "ready" }));
      } catch {
        ws.close(4001, "unauthorized");
      }
      return;
    }
    if (m.type === "subscribe" && typeof m.classId === "string") {
      if (!att.uid || !att.token) return ws.close(4001, "unauthorized");
      // Re-check the session and ownership on every subscribe.
      try {
        const u = await this.authed(new Request("https://x/", { headers: { authorization: `Bearer ${att.token}` } }));
        this.ownedClass(u, m.classId);
        ws.serializeAttachment({ uid: u.id, token: att.token, classId: m.classId });
        ws.send(JSON.stringify({ type: "subscribed", classId: m.classId, at: now() }));
      } catch {
        ws.serializeAttachment({ uid: att.uid, token: att.token });
        ws.send(JSON.stringify({ type: "error", message: "not allowed" }));
      }
    }
  }
  async webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code, "closing");
    } catch {}
  }

  // ---------- routing ----------
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const ip = req.headers.get("x-client-ip") || "unknown";
    const path = url.pathname.replace(/\/+$/, "");
    const m = req.method;
    try {
      if (path === "/v1/live") {
        if (req.headers.get("upgrade") !== "websocket") throw new HttpError(426, "bad_request", "Expected a WebSocket.");
        const pair = new WebSocketPair();
        this.ctx.acceptWebSocket(pair[1]);
        pair[1].serializeAttachment({});
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      if (path === "/v1/health" && m === "GET") return json({ ok: true, schema: this.schemaVersion(), time: now() });
      let body: Record<string, unknown> = {};
      if (m === "POST" || m === "PUT" || m === "PATCH") {
        const text = await req.text();
        if (text.length > 600_000) throw new HttpError(413, "bad_request", "Request too large.");
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            throw new HttpError(400, "bad_request", "Invalid JSON.");
          }
          if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "bad_request", "Invalid JSON.");
        }
      }
      const seg = path.split("/").slice(2); // after /v1
      const r = (method: string, ...parts: string[]) => m === method && seg.length === parts.length && parts.every((p, i) => p === "*" || p === seg[i]);

      if (r("POST", "auth", "register")) return json(await this.register(body, ip), 201);
      if (r("POST", "auth", "login")) return json(await this.login(body, ip));
      if (r("POST", "auth", "logout")) {
        const tok = (req.headers.get("authorization") || "").slice(7).trim();
        if (tok) this.run("DELETE FROM auth_sessions WHERE token_hash = ?", await sha256(tok));
        return json({ ok: true });
      }
      if (r("POST", "auth", "logout-all")) {
        const u = await this.authed(req, { allowPasswordChange: true });
        this.run("DELETE FROM auth_sessions WHERE user_id = ?", u.id);
        this.closeSockets(u.id);
        return json({ ok: true });
      }
      if (r("POST", "auth", "password")) return json(await this.changePassword(req, body));
      if (r("GET", "me")) return json({ me: this.me(await this.authed(req, { allowPasswordChange: true })) });
      if (r("PATCH", "me")) {
        const u = await this.authed(req);
        this.run("UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?", str(body.displayName, 40, "Name", { min: 1 }), now(), u.id);
        return json({ me: this.me(this.one<User>("SELECT * FROM users WHERE id = ?", u.id)!) });
      }
      if (r("POST", "admin", "provision-teacher")) return json(await this.provision(req, body, ip));
      if (r("POST", "teacher", "invites")) return json(await this.createInvite(req), 201);
      if (r("GET", "teacher", "invites")) return json(await this.listInvites(req));
      if (r("DELETE", "teacher", "invites", "*")) return json(await this.revokeInvite(req, seg[2]));

      if (r("GET", "classes")) return json(await this.listClasses(req));
      if (r("POST", "classes")) return json(await this.createClass(req, body), 201);
      if (r("PATCH", "classes", "*")) return json(await this.updateClass(req, seg[1], body));
      if (r("POST", "classes", "*", "rotate-code")) return json(await this.rotateCode(req, seg[1]));
      if (r("POST", "classes", "*", "archive")) return json(await this.archiveClass(req, seg[1], body));
      if (r("POST", "classes", "*", "leave")) return json(await this.leave(req, seg[1]));
      if (r("PATCH", "classes", "*", "membership")) return json(await this.setSharing(req, seg[1], body));
      if (r("DELETE", "classes", "*", "members", "*")) return json(await this.removeMember(req, seg[1], seg[3]));
      if (r("GET", "classes", "*", "summary")) return json(await this.summary(req, seg[1]));
      if (r("GET", "classes", "*", "students", "*")) return json(await this.studentDetail(req, seg[1], seg[3]));
      if (r("GET", "classes", "*", "sessions", "*")) return json(await this.sessionDetail(req, seg[1], seg[3]));
      if (r("GET", "classes", "*", "export")) return json(await this.exportRows(req, seg[1], url));
      if (r("POST", "classes", "*", "feedback")) return json(await this.addFeedback(req, seg[1], body), 201);
      if (r("GET", "classes", "*", "assignments")) return json(await this.listAssignments(req, seg[1]));
      if (r("POST", "classes", "*", "assignments")) return json(await this.createAssignment(req, seg[1], body), 201);
      if (r("PATCH", "assignments", "*")) return json(await this.updateAssignment(req, seg[1], body));
      if (r("DELETE", "assignments", "*")) return json(await this.deleteAssignment(req, seg[1]));
      if (r("PATCH", "feedback", "*")) return json(await this.editFeedback(req, seg[1], body));
      if (r("DELETE", "feedback", "*")) return json(await this.editFeedback(req, seg[1], null));
      if (r("POST", "join")) return json(await this.join(req, body, ip));
      if (r("GET", "student", "home")) return json(await this.studentHome(req));
      if (r("GET", "progress")) return json(await this.getProgress(req));
      if (r("PUT", "progress")) return json(await this.putProgress(req, body));
      if (r("POST", "sync")) return json(await this.sync(req, body));
      throw new HttpError(404, "not_found", "Not found.");
    } catch (e) {
      if (e instanceof HttpError) {
        const out: ApiError = { error: e.code, message: e.message };
        if (e.retryAfter) out.retryAfter = e.retryAfter;
        return json(out, e.status);
      }
      console.error("classroom error", e);
      return json({ error: "server_error", message: "Something went wrong on the server. Try again." } satisfies ApiError, 500);
    }
  }
}
