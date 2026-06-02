/**
 * Admin Dashboard Controller for MECALC
 */

const STATUS_LABELS = {
    draft: { text: 'Draft', cls: 'badge-draft' },
    pending: { text: 'Chờ duyệt', cls: 'badge-pending' },
    approved: { text: 'Đã duyệt', cls: 'badge-approved' },
    rejected: { text: 'Từ chối', cls: 'badge-rejected' }
};

let allProjects = [];
let allContractorDrafts = [];
let currentProjectId = null;

function formatDate(iso) {
    if (!iso) return '—';
    return iso.replace('T', ' ').slice(0, 16);
}

function statusBadgeHTML(status) {
    const s = STATUS_LABELS[status] || { text: status, cls: '' };
    return `<span class="status-badge ${s.cls}">${s.text}</span>`;
}

const CONTRACTOR_DRAFT_STATUS = {
    draft:    { text: 'Nháp',      cls: 'badge-draft' },
    pending:  { text: 'Chờ duyệt', cls: 'badge-pending' },
    approved: { text: 'Đã duyệt',  cls: 'badge-approved' },
    rejected: { text: 'Từ chối',   cls: 'badge-rejected' },
};

function contractorDraftBadgeHTML(status) {
    const s = CONTRACTOR_DRAFT_STATUS[status] || { text: status, cls: '' };
    return `<span class="status-badge ${s.cls}">${s.text}</span>`;
}

