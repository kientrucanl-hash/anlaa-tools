/**
 * materials.js — Bảng vật tư cần mua
 * Reads approved estimate from localStorage, maps to MATERIAL_NORMS, renders purchase list.
 */

function formatNumber(v, dp = 0) {
    const n = parseFloat(v) || 0;
    return n.toLocaleString("vi-VN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
function formatNum(v) {
    const n = parseFloat(v) || 0;
    return Math.abs(n) < 0.005 ? "0" : (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2));
}
function showToast(msg, type = "success") {
    const el = document.getElementById("toastNotification");
    if (!el) return;
    el.textContent = msg;
    el.className = "toast-notification show " + (type === "error" ? "toast-error" : "");
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = "toast-notification"; }, 3000);
}

function calcRowQty(row, dims) {
    const n = parseFloat(row.n) || 1;
    const l = parseFloat(row.l) || 0;
    const w = parseFloat(row.w) || 0;
    const h = parseFloat(row.h) || 0;
    const hs = row.hs !== undefined ? parseFloat(row.hs) : 1;
    if (dims.length === 0) return n * hs;
    if (!l) return 0;
    let qty = l;
    if (dims.includes("w") && w) qty *= w;
    if (dims.includes("h") && h) qty *= h;
    return qty * n * hs;
}
function calcItemTotalQty(item) {
    const dims = WORK_ITEM_DIMS[item.workItemKey]
        ? (WORK_ITEM_DIMS[item.workItemKey].dims || [])
        : ["l","w","h"];
    return item.rows.reduce((sum, row) => sum + calcRowQty(row, dims), 0);
}

// ── Core: calculate purchase totals ────────────────────────────────────────
function calcPurchaseTotals(items) {
    // totals: { materialKey: rawQty }
    const totals = {};
    const breakdown = []; // per-item detail for the breakdown table
    const noNorm = [];    // items with no MATERIAL_NORMS entry

    items.forEach(item => {
        const norms = MATERIAL_NORMS[item.workItemKey];
        const qty = calcItemTotalQty(item);
        if (!norms || norms.length === 0) {
            if (qty > 0 && item.workItemKey !== "custom") {
                noNorm.push({ name: item.name || item.workItemKey, qty, unit: item.unit });
            }
            return;
        }
        if (qty <= 0) return;

        const itemBreakdown = { name: item.name || item.workItemKey, unit: item.unit, qty, materials: [] };
        norms.forEach(norm => {
            const rawQty = qty * norm.perUnit;
            if (!totals[norm.key]) totals[norm.key] = 0;
            totals[norm.key] += rawQty;
            const meta = PURCHASE_MATERIAL_LABELS[norm.key];
            itemBreakdown.materials.push({
                key: norm.key,
                name: meta ? meta.name : norm.key,
                rawQty,
                displayUnit: meta ? meta.displayUnit : norm.key
            });
        });
        breakdown.push(itemBreakdown);
    });

    return { totals, breakdown, noNorm };
}

