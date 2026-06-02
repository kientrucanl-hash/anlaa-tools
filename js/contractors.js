/**
 * Contractors page — CRUD, filter, sort, detail panel
 */

const SPECIALTY_LABELS = {
    masonry:    "Xây gạch",    plastering: "Trát tường",  tiling:     "Ốp lát",
    painting:   "Sơn bả",      screed:     "Cán nền",     concrete:   "Bê tông",
    formwork:   "Ván khuôn",   electrical: "Điện",        plumbing:   "Nước",
    waterproof: "Chống thấm",  ceiling:    "Trần",        door:       "Cửa",
    window:     "Cửa sổ",      railing:    "Lan can",     stone:      "Đá ốp",
    excavation: "Đào đất",     general:    "Tổng hợp",
};

const RATING_LABELS = ["", "Kém", "Yếu", "Trung bình", "Tốt", "Xuất sắc"];

let allContractors = [];
let allDrafts = [];
let currentEditId = null;
let currentDraftId = null;
let sortField = "name";
let sortDir = "asc";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtVND(v) {
    if (!v || v === 0) return "—";
    if (v >= 1e9) return (v / 1e9).toFixed(1) + " tỷ";
    if (v >= 1e6) return (v / 1e6).toFixed(0) + " triệu";
    return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " đ";
}
function escHtml(s) {
    return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function stars(n) {
    return Array.from({length:5}, (_,i) =>
        `<span class="${i < n ? "" : "empty"}">★</span>`
    ).join("");
}
function typeBadge(t) {
    const m = { company:"Công ty", team:"Tổ đội", individual:"Cá nhân" };
    return `<span class="type-badge type-${t}">${m[t]||t}</span>`;
}
function statusBadge(s) {
    const m = { active:"Hoạt động", inactive:"Tạm dừng", blacklist:"Blacklist" };
    return `<span class="status-badge status-${s}">${m[s]||s}</span>`;
}
function specTags(specialty) {
    if (!specialty) return "";
    try {
        const arr = typeof specialty === "string" ? JSON.parse(specialty) : specialty;
        return arr.map(k => `<span class="spec-tag">${SPECIALTY_LABELS[k]||k}</span>`).join("");
    } catch { return ""; }
}
function toast(msg) {
    const el = document.getElementById("toastNotification");
    if (el) { el.textContent = msg; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2500); }
}
function currentUser() {
    try { return JSON.parse(localStorage.getItem("anlaa_user") || "{}"); } catch { return {}; }
}
function isAdminUser() {
    return currentUser().role === "admin";
}

