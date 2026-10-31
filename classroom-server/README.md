# CodeWarrior classroom server

Accounts, classes, assignments, recorded battle and practice results, and live updates for the
teacher dashboard. The game itself stays a static site on GitHub Pages. This server is the
shared source of truth; each device keeps a cache and an upload queue.

```
student device ──(outbox: queued events, retried)──► Worker ─► Classroom Durable Object (SQLite)
teacher device ◄──── WebSocket "changed" + refetch ─────┘                  │
                                                                     every record
```

## Why this stack

- **Cloudflare Workers + one SQLite-backed Durable Object**, on the Workers Free plan. It never
  pauses (Supabase's free projects pause after a week of inactivity, which would break a class
  after every school break), it errors instead of billing when a free limit is reached, and it
  deploys with the same Cloudflare token as the AI tutor.
- One Durable Object holds the whole database, so every write is a single-threaded transaction
  and live updates come from the same place that commits the data.
- Free plan limits (Cloudflare, 2026): 100,000 Durable Object requests/day, 100,000 rows written/day,
  5 million rows read/day, 5 GB storage; Workers ~10 ms CPU per request. A class of 30 playing
  daily uses a small fraction of this, but it isn't unlimited: past a limit, requests fail until
  00:00 UTC and devices keep results queued and retry.

## Permission model (enforced on the server)

The browser never talks to the database. Every endpoint authenticates the bearer token and
checks the role and ownership itself; the client's routes and buttons are convenience only.

- Public sign-up creates **students only**. The request body can't pick a role, and no profile
  update can change it.
- **Teachers** come only from (a) server-side provisioning with a one-time admin token, or
  (b) a single-use, expiring invite created by an existing teacher. Invites are stored hashed.
- Students: their own account, progress, memberships, published assignments, feedback.
- Teachers: classes they own and, for students enrolled in those classes, the records the
  sharing policy below allows. Another teacher's class answers "not found".
- The starter teacher must change the password before any class data opens.
- Passwords: PBKDF2-SHA256 (Web Crypto), random salt, per-user iteration count (40,000 now,
  limited by the free plan's CPU budget; raised later by rehashing on login). Login, sign-up,
  invite and class-code attempts are rate limited in the database. Sessions are random tokens
  stored as SHA-256 hashes, expire after 30 days, and are revoked on sign-out, on "sign out on all
  devices" and (other devices) on password change.
- There is no email, so no self-service recovery. A teacher can be given a new starter password
  by an administrator (see below). Student password resets aren't built yet: a student who forgets their password creates a new
  account and rejoins (their teacher keeps the old records).

## Sharing policy and data lifecycle

- Classroom reporting starts **when a student joins**. Nothing from before is shared. Importing a
  device-only warrior brings its game progress into the class account, never its battle history.
- **Assigned work** (launched from an assignment) always goes to that assignment's class.
- **Unassigned play** goes to a class only while the student is enrolled and has "share my own
  battles and practice" on (default on, shown when joining, changeable any time; turning it off
  hides unassigned play from that enrollment).
- **Leaving or being removed** stops future sharing. Work recorded while enrolled stays visible to
  that teacher (retention: kept for the life of the class). Rejoining starts a new enrollment.
- **Archiving** a class keeps all history, stops joining and publishing. Classes and accounts
  can't be deleted from the app, so nothing is lost by accident; deletion is an administrator
  operation on the database.
- Data collected: username, display name, password hash, game progress, and recorded answers.
  No email, birthdate, address or other personal details. Access controls exist, but this is not a
  claim of FERPA/COPPA or any other compliance.

## Recording results (exactly once)

Each battle or practice run gets an id on the device. The device writes `session.start`, one
`attempt` per answer, and `session.finish` (or `session.abandon`) to IndexedDB first, then uploads
them. An item leaves the queue only after the server acknowledges it.

- Event ids are idempotency keys (`receipts` table); runs and answers have primary keys; each
  event is applied in its own transaction. Replays come back as `duplicate`.