// ── Render purchase table ──────────────────────────────────────────────────
function renderPurchaseTable(totals) {
    const tbody = document.getElementById("purchaseTableBody");
    if (!tbody) return;

    const keys = Object.keys(totals).filter(k => totals[k] > 0);
    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-boq-msg">Không có vật tư nào có định mức tự động.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    let stt = 1;
    keys.forEach(key => {
        const rawQty = totals[key];
        const meta = PURCHASE_MATERIAL_LABELS[key];
        if (!meta) return;

        const buyQty = meta.packSize ? Math.ceil(rawQty / meta.packSize) : Math.ceil(rawQty * 100) / 100;
        const rawDisplay = meta.packSize
            ? `${formatNum(rawQty)} ${meta.displayUnit === "bao" ? "kg" : meta.displayUnit}`
            : `${formatNum(rawQty)} ${meta.displayUnit}`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${stt++}</td>
            <td style="font-weight:600;">${meta.name}</td>
            <td><span class="unit-badge">${meta.packUnit}</span></td>
            <td class="text-right qty-raw">${rawDisplay}</td>
            <td class="text-right qty-buy">${meta.packSize ? formatNumber(buyQty) : formatNum(buyQty)}</td>
            <td class="text-right"><span style="color:var(--text-muted);font-size:12px;">${meta.packUnit}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// ── Render per-item breakdown ──────────────────────────────────────────────
function renderBreakdown(breakdown) {
    const area = document.getElementById("breakdownArea");
    if (!area) return;
    if (breakdown.length === 0) { area.innerHTML = `<p class="text-gray text-sm">Không có hạng mục nào có định mức tự động.</p>`; return; }

    area.innerHTML = "";
    breakdown.forEach(item => {
        const div = document.createElement("div");
        div.style.marginBottom = "16px";
        div.innerHTML = `
            <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">
                ${item.name} <span style="color:var(--text-muted);font-size:11px;">(${formatNum(item.qty)} ${item.unit})</span>
            </div>
            <table class="mat-source-table">
                <thead><tr><th>Vật tư</th><th class="text-right">Khối lượng</th><th class="text-right">Đơn vị</th></tr></thead>
                <tbody>
                    ${item.materials.map(m => `
                        <tr>
                            <td>${m.name}</td>
                            <td class="text-right">${formatNum(m.rawQty)}</td>
                            <td class="text-right" style="color:var(--text-muted);">${m.displayUnit}</td>
                        </tr>`).join("")}
                </tbody>
            </table>
        `;
        area.appendChild(div);
    });
}

// ── Export CSV ─────────────────────────────────────────────────────────────
function exportMaterialsCSV(totals) {
    const rows = [["STT","Vật tư","Quy cách","Khối lượng tính toán","Số lượng cần mua","Đơn vị"]];
    let stt = 1;
    Object.keys(totals).filter(k => totals[k] > 0).forEach(key => {
        const rawQty = totals[key];
        const meta = PURCHASE_MATERIAL_LABELS[key];
        if (!meta) return;
        const buyQty = meta.packSize ? Math.ceil(rawQty / meta.packSize) : Math.ceil(rawQty * 100) / 100;
        rows.push([stt++, meta.name, meta.packUnit, formatNum(rawQty), buyQty, meta.packUnit]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `VatTuCanMua_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    initMaterialsPage();
});

function initMaterialsPage() {
    // Load approved estimate
    const raw = localStorage.getItem("anlaa_approved_estimate");
    if (!raw) {
        document.getElementById("purchaseTableBody").innerHTML =
            `<tr><td colspan="6" class="empty-boq-msg">Chưa có bảng dự toán được duyệt. <a href="estimate.html" style="color:var(--border-focus);">Về dự toán →</a></td></tr>`;
        document.getElementById("breakdownArea").innerHTML = "";
        return;
    }

    const approved = JSON.parse(raw);
    const { items, timestamp } = approved;

    // Show timestamp
    const ts = document.getElementById("approvedTimestamp");
    if (ts && timestamp) {
        ts.textContent = "Duyệt lúc: " + new Date(timestamp).toLocaleString("vi-VN");
    }

    // Calculate
    const { totals, breakdown, noNorm } = calcPurchaseTotals(items);

    // Render
    renderPurchaseTable(totals);
    renderBreakdown(breakdown);

    // No-norm items
    if (noNorm.length > 0) {
        document.getElementById("noNormSection").style.display = "block";
        const list = document.getElementById("noNormList");
        list.innerHTML = noNorm.map(i =>
            `<li>${i.name} — ${formatNum(i.qty)} ${i.unit} <span class="no-norm-item">(không có định mức tự động)</span></li>`
        ).join("");
    }

    // Button handlers
    document.getElementById("btnBackToEstimate")?.addEventListener("click", () => { window.location.href = "estimate.html"; });
    document.getElementById("btnExportMaterialsCSV")?.addEventListener("click", () => exportMaterialsCSV(totals));
    document.getElementById("btnPrintMaterials")?.addEventListener("click", () => window.print());
    document.getElementById("logoutBtn")?.addEventListener("click", () => { clearSession(); location.reload(); });

    if (typeof lucide !== "undefined") lucide.createIcons();
}
