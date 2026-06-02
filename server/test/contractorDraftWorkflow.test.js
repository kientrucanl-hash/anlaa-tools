const test = require('node:test');
const assert = require('node:assert/strict');
const workflow = require('../contractorDraftWorkflow');

const owner = { id: 2, role: 'user' };
const otherUser = { id: 3, role: 'user' };
const admin = { id: 1, role: 'admin' };

test('draft owner can read, edit, and submit editable drafts', () => {
    const draft = { id: 10, submitted_by: 2, status: 'draft' };

    assert.equal(workflow.canReadDraft(draft, owner), true);
    assert.equal(workflow.canEditDraft(draft, owner), true);
    assert.equal(workflow.canSubmitDraft(draft, owner), true);
});

test('other users cannot access someone else draft', () => {
    const draft = { id: 10, submitted_by: 2, status: 'draft' };

    assert.equal(workflow.canReadDraft(draft, otherUser), false);
    assert.equal(workflow.canEditDraft(draft, otherUser), false);
    assert.equal(workflow.canSubmitDraft(draft, otherUser), false);
});

test('pending and approved drafts are locked from edits', () => {
    const pending = { id: 10, submitted_by: 2, status: 'pending' };
    const approved = { id: 11, submitted_by: 2, status: 'approved' };

    assert.equal(workflow.canEditDraft(pending, owner), false);
    assert.equal(workflow.canSubmitDraft(pending, owner), false);
    assert.equal(workflow.canEditDraft(approved, admin), false);
});

test('admin can review only pending drafts', () => {
    const pending = { id: 10, submitted_by: 2, status: 'pending' };
    const rejected = { id: 11, submitted_by: 2, status: 'rejected' };

    assert.equal(workflow.canReviewDraft(pending, admin), true);
    assert.equal(workflow.canReviewDraft(pending, owner), false);
    assert.equal(workflow.canReviewDraft(rejected, admin), false);
});
