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
        created_at  TEXT    NOT NULL
    );

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
`);

function now() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function parseProject(row) {
    if (!row) return null;
    return { ...row, data: JSON.parse(row.data || '[]'), admin_note: row.admin_note || null };
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
    users: {
        findByUsername(username) {
            return sqliteDb.prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
        },
        findById(id) {
            return sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
        },
        all() {
            return sqliteDb.prepare('SELECT id, username, role, created_at FROM users').all();
        },
        create({ username, password_hash, role = 'user' }) {
            const result = sqliteDb.prepare(
                'INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)'
            ).run(username, password_hash, role, now());
            return db.users.findById(result.lastInsertRowid);
        }
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
    }
};

module.exports = db;
