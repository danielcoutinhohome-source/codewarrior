// Versioned migrations for the classroom database (SQLite inside the Classroom Durable
// Object). Each entry runs once, in order, inside a transaction; the applied version is kept
// in `meta`. Never edit a released migration: add a new one.

export const MIGRATIONS: { version: number; name: string; sql: string }[] = [
  {
    version: 1,
    name: "initial classroom schema",
    sql: `
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_lc TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student','teacher')),
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  pw_iter INTEGER NOT NULL,
  must_change_pw INTEGER NOT NULL DEFAULT 0,
  disabled INTEGER NOT NULL DEFAULT 0,
  created_via TEXT NOT NULL,          -- 'signup' | 'invite' | 'provision'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);
CREATE INDEX auth_sessions_user ON auth_sessions(user_id);

CREATE TABLE teacher_invites (
  code_hash TEXT PRIMARY KEY,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_by TEXT REFERENCES users(id),
  used_at INTEGER,
  revoked_at INTEGER,
  hint TEXT NOT NULL                   -- last 4 characters, to tell invites apart
);

CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  course TEXT NOT NULL CHECK (course IN ('csa','csp')),
  section TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  join_code TEXT UNIQUE,
  join_enabled INTEGER NOT NULL DEFAULT 1,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX classes_teacher ON classes(teacher_id);

-- One row per enrollment period. A student who leaves and rejoins gets a new row, so the
-- sharing window of every period stays exact. At most one open period per class + student.
CREATE TABLE memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id TEXT NOT NULL REFERENCES classes(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  joined_at INTEGER NOT NULL,
  left_at INTEGER,
  left_reason TEXT,                    -- 'left' | 'removed'
  share_play INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX memberships_open ON memberships(class_id, student_id) WHERE left_at IS NULL;
CREATE INDEX memberships_student ON memberships(student_id);

CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id),
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  target_json TEXT NOT NULL,
  due_at INTEGER,
  due_tz TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL CHECK (status IN ('draft','published')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER,
  deleted_at INTEGER
);
CREATE INDEX assignments_class ON assignments(class_id);

-- A battle or practice run. The id is generated on the student's device so retries are
-- idempotent. Completed runs are append-only; summary columns are derived from attempts.
CREATE TABLE play_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('battle','practice')),
  world INTEGER,
  battle INTEGER,
  enemy TEXT,
  lesson_id TEXT,
  class_id TEXT REFERENCES classes(id),
  assignment_id TEXT REFERENCES assignments(id),
  assignment_version INTEGER,
  context_note TEXT,
  question_count INTEGER NOT NULL,
  content_version TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('in_progress','won','lost','completed','abandoned')),
  stars INTEGER,
  first_try INTEGER NOT NULL DEFAULT 0,
  answered INTEGER NOT NULL DEFAULT 0,
  retries INTEGER NOT NULL DEFAULT 0,
  hints_used INTEGER NOT NULL DEFAULT 0,
  items_json TEXT NOT NULL DEFAULT '{}',
  best_combo INTEGER,
  started_at INTEGER NOT NULL,          -- device time, clamped to the receipt window
  finished_at INTEGER,
  received_at INTEGER NOT NULL,         -- server time of the first event
  finished_received_at INTEGER
);
CREATE INDEX play_sessions_student ON play_sessions(student_id, started_at);
CREATE INDEX play_sessions_assignment ON play_sessions(assignment_id);
CREATE INDEX play_sessions_class ON play_sessions(class_id);

-- Every answer the student submitted, with a snapshot of the question so old records stay
-- readable if the question bank changes (content_version on the session says which bank).
CREATE TABLE attempts (
  session_id TEXT NOT NULL REFERENCES play_sessions(id),
  idx INTEGER NOT NULL,
  round INTEGER NOT NULL,
  try_no INTEGER NOT NULL,
  student_id TEXT NOT NULL REFERENCES users(id),
  question_id TEXT NOT NULL,
  skill TEXT NOT NULL,
  kind TEXT NOT NULL,
  prompt TEXT NOT NULL,
  code TEXT,
  options_json TEXT,
  given TEXT NOT NULL,
  expected TEXT,
  correct INTEGER,                      -- NULL = not auto-graded
  hinted INTEGER NOT NULL DEFAULT 0,
  client_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, idx, round, try_no)
);
CREATE INDEX attempts_student_skill ON attempts(student_id, skill);

CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  teacher_id TEXT NOT NULL REFERENCES users(id),
  assignment_id TEXT REFERENCES assignments(id),
  session_id TEXT REFERENCES play_sessions(id),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX feedback_student ON feedback(student_id, class_id);

-- Idempotency: every accepted or rejected event id, so a replayed upload is acknowledged
-- without being applied twice.
CREATE TABLE receipts (
  event_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  reason TEXT,
  received_at INTEGER NOT NULL
);

CREATE TABLE progress (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  version INTEGER NOT NULL,
  doc TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE rate_limits (
  k TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
`,
  },
];
