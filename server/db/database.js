const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'anlaa.db');
const LEGACY_JSON = path.join(__dirname, 'anlaa_data.json');

const sqliteDb = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
sqliteDb.pragma('journal_mode = WAL');
sqliteDb.pragma('foreign_keys = ON');

// Create tables
sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        username    TEXT    NOT NULL UNIQUE,
        password_hash TEXT  NOT NULL,
        role        TEXT    NOT NULL DEFAULT 'user',
        max_sessions INTEGER NOT NULL DEFAULT 2,
        created_at  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token TEXT  NOT NULL UNIQUE,
        ip          TEXT,
        user_agent  TEXT,
        created_at  TEXT    NOT NULL,
        last_seen   TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token   ON user_sessions(session_token);

    CREATE TABLE IF NOT EXISTS projects (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id),
        name        TEXT    NOT NULL,
        address     TEXT    NOT NULL DEFAULT '',
        data        TEXT    NOT NULL DEFAULT '[]',
        status      TEXT    NOT NULL DEFAULT 'draft',
        admin_note  TEXT,
        created_at  TEXT    NOT NULL,
        updated_at  TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);

    -- Collaboration: share project with other users
    CREATE TABLE IF NOT EXISTS project_collaborators (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        owner_id    INTEGER NOT NULL REFERENCES users(id),
        invitee_id  INTEGER NOT NULL REFERENCES users(id),
        role        TEXT    NOT NULL DEFAULT 'viewer', -- 'editor' | 'viewer'
        status      TEXT    NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'denied'
        created_at  TEXT    NOT NULL,
        UNIQUE(project_id, invitee_id)
    );

    -- Access requests: user without permission requests access
    CREATE TABLE IF NOT EXISTS project_access_requests (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        requester_id INTEGER NOT NULL REFERENCES users(id),
        role_requested TEXT NOT NULL DEFAULT 'viewer',
        message     TEXT,
        status      TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'denied'
        created_at  TEXT NOT NULL,
        UNIQUE(project_id, requester_id)
    );

    -- Comments: thread per row in estimate table
    CREATE TABLE IF NOT EXISTS project_comments (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id     INTEGER NOT NULL REFERENCES users(id),
        row_ref     TEXT,   -- "itemId:rowIdx" or null for project-level
        content     TEXT    NOT NULL,
        resolved    INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL
    );

    -- Contractors: nhà thầu phụ / tổ đội thi công
    CREATE TABLE IF NOT EXISTS contractors (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        type            TEXT    NOT NULL DEFAULT 'team',   -- 'team' | 'company' | 'individual'
        name            TEXT    NOT NULL,
        contact_name    TEXT,           -- Tên người liên hệ
        phone           TEXT,
        phone2          TEXT,           -- Số điện thoại phụ
        email           TEXT,
        address         TEXT,
        district        TEXT,           -- Quận/huyện
        city            TEXT    NOT NULL DEFAULT 'Hà Nội',
        specialty       TEXT,           -- JSON array: ["masonry","plastering","tiling",...]
        work_scope      TEXT,           -- Phạm vi thi công: "Toàn bộ" | "Phần thô" | "Hoàn thiện" | ...
        tax_code        TEXT,           -- Mã số thuế (công ty)
        bank_account    TEXT,           -- Số tài khoản ngân hàng
        bank_name       TEXT,
        rating          INTEGER NOT NULL DEFAULT 3,    -- 1–5 sao
        rating_note     TEXT,           -- Ghi chú đánh giá
        project_count   INTEGER NOT NULL DEFAULT 0,   -- Số dự án đã hợp tác
        total_value     REAL    NOT NULL DEFAULT 0,    -- Tổng giá trị đã hợp tác (VNĐ)
        last_project_at TEXT,           -- Ngày hợp tác gần nhất
        price_notes     TEXT,           -- JSON: { "masonry-110": 250000, ... } đơn giá tham khảo
        status          TEXT    NOT NULL DEFAULT 'active', -- 'active' | 'inactive' | 'blacklist'
        note            TEXT,           -- Ghi chú nội bộ
        created_by      INTEGER REFERENCES users(id),
        created_at      TEXT    NOT NULL,
        updated_at      TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_contractors_status ON contractors(status);
    CREATE INDEX IF NOT EXISTS idx_contractors_type   ON contractors(type);
    CREATE INDEX IF NOT EXISTS idx_contractors_rating ON contractors(rating);

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

    -- Quotations: bảng so sánh báo giá nhà thầu
    CREATE TABLE IF NOT EXISTS quotations (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id),
        name        TEXT    NOT NULL,
        contractors TEXT    NOT NULL DEFAULT '["","",""]',  -- JSON: [tên NTC1, NTC2, NTC3]
        rows        TEXT    NOT NULL DEFAULT '[]',           -- JSON: [{item, unit, prices:[p1,p2,p3], notes:[n1,n2,n3]}]
        status      TEXT    NOT NULL DEFAULT 'draft',        -- draft | pending | approved | rejected
        admin_note  TEXT,
        created_at  TEXT    NOT NULL,
        updated_at  TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_quotations_user_id   ON quotations(user_id);
    CREATE INDEX IF NOT EXISTS idx_quotations_updated_at ON quotations(updated_at);
    CREATE INDEX IF NOT EXISTS idx_collabs_project ON project_collaborators(project_id);
    CREATE INDEX IF NOT EXISTS idx_collabs_invitee ON project_collaborators(invitee_id);
    CREATE INDEX IF NOT EXISTS idx_access_req_project ON project_access_requests(project_id);
    CREATE INDEX IF NOT EXISTS idx_comments_project ON project_comments(project_id);

    -- Persistent notifications: survives disconnect/refresh
    CREATE TABLE IF NOT EXISTS notifications (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type        TEXT    NOT NULL, -- 'collab_invite'|'collab_responded'|'access_request'|'access_approved'|'access_denied'|'project_approved'|'project_rejected'|'role_changed'|'system'
        title       TEXT    NOT NULL,
        body        TEXT    NOT NULL,
        link        TEXT,             -- optional URL hint (e.g. estimate.html?id=5)
        meta        TEXT    NOT NULL DEFAULT '{}', -- JSON: extra context (projectId, role, etc.)
        is_read     INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notif_user_id  ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notif_is_read  ON notifications(user_id, is_read);

    -- Per-user price profile: overrides DEFAULT_WORK_ITEM_PRICES globally for that user
    CREATE TABLE IF NOT EXISTS user_price_profiles (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        region      TEXT    NOT NULL DEFAULT 'hanoi',
        prices      TEXT    NOT NULL DEFAULT '{}', -- JSON: { "masonry-110": 275000, ... }
        updated_at  TEXT    NOT NULL
    );

    -- Per-project price overrides: takes precedence over user profile for that project
    CREATE TABLE IF NOT EXISTS project_price_overrides (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id  INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
        prices      TEXT    NOT NULL DEFAULT '{}', -- JSON: same key format
        updated_at  TEXT    NOT NULL
    );
`);

function now() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

// Runtime migrations — add columns/tables that didn't exist in earlier versions
(function runMigrations() {
    const cols = sqliteDb.prepare("PRAGMA table_info(users)").all().map(c => c.name);
    if (!cols.includes('max_sessions')) {
        sqliteDb.exec('ALTER TABLE users ADD COLUMN max_sessions INTEGER NOT NULL DEFAULT 2');
    }
    // These tables are created above via CREATE TABLE IF NOT EXISTS, but
    // production DBs deployed before this version need explicit creation.
    sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            link TEXT,
            meta TEXT NOT NULL DEFAULT '{}',
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_notif_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notif_is_read  ON notifications(user_id, is_read);

        CREATE TABLE IF NOT EXISTS user_price_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            region TEXT NOT NULL DEFAULT 'hanoi',
            prices TEXT NOT NULL DEFAULT '{}',
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS project_price_overrides (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
            prices TEXT NOT NULL DEFAULT '{}',
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS contractor_drafts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contractor_id INTEGER REFERENCES contractors(id) ON DELETE SET NULL,
            submitted_by INTEGER NOT NULL REFERENCES users(id),
            reviewed_by INTEGER REFERENCES users(id),
            payload TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            admin_note TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            submitted_at TEXT,
            reviewed_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_contractor_drafts_status ON contractor_drafts(status);
        CREATE INDEX IF NOT EXISTS idx_contractor_drafts_user ON contractor_drafts(submitted_by);
    `);
})();

