const express = require('express');
const Joi = require('joi');
const db = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const rowSchema = Joi.object({
    item:   Joi.string().trim().max(200).allow('').default(''),
    unit:   Joi.string().trim().max(50).allow('').default(''),
    prices: Joi.array().items(Joi.number().allow(null)).length(3).default([null, null, null]),
    notes:  Joi.array().items(Joi.string().trim().max(500).allow('')).length(3).default(['', '', '']),
});

const quotationWriteSchema = Joi.object({
    name:        Joi.string().trim().min(1).max(200).required().messages({ 'any.required': 'Thiếu tên bảng báo giá' }),
    contractors: Joi.array().items(Joi.string().trim().max(100).allow('')).length(3).default(['', '', '']),
    rows:        Joi.array().items(rowSchema).default([]),
});

const quotationUpdateSchema = Joi.object({
    name:        Joi.string().trim().min(1).max(200),
    contractors: Joi.array().items(Joi.string().trim().max(100).allow('')).length(3),
    rows:        Joi.array().items(rowSchema),
}).min(1);

const rejectSchema = Joi.object({
    note: Joi.string().trim().max(500).allow('').default(''),
});

function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
        if (error) return res.status(400).json({ error: error.details.map(d => d.message).join('; ') });
        req.body = value;
        next();
    };
}

// GET /api/quotations — user: own; admin: all
router.get('/', requireAuth, (req, res) => {
    const list = req.user.role === 'admin'
        ? db.quotations.all()
        : db.quotations.byUser(req.user.id);
    res.json(list);
});

// GET /api/quotations/:id
router.get('/:id', requireAuth, (req, res) => {
    const q = db.quotations.findById(parseInt(req.params.id, 10));
    if (!q) return res.status(404).json({ error: 'Không tìm thấy bảng báo giá' });
    if (req.user.role !== 'admin' && q.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Không có quyền xem bảng báo giá này' });
    }
    res.json(q);
});

// POST /api/quotations — tạo mới
router.post('/', requireAuth, validate(quotationWriteSchema), (req, res) => {
    const q = db.quotations.create({ user_id: req.user.id, ...req.body });
    res.status(201).json(q);
});

// PUT /api/quotations/:id — sửa (chỉ khi draft hoặc rejected)
router.put('/:id', requireAuth, validate(quotationUpdateSchema), (req, res) => {
    const id = parseInt(req.params.id, 10);
    const q = db.quotations.findById(id);
    if (!q) return res.status(404).json({ error: 'Không tìm thấy bảng báo giá' });
    if (q.user_id !== req.user.id) return res.status(403).json({ error: 'Không có quyền' });
    if (!['draft', 'rejected'].includes(q.status)) {
        return res.status(400).json({ error: 'Chỉ có thể chỉnh sửa bảng đang ở trạng thái Draft hoặc Bị từ chối' });
    }
    res.json(db.quotations.update(id, req.body));
});

// PUT /api/quotations/:id/submit — gửi duyệt
router.put('/:id/submit', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const q = db.quotations.findById(id);
    if (!q) return res.status(404).json({ error: 'Không tìm thấy bảng báo giá' });
    if (q.user_id !== req.user.id) return res.status(403).json({ error: 'Không có quyền' });
    if (!['draft', 'rejected'].includes(q.status)) {
        return res.status(400).json({ error: 'Bảng báo giá đã được gửi hoặc đã duyệt' });
    }
    if (!q.rows.length) {
        return res.status(400).json({ error: 'Bảng báo giá chưa có hạng mục nào' });
    }
    res.json(db.quotations.update(id, { status: 'pending' }));
});

// PUT /api/quotations/:id/approve — admin duyệt
router.put('/:id/approve', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const q = db.quotations.findById(id);
    if (!q) return res.status(404).json({ error: 'Không tìm thấy bảng báo giá' });
    if (q.status !== 'pending') return res.status(400).json({ error: 'Bảng không ở trạng thái chờ duyệt' });
    res.json(db.quotations.update(id, { status: 'approved', admin_note: null }));
});

// PUT /api/quotations/:id/reject — admin từ chối
router.put('/:id/reject', requireAdmin, validate(rejectSchema), (req, res) => {
    const id = parseInt(req.params.id, 10);
    const q = db.quotations.findById(id);
    if (!q) return res.status(404).json({ error: 'Không tìm thấy bảng báo giá' });
    if (q.status !== 'pending') return res.status(400).json({ error: 'Bảng không ở trạng thái chờ duyệt' });
    res.json(db.quotations.update(id, { status: 'rejected', admin_note: req.body.note || null }));
});

// DELETE /api/quotations/:id — user xóa của mình (draft/rejected); admin xóa bất kỳ
router.delete('/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const q = db.quotations.findById(id);
    if (!q) return res.status(404).json({ error: 'Không tìm thấy bảng báo giá' });
    if (req.user.role !== 'admin') {
        if (q.user_id !== req.user.id) return res.status(403).json({ error: 'Không có quyền' });
        if (!['draft', 'rejected'].includes(q.status)) {
            return res.status(400).json({ error: 'Chỉ có thể xóa bảng đang ở trạng thái Draft hoặc Bị từ chối' });
        }
    }
    db.quotations.delete(id);
    res.json({ message: 'Đã xóa bảng báo giá' });
});

module.exports = router;
