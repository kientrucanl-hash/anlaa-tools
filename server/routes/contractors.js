const express = require('express');
const Joi = require('joi');
const db = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const draftWorkflow = require('../contractorDraftWorkflow');

const router = express.Router();

const contractorSchema = Joi.object({
    type: Joi.string().valid('team', 'company', 'individual').default('team'),
    name: Joi.string().trim().min(1).max(200).required(),
    contact_name: Joi.string().trim().max(100).allow('', null).default(null),
    phone: Joi.string().trim().max(20).allow('', null).default(null),
    phone2: Joi.string().trim().max(20).allow('', null).default(null),
    email: Joi.string().trim().email({ tlds: false }).max(200).allow('', null).default(null),
    address: Joi.string().trim().max(500).allow('', null).default(null),
    district: Joi.string().trim().max(100).allow('', null).default(null),
    city: Joi.string().trim().max(100).default('Ha Noi'),
    specialty: Joi.string().allow('', null).default(null),
    work_scope: Joi.string().trim().max(200).allow('', null).default(null),
    tax_code: Joi.string().trim().max(20).allow('', null).default(null),
    bank_account: Joi.string().trim().max(50).allow('', null).default(null),
    bank_name: Joi.string().trim().max(100).allow('', null).default(null),
    rating: Joi.number().integer().min(1).max(5).default(3),
    rating_note: Joi.string().trim().max(500).allow('', null).default(null),
    project_count: Joi.number().integer().min(0).default(0),
    total_value: Joi.number().min(0).default(0),
    last_project_at: Joi.string().allow('', null).default(null),
    price_notes: Joi.string().allow('', null).default(null),
    status: Joi.string().valid('active', 'inactive', 'blacklist').default('active'),
    note: Joi.string().trim().max(1000).allow('', null).default(null),
});

const updateSchema = contractorSchema.fork(['name'], f => f.optional()).min(1);
const draftSchema = contractorSchema.keys({
    contractor_id: Joi.number().integer().positive().allow(null).default(null),
});
const draftUpdateSchema = updateSchema.keys({
    contractor_id: Joi.number().integer().positive().allow(null),
});
const reviewSchema = Joi.object({
    admin_note: Joi.string().trim().max(1000).allow('', null).default(null),
});