// ---- Toast notification (replaces alert()) ----
function showToast(message, type = 'success') {
    const toast = document.getElementById('adminToast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.borderColor = type === 'danger' ? '#ff5252' : 'var(--border-focus)';
    toast.style.boxShadow = type === 'danger'
        ? '0 10px 30px rgba(255,82,82,0.2)'
        : '0 10px 30px rgba(0,242,254,0.2)';
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ---- Projects view ----
async function loadProjects() {
    try {
        allProjects = await API.getProjects();
        renderProjectsTable();
    } catch (err) {
        document.getElementById('projectsBody').innerHTML =
            `<tr><td colspan="7" class="table-empty" style="color:var(--color-error);">${err.message}</td></tr>`;
    }
}

function renderProjectsTable() {
    const filter = document.getElementById('filterStatus').value;
    const filtered = filter ? allProjects.filter(p => p.status === filter) : allProjects;
    const tbody = document.getElementById('projectsBody');

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Không có project nào</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(p.name)}</strong></td>
            <td>${escapeHtml(p.address || '—')}</td>
            <td>${escapeHtml(p.owner_name || '—')}</td>
            <td>${formatDate(p.updated_at)}</td>
            <td>${statusBadgeHTML(p.status)}</td>
            <td class="table-actions">
                <button class="btn btn-secondary btn-xs" onclick="openProjectModal(${p.id})">
                    <i data-lucide="eye"></i> Xem
                </button>
                <button class="btn btn-danger btn-xs" onclick="openDeleteModal(${p.id}, '${escapeHtml(p.name)}')">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        </tr>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ---- Users view ----
let currentAdminId = null;

async function loadUsers() {
    try {
        const me = JSON.parse(localStorage.getItem('anlaa_user') || 'null');
        currentAdminId = me?.id;
        const users = await API.getUsers();
        renderUsersTable(users);
    } catch (err) {
        document.getElementById('usersBody').innerHTML =
            `<tr><td colspan="5" class="table-empty" style="color:var(--color-error);">${err.message}</td></tr>`;
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersBody');
    if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Không có người dùng nào</td></tr>`;
        return;
    }
    tbody.innerHTML = users.map((u, i) => {
        const isSelf = u.id === currentAdminId;
        const roleToggleLabel = u.role === 'admin' ? 'Hạ xuống User' : 'Nâng lên Admin';
        return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${escapeHtml(u.username)}</strong>${isSelf ? ' <span style="font-size:0.75rem;color:var(--text-secondary)">(bạn)</span>' : ''}</td>
                <td><span class="status-badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span></td>
                <td style="text-align:center;">${u.max_sessions ?? 2}</td>
                <td>${formatDate(u.created_at)}</td>
                <td class="table-actions">
                    <button class="btn btn-secondary btn-xs" onclick="openResetPasswordModal(${u.id}, '${escapeHtml(u.username)}')">
                        <i data-lucide="key"></i> Reset PW
                    </button>
                    <button class="btn btn-secondary btn-xs" onclick="openSessionModal(${u.id}, '${escapeHtml(u.username)}', ${u.max_sessions ?? 2})" title="Quản lý phiên đăng nhập">
                        <i data-lucide="monitor"></i>
                    </button>
                    ${!isSelf ? `
                    <button class="btn btn-secondary btn-xs" onclick="toggleUserRole(${u.id}, '${u.role === 'admin' ? 'user' : 'admin'}', '${escapeHtml(u.username)}')" title="${roleToggleLabel}">
                        <i data-lucide="shield"></i>
                    </button>
                    <button class="btn btn-danger btn-xs" onclick="openDeleteUserModal(${u.id}, '${escapeHtml(u.username)}')">
                        <i data-lucide="trash-2"></i>
                    </button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ---- Add User Modal ----
function openAddUserModal() {
    document.getElementById('newUsername').value = '';
    document.getElementById('newUserPassword').value = '';
    document.getElementById('newUserRole').value = 'user';
    document.getElementById('addUserError').style.display = 'none';
    document.getElementById('addUserModal').style.display = 'flex';
    document.getElementById('newUsername').focus();
}

function closeAddUserModal() {
    document.getElementById('addUserModal').style.display = 'none';
}

async function submitAddUser(e) {
    e.preventDefault();
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    const errEl = document.getElementById('addUserError');
    errEl.style.display = 'none';

    try {
        document.getElementById('btnConfirmAddUser').disabled = true;
        await API.createUser(username, password, role);
        closeAddUserModal();
        await loadUsers();
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        document.getElementById('btnConfirmAddUser').disabled = false;
    }
}

// ---- Reset Password Modal ----
let resetTargetId = null;

function openResetPasswordModal(id, username) {
    resetTargetId = id;
    document.getElementById('resetUsername').textContent = username;
    document.getElementById('resetNewPassword').value = '';
    document.getElementById('resetPasswordError').style.display = 'none';
    document.getElementById('resetPasswordModal').style.display = 'flex';
    document.getElementById('resetNewPassword').focus();
}

function closeResetPasswordModal() {
    resetTargetId = null;
    document.getElementById('resetPasswordModal').style.display = 'none';
}

async function confirmResetPassword() {
    const newPassword = document.getElementById('resetNewPassword').value;
    const errEl = document.getElementById('resetPasswordError');
    errEl.style.display = 'none';

    if (!newPassword || newPassword.length < 6) {
        errEl.textContent = 'Mật khẩu tối thiểu 6 ký tự';
        errEl.style.display = 'block';
        return;
    }
    try {
        document.getElementById('btnConfirmResetPassword').disabled = true;
        await API.resetUserPassword(resetTargetId, newPassword);
        closeResetPasswordModal();
        showToast('Đặt lại mật khẩu thành công');
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        document.getElementById('btnConfirmResetPassword').disabled = false;
    }
}

// ---- Toggle Role ----
async function toggleUserRole(id, newRole, username) {
    const label = newRole === 'admin' ? 'nâng lên Admin' : 'hạ xuống User';
    if (!confirm(`Bạn có chắc muốn ${label} cho "${username}"?`)) return;
    try {
        await API.changeUserRole(id, newRole);
        await loadUsers();
        showToast(`Đã ${label} thành công`);
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'danger');
    }
}

// ---- Delete User Modal ----
let deleteUserTargetId = null;

function openDeleteUserModal(id, username) {
    deleteUserTargetId = id;
    document.getElementById('deleteUserName').textContent = username;
    document.getElementById('deleteUserModal').style.display = 'flex';
}

function closeDeleteUserModal() {
    deleteUserTargetId = null;
    document.getElementById('deleteUserModal').style.display = 'none';
}

async function confirmDeleteUser() {
    if (!deleteUserTargetId) return;
    try {
        await API.deleteUser(deleteUserTargetId);
        closeDeleteUserModal();
        await loadUsers();
        showToast('Đã xóa người dùng');
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'danger');
    }
}

// ---- Project Modal ----
async function openProjectModal(id) {
    currentProjectId = id;
    const modal = document.getElementById('projectModal');
    modal.style.display = 'flex';

    try {
        const project = await API.getProject(id);
        document.getElementById('modalProjectName').textContent = project.name;
        document.getElementById('modalProjectMeta').textContent =
            `${project.address || ''}  •  ${project.owner_name}  •  ${formatDate(project.updated_at)}`;

        const statusInfo = STATUS_LABELS[project.status] || { text: project.status, cls: '' };
        const badge = document.getElementById('modalStatusBadge');
        badge.textContent = statusInfo.text;
        badge.className = `status-badge ${statusInfo.cls}`;

        // Admin note
        const noteBox = document.getElementById('adminNoteBox');
        if (project.status === 'rejected' && project.admin_note) {
            noteBox.style.display = 'block';
            document.getElementById('adminNoteText').textContent = project.admin_note;
        } else {
            noteBox.style.display = 'none';
        }

        // BOQ items
        const items = Array.isArray(project.data) ? project.data : [];
        const tbody = document.getElementById('modalBOQBody');
        if (!items.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Chưa có hạng mục nào</td></tr>`;
        } else {
            tbody.innerHTML = items.map((item, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${escapeHtml(item.name || '—')}</td>
                    <td>${escapeHtml(item.type || '—')}</td>
                    <td>${typeof item.quantity === 'number' ? item.quantity.toFixed(2) : '—'}</td>
                    <td>${escapeHtml(item.unit || '—')}</td>
                    <td>${typeof item.totalCost === 'number' ? formatCurrency(item.totalCost) : '—'}</td>
                </tr>
            `).join('');
        }

        // Show action buttons only for pending
        const actionsDiv = document.getElementById('modalActions');
        const actionBtns = document.getElementById('modalActionBtns');
        const rejectForm = document.getElementById('rejectForm');
        if (project.status === 'pending') {
            actionsDiv.style.display = 'flex';
            actionBtns.style.display = 'flex';
            rejectForm.style.display = 'none';
        } else {
            actionsDiv.style.display = 'none';
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        document.getElementById('modalBOQBody').innerHTML =
            `<tr><td colspan="6" class="table-empty" style="color:var(--color-error);">${err.message}</td></tr>`;
    }
}

function closeProjectModal() {
    document.getElementById('projectModal').style.display = 'none';
    currentProjectId = null;
}

// ---- Approve / Reject ----
async function approveProject() {
    if (!currentProjectId) return;
    try {
        await API.approveProject(currentProjectId);
        closeProjectModal();
        await loadProjects();
        showToast('Đã phê duyệt project');
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'danger');
    }
}

function showRejectForm() {
    document.getElementById('modalActionBtns').style.display = 'none';
    document.getElementById('rejectForm').style.display = 'block';
    document.getElementById('rejectNote').focus();
}

async function confirmReject() {
    const note = document.getElementById('rejectNote').value.trim();
    if (!note) {
        showToast('Vui lòng nhập lý do từ chối', 'danger');
        return;
    }
    try {
        await API.rejectProject(currentProjectId, note);
        closeProjectModal();
        await loadProjects();
        showToast('Đã từ chối project');
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'danger');
    }
}

