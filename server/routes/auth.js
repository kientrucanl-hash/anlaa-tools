const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function getClientIp(req) {
    return (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
}

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const user = db.users.findByUsername(username.trim());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    db.sessions.create({
        user_id: user.id,
        session_token: sessionToken,
        ip: getClientIp(req),
        user_agent: req.headers['user-agent'] || null,
    });

    // Enforce concurrent session limit (kick oldest sessions over the limit)
    db.sessions.enforceLimit(user.id, user.max_sessions);

    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, sid: sessionToken },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// POST /api/auth/logout — invalidate current session
router.post('/logout', requireAuth, (req, res) => {
    if (req.user.sid) {
        db.sessions.delete(req.user.sid);
    }
    res.json({ message: 'Đã đăng xuất' });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Chưa đăng nhập' });
    try {
        const user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
        res.json({ id: user.id, username: user.username, role: user.role });
    } catch {
        res.status(401).json({ error: 'Phiên đăng nhập hết hạn' });
    }
});

// PUT /api/auth/password — change own password + invalidate all other sessions
router.put('/password', requireAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const user = db.users.findById(req.user.id);
    if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
        return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
    }

    db.users.updatePassword(user.id, bcrypt.hashSync(newPassword, 10));
    // Revoke all sessions except current one — force others to re-login
    const sessions = db.sessions.byUser(user.id);
    for (const s of sessions) {
        if (s.session_token !== req.user.sid) db.sessions.delete(s.session_token);
    }
    res.json({ message: 'Đổi mật khẩu thành công' });
});

module.exports = router;
