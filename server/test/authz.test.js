const test = require('node:test');
const assert = require('node:assert/strict');
const authz = require('../authz');

function fakeDb(collab) {
    return {
        projects: {
            findById(id) {
                return id === 7 ? { id: 7, user_id: 1 } : null;
            },
        },
        collaborators: {
            find(projectId, userId) {
                return collab && collab.project_id === projectId && collab.invitee_id === userId
                    ? collab
                    : null;
            },
        },
    };
}

test('getProjectRole grants owner and admin editor access', () => {
    const db = fakeDb(null);

    assert.deepEqual(authz.getProjectRole(db, 7, { id: 1, role: 'user' }).role, 'editor');
    assert.deepEqual(authz.getProjectRole(db, 7, { id: 2, role: 'admin' }).role, 'editor');
});

test('getProjectRole grants accepted collaborator role only', () => {
    const accepted = fakeDb({ project_id: 7, invitee_id: 2, role: 'viewer', status: 'accepted' });
    const pending = fakeDb({ project_id: 7, invitee_id: 2, role: 'editor', status: 'pending' });

    assert.equal(authz.getProjectRole(accepted, 7, { id: 2, role: 'user' }).role, 'viewer');
    assert.equal(authz.getProjectRole(pending, 7, { id: 2, role: 'user' }), null);
});

test('getProjectRole rejects invalid, missing, and unrelated project access', () => {
    const db = fakeDb(null);

    assert.equal(authz.getProjectRole(db, 'abc', { id: 1, role: 'user' }), null);
    assert.equal(authz.getProjectRole(db, 99, { id: 1, role: 'user' }), null);
    assert.equal(authz.getProjectRole(db, 7, { id: 3, role: 'user' }), null);
});

test('canDeleteComment allows only author, project manager, or admin', () => {
    const project = { id: 7, user_id: 1 };
    const comment = { id: 10, project_id: 7, user_id: 2 };

    assert.equal(authz.canDeleteComment(project, comment, { id: 2, role: 'user' }), true);
    assert.equal(authz.canDeleteComment(project, comment, { id: 1, role: 'user' }), true);
    assert.equal(authz.canDeleteComment(project, comment, { id: 3, role: 'admin' }), true);
    assert.equal(authz.canDeleteComment(project, comment, { id: 3, role: 'user' }), false);
    assert.equal(authz.canDeleteComment(project, { ...comment, project_id: 8 }, { id: 2, role: 'user' }), false);
});