function parseProject(row) {
    if (!row) return null;
    return { ...row, data: JSON.parse(row.data || '[]'), admin_note: row.admin_note || null };
}

function parseContractorDraft(row) {
    if (!row) return null;
    return { ...row, payload: JSON.parse(row.payload || '{}'), admin_note: row.admin_note || null };
}

// Migrate from legacy JSON file if DB is empty and JSON exists
const userCount = sqliteDb.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
    if (fs.existsSync(LEGACY_JSON)) {
        try {
            const legacy = JSON.parse(fs.readFileSync(LEGACY_JSON, 'utf8'));
            const insertUser = sqliteDb.prepare(
                'INSERT OR IGNORE INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)'
            );
            const insertProject = sqliteDb.prepare(
                'INSERT OR IGNORE INTO projects (id, user_id, name, address, data, status, admin_note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            const migrate = sqliteDb.transaction(() => {
                for (const u of legacy.users || []) {
                    insertUser.run(u.id, u.username, u.password_hash, u.role, u.created_at);
                }
                for (const p of legacy.projects || []) {
                    insertProject.run(p.id, p.user_id, p.name, p.address || '', JSON.stringify(p.data || []), p.status, p.admin_note || null, p.created_at, p.updated_at);
                }
            });
            migrate();
            console.log('[ANLC] Migrated data from anlaa_data.json to SQLite');
        } catch (e) {
            console.error('[ANLC] Migration from JSON failed:', e.message);
        }
    } else if (process.env.NODE_ENV === 'production') {
        throw new Error('Production database is empty and no legacy seed file exists. Bootstrap users before starting.');
    } else {
        // Seed default users
        const insertUser = sqliteDb.prepare(
            'INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)'
        );
        insertUser.run('admin', bcrypt.hashSync('Admin@2024', 10), 'admin', now());
        insertUser.run('user1', bcrypt.hashSync('User1@2024', 10), 'user', now());
    }
}

