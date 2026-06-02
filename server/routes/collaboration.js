const express = require('express');
const Joi = require('joi');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const authz = require('../authz');

const router = express.Router();

function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
        if (error) return res.status(400).json({ error: error.details.map(d => d.message).join('; ') });
        req.body = value;
        next();
    };
}

// Helper: check if user can manage a project (owner or admin)
function canManage(project, userId, userRole) {
    return authz.canManageProject(project, { id: userId, role: userRole });
}

// Helper: check if user has access (owner, admin, or accepted collaborator)
function getCollabRole(project, userId, userRole) {
    return authz.getCollabRole(db, project, userId, userRole);
}

// ── GET /api/collaboration/:projectId — get collaborators + pending requests
router.get('/:projectId', requireAuth, (req, res) => {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'ID không hợp lệ' });

    const project = db.projects.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });
    if (!canManage(project, req.user.id, req.user.role)) {
        return res.status(403).json({ error: 'Chỉ chủ dự án mới xem được danh sách cộng tác' });
    }

    res.json({
        collaborators: db.collaborators.byProject(projectId),
        accessRequests: db.accessRequests.byProject(projectId),
    });
});

// ── POST /api/collaboration/:projectId/invite — owner invites a user
router.post('/:projectId/invite', requireAuth, validate(Joi.object({
    username: Joi.string().trim().min(1).required(),
    role: Joi.string().valid('editor', 'viewer').default('viewer'),
})), (req, res) => {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'ID không hợp lệ' });

    const project = db.projects.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });
    if (!canManage(project, req.user.id, req.user.role)) {
        return res.status(403).json({ error: 'Chỉ chủ dự án mới có thể mời người dùng' });
    }

    const invitee = db.users.findByUsername(req.body.username);
    if (!invitee) return res.status(404).json({ error: `Không tìm thấy người dùng "${req.body.username}"` });
    if (invitee.id === req.user.id) return res.status(400).json({ error: 'Không thể tự mời chính mình' });

    const collab = db.collaborators.invite(projectId, req.user.id, invitee.id, req.body.role);

    // Persist notification for invitee
    const roleLabel = req.body.role === 'editor' ? 'Chỉnh sửa' : 'Chỉ xem';
    db.notifications.create({
        user_id: invitee.id,
        type: 'collab_invite',
        title: 'Lời mời cộng tác',
        body: `${req.user.username} mời bạn vào dự án "${project.name}" với quyền ${roleLabel}.`,
        link: `index.html`,
        meta: { projectId, projectName: project.name, invitedBy: req.user.username, role: req.body.role },
    });

    const io = req.app.get('io');
    if (io) {
        io.to(`user:${invitee.id}`).emit('collab:invited', {
            projectId, projectName: project.name,
            invitedBy: req.user.username, role: req.body.role,
        });
        io.to(`user:${invitee.id}`).emit('notification:new', db.notifications.byUser(invitee.id, 1)[0]);
    }

    res.json({ message: `Đã mời ${invitee.username}`, collab });
});

// ── PUT /api/collaboration/:projectId/invite/respond — invitee accepts/declines
router.put('/:projectId/invite/respond', requireAuth, validate(Joi.object({
    action: Joi.string().valid('accept', 'deny').required(),
})), (req, res) => {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'ID không hợp lệ' });

    const collab = db.collaborators.find(projectId, req.user.id);
    if (!collab || collab.status !== 'pending') {
        return res.status(404).json({ error: 'Không tìm thấy lời mời đang chờ' });
    }

    if (req.body.action === 'accept') {
        db.collaborators.accept(projectId, req.user.id);
    } else {
        db.collaborators.deny(projectId, req.user.id);
    }

    // Persist notification for project owner
    const actionLabel = req.body.action === 'accept' ? 'chấp nhận' : 'từ chối';
    db.notifications.create({
        user_id: collab.owner_id,
        type: 'collab_responded',
        title: `${req.user.username} ${actionLabel} lời mời`,
        body: `${req.user.username} đã ${actionLabel} lời mời cộng tác vào dự án.`,
        link: `index.html`,
        meta: { projectId, action: req.body.action, username: req.user.username },
    });

    const io = req.app.get('io');
    if (io) {
        io.to(`user:${collab.owner_id}`).emit('collab:responded', {
            projectId, username: req.user.username, action: req.body.action,
        });
        io.to(`user:${collab.owner_id}`).emit('notification:new', db.notifications.byUser(collab.owner_id, 1)[0]);
        if (req.body.action === 'accept') {
            io.to(`project:${projectId}`).emit('collab:joined', { username: req.user.username });
        }
    }

    res.json({ message: req.body.action === 'accept' ? 'Đã chấp nhận lời mời' : 'Đã từ chối lời mời' });
});

