const EDITABLE_STATUSES = new Set(['draft', 'rejected']);

function isAdmin(user) {
    return user && user.role === 'admin';
}

function isOwner(draft, user) {
    return draft && user && draft.submitted_by === user.id;
}

function canReadDraft(draft, user) {
    return Boolean(isAdmin(user) || isOwner(draft, user));
}

function canEditDraft(draft, user) {
    return Boolean((isAdmin(user) || isOwner(draft, user)) && EDITABLE_STATUSES.has(draft.status));
}

function canSubmitDraft(draft, user) {
    return Boolean((isAdmin(user) || isOwner(draft, user)) && EDITABLE_STATUSES.has(draft.status));
}

function canReviewDraft(draft, user) {
    return Boolean(isAdmin(user) && draft && draft.status === 'pending');
}

module.exports = {
    canReadDraft,
    canEditDraft,
    canSubmitDraft,
    canReviewDraft,
};
