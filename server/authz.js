function parseId(value) {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function getCollabRole(db, project, userId, userRole) {
    if (!project) return null;
    if (userRole === 'admin' || project.user_id === userId) return 'editor';
    const collab = db.collaborators.find(project.id, userId);
    if (collab && collab.status === 'accepted') return collab.role;
    return null;
}

function getProjectRole(db, projectId, user) {
    const id = parseId(projectId);
    if (!id || !user) return null;
    const project = db.projects.findById(id);
    if (!project) return null;
    const role = getCollabRole(db, project, user.id, user.role);
    return role ? { project, role } : null;
}

function canManageProject(project, user) {
    return !!project && !!user && (user.role === 'admin' || project.user_id === user.id);
}

function canDeleteComment(project, comment, user) {
    if (!project || !comment || !user) return false;
    if (comment.project_id !== project.id) return false;
    return canManageProject(project, user) || comment.user_id === user.id;
}

module.exports = {
    parseId,
    getCollabRole,
    getProjectRole,
    canManageProject,
    canDeleteComment,
};