// ── PUT /api/collaboration/:projectId/role — owner changes collaborator role
router.put('/:projectId/role', requireAuth, validate(Joi.object({
    inviteeId: Joi.number().integer().required(),
    role: Joi.string().valid('editor', 'viewer').required(),
})), (req, res) => {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'ID không hợp lệ' });

    const project = db.projects.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });
    if (!canManage(project, req.user.id, req.user.role)) {
        return res.status(403).json({ error: 'Không có quyền' });
    }

    db.collaborators.updateRole(projectId, req.body.inviteeId, req.body.role);

    const newRoleLabel = req.body.role === 'editor' ? 'Chỉnh sửa' : 'Chỉ xem';
    db.notifications.create({
        user_id: req.body.inviteeId,
        type: 'role_changed',
        title: 'Quyền cộng tác thay đổi',
        body: `Quyền của bạn trong dự án của ${req.user.username} đã thay đổi thành "${newRoleLabel}".`,
        link: `index.html`,
        meta: { projectId, role: req.body.role },
    });

    const io = req.app.get('io');
    if (io) {
        io.to(`user:${req.body.inviteeId}`).emit('collab:role_changed', { projectId, newRole: req.body.role });
        io.to(`user:${req.body.inviteeId}`).emit('notification:new', db.notifications.byUser(req.body.inviteeId, 1)[0]);
    }

    res.json({ message: 'Đã cập nhật quyền' });
});

// ── DELETE /api/collaboration/:projectId/member/:userId — owner removes collaborator
router.delete('/:projectId/member/:userId', requireAuth, (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const targetId = parseInt(req.params.userId);
    if (isNaN(projectId) || isNaN(targetId)) return res.status(400).json({ error: 'ID không hợp lệ' });

    const project = db.projects.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });
    // Allow owner to remove others, or user to remove themselves (leave)
    if (!canManage(project, req.user.id, req.user.role) && req.user.id !== targetId) {
        return res.status(403).json({ error: 'Không có quyền' });
    }

    db.collaborators.remove(projectId, targetId);

    const io = req.app.get('io');
    if (io) {
        io.to(`project:${projectId}`).emit('collab:removed', { userId: targetId });
    }

    res.json({ message: 'Đã xóa thành viên' });
});