// ─── API calls ────────────────────────────────────────────────────────────────
async function fetchContractors() {
    const res = await fetch("/api/contractors", {
        headers: { Authorization: "Bearer " + localStorage.getItem("anlaa_token") }
    });
    if (!res.ok) throw new Error("Không thể tải danh sách nhà thầu");
    return res.json();
}
async function fetchStats() {
    const res = await fetch("/api/contractors/stats", {
        headers: { Authorization: "Bearer " + localStorage.getItem("anlaa_token") }
    });
    if (!res.ok) return null;
    return res.json();
}
async function saveContractorAPI(data, id) {
    const method = id ? "PUT" : "POST";
    const url = id ? `/api/contractors/${id}` : "/api/contractors";
    const res = await fetch(url, {
        method, headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("anlaa_token")
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Lỗi lưu nhà thầu");
    }
    return res.json();
}
async function deleteContractorAPI(id) {
    const res = await fetch(`/api/contractors/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + localStorage.getItem("anlaa_token") }
    });
    if (!res.ok) throw new Error("Không thể xóa");
}

// ─── Load & Render ────────────────────────────────────────────────────────────
async function fetchDrafts() {
    const res = await fetch("/api/contractors/drafts", {
        headers: { Authorization: "Bearer " + localStorage.getItem("anlaa_token") }
    });
    if (!res.ok) throw new Error("Khong the tai danh sach nhap");
    return res.json();
}
async function saveDraftAPI(data, draftId = null) {
    const method = draftId ? "PUT" : "POST";
    const url = draftId ? `/api/contractors/drafts/${draftId}` : "/api/contractors/drafts";
    const res = await fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("anlaa_token")
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Khong the luu nhap");
    }
    return res.json();
}
async function submitDraftAPI(id) {
    const res = await fetch(`/api/contractors/drafts/${id}/submit`, {
        method: "PUT",
        headers: { Authorization: "Bearer " + localStorage.getItem("anlaa_token") }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Khong the gui duyet");
    }
    return res.json();
}
async function reviewDraftAPI(id, action, admin_note = "") {
    const res = await fetch(`/api/contractors/drafts/${id}/${action}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("anlaa_token")
        },
        body: JSON.stringify({ admin_note })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Khong the xu ly nhap");
    }
    return res.json();
}
async function deleteDraftAPI(id) {
    const res = await fetch(`/api/contractors/drafts/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + localStorage.getItem("anlaa_token") }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Khong the xoa nhap");
    }
}

async function loadAll() {
    try {
        allContractors = await fetchContractors();
        renderTable();
    } catch (e) {
        document.getElementById("contractorBody").innerHTML =
            `<tr><td colspan="10" class="empty-boq-msg">Lỗi tải dữ liệu: ${e.message}</td></tr>`;
    }
    try {
        const stats = await fetchStats();
        if (stats) renderStats(stats);
    } catch {}
    try {
        allDrafts = await fetchDrafts();
        renderDrafts();
    } catch (e) {
        allDrafts = [];
        renderDrafts(e.message);
    }
}

function renderStats(s) {
    const fmt = v => v != null ? v : "—";
    document.getElementById("statActive").textContent = fmt(s.active);
    document.getElementById("statInactive").textContent = fmt(s.inactive);
    document.getElementById("statBlacklist").textContent = fmt(s.blacklist);
    document.getElementById("statCompany").textContent = fmt(s.companies);
    document.getElementById("statTeam").textContent = fmt(s.teams);
    document.getElementById("statRating").textContent = s.avg_rating ? s.avg_rating.toFixed(1) + "★" : "—";
    document.getElementById("statValue").textContent = s.total_value ? fmtVND(s.total_value) : "—";
}

function getFiltered() {
    const search = document.getElementById("searchInput")?.value.toLowerCase() || "";
    const status = document.getElementById("filterStatus")?.value || "";
    const type   = document.getElementById("filterType")?.value   || "";
    const spec   = document.getElementById("filterSpecialty")?.value || "";

    return allContractors.filter(c => {
        if (status && c.status !== status) return false;
        if (type   && c.type   !== type)   return false;
        if (spec) {
            try {
                const arr = typeof c.specialty === "string" ? JSON.parse(c.specialty || "[]") : (c.specialty || []);
                if (!arr.includes(spec)) return false;
            } catch { return false; }
        }
        if (search) {
            const hay = [c.name, c.contact_name, c.phone, c.phone2, c.district, c.city, c.specialty, c.work_scope]
                .map(x => (x || "").toLowerCase()).join(" ");
            if (!hay.includes(search)) return false;
        }
        return true;
    });
}

function getSorted(list) {
    return [...list].sort((a, b) => {
        let av = a[sortField] ?? "", bv = b[sortField] ?? "";
        if (typeof av === "number") return sortDir === "asc" ? av - bv : bv - av;
        return sortDir === "asc"
            ? String(av).localeCompare(String(bv), "vi")
            : String(bv).localeCompare(String(av), "vi");
    });
}

function draftStatusBadge(status) {
    const map = {
        draft: "Nhap",
        pending: "Cho duyet",
        approved: "Da duyet",
        rejected: "Tu choi"
    };
    return `<span class="status-badge status-${status === "approved" ? "active" : status === "rejected" ? "blacklist" : "inactive"}">${map[status] || status}</span>`;
}

function ensureDraftPanel() {
    let panel = document.getElementById("contractorDraftPanel");
    if (panel) return panel;

    const tableWrap = document.querySelector(".ctx-table-wrap");
    if (!tableWrap || !tableWrap.parentNode) return null;

    panel = document.createElement("div");
    panel.id = "contractorDraftPanel";
    panel.style.margin = "12px 0";
    panel.style.padding = "12px";
    panel.style.border = "1px solid rgba(148,163,184,.18)";
    panel.style.borderRadius = "8px";
    panel.style.background = "rgba(15,23,42,.35)";
    tableWrap.parentNode.insertBefore(panel, tableWrap);
    return panel;
}

function renderDrafts(error = "") {
    const panel = ensureDraftPanel();
    if (!panel) return;

    const title = isAdminUser() ? "Nhap nha thau can xu ly" : "Nhap nha thau cua toi";
    const visibleDrafts = isAdminUser()
        ? allDrafts
        : allDrafts.filter(d => d.status !== "approved" || d.reviewed_at);

    if (error) {
        panel.innerHTML = `<div style="font-size:12px;color:#fca5a5;">${escHtml(error)}</div>`;
        return;
    }

    if (!visibleDrafts.length) {
        panel.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                <strong style="font-size:13px;color:var(--text-secondary);">${title}</strong>
                <span style="font-size:12px;color:var(--text-muted);">Chua co nhap</span>
            </div>`;
        return;
    }

    panel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;">
            <strong style="font-size:13px;color:var(--text-secondary);">${title}</strong>
            <span style="font-size:12px;color:var(--text-muted);">${visibleDrafts.length} ban ghi</span>
        </div>
        <div style="overflow:auto;">
            <table class="ctx-table" style="min-width:760px;">
                <thead>
                    <tr>
                        <th>Ten nha thau</th>
                        <th>Trang thai</th>
                        <th>Nguoi gui</th>
                        <th>Cap nhat</th>
                        <th>Ghi chu admin</th>
                        <th class="no-print"></th>
                    </tr>
                </thead>
                <tbody>
                    ${visibleDrafts.map(d => `
                        <tr>
                            <td>
                                <div class="td-name">${escHtml(d.payload?.name || "(chua co ten)")}</div>
                                ${d.contractor_id ? `<div style="font-size:11px;color:var(--text-muted);">Sua nha thau #${d.contractor_id}</div>` : `<div style="font-size:11px;color:var(--text-muted);">Them moi</div>`}
                            </td>
                            <td>${draftStatusBadge(d.status)}</td>
                            <td style="font-size:12px;">${escHtml(d.submitted_by_username || "")}</td>
                            <td style="font-size:12px;color:var(--text-muted);">${escHtml(d.updated_at || "")}</td>
                            <td style="font-size:12px;color:var(--text-muted);">${escHtml(d.admin_note || "")}</td>
                            <td class="no-print" style="text-align:right;white-space:nowrap;">
                                ${["draft","rejected"].includes(d.status) ? `<button class="btn btn-xs btn-secondary draft-edit" data-id="${d.id}">Sua</button>` : ""}
                                ${["draft","rejected"].includes(d.status) ? `<button class="btn btn-xs btn-gradient draft-submit" data-id="${d.id}">Gui duyet</button>` : ""}
                                ${isAdminUser() && d.status === "pending" ? `<button class="btn btn-xs btn-gradient draft-approve" data-id="${d.id}">Duyet</button><button class="btn btn-xs btn-danger draft-reject" data-id="${d.id}">Tu choi</button>` : ""}
                                ${["draft","rejected"].includes(d.status) ? `<button class="btn btn-xs btn-danger draft-delete" data-id="${d.id}">Xoa</button>` : ""}
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>`;

    panel.querySelectorAll(".draft-edit").forEach(btn => btn.addEventListener("click", () => openDraftModal(parseInt(btn.dataset.id))));
    panel.querySelectorAll(".draft-submit").forEach(btn => btn.addEventListener("click", async () => {
        try {
            await submitDraftAPI(parseInt(btn.dataset.id));
            allDrafts = await fetchDrafts();
            renderDrafts();
            toast("Da gui nhap cho admin duyet");
        } catch (e) { toast("Loi: " + e.message); }
    }));
    panel.querySelectorAll(".draft-approve").forEach(btn => btn.addEventListener("click", async () => {
        const note = prompt("Ghi chu phe duyet (neu co):", "") || "";
        try {
            await reviewDraftAPI(parseInt(btn.dataset.id), "approve", note);
            await loadAll();
            toast("Da duyet va luu vao danh ba nha thau");
        } catch (e) { toast("Loi: " + e.message); }
    }));
    panel.querySelectorAll(".draft-reject").forEach(btn => btn.addEventListener("click", async () => {
        const note = prompt("Ly do tu choi:", "") || "";
        try {
            await reviewDraftAPI(parseInt(btn.dataset.id), "reject", note);
            allDrafts = await fetchDrafts();
            renderDrafts();
            toast("Da tu choi nhap");
        } catch (e) { toast("Loi: " + e.message); }
    }));
    panel.querySelectorAll(".draft-delete").forEach(btn => btn.addEventListener("click", async () => {
        if (!confirm("Xoa ban nhap nay?")) return;
        try {
            await deleteDraftAPI(parseInt(btn.dataset.id));
            allDrafts = await fetchDrafts();
            renderDrafts();
            toast("Da xoa nhap");
        } catch (e) { toast("Loi: " + e.message); }
    }));
}

function renderTable() {
    const tbody = document.getElementById("contractorBody");
    const filtered = getSorted(getFiltered());
    const countEl = document.getElementById("resultCount");
    if (countEl) countEl.textContent = `${filtered.length} / ${allContractors.length} nhà thầu`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10">
            <div class="ctx-empty">
                <div><i data-lucide="hard-hat" style="width:40px;height:40px;opacity:.2;"></i></div>
                <p>Chưa có nhà thầu phù hợp. <a href="#" id="resetFilters">Xóa bộ lọc</a></p>
            </div>
        </td></tr>`;
        if (typeof lucide !== "undefined") lucide.createIcons();
        document.getElementById("resetFilters")?.addEventListener("click", e => {
            e.preventDefault();
            document.getElementById("searchInput").value = "";
            document.getElementById("filterStatus").value = "";
            document.getElementById("filterType").value = "";
            document.getElementById("filterSpecialty").value = "";
            renderTable();
        });
        return;
    }

    tbody.innerHTML = filtered.map(c => `
        <tr data-id="${c.id}">
            <td>
                <div class="td-name">${escHtml(c.name)}</div>
                ${c.work_scope ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${escHtml(c.work_scope)}</div>` : ""}
            </td>
            <td>${typeBadge(c.type)}</td>
            <td class="td-contact">
                <div class="td-phone">${c.contact_name ? `<strong>${escHtml(c.contact_name)}</strong><br>` : ""}
                ${c.phone ? `<a href="tel:${escHtml(c.phone)}">${escHtml(c.phone)}</a>` : "—"}</div>
                ${c.email ? `<div style="font-size:11px;color:#60a5fa;">${escHtml(c.email)}</div>` : ""}
            </td>
            <td class="td-specs">${specTags(c.specialty) || '<span style="color:var(--text-muted);font-size:11px;">—</span>'}</td>
            <td style="font-size:12px;color:var(--text-secondary);">${[c.district, c.city].filter(Boolean).join(", ") || "—"}</td>
            <td class="text-center"><span class="stars">${stars(c.rating)}</span></td>
            <td class="text-right" style="font-size:12px;">${c.project_count || 0}</td>
            <td class="text-right" style="font-size:12px;">${fmtVND(c.total_value)}</td>
            <td class="text-center">${statusBadge(c.status)}</td>
            <td class="no-print" style="text-align:center;">
                <button class="btn btn-xs btn-secondary btn-edit" data-id="${c.id}" title="Sửa">✏</button>
            </td>
        </tr>
    `).join("");

    // Row click → detail panel
    tbody.querySelectorAll("tr[data-id]").forEach(tr => {
        tr.addEventListener("click", e => {
            if (e.target.closest(".btn-edit")) return;
            openDetail(parseInt(tr.dataset.id));
        });
    });
    tbody.querySelectorAll(".btn-edit").forEach(btn => {
        btn.addEventListener("click", () => openModal(parseInt(btn.dataset.id)));
    });
    if (typeof lucide !== "undefined") lucide.createIcons();
}

// ─── Sort headers ─────────────────────────────────────────────────────────────
function initSortHeaders() {
    document.querySelectorAll(".ctx-table th[data-sort]").forEach(th => {
        th.addEventListener("click", () => {
            const f = th.dataset.sort;
            if (sortField === f) sortDir = sortDir === "asc" ? "desc" : "asc";
            else { sortField = f; sortDir = "asc"; }
            document.querySelectorAll(".ctx-table th").forEach(h => h.classList.remove("sorted-asc","sorted-desc"));
            th.classList.add(sortDir === "asc" ? "sorted-asc" : "sorted-desc");
            renderTable();
        });
    });
}

// ─── Specialty filter options ─────────────────────────────────────────────────
function initSpecialtyFilter() {
    const sel = document.getElementById("filterSpecialty");
    if (!sel) return;
    Object.entries(SPECIALTY_LABELS).forEach(([k, v]) => {
        const opt = document.createElement("option");
        opt.value = k; opt.textContent = v;
        sel.appendChild(opt);
    });
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────
function buildSpecChecks() {
    const container = document.getElementById("specChecks");
    if (!container) return;
    container.innerHTML = Object.entries(SPECIALTY_LABELS).map(([k, v]) => `
        <input type="checkbox" class="spec-check" id="spec_${k}" value="${k}">
        <label class="spec-label" for="spec_${k}">${v}</label>
    `).join("");
}

function buildPriceNotesTable() {
    const area = document.getElementById("priceNotesArea");
    if (!area) return;
    const relevant = Object.entries(WORK_ITEM_DIMS)
        .filter(([k]) => DEFAULT_WORK_ITEM_PRICES[k])
        .map(([k]) => k);
    area.innerHTML = `<table class="price-notes-table">
        <thead><tr><th>Hạng mục</th><th>ĐVT</th><th>Đơn giá NTP (VNĐ)</th></tr></thead>
        <tbody>
            ${relevant.map(k => `
            <tr>
                <td>${WORK_ITEM_DIMS[k].label}</td>
                <td>${WORK_ITEM_DIMS[k].unit}</td>
                <td><input type="number" class="price-note-input" data-key="${k}"
                    min="0" step="1000" placeholder="${DEFAULT_WORK_ITEM_PRICES[k]?.price || 0}"></td>
            </tr>`).join("")}
        </tbody>
    </table>`;
}

function initStarPicker() {
    const picker = document.getElementById("starPicker");
    if (!picker) return;
    picker.querySelectorAll(".star-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const v = parseInt(btn.dataset.v);
            document.getElementById("f_rating").value = v;
            picker.querySelectorAll(".star-btn").forEach((b, i) =>
                b.classList.toggle("on", i < v)
            );
            const label = document.getElementById("starLabel");
            if (label) label.textContent = RATING_LABELS[v] || "";
        });
    });
}

function setStars(v) {
    document.getElementById("f_rating").value = v;
    const picker = document.getElementById("starPicker");
    if (!picker) return;
    picker.querySelectorAll(".star-btn").forEach((b, i) => b.classList.toggle("on", i < v));
    const label = document.getElementById("starLabel");
    if (label) label.textContent = RATING_LABELS[v] || "";
}

function openModal(id = null, draft = null) {
    currentEditId = draft ? (draft.contractor_id || null) : id;
    currentDraftId = draft ? draft.id : null;
    const modal = document.getElementById("contractorModal");
    const form = document.getElementById("contractorForm");
    if (!modal || !form) return;

    document.getElementById("modalTitle").textContent = id ? "Sửa thông tin nhà thầu" : "Thêm nhà thầu mới";
    if (draft) document.getElementById("modalTitle").textContent = "Sua nhap nha thau";
    form.reset();

    // Reset specialties
    document.querySelectorAll(".spec-check").forEach(c => c.checked = false);
    // Reset price notes
    document.querySelectorAll(".price-note-input").forEach(i => i.value = "");
    setStars(3);

    const source = draft ? draft.payload : (id ? allContractors.find(x => x.id === id) : null);
    if (source) {
        const c = source;
        if (!c) return;
        document.getElementById("f_name").value = c.name || "";
        document.getElementById("f_type").value = c.type || "team";
        document.getElementById("f_status").value = c.status || "active";
        document.getElementById("f_contact_name").value = c.contact_name || "";
        document.getElementById("f_phone").value = c.phone || "";
        document.getElementById("f_phone2").value = c.phone2 || "";
        document.getElementById("f_email").value = c.email || "";
        document.getElementById("f_address").value = c.address || "";
        document.getElementById("f_district").value = c.district || "";
        document.getElementById("f_city").value = c.city || "Hà Nội";
        document.getElementById("f_work_scope").value = c.work_scope || "";
        document.getElementById("f_tax_code").value = c.tax_code || "";
        document.getElementById("f_bank_account").value = c.bank_account || "";
        document.getElementById("f_bank_name").value = c.bank_name || "";
        document.getElementById("f_project_count").value = c.project_count || 0;
        document.getElementById("f_total_value").value = c.total_value ? c.total_value / 1e6 : 0;
        document.getElementById("f_rating_note").value = c.rating_note || "";
        document.getElementById("f_note").value = c.note || "";
        setStars(c.rating || 3);

        // Specialties
        try {
            const arr = typeof c.specialty === "string" ? JSON.parse(c.specialty || "[]") : (c.specialty || []);
            arr.forEach(k => {
                const ch = document.getElementById("spec_" + k);
                if (ch) ch.checked = true;
            });
        } catch {}

        // Price notes
        try {
            const pn = typeof c.price_notes === "string" ? JSON.parse(c.price_notes || "{}") : (c.price_notes || {});
            Object.entries(pn).forEach(([k, v]) => {
                const inp = document.querySelector(`.price-note-input[data-key="${k}"]`);
                if (inp) inp.value = v;
            });
        } catch {}
    }

    modal.classList.add("open");
    if (typeof lucide !== "undefined") lucide.createIcons();
    document.getElementById("f_name").focus();
}

function openDraftModal(draftId) {
    const draft = allDrafts.find(d => d.id === draftId);
    if (!draft) return;
    openModal(draft.contractor_id || null, draft);
}

function closeModal() {
    document.getElementById("contractorModal")?.classList.remove("open");
    currentEditId = null;
    currentDraftId = null;
}

async function handleSave() {
    const name = document.getElementById("f_name")?.value.trim();
    if (!name) { toast("Vui lòng nhập tên nhà thầu"); return; }

    const specialties = [...document.querySelectorAll(".spec-check:checked")].map(c => c.value);
    const priceNotes = {};
    document.querySelectorAll(".price-note-input").forEach(inp => {
        const v = parseFloat(inp.value);
        if (v > 0) priceNotes[inp.dataset.key] = v;
    });

    const totalValueMillion = parseFloat(document.getElementById("f_total_value")?.value) || 0;

    const payload = {
        type:            document.getElementById("f_type")?.value,
        name,
        contact_name:    document.getElementById("f_contact_name")?.value.trim() || null,
        phone:           document.getElementById("f_phone")?.value.trim() || null,
        phone2:          document.getElementById("f_phone2")?.value.trim() || null,
        email:           document.getElementById("f_email")?.value.trim() || null,
        address:         document.getElementById("f_address")?.value.trim() || null,
        district:        document.getElementById("f_district")?.value.trim() || null,
        city:            document.getElementById("f_city")?.value.trim() || "Hà Nội",
        specialty:       JSON.stringify(specialties),
        work_scope:      document.getElementById("f_work_scope")?.value || null,
        tax_code:        document.getElementById("f_tax_code")?.value.trim() || null,
        bank_account:    document.getElementById("f_bank_account")?.value.trim() || null,
        bank_name:       document.getElementById("f_bank_name")?.value.trim() || null,
        rating:          parseInt(document.getElementById("f_rating")?.value) || 3,
        rating_note:     document.getElementById("f_rating_note")?.value.trim() || null,
        project_count:   parseInt(document.getElementById("f_project_count")?.value) || 0,
        total_value:     totalValueMillion * 1e6,
        price_notes:     JSON.stringify(priceNotes),
        status:          document.getElementById("f_status")?.value || "active",
        note:            document.getElementById("f_note")?.value.trim() || null,
    };

    const saveBtn = document.getElementById("saveContractor");
    saveBtn.disabled = true;
    saveBtn.textContent = "Đang lưu...";

    try {
        if (!isAdminUser()) {
            const draftPayload = { ...payload, contractor_id: currentEditId || null };
            await saveDraftAPI(draftPayload, currentDraftId);
            allDrafts = await fetchDrafts();
            closeModal();
            renderDrafts();
            toast("Da luu nhap. Bam Gui duyet de chuyen admin phe duyet.");
            return;
        }

        const saved = await saveContractorAPI(payload, currentEditId);
        if (currentEditId) {
            const idx = allContractors.findIndex(x => x.id === currentEditId);
            if (idx >= 0) allContractors[idx] = saved;
        } else {
            allContractors.unshift(saved);
        }
        closeModal();
        renderTable();
        toast(currentEditId ? "✅ Đã cập nhật nhà thầu" : "✅ Đã thêm nhà thầu mới");
        try { const stats = await fetchStats(); if (stats) renderStats(stats); } catch {}
    } catch (e) {
        toast("❌ " + e.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i data-lucide="save"></i> Lưu';
        if (typeof lucide !== "undefined") lucide.createIcons();
    }
}

// ─── Detail panel ─────────────────────────────────────────────────────────────
function openDetail(id) {
    const c = allContractors.find(x => x.id === id);
    if (!c) return;
    currentEditId = id;

    document.getElementById("detailName").textContent = c.name;
    const body = document.getElementById("detailBody");

    let specArr = [];
    try { specArr = typeof c.specialty === "string" ? JSON.parse(c.specialty || "[]") : (c.specialty || []); } catch {}

    let pn = {};
    try { pn = typeof c.price_notes === "string" ? JSON.parse(c.price_notes || "{}") : (c.price_notes || {}); } catch {}
    const priceRows = Object.entries(pn).filter(([,v]) => v > 0).map(([k, v]) =>
        `<tr><td>${WORK_ITEM_DIMS[k]?.label || k}</td><td>${WORK_ITEM_DIMS[k]?.unit || ""}</td><td style="text-align:right;font-weight:700;color:#34d399;">${v.toLocaleString("vi-VN")} đ</td></tr>`
    ).join("");

    body.innerHTML = `
        <div style="margin-bottom:12px;">
            ${typeBadge(c.type)} ${statusBadge(c.status)}
        </div>
        <div class="detail-row">
            <div class="detail-icon"><i data-lucide="star" style="width:16px;height:16px;"></i></div>
            <div class="detail-field">
                <div class="dfl">Đánh giá</div>
                <div class="dfv"><span class="stars">${stars(c.rating)}</span> ${RATING_LABELS[c.rating] || ""}</div>
                ${c.rating_note ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px;font-style:italic;">"${escHtml(c.rating_note)}"</div>` : ""}
            </div>
        </div>
        <div class="detail-row">
            <div class="detail-icon"><i data-lucide="user" style="width:16px;height:16px;"></i></div>
            <div class="detail-field">
                <div class="dfl">Người liên hệ</div>
                <div class="dfv">${escHtml(c.contact_name) || "—"}</div>
            </div>
        </div>
        <div class="detail-row">
            <div class="detail-icon"><i data-lucide="phone" style="width:16px;height:16px;"></i></div>
            <div class="detail-field">
                <div class="dfl">Số điện thoại</div>
                <div class="dfv">
                    ${c.phone ? `<a href="tel:${escHtml(c.phone)}" style="color:#60a5fa;">${escHtml(c.phone)}</a>` : "—"}
                    ${c.phone2 ? ` / <a href="tel:${escHtml(c.phone2)}" style="color:#60a5fa;">${escHtml(c.phone2)}</a>` : ""}
                </div>
            </div>
        </div>
        ${c.email ? `<div class="detail-row">
            <div class="detail-icon"><i data-lucide="mail" style="width:16px;height:16px;"></i></div>
            <div class="detail-field"><div class="dfl">Email</div><div class="dfv">${escHtml(c.email)}</div></div>
        </div>` : ""}
        <div class="detail-row">
            <div class="detail-icon"><i data-lucide="map-pin" style="width:16px;height:16px;"></i></div>
            <div class="detail-field">
                <div class="dfl">Địa chỉ</div>
                <div class="dfv">${[c.address, c.district, c.city].filter(Boolean).join(", ") || "—"}</div>
            </div>
        </div>
        <hr class="detail-sep">
        <div class="detail-row">
            <div class="detail-icon"><i data-lucide="hard-hat" style="width:16px;height:16px;"></i></div>
            <div class="detail-field">
                <div class="dfl">Chuyên môn</div>
                <div class="dfv">${specArr.map(k => `<span class="spec-tag">${SPECIALTY_LABELS[k]||k}</span>`).join(" ") || "—"}</div>
            </div>
        </div>
        <div class="detail-row">
            <div class="detail-icon"><i data-lucide="list-checks" style="width:16px;height:16px;"></i></div>
            <div class="detail-field">
                <div class="dfl">Phạm vi thi công</div>
                <div class="dfv">${escHtml(c.work_scope) || "—"}</div>
            </div>
        </div>
        ${priceRows ? `<hr class="detail-sep">
        <div style="font-size:11px;font-weight:700;color:#7dd3fc;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Đơn giá tham khảo</div>
        <table class="price-notes-table">
            <thead><tr><th>Hạng mục</th><th>ĐVT</th><th style="text-align:right;">Đơn giá</th></tr></thead>
            <tbody>${priceRows}</tbody>
        </table>` : ""}
        <hr class="detail-sep">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
            <div><div class="dfl" style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Số DA hợp tác</div><div style="font-size:18px;font-weight:800;color:#00f2fe;">${c.project_count || 0}</div></div>
            <div><div class="dfl" style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Tổng giá trị</div><div style="font-size:18px;font-weight:800;color:#34d399;">${fmtVND(c.total_value)}</div></div>
        </div>
        ${c.tax_code || c.bank_account ? `<hr class="detail-sep">
        ${c.tax_code ? `<div class="dfl">MST: <span style="color:var(--text-secondary);">${escHtml(c.tax_code)}</span></div>` : ""}
        ${c.bank_account ? `<div class="dfl">TK: <span style="color:var(--text-secondary);">${escHtml(c.bank_account)} — ${escHtml(c.bank_name)||""}</span></div>` : ""}` : ""}
        ${c.note ? `<hr class="detail-sep"><div style="font-size:12px;color:var(--text-muted);font-style:italic;">${escHtml(c.note)}</div>` : ""}
    `;

    document.getElementById("detailPanel").classList.add("open");
    if (typeof lucide !== "undefined") lucide.createIcons();
}

function closeDetail() {
    document.getElementById("detailPanel")?.classList.remove("open");
}

// ─── CSV export ───────────────────────────────────────────────────────────────
function exportCSV() {
    const headers = ["STT","Tên","Loại","Người LH","SĐT","Email","Địa chỉ","Quận","TP","Chuyên môn","Phạm vi","MST","TK ngân hàng","Ngân hàng","Xếp hạng","Ghi chú đánh giá","Số DA","Tổng HT (triệu)","Trạng thái","Ghi chú"];
    const rows = allContractors.map((c, i) => {
        let specArr = [];
        try { specArr = typeof c.specialty === "string" ? JSON.parse(c.specialty||"[]") : (c.specialty||[]); } catch {}
        return [i+1, c.name, c.type, c.contact_name||"", c.phone||"", c.email||"", c.address||"", c.district||"", c.city||"",
            specArr.map(k => SPECIALTY_LABELS[k]||k).join("; "), c.work_scope||"", c.tax_code||"", c.bank_account||"", c.bank_name||"",
            c.rating, c.rating_note||"", c.project_count||0, ((c.total_value||0)/1e6).toFixed(1), c.status, c.note||""];
    });
    const bom = "﻿";
    const csv = bom + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "nha-thau-phu.csv"; a.click();
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    if (typeof initAuth === "function") initAuth();

    buildSpecChecks();
    buildPriceNotesTable();
    initStarPicker();
    initSortHeaders();
    initSpecialtyFilter();

    loadAll();
    if (!isAdminUser()) {
        const del = document.getElementById("detailDelete");
        if (del) del.style.display = "none";
    }

    // Filters
    ["searchInput","filterStatus","filterType","filterSpecialty"].forEach(id => {
        document.getElementById(id)?.addEventListener("input", renderTable);
        document.getElementById(id)?.addEventListener("change", renderTable);
    });

    // Modal
    document.getElementById("btnAddContractor")?.addEventListener("click", () => openModal());
    document.getElementById("closeModal")?.addEventListener("click", closeModal);
    document.getElementById("cancelModal")?.addEventListener("click", closeModal);
    document.getElementById("contractorModal")?.addEventListener("click", e => { if (e.target === e.currentTarget) closeModal(); });
    document.getElementById("saveContractor")?.addEventListener("click", handleSave);

    // Detail panel
    document.getElementById("closeDetail")?.addEventListener("click", closeDetail);
    document.getElementById("detailEdit")?.addEventListener("click", () => { closeDetail(); openModal(currentEditId); });
    document.getElementById("detailDelete")?.addEventListener("click", async () => {
        const c = allContractors.find(x => x.id === currentEditId);
        if (!c || !confirm(`Xóa nhà thầu "${c.name}"? Không thể hoàn tác.`)) return;
        try {
            await deleteContractorAPI(currentEditId);
            allContractors = allContractors.filter(x => x.id !== currentEditId);
            closeDetail();
            renderTable();
            toast("🗑 Đã xóa nhà thầu");
            try { const stats = await fetchStats(); if (stats) renderStats(stats); } catch {}
        } catch (e) { toast("❌ " + e.message); }
    });
    document.getElementById("detailUseInPricing")?.addEventListener("click", () => {
        const c = allContractors.find(x => x.id === currentEditId);
        if (!c) return;
        // Pre-fill NTP name in pricing page
        try {
            const sub = JSON.parse(localStorage.getItem("anlaa_sub_state") || "{}");
            if (!sub.names) sub.names = ["Nhà thầu 1","Nhà thầu 2","Nhà thầu 3"];
            // Find first slot that's default
            const slot = sub.names.findIndex(n => /Nhà thầu \d/.test(n));
            if (slot >= 0) sub.names[slot] = c.name;
            // Pre-fill price_notes if available
            if (!sub.prices) sub.prices = [{},{},{}];
            let pn = {};
            try { pn = typeof c.price_notes === "string" ? JSON.parse(c.price_notes||"{}") : (c.price_notes||{}); } catch {}
            Object.entries(pn).forEach(([, v]) => { /* prices are per item id not per key */ });
            localStorage.setItem("anlaa_sub_state", JSON.stringify(sub));
            toast(`✅ Đã lưu "${c.name}" vào Slot ${slot+1} trong Bảng giá NTP`);
        } catch (e) { toast("❌ " + e.message); }
    });

    document.getElementById("btnExportCSV")?.addEventListener("click", exportCSV);

    // Keyboard: Escape closes panels/modal
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") { closeModal(); closeDetail(); }
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
});
