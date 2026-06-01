const express = require('express');
const Joi = require('joi');
const db = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const SPECIALTIES = [
    'masonry','plastering','tiling','painting','screed',
    'concrete','formwork','electrical','plumbing','waterproof',
    'ceiling','door','window','railing','stone','excavation','general'
];

const contractorSchema = Joi.object({
    type:            Joi.string().valid('team','company','individual').default('team'),
    name:            Joi.string().trim().min(1).max(200).required(),
    contact_name:    Joi.string().trim().max(100).allow('', null).default(null),
    phone:           Joi.string().trim().max(20).allow('', null).default(null),
    phone2:          Joi.string().trim().max(20).allow('', null).default(null),
    email:           Joi.string().trim().email({ tlds: false }).max(200).allow('', null).default(null),
    address:         Joi.string().trim().max(500).allow('', null).default(null),
    district:        Joi.string().trim().max(100).allow('', null).default(null),
    city:            Joi.string().trim().max(100).default('Hà Nội'),
    specialty:       Joi.string().allow('', null).default(null), // JSON string
    work_scope:      Joi.string().trim().max(200).allow('', null).default(null),
    tax_code:        Joi.string().trim().max(20).allow('', null).default(null),
    bank_account:    Joi.string().trim().max(50).allow('', null).default(null),
    bank_name:       Joi.string().trim().max(100).allow('', null).default(null),
    rating:          Joi.number().integer().min(1).max(5).default(3),
    rating_note:     Joi.string().trim().max(500).allow('', null).default(null),
    project_count:   Joi.number().integer().min(0).default(0),
    total_value:     Joi.number().min(0).default(0),
    last_project_at: Joi.string().allow('', null).default(null),
    price_notes:     Joi.string().allow('', null).default(null), // JSON string
    status:          Joi.string().valid('active','inactive','blacklist').default('active'),
    note:            Joi.string().trim().max(1000).allow('', null).default(null),
});

const updateSchema = contractorSchema.fork(
    ['name'], f => f.optional()
).min(1);

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

// GET /api/contractors — list with optional filters
router.get('/', requireAuth, (req, res) => {
    const { status, type, search } = req.query;
    const list = db.contractors.all({ status, type, search });
    res.json(list);
});

// GET /api/contractors/stats — aggregate stats (admin)
router.get('/stats', requireAdmin, (req, res) => {
    res.json(db.contractors.stats());
});

// GET /api/contractors/:id — single record
router.get('/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' });
    const c = db.contractors.findById(id);
    if (!c) return res.status(404).json({ error: 'Không tìm thấy nhà thầu' });
    res.json(c);
});

// POST /api/contractors — create (any auth user)
router.post('/', requireAuth, validate(contractorSchema), (req, res) => {
    const c = db.contractors.create({ ...req.body, created_by: req.user.id });
    res.status(201).json(c);
});

// PUT /api/contractors/:id — update (any auth user)
router.put('/:id', requireAuth, validate(updateSchema), (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' });
    if (!db.contractors.findById(id)) return res.status(404).json({ error: 'Không tìm thấy nhà thầu' });
    res.json(db.contractors.update(id, req.body));
});

// DELETE /api/contractors/:id — admin only
router.delete('/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' });
    if (!db.contractors.delete(id)) return res.status(404).json({ error: 'Không tìm thấy nhà thầu' });
    res.json({ message: 'Đã xóa nhà thầu' });
});

module.exports = router;
