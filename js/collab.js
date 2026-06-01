/**
 * Collaboration module — Socket.io client, presence, share modal, comments
 * Loaded on estimate.html only (where collaborative editing happens)
 */

let collabSocket = null;
let collabProjectId = null;
let collabMyRole = null; // 'owner' | 'editor' | 'viewer'
let presenceMap = {};    // { userId: { username, color } }
let commentsData = [];   // cached comments
let cursorDebounce = null;
const PRESENCE_COLORS = ['#00f2fe','#4facfe','#f093fb','#f5af19','#43e97b','#fa709a','#fee140','#a8edea'];

// ─── Init ──────────────────────────────────────────────────────────────────
function initCollab(projectId, myRole) {
    collabProjectId = projectId;
    collabMyRole = myRole;
    if (!projectId) return;

    connectSocket(projectId);
    loadComments(projectId);
    renderPresenceBar();
    renderShareBtn();
    applyRoleRestrictions(myRole);
}

// ─── Socket ───────────────────────────────────────────────────────────────
function connectSocket(projectId) {
    const token = localStorage.getItem('anlaa_token');
    if (!token || typeof io === 'undefined') return;

    collabSocket = io({ auth: { token }, transports: ['websocket', 'polling'] });

    collabSocket.on('connect', () => {
        collabSocket.emit('project:join', { projectId });
    });

    collabSocket.on('presence:list', (list) => {
        list.forEach(u => addPresence(u.userId, u.username));
        renderPresenceBar();
    });
    collabSocket.on('presence:joined', ({ userId, username }) => {
        addPresence(userId, username);
        renderPresenceBar();
        showCollabToast(`👤 ${username} vừa mở dự án này`);
    });
    collabSocket.on('presence:left', ({ userId, username }) => {
        delete presenceMap[userId];
        removeRemoteCursor(userId);
        renderPresenceBar();
    });

    // Remote cursor movement
    collabSocket.on('cursor:update', ({ userId, username, itemId, rowIdx }) => {
        renderRemoteCursor(userId, username, itemId, rowIdx);
    });

    // Remote data changes
    collabSocket.on('project:remote_change', ({ userId, username, patch }) => {
        if (userId === getCurrentUserId()) return; // ignore own echoes
        showCollabToast(`✏️ ${username} vừa cập nhật dự án`);
        // Merge remote changes if no local unsaved edits
        if (patch.data && typeof updateRemoteProjectData === 'function') {
            updateRemoteProjectData(patch);
        }
    });

    // Collaboration events
    collabSocket.on('collab:invited', ({ projectName, invitedBy, role }) => {
        showInviteNotification(projectName, invitedBy, role);
    });
    collabSocket.on('collab:responded', ({ username, action }) => {
        showCollabToast(action === 'accept'
            ? `✅ ${username} đã chấp nhận lời mời`
            : `❌ ${username} đã từ chối lời mời`);
        refreshCollaborators();
    });
    collabSocket.on('collab:access_requested', (data) => {
        showAccessRequestBanner(data);
    });
    collabSocket.on('collab:access_approved', ({ projectName, role }) => {
        showCollabToast(`✅ Yêu cầu truy cập đã được duyệt! Quyền: ${role === 'editor' ? 'Chỉnh sửa' : 'Chỉ xem'}`);
        setTimeout(() => location.reload(), 1500);
    });
    collabSocket.on('collab:access_denied', ({ projectName }) => {
        showCollabToast(`❌ Yêu cầu truy cập dự án "${projectName}" bị từ chối`);
    });
    collabSocket.on('collab:role_changed', ({ newRole }) => {
        collabMyRole = newRole;
        applyRoleRestrictions(newRole);
        showCollabToast(`🔑 Quyền của bạn đã thay đổi: ${newRole === 'editor' ? 'Chỉnh sửa' : 'Chỉ xem'}`);
    });
    collabSocket.on('collab:removed', ({ userId }) => {
        if (userId === getCurrentUserId()) {
            showCollabToast('⚠️ Bạn đã bị xóa khỏi dự án này');
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        }
    });

    // Comment events
    collabSocket.on('comment:new', (comment) => {
        if (comment.user_id !== getCurrentUserId()) {
            commentsData.push(comment);
            renderCommentDots();
            showCollabToast(`💬 ${comment.username}: ${comment.content.slice(0, 40)}...`);
        }
    });
    collabSocket.on('comment:resolved', ({ id }) => {
        const c = commentsData.find(x => x.id === id);
        if (c) c.resolved = 1;
        renderCommentDots();
    });
    collabSocket.on('comment:deleted', ({ id }) => {
        commentsData = commentsData.filter(x => x.id !== id);
        renderCommentDots();
    });

    collabSocket.on('disconnect', () => {
        presenceMap = {};
        renderPresenceBar();
    });
}

