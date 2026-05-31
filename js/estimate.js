/**
 * estimate.js — Dự toán Chi phí page (G8-style cost estimate)
 * Self-contained module; shares localStorage with index.html for 2-way sync.
 */

// ── State ──────────────────────────────────────────────────────────────────
let workItemPrices = {};
let constructionItems = [];
let contingencyEnabled = false;
let contingencyPct = 5;
let undoStack = [];
let redoStack = [];

// ── Utils ──────────────────────────────────────────────────────────────────
function formatNumber(v, dp = 0) {
    const n = parseFloat(v) || 0;
    return n.toLocaleString("vi-VN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
function formatNum(v) {
    const n = parseFloat(v) || 0;
    return Math.abs(n) < 0.005 ? "0" : (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2));
}
function escapeHtml(s) {
    return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function safeEval(expr) {
    const s = String(expr || "").trim().replace(/,/g, ".");
    if (!s || !/[+\-*\/()]/.test(s)) return null;
    if (!/^[\d\s.+\-*\/()]+$/.test(s)) return null;
    try {
        const v = Function('"use strict";return(' + s + ')')();
        return (typeof v === "number" && isFinite(v) && v >= 0) ? Math.round(v * 1e6) / 1e6 : null;
    } catch { return null; }
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function showToast(msg, type = "success") {
    const el = document.getElementById("toastNotification");
    if (!el) return;
    el.textContent = msg;
    el.className = "toast-notification show " + (type === "error" ? "toast-error" : "");
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = "toast-notification"; }, 3000);
}

// ── Storage ────────────────────────────────────────────────────────────────
function saveConstructionItems() {
    localStorage.setItem("anlaa_cost_items", JSON.stringify(constructionItems));
    setSyncBadge("syncing");
    clearTimeout(saveConstructionItems._t);
    saveConstructionItems._t = setTimeout(() => setSyncBadge("synced"), 800);
}
function saveContingency() {
    localStorage.setItem("anlaa_contingency", JSON.stringify({ enabled: contingencyEnabled, pct: contingencyPct }));
}
function setSyncBadge(state) {
    const b = document.getElementById("syncBadge");
    if (!b) return;
    if (state === "syncing") { b.textContent = "● Đang lưu..."; b.className = "sync-badge syncing"; }
    else { b.textContent = "● Đã đồng bộ"; b.className = "sync-badge"; }
}

// ── Undo/Redo ──────────────────────────────────────────────────────────────
function pushUndo() {
    undoStack.push(JSON.stringify(constructionItems));
    if (undoStack.length > 30) undoStack.shift();
    redoStack = [];
}
function applyUndo() {
    if (!undoStack.length) { showToast("Không còn gì để hoàn tác"); return; }
    redoStack.push(JSON.stringify(constructionItems));
    constructionItems = JSON.parse(undoStack.pop());
    saveConstructionItems();
    updateConstructionCostSection();
    showToast("↩ Hoàn tác");
}
function applyRedo() {
    if (!redoStack.length) { showToast("Không còn gì để làm lại"); return; }
    undoStack.push(JSON.stringify(constructionItems));
    constructionItems = JSON.parse(redoStack.pop());
    saveConstructionItems();
    updateConstructionCostSection();
    showToast("↪ Làm lại");
}

// ── Quantity Calc ──────────────────────────────────────────────────────────
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

// ── Work Prices Table ──────────────────────────────────────────────────────
function renderWorkPricesTable() {
    const tbody = document.getElementById("workPricesBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    Object.entries(DEFAULT_WORK_ITEM_PRICES).forEach(([key, meta]) => {
        const price = workItemPrices[key] !== undefined ? workItemPrices[key] : meta.price;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${meta.name}</td>
            <td>${(WORK_ITEM_DIMS[key] || {}).unit || "m²"}</td>
            <td><input type="number" class="price-input" data-key="${key}" value="${price}" min="0" step="1000" style="width:110px;text-align:right;background:var(--bg-input);border:1px solid var(--border-glass);border-radius:4px;color:var(--text-primary);padding:4px 8px;font-size:12px;"></td>
        `;
        tr.querySelector(".price-input").addEventListener("input", (e) => {
            workItemPrices[key] = parseFloat(e.target.value) || 0;
            localStorage.setItem("anlaa_work_prices", JSON.stringify(workItemPrices));
            updateConstructionCostSection();
        });
        tbody.appendChild(tr);
    });
}

// ── Datalist ───────────────────────────────────────────────────────────────
function initWorkItemDatalist() {
    if (document.getElementById("workItemSuggestions")) return;
    const dl = document.createElement("datalist");
    dl.id = "workItemSuggestions";
    Object.values(WORK_ITEM_DIMS).forEach(v => {
        const opt = document.createElement("option");
        opt.value = v.label;
        dl.appendChild(opt);
    });
    document.body.appendChild(dl);
}

// ── Render Cost Table ──────────────────────────────────────────────────────
function updateConstructionCostSection() {
    const tbody = document.getElementById("costTableBody");
    if (!tbody) return;

    if (constructionItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="empty-boq-msg">Chưa có hạng mục. Nhấn "+ Thêm" hoặc mở Calculator để bóc KL tự động.</td></tr>`;
        document.getElementById("costTotalsArea").style.display = "none";
        return;
    }

    const UNITS = ["m²","m³","md","m","cái","bộ","kg","tấm","bao","viên"];
    tbody.innerHTML = "";
    let stt = 1;

    constructionItems.forEach((item) => {
        const dims = WORK_ITEM_DIMS[item.workItemKey]
            ? (WORK_ITEM_DIMS[item.workItemKey].dims || [])
            : ["l","w","h"];
        const totalQty = calcItemTotalQty(item);
        const unitPrice = workItemPrices[item.workItemKey] !== undefined
            ? workItemPrices[item.workItemKey]
            : (item.unitPrice || 0);
        const subtotal = totalQty * unitPrice;
        const isUnknownKey = !WORK_ITEM_DIMS[item.workItemKey];

        const headerTr = document.createElement("tr");
        headerTr.className = "cost-item-header" + (item.isAuto ? " cost-auto" : " cost-custom");
        headerTr.dataset.itemId = item.id;
        headerTr.innerHTML = `
            <td class="td-stt">${stt++}</td>
            <td class="td-name" colspan="7">
                <button class="btn-expand no-print" data-id="${item.id}">${item.expanded ? "▼" : "▶"}</button>
                ${item.isAuto
                    ? `<span class="item-name">${escapeHtml(item.name)}</span><span class="item-unit-badge">${item.unit}</span>`
                    : `<input type="text" class="cost-name-input" list="workItemSuggestions"
                           value="${escapeHtml(item.name)}" data-id="${item.id}"
                           placeholder="Gõ tên hạng mục..." autocomplete="off">
                       <select class="cost-unit-inline" data-id="${item.id}">
                           ${UNITS.map(u => `<option value="${u}" ${item.unit===u?"selected":""}>${u}</option>`).join("")}
                       </select>`
                }
            </td>
            <td class="td-qty text-right num-cell">${formatNum(totalQty)}</td>
            <td class="td-price text-right num-cell">
                ${!item.isAuto && isUnknownKey
                    ? `<input type="number" class="cost-price-input" data-id="${item.id}" value="${unitPrice}" min="0" step="1000">`
                    : formatNumber(unitPrice)
                }
            </td>
            <td class="td-total text-right num-cell cost-total-cell">${formatNumber(subtotal)}</td>
            <td class="td-action no-print"><button class="btn-del-item btn btn-danger btn-xs" data-id="${item.id}">×</button></td>
        `;
        tbody.appendChild(headerTr);

        if (item.expanded) {
            item.rows.forEach((row, ri) => {
                const rowQty = calcRowQty(row, dims);
                const detailTr = document.createElement("tr");
                detailTr.className = "cost-detail-row";
                detailTr.dataset.itemId = item.id;
                detailTr.dataset.rowIdx = ri;
                detailTr.innerHTML = `
                    <td></td>
                    <td class="td-desc"><input class="detail-input desc-input" type="text" placeholder="Diễn giải..." value="${escapeHtml(row.desc||"")}" data-field="desc"></td>
                    <td></td>
                    <td><input class="detail-input dim-input" type="number" placeholder="L" value="${row.l||""}" data-field="l" ${!dims.includes("l")?"disabled":""}></td>
                    <td><input class="detail-input dim-input" type="number" placeholder="R" value="${row.w||""}" data-field="w" ${!dims.includes("w")?"disabled":""}></td>
                    <td><input class="detail-input dim-input" type="number" placeholder="C" value="${row.h||""}" data-field="h" ${!dims.includes("h")?"disabled":""}></td>
                    <td><input class="detail-input n-input" type="number" placeholder="n" value="${row.n||1}" data-field="n" min="0" step="1"></td>
                    <td><select class="detail-select hs-select" data-field="hs">
                        <option value="1" ${row.hs>=0?"selected":""}>+</option>
                        <option value="-1" ${row.hs<0?"selected":""}>−</option>
                    </select></td>
                    <td class="text-right num-cell ${rowQty<0?"text-red":""}">${formatNum(rowQty)}</td>
                    <td></td><td></td>
                    <td class="no-print"><button class="btn-del-row btn btn-xs" data-item-id="${item.id}" data-row-idx="${ri}">×</button></td>
                `;
                tbody.appendChild(detailTr);
            });

            const addRowTr = document.createElement("tr");
            addRowTr.className = "cost-addrow-tr no-print";
            addRowTr.innerHTML = `<td colspan="12"><button class="btn-add-row btn btn-xs btn-secondary" data-item-id="${item.id}"><i data-lucide="plus"></i> thêm dòng diễn giải</button></td>`;
            tbody.appendChild(addRowTr);
        }
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
    wireCostTableEvents(tbody);
    document.getElementById("costTotalsArea").style.display = "block";
    updateConstructionCostTotals();
}

function updateItemHeaderQty(item) {
    const headerRow = document.querySelector(`.cost-item-header[data-item-id="${item.id}"]`);
    if (!headerRow) return;
    const totalQty = calcItemTotalQty(item);
    const unitPrice = workItemPrices[item.workItemKey] !== undefined
        ? workItemPrices[item.workItemKey] : (item.unitPrice || 0);
    const subtotal = totalQty * unitPrice;
    const qtyCell = headerRow.querySelector(".td-qty");
    const totalCell = headerRow.querySelector(".cost-total-cell");
    if (qtyCell) qtyCell.innerText = formatNum(totalQty);
    if (totalCell) totalCell.innerText = formatNumber(subtotal);
    updateConstructionCostTotals();
}

function updateConstructionCostTotals() {
    let subtotal = 0;
    constructionItems.forEach(item => {
        const totalQty = calcItemTotalQty(item);
        const unitPrice = workItemPrices[item.workItemKey] !== undefined
            ? workItemPrices[item.workItemKey] : (item.unitPrice || 0);
        subtotal += totalQty * unitPrice;
    });
    const contingency = contingencyEnabled ? subtotal * (contingencyPct / 100) : 0;
    const grandTotal = subtotal + contingency;
    const el = id => document.getElementById(id);
    if (el("costSubtotal")) el("costSubtotal").innerText = formatNumber(Math.round(subtotal)) + " VNĐ";
    if (el("contingencyAmount")) el("contingencyAmount").innerText = "+" + formatNumber(Math.round(contingency)) + " VNĐ";
    if (el("costGrandTotal")) el("costGrandTotal").innerText = formatNumber(Math.round(grandTotal)) + " VNĐ";
}

// ── Wire Events ────────────────────────────────────────────────────────────
function wireCostTableEvents(tbody) {
    tbody.querySelectorAll(".btn-expand").forEach(btn => {
        btn.addEventListener("click", () => {
            const item = constructionItems.find(i => i.id === btn.dataset.id);
            if (item) { item.expanded = !item.expanded; saveConstructionItems(); updateConstructionCostSection(); }
        });
    });

    tbody.querySelectorAll(".btn-del-item").forEach(btn => {
        btn.addEventListener("click", () => {
            pushUndo();
            constructionItems = constructionItems.filter(i => i.id !== btn.dataset.id);
            saveConstructionItems();
            updateConstructionCostSection();
        });
    });

    tbody.querySelectorAll(".btn-add-row").forEach(btn => {
        btn.addEventListener("click", () => {
            pushUndo();
            const item = constructionItems.find(i => i.id === btn.dataset.itemId);
            if (item) { item.rows.push({ desc:"", n:1, l:"", w:"", h:"", hs:1 }); saveConstructionItems(); updateConstructionCostSection(); }
        });
    });

    tbody.querySelectorAll(".btn-del-row").forEach(btn => {
        btn.addEventListener("click", () => {
            pushUndo();
            const item = constructionItems.find(i => i.id === btn.dataset.itemId);
            if (item && item.rows.length > 1) { item.rows.splice(parseInt(btn.dataset.rowIdx), 1); saveConstructionItems(); updateConstructionCostSection(); }
        });
    });

    tbody.querySelectorAll(".detail-input, .detail-select").forEach(input => {
        input.addEventListener("focus", function() { if (this.type === "number") this.select(); });
        input.addEventListener("input", (e) => {
            const tr = e.target.closest("tr");
            const item = constructionItems.find(i => i.id === tr.dataset.itemId);
            if (!item) return;
            const ri = parseInt(tr.dataset.rowIdx);
            const field = e.target.dataset.field;
            item.rows[ri][field] = field === "desc" ? e.target.value : (parseFloat(e.target.value) || (field === "hs" ? 1 : ""));
            saveConstructionItems();
            const dims = WORK_ITEM_DIMS[item.workItemKey]
                ? (WORK_ITEM_DIMS[item.workItemKey].dims || [])
                : ["l","w","h"];
            const rowQty = calcRowQty(item.rows[ri], dims);
            const cells = tr.querySelectorAll("td");
            if (cells[8]) { cells[8].innerText = formatNum(rowQty); cells[8].className = `text-right num-cell ${rowQty < 0 ? "text-red" : ""}`; }
            updateItemHeaderQty(item);
        });
    });

    tbody.querySelectorAll(".cost-name-input").forEach(input => {
        input.addEventListener("change", (e) => {
            const item = constructionItems.find(i => i.id === e.target.dataset.id);
            if (!item) return;
            const typed = e.target.value.trim();
            const match = Object.entries(WORK_ITEM_DIMS).find(([, v]) => v.label === typed);
            if (match) {
                item.workItemKey = match[0];
                item.name = match[1].label;
                item.unit = match[1].unit;
                item.unitPrice = workItemPrices[item.workItemKey] || 0;
            } else {
                item.workItemKey = "custom";
                item.name = typed || "Hạng mục mới";
            }
            saveConstructionItems();
            updateConstructionCostSection();
        });
    });

    tbody.querySelectorAll(".cost-unit-inline").forEach(sel => {
        sel.addEventListener("change", (e) => {
            const item = constructionItems.find(i => i.id === e.target.dataset.id);
            if (!item) return;
            item.unit = e.target.value;
            saveConstructionItems();
        });
    });

    tbody.querySelectorAll(".cost-price-input").forEach(input => {
        input.addEventListener("focus", function() { this.select(); });
        input.addEventListener("input", (e) => {
            const item = constructionItems.find(i => i.id === e.target.dataset.id);
            if (!item) return;
            item.unitPrice = parseFloat(e.target.value) || 0;
            saveConstructionItems();
            updateItemHeaderQty(item);
        });
    });

    // Expression evaluator on blur
    tbody.querySelectorAll(".dim-input, .n-input").forEach(input => {
        input.addEventListener("blur", function() {
            const result = safeEval(this.value.trim());
            if (result !== null) {
                this.value = result;
                this.dispatchEvent(new Event("input", { bubbles: true }));
                this.classList.remove("expr-active");
            }
        });
        input.addEventListener("input", function() {
            this.classList.toggle("expr-active", /[+\-*\/()]/.test(this.value));
        });
    });

    // Paste from Excel/G8
    tbody.querySelectorAll(".detail-input").forEach(input => {
        input.addEventListener("paste", function(e) {
            const text = (e.clipboardData || window.clipboardData).getData("text");
            if (!text.includes("\t") && !text.includes("\n")) return;
            e.preventDefault();
            const tr = this.closest("tr");
            const item = constructionItems.find(i => i.id === tr.dataset.itemId);
            if (!item) return;
            pushUndo();
            const fieldOrder = ["desc","l","w","h","n"];
            const startRi = parseInt(tr.dataset.rowIdx);
            const startCol = fieldOrder.indexOf(this.dataset.field);
            const pastedRows = text.trim().split(/\r?\n/).map(r => r.split("\t"));
            pastedRows.forEach((cols, rowOffset) => {
                const ri = startRi + rowOffset;
                while (item.rows.length <= ri) item.rows.push({ desc:"", n:1, l:"", w:"", h:"", hs:1 });
                cols.forEach((val, colOffset) => {
                    const fi = startCol + colOffset;
                    if (fi >= fieldOrder.length) return;
                    const field = fieldOrder[fi];
                    const clean = val.trim().replace(/,/g, ".");
                    item.rows[ri][field] = field === "desc" ? clean : (parseFloat(clean) || "");
                });
            });
            saveConstructionItems();
            updateConstructionCostSection();
            showToast(`✓ Đã dán ${pastedRows.length} dòng`);
        });
    });

    // Tab/Enter navigation
    tbody.querySelectorAll(".detail-input:not([disabled])").forEach(input => {
        input.addEventListener("keydown", function(e) {
            const tr = this.closest("tr");
            const item = constructionItems.find(i => i.id === tr.dataset.itemId);
            if (!item) return;
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                pushUndo();
                item.rows.push({ desc:"", n:1, l:"", w:"", h:"", hs:1 });
                saveConstructionItems();
                updateConstructionCostSection();
                setTimeout(() => {
                    const rows = document.querySelectorAll(`#costTableBody tr.cost-detail-row[data-item-id="${item.id}"]`);
                    rows[rows.length - 1]?.querySelector(".desc-input")?.focus();
                }, 30);
                return;
            }
            if (e.key === "Tab" && !e.shiftKey) {
                const rowInputs = [...tr.querySelectorAll(".detail-input:not([disabled])")];
                if (rowInputs.indexOf(this) < rowInputs.length - 1) return;
                e.preventDefault();
                const ri = parseInt(tr.dataset.rowIdx);
                const allRows = [...document.querySelectorAll(`#costTableBody tr.cost-detail-row[data-item-id="${item.id}"]`)];
                const nextRow = allRows[ri + 1];
                if (nextRow) {
                    nextRow.querySelector(".desc-input")?.focus();
                } else {
                    pushUndo();
                    item.rows.push({ desc:"", n:1, l:"", w:"", h:"", hs:1 });
                    saveConstructionItems();
                    updateConstructionCostSection();
                    setTimeout(() => {
                        const rows = document.querySelectorAll(`#costTableBody tr.cost-detail-row[data-item-id="${item.id}"]`);
                        rows[rows.length - 1]?.querySelector(".desc-input")?.focus();
                    }, 30);
                }
            }
        });
    });
}

// ── Export ─────────────────────────────────────────────────────────────────
function exportEstimateCSV() {
    const rows = [["STT","Hạng mục","ĐVT","Diễn giải","Dài","Rộng","Cao","n","H.số","KL","Đơn giá","Thành tiền"]];
    let stt = 1;
    constructionItems.forEach(item => {
        const dims = WORK_ITEM_DIMS[item.workItemKey]?.dims || ["l","w","h"];
        const unitPrice = workItemPrices[item.workItemKey] ?? (item.unitPrice || 0);
        item.rows.forEach((row, ri) => {
            const qty = calcRowQty(row, dims);
            rows.push([
                ri === 0 ? stt : "",
                ri === 0 ? item.name : "",
                ri === 0 ? item.unit : "",
                row.desc || "",
                row.l || "", row.w || "", row.h || "",
                row.n || 1, row.hs || 1,
                formatNum(qty),
                ri === 0 ? unitPrice : "",
                ri === 0 ? Math.round(calcItemTotalQty(item) * unitPrice) : ""
            ]);
        });
        stt++;
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `DuToan_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
}

// ── Init ───────────────────────────────────────────────────────────────────
// auth.js handles login overlay + session check via its own DOMContentLoaded.
// We init the page immediately; elements are hidden until auth passes.
document.addEventListener("DOMContentLoaded", () => {
    initEstimatePage();
});

function initEstimatePage() {
    // Load state from localStorage
    const rawItems = localStorage.getItem("anlaa_cost_items");
    constructionItems = rawItems ? JSON.parse(rawItems) : [];

    const rawPrices = localStorage.getItem("anlaa_work_prices");
    if (rawPrices) {
        workItemPrices = JSON.parse(rawPrices);
    } else {
        Object.entries(DEFAULT_WORK_ITEM_PRICES).forEach(([k, v]) => { workItemPrices[k] = v.price; });
    }

    const rawCont = localStorage.getItem("anlaa_contingency");
    if (rawCont) { const c = JSON.parse(rawCont); contingencyEnabled = c.enabled; contingencyPct = c.pct; }

    // Init UI
    initWorkItemDatalist();
    renderWorkPricesTable();
    updateConstructionCostSection();

    // "Add item" button
    document.getElementById("btnAddCostItem")?.addEventListener("click", () => {
        pushUndo();
        constructionItems.push({ id: genId(), workItemKey: "custom", name: "", unit: "m²", isAuto: false, expanded: true, unitPrice: 0, rows: [{ desc:"", n:1, l:"", w:"", h:"", hs:1 }] });
        saveConstructionItems();
        updateConstructionCostSection();
        setTimeout(() => { const inputs = document.querySelectorAll(".cost-name-input"); inputs[inputs.length-1]?.focus(); }, 30);
    });

    // Contingency
    const toggle = document.getElementById("contingencyToggle");
    const pctInput = document.getElementById("contingencyPct");
    if (toggle) { toggle.checked = contingencyEnabled; toggle.addEventListener("change", () => { contingencyEnabled = toggle.checked; saveContingency(); updateConstructionCostTotals(); }); }
    if (pctInput) { pctInput.value = contingencyPct; pctInput.addEventListener("input", () => { contingencyPct = parseFloat(pctInput.value) || 0; saveContingency(); updateConstructionCostTotals(); }); }

    // Reset prices
    document.getElementById("btnResetWorkPrices")?.addEventListener("click", () => {
        if (!confirm("Khôi phục đơn giá mặc định Hà Nội?")) return;
        Object.entries(DEFAULT_WORK_ITEM_PRICES).forEach(([k, v]) => { workItemPrices[k] = v.price; });
        localStorage.setItem("anlaa_work_prices", JSON.stringify(workItemPrices));
        renderWorkPricesTable();
        updateConstructionCostSection();
        showToast("Đã khôi phục đơn giá mặc định!");
    });

    // Approve → materials.html
    document.getElementById("btnApprove")?.addEventListener("click", () => {
        if (constructionItems.length === 0) { showToast("Chưa có hạng mục nào trong bảng dự toán.", "error"); return; }
        localStorage.setItem("anlaa_approved_estimate", JSON.stringify({
            items: constructionItems,
            contingencyEnabled,
            contingencyPct,
            workItemPrices,
            timestamp: Date.now()
        }));
        window.location.href = "materials.html";
    });

    // Export buttons
    document.getElementById("btnExportEstimateCSV")?.addEventListener("click", exportEstimateCSV);
    document.getElementById("btnExportEstimateImage")?.addEventListener("click", () => {
        const el = document.getElementById("estimatePrintArea");
        if (!el || typeof html2canvas === "undefined") { showToast("Không thể xuất ảnh", "error"); return; }
        html2canvas(el, { backgroundColor: "#0d0e15", scale: 2 }).then(canvas => {
            const a = document.createElement("a");
            a.download = `DuToan_${new Date().toISOString().slice(0,10)}.png`;
            a.href = canvas.toDataURL("image/png");
            a.click();
        });
    });

    // Logout
    document.getElementById("logoutBtn")?.addEventListener("click", () => { clearSession(); location.reload(); });

    // Keyboard undo/redo
    document.addEventListener("keydown", (e) => {
        if (!(e.ctrlKey || e.metaKey)) return;
        const inTable = document.activeElement?.closest("#costTableBody, #estimatePrintArea");
        if (!inTable && document.activeElement !== document.body) return;
        if (e.key === "z" && !e.shiftKey) { e.preventDefault(); applyUndo(); }
        if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); applyRedo(); }
    });

    // 2-way sync: listen for changes made in other tabs (index.html ↔ estimate.html)
    window.addEventListener("storage", (e) => {
        if (e.key === "anlaa_cost_items" && e.newValue) {
            const incoming = JSON.parse(e.newValue);
            if (JSON.stringify(incoming) !== JSON.stringify(constructionItems)) {
                constructionItems = incoming;
                updateConstructionCostSection();
                setSyncBadge("syncing");
                setTimeout(() => setSyncBadge("synced"), 800);
            }
        }
        if (e.key === "anlaa_work_prices" && e.newValue) {
            workItemPrices = JSON.parse(e.newValue);
            updateConstructionCostSection();
        }
    });
}
