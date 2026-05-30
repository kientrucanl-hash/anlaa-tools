const express = require('express');
const Joi = require('joi');
const db = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const projectCreateSchema = Joi.object({
    name: Joi.string().trim().min(1).max(200).required().messages({
        'string.empty': 'Tên dự án không được để trống',
        'string.max': 'Tên dự án không được vượt quá 200 ký tự',
        'any.required': 'Thiếu tên dự án',
    }),
    address: Joi.string().trim().max(500).allow('').default(''),
    data: Joi.array().default([]),
});

const projectUpdateSchema = Joi.object({
    name: Joi.string().trim().min(1).max(200).messages({
        'string.empty': 'Tên dự án không được để trống',
        'string.max': 'Tên dự án không được vượt quá 200 ký tự',
    }),
    address: Joi.string().trim().max(500).allow(''),
    data: Joi.array(),
}).min(1);

const rejectSchema = Joi.object({
    note: Joi.string().trim().max(500).allow('').default(''),
});

function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
        if (error) {
            const messages = error.details.map(d => d.message).join('; ');
            return res.status(400).json({ error: messages });
        }
        req.body = value;
        next();
    };
}

// GET /api/projects — User: own; Admin: all
router.get('/', requireAuth, (req, res) => {
    let projects;
    if (req.user.role === 'admin') {
        projects = db.projects.all().map(p => ({
            ...p,
            owner_name: db.users.findById(p.user_id)?.username || 'unknown'
        }));
    } else {
        projects = db.projects.byUser(req.user.id).map(p => ({
            ...p,
            owner_name: req.user.username
        }));
    }
    res.json(projects);
});

// GET /api/projects/meta/users — admin only (must be before /:id)
router.get('/meta/users', requireAdmin, (req, res) => {
    res.json(db.users.all());
});

// GET /api/projects/:id
router.get('/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' });
    const project = db.projects.findById(id);

    if (!project) return res.status(404).json({ error: 'Không tìm thấy project' });
    if (req.user.role !== 'admin' && project.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    res.json({ ...project, owner_name: db.users.findById(project.user_id)?.username });
});

// POST /api/projects
router.post('/', requireAuth, validate(projectCreateSchema), (req, res) => {
    const { name, address, data } = req.body;
    const project = db.projects.create({ user_id: req.user.id, name, address, items: data });
    res.status(201).json(project);
});

// PUT /api/projects/:id — update name/address/data
router.put('/:id', requireAuth, validate(projectUpdateSchema), (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' });
    const project = db.projects.findById(id);

    if (!project) return res.status(404).json({ error: 'Không tìm thấy project' });
    if (project.user_id !== req.user.id) return res.status(403).json({ error: 'Không có quyền' });
    if (!['draft', 'rejected'].includes(project.status)) {
        return res.status(400).json({ error: 'Project đang chờ duyệt hoặc đã được duyệt, không thể chỉnh sửa' });
    }

    const updated = db.projects.update(id, req.body);
    res.json(updated);
});

// PUT /api/projects/:id/submit
router.put('/:id/submit', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' });
    const project = db.projects.findById(id);

    if (!project) return res.status(404).json({ error: 'Không tìm thấy project' });
    if (project.user_id !== req.user.id) return res.status(403).json({ error: 'Không có quyền' });
    if (!['draft', 'rejected'].includes(project.status)) {
        return res.status(400).json({ error: 'Chỉ có thể nộp duyệt project ở trạng thái Draft hoặc Từ chối' });
    }

    res.json(db.projects.update(id, { status: 'pending', admin_note: null }));
});

// PUT /api/projects/:id/approve — admin only
router.put('/:id/approve', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' });
    const project = db.projects.findById(id);

    if (!project) return res.status(404).json({ error: 'Không tìm thấy project' });
    if (project.status !== 'pending') {
        return res.status(400).json({ error: 'Chỉ có thể duyệt project đang Chờ duyệt' });
    }

    res.json(db.projects.update(id, { status: 'approved', admin_note: null }));
});

// PUT /api/projects/:id/reject — admin only
router.put('/:id/reject', requireAdmin, validate(rejectSchema), (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' });
    const project = db.projects.findById(id);

    if (!project) return res.status(404).json({ error: 'Không tìm thấy project' });
    if (project.status !== 'pending') {
        return res.status(400).json({ error: 'Chỉ có thể từ chối project đang Chờ duyệt' });
    }

    res.json(db.projects.update(id, { status: 'rejected', admin_note: req.body.note }));
});

// DELETE /api/projects/:id — admin only
router.delete('/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' });
    const project = db.projects.findById(id);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy project' });

    db.projects.delete(id);
    res.json({ message: 'Đã xóa project' });
});

module.exports = router;
