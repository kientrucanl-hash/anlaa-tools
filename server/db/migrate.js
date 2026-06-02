/**
 * One-time migration script — run inside container:
 *   node server/db/migrate.js
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'anlaa.db');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = OFF');

function now() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }

// ── 1. Add max_sessions column ───────────────────────────────────────────────
const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
if (!userCols.includes('max_sessions')) {
    db.exec('ALTER TABLE users ADD COLUMN max_sessions INTEGER NOT NULL DEFAULT 2');
    console.log('[OK] Added max_sessions to users');
} else {
    console.log('[SKIP] max_sessions already exists');
}

// ── 2. New tables ────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS user_sessions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT    NOT NULL UNIQUE,
    ip            TEXT,
    user_agent    TEXT,
    created_at    TEXT    NOT NULL,
    last_seen     TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token   ON user_sessions(session_token);

CREATE TABLE IF NOT EXISTS project_collaborators (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    owner_id   INTEGER NOT NULL REFERENCES users(id),
    invitee_id INTEGER NOT NULL REFERENCES users(id),
    role       TEXT    NOT NULL DEFAULT 'viewer',
    status     TEXT    NOT NULL DEFAULT 'pending',
    created_at TEXT    NOT NULL,
    UNIQUE(project_id, invitee_id)
);

CREATE TABLE IF NOT EXISTS project_access_requests (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    requester_id   INTEGER NOT NULL REFERENCES users(id),
    role_requested TEXT    NOT NULL DEFAULT 'viewer',
    message        TEXT,
    status         TEXT    NOT NULL DEFAULT 'pending',
    created_at     TEXT    NOT NULL,
    UNIQUE(project_id, requester_id)
);

CREATE TABLE IF NOT EXISTS project_comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    row_ref    TEXT,
    content    TEXT    NOT NULL,
    resolved   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS contractors (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    type            TEXT    NOT NULL DEFAULT 'team',
    name            TEXT    NOT NULL,
    contact_name    TEXT, phone TEXT, phone2 TEXT, email TEXT, address TEXT,
    district        TEXT,
    city            TEXT    NOT NULL DEFAULT 'Ha Noi',
    specialty       TEXT, work_scope TEXT, tax_code TEXT,
    bank_account    TEXT, bank_name TEXT,
    rating          INTEGER NOT NULL DEFAULT 3,
    rating_note     TEXT,
    project_count   INTEGER NOT NULL DEFAULT 0,
    total_value     REAL    NOT NULL DEFAULT 0,
    last_project_at TEXT, price_notes TEXT,
    status          TEXT    NOT NULL DEFAULT 'active',
    note            TEXT,
    created_by      INTEGER REFERENCES users(id),
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contractors_status ON contractors(status);
CREATE INDEX IF NOT EXISTS idx_contractors_type   ON contractors(type);

CREATE TABLE IF NOT EXISTS contractor_drafts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    contractor_id   INTEGER REFERENCES contractors(id) ON DELETE SET NULL,
    submitted_by    INTEGER NOT NULL REFERENCES users(id),
    reviewed_by     INTEGER REFERENCES users(id),
    payload         TEXT    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'draft',
    admin_note      TEXT,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL,
    submitted_at    TEXT,
    reviewed_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_contractor_drafts_status ON contractor_drafts(status);
CREATE INDEX IF NOT EXISTS idx_contractor_drafts_user   ON contractor_drafts(submitted_by);

CREATE TABLE IF NOT EXISTS quotations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    name        TEXT    NOT NULL,
    contractors TEXT    NOT NULL DEFAULT '["","",""]',
    rows        TEXT    NOT NULL DEFAULT '[]',
    status      TEXT    NOT NULL DEFAULT 'draft',
    admin_note  TEXT,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quotations_user_id    ON quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_updated_at ON quotations(updated_at);

CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    body       TEXT    NOT NULL,
    link       TEXT,
    meta       TEXT    NOT NULL DEFAULT '{}',
    is_read    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_is_read ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS user_price_profiles (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    region     TEXT    NOT NULL DEFAULT 'hanoi',
    prices     TEXT    NOT NULL DEFAULT '{}',
    updated_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS project_price_overrides (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    prices     TEXT    NOT NULL DEFAULT '{}',
    updated_at TEXT    NOT NULL
);
`);
console.log('[OK] All tables ready');

// ── 3. Seed user2 ────────────────────────────────────────────────────────────
console.log('[SKIP] Default user seeding disabled');

// ── 4. Verify ────────────────────────────────────────────────────────────────
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(t => t.name);
console.log('[VERIFY] Tables:', tables.join(', '));
const users = db.prepare('SELECT id, username, role, max_sessions, created_at FROM users').all();
console.log('[VERIFY] Users:');
users.forEach(u => console.log(`  #${u.id} ${u.username} (${u.role}) max_sessions=${u.max_sessions}`));

db.pragma('foreign_keys = ON');
db.close();
console.log('[DONE] Migration complete');