function broadcastCursor(itemId, rowIdx) {
    if (!collabSocket || !collabProjectId) return;
    clearTimeout(cursorDebounce);
    cursorDebounce = setTimeout(() => {
        collabSocket.emit('cursor:move', { projectId: collabProjectId, itemId, rowIdx });
    }, 100);
}

function broadcastChange(patch) {
    if (!collabSocket || !collabProjectId) return;
    collabSocket.emit('project:changed', { projectId: collabProjectId, patch });
}

function getCurrentUserId() {
    try { return JSON.parse(localStorage.getItem('anlaa_user') || '{}').id; } catch { return null; }
}

// ─── Presence ─────────────────────────────────────────────────────────────
function addPresence(userId, username) {
    if (!presenceMap[userId]) {
        const colorIdx = Object.keys(presenceMap).length % PRESENCE_COLORS.length;
        presenceMap[userId] = { username, color: PRESENCE_COLORS[colorIdx] };
    }
}

function renderPresenceBar() {
    let bar = document.getElementById('collabPresenceBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'collabPresenceBar';
        bar.className = 'collab-presence-bar no-print';
        const topbar = document.querySelector('.est-topbar .est-topbar-right');
        if (topbar) topbar.insertBefore(bar, topbar.firstChild);
    }
    const entries = Object.entries(presenceMap);
    if (entries.length === 0) { bar.innerHTML = ''; return; }
    bar.innerHTML = entries.map(([uid, { username, color }]) =>
        `<span class="presence-avatar" style="background:${color}" title="${username} đang online">${username[0].toUpperCase()}</span>`
    ).join('');
}

function renderRemoteCursor(userId, username, itemId, rowIdx) {
    // Remove old cursor for this user
    removeRemoteCursor(userId);
    const user = presenceMap[userId];
    if (!user) return;
    const color = user.color;
    // Find target row in DOM
    const tr = document.querySelector(`#costTableBody tr.cost-detail-row[data-item-id="${itemId}"][data-row-idx="${rowIdx}"]`);
    if (!tr) return;
    const indicator = document.createElement('div');
    indicator.className = 'remote-cursor';
    indicator.id = `cursor-${userId}`;
    indicator.style.cssText = `border-color:${color};`;
    indicator.innerHTML = `<span class="remote-cursor-label" style="background:${color}">${username}</span>`;
    tr.style.position = 'relative';
    tr.appendChild(indicator);
    // Auto-remove after 5s of inactivity
    setTimeout(() => removeRemoteCursor(userId), 5000);
}

function removeRemoteCursor(userId) {
    document.getElementById(`cursor-${userId}`)?.remove();
}

