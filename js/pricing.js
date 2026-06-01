/**
 * Pricing page — Subcontractor comparison + Company selling price table
 * Reads constructionItems + workItemPrices from localStorage (written by app.js)
 */

// ─── State ────────────────────────────────────────────────────────────────────
let pricingItems = [];        // flat list of { id, name, unit, qty, workItemKey, costPrice, sectionName }
let activeDataSource = "estimate"; // "estimate" | templateId — controls which items tabs 1&2 show

let subState = {              // subcontractor comparison state
    names: ["Nhà thầu 1", "Nhà thầu 2", "Nhà thầu 3"],
    prices: [{}, {}, {}],     // prices[ntpIdx][itemId] = unitPrice
    chosen: {},               // chosen[itemId] = ntpIdx (0|1|2) | "lowest"
    notes: {},                // notes[itemId] = string
};
let sellState = {             // selling price state
    defaultMargin: 1.15,
    margins: {},              // margins[itemId] = multiplier
    overrideSell: {},         // overrideSell[itemId] = custom sell price (if user typed directly)
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatVND(v) {
    if (!v) return "0";
    return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " đ";
}
function fmt(v) {
    if (!v && v !== 0) return "";
    const n = parseFloat(v) || 0;
    return n === 0 ? "" : Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function escHtml(s) {
    return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ─── Load data from localStorage ─────────────────────────────────────────────
function loadPricingItems() {
    const rawItems = JSON.parse(localStorage.getItem("anlaa_cost_items") || "[]");
    const rawWorkPrices = JSON.parse(localStorage.getItem("anlaa_work_prices") || "{}");

    pricingItems = [];
    let currentSection = null;

    rawItems.forEach(item => {
        if (item.isSection) {
            currentSection = item.name || "Phần không tên";
            return;
        }
        if (item.isAuto) return; // skip auto-generated items for pricing comparison

        // Calculate total qty
        const dimDef = WORK_ITEM_DIMS[item.workItemKey];
        const dims = dimDef ? (dimDef.dims || []) : ["l", "w", "h"];
        const qty = (item.rows || []).reduce((sum, row) => {
            const n = parseFloat(row.n) || 1;
            const l = parseFloat(row.l) || 0;
            const w = parseFloat(row.w) || 0;
            const h = parseFloat(row.h) || 0;
            const hs = row.hs !== undefined ? parseFloat(row.hs) : 1;
            if (dims.length === 0) return sum + n * hs;
            if (!l) return sum;
            let q = l;
            if (dims.includes("w") && w) q *= w;
            if (dims.includes("h") && h) q *= h;
            return sum + q * n * hs;
        }, 0);

        // Cost price: materialPrice+laborPrice if set, else workItemPrices, else unitPrice
        let costPrice = 0;
        if (item.materialPrice !== undefined || item.laborPrice !== undefined) {
            costPrice = (parseFloat(item.materialPrice) || 0) + (parseFloat(item.laborPrice) || 0);
        } else {
            costPrice = rawWorkPrices[item.workItemKey] !== undefined
                ? rawWorkPrices[item.workItemKey]
                : (item.unitPrice || 0);
        }

        pricingItems.push({
            id: item.id,
            workItemKey: item.workItemKey || "custom",
            name: item.name || (dimDef ? dimDef.label : "Hạng mục"),
            unit: item.unit || (dimDef ? dimDef.unit : "m²"),
            qty: qty,
            costPrice: costPrice,
            sectionName: currentSection,
            note: item.note || "",
        });
    });
}

// Build pricingItems from a PROJECT_TEMPLATE (qty=0, id=workItemKey for state keying)
function buildPricingItemsFromTemplate(tplId) {
    const tpl = PROJECT_TEMPLATES.find(t => t.id === tplId);
    if (!tpl) return;
    const rawWorkPrices = JSON.parse(localStorage.getItem("anlaa_work_prices") || "{}");
    pricingItems = [];
    const seen = new Set(); // deduplicate by key within template
    tpl.sections.forEach(sec => {
        sec.items.forEach(item => {
            const key = item.key || "custom";
            const rowId = key === "custom" ? ("custom::" + item.name) : key;
            if (seen.has(rowId)) return;
            seen.add(rowId);
            const dimDef = WORK_ITEM_DIMS[key];
            const wip = DEFAULT_WORK_ITEM_PRICES[key];
            const costPrice = rawWorkPrices[key] !== undefined
                ? rawWorkPrices[key]
                : (wip ? wip.price : (item.price || 0));
            pricingItems.push({
                id: rowId,           // use key as stable id for NTP/sell state
                workItemKey: key,
                name: item.name || (dimDef ? dimDef.label : key),
                unit: item.unit || (dimDef ? dimDef.unit : "m²"),
                qty: 0,              // no quantities — template is abstract
                costPrice,
                sectionName: sec.name,
                note: "",
            });
        });
    });
}

// ─── Data Source Bar ──────────────────────────────────────────────────────────
function initSourceBar() {
    const container = document.getElementById("prxSourceBtns");
    if (!container) return;

    // Add template buttons
    PROJECT_TEMPLATES.forEach(tpl => {
        const btn = document.createElement("button");
        btn.className = "prx-source-btn";
        btn.dataset.source = tpl.id;
        btn.title = tpl.desc;
        btn.innerHTML = `<i data-lucide="${tpl.icon}" style="width:12px;height:12px;"></i> ${tpl.name}`;
        container.appendChild(btn);
    });

    container.addEventListener("click", e => {
        const btn = e.target.closest(".prx-source-btn");
        if (!btn) return;
        setActiveSource(btn.dataset.source);
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
}

function setActiveSource(sourceId) {
    activeDataSource = sourceId;

    // Update button styles
    document.querySelectorAll(".prx-source-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.source === sourceId);
    });

    // Reload pricingItems
    if (sourceId === "estimate") {
        loadPricingItems();
        const noteEl = document.getElementById("prxSourceNote");
        if (noteEl) noteEl.textContent = `${pricingItems.length} hạng mục từ dự toán`;
    } else {
        buildPricingItemsFromTemplate(sourceId);
        const tpl = PROJECT_TEMPLATES.find(t => t.id === sourceId);
        const noteEl = document.getElementById("prxSourceNote");
        if (noteEl) noteEl.textContent = `${pricingItems.length} hạng mục — ${tpl?.name || sourceId} (KL = 0, nhập đơn giá để so sánh)`;
    }

    // Re-render active panel
    const activeTab = document.querySelector(".prx-tab.active")?.dataset.tab;
    if (activeTab === "subcontractor") renderSubTable();
    else if (activeTab === "selling") renderSellTable();
    else if (activeTab === "templates") renderTemplateCatalog();

    // Update NTP column headers in template tab
    _syncTplNtpHeaders();
}

function _syncTplNtpHeaders() {
    const n = subState.names || ["NTP1","NTP2","NTP3"];
    ["tplThNtp1","tplThNtp2","tplThNtp3"].forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.textContent = n[i] || `NTP${i+1}`;
    });
}

function saveSubState() {
    localStorage.setItem("anlaa_sub_state", JSON.stringify(subState));
}
function loadSubState() {
    try {
        const s = JSON.parse(localStorage.getItem("anlaa_sub_state") || "null");
        if (s) {
            subState.names = s.names || subState.names;
            subState.prices = s.prices || [{}, {}, {}];
            subState.chosen = s.chosen || {};
            subState.notes = s.notes || {};
            subState.contractorIds = s.contractorIds || [null, null, null];
        }
    } catch {}
}

// ─── Contractor integration ───────────────────────────────────────────────────

let contractorList = []; // cached from API

async function fetchContractorList() {
    try {
        const res = await fetch("/api/contractors?status=active", {
            headers: { Authorization: "Bearer " + localStorage.getItem("anlaa_token") }
        });
        if (!res.ok) return [];
        return await res.json();
    } catch { return []; }
}

function buildNtpOptions(selectedId) {
    const blank = `<option value="">— Chọn nhà thầu —</option>`;
    const opts = contractorList.map(c => {
        const stars = "★".repeat(c.rating || 0);
        const loc = c.district ? ` · ${c.district}` : "";
        return `<option value="${c.id}" ${String(c.id) === String(selectedId) ? "selected" : ""}>${escHtml(c.name)}${loc} ${stars}</option>`;
    });
    return blank + opts.join("");
}

async function populateNtpSelectors() {
    contractorList = await fetchContractorList();
    if (!subState.contractorIds) subState.contractorIds = [null, null, null];

    ["ntp1Select", "ntp2Select", "ntp3Select"].forEach((selId, i) => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        sel.innerHTML = buildNtpOptions(subState.contractorIds[i]);
        sel.addEventListener("change", () => onNtpSelected(i, sel.value));
    });

    // Show status of loaded prices
    updateNtpLoadStatus();
}

function onNtpSelected(slotIdx, contractorIdStr) {
    const cid = contractorIdStr ? parseInt(contractorIdStr) : null;
    subState.contractorIds[slotIdx] = cid;

    if (cid) {
        const c = contractorList.find(x => x.id === cid);
        if (c) {
            subState.names[slotIdx] = c.name;
            loadPricesFromContractor(slotIdx, c);
        }
    } else {
        subState.names[slotIdx] = `Nhà thầu ${slotIdx + 1}`;
        // Don't clear prices — user may want to keep them
    }

    saveSubState();
    renderSubTable();
    updateNtpLoadStatus();
}

function loadPricesFromContractor(slotIdx, contractor) {
    let pn = {};
    try {
        pn = typeof contractor.price_notes === "string"
            ? JSON.parse(contractor.price_notes || "{}")
            : (contractor.price_notes || {});
    } catch {}

    // Map workItemKey → price, match against pricingItems by workItemKey
    let loaded = 0;
    pricingItems.forEach(item => {
        const p = pn[item.workItemKey];
        if (p && p > 0) {
            subState.prices[slotIdx][item.id] = p;
            loaded++;
        }
    });

    if (loaded > 0) {
        showToast(`📥 Đã tải ${loaded} đơn giá từ hồ sơ "${contractor.name}"`);
    } else {
        showToast(`ℹ️ Hồ sơ "${contractor.name}" chưa có đơn giá. Nhập vào bảng để lưu lại.`);
    }
}

function updateNtpLoadStatus() {
    const statusEl = document.getElementById("ntpLoadStatus");
    if (!statusEl) return;
    const loaded = (subState.contractorIds || []).filter(Boolean).length;
    if (loaded === 0) {
        statusEl.style.display = "none";
        return;
    }
    statusEl.style.display = "block";
    const names = (subState.contractorIds || []).map((cid, i) => {
        if (!cid) return null;
        const c = contractorList.find(x => x.id === cid);
        return c ? `<span style="color:${["#60a5fa","#34d399","#f59e0b"][i]};font-weight:600;">${escHtml(c.name)}</span>` : null;
    }).filter(Boolean);
    statusEl.innerHTML = `Đang so sánh: ${names.join(" · ")} · <a href="contractors.html" style="color:#00f2fe;text-decoration:none;">Quản lý danh sách NTP</a>`;
}

async function savePricesToContractor(slotIdx) {
    const cid = (subState.contractorIds || [])[slotIdx];
    if (!cid) {
        showToast("Chưa chọn nhà thầu cho slot này");
        return;
    }
    const c = contractorList.find(x => x.id === cid);
    if (!c) return;

    // Build price_notes from current prices in this slot
    const existingPn = (() => {
        try { return JSON.parse(c.price_notes || "{}"); } catch { return {}; }
    })();
    let updated = 0;
    pricingItems.forEach(item => {
        const p = parseFloat(subState.prices[slotIdx][item.id]) || 0;
        if (p > 0) { existingPn[item.workItemKey] = p; updated++; }
    });

    if (updated === 0) { showToast("Chưa có đơn giá nào để lưu"); return; }

    try {
        const res = await fetch(`/api/contractors/${cid}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + localStorage.getItem("anlaa_token")
            },
            body: JSON.stringify({ price_notes: JSON.stringify(existingPn) })
        });
        if (!res.ok) throw new Error("Lỗi lưu");
        // Refresh local cache
        const updated_c = await res.json();
        const idx = contractorList.findIndex(x => x.id === cid);
        if (idx >= 0) contractorList[idx] = updated_c;
        showToast(`✅ Đã lưu ${updated} đơn giá vào hồ sơ "${c.name}"`);
    } catch (e) {
        showToast("❌ " + e.message);
    }
}
function saveSellState() {
    localStorage.setItem("anlaa_sell_state", JSON.stringify(sellState));
}
function loadSellState() {
    try {
        const s = JSON.parse(localStorage.getItem("anlaa_sell_state") || "null");
        if (s) {
            sellState.defaultMargin = s.defaultMargin || 1.15;
            sellState.margins = s.margins || {};
            sellState.overrideSell = s.overrideSell || {};
        }
    } catch {}
}

// ─── Tab switching ────────────────────────────────────────────────────────────
function switchTab(tabName) {
    document.querySelectorAll(".prx-tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".prx-panel").forEach(p => p.classList.remove("active"));
    const btn = document.querySelector(`.prx-tab[data-tab="${tabName}"]`);
    if (btn) btn.classList.add("active");
    document.getElementById("panel-" + tabName)?.classList.add("active");
    if (tabName === "selling") renderSellTable();
    if (tabName === "templates") renderTemplateCatalog();
}

// Switch tab then scroll to + highlight the row with matching data-work-key
function switchToTabAndHighlight(tabName, workItemKey) {
    switchTab(tabName);
    // Wait for render then find and highlight
    requestAnimationFrame(() => {
        const row = document.querySelector(`[data-work-key="${CSS.escape(workItemKey)}"]`);
        if (!row) return;
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        row.classList.add("row-highlight-flash");
        setTimeout(() => row.classList.remove("row-highlight-flash"), 1800);
    });
}

function initTabs() {
    document.querySelectorAll(".prx-tab").forEach(btn => {
        btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
}

// ─── SUBCONTRACTOR TABLE ──────────────────────────────────────────────────────
function renderSubTable() {
    const tbody = document.getElementById("subTableBody");
    if (!tbody) return;

    if (pricingItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="empty-boq-msg">
            Chưa có hạng mục. <a href="estimate.html">→ Về bảng dự toán</a> để thêm hạng mục trước.
        </td></tr>`;
        document.getElementById("subSummary").style.display = "none";
        return;
    }

    // Update table headers with NTP names
    const thNtp = document.querySelectorAll(".th-ntp1, .th-ntp2, .th-ntp3");
    if (thNtp[0]) thNtp[0].textContent = `ĐG / T.Tiền — ${subState.names[0]}`;
    if (thNtp[1]) thNtp[1].textContent = `ĐG / T.Tiền — ${subState.names[1]}`;
    if (thNtp[2]) thNtp[2].textContent = `ĐG / T.Tiền — ${subState.names[2]}`;

    let html = "";
    let stt = 0;
    let lastSection = null;
    let grandTotals = [0, 0, 0];

    pricingItems.forEach(item => {
        // Section separator
        if (item.sectionName !== lastSection) {
            lastSection = item.sectionName;
            if (lastSection) {
                html += `<tr class="section-row"><td colspan="12">${escHtml(lastSection)}</td></tr>`;
            }
        }

        stt++;
        const qty = item.qty;
        const prices = [0, 1, 2].map(i => parseFloat(subState.prices[i][item.id]) || 0);
        const totals = prices.map(p => p * qty);

        // Find cheapest among those with price > 0
        const validTotals = totals.filter(t => t > 0);
        const minTotal = validTotals.length > 0 ? Math.min(...validTotals) : 0;

        totals.forEach(t => { if (t > 0) grandTotals[[...totals].indexOf(t)] += t; });
        // Correct grand total accumulation
        [0,1,2].forEach(i => { if (totals[i] > 0) grandTotals[i] += totals[i]; });

        const chosen = subState.chosen[item.id] !== undefined ? subState.chosen[item.id] : -1;

        const itemTplBadge = buildItemTemplateBadge(item.workItemKey);
        html += `<tr data-item-id="${item.id}" data-work-key="${escHtml(item.workItemKey || "")}">
            <td class="td-stt">${stt}</td>
            <td class="td-name">
                ${escHtml(item.name)}
                ${itemTplBadge}
            </td>
            <td class="td-unit">${escHtml(item.unit)}</td>
            <td class="td-qty">${qty > 0 ? qty.toFixed(2) : "—"}</td>`;

        [0,1,2].forEach(i => {
            const p = prices[i];
            const t = totals[i];
            const isCheapest = t > 0 && t === minTotal;
            html += `
            <td class="ntp${i+1}">
                <input class="ntp-price-input" type="number" data-item="${item.id}" data-ntp="${i}"
                    value="${p || ""}" min="0" step="1000" placeholder="—">
            </td>
            <td><span class="ntp-total ${isCheapest ? "cheapest" : ""}" data-total="${item.id}-${i}">
                ${t > 0 ? formatVND(t) : "—"}
            </span></td>`;
        });

        html += `
            <td class="td-choose">
                <select class="contingency-input chosen-sel" data-item="${item.id}" style="width:68px;font-size:11px;padding:2px 4px;">
                    <option value="-1" ${chosen === -1 ? "selected" : ""}>—</option>
                    <option value="0" ${chosen === 0 ? "selected" : ""}>${escHtml(subState.names[0] || "NTP1")}</option>
                    <option value="1" ${chosen === 1 ? "selected" : ""}>${escHtml(subState.names[1] || "NTP2")}</option>
                    <option value="2" ${chosen === 2 ? "selected" : ""}>${escHtml(subState.names[2] || "NTP3")}</option>
                    <option value="lowest" ${chosen === "lowest" ? "selected" : ""}>Rẻ nhất</option>
                </select>
            </td>
            <td class="td-note">
                <input class="ntp-note-input detail-input" type="text" data-item="${item.id}"
                    value="${escHtml(subState.notes[item.id] || "")}" placeholder="Ghi chú..." style="width:100%;">
            </td>
        </tr>`;
    });

    // Grand total row — recalculate cleanly
    const cleanTotals = [0, 0, 0];
    pricingItems.forEach(item => {
        const qty = item.qty;
        [0,1,2].forEach(i => {
            const p = parseFloat(subState.prices[i][item.id]) || 0;
            cleanTotals[i] += p * qty;
        });
    });
    const minClean = Math.min(...cleanTotals.filter(t => t > 0));
    html += `<tr class="grand-total-row">
        <td></td><td colspan="3" style="font-weight:800;color:var(--text-primary);">TỔNG CỘNG</td>`;
    [0,1,2].forEach(i => {
        const t = cleanTotals[i];
        const isCheapest = t > 0 && t === minClean;
        html += `<td></td><td><span class="ntp-total grand ${isCheapest ? "cheapest" : ""}">${t > 0 ? formatVND(t) : "—"}</span></td>`;
    });
    html += `<td></td><td></td></tr>`;

    tbody.innerHTML = html;
    wireSubEvents(tbody);
    renderSubSummary(cleanTotals);
}

function renderSubSummary(totals) {
    const el = document.getElementById("subSummary");
    if (!el) return;
    const names = subState.names;
    const minT = Math.min(...totals.filter(t => t > 0));
    el.style.display = "flex";
    el.style.gap = "16px";
    el.style.flexWrap = "wrap";
    el.innerHTML = [0,1,2].map(i => {
        const t = totals[i];
        const isBest = t > 0 && t === minT;
        const diffPct = !isBest && t > 0 && minT > 0 ? `(+${(((t - minT) / minT) * 100).toFixed(1)}%)` : "";
        return `<div style="padding:12px 16px;border-radius:8px;border:1px solid ${isBest ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.08)"};background:${isBest ? "rgba(52,211,153,0.07)" : "rgba(255,255,255,0.03)"}">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:${["#60a5fa","#34d399","#f59e0b"][i]};margin-bottom:4px;">${escHtml(names[i])}</div>
            <div style="font-size:18px;font-weight:800;color:${isBest ? "#34d399" : "var(--text-primary)"};">${t > 0 ? formatVND(t) : "Chưa có giá"}</div>
            ${isBest ? '<div style="font-size:11px;color:#34d399;margin-top:2px;">✓ Thấp nhất</div>' : `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${diffPct}</div>`}
        </div>`;
    }).join("");
}

function wireSubEvents(tbody) {
    // Price inputs
    tbody.querySelectorAll(".ntp-price-input").forEach(input => {
        input.addEventListener("focus", function() { this.select(); });
        input.addEventListener("input", function() {
            const itemId = this.dataset.item;
            const ntp = parseInt(this.dataset.ntp);
            const val = parseFloat(this.value) || 0;
            subState.prices[ntp][itemId] = val;
            saveSubState();
            // Live update this row's totals
            updateSubRow(itemId);
        });
    });
    // Chosen select
    tbody.querySelectorAll(".chosen-sel").forEach(sel => {
        sel.addEventListener("change", function() {
            const itemId = this.dataset.item;
            const val = this.value === "-1" ? -1 : (this.value === "lowest" ? "lowest" : parseInt(this.value));
            subState.chosen[itemId] = val;
            saveSubState();
        });
    });
    // Note input
    tbody.querySelectorAll(".ntp-note-input").forEach(input => {
        input.addEventListener("input", function() {
            subState.notes[this.dataset.item] = this.value;
            saveSubState();
        });
    });
}

function updateSubRow(itemId) {
    const item = pricingItems.find(x => x.id === itemId);
    if (!item) return;
    const qty = item.qty;
    const prices = [0,1,2].map(i => parseFloat(subState.prices[i][itemId]) || 0);
    const totals = prices.map(p => p * qty);
    const validTotals = totals.filter(t => t > 0);
    const minT = validTotals.length ? Math.min(...validTotals) : 0;
    [0,1,2].forEach(i => {
        const el = document.querySelector(`[data-total="${itemId}-${i}"]`);
        if (!el) return;
        const t = totals[i];
        el.textContent = t > 0 ? formatVND(t) : "—";
        el.className = `ntp-total ${t > 0 && t === minT ? "cheapest" : ""}`;
    });
    // Recalculate grand row
    const cleanTotals = [0,0,0];
    pricingItems.forEach(it => {
        [0,1,2].forEach(i => { cleanTotals[i] += (parseFloat(subState.prices[i][it.id]) || 0) * it.qty; });
    });
    const minClean = Math.min(...cleanTotals.filter(t => t > 0));
    document.querySelectorAll(".ntp-total.grand").forEach((el, i) => {
        const t = cleanTotals[i];
        el.textContent = t > 0 ? formatVND(t) : "—";
        el.className = `ntp-total grand ${t > 0 && t === minClean ? "cheapest" : ""}`;
    });
    renderSubSummary(cleanTotals);
}

// Apply lowest price to estimate
function applyLowestPrices() {
    const costItems = JSON.parse(localStorage.getItem("anlaa_cost_items") || "[]");
    let changed = 0;
    pricingItems.forEach(item => {
        const prices = [0,1,2].map(i => parseFloat(subState.prices[i][item.id]) || 0).filter(p => p > 0);
        if (prices.length === 0) return;
        const min = Math.min(...prices);
        const ci = costItems.find(x => x.id === item.id);
        if (ci) {
            ci.materialPrice = min;
            ci.laborPrice = 0;
            changed++;
        }
    });
    localStorage.setItem("anlaa_cost_items", JSON.stringify(costItems));
    showToast(`✅ Đã áp dụng giá thấp nhất cho ${changed} hạng mục → bảng dự toán`);
}

// Apply chosen NTP
function applyChosenNTP() {
    const costItems = JSON.parse(localStorage.getItem("anlaa_cost_items") || "[]");
    let changed = 0;
    // Find dominant chosen NTP
    const votes = [0, 0, 0];
    pricingItems.forEach(item => {
        const c = subState.chosen[item.id];
        if (typeof c === "number" && c >= 0) votes[c]++;
    });
    const selectedNTP = votes.indexOf(Math.max(...votes));

    pricingItems.forEach(item => {
        let ntpIdx = subState.chosen[item.id];
        if (ntpIdx === "lowest") {
            const prices = [0,1,2].map(i => parseFloat(subState.prices[i][item.id]) || 0);
            const valid = prices.filter(p => p > 0);
            if (valid.length) ntpIdx = prices.indexOf(Math.min(...valid));
        } else if (ntpIdx === -1 || ntpIdx === undefined) {
            ntpIdx = selectedNTP; // fallback to majority
        }
        const price = parseFloat(subState.prices[ntpIdx]?.[item.id]) || 0;
        if (price <= 0) return;
        const ci = costItems.find(x => x.id === item.id);
        if (ci) { ci.materialPrice = price; ci.laborPrice = 0; changed++; }
    });
    localStorage.setItem("anlaa_cost_items", JSON.stringify(costItems));
    showToast(`✅ Đã áp dụng giá NTP được chọn cho ${changed} hạng mục → bảng dự toán`);
}

// ─── SELLING PRICE TABLE ──────────────────────────────────────────────────────
function renderSellTable() {
    const tbody = document.getElementById("sellTableBody");
    if (!tbody) return;

    if (pricingItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="empty-boq-msg">
            Chưa có hạng mục. <a href="estimate.html">→ Về bảng dự toán</a>
        </td></tr>`;
        document.getElementById("sellSummary").style.display = "none";
        return;
    }

    const defMargin = parseFloat(document.getElementById("defaultMargin")?.value) || 1.15;
    let totalCost = 0, totalSell = 0;
    let html = "";
    let stt = 0;
    let lastSection = null;

    pricingItems.forEach(item => {
        if (item.sectionName !== lastSection) {
            lastSection = item.sectionName;
            if (lastSection) html += `<tr class="section-row"><td colspan="10">${escHtml(lastSection)}</td></tr>`;
        }
        stt++;
        const qty = item.qty;
        const cost = item.costPrice;
        const margin = sellState.margins[item.id] !== undefined ? sellState.margins[item.id] : defMargin;
        const sellUnit = sellState.overrideSell[item.id] !== undefined
            ? parseFloat(sellState.overrideSell[item.id]) || 0
            : cost * margin;
        const costTotal = cost * qty;
        const sellTotal = sellUnit * qty;
        const profitPct = cost > 0 ? (((sellUnit - cost) / cost) * 100).toFixed(1) : null;
        totalCost += costTotal;
        totalSell += sellTotal;

        const sellTplBadge = buildItemTemplateBadge(item.workItemKey);
        html += `<tr data-item-id="${item.id}" data-work-key="${escHtml(item.workItemKey || "")}">
            <td class="td-stt">${stt}</td>
            <td class="td-name">
                ${escHtml(item.name)}
                ${sellTplBadge}
            </td>
            <td class="td-unit">${escHtml(item.unit)}</td>
            <td class="td-qty">${qty > 0 ? qty.toFixed(2) : "—"}</td>
            <td class="td-cost">${cost > 0 ? formatVND(cost) : "—"}</td>
            <td style="text-align:right;color:#f59e0b;font-size:12px;">${costTotal > 0 ? formatVND(costTotal) : "—"}</td>
            <td style="text-align:center;">
                <input class="td-margin-input sell-margin-row" type="number" data-item="${item.id}"
                    value="${margin.toFixed(2)}" min="0.5" max="20" step="0.01">
            </td>
            <td class="td-sell-price">
                <input class="ntp-price-input sell-unit-input" type="number" data-item="${item.id}"
                    value="${sellUnit > 0 ? Math.round(sellUnit) : ""}" min="0" step="1000" placeholder="—"
                    style="width:100px;" title="Sửa trực tiếp giá bán đơn vị">
            </td>
            <td class="td-sell-price">${sellTotal > 0 ? formatVND(sellTotal) : "—"}</td>
            <td class="td-profit-pct ${profitPct !== null ? (parseFloat(profitPct) >= 0 ? "positive" : "negative") : ""}">
                ${profitPct !== null ? profitPct + "%" : "—"}
            </td>
        </tr>`;
    });

    // Grand total row
    const totalProfit = totalSell - totalCost;
    const totalMarginPct = totalCost > 0 ? (((totalSell - totalCost) / totalCost) * 100).toFixed(1) : 0;
    html += `<tr class="grand-total-row">
        <td></td><td colspan="3" style="font-weight:800;">TỔNG CỘNG</td>
        <td></td>
        <td style="text-align:right;color:#f59e0b;font-weight:800;">${formatVND(totalCost)}</td>
        <td></td>
        <td></td>
        <td class="td-sell-price" style="font-size:14px;">${formatVND(totalSell)}</td>
        <td class="td-profit-pct ${totalProfit >= 0 ? "positive" : "negative"}" style="font-size:12px;font-weight:700;">
            ${totalMarginPct}%
        </td>
    </tr>`;

    tbody.innerHTML = html;
    wireSellEvents(tbody);

    // Update summary bar
    const sumEl = document.getElementById("sellSummary");
    if (sumEl) {
        sumEl.style.display = "flex";
        document.getElementById("totalCost").textContent = formatVND(totalCost);
        document.getElementById("totalSell").textContent = formatVND(totalSell);
        document.getElementById("totalProfit").textContent = formatVND(totalProfit);
        document.getElementById("totalMarginPct").textContent = totalMarginPct + "%";
    }
}

function wireSellEvents(tbody) {
    tbody.querySelectorAll(".sell-margin-row").forEach(input => {
        input.addEventListener("focus", function() { this.select(); });
        input.addEventListener("input", function() {
            const v = parseFloat(this.value) || 1;
            sellState.margins[this.dataset.item] = v;
            delete sellState.overrideSell[this.dataset.item];
            saveSellState();
            renderSellTable();
        });
    });
    tbody.querySelectorAll(".sell-unit-input").forEach(input => {
        input.addEventListener("focus", function() { this.select(); });
        input.addEventListener("change", function() {
            const v = parseFloat(this.value) || 0;
            if (v > 0) sellState.overrideSell[this.dataset.item] = v;
            else delete sellState.overrideSell[this.dataset.item];
            saveSellState();
            renderSellTable();
        });
    });
}

function applySellToEstimate() {
    const costItems = JSON.parse(localStorage.getItem("anlaa_cost_items") || "[]");
    const defMargin = parseFloat(document.getElementById("defaultMargin")?.value) || 1.15;
    let changed = 0;
    pricingItems.forEach(item => {
        const cost = item.costPrice;
        const margin = sellState.margins[item.id] !== undefined ? sellState.margins[item.id] : defMargin;
        const sellUnit = sellState.overrideSell[item.id] !== undefined
            ? parseFloat(sellState.overrideSell[item.id]) || 0
            : cost * margin;
        if (sellUnit <= 0) return;
        const ci = costItems.find(x => x.id === item.id);
        if (ci) { ci.materialPrice = sellUnit; ci.laborPrice = 0; changed++; }
    });
    localStorage.setItem("anlaa_cost_items", JSON.stringify(costItems));
    showToast(`✅ Đã ghi giá bán vào ${changed} hạng mục trong bảng dự toán`);
}

// ─── CSV exports ──────────────────────────────────────────────────────────────
function exportSubCSV() {
    const n = subState.names;
    const rows = [["STT", "Hạng mục", "ĐVT", "KL",
        `ĐG ${n[0]}`, `T.Tiền ${n[0]}`,
        `ĐG ${n[1]}`, `T.Tiền ${n[1]}`,
        `ĐG ${n[2]}`, `T.Tiền ${n[2]}`,
        "Chọn", "Ghi chú"]];
    let stt = 0;
    pricingItems.forEach(item => {
        stt++;
        const qty = item.qty;
        const prices = [0,1,2].map(i => parseFloat(subState.prices[i][item.id]) || 0);
        const totals = prices.map(p => p * qty);
        const cIdx = subState.chosen[item.id];
        const chosenName = cIdx === "lowest" ? "Rẻ nhất" : cIdx >= 0 ? n[cIdx] : "—";
        rows.push([stt, item.name, item.unit, qty.toFixed(2),
            prices[0], totals[0], prices[1], totals[1], prices[2], totals[2],
            chosenName, subState.notes[item.id] || ""]);
    });
    downloadCSV(rows, "so-sanh-nha-thau.csv");
}

function exportSellCSV() {
    const defMargin = parseFloat(document.getElementById("defaultMargin")?.value) || 1.15;
    const rows = [["STT", "Hạng mục", "ĐVT", "KL", "Đơn giá vốn", "Tổng vốn", "Hệ số", "Đơn giá bán", "Thành tiền bán", "LN%"]];
    let stt = 0;
    pricingItems.forEach(item => {
        stt++;
        const qty = item.qty;
        const cost = item.costPrice;
        const margin = sellState.margins[item.id] !== undefined ? sellState.margins[item.id] : defMargin;
        const sellUnit = sellState.overrideSell[item.id] !== undefined ? parseFloat(sellState.overrideSell[item.id]) || 0 : cost * margin;
        const profitPct = cost > 0 ? (((sellUnit - cost) / cost) * 100).toFixed(1) : "";
        rows.push([stt, item.name, item.unit, qty.toFixed(2), cost, cost * qty, margin.toFixed(2), Math.round(sellUnit), Math.round(sellUnit * qty), profitPct]);
    });
    downloadCSV(rows, "bang-gia-ban.csv");
}

function downloadCSV(rows, filename) {
    const bom = "﻿";
    const csv = bom + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg) {
    let t = document.getElementById("pricingToast");
    if (!t) {
        t = document.createElement("div");
        t.id = "pricingToast";
        t.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(22,25,37,0.97);border:1px solid rgba(0,242,254,0.3);color:#e2e8f0;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;transition:opacity 0.3s;";
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = "1";
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = "0"; }, 3000);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    // Auth check
    if (typeof initAuth === "function") initAuth();

    loadPricingItems();
    loadSubState();
    loadSellState();
    initTabs();

    // Populate NTP dropdowns from contractors API
    populateNtpSelectors();

    // Save-to-contractor buttons
    document.querySelectorAll(".ntp-save-btn").forEach(btn => {
        btn.addEventListener("click", () => savePricesToContractor(parseInt(btn.dataset.slot)));
    });

    // Default margin input
    const defMarginEl = document.getElementById("defaultMargin");
    if (defMarginEl) {
        defMarginEl.value = sellState.defaultMargin.toFixed(2);
        defMarginEl.addEventListener("input", function() {
            const v = parseFloat(this.value) || 1;
            sellState.defaultMargin = v;
            saveSellState();
            const pctEl = document.getElementById("defaultMarginPct");
            if (pctEl) pctEl.textContent = ((v - 1) * 100).toFixed(0);
            renderSellTable();
        });
        // Init pct display
        const pctEl = document.getElementById("defaultMarginPct");
        if (pctEl) pctEl.textContent = ((sellState.defaultMargin - 1) * 100).toFixed(0);
    }

    // Apply margin to all button
    document.getElementById("btnApplyMarginAll")?.addEventListener("click", () => {
        const defMargin = parseFloat(document.getElementById("defaultMargin")?.value) || 1.15;
        pricingItems.forEach(item => { sellState.margins[item.id] = defMargin; });
        sellState.overrideSell = {};
        saveSellState();
        renderSellTable();
        showToast(`Đã áp hệ số ×${defMargin.toFixed(2)} cho tất cả hạng mục`);
    });

    document.getElementById("btnApplySellToEstimate")?.addEventListener("click", applySellToEstimate);
    document.getElementById("btnApplyLowest")?.addEventListener("click", () => { applyLowestPrices(); });
    document.getElementById("btnApplySelected")?.addEventListener("click", () => { applyChosenNTP(); });
    document.getElementById("btnExportSubCSV")?.addEventListener("click", exportSubCSV);
    document.getElementById("btnExportSellCSV")?.addEventListener("click", exportSellCSV);
    document.getElementById("btnPrintPricing")?.addEventListener("click", () => window.print());
    document.getElementById("btnResetNTP")?.addEventListener("click", () => {
        if (!confirm("Xóa toàn bộ đơn giá NTP đã nhập?")) return;
        subState.prices = [{}, {}, {}];
        saveSubState();
        renderSubTable();
    });

    // Render initial table
    renderSubTable();

    // Template catalog
    initTemplateCatalog();

    if (typeof lucide !== "undefined") lucide.createIcons();
});

// ─── Cross-tab helpers ────────────────────────────────────────────────────────

// Build a small clickable badge showing which templates use this work item key
// Clicking it navigates to Templates tab filtered to that template
function buildItemTemplateBadge(workItemKey) {
    if (!workItemKey || workItemKey === "custom") return "";
    const itemTemplateMap = buildItemTemplateMap();
    const usedIn = itemTemplateMap[workItemKey] || [];
    if (usedIn.length === 0) return "";
    const uniqueIds = [...new Set(usedIn.map(u => u.templateId))];
    const count = uniqueIds.length;
    const title = uniqueIds.map(id => PROJECT_TEMPLATES.find(t => t.id === id)?.name || id).join(", ");
    return `<span class="cross-tab-badge"
        onclick="switchToTabAndHighlight('templates','${workItemKey}')"
        title="Xem trong Template: ${escHtml(title)}">${count} template</span>`;
}

// ─── Template Catalog (Panel 3) ───────────────────────────────────────────────

// Build a map: workItemKey → array of { templateId, templateName, sectionName }
function buildItemTemplateMap() {
    const map = {}; // key → [{templateId, templateName, sectionName}]
    PROJECT_TEMPLATES.forEach(tpl => {
        tpl.sections.forEach(sec => {
            sec.items.forEach(item => {
                const k = item.key || "custom";
                if (!map[k]) map[k] = [];
                map[k].push({ templateId: tpl.id, templateName: tpl.name, sectionName: sec.name });
            });
        });
    });
    return map;
}

// Build flat list of unique catalog rows (one per workItemKey across all templates)
// Returns [{ key, name, unit, defaultPrice, templates: [{templateId, templateName, sectionName}], isCustom }]
function buildCatalogRows() {
    const itemTemplateMap = buildItemTemplateMap();
    const savedPrices = JSON.parse(localStorage.getItem("anlaa_work_prices") || "{}");
    const rows = [];
    const seen = new Set();

    PROJECT_TEMPLATES.forEach(tpl => {
        tpl.sections.forEach(sec => {
            sec.items.forEach(item => {
                const k = item.key || "custom";
                if (k === "custom") {
                    // Custom items: each occurrence is unique (by name)
                    const rowKey = "custom::" + item.name;
                    if (!seen.has(rowKey)) {
                        seen.add(rowKey);
                        rows.push({
                            key: "custom",
                            name: item.name,
                            unit: item.unit || "m²",
                            defaultPrice: item.price || 0,
                            savedPrice: null,
                            templates: itemTemplateMap["custom"] ? [] : [],
                            usedIn: [{ templateId: tpl.id, templateName: tpl.name, sectionName: sec.name }],
                            isCustom: true,
                            _rowKey: rowKey,
                        });
                    } else {
                        const existing = rows.find(r => r._rowKey === rowKey);
                        if (existing) existing.usedIn.push({ templateId: tpl.id, templateName: tpl.name, sectionName: sec.name });
                    }
                } else {
                    if (!seen.has(k)) {
                        seen.add(k);
                        const dimDef = WORK_ITEM_DIMS[k];
                        const wip = DEFAULT_WORK_ITEM_PRICES[k];
                        rows.push({
                            key: k,
                            name: dimDef ? dimDef.label : (wip ? wip.name : k),
                            unit: dimDef ? dimDef.unit : (wip ? wip.unit : "m²"),
                            defaultPrice: wip ? wip.price : 0,
                            savedPrice: savedPrices[k] != null ? savedPrices[k] : null,
                            templates: itemTemplateMap[k] || [],
                            usedIn: itemTemplateMap[k] || [],
                            isCustom: false,
                            _rowKey: k,
                        });
                    }
                }
            });
        });
    });

    return rows;
}

let tplActiveFilter = "all";
let tplCatalogRows = [];
let tplModifiedPrices = {}; // key → new price (before saving)

function initTemplateCatalog() {
    tplCatalogRows = buildCatalogRows();

    // Build filter buttons
    const filterContainer = document.getElementById("tplFilterBtns");
    if (filterContainer) {
        // Remove placeholder "Tất cả" added in HTML and rebuild
        filterContainer.innerHTML = `<button class="tpl-filter-btn active" data-filter="all">Tất cả (${tplCatalogRows.length})</button>`;
        PROJECT_TEMPLATES.forEach(tpl => {
            const count = tplCatalogRows.filter(r => r.usedIn.some(u => u.templateId === tpl.id)).length;
            const btn = document.createElement("button");
            btn.className = "tpl-filter-btn";
            btn.dataset.filter = tpl.id;
            btn.title = tpl.desc;
            btn.textContent = tpl.name + ` (${count})`;
            filterContainer.appendChild(btn);
        });
        filterContainer.addEventListener("click", e => {
            const btn = e.target.closest(".tpl-filter-btn");
            if (!btn) return;
            filterContainer.querySelectorAll(".tpl-filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            tplActiveFilter = btn.dataset.filter;
            renderTemplateCatalog();
        });
    }

    // Stats
    const customCount = tplCatalogRows.filter(r => r.isCustom).length;
    document.getElementById("tplStatTotal").textContent = tplCatalogRows.length;
    document.getElementById("tplStatTemplates").textContent = PROJECT_TEMPLATES.length;
    document.getElementById("tplStatCustom").textContent = customCount;

    // Search
    document.getElementById("tplSearch")?.addEventListener("input", renderTemplateCatalog);

    // Save all button
    document.getElementById("btnSaveAllPrices")?.addEventListener("click", saveAllTemplatePrices);

    // Reset all button
    document.getElementById("btnResetAllPrices")?.addEventListener("click", () => {
        if (!confirm("Khôi phục toàn bộ đơn giá về mặc định hệ thống? Các thay đổi sẽ mất.")) return;
        localStorage.removeItem("anlaa_work_prices");
        tplModifiedPrices = {};
        tplCatalogRows = buildCatalogRows();
        renderTemplateCatalog();
        updateTplModifiedCount();
        showToast("Đã khôi phục đơn giá về mặc định");
    });

    renderTemplateCatalog();
}

function getFilteredCatalogRows() {
    const search = (document.getElementById("tplSearch")?.value || "").toLowerCase().trim();
    return tplCatalogRows.filter(row => {
        if (tplActiveFilter !== "all") {
            if (!row.usedIn.some(u => u.templateId === tplActiveFilter)) return false;
        }
        if (search) {
            const haystack = (row.name + " " + row.key + " " + row.unit).toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        return true;
    });
}

function renderTemplateCatalog() {
    const tbody = document.getElementById("tplTableBody");
    if (!tbody) return;

    const rows = getFilteredCatalogRows();
    const savedPrices = JSON.parse(localStorage.getItem("anlaa_work_prices") || "{}");

    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-boq-msg">Không tìm thấy hạng mục nào.</td></tr>`;
        return;
    }

    // Group by first template in usedIn (if filter is all, group by template)
    let html = "";
    let stt = 0;

    if (tplActiveFilter === "all") {
        // Group by template
        PROJECT_TEMPLATES.forEach(tpl => {
            const tplRows = rows.filter(r => r.usedIn.some(u => u.templateId === tpl.id));
            if (tplRows.length === 0) return;

            html += `<tr class="tpl-template-header">
                <td colspan="6">
                    <i data-lucide="${tpl.icon}" style="width:14px;height:14px;vertical-align:middle;margin-right:6px;"></i>
                    ${escHtml(tpl.name)} — ${escHtml(tpl.desc)}
                    <span style="font-size:11px;color:rgba(0,242,254,0.6);margin-left:8px;font-weight:500;">${tplRows.length} hạng mục</span>
                </td>
            </tr>`;

            // Group by section within this template
            const sectionsInThisTemplate = [];
            tpl.sections.forEach(sec => {
                const secRows = tplRows.filter(r => r.usedIn.some(u => u.templateId === tpl.id && u.sectionName === sec.name));
                if (secRows.length > 0) sectionsInThisTemplate.push({ sec, rows: secRows });
            });

            sectionsInThisTemplate.forEach(({ sec, rows: secRows }) => {
                html += `<tr class="tpl-section-row"><td colspan="6">${escHtml(sec.name)}</td></tr>`;
                secRows.forEach(row => {
                    stt++;
                    html += buildCatalogRow(stt, row, savedPrices);
                });
            });
        });

        // Custom items not yet shown (those only in custom)
        const customRows = rows.filter(r => r.isCustom);
        if (customRows.length > 0) {
            html += `<tr class="tpl-template-header"><td colspan="6">
                <i data-lucide="wrench" style="width:14px;height:14px;vertical-align:middle;margin-right:6px;"></i>
                Hạng mục Custom (đơn lẻ, không có định mức)
            </td></tr>`;
            customRows.forEach(row => {
                stt++;
                html += buildCatalogRow(stt, row, savedPrices);
            });
        }
    } else {
        // Filtered by one template — group by section
        const tpl = PROJECT_TEMPLATES.find(t => t.id === tplActiveFilter);
        if (tpl) {
            tpl.sections.forEach(sec => {
                const secRows = rows.filter(r => r.usedIn.some(u => u.templateId === tpl.id && u.sectionName === sec.name));
                if (secRows.length === 0) return;
                html += `<tr class="tpl-section-row"><td colspan="6">${escHtml(sec.name)}</td></tr>`;
                secRows.forEach(row => {
                    stt++;
                    html += buildCatalogRow(stt, row, savedPrices);
                });
            });
        }
    }

    tbody.innerHTML = html;

    // Wire price inputs
    tbody.querySelectorAll(".tpl-price-input").forEach(input => {
        input.addEventListener("focus", function() { this.select(); });
        input.addEventListener("input", function() {
            const rowKey = this.dataset.rowkey;
            const v = parseFloat(this.value.replace(/\./g, "")) || 0;
            if (v > 0) {
                tplModifiedPrices[rowKey] = v;
                this.classList.add("modified");
            } else {
                delete tplModifiedPrices[rowKey];
                this.classList.remove("modified");
            }
            updateTplModifiedCount();
        });
        input.addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
                saveAllTemplatePrices(false);
                this.blur();
            }
        });
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
}

function buildCatalogRow(stt, row, savedPrices) {
    const effectivePrice = tplModifiedPrices[row._rowKey] != null
        ? tplModifiedPrices[row._rowKey]
        : (savedPrices[row._rowKey] != null ? savedPrices[row._rowKey] : row.defaultPrice);
    const isModified = tplModifiedPrices[row._rowKey] != null || savedPrices[row._rowKey] != null;

    const templateBadges = [...new Set(row.usedIn.map(u => u.templateId))].map(tid => {
        const tpl = PROJECT_TEMPLATES.find(t => t.id === tid);
        if (!tpl) return "";
        return `<span class="tpl-badge tpl-badge-${escHtml(tid)}" title="${escHtml(tpl.desc)}">${escHtml(tpl.name)}</span>`;
    }).join("");

    const typeLabel = row.isCustom
        ? `<span class="tpl-unit-badge" style="background:rgba(255,255,255,0.05);color:var(--text-muted);">custom</span>`
        : `<span class="tpl-item-key">${escHtml(row.key)}</span>`;

    // Check if this key exists in current estimate (pricingItems)
    const inEstimate = !row.isCustom && pricingItems.some(p => p.workItemKey === row.key);
    const jumpLinks = !row.isCustom ? `
        <span class="cross-tab-link ${inEstimate ? "" : "cross-tab-link-disabled"}"
            onclick="${inEstimate ? `switchToTabAndHighlight('subcontractor','${row.key}')` : "showToast('Hạng mục này chưa có trong bảng dự toán hiện tại')"}"
            title="${inEstimate ? "Xem trong bảng so sánh NTP" : "Chưa có trong dự toán hiện tại"}">
            <i data-lucide="users" style="width:10px;height:10px;"></i> NTP
        </span>
        <span class="cross-tab-link ${inEstimate ? "" : "cross-tab-link-disabled"}"
            onclick="${inEstimate ? `switchToTabAndHighlight('selling','${row.key}')` : "showToast('Hạng mục này chưa có trong bảng dự toán hiện tại')"}"
            title="${inEstimate ? "Xem trong bảng giá bán" : "Chưa có trong dự toán hiện tại"}">
            <i data-lucide="tag" style="width:10px;height:10px;"></i> Giá bán
        </span>` : "";

    return `<tr data-work-key="${escHtml(row.key)}">
        <td style="text-align:center;color:var(--text-muted);font-size:12px;">${stt}</td>
        <td style="font-weight:500;color:var(--text-primary);">
            ${escHtml(row.name)}
            <div class="cross-tab-links">${jumpLinks}</div>
        </td>
        <td style="text-align:center;"><span class="tpl-unit-badge">${escHtml(row.unit)}</span></td>
        <td style="text-align:right;">
            <input class="tpl-price-input ${isModified ? "modified" : ""}"
                data-rowkey="${escHtml(row._rowKey)}"
                data-default="${row.defaultPrice}"
                value="${effectivePrice > 0 ? fmt(effectivePrice) : ""}"
                placeholder="${fmt(row.defaultPrice) || "—"}"
                type="text" inputmode="numeric">
        </td>
        <td><div class="tpl-badge-wrap">${templateBadges}</div></td>
        <td style="text-align:center;">${typeLabel}</td>
    </tr>`;
}

function saveAllTemplatePrices(showFeedback = true) {
    const savedPrices = JSON.parse(localStorage.getItem("anlaa_work_prices") || "{}");

    // Also pick up any values currently in DOM inputs (in case user typed but didn't trigger input event)
    document.querySelectorAll(".tpl-price-input").forEach(input => {
        const rowKey = input.dataset.rowkey;
        const raw = input.value.replace(/\./g, "");
        const v = parseFloat(raw) || 0;
        if (v > 0) tplModifiedPrices[rowKey] = v;
    });

    let saved = 0;
    Object.entries(tplModifiedPrices).forEach(([rowKey, price]) => {
        savedPrices[rowKey] = price;
        saved++;
    });

    localStorage.setItem("anlaa_work_prices", JSON.stringify(savedPrices));
    tplModifiedPrices = {};
    updateTplModifiedCount();

    // Refresh rows to show saved state
    tplCatalogRows = buildCatalogRows();
    renderTemplateCatalog();

    if (showFeedback) showToast(`✅ Đã lưu ${saved} đơn giá vào bộ nhớ`);
}

function updateTplModifiedCount() {
    const count = Object.keys(tplModifiedPrices).length;
    const el = document.getElementById("tplStatModified");
    if (el) {
        el.textContent = count;
        el.style.color = count > 0 ? "#fbbf24" : "var(--text-primary)";
    }
    const dot = document.getElementById("tplPriceChangedDot");
    if (dot) dot.style.opacity = count > 0 ? "1" : "0";
}
