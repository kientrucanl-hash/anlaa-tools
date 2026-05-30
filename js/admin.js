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
let currentProjectId = null;

function formatDate(iso) {
    if (!iso) return '—';
    return iso.replace('T', ' ').slice(0, 16);
}

function statusBadgeHTML(status) {
    const s = STATUS_LABELS[status] || { text: status, cls: '' };
    return `<span class="status-badge ${s.cls}">${s.text}</span>`;
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
async function loadUsers() {
    try {
        const users = await API.getUsers();
        const tbody = document.getElementById('usersBody');
        tbody.innerHTML = users.map((u, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${escapeHtml(u.username)}</strong></td>
                <td><span class="status-badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span></td>
                <td>${formatDate(u.created_at)}</td>
            </tr>
        `).join('');
    } catch (err) {
        document.getElementById('usersBody').innerHTML =
            `<tr><td colspan="4" class="table-empty" style="color:var(--color-error);">${err.message}</td></tr>`;
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
    } catch (err) {
        alert('Lỗi: ' + err.message);
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
        alert('Vui lòng nhập lý do từ chối');
        return;
    }
    try {
        await API.rejectProject(currentProjectId, note);
        closeProjectModal();
        await loadProjects();
    } catch (err) {
        alert('Lỗi: ' + err.message);
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
    } catch (err) {
        alert('Lỗi: ' + err.message);
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
        });
    });

    // Filter
    document.getElementById('filterStatus').addEventListener('change', renderProjectsTable);
    document.getElementById('btnRefresh').addEventListener('click', loadProjects);

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

// Called from auth.js after admin login
async function loadProjectsFromAPI() {
    await loadProjects();
}
