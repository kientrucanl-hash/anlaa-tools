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

    if (!payload.sid) {
        return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.' });
    }

    const session = db.sessions.findByToken(payload.sid);
    if (!session || session.user_id !== payload.id) {
        return res.status(401).json({ error: 'Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.' });
    }

    const user = db.users.findById(payload.id);
    if (!user) {
        return res.status(401).json({ error: 'Tài khoản không còn tồn tại. Vui lòng đăng nhập lại.' });
    }

    db.sessions.updateLastSeen(payload.sid);
    req.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        sid: payload.sid,
    };
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
