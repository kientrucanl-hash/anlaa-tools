/**
 * Báo giá Nhà thầu — Quotation editor for MECALC
 */

const STATUS_LABELS = {
    draft:    { text: 'Nháp',        cls: 'badge-draft' },
    pending:  { text: 'Chờ duyệt',  cls: 'badge-pending' },
    approved: { text: 'Đã duyệt',   cls: 'badge-approved' },
    rejected: { text: 'Từ chối',    cls: 'badge-rejected' },
};

let currentQuotation = null;  // object being edited
let currentUser = null;

function fmtDate(iso) {
    return iso ? iso.replace('T', ' ').slice(0, 16) : '—';
}

function fmtPrice(v) {
    if (v === null || v === undefined || v === '') return '—';
    return new Intl.NumberFormat('vi-VN').format(v);
}

function escHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── LIST VIEW ─────────────────────────────────────────────────────────────

async function loadList() {
    const tbody = document.getElementById('quotationListBody');
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Đang tải...</td></tr>`;
    try {
        const list = await API.getQuotations();
        renderList(list);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty" style="color:var(--color-error);">${err.message}</td></tr>`;
    }
}

function renderList(list) {
    const tbody = document.getElementById('quotationListBody');
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Chưa có bảng báo giá nào. Nhấn "Tạo bảng mới" để bắt đầu.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map((q, i) => {
        const s = STATUS_LABELS[q.status] || { text: q.status, cls: '' };
        const ntcNames = (q.contractors || []).filter(Boolean).join(', ') || '—';
        const canEdit = ['draft', 'rejected'].includes(q.status);
        const canDelete = canEdit || currentUser?.role === 'admin';
        return `<tr>
            <td>${i + 1}</td>
            <td><strong>${escHtml(q.name)}</strong>${q.owner_name ? `<br><small style="color:var(--text-secondary)">${escHtml(q.owner_name)}</small>` : ''}</td>
            <td style="font-size:0.82rem;">${escHtml(ntcNames)}</td>
            <td>${q.rows.length} hạng mục</td>
            <td>${fmtDate(q.updated_at)}</td>
            <td><span class="status-badge ${s.cls}">${s.text}</span></td>
            <td class="table-actions">
                <button class="btn btn-secondary btn-xs" onclick="openEditor(${q.id})">
                    <i data-lucide="${canEdit ? 'pencil' : 'eye'}"></i> ${canEdit ? 'Sửa' : 'Xem'}
                </button>
                ${canDelete ? `<button class="btn btn-danger btn-xs" onclick="openDeleteModal(${q.id}, '${escHtml(q.name)}')">
                    <i data-lucide="trash-2"></i>
                </button>` : ''}
            </td>
        </tr>`;
    }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─── EDITOR VIEW ───────────────────────────────────────────────────────────

async function openEditor(id) {
    try {
        const q = id ? await API.getQuotation(id) : newEmptyQuotation();
        currentQuotation = JSON.parse(JSON.stringify(q)); // deep copy
        renderEditor();
        showView('editor');
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

function newEmptyQuotation() {
    return { id: null, name: '', contractors: ['', '', ''], rows: [], status: 'draft', admin_note: null };
}

function renderEditor() {
    const q = currentQuotation;
    const isReadonly = !['draft', 'rejected'].includes(q.status) && currentUser?.role !== 'admin';

    document.getElementById('qName').value = q.name;
    document.getElementById('qName').readOnly = isReadonly;

    const s = STATUS_LABELS[q.status] || { text: q.status, cls: '' };
    const badge = document.getElementById('qStatusBadge');
    badge.textContent = s.text;
    badge.className = `status-badge ${s.cls}`;

    // Admin note
    const noteBox = document.getElementById('qAdminNote');
    if (q.status === 'rejected' && q.admin_note) {
        noteBox.style.display = 'block';
        document.getElementById('qAdminNoteText').textContent = q.admin_note;
    } else {
        noteBox.style.display = 'none';
    }

    // Contractor inputs
    for (let i = 0; i < 3; i++) {
        const inp = document.getElementById(`ntc${i}`);
        inp.value = q.contractors[i] || '';
        inp.readOnly = isReadonly;
        // Sync table header
        const th = document.getElementById(`qth${i}`);
        if (th) th.innerHTML = `${escHtml(q.contractors[i] || `Nhà thầu ${i + 1}`)}<br><span class="qth-sub">Đơn giá</span>`;
        const thn = document.getElementById(`qthn${i}`);
        if (thn) thn.textContent = 'Ghi chú';
    }

    // Action buttons
    const canEdit = ['draft', 'rejected'].includes(q.status);
    document.getElementById('btnSaveDraft').style.display = canEdit ? '' : 'none';
    document.getElementById('btnSubmitQuotation').style.display = canEdit ? '' : 'none';
    document.getElementById('btnAddRow').style.display = canEdit ? '' : 'none';

    renderRows(isReadonly);
}

function renderRows(isReadonly) {
    const rows = currentQuotation.rows;
    const tbody = document.getElementById('qDataBody');

    if (!rows.length && isReadonly) {
        tbody.innerHTML = `<tr><td colspan="10" class="table-empty">Chưa có hạng mục nào</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row, ri) => {
        // Find min price index (ignore null/0)
        const validPrices = row.prices.map((p, i) => ({ p, i })).filter(x => x.p > 0);
        const minPrice = validPrices.length ? Math.min(...validPrices.map(x => x.p)) : null;
        const minIdx = validPrices.find(x => x.p === minPrice)?.i ?? -1;

        const priceInputs = [0, 1, 2].map(ci => {
            const isMin = minIdx === ci && validPrices.length > 1;
            const val = row.prices[ci] ?? '';
            if (isReadonly) {
                return `<td class="qcell-price${isMin ? ' q-cheapest' : ''}">${fmtPrice(row.prices[ci])}</td>
                        <td class="qcell-note">${escHtml(row.notes[ci] || '')}</td>`;
            }
            return `<td class="qcell-price${isMin ? ' q-cheapest' : ''}">
                        <input type="number" class="q-price-input" data-row="${ri}" data-col="${ci}"
                            value="${val}" placeholder="0" min="0" step="1000">
                    </td>
                    <td class="qcell-note">
                        <input type="text" class="q-note-input" data-row="${ri}" data-col="${ci}"
                            value="${escHtml(row.notes[ci] || '')}" placeholder="Ghi chú...">
                    </td>`;
        }).join('');

        const deleteBtn = !isReadonly
            ? `<td class="qcell-action no-print">
                <button class="btn btn-danger btn-xs" onclick="deleteRow(${ri})">
                    <i data-lucide="x"></i>
                </button>
               </td>`
            : '<td></td>';

        const itemInput = isReadonly
            ? `<td class="qcell-item">${escHtml(row.item)}</td>`
            : `<td class="qcell-item"><input type="text" class="q-item-input" data-row="${ri}" value="${escHtml(row.item)}" placeholder="Tên hạng mục..."></td>`;

        const unitInput = isReadonly
            ? `<td class="qcell-unit">${escHtml(row.unit)}</td>`
            : `<td class="qcell-unit"><input type="text" class="q-unit-input" data-row="${ri}" value="${escHtml(row.unit)}" placeholder="m², m..."></td>`;

        return `<tr data-row="${ri}">
            <td class="qcell-stt">${ri + 1}</td>
            ${itemInput}
            ${unitInput}
            ${priceInputs}
            ${deleteBtn}
        </tr>`;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
    attachCellListeners();
}

function attachCellListeners() {
    document.querySelectorAll('.q-item-input').forEach(inp => {
        inp.addEventListener('input', e => {
            currentQuotation.rows[+e.target.dataset.row].item = e.target.value;
        });
    });
    document.querySelectorAll('.q-unit-input').forEach(inp => {
        inp.addEventListener('input', e => {
            currentQuotation.rows[+e.target.dataset.row].unit = e.target.value;
        });
    });
    document.querySelectorAll('.q-price-input').forEach(inp => {
        inp.addEventListener('input', e => {
            const ri = +e.target.dataset.row;
            const ci = +e.target.dataset.col;
            const val = e.target.value === '' ? null : parseFloat(e.target.value);
            currentQuotation.rows[ri].prices[ci] = isNaN(val) ? null : val;
            // Re-render just the rows to update cheapest highlight
            renderRows(false);
        });
    });
    document.querySelectorAll('.q-note-input').forEach(inp => {
        inp.addEventListener('input', e => {
            currentQuotation.rows[+e.target.dataset.row].notes[+e.target.dataset.col] = e.target.value;
        });
    });
}

function syncContractorHeaders() {
    for (let i = 0; i < 3; i++) {
        const val = document.getElementById(`ntc${i}`).value.trim();
        currentQuotation.contractors[i] = val;
        const th = document.getElementById(`qth${i}`);
        if (th) th.innerHTML = `${escHtml(val || `Nhà thầu ${i + 1}`)}<br><span class="qth-sub">Đơn giá</span>`;
    }
}

function addRow() {
    currentQuotation.rows.push({ item: '', unit: '', prices: [null, null, null], notes: ['', '', ''] });
    renderRows(false);
    // Focus newly added item input
    const inputs = document.querySelectorAll('.q-item-input');
    if (inputs.length) inputs[inputs.length - 1].focus();
}

function deleteRow(ri) {
    currentQuotation.rows.splice(ri, 1);
    renderRows(false);
}

function collectEditorData() {
    syncContractorHeaders();
    currentQuotation.name = document.getElementById('qName').value.trim();
    return {
        name: currentQuotation.name,
        contractors: currentQuotation.contractors,
        rows: currentQuotation.rows,
    };
}

async function saveDraft() {
    const data = collectEditorData();
    if (!data.name) { alert('Vui lòng nhập tên bảng báo giá'); document.getElementById('qName').focus(); return; }
    try {
        document.getElementById('btnSaveDraft').disabled = true;
        if (currentQuotation.id) {
            currentQuotation = await API.updateQuotation(currentQuotation.id, data);
        } else {
            currentQuotation = await API.createQuotation(data.name, data.contractors, data.rows);
        }
        renderEditor();
        showToast('Đã lưu nháp');
    } catch (err) {
        alert('Lỗi lưu: ' + err.message);
    } finally {
        document.getElementById('btnSaveDraft').disabled = false;
    }
}

async function submitQuotation() {
    const data = collectEditorData();
    if (!data.name) { alert('Vui lòng nhập tên bảng báo giá'); return; }
    if (!confirm('Gửi bảng báo giá này để admin phê duyệt?')) return;

    try {
        document.getElementById('btnSubmitQuotation').disabled = true;
        // Save latest data first
        if (currentQuotation.id) {
            await API.updateQuotation(currentQuotation.id, data);
        } else {
            currentQuotation = await API.createQuotation(data.name, data.contractors, data.rows);
        }
        currentQuotation = await API.submitQuotation(currentQuotation.id);
        renderEditor();
        showToast('Đã gửi duyệt thành công');
    } catch (err) {
        alert('Lỗi: ' + err.message);
    } finally {
        document.getElementById('btnSubmitQuotation').disabled = false;
    }
}

// ─── DELETE MODAL ──────────────────────────────────────────────────────────

let deleteTargetId = null;

function openDeleteModal(id, name) {
    deleteTargetId = id;
    document.getElementById('deleteQuotationName').textContent = name;
    document.getElementById('deleteQuotationModal').style.display = 'flex';
}

function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('deleteQuotationModal').style.display = 'none';
}

async function confirmDelete() {
    if (!deleteTargetId) return;
    try {
        await API.deleteQuotation(deleteTargetId);
        closeDeleteModal();
        await loadList();
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

// ─── VIEW SWITCHING ────────────────────────────────────────────────────────

function showView(v) {
    document.getElementById('viewList').style.display = v === 'list' ? '' : 'none';
    document.getElementById('viewEditor').style.display = v === 'editor' ? '' : 'none';
}

// ─── TOAST ─────────────────────────────────────────────────────────────────

function showToast(msg) {
    let t = document.getElementById('qToast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'qToast';
        t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--bg-card);border:1px solid var(--border-glass);padding:10px 18px;border-radius:8px;color:var(--text-primary);font-size:0.88rem;z-index:9999;transition:opacity .3s;';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2500);
}

// ─── INIT ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    currentUser = JSON.parse(localStorage.getItem('anlaa_user') || 'null');

    document.getElementById('btnNewQuotation').addEventListener('click', () => openEditor(null));
    document.getElementById('btnRefreshList').addEventListener('click', loadList);
    document.getElementById('btnBackToList').addEventListener('click', () => { showView('list'); loadList(); });
    document.getElementById('btnSaveDraft').addEventListener('click', saveDraft);
    document.getElementById('btnSubmitQuotation').addEventListener('click', submitQuotation);
    document.getElementById('btnAddRow').addEventListener('click', addRow);

    // Contractor name inputs → sync headers live
    [0, 1, 2].forEach(i => {
        document.getElementById(`ntc${i}`).addEventListener('input', syncContractorHeaders);
    });

    // Delete modal
    document.getElementById('btnConfirmDeleteQuotation').addEventListener('click', confirmDelete);
    document.getElementById('btnCancelDeleteQuotation').addEventListener('click', closeDeleteModal);
    document.getElementById('deleteQuotationModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeDeleteModal();
    });

    showView('list');
    loadList();
});