// ── POST /api/collaboration/:projectId/request-access — user requests access
router.post('/:projectId/request-access', requireAuth, validate(Joi.object({
    role: Joi.string().valid('editor', 'viewer').default('viewer'),
    message: Joi.string().trim().max(300).allow('').default(''),
})), (req, res) => {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'ID không hợp lệ' });

    const project = db.projects.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });

    // Already has access?
    if (project.user_id === req.user.id) return res.status(400).json({ error: 'Bạn là chủ dự án này' });
    const existing = db.collaborators.find(projectId, req.user.id);
    if (existing && existing.status === 'accepted') return res.status(400).json({ error: 'Bạn đã có quyền truy cập dự án này' });

    const accessReq = db.accessRequests.create(projectId, req.user.id, req.body.role, req.body.message);

    // Persist notification for project owner
    const roleReqLabel = req.body.role === 'editor' ? 'Chỉnh sửa' : 'Chỉ xem';
    db.notifications.create({
        user_id: project.user_id,
        type: 'access_request',
        title: 'Yêu cầu truy cập dự án',
        body: `${req.user.username} yêu cầu quyền ${roleReqLabel} dự án "${project.name}".${req.body.message ? ` Ghi chú: ${req.body.message}` : ''}`,
        link: `index.html`,
        meta: { projectId, projectName: project.name, requesterId: req.user.id, requesterUsername: req.user.username, role: req.body.role, requestId: accessReq.id },
    });

    const io = req.app.get('io');
    if (io) {
        io.to(`user:${project.user_id}`).emit('collab:access_requested', {
            projectId, projectName: project.name,
            requesterId: req.user.id, requesterUsername: req.user.username,
            role: req.body.role, message: req.body.message, requestId: accessReq.id,
        });
        io.to(`user:${project.user_id}`).emit('notification:new', db.notifications.byUser(project.user_id, 1)[0]);
    }

    res.json({ message: 'Đã gửi yêu cầu quyền truy cập. Chờ chủ dự án xét duyệt.' });
});

// ── PUT /api/collaboration/:projectId/request-access/:requestId — owner approves/denies
router.put('/:projectId/request-access/:requestId', requireAuth, validate(Joi.object({
    action: Joi.string().valid('approve', 'deny').required(),
    role: Joi.string().valid('editor', 'viewer').default('viewer'),
})), (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const requestId = parseInt(req.params.requestId);
    if (isNaN(projectId) || isNaN(requestId)) return res.status(400).json({ error: 'ID không hợp lệ' });

    const project = db.projects.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });
    if (!canManage(project, req.user.id, req.user.role)) {
        return res.status(403).json({ error: 'Chỉ chủ dự án mới có thể xét duyệt yêu cầu' });
    }

    const accessReq = sqliteGetRequest(requestId, projectId);
    if (!accessReq) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    if (accessReq.status !== 'pending') return res.status(400).json({ error: 'Yêu cầu đã được xử lý' });

    const io = req.app.get('io');

    if (req.body.action === 'approve') {
        db.accessRequests.approve(requestId, projectId, req.user.id, accessReq.requester_id, req.body.role);
        const approvedRoleLabel = req.body.role === 'editor' ? 'Chỉnh sửa' : 'Chỉ xem';
        db.notifications.create({
            user_id: accessReq.requester_id,
            type: 'access_approved',
            title: 'Yêu cầu truy cập được chấp thuận',
            body: `Bạn được cấp quyền ${approvedRoleLabel} dự án "${project.name}".`,
            link: `index.html`,
            meta: { projectId, projectName: project.name, role: req.body.role },
        });
        if (io) {
            io.to(`user:${accessReq.requester_id}`).emit('collab:access_approved', {
                projectId, projectName: project.name, role: req.body.role,
            });
            io.to(`user:${accessReq.requester_id}`).emit('notification:new', db.notifications.byUser(accessReq.requester_id, 1)[0]);
            io.to(`project:${projectId}`).emit('collab:joined', {
                userId: accessReq.requester_id, username: accessReq.requester_username,
            });
        }
        res.json({ message: `Đã cấp quyền ${req.body.role} cho ${accessReq.requester_username}` });
    } else {
        db.accessRequests.deny(requestId);
        db.notifications.create({
            user_id: accessReq.requester_id,
            type: 'access_denied',
            title: 'Yêu cầu truy cập bị từ chối',
            body: `Yêu cầu truy cập dự án "${project.name}" của bạn bị từ chối.`,
            link: null,
            meta: { projectId, projectName: project.name },
        });
        if (io) {
            io.to(`user:${accessReq.requester_id}`).emit('collab:access_denied', {
                projectId, projectName: project.name,
            });
            io.to(`user:${accessReq.requester_id}`).emit('notification:new', db.notifications.byUser(accessReq.requester_id, 1)[0]);
        }
        res.json({ message: `Đã từ chối yêu cầu của ${accessReq.requester_username}` });
    }
});

