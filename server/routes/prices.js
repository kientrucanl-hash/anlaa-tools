const express = require('express');
const Joi = require('joi');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const pricesSchema = Joi.object({
    region: Joi.string().max(50).default('hanoi'),
    prices: Joi.object().max(500).pattern(Joi.string().max(100), Joi.number().min(0)).required(),
});

const projectPricesSchema = Joi.object({
    prices: Joi.object().max(500).pattern(Joi.string().max(100), Joi.number().min(0)).required(),
});

function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
        if (error) return res.status(400).json({ error: error.details.map(d => d.message).join('; ') });
        req.body = value;
        next();
    };
}

// GET /api/prices/me — get current user's price profile
router.get('/me', requireAuth, (req, res) => {
    res.json(db.priceProfiles.getByUser(req.user.id));
});

// PUT /api/prices/me — upsert current user's price profile
router.put('/me', requireAuth, validate(pricesSchema), (req, res) => {
    const profile = db.priceProfiles.upsertUser(req.user.id, req.body.region, req.body.prices);
    res.json(profile);
});

// GET /api/prices/project/:id — get project price overrides
router.get('/project/:id', requireAuth, (req, res) => {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) return res.status(400).json({ error: 'ID không hợp lệ' });

    const project = db.projects.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });

    // Must be owner, editor, or admin
    const { getCollabRole } = require('./collaboration');
    const role = getCollabRole(project, req.user.id, req.user.role);
    if (!role) return res.status(403).json({ error: 'Không có quyền truy cập' });

    res.json(db.priceProfiles.getByProject(projectId));
});

// PUT /api/prices/project/:id — set project price overrides (owner/editor/admin)
router.put('/project/:id', requireAuth, validate(projectPricesSchema), (req, res) => {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) return res.status(400).json({ error: 'ID không hợp lệ' });

    const project = db.projects.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });

    const { getCollabRole } = require('./collaboration');
    const role = getCollabRole(project, req.user.id, req.user.role);
    if (!role || role === 'viewer') return res.status(403).json({ error: 'Không có quyền chỉnh sửa' });

    const override = db.priceProfiles.upsertProject(projectId, req.body.prices);
    res.json(override);
});

// DELETE /api/prices/project/:id — remove project overrides (revert to user profile)
router.delete('/project/:id', requireAuth, (req, res) => {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) return res.status(400).json({ error: 'ID không hợp lệ' });

    const project = db.projects.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });
    if (project.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Chỉ chủ dự án mới có thể xóa ghi đè đơn giá' });
    }

    db.priceProfiles.deleteProject(projectId);
    res.json({ ok: true });
});

module.exports = router;
