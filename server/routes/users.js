const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const createUserSchema = Joi.object({
    username: Joi.string().trim().alphanum().min(3).max(30).required().messages({
        'string.alphanum': 'Tên đăng nhập chỉ gồm chữ và số',
        'string.min': 'Tên đăng nhập tối thiểu 3 ký tự',
        'string.max': 'Tên đăng nhập tối đa 30 ký tự',
        'any.required': 'Thiếu tên đăng nhập',
    }),
    password: Joi.string().min(6).max(100).required().messages({
        'string.min': 'Mật khẩu tối thiểu 6 ký tự',
        'any.required': 'Thiếu mật khẩu',
    }),
    role: Joi.string().valid('user', 'admin').default('user'),
});

const resetPasswordSchema = Joi.object({
    newPassword: Joi.string().min(6).max(100).required().messages({
        'string.min': 'Mật khẩu tối thiểu 6 ký tự',
        'any.required': 'Thiếu mật khẩu mới',
    }),
});

const changeRoleSchema = Joi.object({
    role: Joi.string().valid('user', 'admin').required(),
});

const maxSessionsSchema = Joi.object({
    max_sessions: Joi.number().integer().min(1).max(10).required(),
});

function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
        if (error) {
            return res.status(400).json({ error: error.details.map(d => d.message).join('; ') });
        }
        req.body = value;
        next();
    };
}

// GET /api/users — danh sách tất cả user
router.get('/', requireAdmin, (req, res) => {
    const users = db.users.all();
    res.json(users);
});

// POST /api/users — tạo user mới
router.post('/', requireAdmin, validate(createUserSchema), (req, res) => {
    const { username, password, role } = req.body;

    if (db.users.findByUsername(username)) {
        return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });
    }

    const user = db.users.create({
        username,
        password_hash: bcrypt.hashSync(password, 10),
        role,
    });

    res.status(201).json({ id: user.id, username: user.username, role: user.role, created_at: user.created_at });
});

// PUT /api/users/:id/password — reset mật khẩu user
router.put('/:id/password', requireAdmin, validate(resetPasswordSchema), (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!db.users.findById(id)) {
        return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }
    db.users.updatePassword(id, bcrypt.hashSync(req.body.newPassword, 10));
    db.sessions.deleteAllForUser(id);
    res.json({ message: 'Đặt lại mật khẩu thành công' });
});

// PUT /api/users/:id/role — đổi role
router.put('/:id/role', requireAdmin, validate(changeRoleSchema), (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (id === req.user.id) {
        return res.status(400).json({ error: 'Không thể tự thay đổi vai trò của mình' });
    }
    if (!db.users.findById(id)) {
        return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }
    db.users.updateRole(id, req.body.role);
    db.sessions.deleteAllForUser(id);
    res.json({ message: 'Cập nhật vai trò thành công' });
});

// PUT /api/users/:id/max-sessions — set giới hạn thiết bị đồng thời
router.put('/:id/max-sessions', requireAdmin, validate(maxSessionsSchema), (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!db.users.findById(id)) {
        return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }
    db.users.updateMaxSessions(id, req.body.max_sessions);
    // Enforce the new limit immediately
    db.sessions.enforceLimit(id, req.body.max_sessions);
    res.json({ message: 'Đã cập nhật giới hạn thiết bị' });
});

// GET /api/users/:id/sessions — xem danh sách session đang active
router.get('/:id/sessions', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!db.users.findById(id)) {
        return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }
    res.json(db.sessions.byUser(id));
});

// DELETE /api/users/:id/sessions — revoke tất cả session của user (force logout)
router.delete('/:id/sessions', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!db.users.findById(id)) {
        return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }
    db.sessions.deleteAllForUser(id);
    res.json({ message: 'Đã đăng xuất tất cả thiết bị của người dùng này' });
});

// DELETE /api/users/sessions/:sessionId — revoke 1 session cụ thể
router.delete('/sessions/:sessionId', requireAdmin, (req, res) => {
    db.sessions.deleteById(parseInt(req.params.sessionId, 10));
    res.json({ message: 'Đã thu hồi phiên đăng nhập' });
});

// DELETE /api/users/:id — xóa user
router.delete('/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (id === req.user.id) {
        return res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình' });
    }
    if (!db.users.findById(id)) {
        return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }
    db.users.delete(id);
    res.json({ message: 'Xóa người dùng thành công' });
});

module.exports = router;
