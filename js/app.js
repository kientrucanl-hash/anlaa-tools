/**
 * Application Controller & DOM Management for Dự toán ANLAA
 * Language: English 100% for source code & variables (Rule §2)
 * High Aesthetic Glassmorphism Dark Mode Responsive UI Controller
 */

// Global State
let currentProject = {
    id: null,      // API project ID (null = not yet synced)
    status: 'draft',
    name: "Cải tạo Căn hộ Chung cư",
    address: "Hà Nội",
    items: [] // List of added masonry/plastering/tiling items
};

let materialPrices = {};
let workItemPrices = {};   // Construction work item prices (đơn giá thi công tổng hợp)
let constructionItems = []; // G8-style cost estimate items with expandable rows
let contingencyEnabled = false;
let contingencyPct = 5;
let vatEnabled = false;
let vatPct = 10;
let roundingUnit = 10000; // default: round to nearest 10.000đ; 0 = no rounding
let activeChart = null;
let undoStack = [];
let redoStack = [];
let cellClipboard = null; // { field, value } — Ctrl+C single cell
let focusedCellInfo = null; // { itemId, rowIdx, field } — track focused dim-input
let selectedRows = new Set(); // Set of "itemId:rowIdx" strings for multi-select
let lastSelectedKey = null;   // last clicked row key for Shift+range select
let dragSrcKey = null;        // "itemId:rowIdx" of drag source row

// Spreadsheet States for Masonry Detailed Geometry Mode
let wallSegments = [
    { length: 3.5, height: 2.8, wallType: "110", multiplier: 1 }
];
let doorDeductions = [];

// Reference to currently focused numeric input for Digital Takeoff
let activeNumberInput = null;

// DOM Elements Initialization
document.addEventListener("keydown", (e) => {
    const active = document.activeElement;
    const inCostTable = active?.closest("#costTableBody");
    const inCostArea = active?.closest("#boq-report-area, #costTableBody");

    // --- Ctrl/Meta shortcuts (Undo/Redo/D/Delete/C/V) ---
    if (e.ctrlKey || e.metaKey) {
        if (!inCostArea && active !== document.body) return;

        if (e.key === "z" && !e.shiftKey) { e.preventDefault(); applyUndo(); return; }
        if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); applyRedo(); return; }

        // Ctrl+D — fill down: copy all dim/n values from row above into current row
        if (e.key === "d" && inCostTable) {
            const tr = active?.closest("tr.cost-detail-row");
            if (!tr) return;
            e.preventDefault(); // prevent browser bookmark-page only after confirming we're in a detail row
            const item = constructionItems.find(i => i.id === tr.dataset.itemId);
            if (!item) return;
            const ri = parseInt(tr.dataset.rowIdx);
            if (ri === 0) { showToast("Không có dòng trên để copy xuống"); return; }
            const above = item.rows[ri - 1];
            pushUndo();
            item.rows[ri] = { ...item.rows[ri], l: above.l, w: above.w, h: above.h, n: above.n, hs: above.hs };
            saveConstructionItems();
            updateConstructionCostSection();
            // Re-focus same field in same row after re-render
            setTimeout(() => {
                const rows = document.querySelectorAll(`#costTableBody tr.cost-detail-row[data-item-id="${item.id}"]`);
                const field = focusedCellInfo?.field || "l";
                rows[ri]?.querySelector(`.dim-input[data-field="${field}"], .n-input[data-field="${field}"]`)?.focus();
            }, 30);
            showToast("↓ Fill down từ dòng trên");
            return;
        }

        // Ctrl+Enter — duplicate current row (clone xuống dưới)
        if (e.key === "Enter" && inCostTable) {
            const tr = active?.closest("tr.cost-detail-row");
            if (!tr) return;
            e.preventDefault();
            const item = constructionItems.find(i => i.id === tr.dataset.itemId);
            if (!item) return;
            const ri = parseInt(tr.dataset.rowIdx);
            pushUndo();
            const clone = { ...item.rows[ri] };
            item.rows.splice(ri + 1, 0, clone);
            saveConstructionItems();
            updateConstructionCostSection();
            setTimeout(() => {
                const rows = document.querySelectorAll(`#costTableBody tr.cost-detail-row[data-item-id="${item.id}"]`);
                rows[ri + 1]?.querySelector(".desc-input")?.focus();
            }, 30);
            showToast("↕ Đã nhân đôi dòng");
            return;
        }

        // Ctrl+C — copy giá trị ô dim/n đang focus
        if (e.key === "c" && inCostTable && active?.classList.contains("detail-input") && active.type === "number") {
            cellClipboard = { field: active.dataset.field, value: active.value };
            showToast(`📋 Copy: ${active.value || "0"}`);
            return; // không preventDefault để trình duyệt vẫn copy text
        }

        // Ctrl+V — paste vào ô dim/n đang focus (nếu clipboard là số đơn, không phải Excel range)
        if (e.key === "v" && inCostTable && active?.classList.contains("detail-input") && active.type === "number") {
            if (!cellClipboard) return;
            e.preventDefault();
            active.value = cellClipboard.value;
            active.dispatchEvent(new Event("input", { bubbles: true }));
            showToast(`📋 Paste: ${cellClipboard.value}`);
            return;
        }

        // Ctrl+Delete — xóa dòng(s) đang focus hoặc được select
        if (e.key === "Delete" && inCostTable) {
            e.preventDefault();
            if (selectedRows.size > 0) {
                // Multi-delete selected rows
                pushUndo();
                let deletedCount = 0;
                // Group by itemId, sort rowIdx desc to splice correctly
                const grouped = {};
                selectedRows.forEach(key => {
                    const [iid, ri] = key.split(":"); const riNum = parseInt(ri);
                    if (!grouped[iid]) grouped[iid] = [];
                    grouped[iid].push(riNum);
                });
                Object.entries(grouped).forEach(([iid, ris]) => {
                    const item = constructionItems.find(i => i.id === iid);
                    if (!item) return;
                    ris.sort((a, b) => b - a).forEach(ri => {
                        if (item.rows.length > 1) { item.rows.splice(ri, 1); deletedCount++; }
                    });
                });
                selectedRows.clear(); lastSelectedKey = null;
                saveConstructionItems(); updateConstructionCostSection();
                showToast(`🗑 Đã xóa ${deletedCount} dòng`);
            } else {
                const tr = active?.closest("tr.cost-detail-row");
                if (!tr) return;
                const item = constructionItems.find(i => i.id === tr.dataset.itemId);
                if (!item || item.rows.length <= 1) { showToast("Không thể xóa dòng cuối cùng"); return; }
                const ri = parseInt(tr.dataset.rowIdx);
                pushUndo();
                item.rows.splice(ri, 1);
                saveConstructionItems(); updateConstructionCostSection();
                setTimeout(() => {
                    const rows = document.querySelectorAll(`#costTableBody tr.cost-detail-row[data-item-id="${item.id}"]`);
                    rows[Math.min(ri, rows.length - 1)]?.querySelector(".desc-input")?.focus();
                }, 30);
                showToast("🗑 Đã xóa dòng");
            }
            return;
        }
    }

    // --- Arrow keys navigation (không cần Ctrl) ---
    if (inCostTable && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        const isDimOrN = active?.classList.contains("detail-input") && active.type === "number";
        const isDesc = active?.classList.contains("desc-input");
        if (!isDimOrN && !isDesc) return;

        const tr = active.closest("tr.cost-detail-row");
        if (!tr) return;

        const fieldOrder = ["desc", "l", "w", "h", "n"];
        const currentField = active.dataset.field;
        const fi = fieldOrder.indexOf(currentField);

        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            // Only navigate between cells if cursor is at start/end of input
            const atStart = active.selectionStart === 0;
            const atEnd = active.selectionEnd === active.value.length;
            if (e.key === "ArrowLeft" && !atStart) return;
            if (e.key === "ArrowRight" && !atEnd) return;
            e.preventDefault();
            const nextFi = e.key === "ArrowLeft" ? fi - 1 : fi + 1;
            if (nextFi < 0 || nextFi >= fieldOrder.length) return;
            const nextField = fieldOrder[nextFi];
            const nextInput = tr.querySelector(`[data-field="${nextField}"]:not([disabled])`);
            if (nextInput) nextInput.focus();
            return;
        }

        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const item = constructionItems.find(i => i.id === tr.dataset.itemId);
            if (!item) return;
            const ri = parseInt(tr.dataset.rowIdx);
            const allRows = [...document.querySelectorAll(`#costTableBody tr.cost-detail-row[data-item-id="${item.id}"]`)];
            const targetRi = e.key === "ArrowUp" ? ri - 1 : ri + 1;
            if (targetRi < 0 || targetRi >= allRows.length) return;

            // Shift+Arrow: extend multi-row selection
            if (e.shiftKey) {
                const currentKey = `${item.id}:${ri}`;
                const targetKey = `${item.id}:${targetRi}`;
                if (!lastSelectedKey) lastSelectedKey = currentKey;
                // Toggle current into selection, add target
                selectedRows.add(currentKey);
                selectedRows.add(targetKey);
                lastSelectedKey = targetKey;
                refreshRowSelectionUI();
            }

            const targetInput = allRows[targetRi].querySelector(`[data-field="${currentField}"]:not([disabled])`) ||
                                allRows[targetRi].querySelector(".desc-input");
            if (targetInput) targetInput.focus();
            return;
        }
    }

    // --- F2 — focus vào ô dim L của dòng đang highlight (nếu đang ở header row) ---
    if (e.key === "F2" && inCostTable) {
        const tr = active?.closest("tr.cost-item-header");
        if (!tr) return;
        e.preventDefault();
        const itemId = tr.dataset.itemId;
        const item = constructionItems.find(i => i.id === itemId);
        if (!item || !item.expanded) return;
        const firstDetail = document.querySelector(`#costTableBody tr.cost-detail-row[data-item-id="${itemId}"]`);
        firstDetail?.querySelector(".desc-input")?.focus();
        return;
    }

    // --- Escape — blur ô hiện tại hoặc clear selection ---
    if (e.key === "Escape" && inCostTable) {
        if (selectedRows.size > 0) {
            selectedRows.clear(); lastSelectedKey = null;
            refreshRowSelectionUI();
        } else {
            active?.blur();
        }
    }
});

document.addEventListener("DOMContentLoaded", () => {
    // 1. Load data from localStorage
    initProjectAndPrices();

    // 2. Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 2.5 Auto-select on focus for numeric input fields (Estimator UX Rule WR-13)
    document.querySelectorAll("input[type='number']").forEach(input => {
        input.addEventListener("focus", function() {
            this.select();
            activeNumberInput = this; // track focused input
        });
    });

    // 3. Tab navigation switcher
    initTabSwitching();

    // 4. Form inputs real-time calculation listeners
    initRealTimeListeners();

    // 5. Item list action buttons
    initActionListeners();

    // 6. Init Prices Tab UI tables
    renderPricesTable();

    // 6.5 Init Spreadsheet Tables, Toggles, and Takeoff events
    initSpreadsheetTables();
    initInputModeToggles();
    initTakeoffWorkspace();

    // 6.6 Init Construction Cost Section
    initConstructionCostSection();

    // 6.7 Init Off-Canvas Sidebar for Mobile Responsive Layout
    initOffCanvasSidebar();
    initNotifications();

    // 7. Initial UI calculation update
    triggerAllPreviews();
    updateBOQTable();
    
    // Log project loaded
    logAuditEvent("LOAD_PROJECT", `Dự án "${currentProject.name}" được tải thành công với ${currentProject.items.length} hạng mục.`);

    // 8. Init collaboration (only on estimate page where collab.js is loaded)
    if (typeof collabInit === 'function') {
        // Wait for auth to resolve, then init with project id + role
        setTimeout(() => {
            const role = currentProject.my_role || (currentProject.id ? 'owner' : null);
            collabInit(currentProject.id || null, role);
        }, 800);
    }
});

/**
 * Initializes off-canvas hamburger drawer sidebar for mobile viewports
 */
function initOffCanvasSidebar() {
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebarClose = document.getElementById("sidebarClose");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const appSidebar = document.getElementById("appSidebar");
    const tabBtns = document.querySelectorAll(".sb-nav .tab-btn");

    const closeSidebar = () => {
        appSidebar.classList.remove("active");
        sidebarOverlay.classList.remove("active");
    };

    if (sidebarToggle) sidebarToggle.addEventListener("click", () => {
        appSidebar.classList.add("active");
        sidebarOverlay.classList.add("active");
    });
    if (sidebarClose) sidebarClose.addEventListener("click", closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

    // Auto-close on mobile when a tab is selected
    tabBtns.forEach(btn => btn.addEventListener("click", () => {
        if (window.innerWidth <= 1200) closeSidebar();
    }));

    // More menu toggle
    const btnMore = document.getElementById("btnMoreActions");
    const moreMenu = document.getElementById("sbMoreMenu");
    if (btnMore && moreMenu) {
        btnMore.addEventListener("click", (e) => {
            e.stopPropagation();
            moreMenu.style.display = moreMenu.style.display === "none" ? "block" : "none";
        });
        document.addEventListener("click", () => { moreMenu.style.display = "none"; });
    }
}

/**
 * Initializes project state and prices from localStorage
 */
function initProjectAndPrices() {
    // Load material prices
    const storedPrices = localStorage.getItem("anlaa_prices");
    if (storedPrices) {
        materialPrices = JSON.parse(storedPrices);
    } else {
        materialPrices = { ...DEFAULT_UNIT_PRICES };
        localStorage.setItem("anlaa_prices", JSON.stringify(materialPrices));
    }

    // Load construction work item prices
    const storedWorkPrices = localStorage.getItem("anlaa_work_prices");
    if (storedWorkPrices) {
        workItemPrices = JSON.parse(storedWorkPrices);
    } else {
        workItemPrices = {};
        Object.entries(DEFAULT_WORK_ITEM_PRICES).forEach(([k, v]) => {
            workItemPrices[k] = v.price;
        });
        localStorage.setItem("anlaa_work_prices", JSON.stringify(workItemPrices));
    }

    // Load construction items (G8 cost estimate)
    const storedCostItems = localStorage.getItem("anlaa_cost_items");
    if (storedCostItems) {
        constructionItems = JSON.parse(storedCostItems);
    }

    // Load contingency + VAT + rounding settings
    const storedContingency = localStorage.getItem("anlaa_contingency");
    if (storedContingency) {
        const c = JSON.parse(storedContingency);
        contingencyEnabled = c.enabled || false;
        contingencyPct = c.pct || 5;
        vatEnabled = c.vatEnabled || false;
        vatPct = c.vatPct || 10;
        roundingUnit = c.roundingUnit !== undefined ? c.roundingUnit : 10000;
    }

    // Load Project Data
    const storedProject = localStorage.getItem("anlaa_project");
    if (storedProject) {
        currentProject = JSON.parse(storedProject);
        document.getElementById("projectName").value = currentProject.name || "Cải tạo Căn hộ Chung cư";
        document.getElementById("projectAddress").value = currentProject.address || "Hà Nội";
    } else {
        currentProject = {
            name: "Cải tạo Căn hộ Chung cư",
            address: "Hà Nội",
            items: []
        };
        saveProjectToStorage();
    }

    updateSidebarList();
}

/**
 * Saves current project data to localStorage AND syncs to API (debounced)
 */
function saveProjectToStorage() {
    localStorage.setItem("anlaa_project", JSON.stringify(currentProject));
    debouncedApiSave();
}

let _apiSaveTimer = null;
function debouncedApiSave() {
    clearTimeout(_apiSaveTimer);
    _apiSaveTimer = setTimeout(syncProjectToAPI, 1500);
}

async function syncProjectToAPI() {
    if (!localStorage.getItem('anlaa_token')) return;
    if (currentProject.status === 'approved') return; // locked
    if (currentProject.my_role === 'viewer') return; // read-only collaborator

    try {
        if (currentProject.id) {
            await API.updateProject(currentProject.id, currentProject.name, currentProject.address, currentProject.items);
            if (typeof broadcastChange === 'function') {
                broadcastChange({ name: currentProject.name, address: currentProject.address, data: currentProject.items });
            }
        } else {
            const created = await API.createProject(currentProject.name, currentProject.address, currentProject.items);
            currentProject.id = created.id;
            currentProject.status = created.status;
            localStorage.setItem("anlaa_project", JSON.stringify(currentProject));
        }
    } catch (err) {
        console.warn('API sync error:', err.message);
    }
}

/**
 * Called by collab.js when a remote collaborator makes a change.
 * Merges remote patch into currentProject if user has no pending unsaved edits.
 */
function updateRemoteProjectData(patch) {
    if (!currentProject) return;
    let changed = false;
    if (patch.name && patch.name !== currentProject.name) {
        currentProject.name = patch.name;
        const nameEl = document.getElementById('projectName');
        if (nameEl) nameEl.value = patch.name;
        changed = true;
    }
    if (patch.address && patch.address !== currentProject.address) {
        currentProject.address = patch.address;
        const addrEl = document.getElementById('projectAddress');
        if (addrEl) addrEl.value = patch.address;
        changed = true;
    }
    if (patch.data && Array.isArray(patch.data)) {
        currentProject.items = patch.data;
        changed = true;
    }
    if (changed) {
        localStorage.setItem('anlaa_project', JSON.stringify(currentProject));
        updateSidebarList();
        updateBOQTable();
    }
}

/**
 * Logs events for Audit Trail (Rule §12b / WR-11)
 * Simulates local logging and logs to console
 */
function logAuditEvent(action, details) {
    const timestamp = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    const logMsg = `[${timestamp}] [${action}] - ${details}`;
    console.log(logMsg);

    // Save log queue in localStorage for user to download or audit later
    let auditLogs = JSON.parse(localStorage.getItem("anlaa_audit_logs") || "[]");
    auditLogs.push(logMsg);
    // Limit to last 100 logs
    if (auditLogs.length > 100) auditLogs.shift();
    localStorage.setItem("anlaa_audit_logs", JSON.stringify(auditLogs));
}

/**
 * Handles tabs switching mechanism
 */
function initTabSwitching() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");

            // Toggle active classes
            tabButtons.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            document.getElementById(`tab-${targetTab}`).classList.add("active");
            
            if (targetTab === "unit-prices") {
                renderPricesTable();
            }
            if (targetTab === "work-prices") {
                renderWorkItemPricesTab();
            }

            // Sync Preview UI for current active tab
            triggerAllPreviews();
        });
    });
}

/**
 * Attaches real-time keyup/change listeners on all input forms
 */
function initRealTimeListeners() {
    // 1. Sync project basic info with global state
    document.getElementById("projectName").addEventListener("input", (e) => {
        currentProject.name = e.target.value;
        document.getElementById("printBOQTitle").innerText = `BẢNG TỔNG HỢP KHỐI LƯỢNG VẬT TƯ & DỰ TOÁN CHI PHÍ`;
        updateBOQSubtext();
        saveProjectToStorage();
    });

    document.getElementById("projectAddress").addEventListener("input", (e) => {
        currentProject.address = e.target.value;
        updateBOQSubtext();
        saveProjectToStorage();
    });

    // 2. Tab Xây Tường (Masonry inputs)
    const masonryInputs = [
        "masonryBrickType", "masonryMortarGrade", "masonryBrickWaste", "masonryMortarWaste",
        "masonryDirectArea", "masonryDirectWallType", "masonryDirectPlasterArea", "masonryAutoPlaster", 
        "masonryPlasterThickness", "masonryPlasterMortarGrade", "masonryPlasterWaste", "masonryColumnLength", "masonryColumnWidth"
    ];
    masonryInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", updateMasonryPreview);
            el.addEventListener("change", updateMasonryPreview);
        }
    });

    // Toggle Column Plaster inputs based on checkbox
    document.getElementById("masonryPlasterColumns").addEventListener("change", (e) => {
        const checked = e.target.checked;
        document.querySelectorAll(".column-plaster-fields").forEach(el => {
            el.style.display = checked ? "flex" : "none";
        });
        updateMasonryPreview();
    });

    // Toggle Auto Plaster inputs based on select value
    function syncPlasterColumnVisibility(hasPlaster) {
        document.querySelectorAll(".auto-plaster-fields").forEach(el => {
            el.style.display = hasPlaster ? "flex" : "none";
        });
        const wallTable = document.getElementById("wallSegmentsTable");
        if (wallTable) {
            wallTable.querySelectorAll("th:nth-child(5), td:nth-child(5)").forEach(cell => {
                cell.style.display = hasPlaster ? "" : "none";
            });
        }
    }

    document.getElementById("masonryAutoPlaster").addEventListener("change", (e) => {
        syncPlasterColumnVisibility(e.target.value !== "none");
        updateMasonryPreview();
    });

    // Apply on load based on current select value
    syncPlasterColumnVisibility(document.getElementById("masonryAutoPlaster").value !== "none");

    // 3. Tab Cán nền (Floor screeding inputs)
    const plasteringInputs = [
        "screedingThickness", "plasteringArea", "plasteringDirectArea", "plasteringMortarGrade", "plasteringWaste"
    ];
    plasteringInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", updatePlasteringPreview);
            el.addEventListener("change", updatePlasteringPreview);
        }
    });

    // 4. Tab Ốp Lát (Tiling inputs)
    const tilingInputs = [
        "tilingTileSize", "tilingArea", "tilingDirectArea", "tilingGroutWidth", "tilingTileThickness",
        "tilingMethod", "tilingMixRatio", "tilingTileWaste", "tilingAdhesiveWaste", "tilingGroutWaste"
    ];
    tilingInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", updateTilingPreview);
            el.addEventListener("change", updateTilingPreview);
        }
    });

    // Toggle mixed ratio dropdown based on selected method
    document.getElementById("tilingMethod").addEventListener("change", (e) => {
        const method = e.target.value;
        const mixRatioGroup = document.getElementById("mixRatioGroup");
        if (method === "adhesive-mixed") {
            mixRatioGroup.style.display = "flex";
        } else {
            mixRatioGroup.style.display = "none";
        }
    });

    // Auto-sync plaster area inside direct mode
    document.getElementById("masonryDirectArea").addEventListener("input", function() {
        const faces = parseInt(document.getElementById("masonryAutoPlaster").value) || 0;
        if (faces > 0 && document.getElementById("masonryBrickType").value !== "none") {
            const plasterArea = (parseFloat(this.value) || 0) * faces;
            document.getElementById("masonryDirectPlasterArea").value = plasterArea.toFixed(1);
        }
    });

    document.getElementById("masonryAutoPlaster").addEventListener("change", function() {
        const faces = parseInt(this.value) || 0;
        if (faces > 0 && document.getElementById("masonryBrickType").value !== "none") {
            const buildArea = parseFloat(document.getElementById("masonryDirectArea").value) || 0;
            const plasterArea = buildArea * faces;
            document.getElementById("masonryDirectPlasterArea").value = plasterArea.toFixed(1);
        }
        
        // Toggle plaster input block in direct mode
        const directSection = document.getElementById("masonryDirectSection");
        const plasterFields = directSection.querySelector(".masonry-direct-plaster-fields");
        const isDirect = document.getElementById("masonryInputModeToggle").checked;
        const brickType = document.getElementById("masonryBrickType").value;
        if (isDirect && plasterFields) {
            if (brickType === "none" || this.value !== "none") {
                plasterFields.style.display = "block";
            } else {
                plasterFields.style.display = "none";
            }
        }
    });

    document.getElementById("masonryBrickType").addEventListener("change", function() {
        const directSection = document.getElementById("masonryDirectSection");
        const buildFields = directSection.querySelectorAll(".masonry-direct-build-fields");
        const plasterFields = directSection.querySelector(".masonry-direct-plaster-fields");
        const isDirect = document.getElementById("masonryInputModeToggle").checked;
        const autoPlasterVal = document.getElementById("masonryAutoPlaster").value;
        
        if (isDirect) {
            if (this.value === "none") {
                buildFields.forEach(f => f.style.display = "none");
                if (plasterFields) plasterFields.style.display = "block";
            } else {
                buildFields.forEach(f => f.style.display = "block");
                if (plasterFields) plasterFields.style.display = autoPlasterVal !== "none" ? "block" : "none";
            }
        }
    });
}