- The server derives the student from the token, checks enrollment and the assignment, and
  computes first-try counts and stars from the stored answers. Client totals are ignored. This is
  validation, not proof: a modified browser can still submit made-up answers.
- Completed runs are append-only; summaries are derived. Server receipt time orders events.
- Queued events are tagged with the account that made them and only upload while that account is
  signed in on that device.
- Runs left open by a closed tab become `abandoned` (not a completed battle) after 2 minutes
  without a heartbeat.
- Assignments: completion counts only runs launched from that assignment. Published assignments
  with recorded work keep their battles/topic fixed; title, instructions and due date can change
  and bump the version stored on later submissions. Game stars are shown as recorded; there is
  no grading.

## Setup (free)

Uses the same Cloudflare account, token and GitHub secrets as the AI tutor (see
`tutor-server/README.md`). The deploy workflow (`.github/workflows/deploy.yml`) then:

1. runs `scripts/test-classroom.ts` (real Worker + SQLite locally, student and teacher tokens);
2. deploys `classroom-server/` (`codewarrior-classroom.<subdomain>.workers.dev`), applying the
   Durable Object migration and the SQL migrations in `src/schema.ts` on first request;
3. builds the site with `NEXT_PUBLIC_CLASSROOM_URL` set to that URL (or the `CLASSROOM_URL`
   repository variable).

### Starter teacher account

Add a repository secret **`TEACHER_INITIAL_PASSWORD`** (Settings → Secrets and variables →
Actions). On the next deploy, the workflow generates a one-time admin token, sets it on the Worker,
creates the teacher (username in the workflow, `DetrickD123`), and replaces the token with a random
value nobody knows. It's idempotent: an existing teacher is never changed. The password is never
in the repository, the site bundle or the logs. The teacher must change it at first sign-in.
Delete the secret afterwards; it's only needed to (re)create the account.

To reset the starter teacher's password (forgotten, or the starter password was exposed): set
`TEACHER_INITIAL_PASSWORD` to a new value, then run the "Deploy to GitHub Pages" workflow manually
with **Reset DetrickD123** ticked. All their sessions end and they must choose a new password.

### Future teachers

A signed-in teacher opens **Account → Invite another teacher**, and sends the code (valid once, 7
days) to the new teacher, who signs up at `/teacher/signup/`.

## Local development

```bash
cp classroom-server/.dev.vars.example classroom-server/.dev.vars   # set ADMIN_TOKEN
cd classroom-server && npx wrangler dev --port 8799
# site: NEXT_PUBLIC_CLASSROOM_URL=http://localhost:8799 npm run dev
# or, in an existing browser: localStorage.setItem("cw.classroomUrl", "http://localhost:8799")
npx tsx scripts/test-classroom.ts      # API integration tests (starts its own server)
NEXT_PUBLIC_BASE_PATH=/codewarrior NEXT_PUBLIC_CLASSROOM_URL=http://localhost:8797 npm run build
npx tsx scripts/e2e-classroom.ts       # browser acceptance test, two "devices" (needs Playwright)
```

## Endpoints

`/v1/auth/{register,login,logout,logout-all,password}`, `/v1/me`, `/v1/admin/provision-teacher`,
`/v1/teacher/invites`, `/v1/classes[/:id[/rotate-code|archive|leave|membership|members/:sid|summary|students/:sid|sessions/:rid|export|feedback|assignments]]`,
`/v1/assignments/:id`, `/v1/feedback/:id`, `/v1/join`, `/v1/student/home`, `/v1/progress`,
`/v1/sync`, `/v1/live` (WebSocket), `/v1/health`.

## Known limits

- No offline page loading: a battle already open keeps working and queues results, but opening a
  new page needs a connection.
- Rate-limit windows and the free-plan quotas are shared by everyone behind one school network.
- Results can't be proven authentic (see above). Progress merging across two devices takes the
  higher value of coins and items, so a purchase can occasionally be undone.
