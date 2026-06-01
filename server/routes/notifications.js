const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications — get user's notifications (newest 50)
router.get('/', requireAuth, (req, res) => {
    const notifs = db.notifications.byUser(req.user.id);
    const unread = db.notifications.unreadCount(req.user.id);
    res.json({ notifications: notifs, unread });
});

// PUT /api/notifications/:id/read — mark one as read
router.put('/:id/read', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' });
    db.notifications.markRead(id, req.user.id);
    res.json({ ok: true });
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', requireAuth, (req, res) => {
    db.notifications.markAllRead(req.user.id);
    res.json({ ok: true });
});

// DELETE /api/notifications/:id — delete one
router.delete('/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' });
    db.notifications.delete(id, req.user.id);
    res.json({ ok: true });
});

// DELETE /api/notifications — clear all
router.delete('/', requireAuth, (req, res) => {
    db.notifications.deleteAll(req.user.id);
    res.json({ ok: true });
});

module.exports = router;