function parseId(value) {
    const id = Number.parseInt(value, 10);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

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

function getDraftForUser(req, res) {
    const id = parseId(req.params.id);
    if (!id) {
        res.status(400).json({ error: 'ID khong hop le' });
        return null;
    }

    const draft = db.contractorDrafts.findById(id);
    if (!draft) {
        res.status(404).json({ error: 'Khong tim thay nhap nha thau' });
        return null;
    }

    if (!draftWorkflow.canReadDraft(draft, req.user)) {
        res.status(403).json({ error: 'Khong co quyen xem nhap nay' });
        return null;
    }

    return draft;
}

function ensureTargetContractor(contractorId, res) {
    if (!contractorId) return true;
    if (db.contractors.findById(contractorId)) return true;
    res.status(404).json({ error: 'Khong tim thay nha thau can cap nhat' });
    return false;
}

// Drafts must be registered before /:id routes.
router.get('/drafts', requireAuth, (req, res) => {
    const { status } = req.query;
    const drafts = req.user.role === 'admin'
        ? db.contractorDrafts.all({ status })
        : db.contractorDrafts.byUser(req.user.id);
    res.json(drafts);
});

router.post('/drafts', requireAuth, validate(draftSchema), (req, res) => {
    const { contractor_id, ...payload } = req.body;
    if (!ensureTargetContractor(contractor_id, res)) return;

    const draft = db.contractorDrafts.create({
        contractor_id,
        submitted_by: req.user.id,
        payload,
    });
    res.status(201).json(draft);
});

router.get('/drafts/:id', requireAuth, (req, res) => {
    const draft = getDraftForUser(req, res);
    if (draft) res.json(draft);
});

router.put('/drafts/:id', requireAuth, validate(draftUpdateSchema), (req, res) => {
    const draft = getDraftForUser(req, res);
    if (!draft) return;
    if (!draftWorkflow.canEditDraft(draft, req.user)) {
        return res.status(403).json({ error: 'Chi co the sua nhap dang draft hoac bi tu choi' });
    }

    const { contractor_id, ...payloadPatch } = req.body;
    const nextContractorId = contractor_id !== undefined ? contractor_id : draft.contractor_id;
    if (!ensureTargetContractor(nextContractorId, res)) return;

    const payload = { ...draft.payload, ...payloadPatch };
    res.json(db.contractorDrafts.update(draft.id, { contractor_id: nextContractorId, payload }));
});

router.put('/drafts/:id/submit', requireAuth, (req, res) => {
    const draft = getDraftForUser(req, res);
    if (!draft) return;
    if (!draftWorkflow.canSubmitDraft(draft, req.user)) {
        return res.status(403).json({ error: 'Nhap nay khong the gui duyet' });
    }
    res.json(db.contractorDrafts.submit(draft.id));
});

router.put('/drafts/:id/approve', requireAdmin, validate(reviewSchema), (req, res) => {
    const draft = db.contractorDrafts.findById(parseId(req.params.id));
    if (!draft) return res.status(404).json({ error: 'Khong tim thay nhap nha thau' });
    if (!draftWorkflow.canReviewDraft(draft, req.user)) {
        return res.status(403).json({ error: 'Chi duyet duoc nhap dang cho duyet' });
    }

    const saved = draft.contractor_id
        ? db.contractors.update(draft.contractor_id, draft.payload)
        : db.contractors.create({ ...draft.payload, created_by: draft.submitted_by });
    const reviewed = db.contractorDrafts.approve(draft.id, req.user.id, saved.id, req.body.admin_note);
    res.json({ draft: reviewed, contractor: saved });
});

router.put('/drafts/:id/reject', requireAdmin, validate(reviewSchema), (req, res) => {
    const draft = db.contractorDrafts.findById(parseId(req.params.id));
    if (!draft) return res.status(404).json({ error: 'Khong tim thay nhap nha thau' });
    if (!draftWorkflow.canReviewDraft(draft, req.user)) {
        return res.status(403).json({ error: 'Chi tu choi duoc nhap dang cho duyet' });
    }
    res.json(db.contractorDrafts.reject(draft.id, req.user.id, req.body.admin_note));
});

router.delete('/drafts/:id', requireAuth, (req, res) => {
    const draft = getDraftForUser(req, res);
    if (!draft) return;
    if (!draftWorkflow.canEditDraft(draft, req.user)) {
        return res.status(403).json({ error: 'Chi xoa duoc nhap draft hoac bi tu choi' });
    }
    db.contractorDrafts.delete(draft.id);
    res.json({ message: 'Da xoa nhap nha thau' });
});

router.get('/', requireAuth, (req, res) => {
    const { status, type, search } = req.query;
    const list = db.contractors.all({ status, type, search });
    res.json(list);
});

router.get('/stats', requireAdmin, (req, res) => {
    res.json(db.contractors.stats());
});

router.get('/:id', requireAuth, (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID khong hop le' });
    const contractor = db.contractors.findById(id);
    if (!contractor) return res.status(404).json({ error: 'Khong tim thay nha thau' });
    res.json(contractor);
});

router.post('/', requireAdmin, validate(contractorSchema), (req, res) => {
    const contractor = db.contractors.create({ ...req.body, created_by: req.user.id });
    res.status(201).json(contractor);
});

router.put('/:id', requireAdmin, validate(updateSchema), (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID khong hop le' });
    if (!db.contractors.findById(id)) return res.status(404).json({ error: 'Khong tim thay nha thau' });
    res.json(db.contractors.update(id, req.body));
});

router.delete('/:id', requireAdmin, (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID khong hop le' });
    if (!db.contractors.delete(id)) return res.status(404).json({ error: 'Khong tim thay nha thau' });
    res.json({ message: 'Da xoa nha thau' });
});

module.exports = router;
