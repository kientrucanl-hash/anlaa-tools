const jwt = require('jsonwebtoken');
const db = require('../db/database');

function requireAuth(req, res, next) {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Chưa đăng nhập' });
    }

    const token = header.slice(7);
    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ error: 'Phiên đăng nhập hết hạn' });
    }

    // Verify session still exists in DB (catches kicked/revoked sessions)
    if (payload.sid) {
        const session = db.sessions.findByToken(payload.sid);
        if (!session) {
            return res.status(401).json({ error: 'Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.' });
        }
        // Update last_seen to track activity (async-style: fire and forget via sync SQLite)
        db.sessions.updateLastSeen(payload.sid);
    }

    req.user = payload;
    next();
}

function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }
        next();
    });
}

module.exports = { requireAuth, requireAdmin };