const db = {
    _raw: sqliteDb, // expose for raw queries in routes
    users: {
        findByUsername(username) {
            return sqliteDb.prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
        },
        findById(id) {
            return sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
        },
        all() {
            return sqliteDb.prepare('SELECT id, username, role, max_sessions, created_at FROM users').all();
        },
        create({ username, password_hash, role = 'user' }) {
            const result = sqliteDb.prepare(
                'INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)'
            ).run(username, password_hash, role, now());
            return db.users.findById(result.lastInsertRowid);
        },
        updatePassword(id, password_hash) {
            sqliteDb.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, id);
        },
        updateRole(id, role) {
            sqliteDb.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
        },
        updateMaxSessions(id, max) {
            sqliteDb.prepare('UPDATE users SET max_sessions = ? WHERE id = ?').run(max, id);
        },
        delete(id) {
            sqliteDb.prepare('DELETE FROM users WHERE id = ?').run(id);
        },
    },

    sessions: {
        create({ user_id, session_token, ip, user_agent }) {
            const ts = now();
            sqliteDb.prepare(
                'INSERT INTO user_sessions (user_id, session_token, ip, user_agent, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(user_id, session_token, ip || null, user_agent || null, ts, ts);
        },
        findByToken(token) {
            return sqliteDb.prepare('SELECT * FROM user_sessions WHERE session_token = ?').get(token) || null;
        },
        byUser(user_id) {
            return sqliteDb.prepare('SELECT * FROM user_sessions WHERE user_id = ? ORDER BY last_seen DESC').all(user_id);
        },
        updateLastSeen(token) {
            sqliteDb.prepare('UPDATE user_sessions SET last_seen = ? WHERE session_token = ?').run(now(), token);
        },
        delete(token) {
            sqliteDb.prepare('DELETE FROM user_sessions WHERE session_token = ?').run(token);
        },
        deleteById(id) {
            sqliteDb.prepare('DELETE FROM user_sessions WHERE id = ?').run(id);
        },
        deleteAllForUser(user_id) {
            sqliteDb.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(user_id);
        },
        // Enforce limit: delete oldest sessions beyond max_sessions
        enforceLimit(user_id, max_sessions) {
            const sessions = sqliteDb.prepare(
                'SELECT id FROM user_sessions WHERE user_id = ? ORDER BY last_seen DESC'
            ).all(user_id);
            if (sessions.length > max_sessions) {
                const toDelete = sessions.slice(max_sessions);
                const stmt = sqliteDb.prepare('DELETE FROM user_sessions WHERE id = ?');
                for (const s of toDelete) stmt.run(s.id);
            }
        },
    },

    projects: {
        all() {
            return sqliteDb.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all().map(parseProject);
        },
        byUser(userId) {
            return sqliteDb.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC').all(userId).map(parseProject);
        },
        findById(id) {
            return parseProject(sqliteDb.prepare('SELECT * FROM projects WHERE id = ?').get(id));
        },
        create({ user_id, name, address, items }) {
            const ts = now();
            const result = sqliteDb.prepare(
                'INSERT INTO projects (user_id, name, address, data, status, admin_note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).run(user_id, name, address || '', JSON.stringify(items || []), 'draft', null, ts, ts);
            return db.projects.findById(result.lastInsertRowid);
        },
        update(id, fields) {
            const project = db.projects.findById(id);
            if (!project) return null;
            const merged = {
                name: fields.name ?? project.name,
                address: fields.address ?? project.address,
                data: JSON.stringify(fields.data ?? project.data),
                status: fields.status ?? project.status,
                admin_note: fields.admin_note !== undefined ? fields.admin_note : project.admin_note,
                updated_at: now(),
            };
            sqliteDb.prepare(
                'UPDATE projects SET name=?, address=?, data=?, status=?, admin_note=?, updated_at=? WHERE id=?'
            ).run(merged.name, merged.address, merged.data, merged.status, merged.admin_note, merged.updated_at, id);
            return db.projects.findById(id);
        },
        delete(id) {
            const result = sqliteDb.prepare('DELETE FROM projects WHERE id = ?').run(id);
            return result.changes > 0;
        }
    },

    quotations: {
        _parse(row) {
            if (!row) return null;
            return {
                ...row,
                contractors: JSON.parse(row.contractors || '["","",""]'),
                rows: JSON.parse(row.rows || '[]'),
                admin_note: row.admin_note || null,
            };
        },
        all() {
            return sqliteDb.prepare(`
                SELECT q.*, u.username as owner_name
                FROM quotations q JOIN users u ON u.id = q.user_id
                ORDER BY q.updated_at DESC
            `).all().map(r => db.quotations._parse(r));
        },
        byUser(userId) {
            return sqliteDb.prepare(
                'SELECT * FROM quotations WHERE user_id = ? ORDER BY updated_at DESC'
            ).all(userId).map(r => db.quotations._parse(r));
        },
        findById(id) {
            return db.quotations._parse(sqliteDb.prepare(`
                SELECT q.*, u.username as owner_name
                FROM quotations q JOIN users u ON u.id = q.user_id
                WHERE q.id = ?
            `).get(id));
        },
        create({ user_id, name, contractors, rows }) {
            const ts = now();
            const result = sqliteDb.prepare(
                'INSERT INTO quotations (user_id, name, contractors, rows, status, admin_note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).run(user_id, name, JSON.stringify(contractors || ['', '', '']), JSON.stringify(rows || []), 'draft', null, ts, ts);
            return db.quotations.findById(result.lastInsertRowid);
        },
        update(id, fields) {
            const q = db.quotations.findById(id);
            if (!q) return null;
            const merged = {
                name: fields.name ?? q.name,
                contractors: JSON.stringify(fields.contractors ?? q.contractors),
                rows: JSON.stringify(fields.rows ?? q.rows),
                status: fields.status ?? q.status,
                admin_note: fields.admin_note !== undefined ? fields.admin_note : q.admin_note,
                updated_at: now(),
            };
            sqliteDb.prepare(
                'UPDATE quotations SET name=?, contractors=?, rows=?, status=?, admin_note=?, updated_at=? WHERE id=?'
            ).run(merged.name, merged.contractors, merged.rows, merged.status, merged.admin_note, merged.updated_at, id);
            return db.quotations.findById(id);
        },
        delete(id) {
            return sqliteDb.prepare('DELETE FROM quotations WHERE id = ?').run(id).changes > 0;
        },
    },
};


// ── Collaborators ─────────────────────────────────────────────────────────
db.collaborators = {
    // All collaborators of a project (accepted + pending)
    byProject(projectId) {
        return sqliteDb.prepare(`
            SELECT pc.*, u.username as invitee_username
            FROM project_collaborators pc
            JOIN users u ON u.id = pc.invitee_id
            WHERE pc.project_id = ?
        `).all(projectId);
    },
    // Projects shared with a user (accepted)
    sharedWith(userId) {
        return sqliteDb.prepare(`
            SELECT p.*, pc.role as collab_role, u.username as owner_name
            FROM project_collaborators pc
            JOIN projects p ON p.id = pc.project_id
            JOIN users u ON u.id = pc.owner_id
            WHERE pc.invitee_id = ? AND pc.status = 'accepted'
            ORDER BY p.updated_at DESC
        `).all(userId).map(r => ({ ...r, data: JSON.parse(r.data || '[]') }));
    },
    find(projectId, inviteeId) {
        return sqliteDb.prepare(
            'SELECT * FROM project_collaborators WHERE project_id = ? AND invitee_id = ?'
        ).get(projectId, inviteeId) || null;
    },
    invite(projectId, ownerId, inviteeId, role) {
        sqliteDb.prepare(`
            INSERT INTO project_collaborators (project_id, owner_id, invitee_id, role, status, created_at)
            VALUES (?, ?, ?, ?, 'pending', ?)
            ON CONFLICT(project_id, invitee_id) DO UPDATE SET role=excluded.role, status='pending', created_at=excluded.created_at
        `).run(projectId, ownerId, inviteeId, role, now());
        return db.collaborators.find(projectId, inviteeId);
    },
    accept(projectId, inviteeId) {
        sqliteDb.prepare(
            "UPDATE project_collaborators SET status='accepted' WHERE project_id=? AND invitee_id=?"
        ).run(projectId, inviteeId);
    },
    deny(projectId, inviteeId) {
        sqliteDb.prepare(
            "UPDATE project_collaborators SET status='denied' WHERE project_id=? AND invitee_id=?"
        ).run(projectId, inviteeId);
    },
    updateRole(projectId, inviteeId, role) {
        sqliteDb.prepare(
            'UPDATE project_collaborators SET role=? WHERE project_id=? AND invitee_id=?'
        ).run(role, projectId, inviteeId);
    },
    remove(projectId, inviteeId) {
        sqliteDb.prepare(
            'DELETE FROM project_collaborators WHERE project_id=? AND invitee_id=?'
        ).run(projectId, inviteeId);
    }
};

// ── Access Requests ───────────────────────────────────────────────────────
db.accessRequests = {
    byProject(projectId) {
        return sqliteDb.prepare(`
            SELECT ar.*, u.username as requester_username
            FROM project_access_requests ar
            JOIN users u ON u.id = ar.requester_id
            WHERE ar.project_id = ? AND ar.status = 'pending'
            ORDER BY ar.created_at DESC
        `).all(projectId);
    },
    find(projectId, requesterId) {
        return sqliteDb.prepare(
            'SELECT * FROM project_access_requests WHERE project_id=? AND requester_id=?'
        ).get(projectId, requesterId) || null;
    },
    create(projectId, requesterId, roleRequested, message) {
        sqliteDb.prepare(`
            INSERT INTO project_access_requests (project_id, requester_id, role_requested, message, status, created_at)
            VALUES (?, ?, ?, ?, 'pending', ?)
            ON CONFLICT(project_id, requester_id) DO UPDATE SET role_requested=excluded.role_requested, message=excluded.message, status='pending', created_at=excluded.created_at
        `).run(projectId, requesterId, roleRequested, message || null, now());
        return db.accessRequests.find(projectId, requesterId);
    },
    approve(id, projectId, ownerId, requesterId, role) {
        sqliteDb.prepare("UPDATE project_access_requests SET status='approved' WHERE id=?").run(id);
        db.collaborators.invite(projectId, ownerId, requesterId, role);
        db.collaborators.accept(projectId, requesterId);
    },
    deny(id) {
        sqliteDb.prepare("UPDATE project_access_requests SET status='denied' WHERE id=?").run(id);
    }
};

// ── Comments ──────────────────────────────────────────────────────────────
db.comments = {
    byProject(projectId) {
        return sqliteDb.prepare(`
            SELECT c.*, u.username
            FROM project_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.project_id = ?
            ORDER BY c.created_at ASC
        `).all(projectId);
    },
    findById(id) {
        return sqliteDb.prepare('SELECT * FROM project_comments WHERE id=?').get(id) || null;
    },
    create(projectId, userId, rowRef, content) {
        const result = sqliteDb.prepare(
            'INSERT INTO project_comments (project_id, user_id, row_ref, content, resolved, created_at) VALUES (?, ?, ?, ?, 0, ?)'
        ).run(projectId, userId, rowRef || null, content, now());
        return sqliteDb.prepare(`
            SELECT c.*, u.username FROM project_comments c JOIN users u ON u.id=c.user_id WHERE c.id=?
        `).get(result.lastInsertRowid);
    },
    resolve(id, userId) {
        // Only comment author or project owner can resolve — checked in route
        sqliteDb.prepare('UPDATE project_comments SET resolved=1 WHERE id=?').run(id);
    },
    delete(id) {
        sqliteDb.prepare('DELETE FROM project_comments WHERE id=?').run(id);
    }
};

// ── Contractors ───────────────────────────────────────────────────────────
db.contractors = {
    all({ status, type, search } = {}) {
        let q = 'SELECT * FROM contractors WHERE 1=1';
        const params = [];
        if (status) { q += ' AND status = ?'; params.push(status); }
        if (type)   { q += ' AND type = ?';   params.push(type); }
        if (search) {
            q += ' AND (name LIKE ? OR contact_name LIKE ? OR phone LIKE ? OR specialty LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }
        q += ' ORDER BY rating DESC, name ASC';
        return sqliteDb.prepare(q).all(...params);
    },
    findById(id) {
        return sqliteDb.prepare('SELECT * FROM contractors WHERE id = ?').get(id) || null;
    },
    create(fields) {
        const ts = now();
        const r = sqliteDb.prepare(`
            INSERT INTO contractors
              (type, name, contact_name, phone, phone2, email, address, district, city,
               specialty, work_scope, tax_code, bank_account, bank_name,
               rating, rating_note, project_count, total_value, last_project_at,
               price_notes, status, note, created_by, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
            fields.type || 'team', fields.name, fields.contact_name || null,
            fields.phone || null, fields.phone2 || null, fields.email || null,
            fields.address || null, fields.district || null, fields.city || 'Hà Nội',
            fields.specialty || null, fields.work_scope || null,
            fields.tax_code || null, fields.bank_account || null, fields.bank_name || null,
            fields.rating || 3, fields.rating_note || null,
            fields.project_count || 0, fields.total_value || 0, fields.last_project_at || null,
            fields.price_notes || null, fields.status || 'active', fields.note || null,
            fields.created_by || null, ts, ts
        );
        return db.contractors.findById(r.lastInsertRowid);
    },
    update(id, fields) {
        const existing = db.contractors.findById(id);
        if (!existing) return null;
        const merged = {
            type:            fields.type            ?? existing.type,
            name:            fields.name            ?? existing.name,
            contact_name:    fields.contact_name    ?? existing.contact_name,
            phone:           fields.phone           ?? existing.phone,
            phone2:          fields.phone2          ?? existing.phone2,
            email:           fields.email           ?? existing.email,
            address:         fields.address         ?? existing.address,
            district:        fields.district        ?? existing.district,
            city:            fields.city            ?? existing.city,
            specialty:       fields.specialty       ?? existing.specialty,
            work_scope:      fields.work_scope      ?? existing.work_scope,
            tax_code:        fields.tax_code        ?? existing.tax_code,
            bank_account:    fields.bank_account    ?? existing.bank_account,
            bank_name:       fields.bank_name       ?? existing.bank_name,
            rating:          fields.rating          ?? existing.rating,
            rating_note:     fields.rating_note     ?? existing.rating_note,
            project_count:   fields.project_count   ?? existing.project_count,
            total_value:     fields.total_value      ?? existing.total_value,
            last_project_at: fields.last_project_at ?? existing.last_project_at,
            price_notes:     fields.price_notes     ?? existing.price_notes,
            status:          fields.status          ?? existing.status,
            note:            fields.note            ?? existing.note,
        };
        sqliteDb.prepare(`
            UPDATE contractors SET
              type=?, name=?, contact_name=?, phone=?, phone2=?, email=?,
              address=?, district=?, city=?, specialty=?, work_scope=?,
              tax_code=?, bank_account=?, bank_name=?, rating=?, rating_note=?,
              project_count=?, total_value=?, last_project_at=?,
              price_notes=?, status=?, note=?, updated_at=?
            WHERE id=?
        `).run(
            merged.type, merged.name, merged.contact_name, merged.phone, merged.phone2,
            merged.email, merged.address, merged.district, merged.city,
            merged.specialty, merged.work_scope, merged.tax_code,
            merged.bank_account, merged.bank_name, merged.rating, merged.rating_note,
            merged.project_count, merged.total_value, merged.last_project_at,
            merged.price_notes, merged.status, merged.note, now(), id
        );
        return db.contractors.findById(id);
    },
    delete(id) {
        return sqliteDb.prepare('DELETE FROM contractors WHERE id = ?').run(id).changes > 0;
    },
    stats() {
        return sqliteDb.prepare(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status='inactive' THEN 1 ELSE 0 END) as inactive,
                SUM(CASE WHEN status='blacklist' THEN 1 ELSE 0 END) as blacklist,
                SUM(CASE WHEN type='company' THEN 1 ELSE 0 END) as companies,
                SUM(CASE WHEN type='team' THEN 1 ELSE 0 END) as teams,
                SUM(CASE WHEN type='individual' THEN 1 ELSE 0 END) as individuals,
                ROUND(AVG(rating), 1) as avg_rating,
                SUM(total_value) as total_value
            FROM contractors
        `).get();
    }
};

// ── Notifications ─────────────────────────────────────────────────────────
db.contractorDrafts = {
    all({ status } = {}) {
        let query = `
            SELECT d.*, u.username as submitted_by_username, r.username as reviewed_by_username
            FROM contractor_drafts d
            JOIN users u ON u.id = d.submitted_by
            LEFT JOIN users r ON r.id = d.reviewed_by
            WHERE 1=1
        `;
        const params = [];
        if (status) {
            query += ' AND d.status = ?';
            params.push(status);
        }
        query += ' ORDER BY d.updated_at DESC';
        return sqliteDb.prepare(query).all(...params).map(parseContractorDraft);
    },
    byUser(userId) {
        return sqliteDb.prepare(`
            SELECT d.*, u.username as submitted_by_username, r.username as reviewed_by_username
            FROM contractor_drafts d
            JOIN users u ON u.id = d.submitted_by
            LEFT JOIN users r ON r.id = d.reviewed_by
            WHERE d.submitted_by = ?
            ORDER BY d.updated_at DESC
        `).all(userId).map(parseContractorDraft);
    },
    findById(id) {
        return parseContractorDraft(sqliteDb.prepare(`
            SELECT d.*, u.username as submitted_by_username, r.username as reviewed_by_username
            FROM contractor_drafts d
            JOIN users u ON u.id = d.submitted_by
            LEFT JOIN users r ON r.id = d.reviewed_by
            WHERE d.id = ?
        `).get(id));
    },
    create({ contractor_id = null, submitted_by, payload }) {
        const ts = now();
        const result = sqliteDb.prepare(`
            INSERT INTO contractor_drafts
              (contractor_id, submitted_by, payload, status, admin_note, created_at, updated_at)
            VALUES (?, ?, ?, 'draft', NULL, ?, ?)
        `).run(contractor_id || null, submitted_by, JSON.stringify(payload || {}), ts, ts);
        return db.contractorDrafts.findById(result.lastInsertRowid);
    },
    update(id, { contractor_id, payload }) {
        const draft = db.contractorDrafts.findById(id);
        if (!draft) return null;
        sqliteDb.prepare(`
            UPDATE contractor_drafts
            SET contractor_id=?, payload=?, status='draft', admin_note=NULL, updated_at=?
            WHERE id=?
        `).run(
            contractor_id !== undefined ? contractor_id : draft.contractor_id,
            JSON.stringify(payload || {}),
            now(),
            id
        );
        return db.contractorDrafts.findById(id);
    },
    submit(id) {
        const ts = now();
        sqliteDb.prepare(`
            UPDATE contractor_drafts
            SET status='pending', submitted_at=?, updated_at=?
            WHERE id=?
        `).run(ts, ts, id);
        return db.contractorDrafts.findById(id);
    },
    approve(id, reviewerId, contractorId, adminNote = null) {
        const ts = now();
        sqliteDb.prepare(`
            UPDATE contractor_drafts
            SET contractor_id=?, reviewed_by=?, status='approved', admin_note=?, reviewed_at=?, updated_at=?
            WHERE id=?
        `).run(contractorId, reviewerId, adminNote || null, ts, ts, id);
        return db.contractorDrafts.findById(id);
    },
    reject(id, reviewerId, adminNote = null) {
        const ts = now();
        sqliteDb.prepare(`
            UPDATE contractor_drafts
            SET reviewed_by=?, status='rejected', admin_note=?, reviewed_at=?, updated_at=?
            WHERE id=?
        `).run(reviewerId, adminNote || null, ts, ts, id);
        return db.contractorDrafts.findById(id);
    },
    delete(id) {
        return sqliteDb.prepare('DELETE FROM contractor_drafts WHERE id = ?').run(id).changes > 0;
    },
};

db.notifications = {
    // Create a notification for a user
    create({ user_id, type, title, body, link = null, meta = {} }) {
        const result = sqliteDb.prepare(
            'INSERT INTO notifications (user_id, type, title, body, link, meta, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)'
        ).run(user_id, type, title, body, link || null, JSON.stringify(meta), now());
        return sqliteDb.prepare('SELECT * FROM notifications WHERE id=?').get(result.lastInsertRowid);
    },
    // Get all notifications for a user (newest first, max 50)
    byUser(user_id, limit = 50) {
        return sqliteDb.prepare(
            'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT ?'
        ).all(user_id, limit).map(r => ({ ...r, meta: JSON.parse(r.meta || '{}') }));
    },
    unreadCount(user_id) {
        return sqliteDb.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND is_read=0').get(user_id).c;
    },
    markRead(id, user_id) {
        sqliteDb.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(id, user_id);
    },
    markAllRead(user_id) {
        sqliteDb.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(user_id);
    },
    delete(id, user_id) {
        sqliteDb.prepare('DELETE FROM notifications WHERE id=? AND user_id=?').run(id, user_id);
    },
    deleteAll(user_id) {
        sqliteDb.prepare('DELETE FROM notifications WHERE user_id=?').run(user_id);
    },
    // Prune old read notifications beyond 100 per user
    prune(user_id) {
        sqliteDb.prepare(`
            DELETE FROM notifications WHERE user_id=? AND is_read=1
            AND id NOT IN (SELECT id FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100)
        `).run(user_id, user_id);
    },
};

// ── Price Profiles ─────────────────────────────────────────────────────────
db.priceProfiles = {
    // Get user's global price profile (returns default structure if not set)
    getByUser(user_id) {
        const row = sqliteDb.prepare('SELECT * FROM user_price_profiles WHERE user_id=?').get(user_id);
        if (!row) return { user_id, region: 'hanoi', prices: {} };
        return { ...row, prices: JSON.parse(row.prices || '{}') };
    },
    // Upsert user price profile
    upsertUser(user_id, region, prices) {
        sqliteDb.prepare(`
            INSERT INTO user_price_profiles (user_id, region, prices, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET region=excluded.region, prices=excluded.prices, updated_at=excluded.updated_at
        `).run(user_id, region || 'hanoi', JSON.stringify(prices || {}), now());
        return db.priceProfiles.getByUser(user_id);
    },
    // Get project-level price overrides
    getByProject(project_id) {
        const row = sqliteDb.prepare('SELECT * FROM project_price_overrides WHERE project_id=?').get(project_id);
        if (!row) return { project_id, prices: {} };
        return { ...row, prices: JSON.parse(row.prices || '{}') };
    },
    // Upsert project price overrides
    upsertProject(project_id, prices) {
        sqliteDb.prepare(`
            INSERT INTO project_price_overrides (project_id, prices, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(project_id) DO UPDATE SET prices=excluded.prices, updated_at=excluded.updated_at
        `).run(project_id, JSON.stringify(prices || {}), now());
        return db.priceProfiles.getByProject(project_id);
    },
    deleteProject(project_id) {
        sqliteDb.prepare('DELETE FROM project_price_overrides WHERE project_id=?').run(project_id);
    },
};

module.exports = db;