function sqliteGetRequest(id, projectId) {
    const Database = require('better-sqlite3');
    const path = require('path');
    // reuse the same db instance via require cache
    const dbModule = require('../db/database');
    // We reach into the raw sqlite via a small helper exposed on db or re-query
    // Use the db.accessRequests helper indirectly:
    const sqliteDb = dbModule._raw;
    if (!sqliteDb) return null;
    return sqliteDb.prepare(`
        SELECT ar.*, u.username as requester_username
        FROM project_access_requests ar JOIN users u ON u.id=ar.requester_id
        WHERE ar.id=? AND ar.project_id=?
    `).get(id, projectId) || null;
}

// ── GET /api/collaboration/:projectId/comments — get all comments
router.get('/:projectId/comments', requireAuth, (req, res) => {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'ID không hợp lệ' });

    const project = db.projects.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });
    if (!getCollabRole(project, req.user.id, req.user.role)) {
        return res.status(403).json({ error: 'Không có quyền truy cập dự án này' });
    }

    res.json(db.comments.byProject(projectId));
});

// ── POST /api/collaboration/:projectId/comments — post a comment
router.post('/:projectId/comments', requireAuth, validate(Joi.object({
    rowRef: Joi.string().allow('', null).default(null),
    content: Joi.string().trim().min(1).max(1000).required(),
})), (req, res) => {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'ID không hợp lệ' });

    const project = db.projects.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });
    if (!getCollabRole(project, req.user.id, req.user.role)) {
        return res.status(403).json({ error: 'Không có quyền truy cập dự án này' });
    }

    const comment = db.comments.create(projectId, req.user.id, req.body.rowRef, req.body.content);

    const io = req.app.get('io');
    if (io) {
        io.to(`project:${projectId}`).emit('comment:new', comment);
    }

    res.status(201).json(comment);
});

// ── PUT /api/collaboration/:projectId/comments/:commentId/resolve
router.put('/:projectId/comments/:commentId/resolve', requireAuth, (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const commentId = parseInt(req.params.commentId);
    if (isNaN(projectId) || isNaN(commentId)) return res.status(400).json({ error: 'ID không hợp lệ' });

    const project = db.projects.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });
    if (!canManage(project, req.user.id, req.user.role)) {
        return res.status(403).json({ error: 'Chỉ chủ dự án mới có thể resolve comment' });
    }

    const comment = db.comments.findById(commentId);
    if (!comment || comment.project_id !== projectId) {
        return res.status(404).json({ error: 'Không tìm thấy comment' });
    }

    db.comments.resolve(commentId, req.user.id);

    const io = req.app.get('io');
    if (io) io.to(`project:${projectId}`).emit('comment:resolved', { id: commentId });

    res.json({ message: 'Đã đánh dấu hoàn thành' });
});

// ── DELETE /api/collaboration/:projectId/comments/:commentId
router.delete('/:projectId/comments/:commentId', requireAuth, (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const commentId = parseInt(req.params.commentId);
    if (isNaN(projectId) || isNaN(commentId)) return res.status(400).json({ error: 'ID không hợp lệ' });

    // Only comment author or project owner can delete
    const project = db.projects.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });

    const comment = db.comments.findById(commentId);
    if (!comment || comment.project_id !== projectId) {
        return res.status(404).json({ error: 'Không tìm thấy comment' });
    }
    if (!authz.canDeleteComment(project, comment, req.user)) {
        return res.status(403).json({ error: 'Không có quyền xóa comment này' });
    }

    db.comments.delete(commentId);

    const io = req.app.get('io');
    if (io) io.to(`project:${projectId}`).emit('comment:deleted', { id: commentId });

    res.json({ message: 'Đã xóa comment' });
});

module.exports = router;
module.exports.getCollabRole = getCollabRole;