// ─── Role restrictions ─────────────────────────────────────────────────────
function applyRoleRestrictions(role) {
    if (role !== 'viewer') return;
    // Disable all editable inputs and buttons
    document.querySelectorAll('#costTableBody input, #costTableBody select').forEach(el => {
        el.disabled = true;
    });
    ['btnAddCostItem', 'btnAddItem', 'btnSaveProject', 'btnSubmitProject'].forEach(id => {
        document.getElementById(id)?.setAttribute('disabled', true);
    });
    // Disable all calculate/add buttons in the left calc tabs
    document.querySelectorAll('.btn-add-item, .add-item-btn, button[onclick*="addItem"], button[onclick*="calculate"]').forEach(el => {
        el.disabled = true;
    });
    // Show read-only banner
    let banner = document.getElementById('viewerBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'viewerBanner';
        banner.className = 'collab-viewer-banner no-print';
        banner.innerHTML = `
            <i data-lucide="eye"></i>
            <span>Bạn đang xem dự án này ở chế độ <strong>Chỉ xem</strong>. Liên hệ chủ dự án để yêu cầu quyền chỉnh sửa.</span>
        `;
        document.querySelector('.est-main')?.insertBefore(banner, document.querySelector('.est-main').firstChild);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// ─── Share Modal ──────────────────────────────────────────────────────────
function renderShareBtn() {
    // Only owner/admin sees Share button
    const actionsBar = document.querySelector('.est-actions');
    if (!actionsBar) return;
    if (document.getElementById('btnShareProject')) return;

    const btn = document.createElement('button');
    btn.id = 'btnShareProject';
    btn.className = 'btn btn-secondary btn-sm no-print';
    btn.innerHTML = '<i data-lucide="users"></i> Chia sẻ';
    btn.title = 'Chia sẻ dự án với người dùng khác';
    btn.addEventListener('click', openShareModal);
    actionsBar.insertBefore(btn, actionsBar.firstChild);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function openShareModal() {
    let modal = document.getElementById('shareModal');
    if (!modal) {
        modal = createShareModal();
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    await refreshCollaborators();
}

function createShareModal() {
    const modal = document.createElement('div');
    modal.id = 'shareModal';
    modal.className = 'collab-modal-overlay';
    modal.innerHTML = `
        <div class="collab-modal">
            <div class="collab-modal-header">
                <h3><i data-lucide="users"></i> Chia sẻ dự án</h3>
                <button class="collab-modal-close" onclick="document.getElementById('shareModal').style.display='none'">&times;</button>
            </div>
            <div class="collab-modal-body">
                <div class="collab-invite-form">
                    <input type="text" id="inviteUsername" placeholder="Nhập tên đăng nhập..." class="collab-input">
                    <select id="inviteRole" class="collab-select">
                        <option value="editor">Chỉnh sửa</option>
                        <option value="viewer">Chỉ xem</option>
                    </select>
                    <button class="btn btn-primary btn-sm" onclick="sendInvite()">
                        <i data-lucide="send"></i> Mời
                    </button>
                </div>
                <div id="inviteError" class="collab-error" style="display:none"></div>
                <div id="accessRequestsList" class="collab-requests-section" style="display:none">
                    <h4 class="collab-section-title">Yêu cầu truy cập đang chờ</h4>
                    <div id="accessRequestsBody"></div>
                </div>
                <h4 class="collab-section-title" style="margin-top:16px">Thành viên hiện tại</h4>
                <div id="collaboratorsList" class="collab-members-list">
                    <div class="collab-loading">Đang tải...</div>
                </div>
            </div>
        </div>
    `;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
    if (typeof lucide !== 'undefined') setTimeout(() => lucide.createIcons(), 50);
    return modal;
}

async function sendInvite() {
    const username = document.getElementById('inviteUsername')?.value?.trim();
    const role = document.getElementById('inviteRole')?.value;
    const errEl = document.getElementById('inviteError');
    if (!username) { showInviteError('Vui lòng nhập tên đăng nhập'); return; }

    const token = localStorage.getItem('anlaa_token');
    try {
        const res = await fetch(`/api/collaboration/${collabProjectId}/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ username, role }),
        });
        const data = await res.json();
        if (!res.ok) { showInviteError(data.error || 'Lỗi khi mời'); return; }
        if (errEl) errEl.style.display = 'none';
        document.getElementById('inviteUsername').value = '';
        showCollabToast(`✅ Đã gửi lời mời đến ${username}`);
        await refreshCollaborators();
    } catch { showInviteError('Lỗi kết nối'); }
}

function showInviteError(msg) {
    const el = document.getElementById('inviteError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}

async function refreshCollaborators() {
    if (!collabProjectId) return;
    const token = localStorage.getItem('anlaa_token');
    try {
        const res = await fetch(`/api/collaboration/${collabProjectId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const { collaborators, accessRequests } = await res.json();
        renderCollaboratorsList(collaborators);
        renderAccessRequests(accessRequests);
    } catch {}
}

function renderCollaboratorsList(list) {
    const el = document.getElementById('collaboratorsList');
    if (!el) return;
    if (!list.length) { el.innerHTML = '<p class="collab-empty">Chưa có thành viên nào được mời.</p>'; return; }

    el.innerHTML = list.map(c => `
        <div class="collab-member-row">
            <div class="collab-member-info">
                <span class="collab-avatar">${c.invitee_username[0].toUpperCase()}</span>
                <div>
                    <span class="collab-name">${c.invitee_username}</span>
                    <span class="collab-status-badge status-${c.status}">${statusLabel(c.status)}</span>
                </div>
            </div>
            <div class="collab-member-actions">
                <select class="collab-select-sm" onchange="changeRole(${c.invitee_id}, this.value)">
                    <option value="editor" ${c.role==='editor'?'selected':''}>Chỉnh sửa</option>
                    <option value="viewer" ${c.role==='viewer'?'selected':''}>Chỉ xem</option>
                </select>
                <button class="btn-remove-member" onclick="removeMember(${c.invitee_id}, '${c.invitee_username}')" title="Xóa thành viên">×</button>
            </div>
        </div>
    `).join('');
}

function renderAccessRequests(list) {
    const section = document.getElementById('accessRequestsList');
    const body = document.getElementById('accessRequestsBody');
    if (!section || !body) return;
    if (!list.length) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    body.innerHTML = list.map(r => `
        <div class="collab-request-row">
            <div class="collab-member-info">
                <span class="collab-avatar request-avatar">${r.requester_username[0].toUpperCase()}</span>
                <div>
                    <span class="collab-name">${r.requester_username}</span>
                    <span class="collab-request-meta">yêu cầu quyền ${r.role_requested === 'editor' ? 'chỉnh sửa' : 'xem'}${r.message ? ` — "${r.message}"` : ''}</span>
                </div>
            </div>
            <div class="collab-member-actions">
                <button class="btn btn-xs btn-primary" onclick="respondRequest(${r.id}, ${r.requester_id}, 'approve', 'editor')">✓ Cho sửa</button>
                <button class="btn btn-xs btn-secondary" onclick="respondRequest(${r.id}, ${r.requester_id}, 'approve', 'viewer')">👁 Cho xem</button>
                <button class="btn btn-xs btn-danger" onclick="respondRequest(${r.id}, ${r.requester_id}, 'deny', null)">× Từ chối</button>
            </div>
        </div>
    `).join('');
}

function statusLabel(s) {
    return { pending: '⏳ Chờ xác nhận', accepted: '✅ Đã tham gia', denied: '❌ Từ chối' }[s] || s;
}

async function changeRole(inviteeId, role) {
    const token = localStorage.getItem('anlaa_token');
    await fetch(`/api/collaboration/${collabProjectId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ inviteeId, role }),
    });
    showCollabToast('✅ Đã cập nhật quyền');
}

async function removeMember(inviteeId, username) {
    if (!confirm(`Xóa ${username} khỏi dự án?`)) return;
    const token = localStorage.getItem('anlaa_token');
    await fetch(`/api/collaboration/${collabProjectId}/member/${inviteeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    showCollabToast(`🗑 Đã xóa ${username}`);
    await refreshCollaborators();
}

async function respondRequest(requestId, requesterId, action, role) {
    const token = localStorage.getItem('anlaa_token');
    await fetch(`/api/collaboration/${collabProjectId}/request-access/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action, role: role || 'viewer' }),
    });
    showCollabToast(action === 'approve' ? '✅ Đã cấp quyền' : '❌ Đã từ chối');
    await refreshCollaborators();
}

// ─── Request Access Flow ──────────────────────────────────────────────────
function showRequestAccessBanner(projectId) {
    let banner = document.getElementById('requestAccessBanner');
    if (banner) return;
    banner = document.createElement('div');
    banner.id = 'requestAccessBanner';
    banner.className = 'collab-request-access-banner no-print';
    banner.innerHTML = `
        <div>
            <strong>Bạn không có quyền truy cập dự án này.</strong>
            <span>Gửi yêu cầu để chủ dự án xét duyệt.</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
            <select id="reqAccessRole" class="collab-select-sm">
                <option value="editor">Xin quyền chỉnh sửa</option>
                <option value="viewer">Xin quyền xem</option>
            </select>
            <input type="text" id="reqAccessMsg" placeholder="Ghi chú (tùy chọn)" class="collab-input" style="max-width:200px">
            <button class="btn btn-primary btn-sm" onclick="sendAccessRequest(${projectId})">Gửi yêu cầu</button>
        </div>
    `;
    document.body.insertBefore(banner, document.body.firstChild);
}

async function sendAccessRequest(projectId) {
    const role = document.getElementById('reqAccessRole')?.value || 'viewer';
    const message = document.getElementById('reqAccessMsg')?.value || '';
    const token = localStorage.getItem('anlaa_token');
    try {
        const res = await fetch(`/api/collaboration/${projectId}/request-access`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ role, message }),
        });
        const data = await res.json();
        const banner = document.getElementById('requestAccessBanner');
        if (banner) banner.innerHTML = `<span>✅ ${data.message || 'Đã gửi yêu cầu. Chờ chủ dự án xét duyệt.'}</span>`;
    } catch { showCollabToast('Lỗi kết nối'); }
}

function showAccessRequestBanner(data) {
    // Show notification badge on Share button
    const btn = document.getElementById('btnShareProject');
    if (btn && !btn.querySelector('.request-badge')) {
        const badge = document.createElement('span');
        badge.className = 'request-badge';
        badge.textContent = '!';
        btn.appendChild(badge);
    }
    showCollabToast(`🔔 ${data.requesterUsername} yêu cầu quyền ${data.role === 'editor' ? 'chỉnh sửa' : 'xem'} — <a href="#" onclick="openShareModal();return false">Xét duyệt</a>`, 8000);
    refreshCollaborators();
}

function showInviteNotification(projectName, invitedBy, role) {
    let notif = document.getElementById('collabInviteNotif');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'collabInviteNotif';
        notif.className = 'collab-invite-notif';
        document.body.appendChild(notif);
    }
    notif.innerHTML = `
        <div class="collab-invite-notif-content">
            <strong>📩 Lời mời cộng tác</strong>
            <p><strong>${invitedBy}</strong> mời bạn vào dự án <strong>"${projectName}"</strong> với quyền <strong>${role === 'editor' ? 'Chỉnh sửa' : 'Chỉ xem'}</strong>.</p>
            <div style="display:flex;gap:8px;margin-top:8px">
                <button class="btn btn-primary btn-sm" onclick="respondInvite(${collabProjectId},'accept')">✅ Chấp nhận</button>
                <button class="btn btn-secondary btn-sm" onclick="respondInvite(${collabProjectId},'deny')">❌ Từ chối</button>
            </div>
        </div>
    `;
    notif.style.display = 'block';
}

async function respondInvite(projectId, action) {
    const token = localStorage.getItem('anlaa_token');
    await fetch(`/api/collaboration/${projectId}/invite/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action }),
    });
    document.getElementById('collabInviteNotif')?.remove();
    if (action === 'accept') {
        showCollabToast('✅ Đã chấp nhận lời mời');
        setTimeout(() => location.reload(), 1000);
    }
}

// ─── Comments Panel ───────────────────────────────────────────────────────
async function loadComments(projectId) {
    const token = localStorage.getItem('anlaa_token');
    try {
        const res = await fetch(`/api/collaboration/${projectId}/comments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        commentsData = await res.json();
        renderCommentDots();
        renderCommentsPanel();
    } catch {}
}

function renderCommentDots() {
    // Remove all existing dots
    document.querySelectorAll('.comment-dot').forEach(d => d.remove());
    // Group unresolved comments by rowRef
    const byRow = {};
    commentsData.filter(c => !c.resolved && c.row_ref).forEach(c => {
        if (!byRow[c.row_ref]) byRow[c.row_ref] = [];
        byRow[c.row_ref].push(c);
    });
    Object.entries(byRow).forEach(([rowRef, comments]) => {
        const [itemId, rowIdx] = rowRef.split(':');
        const tr = document.querySelector(`#costTableBody tr.cost-detail-row[data-item-id="${itemId}"][data-row-idx="${rowIdx}"]`);
        if (!tr) return;
        const dot = document.createElement('div');
        dot.className = 'comment-dot';
        dot.title = `${comments.length} comment`;
        dot.innerHTML = `<span>${comments.length}</span>`;
        dot.addEventListener('click', () => openCommentPanel(rowRef));
        tr.style.position = 'relative';
        tr.appendChild(dot);
    });
}

function openCommentPanel(rowRef) {
    let panel = document.getElementById('commentPanel');
    if (!panel) {
        panel = createCommentPanel();
        document.body.appendChild(panel);
    }
    panel.dataset.rowRef = rowRef || '';
    panel.style.display = 'flex';
    renderCommentThread(rowRef);
}

function createCommentPanel() {
    const panel = document.createElement('div');
    panel.id = 'commentPanel';
    panel.className = 'collab-comment-panel';
    panel.innerHTML = `
        <div class="comment-panel-header">
            <h4><i data-lucide="message-square"></i> Comments</h4>
            <button onclick="document.getElementById('commentPanel').style.display='none'">&times;</button>
        </div>
        <div id="commentThread" class="comment-thread"></div>
        <div class="comment-input-area">
            <textarea id="commentInput" placeholder="Viết comment..." rows="2" class="collab-textarea"></textarea>
            <button class="btn btn-primary btn-sm" onclick="postComment()">Gửi</button>
        </div>
    `;
    if (typeof lucide !== 'undefined') setTimeout(() => lucide.createIcons(), 50);
    return panel;
}

function renderCommentThread(rowRef) {
    const el = document.getElementById('commentThread');
    if (!el) return;
    const filtered = rowRef
        ? commentsData.filter(c => c.row_ref === rowRef)
        : commentsData;
    if (!filtered.length) {
        el.innerHTML = '<p class="collab-empty">Chưa có comment nào.</p>';
        return;
    }
    el.innerHTML = filtered.map(c => `
        <div class="comment-item ${c.resolved ? 'comment-resolved' : ''}">
            <div class="comment-meta">
                <span class="comment-author">${c.username}</span>
                <span class="comment-time">${formatCommentTime(c.created_at)}</span>
                ${!c.resolved && collabMyRole === 'owner'
                    ? `<button class="comment-resolve-btn" onclick="resolveComment(${c.id})" title="Đánh dấu hoàn thành">✓</button>`
                    : (c.resolved ? '<span class="resolved-badge">✓ Đã xong</span>' : '')}
            </div>
            <p class="comment-content">${escapeCommentHtml(c.content)}</p>
        </div>
    `).join('');
    el.scrollTop = el.scrollHeight;
}

async function postComment() {
    const input = document.getElementById('commentInput');
    const panel = document.getElementById('commentPanel');
    const content = input?.value?.trim();
    if (!content) return;
    const rowRef = panel?.dataset.rowRef || null;
    const token = localStorage.getItem('anlaa_token');
    try {
        const res = await fetch(`/api/collaboration/${collabProjectId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ rowRef, content }),
        });
        if (!res.ok) return;
        const comment = await res.json();
        commentsData.push(comment);
        input.value = '';
        renderCommentThread(rowRef);
        renderCommentDots();
    } catch {}
}

async function resolveComment(id) {
    const token = localStorage.getItem('anlaa_token');
    await fetch(`/api/collaboration/${collabProjectId}/comments/${id}/resolve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const c = commentsData.find(x => x.id === id);
    if (c) c.resolved = 1;
    const panel = document.getElementById('commentPanel');
    renderCommentThread(panel?.dataset.rowRef);
    renderCommentDots();
}

function formatCommentTime(ts) {
    try {
        const d = new Date(ts);
        return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
}

function escapeCommentHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Add "💬 Comment" button to each row via wireCostTableEvents hook
function addCommentButtonToRow(tr, itemId, rowIdx) {
    if (tr.querySelector('.btn-comment-row')) return;
    const btn = document.createElement('button');
    btn.className = 'btn-comment-row no-print';
    btn.title = 'Thêm comment';
    btn.innerHTML = '💬';
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openCommentPanel(`${itemId}:${rowIdx}`);
    });
    const lastTd = tr.querySelector('td:last-child');
    if (lastTd) lastTd.insertBefore(btn, lastTd.firstChild);
}

// ─── Toast ─────────────────────────────────────────────────────────────────
function showCollabToast(html, duration = 3500) {
    let toastEl = document.getElementById('collabToast');
    if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.id = 'collabToast';
        toastEl.className = 'collab-toast';
        document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = html;
    toastEl.classList.add('show');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => toastEl.classList.remove('show'), duration);
}

// ─── Public API ───────────────────────────────────────────────────────────
window.collabInit = initCollab;
window.openShareModal = openShareModal;
window.sendInvite = sendInvite;
window.changeRole = changeRole;
window.removeMember = removeMember;
window.respondRequest = respondRequest;
window.respondInvite = respondInvite;
window.postComment = postComment;
window.resolveComment = resolveComment;
window.openCommentPanel = openCommentPanel;
window.showRequestAccessBanner = showRequestAccessBanner;
window.sendAccessRequest = sendAccessRequest;
window.broadcastCursor = broadcastCursor;
window.broadcastChange = broadcastChange;
window.addCommentButtonToRow = addCommentButtonToRow;
window.renderCommentDots = renderCommentDots;