// ---- Delete ----
let deleteTargetId = null;

function openDeleteModal(id, name) {
    deleteTargetId = id;
    document.getElementById('deleteProjectName').textContent = name;
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('deleteModal').style.display = 'none';
}

async function confirmDelete() {
    if (!deleteTargetId) return;
    try {
        await API.deleteProject(deleteTargetId);
        closeDeleteModal();
        await loadProjects();
        showToast('Đã xóa project');
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'danger');
    }
}

// ---- Contractor Drafts view ----
async function loadContractorDrafts() {
    const tbody = document.getElementById('contractorDraftsBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Đang tải...</td></tr>`;
    try {
        allContractorDrafts = await API.getContractorDrafts();
        renderContractorDraftsTable();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" class="table-empty" style="color:var(--color-error);">${err.message}</td></tr>`;
    }
}

function renderContractorDraftsTable() {
    const tbody = document.getElementById('contractorDraftsBody');
    if (!tbody) return;

    const filter = document.getElementById('filterContractorDraftStatus')?.value || '';
    const filtered = filter ? allContractorDrafts.filter(d => d.status === filter) : allContractorDrafts;

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Không có nháp nhà thầu nào</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((d, i) => {
        const payload = d.payload || {};
        const isPending = d.status === 'pending';
        return `<tr>
            <td>${i + 1}</td>
            <td>
                <strong>${escapeHtml(payload.name || '(chưa có tên)')}</strong>
                ${payload.phone ? `<div style="font-size:0.78rem;color:var(--text-secondary);">${escapeHtml(payload.phone)}</div>` : ''}
            </td>
            <td>${d.contractor_id ? `Sửa #${d.contractor_id}` : 'Thêm mới'}</td>
            <td>${escapeHtml(d.submitted_by_username || '—')}</td>
            <td>${formatDate(d.updated_at)}</td>
            <td>${contractorDraftBadgeHTML(d.status)}</td>
            <td style="max-width:220px;color:var(--text-secondary);">${escapeHtml(d.admin_note || '—')}</td>
            <td class="table-actions">
                ${isPending ? `
                    <button class="btn btn-success btn-xs" onclick="approveContractorDraft(${d.id})">
                        <i data-lucide="check-circle"></i> Duyệt
                    </button>
                    <button class="btn btn-danger btn-xs" onclick="rejectContractorDraft(${d.id})">
                        <i data-lucide="x-circle"></i> Từ chối
                    </button>
                ` : '<span style="font-size:0.78rem;color:var(--text-secondary);">Đã xử lý</span>'}
            </td>
        </tr>`;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function approveContractorDraft(id) {
    const note = prompt('Ghi chú phê duyệt (nếu có):', '') || '';
    try {
        await API.approveContractorDraft(id, note);
        await loadContractorDrafts();
        showToast('Đã phê duyệt nháp nhà thầu');
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'danger');
    }
}

async function rejectContractorDraft(id) {
    const note = prompt('Lý do từ chối:', '') || '';
    try {
        await API.rejectContractorDraft(id, note);
        await loadContractorDrafts();
        showToast('Đã từ chối nháp nhà thầu');
    } catch (err) {
        showToast('Lỗi: ' + err.message, 'danger');
    }
}

// ---- Utilities ----
function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatCurrency(n) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
    // Nav switching
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.dataset.view;
            document.getElementById(`view-${view}`).classList.add('active');
            if (view === 'users') loadUsers();
            if (view === 'quotations') loadQuotations();
            if (view === 'contractor-drafts') loadContractorDrafts();
        });
    });

    // Sidebar toggles
    const toggleSidebar = () => document.getElementById('appSidebar')?.classList.toggle('open');
    document.getElementById('sidebarToggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebarToggle2')?.addEventListener('click', toggleSidebar);

    // Users: add / refresh
    document.getElementById('btnAddUser').addEventListener('click', openAddUserModal);
    document.getElementById('btnRefreshUsers').addEventListener('click', loadUsers);

    // Add user form submit
    document.getElementById('addUserForm').addEventListener('submit', submitAddUser);

    // Close modals on backdrop click
    document.getElementById('addUserModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeAddUserModal();
    });
    document.getElementById('resetPasswordModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeResetPasswordModal();
    });
    document.getElementById('deleteUserModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeDeleteUserModal();
    });

    // Reset password confirm
    document.getElementById('btnConfirmResetPassword').addEventListener('click', confirmResetPassword);

    // Delete user confirm
    document.getElementById('btnConfirmDeleteUser').addEventListener('click', confirmDeleteUser);
    document.getElementById('btnCancelDeleteUser').addEventListener('click', closeDeleteUserModal);

    // Session modal
    document.getElementById('btnSaveMaxSessions').addEventListener('click', saveMaxSessions);
    document.getElementById('btnRevokeAll').addEventListener('click', revokeAllSessions);
    document.getElementById('sessionModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeSessionModal();
    });

    // Quotations tab
    document.getElementById('filterQStatus').addEventListener('change', renderQuotationsTable);
    document.getElementById('btnRefreshQuotations').addEventListener('click', loadQuotations);
    document.getElementById('btnQApprove').addEventListener('click', approveQuotation);
    document.getElementById('btnQReject').addEventListener('click', () => {
        document.getElementById('qaActionBtns').style.display = 'none';
        document.getElementById('qaRejectForm').style.display = 'block';
        document.getElementById('qaRejectNote').value = '';
        document.getElementById('qaRejectNote').focus();
    });
    document.getElementById('btnQConfirmReject').addEventListener('click', confirmRejectQuotation);
    document.getElementById('quotationAdminModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeQuotationAdminModal();
    });

    // Contractor drafts tab
    document.getElementById('filterContractorDraftStatus')?.addEventListener('change', renderContractorDraftsTable);
    document.getElementById('btnRefreshContractorDrafts')?.addEventListener('click', loadContractorDrafts);

    // Filter
    document.getElementById('filterStatus').addEventListener('change', renderProjectsTable);
    document.getElementById('btnRefresh').addEventListener('click', loadProjects);

    // Load projects on initial page load (default active tab)
    loadProjects();

    // Modal close
    document.getElementById('modalClose').addEventListener('click', closeProjectModal);
    document.getElementById('projectModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeProjectModal();
    });

    // Approve/Reject
    document.getElementById('btnApprove').addEventListener('click', approveProject);
    document.getElementById('btnReject').addEventListener('click', showRejectForm);
    document.getElementById('btnConfirmReject').addEventListener('click', confirmReject);
    document.getElementById('btnCancelReject').addEventListener('click', () => {
        document.getElementById('rejectForm').style.display = 'none';
        document.getElementById('modalActionBtns').style.display = 'flex';
    });

    // Delete modal
    document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);
    document.getElementById('btnCancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('deleteModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeDeleteModal();
    });
});

// ---- Quotations view (Admin) ----
let allQuotations = [];
let currentQuotationId = null;

const Q_STATUS = {
    draft:    { text: 'Nháp',       cls: 'badge-draft' },
    pending:  { text: 'Chờ duyệt', cls: 'badge-pending' },
    approved: { text: 'Đã duyệt',  cls: 'badge-approved' },
    rejected: { text: 'Từ chối',   cls: 'badge-rejected' },
};

async function loadQuotations() {
    try {
        allQuotations = await API.getQuotations();
        renderQuotationsTable();
    } catch (err) {
        document.getElementById('quotationsBody').innerHTML =
            `<tr><td colspan="8" class="table-empty" style="color:var(--color-error);">${err.message}</td></tr>`;
    }
}

function renderQuotationsTable() {
    const filter = document.getElementById('filterQStatus').value;
    const filtered = filter ? allQuotations.filter(q => q.status === filter) : allQuotations;
    const tbody = document.getElementById('quotationsBody');
    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Không có bảng báo giá nào</td></tr>`;
        return;
    }
    tbody.innerHTML = filtered.map((q, i) => {
        const s = Q_STATUS[q.status] || { text: q.status, cls: '' };
        const ntcNames = (q.contractors || []).filter(Boolean).join(', ') || '—';
        return `<tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(q.name)}</strong></td>
            <td>${escapeHtml(q.owner_name || '—')}</td>
            <td style="font-size:0.82rem;">${escapeHtml(ntcNames)}</td>
            <td>${q.rows.length}</td>
            <td>${formatDate(q.updated_at)}</td>
            <td><span class="status-badge ${s.cls}">${s.text}</span></td>
            <td class="table-actions">
                <button class="btn btn-secondary btn-xs" onclick="openQuotationAdminModal(${q.id})">
                    <i data-lucide="eye"></i> Xem
                </button>
            </td>
        </tr>`;
    }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function openQuotationAdminModal(id) {
    currentQuotationId = id;
    document.getElementById('quotationAdminModal').style.display = 'flex';
    document.getElementById('qaTableWrap').innerHTML = '<p style="color:var(--text-secondary);padding:1rem;">Đang tải...</p>';
    try {
        const q = await API.getQuotation(id);
        document.getElementById('qaModalName').textContent = q.name;
        document.getElementById('qaModalMeta').textContent =
            `${q.owner_name || ''}  •  ${formatDate(q.updated_at)}`;
        const s = Q_STATUS[q.status] || { text: q.status, cls: '' };
        const badge = document.getElementById('qaModalStatus');
        badge.textContent = s.text;
        badge.className = `status-badge ${s.cls}`;

        const noteBox = document.getElementById('qaAdminNote');
        if (q.status === 'rejected' && q.admin_note) {
            noteBox.style.display = 'block';
            document.getElementById('qaAdminNoteText').textContent = q.admin_note;
        } else {
            noteBox.style.display = 'none';
        }

        // Build read-only table
        const ntc = q.contractors || ['', '', ''];
        const rows = q.rows || [];
        const thead = `<tr>
            <th style="width:36px">#</th>
            <th>Hạng mục</th>
            <th style="width:60px">Đơn vị</th>
            ${[0,1,2].map(i => `<th style="text-align:center">${escapeHtml(ntc[i] || `NTC ${i+1}`)}<br><small>Đơn giá</small></th><th>Ghi chú</th>`).join('')}
        </tr>`;
        const tbody = rows.length ? rows.map((row, ri) => {
            const valid = row.prices.map((p,i) => ({p,i})).filter(x => x.p > 0);
            const minP = valid.length ? Math.min(...valid.map(x=>x.p)) : null;
            const minI = valid.find(x=>x.p===minP)?.i ?? -1;
            const cells = [0,1,2].map(ci => {
                const isMin = minI===ci && valid.length>1;
                return `<td style="text-align:right;font-variant-numeric:tabular-nums;${isMin?'background:rgba(76,175,80,0.12);color:#81c784;font-weight:600':''}">${row.prices[ci] != null ? new Intl.NumberFormat('vi-VN').format(row.prices[ci]) : '—'}</td>
                        <td style="color:var(--text-secondary);font-size:0.82rem;">${escapeHtml(row.notes[ci] || '')}</td>`;
            }).join('');
            return `<tr><td style="text-align:center;color:var(--text-secondary)">${ri+1}</td><td>${escapeHtml(row.item)}</td><td>${escapeHtml(row.unit)}</td>${cells}</tr>`;
        }).join('') : `<tr><td colspan="10" class="table-empty">Chưa có hạng mục</td></tr>`;

        document.getElementById('qaTableWrap').innerHTML =
            `<table class="admin-table" style="min-width:700px;font-size:0.84rem;"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;

        const actionsDiv = document.getElementById('qaActions');
        const actionBtns = document.getElementById('qaActionBtns');
        const rejectForm = document.getElementById('qaRejectForm');
        if (q.status === 'pending') {
            actionsDiv.style.display = 'flex';
            actionBtns.style.display = 'flex';
            rejectForm.style.display = 'none';
        } else {
            actionsDiv.style.display = 'none';
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        document.getElementById('qaTableWrap').innerHTML =
            `<p style="color:var(--color-error);padding:1rem;">${err.message}</p>`;
    }
}

function closeQuotationAdminModal() {
    document.getElementById('quotationAdminModal').style.display = 'none';
    currentQuotationId = null;
}

async function approveQuotation() {
    if (!currentQuotationId) return;
    try {
        await API.approveQuotation(currentQuotationId);
        closeQuotationAdminModal();
        await loadQuotations();
        showToast('Đã phê duyệt báo giá');
    } catch (err) { showToast('Lỗi: ' + err.message, 'danger'); }
}

async function confirmRejectQuotation() {
    const note = document.getElementById('qaRejectNote').value.trim();
    if (!note) { showToast('Vui lòng nhập lý do từ chối', 'danger'); return; }
    try {
        await API.rejectQuotation(currentQuotationId, note);
        closeQuotationAdminModal();
        await loadQuotations();
        showToast('Đã từ chối báo giá');
    } catch (err) { showToast('Lỗi: ' + err.message, 'danger'); }
}

// ---- Session Modal ----
let sessionTargetId = null;

async function openSessionModal(userId, username, maxSessions) {
    sessionTargetId = userId;
    document.getElementById('sessionModalUsername').textContent = username;
    document.getElementById('maxSessionsSelect').value = maxSessions;
    document.getElementById('sessionModal').style.display = 'flex';
    await refreshSessionList();
}

function closeSessionModal() {
    sessionTargetId = null;
    document.getElementById('sessionModal').style.display = 'none';
}

async function refreshSessionList() {
    const tbody = document.getElementById('sessionList');
    tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Đang tải...</td></tr>`;
    try {
        const sessions = await API.getUserSessions(sessionTargetId);
        if (!sessions.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Không có phiên nào đang hoạt động</td></tr>`;
            return;
        }
        tbody.innerHTML = sessions.map(s => {
            const ua = (s.user_agent || '').substring(0, 50) || '—';
            return `<tr>
                <td>${escapeHtml(s.ip || '—')}</td>
                <td title="${escapeHtml(s.user_agent || '')}" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(ua)}</td>
                <td>${formatDate(s.last_seen)}</td>
                <td><button class="btn btn-danger btn-xs" onclick="revokeSession(${s.id})"><i data-lucide="x"></i></button></td>
            </tr>`;
        }).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="table-empty" style="color:var(--color-error);">${err.message}</td></tr>`;
    }
}

async function revokeSession(sessionId) {
    try {
        await API.revokeSession(sessionId);
        await refreshSessionList();
        await loadUsers();
        showToast('Đã thu hồi phiên đăng nhập');
    } catch (err) { showToast('Lỗi: ' + err.message, 'danger'); }
}

async function saveMaxSessions() {
    const max = parseInt(document.getElementById('maxSessionsSelect').value, 10);
    try {
        await API.setMaxSessions(sessionTargetId, max);
        await refreshSessionList();
        await loadUsers();
        showToast('Đã lưu giới hạn thiết bị');
    } catch (err) { showToast('Lỗi: ' + err.message, 'danger'); }
}

async function revokeAllSessions() {
    if (!confirm('Kick tất cả thiết bị của người dùng này ra khỏi hệ thống?')) return;
    try {
        await API.revokeAllSessions(sessionTargetId);
        await refreshSessionList();
        await loadUsers();
        showToast('Đã kick tất cả thiết bị');
    } catch (err) { showToast('Lỗi: ' + err.message, 'danger'); }
}

// Called from auth.js after admin login
async function loadProjectsFromAPI() {
    await loadProjects();
}