/**
 * Triggers preview calculations for all sections
 */
function triggerAllPreviews() {
    updateMasonryPreview();
    updatePlasteringPreview();
    updateTilingPreview();
}

/**
 * Formats Vietnamese currency display (Rule §4 / WR-11a)
 */
function formatVND(value) {
    const rounded = Math.round(value);
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " VNĐ";
}

/**
 * Rounds price to nearest unit (e.g. 1000, 10000).
 * When VAT is applied, rounding is skipped (caller passes skipRound=true).
 */
function roundPrice(value, skipRound = false) {
    if (skipRound || roundingUnit === 0) return Math.round(value);
    return Math.round(value / roundingUnit) * roundingUnit;
}

/**
 * Formats numbers standard (Rule §4 - use comma for decimals)
 */
function formatNumber(value, decimalPlaces = 2) {
    if (value === 0) return "0";
    // Check if integer
    if (value % 1 === 0) return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    // Format float
    const formatted = parseFloat(value).toFixed(decimalPlaces);
    const parts = formatted.split(".");
    const thousandsPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${thousandsPart},${parts[1]}`;
}

/**
 * Real-time calculation updater for Masonry Tab
 */
function updateMasonryPreview() {
    const isDirectMode = document.getElementById("masonryInputModeToggle").checked;
    const brickType = document.getElementById("masonryBrickType").value;
    const mortarGrade = document.getElementById("masonryMortarGrade").value;
    const brickWaste = parseFloat(document.getElementById("masonryBrickWaste").value) || 0;
    const mortarWaste = parseFloat(document.getElementById("masonryMortarWaste").value) || 0;

    // 1. Column plaster settings
    let columnPlasterSettings = { enabled: false };
    if (document.getElementById("masonryPlasterColumns").checked) {
        columnPlasterSettings = {
            enabled: true,
            length: parseFloat(document.getElementById("masonryColumnLength").value) || 0,
            width: parseFloat(document.getElementById("masonryColumnWidth").value) || 0
        };
    }

    // 2. Auto plaster settings
    let autoPlasterSettings = { enabled: false };
    const autoPlasterVal = document.getElementById("masonryAutoPlaster").value;
    
    // Toggle plaster input block in direct mode dynamically
    const directSection = document.getElementById("masonryDirectSection");
    if (directSection && directSection.style.display !== "none") {
        const buildFields = directSection.querySelectorAll(".masonry-direct-build-fields");
        const plasterFields = directSection.querySelector(".masonry-direct-plaster-fields");
        if (plasterFields) {
            if (brickType === "none") {
                buildFields.forEach(f => f.style.display = "none");
                plasterFields.style.display = "block";
            } else {
                buildFields.forEach(f => f.style.display = "block");
                plasterFields.style.display = autoPlasterVal !== "none" ? "block" : "none";
            }
        }
    }

    if (autoPlasterVal !== "none" || (brickType === "none" && isDirectMode)) {
        const directPlasterAreaInput = document.getElementById("masonryDirectPlasterArea");
        const directPlasterArea = directPlasterAreaInput ? parseFloat(directPlasterAreaInput.value) || 0 : 0;
        
        autoPlasterSettings = {
            enabled: true,
            faces: autoPlasterVal === "auto" ? "auto" : (parseInt(autoPlasterVal) || 1),
            thickness: parseFloat(document.getElementById("masonryPlasterThickness").value) || 1.5,
            mortarGrade: document.getElementById("masonryPlasterMortarGrade").value,
            waste: parseFloat(document.getElementById("masonryPlasterWaste").value) || 0,
            directPlasterArea: isDirectMode ? directPlasterArea : null
        };
    }

    let result;
    if (isDirectMode) {
        const directArea = parseFloat(document.getElementById("masonryDirectArea").value) || 0;
        const directWallType = document.getElementById("masonryDirectWallType").value;
        const fakeWallSegments = [{ length: brickType === "none" ? 0 : directArea, height: 1, wallType: directWallType, multiplier: 1 }];
        const fakeDoorDeductions = [];
        result = calculateMasonry(fakeWallSegments, fakeDoorDeductions, brickType, mortarGrade, brickWaste, mortarWaste, autoPlasterSettings, null, null);
    } else {
        result = calculateMasonry(wallSegments, doorDeductions, brickType, mortarGrade, brickWaste, mortarWaste, autoPlasterSettings, columnPlasterSettings, null);
    }

    const previewContainer = document.getElementById("masonryPreview");
    if (result.error) {
        previewContainer.innerHTML = `<div class="error-msg-box"><i data-lucide="alert-triangle"></i> ${result.error}</div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    // Calculate approximate cost for preview
    let totalCost = 0;
    if (brickType === "brick-aac") {
        totalCost += result.bricksCount * materialPrices["brick-aac"];
        totalCost += result.specialAACMortarBags * materialPrices["tile-adhesive"];
    } else {
        totalCost += result.bricksCount * materialPrices[brickType];
        totalCost += result.cementBags * materialPrices["cement-pc40"];
        totalCost += result.sandM3 * materialPrices["sand-fine"];
    }

    let materialDetailsHTML = '';
    if (brickType === "brick-aac") {
        materialDetailsHTML = `
            <div class="preview-stat">
                <label>Gạch bê tông nhẹ AAC:</label>
                <div class="value-group">
                    <div class="main-value">
                        <span class="value">${formatNumber(result.bricksCount)}</span>
                        <span class="unit">viên</span>
                    </div>
                    <span class="sub-value">Lý thuyết: ${formatNumber(result.bricksTheory, 1)} viên</span>
                </div>
            </div>
            <div class="preview-stat">
                <label>Vữa xây AAC chuyên dụng:</label>
                <div class="value-group">
                    <div class="main-value">
                        <span class="value">${formatNumber(result.specialAACMortarBags)}</span>
                        <span class="unit">bao (25kg)</span>
                    </div>
                    <span class="sub-value">Khối lượng: ${formatNumber(result.specialAACMortarKg, 1)} kg</span>
                </div>
            </div>
        `;
    } else {
        const brickName = brickType === "brick-solid" ? "Gạch đặc đỏ" : "Gạch rỗng 2 lỗ";
        materialDetailsHTML = `
            <div class="preview-stat">
                <label>${brickName}:</label>
                <div class="value-group">
                    <div class="main-value">
                        <span class="value">${formatNumber(result.bricksCount)}</span>
                        <span class="unit">viên</span>
                    </div>
                    <span class="sub-value">Lý thuyết: ${formatNumber(result.bricksTheory, 1)} viên</span>
                </div>
            </div>
            <div class="preview-stat">
                <label>Xi măng PC40 xây tô:</label>
                <div class="value-group">
                    <div class="main-value">
                        <span class="value">${formatNumber(result.cementBags)}</span>
                        <span class="unit">bao (50kg)</span>
                    </div>
                    <span class="sub-value">Khối lượng: ${formatNumber(result.cementKg, 1)} kg</span>
                </div>
            </div>
            <div class="preview-stat">
                <label>Cát mịn xây trát:</label>
                <div class="value-group">
                    <div class="main-value">
                        <span class="value">${formatNumber(result.sandM3, 3)}</span>
                        <span class="unit">m³</span>
                    </div>
                    <span class="sub-value">Đã gồm hao hụt thi công</span>
                </div>
            </div>
        `;
    }

    let geometryDetailsHTML = '';
    if (isDirectMode) {
        if (brickType === "none") {
            geometryDetailsHTML = `
                <div class="preview-stat">
                    <label>Diện tích trát tường nhập BOQ:</label>
                    <div class="value-group">
                        <div class="main-value">
                            <span class="value text-bold" style="color: var(--border-focus);">${formatNumber(autoPlasterSettings.directPlasterArea || 0, 2)}</span>
                            <span class="unit">m²</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            geometryDetailsHTML = `
                <div class="preview-stat">
                    <label>Diện tích xây dựng nhập BOQ:</label>
                    <div class="value-group">
                        <div class="main-value">
                            <span class="value text-bold" style="color: var(--border-focus);">${formatNumber(result.netArea, 2)}</span>
                            <span class="unit">m²</span>
                        </div>
                    </div>
                </div>
                <div class="preview-stat">
                    <label>Thể tích xây dựng quy đổi:</label>
                    <div class="value-group">
                        <div class="main-value">
                            <span class="value">${formatNumber(result.wallVolume, 3)}</span>
                            <span class="unit">m³</span>
                        </div>
                    </div>
                </div>
            `;
        }
    } else {
        geometryDetailsHTML = `
            <div class="preview-stat">
                <label>Diện tích xây tường thô:</label>
                <div class="value-group">
                    <div class="main-value">
                        <span class="value">${formatNumber(result.grossArea, 2)}</span>
                        <span class="unit">m²</span>
                    </div>
                </div>
            </div>
            <div class="preview-stat">
                <label>Diện tích cửa cần trừ:</label>
                <div class="value-group">
                    <div class="main-value">
                        <span class="value">${formatNumber(result.doorArea, 2)}</span>
                        <span class="unit">m²</span>
                    </div>
                </div>
            </div>
            <div class="preview-stat">
                <label>Diện tích xây dựng thực tế:</label>
                <div class="value-group">
                    <div class="main-value">
                        <span class="value text-bold" style="color: var(--border-focus);">${formatNumber(result.netArea, 2)}</span>
                        <span class="unit">m²</span>
                    </div>
                </div>
            </div>
            <div class="preview-stat">
                <label>Thể tích bức tường thô:</label>
                <div class="value-group">
                    <div class="main-value">
                        <span class="value">${formatNumber(result.wallVolume, 3)}</span>
                        <span class="unit">m³</span>
                    </div>
                </div>
            </div>
        `;
    }

    let plasterDetailsHTML = '';
    if (result.hasAutoPlaster && result.autoPlaster) {
        const pRes = result.autoPlaster;
        plasterDetailsHTML = `
            <div class="preview-glass-box-sub mt-2">
                <span class="sub-box-title"><i data-lucide="layers"></i> Trát hoàn thiện đi kèm (TB ~${pRes.faces} mặt/tường)</span>
                <div class="sub-stat-row">
                    <span>Diện tích trát phẳng:</span>
                    <strong>${formatNumber(pRes.plasterArea, 2)} m²</strong>
                </div>
                ${pRes.jambsLength > 0 ? `
                <div class="sub-stat-row">
                    <span>Chiều dài trát má cửa:</span>
                    <strong>${formatNumber(pRes.jambsLength, 2)} md</strong>
                </div>` : ''}
                <div class="sub-stat-row">
                    <span>Thể tích vữa trát:</span>
                    <strong>${formatNumber(pRes.plasterVolume, 3)} m³</strong>
                </div>
                <div class="sub-stat-row">
                    <span>Xi măng trát:</span>
                    <strong>${formatNumber(pRes.cementKg, 1)} kg</strong>
                </div>
                <div class="sub-stat-row">
                    <span>Cát mịn trát:</span>
                    <strong>${formatNumber(pRes.sandM3, 3)} m³</strong>
                </div>
            </div>
        `;
    }

    previewContainer.innerHTML = `
        ${geometryDetailsHTML}
        ${plasterDetailsHTML}
        
        <h4 class="preview-subtitle mt-3">Vật liệu thô & hoàn thiện dự kiến:</h4>
        ${materialDetailsHTML}

        <div class="preview-total">
            <span class="cost-label">DỰ TOÁN CHI PHÍ HẠNG MỤC</span>
            <span class="cost-value">${formatVND(totalCost)}</span>
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Real-time calculation updater for Plastering Tab
 */
function updatePlasteringPreview() {
    const isDirectMode = document.getElementById("plasteringInputModeToggle").checked;
    const mortarGrade = document.getElementById("plasteringMortarGrade").value;
    const mortarWaste = parseFloat(document.getElementById("plasteringWaste").value) || 0;

    let area = 0;
    if (isDirectMode) {
        area = parseFloat(document.getElementById("plasteringDirectArea").value) || 0;
    } else {
        area = parseFloat(document.getElementById("plasteringArea").value) || 0;
    }

    const previewContainer = document.getElementById("plasteringPreview");

    // Floor screeding only
    const thickness = parseFloat(document.getElementById("screedingThickness").value) || 3.0;
    const result = calculateScreeding(area, thickness, mortarGrade, mortarWaste);
    const totalCost = (result.cementBags * materialPrices["cement-pc40"]) + (result.sandM3 * materialPrices["sand-fine"]);

    previewContainer.innerHTML = `
        <div class="preview-stat">
            <label>Diện tích cán nền sàn:</label>
            <div class="value-group">
                <div class="main-value">
                    <span class="value text-bold" style="color: var(--border-focus);">${formatNumber(result.area, 2)}</span>
                    <span class="unit">m²</span>
                </div>
            </div>
        </div>
        <div class="preview-stat">
            <label>Thể tích vữa cán nền:</label>
            <div class="value-group">
                <div class="main-value">
                    <span class="value">${formatNumber(result.mortarVolume, 3)}</span>
                    <span class="unit">m³</span>
                </div>
                <span class="sub-value">Độ dày lớp cán: ${thickness} cm</span>
            </div>
        </div>
        
        <h4 class="preview-subtitle mt-3">Vật liệu cán nền dự kiến:</h4>
        <div class="preview-stat">
            <label>Xi măng PC40 xây tô:</label>
            <div class="value-group">
                <div class="main-value">
                    <span class="value">${formatNumber(result.cementBags)}</span>
                    <span class="unit">bao (50kg)</span>
                </div>
                <span class="sub-value">Khối lượng: ${formatNumber(result.cementKg, 1)} kg</span>
            </div>
        </div>
        <div class="preview-stat">
            <label>Cát vàng/Cát mịn cán nền:</label>
            <div class="value-group">
                <div class="main-value">
                    <span class="value">${formatNumber(result.sandM3, 3)}</span>
                    <span class="unit">m³</span>
                </div>
                <span class="sub-value">Đã gồm ${mortarWaste}% hao hụt cán nền</span>
            </div>
        </div>
        <div class="preview-stat">
            <label>Nước sạch cần dùng:</label>
            <div class="value-group">
                <div class="main-value">
                    <span class="value">${formatNumber(result.waterLiters, 1)}</span>
                    <span class="unit">lít</span>
                </div>
            </div>
        </div>

        <div class="preview-total">
            <span class="cost-label">DỰ TOÁN CHI PHÍ HẠNG MỤC</span>
            <span class="cost-value">${formatVND(totalCost)}</span>
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Real-time calculation updater for Tiling Tab
 */
function updateTilingPreview() {
    const tileSize = document.getElementById("tilingTileSize").value;
    const isDirectMode = document.getElementById("tilingInputModeToggle").checked;
    let area = 0;
    if (isDirectMode) {
        area = parseFloat(document.getElementById("tilingDirectArea").value) || 0;
    } else {
        area = parseFloat(document.getElementById("tilingArea").value) || 0;
    }
    const groutWidth = parseFloat(document.getElementById("tilingGroutWidth").value) || 2.0;
    const tileThickness = parseFloat(document.getElementById("tilingTileThickness").value) || 8;
    const method = document.getElementById("tilingMethod").value;
    const mixRatio = document.getElementById("tilingMixRatio").value;
    const tileWaste = parseFloat(document.getElementById("tilingTileWaste").value) || 0;
    const adhesiveWaste = parseFloat(document.getElementById("tilingAdhesiveWaste").value) || 0;
    const groutWaste = parseFloat(document.getElementById("tilingGroutWaste").value) || 0;

    const result = calculateTiling(area, tileSize, method, mixRatio, groutWidth, tileThickness, tileWaste, adhesiveWaste, groutWaste);
    const previewContainer = document.getElementById("tilingPreview");

    // Calculate approximate cost for preview
    let totalCost = 0;
    // Tiling Accessories Prices
    totalCost += result.crossPacks * materialPrices["tile-cross"];
    totalCost += result.clipsPacks * materialPrices["tile-clips"];
    totalCost += result.wedgesPacks * materialPrices["tile-wedges"];
    // Grout Price
    totalCost += result.groutKg * materialPrices["tile-grout"];

    // Adhesive / Cement mixed prices
    if (method === "adhesive-pure") {
        totalCost += result.adhesiveBags * materialPrices["tile-adhesive"];
    } else {
        totalCost += result.adhesiveBags * materialPrices["tile-adhesive"];
        totalCost += result.cementBags * materialPrices["cement-pc40"];
    }

    let adhesiveDetailsHTML = '';
    if (method === "adhesive-pure") {
        adhesiveDetailsHTML = `
            <div class="preview-stat">
                <label>Keo dán gạch chuyên dụng:</label>
                <div class="value-group">
                    <div class="main-value">
                        <span class="value">${formatNumber(result.adhesiveBags)}</span>
                        <span class="unit">bao (25kg)</span>
                    </div>
                    <span class="sub-value">Khối lượng: ${formatNumber(result.adhesiveKg, 1)} kg</span>
                </div>
            </div>
        `;
    } else {
        const ratioText = mixRatio === "1:1" ? "1 Keo : 1 Xi" : mixRatio === "2:1" ? "2 Keo : 1 Xi" : "1 Keo : 2 Xi";
        adhesiveDetailsHTML = `
            <div class="preview-stat">
                <label>Keo dán gạch (tỷ lệ trộn):</label>
                <div class="value-group">
                    <div class="main-value">
                        <span class="value">${formatNumber(result.adhesiveBags)}</span>
                        <span class="unit">bao (25kg)</span>
                    </div>
                    <span class="sub-value">Khối lượng: ${formatNumber(result.adhesiveKg, 1)} kg (${ratioText})</span>
                </div>
            </div>
            <div class="preview-stat">
                <label>Xi măng PC40 trộn dán:</label>
                <div class="value-group">
                    <div class="main-value">
                        <span class="value">${formatNumber(result.cementBags)}</span>
                        <span class="unit">bao (50kg)</span>
                    </div>
                    <span class="sub-value">Khối lượng: ${formatNumber(result.cementKg, 1)} kg</span>
                </div>
            </div>
        `;
    }

    let clipsDetailsHTML = '';
    if (result.clipsCount > 0) {
        clipsDetailsHTML = `
            <div class="preview-stat">
                <label>Ke cân bằng gạch (Clips):</label>
                <div class="value-group">
                    <div class="main-value">
                        <span class="value">${formatNumber(result.clipsPacks)}</span>
                        <span class="unit">túi (100 chiếc)</span>
                    </div>
                    <span class="sub-value">Số chiếc: ${formatNumber(result.clipsCount)} chiếc</span>
                </div>
            </div>
            <div class="preview-stat">
                <label>Nêm khóa phẳng (Wedges):</label>
                <div class="value-group">
                    <div class="main-value">
                        <span class="value">${formatNumber(result.wedgesPacks)}</span>
                        <span class="unit">túi (100 chiếc)</span>
                    </div>
                    <span class="sub-value">Số chiếc: ${formatNumber(result.wedgesCount)} chiếc</span>
                </div>
            </div>
        `;
    }

    previewContainer.innerHTML = `
        <div class="preview-stat">
            <label>Diện tích ốp lát gạch:</label>
            <div class="value-group">
                <div class="main-value">
                    <span class="value text-bold" style="color: var(--border-focus);">${formatNumber(result.area, 2)}</span>
                    <span class="unit">m²</span>
                </div>
            </div>
        </div>
        <div class="preview-stat">
            <label>Gạch cần mua (${tileSize} cm):</label>
            <div class="value-group">
                <div class="main-value">
                    <span class="value">${formatNumber(result.boxesCount)}</span>
                    <span class="unit">hộp</span>
                </div>
                <span class="sub-value">Số gạch: ${formatNumber(result.tilesCount)} viên (Hộp: ${result.tileSpecSize} viên)</span>
            </div>
        </div>
        
        <h4 class="preview-subtitle mt-3">Vật liệu dán & phụ kiện dự kiến:</h4>
        ${adhesiveDetailsHTML}
        
        <div class="preview-stat">
            <label>Keo chà ron chít mạch:</label>
            <div class="value-group">
                <div class="main-value">
                    <span class="value">${formatNumber(result.groutKg, 2)}</span>
                    <span class="unit">kg</span>
                </div>
                <span class="sub-value">Mạch chít rộng: ${groutWidth}mm | Dày: ${tileThickness}mm</span>
            </div>
        </div>
        <div class="preview-stat">
            <label>Ke định vị chữ thập:</label>
            <div class="value-group">
                <div class="main-value">
                    <span class="value">${formatNumber(result.crossPacks)}</span>
                    <span class="unit">túi (100 chiếc)</span>
                </div>
                <span class="sub-value">Số chiếc: ${formatNumber(result.crossCount)} chiếc</span>
            </div>
        </div>
        ${clipsDetailsHTML}

        <div class="preview-total">
            <span class="cost-label">DỰ TOÁN CHI PHÍ HẠNG MỤC</span>
            <span class="cost-value">${formatVND(totalCost)}</span>
        </div>
    `;
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Renders local prices in Bảng Đơn Giá (Tab 4)
 */
function renderPricesTable() {
    const tableBody = document.getElementById("pricesTableBody");
    tableBody.innerHTML = "";

    const priceKeys = Object.keys(materialPrices);
    
    priceKeys.forEach(key => {
        const metadata = MATERIAL_METADATA[key] || { name: key, spec: "Tiêu chuẩn", unit: "đơn vị" };
        const row = document.createElement("tr");

        row.innerHTML = `
            <td class="text-bold">${metadata.name}</td>
            <td><span class="text-gray">${metadata.spec}</span></td>
            <td>${metadata.unit}</td>
            <td>
                <input type="number" class="price-input" data-price-key="${key}" value="${materialPrices[key]}" min="0" step="500">
            </td>
            <td>
                <span class="formatted-price-preview text-bold" style="color: var(--border-focus);">${formatNumber(materialPrices[key])} đ</span>
            </td>
        `;

        // Listen for price modifications
        const input = row.querySelector(".price-input");
        
        // Auto-select on focus for dynamic price inputs
        input.addEventListener("focus", function() {
            this.select();
        });

        input.addEventListener("input", (e) => {
            const val = parseFloat(e.target.value) || 0;
            materialPrices[key] = val;
            localStorage.setItem("anlaa_prices", JSON.stringify(materialPrices));
            
            // Update formatted output inside row
            row.querySelector(".formatted-price-preview").innerText = `${formatNumber(val)} đ`;
            
            // Recalculate BOQ table & Sidebar Previews
            updateBOQTable();
            triggerAllPreviews();
        });

        tableBody.appendChild(row);
    });
}

/**
 * Initializes button action listeners (Add, Delete, Reset, Export, Save/Load JSON)
 */
function initActionListeners() {
    // 1. ADD MASONRY ITEM
    document.getElementById("btnAddMasonry").addEventListener("click", () => {
        const isDirectMode = document.getElementById("masonryInputModeToggle").checked;
        const name = document.getElementById("masonryItemName").value.trim() || "Xây tường không tên";
        const brickType = document.getElementById("masonryBrickType").value;
        const mortarGrade = document.getElementById("masonryMortarGrade").value;
        const brickWaste = parseFloat(document.getElementById("masonryBrickWaste").value) || 0;
        const mortarWaste = parseFloat(document.getElementById("masonryMortarWaste").value) || 0;

        // Column plaster settings
        let columnPlasterSettings = { enabled: false };
        if (document.getElementById("masonryPlasterColumns").checked) {
            columnPlasterSettings = {
                enabled: true,
                length: parseFloat(document.getElementById("masonryColumnLength").value) || 0,
                width: parseFloat(document.getElementById("masonryColumnWidth").value) || 0
            };
        }

        // Auto plaster settings
        let autoPlasterSettings = { enabled: false };
        const autoPlasterVal = document.getElementById("masonryAutoPlaster").value;
        
        if (autoPlasterVal !== "none" || (brickType === "none" && isDirectMode)) {
            const directPlasterAreaInput = document.getElementById("masonryDirectPlasterArea");
            const directPlasterArea = directPlasterAreaInput ? parseFloat(directPlasterAreaInput.value) || 0 : 0;
            
            autoPlasterSettings = {
                enabled: true,
                faces: autoPlasterVal === "auto" ? "auto" : (parseInt(autoPlasterVal) || 1),
                thickness: parseFloat(document.getElementById("masonryPlasterThickness").value) || 1.5,
                mortarGrade: document.getElementById("masonryPlasterMortarGrade").value,
                waste: parseFloat(document.getElementById("masonryPlasterWaste").value) || 0,
                directPlasterArea: isDirectMode ? directPlasterArea : null
            };
        }

        let result;
        let directArea = 0;
        let directWallType = "110";

        if (isDirectMode) {
            if (brickType === "none") {
                const directPlasterAreaInput = document.getElementById("masonryDirectPlasterArea");
                const directPlasterArea = directPlasterAreaInput ? parseFloat(directPlasterAreaInput.value) || 0 : 0;
                if (directPlasterArea <= 0) {
                    showToast("Diện tích trát phải lớn hơn 0!", "danger");
                    return;
                }
            } else {
                directArea = parseFloat(document.getElementById("masonryDirectArea").value) || 0;
                if (directArea <= 0) {
                    showToast("Diện tích xây phải lớn hơn 0!", "danger");
                    return;
                }
            }
            directWallType = document.getElementById("masonryDirectWallType").value;
            const fakeWallSegments = [{ length: brickType === "none" ? 0 : directArea, height: 1, wallType: directWallType, multiplier: 1 }];
            const fakeDoorDeductions = [];
            result = calculateMasonry(fakeWallSegments, fakeDoorDeductions, brickType, mortarGrade, brickWaste, mortarWaste, autoPlasterSettings, null, null);
        } else {
            if (wallSegments.length === 0 || wallSegments.reduce((sum, s) => sum + (s.length * s.height), 0) === 0) {
                showToast("Vui lòng nhập chi tiết kích thước bức tường!", "danger");
                return;
            }
            result = calculateMasonry(wallSegments, doorDeductions, brickType, mortarGrade, brickWaste, mortarWaste, autoPlasterSettings, columnPlasterSettings, null);
        }
        
        if (result.error) {
            showToast("Vui lòng sửa các lỗi nhập liệu trước khi thêm!", "danger");
            return;
        }

        const newItem = {
            id: generateUUID(),
            type: "masonry",
            name: name,
            inputs: {
                isDirectMode,
                brickType,
                mortarGrade,
                brickWaste,
                mortarWaste,
                wallSegments: isDirectMode ? null : [...wallSegments],
                doorDeductions: isDirectMode ? null : [...doorDeductions],
                columnPlaster: columnPlasterSettings,
                autoPlaster: autoPlasterSettings,
                directArea: isDirectMode ? directArea : null,
                directWallType: isDirectMode ? directWallType : null,
                directPlasterArea: (isDirectMode && autoPlasterSettings.enabled) ? autoPlasterSettings.directPlasterArea : null
            },
            results: result
        };

        currentProject.items.push(newItem);
        saveProjectToStorage();
        updateSidebarList();
        updateBOQTable();
        showToast(`Đã thêm hạng mục xây "${name}"!`);
        
        logAuditEvent("ADD_ITEM", `Thêm hạng mục xây "${name}": S=${result.netArea.toFixed(2)}m2, Gạch=${result.bricksCount} viên.`);
    });

    // 2. ADD PLASTERING ITEM
    document.getElementById("btnAddPlastering").addEventListener("click", () => {
        const name = document.getElementById("plasteringItemName").value.trim() || "Cán nền không tên";
        const isDirectMode = document.getElementById("plasteringInputModeToggle").checked;
        const mortarGrade = document.getElementById("plasteringMortarGrade").value;
        const mortarWaste = parseFloat(document.getElementById("plasteringWaste").value) || 0;

        let area = 0;
        if (isDirectMode) {
            area = parseFloat(document.getElementById("plasteringDirectArea").value) || 0;
        } else {
            area = parseFloat(document.getElementById("plasteringArea").value) || 0;
        }

        if (area <= 0) {
            showToast("Diện tích thi công phải lớn hơn 0!", "danger");
            return;
        }

        const thickness = parseFloat(document.getElementById("screedingThickness").value) || 3.0;
        const result = calculateScreeding(area, thickness, mortarGrade, mortarWaste);

        const newItem = {
            id: generateUUID(),
            type: "plastering",
            name: name,
            inputs: {
                workType: "screed-floor",
                isDirectMode,
                mortarGrade,
                mortarWaste,
                screedThickness: thickness,
                directArea: isDirectMode ? area : null,
                area: isDirectMode ? null : area
            },
            results: result
        };

        currentProject.items.push(newItem);
        saveProjectToStorage();
        updateSidebarList();
        updateBOQTable();
        
        showToast(`Đã thêm hạng mục cán nền "${name}"!`);
        
        logAuditEvent("ADD_ITEM", `Thêm hạng mục cán nền "${name}": S=${area.toFixed(2)}m2, Xi măng=${result.cementBags} bao.`);
    });

    // 3. ADD TILING ITEM
    document.getElementById("btnAddTiling").addEventListener("click", () => {
        const name = document.getElementById("tilingItemName").value.trim() || "Ốp lát không tên";
        const isDirectMode = document.getElementById("tilingInputModeToggle").checked;
        const tileSize = document.getElementById("tilingTileSize").value;
        
        let area = 0;
        if (isDirectMode) {
            area = parseFloat(document.getElementById("tilingDirectArea").value) || 0;
        } else {
            area = parseFloat(document.getElementById("tilingArea").value) || 0;
        }

        const groutWidth = parseFloat(document.getElementById("tilingGroutWidth").value) || 2.0;
        const tileThickness = parseFloat(document.getElementById("tilingTileThickness").value) || 8;
        const method = document.getElementById("tilingMethod").value;
        const mixRatio = document.getElementById("tilingMixRatio").value;
        const tileWaste = parseFloat(document.getElementById("tilingTileWaste").value) || 0;
        const adhesiveWaste = parseFloat(document.getElementById("tilingAdhesiveWaste").value) || 0;
        const groutWaste = parseFloat(document.getElementById("tilingGroutWaste").value) || 0;

        const result = calculateTiling(area, tileSize, method, mixRatio, groutWidth, tileThickness, tileWaste, adhesiveWaste, groutWaste);

        if (area <= 0) {
            showToast("Diện tích ốp lát phải lớn hơn 0!", "danger");
            return;
        }

        const newItem = {
            id: generateUUID(),
            type: "tiling",
            name: name,
            inputs: {
                isDirectMode,
                tileSize,
                method,
                mixRatio,
                groutWidth,
                tileThickness,
                tileWaste,
                adhesiveWaste,
                groutWaste,
                area: isDirectMode ? null : area,
                directArea: isDirectMode ? area : null
            },
            results: result
        };

        currentProject.items.push(newItem);
        saveProjectToStorage();
        updateSidebarList();
        updateBOQTable();
        renderPricesTable(); // Refresh price table to show tile-gạch price if newly added
        showToast(`Đã thêm hạng mục ốp lát "${name}"!`);

        logAuditEvent("ADD_ITEM", `Thêm hạng mục ốp lát "${name}": S=${result.area.toFixed(2)}m2, Gạch=${result.boxesCount} hộp.`);
    });

    // 4. RESET PROJECT
    document.getElementById("btnResetProject").addEventListener("click", () => {
        if (confirm("⚠️ CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ hạng mục trong dự án này? Thao tác này không thể phục hồi!")) {
            currentProject.items = [];
            saveProjectToStorage();
            updateSidebarList();
            updateBOQTable();
            showToast("Đã reset toàn bộ dự án!", "danger");
            
            logAuditEvent("RESET_PROJECT", "Xóa toàn bộ các hạng mục trong dự án.");
        }
    });

    // 5. EXPORT JSON FILE
    document.getElementById("btnSaveProject").addEventListener("click", () => {
        if (currentProject.items.length === 0) {
            showToast("Chưa có hạng mục nào để lưu!", "danger");
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentProject, null, 4));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        const sanitizeName = currentProject.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
        dlAnchorElem.setAttribute("download", `project-boq-${sanitizeName}.json`);
        dlAnchorElem.click();
        showToast("Tải file cấu hình dự án (.json) thành công!");
        
        logAuditEvent("EXPORT_JSON", `Xuất file JSON dự án "${currentProject.name}"`);
    });

    // 6. IMPORT JSON FILE
    document.getElementById("btnLoadProjectTrigger").addEventListener("click", () => {
        document.getElementById("btnLoadProject").click();
    });

    document.getElementById("btnLoadProject").addEventListener("change", (e) => {
        const fileReader = new FileReader();
        fileReader.onload = function(event) {
            try {
                const parsedData = JSON.parse(event.target.result);
                if (parsedData && Array.isArray(parsedData.items)) {
                    currentProject = parsedData;
                    document.getElementById("projectName").value = currentProject.name || "Cải tạo Căn hộ Chung cư";
                    document.getElementById("projectAddress").value = currentProject.address || "Hà Nội";
                    
                    saveProjectToStorage();
                    updateSidebarList();
                    updateBOQTable();
                    showToast("Đã nhập dự án thành công!");
                    
                    logAuditEvent("IMPORT_JSON", `Nhập thành công file JSON dự án "${currentProject.name}" với ${currentProject.items.length} hạng mục.`);
                } else {
                    showToast("File JSON sai định dạng dự án ANLAA!", "danger");
                }
            } catch (err) {
                showToast("Lỗi đọc file JSON cấu trúc!", "danger");
            }
        };
        if (e.target.files[0]) {
            fileReader.readAsText(e.target.files[0]);
        }
    });

    // 7. RESET PRICES
    document.getElementById("btnResetPrices").addEventListener("click", () => {
        if (confirm("Bạn có muốn khôi phục lại bảng đơn giá vật tư mặc định tại Hà Nội?")) {
            materialPrices = { ...DEFAULT_UNIT_PRICES };
            localStorage.setItem("anlaa_prices", JSON.stringify(materialPrices));
            renderPricesTable();
            updateBOQTable();
            triggerAllPreviews();
            showToast("Đã khôi phục đơn giá mặc định Hà Nội!");
            
            logAuditEvent("RESET_PRICES", "Khôi phục bảng đơn giá mặc định tại Hà Nội.");
        }
    });

    // 8. PRINT / EXPORT PDF BOQ (Rule WR-9)
    document.getElementById("btnPrintPDF").addEventListener("click", () => {
        if (currentProject.items.length === 0) {
            showToast("Bảng BOQ trống, vui lòng thêm hạng mục trước khi in!", "danger");
            return;
        }
        
        logAuditEvent("PRINT_PDF", `Thực hiện in / xuất file PDF khổ A4 ngang landscape cho dự án "${currentProject.name}".`);
        
        // Let the document load correctly, then print
        window.print();
    });

    // 9. EXPORT EXCEL CSV (WITH UNICODE BOM tiếng Việt)
    document.getElementById("btnExportCSV").addEventListener("click", () => {
        exportBOQToCSV();
    });

    // 10. EXPORT PNG IMAGE (html2canvas)
    document.getElementById("btnExportImage").addEventListener("click", () => {
        exportBOQToImage();
    });

    // 10.5. FLOATING SUMMARY BAR BUTTONS REDIRECTION
    const floatPDF = document.getElementById("floatingPrintPDF");
    const floatImg = document.getElementById("floatingExportImage");
    const floatCSV = document.getElementById("floatingExportCSV");
    
    if (floatPDF) {
        floatPDF.addEventListener("click", () => {
            document.getElementById("btnPrintPDF").click();
        });
    }
    if (floatImg) {
        floatImg.addEventListener("click", () => {
            document.getElementById("btnExportImage").click();
        });
    }
    if (floatCSV) {
        floatCSV.addEventListener("click", () => {
            document.getElementById("btnExportCSV").click();
        });
    }
}


/**
 * Updates BOQ Subtext titles
 */
function updateBOQSubtext() {
    document.getElementById("printBOQSubtitle").innerText = `Dự án: ${currentProject.name} | Địa điểm: ${currentProject.address}`;
}

/**
 * Re-builds sidebar items list UI
 */
function updateSidebarList() {
    const list = document.getElementById("itemsList");
    const countBadge = document.getElementById("itemsCount");
    if (!list || !countBadge) return;
    
    list.innerHTML = "";
    countBadge.innerText = currentProject.items.length;

    if (currentProject.items.length === 0) {
        list.innerHTML = `<li class="empty-list-msg">Chưa có hạng mục nào được&nbsp;thêm</li>`;
        return;
    }

    currentProject.items.forEach((item) => {
        const li = document.createElement("li");
        li.className = `added-item-card cat-${item.type}`;
        
        let typeName = "";
        let metaText = "";
        
        if (item.type === "masonry") {
            typeName = "Xây Xát";
            metaText = `S = ${item.results.netArea.toFixed(1)}m²`;
        } else if (item.type === "plastering") {
            typeName = "Cán nền";
            metaText = `S = ${item.results.area.toFixed(1)}m²`;
        } else if (item.type === "tiling") {
            typeName = "Ốp lát";
            metaText = `S = ${item.results.area.toFixed(1)}m²`;
        }

        li.innerHTML = `
            <div class="item-info" onclick="focusOnTab('${item.type}')" style="cursor:pointer;">
                <span class="item-name">${escapeHtml(item.name)}</span>
                <span class="item-meta">
                    <strong>${typeName}</strong> • ${metaText}
                </span>
            </div>
            <button class="btn-delete-item" onclick="deleteItem('${item.id}', '${item.name}')" title="Xóa hạng mục này">
                ×
            </button>
        `;

        list.appendChild(li);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Focuses on specific UI Tab when item is clicked
 */
window.focusOnTab = function(type) {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach(b => b.classList.remove("active"));
    tabContents.forEach(c => c.classList.remove("active"));

    const btn = document.querySelector(`.tab-btn[data-tab="${type}"]`);
    btn.classList.add("active");
    document.getElementById(`tab-${type}`).classList.add("active");
    
    // Smooth scroll to top of main workspace
    document.querySelector(".app-main").scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Deletes item from list and storage
 */
window.deleteItem = function(id, name) {
    event.stopPropagation(); // Avoid triggering tab focus click
    if (confirm(`Bạn có chắc chắn muốn xóa hạng mục "${name}"?`)) {
        currentProject.items = currentProject.items.filter(item => item.id !== id);
        saveProjectToStorage();
        updateSidebarList();
        updateBOQTable();
        showToast(`Đã xóa hạng mục "${name}"!`, "danger");
        
        logAuditEvent("DELETE_ITEM", `Xóa hạng mục "${name}".`);
    }
}

/**
 * Aggregates all materials from multiple rooms and builds BOQ table (Rule §12a)
 */
function updateBOQTable() {
    const tableBody = document.getElementById("boqTableBody");
    const costInWordsBox = document.getElementById("costInWordsBox");
    
    tableBody.innerHTML = "";

    // Sync auto construction cost items from project items
    syncAutoConstructionItems();
    updateConstructionCostSection();

    if (currentProject.items.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-boq-msg">Chưa có hạng mục nào được thêm để tổng hợp&nbsp;BOQ</td>
            </tr>
        `;
        costInWordsBox.style.display = "none";
        renderChart({}); // Reset chart with empty values
        const noteBox = document.getElementById("plasteringNoteBox");
        if (noteBox) noteBox.style.display = "none";

        const floatingTotal = document.getElementById("floatingGrandTotal");
        if (floatingTotal) floatingTotal.innerText = "0 VNĐ";
        return;
    }

    // 1. Aggregation map
    // Key: material key in MATERIAL_METADATA, Value: { theory, final }
    const boqAgg = {};
    let hasPlastering = false;
    
    currentProject.items.forEach(item => {
        if (item.type === "masonry") {
            const res = item.results;
            
            // Bricks
            const brickKey = res.brickType;
            if (!boqAgg[brickKey]) boqAgg[brickKey] = { theory: 0, final: 0 };
            boqAgg[brickKey].theory += res.bricksTheory;
            boqAgg[brickKey].final += res.bricksCount;

            // Check if there is auto-plastering
            if (res.hasAutoPlaster && res.autoPlaster) {
                hasPlastering = true;
            }

            if (res.brickType === "brick-aac") {
                // Special Mortar AAC
                const aacMortarKey = "tile-adhesive"; // AAC special mortar packed in adhesive bags
                if (!boqAgg[aacMortarKey]) boqAgg[aacMortarKey] = { theory: 0, final: 0 };
                // 1 bag = 25kg dry mix
                boqAgg[aacMortarKey].theory += res.specialAACMortarKg / 25;
                boqAgg[aacMortarKey].final += res.specialAACMortarBags;
            } else {
                // Cement PC40
                const cementKey = "cement-pc40";
                if (!boqAgg[cementKey]) boqAgg[cementKey] = { theory: 0, final: 0 };
                // Convert kg cement to bag equivalent for raw sum, then round final
                boqAgg[cementKey].theory += res.cementKg / 50;
                boqAgg[cementKey].final += res.cementKg; // store in kg, round at end

                // Sand building
                const sandKey = "sand-fine";
                if (!boqAgg[sandKey]) boqAgg[sandKey] = { theory: 0, final: 0 };
                boqAgg[sandKey].theory += res.sandM3;
                boqAgg[sandKey].final += res.sandM3;
            }
        } 
        
        else if (item.type === "plastering") {
            const res = item.results;

            // Cement PC40
            const cementKey = "cement-pc40";
            if (!boqAgg[cementKey]) boqAgg[cementKey] = { theory: 0, final: 0 };
            boqAgg[cementKey].theory += res.cementKg / 50;
            boqAgg[cementKey].final += res.cementKg; // store in kg, round at end

            // Sand cán nền
            const sandKey = "sand-fine";
            if (!boqAgg[sandKey]) boqAgg[sandKey] = { theory: 0, final: 0 };
            boqAgg[sandKey].theory += res.sandM3;
            boqAgg[sandKey].final += res.sandM3;
        } 
        
        else if (item.type === "tiling") {
            const res = item.results;
            const size = res.tileSize;

            // Dynamic Gạch ốp lát key based on size
            const tileKey = `tile-gạch_${size}`;
            if (!boqAgg[tileKey]) boqAgg[tileKey] = { theory: 0, final: 0 };
            // Round boxes count
            boqAgg[tileKey].theory += res.tilesTheory / res.tileSpecSize;
            boqAgg[tileKey].final += res.boxesCount;

            // Tiling adhesive
            if (res.adhesiveBags > 0) {
                const adhesiveKey = "tile-adhesive";
                if (!boqAgg[adhesiveKey]) boqAgg[adhesiveKey] = { theory: 0, final: 0 };
                boqAgg[adhesiveKey].theory += res.adhesiveKg / 25;
                boqAgg[adhesiveKey].final += res.adhesiveBags;
            }

            // Tiling Cement PC40 (if mixed method)
            if (res.cementBags > 0) {
                const cementKey = "cement-pc40";
                if (!boqAgg[cementKey]) boqAgg[cementKey] = { theory: 0, final: 0 };
                boqAgg[cementKey].theory += res.cementKg / 50;
                boqAgg[cementKey].final += res.cementKg; // add in kg
            }

            // Grout chà ron
            const groutKey = "tile-grout";
            if (!boqAgg[groutKey]) boqAgg[groutKey] = { theory: 0, final: 0 };
            boqAgg[groutKey].theory += res.groutKg;
            boqAgg[groutKey].final += res.groutKg;

            // Cross packs
            const crossKey = "tile-cross";
            if (!boqAgg[crossKey]) boqAgg[crossKey] = { theory: 0, final: 0 };
            boqAgg[crossKey].theory += res.crossCount / 100;
            boqAgg[crossKey].final += res.crossPacks;

            // Clips
            if (res.clipsPacks > 0) {
                const clipsKey = "tile-clips";
                if (!boqAgg[clipsKey]) boqAgg[clipsKey] = { theory: 0, final: 0 };
                boqAgg[clipsKey].theory += res.clipsCount / 100;
                boqAgg[clipsKey].final += res.clipsPacks;
            }

            // Wedges
            if (res.wedgesPacks > 0) {
                const wedgesKey = "tile-wedges";
                if (!boqAgg[wedgesKey]) boqAgg[wedgesKey] = { theory: 0, final: 0 };
                boqAgg[wedgesKey].theory += res.wedgesCount / 100;
                boqAgg[wedgesKey].final += res.wedgesPacks;
            }
        }
    });

    // 2. Format & aggregate raw kg of Cement PC40 back to bags
    if (boqAgg["cement-pc40"]) {
        // We stored raw kg in 'final', convert to bags and ceil
        const totalCementKg = boqAgg["cement-pc40"].final;
        boqAgg["cement-pc40"].final = Math.ceil(totalCementKg / 50);
    }

    // Toggle plastering disclaimer note box visibility
    const noteBox = document.getElementById("plasteringNoteBox");
    if (noteBox) {
        noteBox.style.display = hasPlastering ? "block" : "none";
    }

    // 3. Render rows
    let index = 1;
    let grandTotalCost = 0;
    const chartData = {};

    const aggregatedKeys = Object.keys(boqAgg);
    
    aggregatedKeys.forEach(key => {
        let isTileSizeSpec = key.startsWith("tile-gạch_");
        let queryKey = isTileSizeSpec ? "tile-gạch" : key;
        
        const metadata = MATERIAL_METADATA[queryKey];
        if (!metadata) return;

        let matName = metadata.name;
        let matSpec = metadata.spec;
        let matUnit = metadata.unit;
        let priceKey = queryKey;

        // Custom Tile specs based on size
        if (isTileSizeSpec) {
            const size = key.split("_")[1];
            matName = `Gạch ốp lát ${size} cm`;
            matSpec = `Gạch thương mại đóng hộp ${size}cm`;
            matUnit = "hộp";
            priceKey = "tile-gạch";
            // Let's dynamically add "tile-gạch" to price list if not there.
            if (!materialPrices[priceKey]) {
                materialPrices[priceKey] = 250000; // Mặc định gạch lát 250.000 VNĐ / hộp
                localStorage.setItem("anlaa_prices", JSON.stringify(materialPrices));
            }
        }

        const unitPrice = materialPrices[priceKey] || 0;
        
        const theory = boqAgg[key].theory;
        const final = boqAgg[key].final;
        
        const wasteQty = final - theory;
        const wastePercent = theory > 0 ? (wasteQty / theory) * 100 : 0;

        const subtotal = final * unitPrice;
        grandTotalCost += subtotal;

        // Store chart data
        if (subtotal > 0) {
            chartData[matName] = subtotal;
        }

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index++}</td>
            <td class="text-bold">${matName}</td>
            <td><span class="text-gray">${matSpec}</span></td>
            <td class="text-right text-theory">${formatNumber(theory, 2)}</td>
            <td class="text-right text-muted" style="font-size: 11px;">${formatNumber(wasteQty, 2)} (${wastePercent.toFixed(1)}%)</td>
            <td class="text-right text-final text-bold">${formatNumber(final, 2)}</td>
            <td>${matUnit}</td>
            <td class="text-right">${formatNumber(unitPrice)} đ</td>
            <td class="text-right text-cost text-bold">${formatNumber(subtotal)} đ</td>
        `;

        tableBody.appendChild(row);
    });

    // 4. Render grand total row
    const totalRow = document.createElement("tr");
    totalRow.className = "total-row";
    totalRow.innerHTML = `
        <td colspan="7" class="text-right">TỔNG CỘNG DỰ TOÁN VẬT TƯ</td>
        <td colspan="2" class="text-right">${formatVND(grandTotalCost)}</td>
    `;
    tableBody.appendChild(totalRow);

    // 5. Cost in Words reader conversion
    if (grandTotalCost > 0) {
        costInWordsBox.style.display = "block";
        document.getElementById("costInWordsText").innerText = convertNumberToVietnameseWords(grandTotalCost);
    } else {
        costInWordsBox.style.display = "none";
    }

    // 5.5 Update Floating Summary Bar (dynamic)
    const floatingTotal = document.getElementById("floatingGrandTotal");
    if (floatingTotal) {
        floatingTotal.innerText = formatVND(grandTotalCost);
    }

    // 6. Update visual Chart
    renderChart(chartData);
}

/**
 * Renders Chart.js Pie visualization (Hidden on print)
 */
function renderChart(chartData) {
    const ctx = document.getElementById("materialChart").getContext("2d");
    
    if (activeChart) {
        activeChart.destroy();
    }

    const labels = Object.keys(chartData);
    const data = Object.values(chartData);

    if (labels.length === 0) {
        return;
    }

    activeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#00f2fe', '#d500f9', '#ffa726', '#00e676', '#2979ff', 
                    '#ff1744', '#00e5ff', '#ffeb3b', '#76ff03', '#f50057'
                ],
                borderWidth: 1,
                borderColor: '#161925'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#cbd5e0',
                        font: {
                            family: 'Inter',
                            size: 10
                        },
                        padding: 12,
                        boxWidth: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            return ` ${context.label}: ${formatVND(value)}`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

/**
 * Lập trình giải thuật chuyển số thành chữ tiếng Việt chuẩn xác (Vietnamese Currency Reader)
 * Hỗ trợ tối đa chi phí lên đến hàng tỷ đồng cải tạo.
 */
function convertNumberToVietnameseWords(number) {
    if (number === 0) return "Không đồng.";
    
    const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    
    // Helper function to read a group of 3 digits
    function readGroupOfThree(n, showZeroHundred = false) {
        const hundred = Math.floor(n / 100);
        const ten = Math.floor((n % 100) / 10);
        const unit = n % 10;
        let res = "";

        // Read hundred
        if (hundred > 0) {
            res += units[hundred] + " trăm ";
        } else if (showZeroHundred) {
            res += "không trăm ";
        }

        // Read ten
        if (ten > 1) {
            res += units[ten] + " mươi ";
        } else if (ten === 1) {
            res += "mười ";
        } else if (ten === 0 && unit > 0 && (hundred > 0 || showZeroHundred)) {
            res += "lẻ ";
        }

        // Read unit
        if (unit === 1) {
            if (ten > 1) {
                res += "mốt";
            } else {
                res += "một";
            }
        } else if (unit === 5) {
            if (ten > 0) {
                res += "lăm";
            } else {
                res += "năm";
            }
        } else if (unit > 0) {
            res += units[unit];
        }

        return res.trim();
    }

    let rawVal = Math.round(number);
    let str = "";
    
    const billion = Math.floor(rawVal / 1000000000);
    rawVal %= 1000000000;
    const million = Math.floor(rawVal / 1000000);
    rawVal %= 1000000;
    const thousand = Math.floor(rawVal / 1000);
    rawVal %= 1000;
    const rem = rawVal;

    if (billion > 0) {
        str += readGroupOfThree(billion, false) + " tỷ ";
    }
    
    if (million > 0) {
        const showZero = billion > 0;
        str += readGroupOfThree(million, showZero) + " triệu ";
    } else if (billion > 0) {
        str += ""; // Skip if intermediate million is zero but billion exists
    }

    if (thousand > 0) {
        const showZero = billion > 0 || million > 0;
        str += readGroupOfThree(thousand, showZero) + " nghìn ";
    }

    if (rem > 0) {
        const showZero = billion > 0 || million > 0 || thousand > 0;
        str += readGroupOfThree(rem, showZero);
    }

    str = str.trim() + " đồng.";
    
    // Capitalize first letter
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/\s+/g, ' ');
}

/**
 * Exports aggregated BOQ data to professional Excel CSV file
 * Solves Vietnamese font issues using Unicode BOM
 */
function exportBOQToCSV() {
    if (currentProject.items.length === 0) {
        showToast("Bảng BOQ trống, không có dữ liệu để xuất!", "danger");
        return;
    }

    let csvContent = "";
    
    // CSV Header info
    csvContent += `BẢNG TỔNG HỢP KHỐI LƯỢNG VẬT TƯ & DỰ TOÁN CHI PHÍ\r\n`;
    csvContent += `Dự án: ${currentProject.name}\r\n`;
    csvContent += `Địa điểm: ${currentProject.address}\r\n`;
    csvContent += `Ngày lập: ${new Date().toLocaleDateString("vi-VN")}\r\n\r\n`;

    // Table Column Headers
    csvContent += `STT,Tên vật tư,Quy cách đóng gói,Khối lượng lý thuyết,Khối lượng cần mua,Đơn vị,Đơn giá (VNĐ),Thành tiền (VNĐ)\r\n`;

    // Iterate table data dynamically
    const rows = document.querySelectorAll("#boqTable tbody tr");
    rows.forEach((row, i) => {
        // Skip total row or empty message
        if (row.classList.contains("total-row") || row.querySelector(".empty-boq-msg")) return;

        const cells = row.querySelectorAll("td");
        if (cells.length < 9) return;

        const stt = cells[0].innerText;
        const name = `"${cells[1].innerText}"`;
        const spec = `"${cells[2].innerText}"`;
        const theory = cells[3].innerText.replace(/\./g, ""); // clean formatting for Excel numeric parse
        const buy = cells[5].innerText.replace(/\./g, "");
        const unit = cells[6].innerText;
        const price = cells[7].innerText.replace(/\./g, "").replace(" đ", "");
        const subtotal = cells[8].innerText.replace(/\./g, "").replace(" đ", "");

        csvContent += `${stt},${name},${spec},${theory},${buy},${unit},${price},${subtotal}\r\n`;
    });

    // Add total sum at bottom (aligned to 8-column CSV structure)
    const totalCostStr = document.querySelector(".boq-table tr.total-row td:last-child").innerText.replace(/\./g, "").replace(" VNĐ", "");
    csvContent += `,,,,,,TỔNG CỘNG DỰ TOÁN VẬT TƯ,${totalCostStr}\r\n`;
    
    // Add cost in words
    const words = document.getElementById("costInWordsText").innerText;
    csvContent += `Viết bằng chữ: "${words}"\r\n`;

    // Check if there is plastering work to append the note
    let hasPlastering = false;
    currentProject.items.forEach(item => {
        if (item.type === "masonry" && item.results.hasAutoPlaster) {
            hasPlastering = true;
        }
    });

    if (hasPlastering) {
        csvContent += `Lưu ý hạng mục Trát tường: Khối lượng tính toán không bao gồm công tác đắp phào chỉ nẹp góc hoặc nẹp tách khe vật liệu.\r\n`;
    }

    // 🔴 CRITICAL: Prepend Unicode BOM to make Excel render Vietnamese diacritics correctly
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const sanitizeName = currentProject.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    link.setAttribute("href", url);
    link.setAttribute("download", `boq-vat-tu-${sanitizeName}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Xuất báo cáo Excel (CSV) tiếng Việt thành công!");
    
    logAuditEvent("EXPORT_CSV", `Xuất báo cáo CSV dự toán cho "${currentProject.name}".`);
}

/**
 * Captures clean BOQ table as high quality PNG file using html2canvas
 */
function exportBOQToImage() {
    if (currentProject.items.length === 0) {
        showToast("Bảng BOQ trống, không có dữ liệu để xuất!", "danger");
        return;
    }

    showToast("Đang tạo tệp ảnh BOQ, vui lòng đợi...");

    const targetArea = document.getElementById("boq-report-area");
    
    // Add dynamic class to optimize capture sizing
    targetArea.classList.add("capturing-image");

    // html2canvas config
    const options = {
        backgroundColor: "#0d0e15", // Force Dark background theme for high quality wow effect
        scale: 2, // Double quality
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
            // Cloned document configuration if we want to toggle elements prior to photo
            const actionButtons = clonedDoc.querySelector(".boq-actions-block");
            if (actionButtons) actionButtons.style.display = "none";
        }
    };

    html2canvas(targetArea, options).then(canvas => {
        const link = document.createElement("a");
        const sanitizeName = currentProject.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
        
        link.download = `boq-bao-cao-${sanitizeName}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

        targetArea.classList.remove("capturing-image");
        showToast("Tải ảnh BOQ (PNG) thành công!");
        
        logAuditEvent("EXPORT_PNG", `Xuất ảnh PNG chất lượng cao cho dự án "${currentProject.name}".`);
    }).catch(err => {
        targetArea.classList.remove("capturing-image");
        showToast("Gặp lỗi khi tạo file ảnh!", "danger");
    });
}

/**
 * Standard dynamic notification toasts
 */
function showToast(message, type = "success") {
    const toast = document.getElementById("toastNotification");
    toast.innerText = message;
    
    // Set colors based on notification type
    if (type === "danger") {
        toast.style.borderColor = "#ff5252";
        toast.style.boxShadow = "0 10px 30px rgba(255, 82, 82, 0.2)";
    } else {
        toast.style.borderColor = "var(--border-focus)";
        toast.style.boxShadow = "0 10px 30px rgba(0, 242, 254, 0.2)";
    }

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

/**
 * UUID generator for dynamic item indices
 */
function generateUUID() {
    return 'item-xxxx-4xxx-yxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Initializes spreadsheets-like interactive tables for wall segments and doors deductions
 */
function initSpreadsheetTables() {
    // 1. Add Wall Segments
    document.getElementById("btnAddingWallRow").addEventListener("click", () => {
        wallSegments.push({ length: 3.5, height: 2.8, wallType: "110", multiplier: 1, faces: 2 });
        renderWallTable();
        updateMasonryPreview();
    });

    // 2. Add Door Deductions
    document.getElementById("btnAddingDoorRow").addEventListener("click", () => {
        doorDeductions.push({ type: "door-3", width: 0.9, height: 2.2, multiplier: 1, plasterJambs: true });
        renderDoorTable();
        updateMasonryPreview();
    });

    // Initial render
    renderWallTable();
    renderDoorTable();
}

/**
 * Dynamically renders wall segments dynamic table rows
 */
function renderWallTable() {
    const tbody = document.getElementById("wallSegmentsBody");
    tbody.innerHTML = "";

    if (wallSegments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-gray text-xs">Chưa có bức tường nào. Bấm "Thêm bức tường" để bắt đầu.</td></tr>`;
        return;
    }

    wallSegments.forEach((seg, index) => {
        const row = document.createElement("tr");
        const facesChecked = (seg.faces === undefined || seg.faces === 2) ? "checked" : "";
        row.innerHTML = `
            <td><input type="number" class="wall-len-input text-bold" data-index="${index}" value="${seg.length}" min="0.01" step="0.1"></td>
            <td><input type="number" class="wall-height-input text-bold" data-index="${index}" value="${seg.height}" min="0.01" step="0.1"></td>
            <td>
                <select class="wall-thickness-select" data-index="${index}">
                    <option value="110" ${seg.wallType === "110" ? "selected" : ""}>Tường 110 (10cm)</option>
                    <option value="220" ${seg.wallType === "220" ? "selected" : ""}>Tường 220 (20cm)</option>
                </select>
            </td>
            <td><input type="number" class="wall-mult-input text-bold" data-index="${index}" value="${seg.multiplier}" min="1" step="1"></td>
            <td class="text-center" title="Tích = trát 2 mặt, bỏ tích = trát 1 mặt">
                <label class="checkbox-container center-checkbox" style="margin-bottom:0">
                    <input type="checkbox" class="wall-faces-checkbox" data-index="${index}" ${facesChecked}>
                    <span class="checkmark"></span>
                </label>
                <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${facesChecked ? "2 mặt" : "1 mặt"}</div>
            </td>
            <td>
                <button type="button" class="btn-delete-row" data-index="${index}" title="Xóa bức tường này">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;

        // Attach listeners for row changes
        row.querySelector(".wall-len-input").addEventListener("input", function() {
            wallSegments[index].length = parseFloat(this.value) || 0;
            updateMasonryPreview();
        });
        row.querySelector(".wall-height-input").addEventListener("input", function() {
            wallSegments[index].height = parseFloat(this.value) || 0;
            updateMasonryPreview();
        });
        row.querySelector(".wall-thickness-select").addEventListener("change", function() {
            wallSegments[index].wallType = this.value;
            updateMasonryPreview();
        });
        row.querySelector(".wall-mult-input").addEventListener("input", function() {
            wallSegments[index].multiplier = parseInt(this.value) || 1;
            updateMasonryPreview();
        });
        row.querySelector(".wall-faces-checkbox").addEventListener("change", function() {
            wallSegments[index].faces = this.checked ? 2 : 1;
            this.closest("td").querySelector("div").textContent = this.checked ? "2 mặt" : "1 mặt";
            updateMasonryPreview();
        });

        row.querySelector(".btn-delete-row").addEventListener("click", function() {
            wallSegments.splice(index, 1);
            renderWallTable();
            updateMasonryPreview();
        });

        tbody.appendChild(row);
    });

    // Auto-select on focus for dynamically added table inputs
    tbody.querySelectorAll("input").forEach(input => {
        input.addEventListener("focus", function() {
            this.select();
            activeNumberInput = this;
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Sync faces column visibility after rows are rendered
    const autoPlasterSelect = document.getElementById("masonryAutoPlaster");
    if (autoPlasterSelect) {
        const hasPlaster = autoPlasterSelect.value !== "none";
        document.getElementById("wallSegmentsTable")
            .querySelectorAll("th:nth-child(5), td:nth-child(5)")
            .forEach(cell => { cell.style.display = hasPlaster ? "" : "none"; });
    }
}

/**
 * Dynamically renders door deductions dynamic table rows
 */
function renderDoorTable() {
    const tbody = document.getElementById("doorDeductionsBody");
    tbody.innerHTML = "";

    if (doorDeductions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-gray text-xs">Không có cửa khấu trừ. Bấm "Thêm cửa" để bắt đầu.</td></tr>`;
        return;
    }

    doorDeductions.forEach((door, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <select class="door-type-select" data-index="${index}">
                    <option value="door-3" ${door.type === "door-3" ? "selected" : ""}>Cửa đi (Trát 3 mặt)</option>
                    <option value="window-4" ${door.type === "window-4" ? "selected" : ""}>Cửa sổ (Trát 4 mặt)</option>
                </select>
            </td>
            <td><input type="number" class="door-width-input text-bold" data-index="${index}" value="${door.width}" min="0.01" step="0.1"></td>
            <td><input type="number" class="door-height-input text-bold" data-index="${index}" value="${door.height}" min="0.01" step="0.1"></td>
            <td><input type="number" class="door-mult-input text-bold" data-index="${index}" value="${door.multiplier}" min="1" step="1"></td>
            <td class="text-center">
                <label class="checkbox-container center-checkbox">
                    <input type="checkbox" class="door-jambs-checkbox" data-index="${index}" ${door.plasterJambs ? "checked" : ""}>
                    <span class="checkmark"></span>
                </label>
            </td>
            <td>
                <button type="button" class="btn-delete-row" data-index="${index}" title="Xóa cửa khấu trừ này">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;

        // Attach listeners for row changes
        row.querySelector(".door-type-select").addEventListener("change", function() {
            doorDeductions[index].type = this.value;
            updateMasonryPreview();
        });
        row.querySelector(".door-width-input").addEventListener("input", function() {
            doorDeductions[index].width = parseFloat(this.value) || 0;
            updateMasonryPreview();
        });
        row.querySelector(".door-height-input").addEventListener("input", function() {
            doorDeductions[index].height = parseFloat(this.value) || 0;
            updateMasonryPreview();
        });
        row.querySelector(".door-mult-input").addEventListener("input", function() {
            doorDeductions[index].multiplier = parseInt(this.value) || 1;
            updateMasonryPreview();
        });
        row.querySelector(".door-jambs-checkbox").addEventListener("change", function() {
            doorDeductions[index].plasterJambs = this.checked;
            updateMasonryPreview();
        });

        row.querySelector(".btn-delete-row").addEventListener("click", function() {
            doorDeductions.splice(index, 1);
            renderDoorTable();
            updateMasonryPreview();
        });

        tbody.appendChild(row);
    });

    // Auto-select on focus for dynamically added table inputs
    tbody.querySelectorAll("input").forEach(input => {
        input.addEventListener("focus", function() {
            this.select();
            activeNumberInput = this;
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Initializes toggles to switch inputs mode between Detailed (dynamic spreadsheet) and Direct (BOQ quick estimate)
 */
function initInputModeToggles() {
    // 1. Masonry mode toggle
    document.getElementById("masonryInputModeToggle").addEventListener("change", function() {
        const isDirect = this.checked;
        document.getElementById("masonryDetailedSection").style.display = isDirect ? "none" : "block";
        document.getElementById("masonryDirectSection").style.display = isDirect ? "block" : "none";
        document.getElementById("masonryInputModeStatus").innerText = isDirect ? "Chế độ Nhập nhanh tổng diện tích thô BOQ" : "Tính toán chi tiết từ hình học";
        document.getElementById("masonryInputModeStatus").className = isDirect ? "toggle-status text-yellow text-bold" : "toggle-status text-success text-bold";
        updateMasonryPreview();
    });

    // 2. Plastering mode toggle
    document.getElementById("plasteringInputModeToggle").addEventListener("change", function() {
        const isDirect = this.checked;
        document.getElementById("plasteringDetailedSection").style.display = isDirect ? "none" : "block";
        document.getElementById("plasteringDirectSection").style.display = isDirect ? "block" : "none";
        document.getElementById("plasteringInputModeStatus").innerText = isDirect ? "Chế độ Nhập nhanh tổng diện tích thô BOQ" : "Tính toán chi tiết từ hình học";
        document.getElementById("plasteringInputModeStatus").className = isDirect ? "toggle-status text-yellow text-bold" : "toggle-status text-success text-bold";
        updatePlasteringPreview();
    });

    // 3. Tiling mode toggle
    document.getElementById("tilingInputModeToggle").addEventListener("change", function() {
        const isDirect = this.checked;
        document.getElementById("tilingDetailedSection").style.display = isDirect ? "none" : "block";
        document.getElementById("tilingDirectSection").style.display = isDirect ? "block" : "none";
        document.getElementById("tilingInputModeStatus").innerText = isDirect ? "Chế độ Nhập nhanh tổng diện tích thô BOQ" : "Tính toán chi tiết từ hình học";
        document.getElementById("tilingInputModeStatus").className = isDirect ? "toggle-status text-yellow text-bold" : "toggle-status text-success text-bold";
        updateTilingPreview();
    });
}



/**
 * Integrates PDF/DXF Canvas Digital Takeoff controls and connections
 */
function initTakeoffWorkspace() {
    // Initialize PDF module
    if (window.PdfTakeoff) {
        window.PdfTakeoff.init();
    }

    // Tools Switching
    const toolBtns = [
        { id: 'btnToolHand', tool: 'hand' },
        { id: 'btnToolCalibrate', tool: 'calibrate' },
        { id: 'btnToolLine', tool: 'line' },
        { id: 'btnToolArea', tool: 'area' }
    ];

    toolBtns.forEach(btnInfo => {
        const btn = document.getElementById(btnInfo.id);
        if (btn) {
            btn.addEventListener("click", () => {
                toolBtns.forEach(b => {
                    const el = document.getElementById(b.id);
                    if (el) el.classList.remove("active");
                });
                btn.classList.add("active");
                PdfTakeoff.setTool(btnInfo.tool);
            });
        }
    });

    // Save PDF Calibration distance
    const btnSaveCalib = document.getElementById("btnSaveCalibrate");
    if (btnSaveCalib) {
        btnSaveCalib.addEventListener("click", () => {
            const dist = parseFloat(document.getElementById("calibrateDistance").value) || 0;
            if (dist > 0) {
                PdfTakeoff.saveCalibration(dist);
            } else {
                alert("Vui lòng nhập khoảng cách thực tế lớn hơn 0!");
            }
        });
    }

    // Reset annotations
    const btnClearDraw = document.getElementById("btnClearTakeoffDrawings");
    if (btnClearDraw) {
        btnClearDraw.addEventListener("click", () => {
            PdfTakeoff.clearDrawings();
            showToast("Đã xóa toàn bộ nét vẽ đo đạc trên bản vẽ!");
        });
    }

    // Open Takeoff Workspace Panel (header button)
    const btnOpenTakeoff = document.getElementById("btnOpenTakeoff");
    if (btnOpenTakeoff) {
        btnOpenTakeoff.addEventListener("click", () => {
            const ws = document.getElementById("takeoff-workspace");
            ws.style.display = "block";
            ws.scrollIntoView({ behavior: "smooth" });
            showToast("Mở không gian Đo đạc Bản vẽ. Tải file PDF hoặc DXF để bắt đầu!");
            logAuditEvent("OPEN_TAKEOFF", "Mở workspace Digital Takeoff.");
        });
    }

    // Close Takeoff Workspace Panel
    const btnCloseTakeoff = document.getElementById("btnCloseTakeoff");
    if (btnCloseTakeoff) {
        btnCloseTakeoff.addEventListener("click", () => {
            document.getElementById("takeoff-workspace").style.display = "none";
            showToast("Đã đóng không gian đo đạc bản vẽ.");
        });
    }

    // Upload & Render file (.pdf, .dxf)
    document.getElementById("takeoffFile").addEventListener("change", function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const name = file.name.toLowerCase();
        const workspaceSection = document.getElementById("takeoff-workspace");
        
        // Show panel
        workspaceSection.style.display = "block";
        
        // Smooth scroll down to workspace
        workspaceSection.scrollIntoView({ behavior: 'smooth' });

        if (name.endsWith('.pdf')) {
            // PDF Takeoff
            document.getElementById("pdfControls").style.display = "block";
            document.getElementById("dxfControls").style.display = "none";
            
            showToast(`Đang nạp bản vẽ PDF: ${file.name}...`);
            PdfTakeoff.loadPDF(file);
        } else if (name.endsWith('.dxf')) {
            // DXF CAD Scanner
            document.getElementById("pdfControls").style.display = "none";
            document.getElementById("dxfControls").style.display = "block";

            showToast(`Đang quét file CAD DXF: ${file.name}...`);
            
            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const dxfText = evt.target.result;
                    const layers = DxfParser.parse(dxfText);
                    
                    const select = document.getElementById("dxfLayersSelect");
                    select.innerHTML = '<option value="">-- Chọn Layer CAD --</option>';
                    
                    window.dxfLayersData = layers; // Save locally to import length
                    
                    const layerNames = Object.keys(layers);
                    if (layerNames.length === 0) {
                        select.innerHTML = '<option value="">Không tìm thấy Layer hình học</option>';
                        showToast("File DXF không có đối tượng hình học LINE/POLYLINE!", "danger");
                        return;
                    }
                    
                    layerNames.forEach(layerName => {
                        const opt = document.createElement("option");
                        opt.value = layerName;
                        opt.innerText = `${layerName} (Dài: ${layers[layerName].length.toFixed(1)} m | ${layers[layerName].count} đt)`;
                        select.appendChild(opt);
                    });

                    showToast(`Quét CAD thành công! Tìm thấy ${layerNames.length} layers.`);
                } catch (err) {
                    showToast("Lỗi phân tích file CAD DXF!", "danger");
                }
            };
            reader.readAsText(file);
        } else {
            alert("Công cụ chỉ hỗ trợ định dạng bản vẽ kỹ thuật PDF hoặc DXF!");
            workspaceSection.style.display = "none";
        }
    });

    // Import CAD DXF Layer cumulative length
    const btnImportDXF = document.getElementById("btnImportDXFLayer");
    if (btnImportDXF) {
        btnImportDXF.addEventListener("click", () => {
            const select = document.getElementById("dxfLayersSelect");
            const layerName = select.value;
            if (!layerName || !window.dxfLayersData || !window.dxfLayersData[layerName]) {
                alert("Vui lòng chọn một Layer CAD hợp lệ để nhập!");
                return;
            }

            const len = window.dxfLayersData[layerName].length;
            if (activeNumberInput) {
                activeNumberInput.value = len.toFixed(2);
                activeNumberInput.dispatchEvent(new Event('input'));
                activeNumberInput.dispatchEvent(new Event('change'));
                showToast(`Đã nạp thành công ${len.toFixed(2)} m từ layer "${layerName}"!`);
            } else {
                alert("Vui lòng click chọn ô nhập liệu số mà bạn muốn điền dữ liệu trước!");
            }
        });
    }

    // Catch Takeoff measurements dispatcher & populate
    window.addEventListener('takeoff-complete', (e) => {
        const val = e.detail.value;
        const type = e.detail.type;

        if (activeNumberInput) {
            activeNumberInput.value = val.toFixed(2);
            activeNumberInput.dispatchEvent(new Event('input'));
            activeNumberInput.dispatchEvent(new Event('change'));

            const unit = type === 'area' ? 'm²' : 'm';
            showToast(`Đã lấy số liệu đo đạc: ${val.toFixed(2)} ${unit} từ bản vẽ!`);
        } else {
            showToast("Vui lòng click chọn ô nhập liệu mà bạn muốn điền dữ liệu đo đạc trước!", "danger");
        }
    });

    // Nộp duyệt button
    document.getElementById("btnSubmitProject").addEventListener("click", async () => {
        if (!currentProject.id) {
            showToast("Chưa có dữ liệu để nộp. Vui lòng thêm hạng mục trước.", "danger");
            return;
        }
        if (currentProject.status === 'pending') {
            showToast("Dự án đang chờ duyệt, không cần nộp lại.", "warning");
            return;
        }
        if (currentProject.status === 'approved') {
            showToast("Dự án đã được duyệt và khóa.", "warning");
            return;
        }

        // Force sync before submit
        clearTimeout(_apiSaveTimer);
        await syncProjectToAPI();

        try {
            const updated = await API.submitProject(currentProject.id);
            currentProject.status = updated.status;
            localStorage.setItem("anlaa_project", JSON.stringify(currentProject));
            updateProjectStatusUI();
            showToast("Đã nộp dự toán cho Admin duyệt thành công!");
        } catch (err) {
            showToast("Lỗi: " + err.message, "danger");
        }
    });
}

/**
 * Called by auth.js after successful user login to load project from API
 */
async function loadProjectsFromAPI() {
    try {
        const projects = await API.getProjects();

        // If history page requested a specific project, open it
        const requestedId = parseInt(localStorage.getItem('anlaa_open_project_id') || '0');
        const requestedRole = localStorage.getItem('anlaa_open_project_role') || null;
        const requestedOwner = localStorage.getItem('anlaa_open_project_owner') || null;
        localStorage.removeItem('anlaa_open_project_id');
        localStorage.removeItem('anlaa_open_project_role');
        localStorage.removeItem('anlaa_open_project_owner');
        const requested = requestedId ? projects.find(p => p.id === requestedId) : null;
        if (requested && requestedRole) { requested.my_role = requestedRole; }
        if (requested && requestedOwner) { requested.owner_name = requestedOwner; }

        // Load most recent draft or rejected project (or requested project)
        const active = requested || projects.find(p => ['draft', 'rejected'].includes(p.status)) || projects[0];

        if (active) {
            currentProject = {
                id: active.id,
                status: active.status,
                name: active.name,
                address: active.address || 'Hà Nội',
                items: Array.isArray(active.data) ? active.data : [],
                my_role: active.my_role || 'owner',
                owner_name: active.owner_name || null,
            };
        } else {
            // Create fresh project on API
            const created = await API.createProject(currentProject.name, currentProject.address, []);
            currentProject.id = created.id;
            currentProject.status = created.status;
        }

        localStorage.setItem("anlaa_project", JSON.stringify(currentProject));
        document.getElementById("projectName").value = currentProject.name;
        document.getElementById("projectAddress").value = currentProject.address;
        updateSidebarList();
        updateBOQTable();
        updateProjectStatusUI();
    } catch (err) {
        console.warn('Failed to load projects from API:', err.message);
    }
}

/**
 * Updates submit button and status indicator based on currentProject.status
 */
function updateProjectStatusUI() {
    const btn = document.getElementById("btnSubmitProject");
    if (!btn) return;

    const statusMap = {
        draft:    { text: '📤 Nộp duyệt', disabled: false },
        pending:  { text: '⏳ Chờ duyệt', disabled: true },
        approved: { text: '✅ Đã duyệt', disabled: true },
        rejected: { text: '↩️ Nộp lại', disabled: false }
    };

    const s = statusMap[currentProject.status] || statusMap.draft;
    btn.innerHTML = s.text;
    btn.disabled = s.disabled;

    if (currentProject.status === 'approved') {
        btn.classList.remove('btn-success');
        btn.classList.add('btn-secondary');
    } else if (currentProject.status === 'rejected') {
        btn.classList.remove('btn-success');
        btn.classList.add('btn-danger');
    } else {
        btn.classList.remove('btn-secondary', 'btn-danger');
        btn.classList.add('btn-success');
    }

    // Update Header Status Badge (dynamic)
    const badge = document.getElementById("projectStatusBadge");
    if (badge) {
        const badgeMap = {
            draft:    { text: 'Bản nháp 📄', class: 'status-draft' },
            pending:  { text: 'Chờ duyệt ⏳', class: 'status-pending' },
            approved: { text: 'Đã duyệt ✅', class: 'status-approved' },
            rejected: { text: 'Bị từ chối ❌', class: 'status-rejected' }
        };
        const b = badgeMap[currentProject.status] || badgeMap.draft;
        badge.innerHTML = b.text;
        badge.className = `status-badge ${b.class}`;
    }

    // Viewer-only: hide submit button, show shared-from banner
    const myRole = currentProject.my_role;
    if (myRole === 'viewer') {
        if (btn) { btn.style.display = 'none'; }
        let sharedBanner = document.getElementById('sharedProjectBanner');
        if (!sharedBanner) {
            sharedBanner = document.createElement('div');
            sharedBanner.id = 'sharedProjectBanner';
            sharedBanner.className = 'collab-viewer-banner no-print';
            const header = document.querySelector('.est-topbar') || document.querySelector('.app-header');
            if (header) header.after(sharedBanner);
        }
        sharedBanner.innerHTML = `<i data-lucide="eye"></i> <span>Dự án của <strong>${currentProject.owner_name || 'người dùng khác'}</strong> — bạn đang ở chế độ <strong>Chỉ xem</strong>.</span>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } else if (myRole === 'editor' && currentProject.owner_name) {
        // Editor viewing shared project
        let sharedBanner = document.getElementById('sharedProjectBanner');
        if (!sharedBanner) {
            sharedBanner = document.createElement('div');
            sharedBanner.id = 'sharedProjectBanner';
            sharedBanner.className = 'collab-viewer-banner no-print';
            const header = document.querySelector('.est-topbar') || document.querySelector('.app-header');
            if (header) header.after(sharedBanner);
        }
        sharedBanner.style.borderColor = 'rgba(167,139,250,0.3)';
        sharedBanner.innerHTML = `<i data-lucide="edit-3"></i> <span>Dự án của <strong>${currentProject.owner_name}</strong> — bạn có quyền <strong>Chỉnh sửa</strong>.</span>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// ═══════════════════════════════════════════════════════════════════
// CONSTRUCTION COST SECTION — DỰ TOÁN CHI PHÍ THI CÔNG (G8 pattern)
// ═══════════════════════════════════════════════════════════════════

function renderWorkItemPricesTab() {
    const tbody = document.getElementById("workPricesTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    Object.entries(DEFAULT_WORK_ITEM_PRICES).forEach(([key, meta]) => {
        const price = workItemPrices[key] !== undefined ? workItemPrices[key] : meta.price;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="text-bold">${meta.name}</td>
            <td>${WORK_ITEM_DIMS[key] ? WORK_ITEM_DIMS[key].unit : "m²"}</td>
            <td><input type="number" class="price-input" data-work-key="${key}" value="${price}" min="0" step="1000"></td>
            <td><span class="formatted-price-preview text-bold" style="color:var(--border-focus);">${formatNumber(price)} đ</span></td>
        `;
        const input = tr.querySelector(".price-input");
        input.addEventListener("focus", function() { this.select(); });
        input.addEventListener("input", (e) => {
            const val = parseFloat(e.target.value) || 0;
            workItemPrices[key] = val;
            localStorage.setItem("anlaa_work_prices", JSON.stringify(workItemPrices));
            tr.querySelector(".formatted-price-preview").innerText = `${formatNumber(val)} đ`;
            updateConstructionCostSection();
        });
        tbody.appendChild(tr);
    });
}

// Returns effective unit price for an item.
// If materialPrice/laborPrice explicitly set → sum them.
// Otherwise fall back to workItemPrices registry or item.unitPrice.
function getItemUnitPrice(item) {
    const hasSplit = item.materialPrice !== undefined || item.laborPrice !== undefined;
    if (hasSplit) return (parseFloat(item.materialPrice) || 0) + (parseFloat(item.laborPrice) || 0);
    return workItemPrices[item.workItemKey] !== undefined ? workItemPrices[item.workItemKey] : (item.unitPrice || 0);
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
    const dims = (WORK_ITEM_DIMS[item.workItemKey] || {}).dims || [];
    return item.rows.reduce((sum, row) => sum + calcRowQty(row, dims), 0);
}

function saveConstructionItems() {
    localStorage.setItem("anlaa_cost_items", JSON.stringify(constructionItems));
}

function saveContingency() {
    localStorage.setItem("anlaa_contingency", JSON.stringify({ enabled: contingencyEnabled, pct: contingencyPct, vatEnabled, vatPct, roundingUnit }));
}

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

function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function applyProjectTemplate(templateId) {
    const tmpl = PROJECT_TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;
    if (constructionItems.some(i => !i.isAuto) &&
        !confirm(`Áp dụng mẫu "${tmpl.name}" sẽ xóa các hạng mục thủ công hiện tại. Tiếp tục?`)) return;
    pushUndo();
    // Keep auto items, replace manual + sections
    const autoItems = constructionItems.filter(i => i.isAuto);
    const newItems = [];
    tmpl.sections.forEach(sec => {
        newItems.push({ id: genId(), isSection: true, name: sec.name, expanded: true });
        sec.items.forEach(def => {
            const dimDef = WORK_ITEM_DIMS[def.key];
            newItems.push({
                id: genId(),
                workItemKey: def.key || "custom",
                name: def.name || (dimDef ? dimDef.label : "Hạng mục"),
                unit: def.unit || (dimDef ? dimDef.unit : "m²"),
                isAuto: false,
                expanded: false,
                unitPrice: def.price !== undefined ? def.price : (workItemPrices[def.key] || 0),
                note: def.note || "",
                rows: [{ desc: "", n: 1, l: "", w: "", h: "", hs: 1 }]
            });
        });
    });
    constructionItems = [...autoItems, ...newItems];
    saveConstructionItems();
    updateConstructionCostSection();
    showToast(`✅ Đã áp dụng mẫu: ${tmpl.name}`);
}

function renderTemplateModal() {
    let modal = document.getElementById("templateModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "templateModal";
        modal.className = "collab-modal-overlay";
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="collab-modal" style="max-width:560px;">
            <div class="collab-modal-header">
                <h3>Chọn mẫu dự toán</h3>
                <button class="collab-modal-close" id="closeTemplateModal">×</button>
            </div>
            <div class="template-grid">
                ${PROJECT_TEMPLATES.map(t => `
                    <div class="template-card" data-id="${t.id}">
                        <div class="tmpl-icon"><i data-lucide="${t.icon}"></i></div>
                        <div class="tmpl-info">
                            <strong>${escapeHtml(t.name)}</strong>
                            <span>${escapeHtml(t.desc)}</span>
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
    modal.style.display = "flex";
    if (typeof lucide !== "undefined") lucide.createIcons();
    modal.querySelector("#closeTemplateModal").addEventListener("click", () => { modal.style.display = "none"; });
    modal.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });
    modal.querySelectorAll(".template-card").forEach(card => {
        card.addEventListener("click", () => {
            modal.style.display = "none";
            applyProjectTemplate(card.dataset.id);
        });
    });
}

function initConstructionCostSection() {
    document.getElementById("btnResetWorkPrices")?.addEventListener("click", () => {
        if (confirm("Khôi phục lại đơn giá thi công mặc định Hà Nội?")) {
            workItemPrices = {};
            Object.entries(DEFAULT_WORK_ITEM_PRICES).forEach(([k, v]) => { workItemPrices[k] = v.price; });
            localStorage.setItem("anlaa_work_prices", JSON.stringify(workItemPrices));
            renderWorkItemPricesTab();
            updateConstructionCostSection();
            showToast("Đã khôi phục đơn giá thi công mặc định Hà Nội!");
        }
    });

    initWorkItemDatalist();

    document.getElementById("btnAddCostItem")?.addEventListener("click", renderPricingPickerModal);

    document.getElementById("btnAddSection")?.addEventListener("click", () => {
        pushUndo();
        constructionItems.push({
            id: genId(),
            isSection: true,
            name: "",
            expanded: true,
        });
        saveConstructionItems();
        updateConstructionCostSection();
        setTimeout(() => {
            const inputs = document.querySelectorAll(".section-name-input");
            inputs[inputs.length - 1]?.focus();
        }, 30);
    });

    const toggle = document.getElementById("contingencyToggle");
    const pctInput = document.getElementById("contingencyPct");
    if (toggle) {
        toggle.checked = contingencyEnabled;
        toggle.addEventListener("change", () => { contingencyEnabled = toggle.checked; saveContingency(); updateConstructionCostTotals(); });
    }
    if (pctInput) {
        pctInput.value = contingencyPct;
        pctInput.addEventListener("input", () => { contingencyPct = parseFloat(pctInput.value) || 0; saveContingency(); updateConstructionCostTotals(); });
    }

    const vatToggle = document.getElementById("vatToggle");
    const vatPctInput = document.getElementById("vatPct");
    if (vatToggle) {
        vatToggle.checked = vatEnabled;
        vatToggle.addEventListener("change", () => { vatEnabled = vatToggle.checked; saveContingency(); updateConstructionCostTotals(); });
    }
    if (vatPctInput) {
        vatPctInput.value = vatPct;
        vatPctInput.addEventListener("input", () => { vatPct = parseFloat(vatPctInput.value) || 0; saveContingency(); updateConstructionCostTotals(); });
    }

    const roundingSelect = document.getElementById("roundingSelect");
    if (roundingSelect) {
        roundingSelect.value = String(roundingUnit);
        roundingSelect.addEventListener("change", () => { roundingUnit = parseInt(roundingSelect.value) || 0; saveContingency(); updateConstructionCostTotals(); });
    }

    document.getElementById("btnFromTemplate")?.addEventListener("click", renderTemplateModal);

    document.getElementById("btnCloneProject")?.addEventListener("click", () => {
        if (!confirm("Nhân đôi dự án này thành phương án B? Toàn bộ hạng mục + đơn giá sẽ được copy vào một dự án mới.")) return;
        const cloneName = currentProject.name + " — Phương án B";
        const cloneItems = JSON.parse(JSON.stringify(constructionItems));
        const savedProject = JSON.parse(localStorage.getItem("anlaa_project") || "{}");
        // Save clone as a named snapshot in localStorage
        const snapshots = JSON.parse(localStorage.getItem("anlaa_project_snapshots") || "[]");
        snapshots.push({
            id: genId(),
            name: cloneName,
            createdAt: new Date().toISOString(),
            items: cloneItems,
            project: { ...savedProject, id: null, name: cloneName }
        });
        localStorage.setItem("anlaa_project_snapshots", JSON.stringify(snapshots));
        showToast(`✅ Đã lưu phương án B: "${cloneName}" — mở trong cửa sổ mới?`);
        setTimeout(() => {
            if (confirm(`Mở phương án B trong tab mới?`)) {
                localStorage.setItem("anlaa_clone_load", JSON.stringify({ name: cloneName, items: cloneItems }));
                window.open("estimate.html?clone=1", "_blank");
            }
        }, 500);
    });

    // On load: check if this is a clone tab
    const cloneLoad = localStorage.getItem("anlaa_clone_load");
    if (new URLSearchParams(location.search).get("clone") === "1" && cloneLoad) {
        localStorage.removeItem("anlaa_clone_load");
        const cd = JSON.parse(cloneLoad);
        currentProject = { id: null, status: "draft", name: cd.name, address: currentProject.address || "", items: [] };
        constructionItems = cd.items;
        localStorage.setItem("anlaa_project", JSON.stringify(currentProject));
        saveConstructionItems();
        const nameEl = document.getElementById("projectName");
        if (nameEl) nameEl.value = cd.name;
        showToast(`📋 Đã mở phương án B: ${cd.name}`);
    }

    document.getElementById("btnTogglePaymentSchedule")?.addEventListener("click", () => {
        const panel = document.getElementById("paymentSchedulePanel");
        if (!panel) return;
        const show = panel.style.display === "none";
        panel.style.display = show ? "" : "none";
        if (show) renderPaymentSchedule();
    });

    document.getElementById("btnAddPayment")?.addEventListener("click", () => {
        paymentSchedule.push({ id: genId(), label: "", pct: 0, amount: 0, note: "", usePct: true });
        savePaymentSchedule();
        renderPaymentSchedule();
    });

    loadNamedRanges();
    renderNamedRangesPanel();
    loadPaymentSchedule();
    updateConstructionCostSection();
}

// ─── Add Item Modal (unified: catalog picker + custom + sync) ─────────────────
// Single entry point for "Thêm hạng mục". Two inner tabs:
//   Tab 1 — Catalog: multi-select from WORK_ITEM_DIMS + sell prices, duplicate warning
//   Tab 2 — Custom:  free-form name/unit/price rows, with option to sync back to pricing
const WORK_ITEM_GROUPS = [
    { label: "Đất & Móng",              keys: ["excavation","backfill","concrete-footing"] },
    { label: "Kết cấu BTCT",             keys: ["formwork","concrete-column","concrete-beam","concrete-slab","concrete-stair"] },
    { label: "Xây tường",                keys: ["masonry-110","masonry-220","masonry-aac-110"] },
    { label: "Trát & Hoàn thiện tường",  keys: ["plastering-1-face","plastering-2-face","plastering-ceiling","skim-coat","paint-interior","paint-exterior","paint-ceiling"] },
    { label: "Nền & Ốp lát",             keys: ["screed","tiling-floor","tiling-wall","waterproof-floor","waterproof-wall","stone-floor","stone-wall"] },
    { label: "Trần",                     keys: ["ceiling-gypsum","ceiling-wood"] },
    { label: "Cửa & Lan can",            keys: ["railing","fence","pathway","door","window"] },
    { label: "Điện, Nước & Thiết bị",    keys: ["sanitary","electrical","plumbing"] },
];

// Custom rows pending addition (tab 2 state)
let _customRows = [];

function renderPricingPickerModal() {
    let overlay = document.getElementById("pricingPickerModal");
    if (overlay) {
        overlay.style.display = "flex";
        _ppickSwitchTab("catalog");
        return;
    }

    overlay = document.createElement("div");
    overlay.id = "pricingPickerModal";
    overlay.className = "collab-modal-overlay";
    overlay.style.cssText = "display:flex;align-items:center;justify-content:center;z-index:3000;";
    overlay.innerHTML = `
    <div id="ppickDialog" style="
        background:var(--bg-card);border:1px solid var(--border-glass);border-radius:14px;
        padding:20px;width:min(860px,96vw);max-height:90vh;display:flex;flex-direction:column;gap:12px;
        box-shadow:0 24px 80px rgba(0,0,0,0.65);">

        <!-- Header -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
            <div>
                <div style="font-size:15px;font-weight:800;color:var(--text-primary);">Thêm hạng mục thi công</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">
                    Chọn từ danh mục có sẵn hoặc thêm tùy chỉnh •
                    <a href="pricing.html" target="_blank" style="color:#00f2fe;text-decoration:none;">Cấu hình giá bán ↗</a>
                </div>
            </div>
            <button id="ppickClose" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;line-height:1;padding:2px 6px;">✕</button>
        </div>

        <!-- Inner tab bar -->
        <div style="display:flex;gap:3px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:3px;width:fit-content;">
            <button class="ppick-tab ppick-tab-active" data-ptab="catalog" style="padding:5px 16px;font-size:12px;font-weight:600;border:none;border-radius:6px;cursor:pointer;background:rgba(0,242,254,0.1);color:#00f2fe;">
                Từ bảng giá
            </button>
            <button class="ppick-tab" data-ptab="custom" style="padding:5px 16px;font-size:12px;font-weight:600;border:none;border-radius:6px;cursor:pointer;background:none;color:var(--text-muted);">
                Thêm tùy chỉnh
            </button>
        </div>

        <!-- PANEL: Catalog -->
        <div id="ppickPanelCatalog" style="display:flex;flex-direction:column;gap:10px;flex:1;min-height:0;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                <input id="ppickSearch" type="text" placeholder="Tìm hạng mục..."
                    style="flex:1;min-width:130px;padding:6px 10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:var(--text-primary);font-size:12px;">
                <select id="ppickFilter" style="padding:6px 10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:var(--text-primary);font-size:12px;">
                    <option value="all">Tất cả hạng mục</option>
                    <option value="has-price">Đã có đơn giá bán</option>
                    <option value="no-price">Chưa có đơn giá bán</option>
                    <option value="new">Chưa có trong dự toán</option>
                </select>
                <button id="ppickSelAll" class="btn btn-secondary btn-xs">Chọn tất cả</button>
                <button id="ppickClearAll" class="btn btn-secondary btn-xs">Bỏ chọn</button>
            </div>
            <div id="ppickCatalogBody" style="overflow-y:auto;flex:1;border:1px solid rgba(255,255,255,0.06);border-radius:8px;min-height:200px;max-height:380px;"></div>
            <div id="ppickDupWarn" style="display:none;padding:8px 12px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);border-radius:6px;font-size:12px;color:#fbbf24;"></div>
        </div>

        <!-- PANEL: Custom -->
        <div id="ppickPanelCustom" style="display:none;flex-direction:column;gap:10px;flex:1;min-height:0;">
            <div style="font-size:12px;color:var(--text-muted);">Nhập hạng mục tùy chỉnh. Tick "Sync" để ghi đơn giá ngược lại bảng giá công ty sau khi thêm.</div>
            <div style="overflow-y:auto;max-height:340px;">
                <table style="width:100%;border-collapse:collapse;font-size:12px;" id="ppickCustomTable">
                    <thead>
                        <tr style="background:rgba(255,255,255,0.03);">
                            <th style="padding:7px 8px;text-align:left;font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Tên hạng mục</th>
                            <th style="padding:7px 8px;width:70px;font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">ĐVT</th>
                            <th style="padding:7px 8px;width:120px;text-align:right;font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Đơn giá</th>
                            <th style="padding:7px 8px;width:48px;text-align:center;font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;" title="Sync ngược lại bảng giá công ty">Sync</th>
                            <th style="width:32px;"></th>
                        </tr>
                    </thead>
                    <tbody id="ppickCustomRows"></tbody>
                </table>
            </div>
            <button id="ppickAddCustomRow" class="btn btn-secondary btn-sm" style="align-self:flex-start;">
                + Thêm dòng
            </button>
        </div>

        <!-- Footer -->
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);">
            <div id="ppickCount" style="font-size:12px;color:var(--text-muted);">Chưa chọn</div>
            <div style="display:flex;gap:8px;">
                <button id="ppickCancel" class="btn btn-secondary btn-sm">Hủy</button>
                <button id="ppickConfirm" class="btn btn-gradient btn-sm" disabled>
                    <i data-lucide="plus"></i> Thêm vào dự toán
                </button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(overlay);

    // Wire close
    overlay.addEventListener("click", e => { if (e.target === overlay) _closePricingPicker(); });
    document.getElementById("ppickClose")?.addEventListener("click", _closePricingPicker);
    document.getElementById("ppickCancel")?.addEventListener("click", _closePricingPicker);

    // Inner tab switching
    overlay.querySelectorAll(".ppick-tab").forEach(btn => {
        btn.addEventListener("click", () => _ppickSwitchTab(btn.dataset.ptab));
    });

    // Catalog tab controls
    document.getElementById("ppickSearch")?.addEventListener("input", _ppickRefreshCatalog);
    document.getElementById("ppickFilter")?.addEventListener("change", _ppickRefreshCatalog);
    document.getElementById("ppickSelAll")?.addEventListener("click", () => {
        document.querySelectorAll(".ppick-cb").forEach(cb => { cb.checked = true; });
        _ppickUpdateFooter();
    });
    document.getElementById("ppickClearAll")?.addEventListener("click", () => {
        document.querySelectorAll(".ppick-cb").forEach(cb => { cb.checked = false; });
        _ppickUpdateFooter();
    });

    // Custom tab controls
    document.getElementById("ppickAddCustomRow")?.addEventListener("click", _ppickAddCustomRow);

    // Confirm
    document.getElementById("ppickConfirm")?.addEventListener("click", _ppickConfirm);

    if (typeof lucide !== "undefined") lucide.createIcons();
    _customRows = [];
    _ppickSwitchTab("catalog");
}

function _closePricingPicker() {
    const el = document.getElementById("pricingPickerModal");
    if (el) el.style.display = "none";
    _customRows = [];
}

function _ppickSwitchTab(tab) {
    const tabs = document.querySelectorAll(".ppick-tab");
    tabs.forEach(b => {
        const active = b.dataset.ptab === tab;
        b.style.background = active ? "rgba(0,242,254,0.1)" : "none";
        b.style.color = active ? "#00f2fe" : "var(--text-muted)";
    });
    document.getElementById("ppickPanelCatalog").style.display = tab === "catalog" ? "flex" : "none";
    document.getElementById("ppickPanelCustom").style.display  = tab === "custom"  ? "flex" : "none";
    if (tab === "catalog") _ppickRefreshCatalog();
    if (tab === "custom")  _ppickRenderCustomRows();
    _ppickUpdateFooter();
}

function _getSellPrices() {
    const sellState  = JSON.parse(localStorage.getItem("anlaa_sell_state") || "{}");
    const workPrices = JSON.parse(localStorage.getItem("anlaa_work_prices") || "{}");
    const defaultMargin = sellState.defaultMargin || 1.15;
    const margins     = sellState.margins || {};

    const result = {};
    Object.keys(WORK_ITEM_DIMS).forEach(key => {
        const wip = DEFAULT_WORK_ITEM_PRICES[key];
        const cost = workPrices[key] !== undefined ? workPrices[key] : (wip ? wip.price : 0);
        if (cost <= 0) { result[key] = 0; return; }
        const margin = margins[key] !== undefined ? parseFloat(margins[key]) : defaultMargin;
        result[key] = Math.round(cost * margin);
    });
    return result;
}

function _ppickRefreshCatalog() {
    const body = document.getElementById("ppickCatalogBody");
    if (!body) return;
    const search = (document.getElementById("ppickSearch")?.value || "").toLowerCase().trim();
    const filter = document.getElementById("ppickFilter")?.value || "all";
    const sellPrices = _getSellPrices();
    const workPrices = JSON.parse(localStorage.getItem("anlaa_work_prices") || "{}");

    // Keys already in the current estimate
    const existingKeys = new Set(constructionItems.filter(i => !i.isSection).map(i => i.workItemKey));

    // Preserve checked state across re-renders
    const checked = new Set();
    document.querySelectorAll(".ppick-cb:checked").forEach(cb => checked.add(cb.value));

    let html = `<table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="position:sticky;top:0;background:rgba(11,13,20,0.98);z-index:1;">
            <th style="width:32px;padding:8px;"></th>
            <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);">Hạng mục</th>
            <th style="padding:8px;text-align:center;font-size:10px;text-transform:uppercase;color:var(--text-muted);width:46px;">ĐVT</th>
            <th style="padding:8px 10px;text-align:right;font-size:10px;text-transform:uppercase;color:var(--text-muted);width:120px;">Đơn giá bán</th>
            <th style="padding:8px 10px;text-align:right;font-size:10px;text-transform:uppercase;color:var(--text-muted);width:100px;">Giá vốn</th>
            <th style="padding:8px;width:60px;font-size:10px;text-transform:uppercase;color:var(--text-muted);text-align:center;">Trong DT</th>
        </tr></thead><tbody>`;

    let visible = 0;
    let dupKeys = [];

    WORK_ITEM_GROUPS.forEach(group => {
        const items = group.keys.map(key => {
            const def = WORK_ITEM_DIMS[key];
            if (!def) return null;
            const sell = sellPrices[key] || 0;
            const wip  = DEFAULT_WORK_ITEM_PRICES[key];
            const cost = workPrices[key] !== undefined ? workPrices[key] : (wip ? wip.price : 0);
            const inEstimate = existingKeys.has(key);
            if (search && !(def.label.toLowerCase().includes(search) || key.toLowerCase().includes(search))) return null;
            if (filter === "has-price" && sell <= 0) return null;
            if (filter === "no-price"  && sell > 0)  return null;
            if (filter === "new"       && inEstimate) return null;
            return { key, label: def.label, unit: def.unit, sell, cost, inEstimate };
        }).filter(Boolean);

        if (items.length === 0) return;

        html += `<tr><td colspan="6" style="padding:5px 10px 3px;font-size:10px;font-weight:700;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.05em;background:rgba(99,102,241,0.06);border-top:1px solid rgba(99,102,241,0.15);">${group.label}</td></tr>`;

        items.forEach(({ key, label, unit, sell, cost, inEstimate }) => {
            visible++;
            const isChecked = checked.has(key);
            if (isChecked && inEstimate) dupKeys.push(label);
            const hasSell = sell > 0;
            const sellFmt = hasSell ? sell.toLocaleString("vi-VN") + " đ" : `<span style="color:var(--text-muted);font-style:italic;">—</span>`;
            const costFmt = cost > 0 ? cost.toLocaleString("vi-VN") + " đ" : "—";
            const pct = (hasSell && cost > 0) ? `<span style="font-size:10px;color:#f59e0b;margin-left:3px;">+${(((sell-cost)/cost)*100).toFixed(0)}%</span>` : "";
            const dupTag = inEstimate
                ? `<span style="font-size:10px;padding:1px 5px;border-radius:3px;background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);font-weight:600;">Đã có</span>`
                : `<span style="font-size:10px;color:var(--text-muted);">—</span>`;
            html += `<tr class="ppick-row" data-key="${key}"
                style="cursor:pointer;transition:background 0.1s;${isChecked ? "background:rgba(0,242,254,0.06);" : ""}${inEstimate ? "opacity:0.8;" : ""}">
                <td style="text-align:center;padding:6px 10px;">
                    <input type="checkbox" class="ppick-cb" value="${key}" ${isChecked ? "checked" : ""}
                        style="width:14px;height:14px;cursor:pointer;accent-color:#00f2fe;">
                </td>
                <td style="padding:6px 10px;font-weight:500;color:var(--text-primary);">${escapeHtml(label)}</td>
                <td style="padding:6px 8px;text-align:center;font-size:11px;color:var(--text-muted);">${unit}</td>
                <td style="padding:6px 10px;text-align:right;font-weight:700;color:${hasSell ? "#34d399" : "var(--text-muted)"};">${sellFmt}${pct}</td>
                <td style="padding:6px 10px;text-align:right;font-size:11px;color:#60a5fa;">${costFmt}</td>
                <td style="padding:6px 8px;text-align:center;">${dupTag}</td>
            </tr>`;
        });
    });

    html += `</tbody></table>`;
    if (visible === 0) html = `<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px;">Không tìm thấy hạng mục nào</div>`;
    body.innerHTML = html;

    // Row click toggles checkbox
    body.querySelectorAll(".ppick-row").forEach(row => {
        row.addEventListener("click", e => {
            if (e.target.type === "checkbox") return;
            const cb = row.querySelector(".ppick-cb");
            if (cb) { cb.checked = !cb.checked; row.style.background = cb.checked ? "rgba(0,242,254,0.06)" : ""; }
            _ppickUpdateFooter();
        });
    });
    body.querySelectorAll(".ppick-cb").forEach(cb => {
        cb.addEventListener("change", () => { _ppickRefreshDupWarn(); _ppickUpdateFooter(); });
    });

    _ppickRefreshDupWarn();
    _ppickUpdateFooter();
}

function _ppickRefreshDupWarn() {
    const existingKeys = new Set(constructionItems.filter(i => !i.isSection).map(i => i.workItemKey));
    const dupLabels = [...document.querySelectorAll(".ppick-cb:checked")]
        .filter(cb => existingKeys.has(cb.value))
        .map(cb => {
            const def = WORK_ITEM_DIMS[cb.value];
            return def ? def.label : cb.value;
        });
    const warn = document.getElementById("ppickDupWarn");
    if (!warn) return;
    if (dupLabels.length > 0) {
        warn.style.display = "block";
        warn.innerHTML = `⚠️ <b>${dupLabels.length} hạng mục đã có trong dự toán</b> sẽ bị thêm trùng: ${dupLabels.map(l => `<i>${escapeHtml(l)}</i>`).join(", ")} — vẫn tiếp tục?`;
    } else {
        warn.style.display = "none";
    }
}

// ── Custom tab ────────────────────────────────────────────────────────────────
function _ppickAddCustomRow() {
    _customRows.push({ name: "", unit: "m²", price: 0, sync: false });
    _ppickRenderCustomRows();
    // Focus the new name input
    setTimeout(() => {
        const inputs = document.querySelectorAll(".ppick-cname");
        inputs[inputs.length - 1]?.focus();
    }, 20);
}

function _ppickRenderCustomRows() {
    const tbody = document.getElementById("ppickCustomRows");
    if (!tbody) return;
    if (_customRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding:16px 10px;text-align:center;color:var(--text-muted);font-size:12px;">
            Nhấn "+ Thêm dòng" để bắt đầu nhập hạng mục tùy chỉnh</td></tr>`;
        _ppickUpdateFooter();
        return;
    }
    tbody.innerHTML = _customRows.map((row, i) => `
        <tr data-ci="${i}" style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:5px 8px;">
                <input class="ppick-cname" type="text" value="${escapeHtml(row.name)}" placeholder="Tên hạng mục..." data-ci="${i}"
                    style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:5px;padding:5px 8px;color:var(--text-primary);font-size:12px;">
            </td>
            <td style="padding:5px 6px;">
                <select class="ppick-cunit" data-ci="${i}"
                    style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:5px;padding:5px 6px;color:var(--text-primary);font-size:12px;">
                    ${["m²","m³","md","cái","bộ","m","gói"].map(u => `<option ${row.unit===u?"selected":""}>${u}</option>`).join("")}
                </select>
            </td>
            <td style="padding:5px 6px;">
                <input class="ppick-cprice" type="text" value="${row.price > 0 ? row.price.toLocaleString("vi-VN") : ""}" placeholder="0" data-ci="${i}" inputmode="numeric"
                    style="width:100%;text-align:right;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:5px;padding:5px 8px;color:var(--text-primary);font-size:12px;">
            </td>
            <td style="padding:5px 6px;text-align:center;">
                <input type="checkbox" class="ppick-csync" data-ci="${i}" ${row.sync ? "checked" : ""}
                    title="Ghi đơn giá này ngược lại bảng giá công ty sau khi thêm"
                    style="width:14px;height:14px;cursor:pointer;accent-color:#34d399;">
            </td>
            <td style="padding:5px 6px;text-align:center;">
                <button class="ppick-cdel btn btn-secondary btn-xs" data-ci="${i}" style="padding:3px 7px;color:#f87171;">✕</button>
            </td>
        </tr>`).join("");

    // Wire inputs
    tbody.querySelectorAll(".ppick-cname").forEach(el => el.addEventListener("input", e => {
        _customRows[+e.target.dataset.ci].name = e.target.value; _ppickUpdateFooter();
    }));
    tbody.querySelectorAll(".ppick-cunit").forEach(el => el.addEventListener("change", e => {
        _customRows[+e.target.dataset.ci].unit = e.target.value;
    }));
    tbody.querySelectorAll(".ppick-cprice").forEach(el => el.addEventListener("input", e => {
        _customRows[+e.target.dataset.ci].price = parseInt(e.target.value.replace(/\D/g, "")) || 0;
    }));
    tbody.querySelectorAll(".ppick-csync").forEach(el => el.addEventListener("change", e => {
        _customRows[+e.target.dataset.ci].sync = e.target.checked;
    }));
    tbody.querySelectorAll(".ppick-cdel").forEach(el => el.addEventListener("click", e => {
        _customRows.splice(+e.target.dataset.ci, 1); _ppickRenderCustomRows();
    }));
    _ppickUpdateFooter();
}

// ── Footer count + confirm button state ──────────────────────────────────────
function _ppickUpdateFooter() {
    const isCustomPanel = document.getElementById("ppickPanelCustom")?.style.display !== "none";
    let count = 0;
    let label = "";

    if (!isCustomPanel) {
        count = document.querySelectorAll(".ppick-cb:checked").length;
        label = count > 0 ? `Đã chọn ${count} hạng mục từ danh mục` : "Chưa chọn hạng mục nào";
    } else {
        count = _customRows.filter(r => r.name.trim()).length;
        const syncCount = _customRows.filter(r => r.name.trim() && r.sync).length;
        label = count > 0
            ? `${count} hạng mục tùy chỉnh${syncCount > 0 ? ` • ${syncCount} sẽ sync → bảng giá` : ""}`
            : "Chưa có hạng mục nào";
    }

    const el = document.getElementById("ppickCount");
    if (el) el.textContent = label;
    const btn = document.getElementById("ppickConfirm");
    if (btn) btn.disabled = count === 0;
}

// ── Confirm: add to constructionItems, handle sync ────────────────────────────
function _ppickConfirm() {
    const isCustomPanel = document.getElementById("ppickPanelCustom")?.style.display !== "none";

    if (!isCustomPanel) {
        // Catalog tab
        const selectedKeys = [...document.querySelectorAll(".ppick-cb:checked")].map(cb => cb.value);
        if (selectedKeys.length === 0) return;
        const sellPrices = _getSellPrices();
        const workPrices = JSON.parse(localStorage.getItem("anlaa_work_prices") || "{}");
        pushUndo();
        selectedKeys.forEach(key => {
            const def = WORK_ITEM_DIMS[key];
            if (!def) return;
            const wip  = DEFAULT_WORK_ITEM_PRICES[key];
            const cost = workPrices[key] !== undefined ? workPrices[key] : (wip ? wip.price : 0);
            const sell = sellPrices[key] || 0;
            constructionItems.push({
                id: genId(), workItemKey: key, name: def.label, unit: def.unit,
                isAuto: false, expanded: true,
                materialPrice: sell > 0 ? sell : cost,
                laborPrice: 0,
                rows: [{ desc: "", n: 1, l: "", w: "", h: "", hs: 1 }]
            });
        });
        saveConstructionItems();
        updateConstructionCostSection();
        _closePricingPicker();
        showToast(`✅ Đã thêm ${selectedKeys.length} hạng mục từ bảng giá`);
    } else {
        // Custom tab
        const valid = _customRows.filter(r => r.name.trim());
        if (valid.length === 0) return;

        // Sync back to anlaa_work_prices for items that have a key match AND sync=true
        const syncItems = valid.filter(r => r.sync && r.price > 0);
        if (syncItems.length > 0) {
            const workPrices = JSON.parse(localStorage.getItem("anlaa_work_prices") || "{}");
            // Try to match by label to a WORK_ITEM_DIMS key
            syncItems.forEach(r => {
                const match = Object.entries(WORK_ITEM_DIMS).find(([, v]) => v.label === r.name.trim());
                if (match) workPrices[match[0]] = r.price;
                // else: custom name has no key — cannot sync to keyed price store, skip
            });
            localStorage.setItem("anlaa_work_prices", JSON.stringify(workPrices));
        }

        pushUndo();
        valid.forEach(r => {
            const match = Object.entries(WORK_ITEM_DIMS).find(([, v]) => v.label === r.name.trim());
            constructionItems.push({
                id: genId(),
                workItemKey: match ? match[0] : "custom",
                name: r.name.trim(),
                unit: r.unit,
                isAuto: false, expanded: true,
                materialPrice: r.price > 0 ? r.price : 0,
                laborPrice: 0,
                rows: [{ desc: "", n: 1, l: "", w: "", h: "", hs: 1 }]
            });
        });

        saveConstructionItems();
        updateConstructionCostSection();
        _closePricingPicker();
        const syncMsg = syncItems.filter(r => Object.entries(WORK_ITEM_DIMS).some(([, v]) => v.label === r.name.trim())).length;
        showToast(`✅ Đã thêm ${valid.length} hạng mục tùy chỉnh${syncMsg > 0 ? ` • ${syncMsg} đã sync → bảng giá` : ""}`);
    }
}

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

function updateConstructionCostSection() {
    const tbody = document.getElementById("costTableBody");
    if (!tbody) return;

    if (constructionItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="empty-boq-msg">Chưa có hạng mục thi công. Thêm hạng mục vật tư ở trên hoặc nhấn "+ Thêm hạng&nbsp;mục"</td></tr>`;
        document.getElementById("costTotalsArea").style.display = "none";
        return;
    }

    tbody.innerHTML = "";
    let stt = 1;
    let sectionStt = 0; // Roman numeral counter for sections

    // Pre-compute section subtotals
    const sectionTotals = {};
    let currentSectionId = null;
    constructionItems.forEach(item => {
        if (item.isSection) { currentSectionId = item.id; sectionTotals[item.id] = 0; return; }
        if (!currentSectionId) return;
        const qty = calcItemTotalQty(item);
        sectionTotals[currentSectionId] = (sectionTotals[currentSectionId] || 0) + qty * getItemUnitPrice(item);
    });

    const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV"];
    const UNITS = ["m²","m³","md","m","cái","bộ","kg","tấm","bao","viên"];

    constructionItems.forEach((item) => {
        // ── SECTION HEADER ROW ──────────────────────────────────────────
        if (item.isSection) {
            sectionStt++;
            const secTotal = sectionTotals[item.id] || 0;
            const secTr = document.createElement("tr");
            secTr.className = "cost-section-header";
            secTr.dataset.sectionId = item.id;
            secTr.innerHTML = `
                <td class="td-stt sec-stt">${ROMAN[sectionStt - 1] || sectionStt}</td>
                <td colspan="11" class="td-section-name">
                    <input type="text" class="section-name-input" value="${escapeHtml(item.name)}"
                        data-id="${item.id}" placeholder="Tên phần / chương (VD: Phần I — Phần thô)">
                </td>
                <td class="td-total text-right num-cell sec-subtotal" title="Tổng phần này">
                    ${secTotal > 0 ? formatVND(roundPrice(secTotal, vatEnabled)) : ""}
                </td>
                <td></td>
                <td class="td-action no-print">
                    <button class="btn-del-section btn btn-danger btn-xs" data-id="${item.id}" title="Xóa phần">×</button>
                </td>
            `;
            tbody.appendChild(secTr);
            return; // skip normal item rendering
        }

        const dims = WORK_ITEM_DIMS[item.workItemKey]
            ? (WORK_ITEM_DIMS[item.workItemKey].dims || [])
            : ["l","w","h"];
        const totalQty = calcItemTotalQty(item);
        const effectivePrice = getItemUnitPrice(item);
        const matPrice = item.materialPrice !== undefined ? parseFloat(item.materialPrice) || 0
            : (item.isAuto ? effectivePrice : (workItemPrices[item.workItemKey] || 0));
        const labPrice = item.laborPrice !== undefined ? parseFloat(item.laborPrice) || 0 : 0;
        const subtotal = totalQty * effectivePrice;
        const isCustom = !item.isAuto;
        const isUnknownKey = !WORK_ITEM_DIMS[item.workItemKey];

        const headerTr = document.createElement("tr");
        headerTr.className = "cost-item-header" + (item.isAuto ? " cost-auto" : " cost-custom");
        headerTr.dataset.itemId = item.id;
        headerTr.innerHTML = `
            <td class="td-stt">${stt++}</td>
            <td class="td-name" colspan="7">
                <div class="td-name-content">
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
                </div>
            </td>
            <td class="td-qty text-right num-cell">${formatNum(totalQty)}</td>
            <td class="td-price text-right num-cell th-mat-price">
                <input type="number" class="cost-mat-price-input price-split-input" data-id="${item.id}"
                    value="${matPrice || ""}" min="0" step="1000" placeholder="0"
                    title="Đơn giá vật tư (có thể sửa)">
            </td>
            <td class="td-price text-right num-cell th-lab-price">
                <input type="number" class="cost-lab-price-input price-split-input" data-id="${item.id}"
                    value="${labPrice || ""}" min="0" step="1000" placeholder="0"
                    title="Đơn giá nhân công (có thể sửa)">
            </td>
            <td class="td-total text-right num-cell cost-total-cell">${formatVND(roundPrice(subtotal, vatEnabled))}</td>
            <td class="td-note">
                <input type="text" class="cost-note-input" data-id="${item.id}"
                    value="${escapeHtml(item.note||"")}" placeholder="Ghi chú kỹ thuật..."
                    title="${escapeHtml(item.note||"")}">
            </td>
            <td class="td-action no-print"><button class="btn-del-item btn btn-danger btn-xs" data-id="${item.id}">×</button></td>
        `;
        tbody.appendChild(headerTr);

        if (item.expanded) {
            item.rows.forEach((row, ri) => {
                const rowQty = calcRowQty(row, dims);
                const detailTr = document.createElement("tr");
                const rowKey = `${item.id}:${ri}`;
                detailTr.className = "cost-detail-row" + (selectedRows.has(rowKey) ? " row-selected" : "");
                detailTr.dataset.itemId = item.id;
                detailTr.dataset.rowIdx = ri;
                detailTr.draggable = true;
                detailTr.innerHTML = `
                    <td class="td-drag no-print"><span class="drag-handle" title="Kéo để sắp xếp / Click để chọn dòng">⠿</span></td>
                    <td class="td-desc"><input class="detail-input desc-input" type="text" placeholder="Diễn giải..." value="${escapeHtml(row.desc||"")}" data-field="desc"></td>
                    <td></td>
                    <td><input class="detail-input dim-input" type="number" placeholder="L" value="${row.l||""}" data-field="l" ${!dims.includes("l")?"disabled":""}></td>
                    <td><input class="detail-input dim-input" type="number" placeholder="R" value="${row.w||""}" data-field="w" ${!dims.includes("w")?"disabled":""}></td>
                    <td><input class="detail-input dim-input" type="number" placeholder="C" value="${row.h||""}" data-field="h" ${!dims.includes("h")?"disabled":""}></td>
                    <td><input class="detail-input n-input" type="number" placeholder="n" value="${row.n||1}" data-field="n" min="0" step="1"></td>
                    <td><select class="detail-select hs-select" data-field="hs"><option value="1" ${row.hs>=0?"selected":""}>+</option><option value="-1" ${row.hs<0?"selected":""}>−</option></select></td>
                    <td class="text-right num-cell ${rowQty<0?"text-red":""}">${formatNum(rowQty)}</td>
                    <td></td><td></td><td></td>
                    <td class="no-print"><button class="btn-del-row btn btn-xs" data-item-id="${item.id}" data-row-idx="${ri}">×</button></td>
                `;
                tbody.appendChild(detailTr);
            });

            const addRowTr = document.createElement("tr");
            addRowTr.className = "cost-addrow-tr no-print";
            addRowTr.innerHTML = `<td colspan="14"><button class="btn-add-row btn btn-xs btn-secondary" data-item-id="${item.id}"><i data-lucide="plus"></i> thêm dòng diễn giải</button></td>`;
            tbody.appendChild(addRowTr);
        }
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
    wireCostTableEvents(tbody);
    refreshRowSelectionUI(); // re-apply selection classes after DOM rebuild
    // Add comment buttons to detail rows (collab feature)
    if (typeof addCommentButtonToRow === 'function') {
        tbody.querySelectorAll("tr.cost-detail-row").forEach(tr => {
            addCommentButtonToRow(tr, tr.dataset.itemId, parseInt(tr.dataset.rowIdx));
        });
        renderCommentDots();
    }
    document.getElementById("costTotalsArea").style.display = "block";
    updateConstructionCostTotals();
    applyConditionalFormattingAll(tbody);
    renderValidationBadge();
}

function escapeHtml(str) {
    return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function formatNum(v) {
    const n = parseFloat(v) || 0;
    return Math.abs(n) < 0.005 ? "0" : (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2));
}

// Evaluate simple math expressions like "3.5*2.4" or "(5+2)/3"
function safeEval(expr) {
    const s = String(expr || "").trim().replace(/,/g, ".");
    if (!s || !/[+\-*\/()]/.test(s)) return null;
    if (!/^[\d\s.+\-*\/()]+$/.test(s)) return null;
    try {
        const v = Function('"use strict";return(' + s + ')')();
        return (typeof v === "number" && isFinite(v) && v >= 0) ? Math.round(v * 1e6) / 1e6 : null;
    } catch { return null; }
}

function wireCostTableEvents(tbody) {
    // Section header: name edit
    tbody.querySelectorAll(".section-name-input").forEach(input => {
        input.addEventListener("input", function() {
            const item = constructionItems.find(i => i.id === this.dataset.id);
            if (item) { item.name = this.value; saveConstructionItems(); }
        });
    });

    // Section header: delete (removes section row only, items stay)
    tbody.querySelectorAll(".btn-del-section").forEach(btn => {
        btn.addEventListener("click", () => {
            pushUndo();
            constructionItems = constructionItems.filter(i => i.id !== btn.dataset.id);
            saveConstructionItems();
            updateConstructionCostSection();
        });
    });

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

    // Row highlight on focus + track focusedCellInfo
    tbody.querySelectorAll(".detail-input, .detail-select, .cost-name-input, .cost-price-input").forEach(input => {
        input.addEventListener("focus", function() {
            // Remove highlight from all rows
            tbody.querySelectorAll("tr.cost-detail-row.row-focused, tr.cost-item-header.row-focused").forEach(r => r.classList.remove("row-focused"));
            // Highlight current row
            const tr = this.closest("tr");
            if (tr) tr.classList.add("row-focused");
            // Track cell for Ctrl+D fill-down target
            if (this.dataset.field) {
                const trRow = this.closest("tr.cost-detail-row");
                if (trRow) {
                    focusedCellInfo = { itemId: trRow.dataset.itemId, rowIdx: parseInt(trRow.dataset.rowIdx), field: this.dataset.field };
                    // Broadcast cursor position to collaborators
                    if (typeof broadcastCursor === 'function') {
                        broadcastCursor(trRow.dataset.itemId, parseInt(trRow.dataset.rowIdx));
                    }
                }
            }
        });
        input.addEventListener("blur", function() {
            const tr = this.closest("tr");
            if (tr) tr.classList.remove("row-focused");
            if (!this.closest("#costTableBody")) focusedCellInfo = null;
        });
    });

    // Cell input: update data + recalculate row qty live
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
            // Apply conditional formatting to changed cell
            if (e.target.classList.contains("dim-input") || e.target.classList.contains("n-input")) {
                applyConditionalFormatting(e.target);
            }
            renderValidationBadge();
        });
    });

    // Gap 1: Free-form item name with datalist autocomplete
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

    // Gap 1: Unit selector for custom items
    tbody.querySelectorAll(".cost-unit-inline").forEach(sel => {
        sel.addEventListener("change", (e) => {
            const item = constructionItems.find(i => i.id === e.target.dataset.id);
            if (!item) return;
            item.unit = e.target.value;
            saveConstructionItems();
        });
    });

    // Gap 1: Inline unit price input for fully custom items (legacy fallback)
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

    // Price split: material price input
    tbody.querySelectorAll(".cost-mat-price-input").forEach(input => {
        input.addEventListener("focus", function() { this.select(); });
        input.addEventListener("input", (e) => {
            const item = constructionItems.find(i => i.id === e.target.dataset.id);
            if (!item) return;
            item.materialPrice = parseFloat(e.target.value) || 0;
            saveConstructionItems();
            updateItemHeaderQty(item);
        });
    });

    // Price split: labor price input
    tbody.querySelectorAll(".cost-lab-price-input").forEach(input => {
        input.addEventListener("focus", function() { this.select(); });
        input.addEventListener("input", (e) => {
            const item = constructionItems.find(i => i.id === e.target.dataset.id);
            if (!item) return;
            item.laborPrice = parseFloat(e.target.value) || 0;
            saveConstructionItems();
            updateItemHeaderQty(item);
        });
    });

    // Technical note input
    tbody.querySelectorAll(".cost-note-input").forEach(input => {
        input.addEventListener("input", (e) => {
            const item = constructionItems.find(i => i.id === e.target.dataset.id);
            if (!item) return;
            item.note = e.target.value;
            saveConstructionItems();
        });
    });

    // Expression evaluator: blur → evaluate "3.5*2.4" or named ranges "cc*rp"
    tbody.querySelectorAll(".dim-input, .n-input").forEach(input => {
        input.addEventListener("blur", function() {
            // Try named-range-aware eval first, then plain safeEval
            const result = safeEvalWithNames(this.value.trim()) ?? safeEval(this.value.trim());
            if (result !== null) {
                this.value = result;
                this.dispatchEvent(new Event("input", { bubbles: true }));
                this.classList.remove("expr-active", "nr-active");
            }
            applyConditionalFormatting(this);
        });
        input.addEventListener("input", function() {
            this.classList.toggle("expr-active", /[+\-*\/()]/.test(this.value));
            // Highlight if value matches a named range key
            const hasNameRef = Object.keys(namedRanges).some(k => this.value.includes(k));
            this.classList.toggle("nr-active", hasNameRef && !this.classList.contains("expr-active"));
        });
    });

    // Gap 2: Paste from Excel/G8 — tab-separated values fill cells across columns/rows
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
            showToast(`✓ Đã dán ${pastedRows.length} dòng từ clipboard`);
        });
    });

    // Tab → next enabled cell; Tab at row end → next row or new row; Enter → new row
    tbody.querySelectorAll(".detail-input:not([disabled])").forEach(input => {
        input.addEventListener("keydown", function(e) {
            const tr = this.closest("tr");
            const item = constructionItems.find(i => i.id === tr.dataset.itemId);
            if (!item) return;

            if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
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

    // ── Drag-to-reorder detail rows ──────────────────────────────────────
    tbody.querySelectorAll("tr.cost-detail-row").forEach(tr => {
        tr.addEventListener("dragstart", (e) => {
            dragSrcKey = `${tr.dataset.itemId}:${tr.dataset.rowIdx}`;
            tr.classList.add("drag-dragging");
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", dragSrcKey);
        });
        tr.addEventListener("dragend", () => {
            dragSrcKey = null;
            tbody.querySelectorAll("tr.cost-detail-row").forEach(r => {
                r.classList.remove("drag-dragging", "drag-over");
            });
        });
        tr.addEventListener("dragover", (e) => {
            if (!dragSrcKey) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            // Only highlight if same itemId
            if (tr.dataset.itemId === dragSrcKey.split(":")[0]) {
                tbody.querySelectorAll("tr.cost-detail-row").forEach(r => r.classList.remove("drag-over"));
                tr.classList.add("drag-over");
            }
        });
        tr.addEventListener("dragleave", () => tr.classList.remove("drag-over"));
        tr.addEventListener("drop", (e) => {
            e.preventDefault();
            tr.classList.remove("drag-over");
            if (!dragSrcKey) return;
            const [srcItemId, srcRiStr] = dragSrcKey.split(":");
            const srcRi = parseInt(srcRiStr);
            const dstRi = parseInt(tr.dataset.rowIdx);
            if (srcItemId !== tr.dataset.itemId || srcRi === dstRi) return;
            const item = constructionItems.find(i => i.id === srcItemId);
            if (!item) return;
            pushUndo();
            const [moved] = item.rows.splice(srcRi, 1);
            item.rows.splice(dstRi, 0, moved);
            selectedRows.clear(); lastSelectedKey = null;
            saveConstructionItems();
            updateConstructionCostSection();
            showToast("↕ Đã sắp xếp lại dòng");
        });
    });

    // ── Click drag-handle to select / deselect row ───────────────────────
    tbody.querySelectorAll(".drag-handle").forEach(handle => {
        handle.addEventListener("click", (e) => {
            e.stopPropagation();
            const tr = handle.closest("tr.cost-detail-row");
            if (!tr) return;
            const key = `${tr.dataset.itemId}:${tr.dataset.rowIdx}`;
            const ri = parseInt(tr.dataset.rowIdx);

            if (e.shiftKey && lastSelectedKey) {
                // Shift+Click: select range within same item
                const [lastItemId, lastRiStr] = lastSelectedKey.split(":");
                if (lastItemId === tr.dataset.itemId) {
                    const lastRi = parseInt(lastRiStr);
                    const [lo, hi] = [Math.min(ri, lastRi), Math.max(ri, lastRi)];
                    for (let i = lo; i <= hi; i++) selectedRows.add(`${tr.dataset.itemId}:${i}`);
                    refreshRowSelectionUI();
                    return;
                }
            }

            // Regular click: toggle
            if (selectedRows.has(key)) {
                selectedRows.delete(key);
                if (selectedRows.size === 0) lastSelectedKey = null;
            } else {
                if (!e.ctrlKey && !e.metaKey) selectedRows.clear();
                selectedRows.add(key);
                lastSelectedKey = key;
            }
            refreshRowSelectionUI();
        });
    });

    // Click anywhere else on tbody clears selection
    tbody.addEventListener("click", (e) => {
        if (!e.target.closest(".drag-handle") && selectedRows.size > 0) {
            selectedRows.clear(); lastSelectedKey = null;
            refreshRowSelectionUI();
        }
    });
}

function refreshRowSelectionUI() {
    const tbody = document.getElementById("costTableBody");
    if (!tbody) return;
    tbody.querySelectorAll("tr.cost-detail-row").forEach(tr => {
        const key = `${tr.dataset.itemId}:${tr.dataset.rowIdx}`;
        tr.classList.toggle("row-selected", selectedRows.has(key));
    });
    // Update selection badge in kbd-hints bar
    const badge = document.getElementById("selectionBadge");
    if (badge) {
        badge.textContent = selectedRows.size > 0 ? `${selectedRows.size} dòng đang chọn — Ctrl+Del để xóa, Esc để bỏ chọn` : "";
        badge.style.display = selectedRows.size > 0 ? "inline" : "none";
    }
}

function updateItemHeaderQty(item) {
    const headerRow = document.querySelector(`.cost-item-header[data-item-id="${item.id}"]`);
    if (!headerRow) return;
    const totalQty = calcItemTotalQty(item);
    const subtotal = totalQty * getItemUnitPrice(item);
    const qtyCell = headerRow.querySelector(".td-qty");
    const totalCell = headerRow.querySelector(".cost-total-cell");
    if (qtyCell) qtyCell.innerText = formatNum(totalQty);
    if (totalCell) totalCell.innerText = formatVND(roundPrice(subtotal, vatEnabled));
    updateConstructionCostTotals();
}

function updateConstructionCostTotals() {
    let subtotalAuto = 0;
    let subtotalCustom = 0;

    constructionItems.forEach(item => {
        if (item.isSection) return;
        const totalQty = calcItemTotalQty(item);
        const itemTotal = totalQty * getItemUnitPrice(item);
        if (item.isAuto) subtotalAuto += itemTotal;
        else subtotalCustom += itemTotal;
    });

    const subtotal = subtotalAuto + subtotalCustom;
    const contingency = contingencyEnabled ? subtotal * (contingencyPct / 100) : 0;
    const beforeVat = subtotal + contingency;
    // VAT applied after contingency; rounding skipped when VAT is on
    const vatAmount = vatEnabled ? beforeVat * (vatPct / 100) : 0;
    const grandTotal = beforeVat + vatAmount;
    // Rounded total: only when VAT is off
    const grandTotalRounded = roundPrice(grandTotal, vatEnabled);

    const el = (id) => document.getElementById(id);
    const toggle = document.getElementById("contingencyToggle");

    // Group subtotals — show only if both groups have items
    const hasAuto = constructionItems.some(i => i.isAuto);
    const hasCustom = constructionItems.some(i => !i.isAuto);
    if (el("subtotalAutoRow")) el("subtotalAutoRow").style.display = (hasAuto && hasCustom) ? "" : "none";
    if (el("subtotalCustomRow")) el("subtotalCustomRow").style.display = (hasAuto && hasCustom) ? "" : "none";
    if (el("subtotalAuto")) el("subtotalAuto").innerText = formatVND(roundPrice(subtotalAuto, vatEnabled));
    if (el("subtotalCustom")) el("subtotalCustom").innerText = formatVND(roundPrice(subtotalCustom, vatEnabled));

    if (el("costSubtotal")) el("costSubtotal").innerText = formatVND(roundPrice(subtotal, vatEnabled));
    if (el("contingencyAmount")) el("contingencyAmount").innerText = "+" + formatVND(roundPrice(contingency, vatEnabled));

    // VAT row visibility
    if (el("vatRow")) el("vatRow").style.display = "";
    if (el("vatToggle")) el("vatToggle").checked = vatEnabled;
    if (el("vatPct")) el("vatPct").value = vatPct;
    if (el("vatAmount")) el("vatAmount").innerText = vatEnabled ? "+" + formatVND(Math.round(vatAmount)) : "+0 VNĐ";

    // Grand total: when VAT on → show precise; when VAT off → show rounded
    if (el("costGrandTotal")) {
        el("costGrandTotal").innerText = formatVND(vatEnabled ? Math.round(grandTotal) : grandTotalRounded);
    }

    // Rounded row: show diff only when rounding unit > 0 and VAT is off
    if (el("costGrandTotalRounded")) {
        if (!vatEnabled && roundingUnit > 0 && grandTotalRounded !== Math.round(grandTotal)) {
            const diff = grandTotalRounded - Math.round(grandTotal);
            el("costGrandTotalRounded").innerText = `≈ ${formatVND(grandTotalRounded)} (${diff > 0 ? "+" : ""}${formatVND(diff)})`;
        } else if (vatEnabled) {
            el("costGrandTotalRounded").innerText = "Không làm tròn khi có VAT";
            el("costGrandTotalRounded").style.color = "#94a3b8";
        } else {
            el("costGrandTotalRounded").innerText = "—";
        }
    }

    if (toggle) toggle.checked = contingencyEnabled;
}

function syncAutoConstructionItems() {
    constructionItems = constructionItems.filter(i => !i.isAuto || i.isSection);

    const newAutoItems = [];
    currentProject.items.forEach(item => {
        if (item.type === "masonry") {
            const r = item.results;
            const wallKey = r.brickType === "brick-aac" ? "masonry-aac-110"
                : (r.wallType === "220" ? "masonry-220" : "masonry-110");
            if (r.netArea > 0) {
                newAutoItems.push({
                    id: "auto_" + item.id + "_masonry",
                    workItemKey: wallKey,
                    name: (WORK_ITEM_DIMS[wallKey] || {}).label || "Xây tường",
                    unit: "m²", isAuto: true, expanded: false,
                    unitPrice: workItemPrices[wallKey] || 0,
                    rows: [{ desc: item.name || "Xây tường", n: 1, l: parseFloat(r.netArea.toFixed(2)), w: "", h: "", hs: 1 }]
                });
            }
            if (r.hasAutoPlaster && r.autoPlaster && r.autoPlaster.plasterArea > 0) {
                const faces = r.autoPlaster.faces || 2;
                const plasterKey = faces === 1 ? "plastering-1-face" : "plastering-2-face";
                newAutoItems.push({
                    id: "auto_" + item.id + "_plaster",
                    workItemKey: plasterKey,
                    name: (WORK_ITEM_DIMS[plasterKey] || {}).label || "Trát tường",
                    unit: "m²", isAuto: true, expanded: false,
                    unitPrice: workItemPrices[plasterKey] || 0,
                    rows: [{ desc: item.name || "Trát tường", n: 1, l: parseFloat(r.autoPlaster.plasterArea.toFixed(2)), w: "", h: "", hs: 1 }]
                });
            }
        } else if (item.type === "plastering") {
            const r = item.results;
            newAutoItems.push({
                id: "auto_" + item.id + "_screed",
                workItemKey: "screed",
                name: "Cán nền xi măng cát",
                unit: "m²", isAuto: true, expanded: false,
                unitPrice: workItemPrices["screed"] || 0,
                rows: [{ desc: item.name || "Cán nền", n: 1, l: parseFloat((r.area || 0).toFixed(2)), w: "", h: "", hs: 1 }]
            });
        } else if (item.type === "tiling") {
            const r = item.results;
            const isWall = (item.name || "").toLowerCase().includes("ốp") || (item.name || "").toLowerCase().includes("tường");
            const tileKey = isWall ? "tiling-wall" : "tiling-floor";
            newAutoItems.push({
                id: "auto_" + item.id + "_tiling",
                workItemKey: tileKey,
                name: (WORK_ITEM_DIMS[tileKey] || {}).label || "Lát gạch",
                unit: "m²", isAuto: true, expanded: false,
                unitPrice: workItemPrices[tileKey] || 0,
                rows: [{ desc: item.name || "Lát gạch", n: 1, l: parseFloat((r.area || 0).toFixed(2)), w: "", h: "", hs: 1 }]
            });
        }
    });

    const customItems = constructionItems.filter(i => !i.isAuto);
    constructionItems = [...newAutoItems, ...customItems];
    saveConstructionItems();
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT SCHEDULE — chia đợt thanh toán theo tiến độ
// ═══════════════════════════════════════════════════════════════

let paymentSchedule = []; // [{ id, label, pct, amount, note, usePct }]

function loadPaymentSchedule() {
    try { paymentSchedule = JSON.parse(localStorage.getItem("anlaa_payment_schedule") || "[]"); } catch { paymentSchedule = []; }
}

function savePaymentSchedule() {
    localStorage.setItem("anlaa_payment_schedule", JSON.stringify(paymentSchedule));
}

function renderPaymentSchedule() {
    const list = document.getElementById("paymentList");
    if (!list) return;

    // Get current grand total
    let grandTotal = 0;
    constructionItems.forEach(item => {
        if (item.isSection) return;
        grandTotal += calcItemTotalQty(item) * getItemUnitPrice(item);
    });
    const contingency = contingencyEnabled ? grandTotal * (contingencyPct / 100) : 0;
    const beforeVat = grandTotal + contingency;
    const vatAmt = vatEnabled ? beforeVat * (vatPct / 100) : 0;
    const total = beforeVat + vatAmt;

    list.innerHTML = paymentSchedule.length === 0
        ? '<p class="ps-empty">Chưa có đợt. Nhấn "+ Thêm đợt" để thiết lập tiến độ thanh toán.</p>'
        : paymentSchedule.map((p, idx) => {
            const amt = p.usePct ? Math.round(total * (p.pct / 100)) : (p.amount || 0);
            return `
            <div class="ps-row" data-id="${p.id}">
                <span class="ps-idx">Đợt ${idx + 1}</span>
                <input class="ps-label-input detail-input" type="text" placeholder="Tên đợt (VD: Xong phần thô)"
                    value="${escapeHtml(p.label)}" data-id="${p.id}" data-field="label">
                <div class="ps-amount-group">
                    <select class="ps-mode-sel contingency-input" data-id="${p.id}" style="width:60px">
                        <option value="pct" ${p.usePct?"selected":""}>%</option>
                        <option value="amt" ${!p.usePct?"selected":""}>VNĐ</option>
                    </select>
                    <input class="ps-val-input detail-input" type="number"
                        value="${p.usePct ? p.pct : p.amount}" min="0"
                        step="${p.usePct ? 5 : 1000000}" placeholder="0" data-id="${p.id}">
                </div>
                <span class="ps-computed">${formatVND(roundPrice(amt, vatEnabled))}</span>
                <input class="ps-note-input detail-input" type="text" placeholder="Ghi chú đợt..."
                    value="${escapeHtml(p.note||"")}" data-id="${p.id}" data-field="note">
                <button class="ps-del btn btn-xs btn-danger" data-id="${p.id}">×</button>
            </div>`;
        }).join("");

    // Footer: allocated sum
    const allocated = paymentSchedule.reduce((s, p) => {
        return s + (p.usePct ? Math.round(total * (p.pct / 100)) : (p.amount || 0));
    }, 0);
    const allocPct = total > 0 ? ((allocated / total) * 100).toFixed(1) : "0";
    const remaining = total - allocated;
    const allocEl = document.getElementById("psAllocated");
    const remEl = document.getElementById("psRemaining");
    if (allocEl) allocEl.innerText = `${formatVND(allocated)} / ${allocPct}%`;
    if (remEl) {
        remEl.innerText = remaining === 0 ? "✓ Đã phân bổ đủ 100%"
            : remaining > 0 ? `Còn lại: ${formatVND(remaining)}`
            : `Vượt: ${formatVND(Math.abs(remaining))}`;
        remEl.style.color = remaining === 0 ? "#34d399" : remaining > 0 ? "#fbbf24" : "#f87171";
    }

    wirePaymentScheduleEvents(list);
}

function wirePaymentScheduleEvents(list) {
    list.querySelectorAll(".ps-del").forEach(btn => {
        btn.addEventListener("click", () => {
            paymentSchedule = paymentSchedule.filter(p => p.id !== btn.dataset.id);
            savePaymentSchedule();
            renderPaymentSchedule();
        });
    });
    list.querySelectorAll(".ps-label-input").forEach(input => {
        input.addEventListener("input", function() {
            const p = paymentSchedule.find(x => x.id === this.dataset.id);
            if (p) { p.label = this.value; savePaymentSchedule(); }
        });
    });
    list.querySelectorAll(".ps-note-input").forEach(input => {
        input.addEventListener("input", function() {
            const p = paymentSchedule.find(x => x.id === this.dataset.id);
            if (p) { p.note = this.value; savePaymentSchedule(); }
        });
    });
    list.querySelectorAll(".ps-mode-sel").forEach(sel => {
        sel.addEventListener("change", function() {
            const p = paymentSchedule.find(x => x.id === this.dataset.id);
            if (!p) return;
            p.usePct = this.value === "pct";
            savePaymentSchedule();
            renderPaymentSchedule();
        });
    });
    list.querySelectorAll(".ps-val-input").forEach(input => {
        input.addEventListener("input", function() {
            const p = paymentSchedule.find(x => x.id === this.dataset.id);
            if (!p) return;
            const v = parseFloat(this.value) || 0;
            if (p.usePct) p.pct = v; else p.amount = v;
            savePaymentSchedule();
            renderPaymentSchedule();
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// NAMED RANGES — đặt tên cho hằng số, dùng trong ô diễn giải
// ═══════════════════════════════════════════════════════════════

let namedRanges = {};

function loadNamedRanges() {
    try { namedRanges = JSON.parse(localStorage.getItem("anlaa_named_ranges") || "{}"); } catch { namedRanges = {}; }
}

function saveNamedRanges() {
    localStorage.setItem("anlaa_named_ranges", JSON.stringify(namedRanges));
}

// Resolve named ranges in expression: "cc*rp" → "3.2*4.5"
function resolveNamedRanges(expr) {
    let resolved = expr;
    const keys = Object.keys(namedRanges).sort((a, b) => b.length - a.length);
    keys.forEach(k => {
        const safe = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        resolved = resolved.replace(new RegExp("\\b" + safe + "\\b", "g"), String(namedRanges[k]));
    });
    return resolved;
}

function safeEvalWithNames(expr) {
    const s = String(expr || "").trim().replace(/,/g, ".");
    if (!s) return null;
    const resolved = resolveNamedRanges(s);
    if (!/^[\d\s.+\-*\/()]+$/.test(resolved)) return null;
    try {
        const v = Function('"use strict";return(' + resolved + ')')();
        return (typeof v === "number" && isFinite(v) && v >= 0) ? Math.round(v * 1e6) / 1e6 : null;
    } catch { return null; }
}

function renderNamedRangesPanel() {
    const panel = document.getElementById("namedRangesPanel");
    if (!panel) return;
    const entries = Object.entries(namedRanges);
    const emptyMsg = entries.length === 0 ? '<p class="nr-empty">Chưa có biến số. Nhấn "+ Thêm" để định nghĩa.</p>' : "";
    const rows = entries.map(([k, v]) =>
        '<div class="nr-row">' +
        '<input class="nr-key detail-input" type="text" value="' + escapeHtml(k) + '" data-orig="' + escapeHtml(k) + '" placeholder="ten_bien">' +
        '<span class="nr-eq">=</span>' +
        '<input class="nr-val detail-input" type="number" value="' + v + '" step="any" placeholder="0">' +
        '<button class="nr-del btn btn-xs btn-danger" data-key="' + escapeHtml(k) + '">×</button>' +
        '</div>'
    ).join("");
    panel.innerHTML =
        '<div class="nr-header">' +
        '<span class="nr-title">Biến số (Named Ranges)</span>' +
        '<button class="btn btn-xs btn-secondary" id="btnAddNamedRange">+ Thêm</button>' +
        '</div>' +
        emptyMsg +
        '<div class="nr-list">' + rows + '</div>' +
        '<p class="nr-hint">Dùng tên biến trong ô kích thước. VD: đặt <code>cc=3.2</code> → gõ <code>cc</code> vào ô Cao.</p>';
    wireNamedRangesEvents(panel);
}

function wireNamedRangesEvents(panel) {
    panel.querySelector("#btnAddNamedRange")?.addEventListener("click", () => {
        const name = "b" + (Object.keys(namedRanges).length + 1);
        namedRanges[name] = 0;
        saveNamedRanges();
        renderNamedRangesPanel();
        setTimeout(() => { const ks = panel.querySelectorAll(".nr-key"); ks[ks.length-1]?.focus(); }, 30);
    });
    panel.querySelectorAll(".nr-key").forEach(input => {
        input.addEventListener("change", function() {
            const orig = this.dataset.orig;
            const nk = this.value.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
            if (!nk || nk === orig) return;
            if (namedRanges[nk] !== undefined) { showToast("Tên biến đã tồn tại"); this.value = orig; return; }
            namedRanges[nk] = namedRanges[orig];
            delete namedRanges[orig];
            saveNamedRanges();
            renderNamedRangesPanel();
        });
    });
    panel.querySelectorAll(".nr-val").forEach(input => {
        input.addEventListener("change", function() {
            const k = this.closest(".nr-row").querySelector(".nr-key").value.trim().replace(/\s+/g, "_");
            namedRanges[k] = parseFloat(this.value) || 0;
            saveNamedRanges();
        });
    });
    panel.querySelectorAll(".nr-del").forEach(btn => {
        btn.addEventListener("click", function() {
            delete namedRanges[this.dataset.key];
            saveNamedRanges();
            renderNamedRangesPanel();
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// CONDITIONAL FORMATTING — tô màu ô dim theo giá trị
// ═══════════════════════════════════════════════════════════════

const CF_RULES = {
    l: { warnAbove: 50,  errorAbove: 200 },
    w: { warnAbove: 30,  errorAbove: 100 },
    h: { warnAbove: 10,  errorAbove: 30  },
    n: { warnAbove: 100, errorAbove: 500 },
};

function applyConditionalFormatting(input) {
    const field = input.dataset.field;
    const val = parseFloat(input.value);
    input.classList.remove("cf-zero", "cf-warn", "cf-error", "cf-negative");
    if (!input.value || input.disabled) return;
    if (val < 0) { input.classList.add("cf-negative"); return; }
    if (val === 0 && input.value !== "") { input.classList.add("cf-zero"); return; }
    const rule = CF_RULES[field];
    if (!rule) return;
    if (val > rule.errorAbove) input.classList.add("cf-error");
    else if (val > rule.warnAbove) input.classList.add("cf-warn");
}

function applyConditionalFormattingAll(tbody) {
    tbody.querySelectorAll(".dim-input, .n-input").forEach(applyConditionalFormatting);
}

// ═══════════════════════════════════════════════════════════════
// DATA VALIDATION — cảnh báo ô vi phạm quy tắc
// ═══════════════════════════════════════════════════════════════

function validateCostItems() {
    const errors = [];
    constructionItems.forEach(item => {
        if (item.isSection) return;
        const dims = (WORK_ITEM_DIMS[item.workItemKey] || {}).dims || [];
        item.rows.forEach((row, ri) => {
            const hasAnyDim = dims.some(d => parseFloat(row[d]) > 0);
            if (hasAnyDim && !row.desc?.trim()) {
                errors.push({ itemId: item.id, rowIdx: ri, field: "desc", message: "Thiếu diễn giải cho dòng có kích thước" });
            }
            dims.forEach(d => {
                const v = parseFloat(row[d]);
                if (row[d] !== "" && row[d] !== undefined && v < 0) {
                    errors.push({ itemId: item.id, rowIdx: ri, field: d, message: "Kích thước " + d.toUpperCase() + " = " + v + " < 0" });
                }
            });
            dims.forEach(d => {
                const v = parseFloat(row[d]);
                const rule = CF_RULES[d];
                if (rule && v > rule.errorAbove) {
                    errors.push({ itemId: item.id, rowIdx: ri, field: d, message: d.toUpperCase() + " = " + v + "m — bất thường (> " + rule.errorAbove + "m)" });
                }
            });
            if ((parseFloat(row.n) || 0) === 0 && dims.length > 0 && hasAnyDim) {
                errors.push({ itemId: item.id, rowIdx: ri, field: "n", message: "Số lần (n) = 0 — dòng không tính vào khối lượng" });
            }
        });
    });
    return errors;
}

function renderValidationBadge() {
    const badge = document.getElementById("validationBadge");
    if (!badge) return;
    document.querySelectorAll(".cf-invalid").forEach(el => el.classList.remove("cf-invalid"));
    const errors = validateCostItems();
    if (errors.length === 0) {
        badge.style.display = "none";
        return;
    }
    badge.style.display = "inline-flex";
    badge.title = errors.map(e => "• " + e.message).join("\n");
    badge.textContent = "⚠ " + errors.length + " cảnh báo";
    errors.forEach(err => {
        const trs = document.querySelectorAll('#costTableBody tr.cost-detail-row[data-item-id="' + err.itemId + '"]');
        const tr = trs[err.rowIdx];
        if (!tr) return;
        const sel = err.field === "desc" ? ".desc-input" : '.detail-input[data-field="' + err.field + '"]';
        const inp = tr.querySelector(sel);
        if (inp) inp.classList.add("cf-invalid");
    });
}

// ═══════════════════════════════════════════════════════════════
// HỆ THỐNG THÔNG BÁO TỐI GIẢN — NOTIFICATION CENTER
// ═══════════════════════════════════════════════════════════════
let notifications = [];

function initNotifications() {
    const btn = document.getElementById("btnNotifications");
    const dropdown = document.getElementById("notiDropdown");
    const btnMarkAll = document.getElementById("btnNotiMarkAllRead");
    const btnClearAll = document.getElementById("btnNotiClearAll");
    const btnClose = document.getElementById("btnNotiClose");

    if (!btn || !dropdown) return;

    // Load or pre-populate
    try {
        const stored = localStorage.getItem("anlaa_notifications");
        if (stored) {
            notifications = JSON.parse(stored);
        } else {
            // Pre-populate with beautiful default notifications
            notifications = [
                {
                    id: "noti-1",
                    category: "success",
                    title: "Dự án biệt thự A-01 phê duyệt",
                    body: "Admin đã duyệt dự toán hoàn chỉnh của biệt thự A-01 và cập nhật bảng giá chính thức.",
                    time: "5 phút trước",
                    unread: true
                },
                {
                    id: "noti-2",
                    category: "warning",
                    title: "Nhắc nhở: Đơn giá thép biến động",
                    body: "Giá thép xây dựng Hòa Phát tăng nhẹ khoảng 1.2%. Vui lòng rà soát lại đơn giá trong bảng dự toán.",
                    time: "2 giờ trước",
                    unread: true
                },
                {
                    id: "noti-3",
                    category: "info",
                    title: "Hệ thống nâng cấp UI Tối giản",
                    body: "Chúng tôi vừa nâng cấp toàn bộ giao diện sang chuẩn Glassmorphism tối giản và tối ưu hóa không gian làm việc di động.",
                    time: "1 ngày trước",
                    unread: false
                },
                {
                    id: "noti-4",
                    category: "error",
                    title: "Cảnh báo sai lệch khối lượng",
                    body: "Phát hiện sai lệch lớn giữa thể tích xây thô và diện tích trát tường đứng ở khu vực tầng 2. Cần rà soát lại ngay.",
                    time: "3 ngày trước",
                    unread: true
                }
            ];
            localStorage.setItem("anlaa_notifications", JSON.stringify(notifications));
        }
    } catch {
        notifications = [];
    }

    // Toggle dropdown
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const show = dropdown.style.display === "none";
        dropdown.style.display = show ? "flex" : "none";
        if (show) {
            // Refresh icons inside dropdown when shown
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    });

    // Close on click outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".noti-container")) {
            dropdown.style.display = "none";
        }
    });

    // Mark all as read
    btnMarkAll?.addEventListener("click", () => {
        notifications.forEach(n => n.unread = false);
        saveNotifications();
        renderNotifications();
    });

    // Clear all
    btnClearAll?.addEventListener("click", () => {
        if (confirm("Xóa toàn bộ thông báo hệ thống?")) {
            notifications = [];
            saveNotifications();
            renderNotifications();
        }
    });

    // Close button
    btnClose?.addEventListener("click", () => {
        dropdown.style.display = "none";
    });

    // Initial render
    renderNotifications();
}

function saveNotifications() {
    localStorage.setItem("anlaa_notifications", JSON.stringify(notifications));
}

function renderNotifications() {
    const list = document.getElementById("notiList");
    const badge = document.getElementById("notiBadgeCount");
    if (!list) return;

    // Unread count
    const unreadCount = notifications.filter(n => n.unread).length;
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = "flex";
        } else {
            badge.style.display = "none";
        }
    }

    if (notifications.length === 0) {
        list.innerHTML = `<div class="noti-empty">Không có thông báo mới</div>`;
        return;
    }

    // Map categories to icons
    const iconMap = {
        success: "check-circle",
        warning: "alert-triangle",
        error: "shield-alert",
        info: "info"
    };

    list.innerHTML = notifications.map(n => `
        <div class="noti-item ${n.unread ? "unread" : ""} cat-${n.category}" data-id="${n.id}">
            <div class="noti-item-icon">
                <i data-lucide="${iconMap[n.category] || "bell"}"></i>
            </div>
            <div class="noti-item-content">
                <span class="noti-item-title">${escapeHtml(n.title)}</span>
                <span class="noti-item-body">${escapeHtml(n.body)}</span>
                <span class="noti-item-time">${escapeHtml(n.time)}</span>
            </div>
            ${n.unread ? `<span class="noti-item-unread-dot"></span>` : ""}
            <button class="noti-item-delete" data-id="${n.id}" title="Xóa thông báo">×</button>
        </div>
    `).join("");

    // Wire events inside list
    list.querySelectorAll(".noti-item").forEach(item => {
        item.addEventListener("click", (e) => {
            if (e.target.closest(".noti-item-delete")) return;
            const notiId = item.dataset.id;
            const noti = notifications.find(n => n.id === notiId);
            if (noti && noti.unread) {
                noti.unread = false;
                saveNotifications();
                renderNotifications();
            }
        });
    });

    list.querySelectorAll(".noti-item-delete").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const notiId = btn.dataset.id;
            notifications = notifications.filter(n => n.id !== notiId);
            saveNotifications();
            renderNotifications();
        });
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
}

