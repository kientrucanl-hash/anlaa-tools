/**
 * Shared App Sidebar Navigation and Unified Notification Center for all MECALC pages (Unified Dashboard Layout).
 * Call initAppSidebar({ activePage }) after DOMContentLoaded.
 * Requires: api.js, auth.js, and lucide icons library loaded.
 */

let notifications = [];

function renderSidebarHTML(activePage) {
    const user = getCurrentUser();
    const isAdmin = user && user.role === 'admin';

    // Get current project details from localStorage to keep it synced
    const projName = localStorage.getItem('anlaa_project_name') || 'Dự án mới';
    const projAddress = localStorage.getItem('anlaa_project_address') || 'Hà Nội';

    // 1. Calculations Group (will redirect to index.html with tab param if clicked from secondary pages)
    const getCalcLink = (tabId, label, icon) => {
        const isCurrentPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
        const href = isCurrentPage ? '#' : `index.html?tab=${tabId}`;
        const activeClass = (isCurrentPage && activePage === tabId) ? 'active' : '';
        const attr = isCurrentPage ? `data-tab="${tabId}"` : '';
        return `<button class="tab-btn sb-nav-btn ${activeClass}" ${attr} onclick="${!isCurrentPage ? `window.location.href='${href}'` : ''}">
            <i data-lucide="${icon}"></i>
            <span>${label}</span>
        </button>`;
    };

    // 2. Navigation Group
    const getNavLink = (pageId, label, icon, href) => {
        const isActive = activePage === pageId;
        return `<a href="${href}" class="tab-btn sb-nav-link ${isActive ? 'active' : ''}">
            <i data-lucide="${icon}"></i>
            <span>${label}</span>
        </a>`;
    };

    // Admin link visibility
    const adminLink = isAdmin
        ? getNavLink('admin', 'Quản lý Admin', 'shield-check', 'admin.html')
        : '';

    const userName = user ? user.username : 'Đang tải...';
    const userRole = isAdmin ? 'Quản trị viên' : 'KTS / Người dự toán';

    return `
        <!-- HEADER: brand + close -->
        <div class="sb-header">
            <a href="home.html" class="sb-brand" style="text-decoration: none;">
                <img src="logo-tool-anlc.webp" alt="ANLAA" class="sb-logo">
                <div class="sb-brand-text">
                    <span class="sb-title">Dự toán ANLAA</span>
                    <span class="sb-version">Mecalc v2.0</span>
                </div>
            </a>
            <button id="sidebarClose" class="sb-close-btn" title="Đóng">
                <i data-lucide="x"></i>
            </button>
        </div>

        <!-- SCROLLABLE BODY -->
        <div class="sb-body">

            <!-- GROUP 1: DỰ ÁN HIỆN TẠI (always visible, read-only on secondary pages) -->
            <div class="sb-section">
                <p class="sb-section-label">Dự án</p>
                <div class="info-group">
                    <input type="text" id="projectName" class="sb-input" readonly placeholder="Tên dự án..." value="${projName}" style="background: rgba(255,255,255,0.02); cursor: default;">
                </div>
                <div class="info-group" style="margin-top:6px;">
                    <input type="text" id="projectAddress" class="sb-input" readonly placeholder="Địa chỉ..." value="${projAddress}" style="background: rgba(255,255,255,0.02); cursor: default;">
                </div>
            </div>

            <div class="sb-divider"></div>

            <!-- GROUP 2: MODULE TÍNH TOÁN -->
            <div class="sb-section">
                <p class="sb-section-label">Tính toán</p>
                <nav class="sb-nav">
                    ${getCalcLink('masonry', 'Xây & Trát', 'brick')}
                    ${getCalcLink('plastering', 'Cán nền', 'layers')}
                    ${getCalcLink('tiling', 'Ốp lát gạch', 'grid-3x3')}
                    <div class="sb-nav-separator"></div>
                    ${getCalcLink('unit-prices', 'Đơn giá Vật tư', 'coins')}
                    ${getCalcLink('work-prices', 'Đơn giá Thi công', 'hard-hat')}
                </nav>
            </div>

            <div class="sb-divider"></div>

            <!-- GROUP 3: ĐIỀU HƯỚNG -->
            <div class="sb-section">
                <p class="sb-section-label">Điều hướng</p>
                <nav class="sb-nav">
                    ${getNavLink('home', 'Trang chủ Landing', 'home', 'home.html')}
                    ${getNavLink('estimate', 'Dự toán Chi phí', 'file-spreadsheet', 'estimate.html')}
                    ${getNavLink('materials', 'Vật tư cần mua', 'package', 'materials.html')}
                    ${getNavLink('pricing', 'Bảng Giá & NTP', 'bar-chart-2', 'pricing.html')}
                    ${getNavLink('contractors', 'Nhà thầu phụ', 'hard-hat', 'contractors.html')}
                    ${getNavLink('quotations', 'Báo giá Nhà thầu', 'clipboard-list', 'quotations.html')}
                    <div class="sb-nav-separator"></div>
                    ${getNavLink('history', 'Lịch sử Dự toán', 'clock', 'history.html')}
                    ${getNavLink('settings', 'Cài đặt Tài khoản', 'settings', 'settings.html')}
                    ${getNavLink('help', 'Hướng dẫn sử dụng', 'book-open', 'help.html')}
                    ${adminLink}
                </nav>
            </div>

        </div>

        <!-- FOOTER: user + actions + notification -->
        <div class="sb-footer">
            <!-- User card -->
            <div class="sb-user-row" style="position: relative;">
                <div class="sb-user-avatar">
                    <i data-lucide="user"></i>
                    <span class="sb-user-dot"></span>
                </div>
                <div class="sb-user-info" style="flex: 1; min-width: 0; margin-right: 8px;">
                    <span id="sidebarUserName" class="sb-user-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${userName}</span>
                    <span class="sb-user-role" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${userRole}</span>
                </div>

                <!-- UNIFIED NOTIFICATION BELL (placed beautifully in sidebar footer) -->
                <div class="noti-container no-print" style="margin-right: 8px; display: inline-flex;">
                    <button id="btnNotifications" class="sb-icon-btn noti-btn" title="Thông báo hệ thống" style="position: relative; width: 32px; height: 32px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: var(--transition-smooth);">
                        <i data-lucide="bell" style="width: 16px; height: 16px;"></i>
                        <span id="notiBadgeCount" class="noti-badge" style="display:none; position: absolute; top: -3px; right: -3px; background: #ff5252; color: #ffffff; font-size: 8px; font-weight: 800; width: 14px; height: 14px; border-radius: 50%; border: 1px solid var(--bg-main); display: flex; align-items: center; justify-content: center; animation: pulse-noti 2s infinite;">0</span>
                    </button>
                </div>

                <button id="sidebarLogoutBtn" class="sb-icon-btn sb-logout-btn" title="Đăng xuất" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: var(--text-secondary); cursor: pointer; transition: var(--transition-smooth);">
                    <i data-lucide="log-out" style="width: 16px; height: 16px;"></i>
                </button>
            </div>

            <!-- Theme Switcher -->
            <div class="sb-theme-bar no-print" id="sbThemeBar">
                <span class="sb-theme-label">Giao diện:</span>
                <div class="sb-theme-btns"></div>
            </div>
        </div>
    `;
}

const NAV_NOTIF_TYPE_MAP = {
    project_approved: { icon: 'check-circle',   cat: 'success' },
    project_rejected: { icon: 'x-circle',        cat: 'error'   },
    collab_invite:    { icon: 'user-plus',        cat: 'info'    },
    collab_responded: { icon: 'user-check',       cat: 'info'    },
    access_request:   { icon: 'key',              cat: 'warning' },
    access_approved:  { icon: 'unlock',           cat: 'success' },
    access_denied:    { icon: 'lock',             cat: 'error'   },
    contractor_draft_submitted: { icon: 'hard-hat', cat: 'warning' },
    contractor_draft_approved:  { icon: 'check-circle', cat: 'success' },
    contractor_draft_rejected:  { icon: 'x-circle', cat: 'error' },
    role_changed:     { icon: 'shield',           cat: 'info'    },
    system:           { icon: 'bell',             cat: 'info'    },
};

function escapeHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatNavNotifTime(ts) {
    if (!ts) return '';
    try {
        const diff = Date.now() - new Date(ts).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'Vừa xong';
        if (m < 60) return `${m} phút trước`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h} giờ trước`;
        return `${Math.floor(h / 24)} ngày trước`;
    } catch { return ts; }
}

function updateNavNotifBadge(count) {
    const badge = document.getElementById("notiBadgeCount");
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = "flex";
    } else {
        badge.style.display = "none";
    }
}

async function loadNavNotificationsFromServer() {
    const token = localStorage.getItem('anlaa_token');
    if (!token) return;
    try {
        const res = await fetch('/api/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        notifications = data.notifications || [];
        renderNotifications();
    } catch {}
}

function renderNotifications() {
    const list = document.getElementById("notiList");
    if (!list) return;

    const unreadCount = notifications.filter(n => !n.is_read).length;
    updateNavNotifBadge(unreadCount);

    if (notifications.length === 0) {
        list.innerHTML = `<div class="noti-empty">Không có thông báo mới</div>`;
        return;
    }

    list.innerHTML = notifications.map(n => {
        const tm = NAV_NOTIF_TYPE_MAP[n.type] || NAV_NOTIF_TYPE_MAP.system;
        return `
        <div class="noti-item ${!n.is_read ? "unread" : ""} cat-${tm.cat}" data-id="${n.id}">
            <div class="noti-item-icon"><i data-lucide="${tm.icon}"></i></div>
            <div class="noti-item-content">
                <span class="noti-item-title">${escapeHtml(n.title)}</span>
                <span class="noti-item-body">${escapeHtml(n.body)}</span>
                <span class="noti-item-time">${formatNavNotifTime(n.created_at)}</span>
            </div>
            ${!n.is_read ? `<span class="noti-item-unread-dot"></span>` : ""}
            <button class="noti-item-delete" data-id="${n.id}" title="Xóa">×</button>
        </div>`;
    }).join("");

    list.querySelectorAll(".noti-item").forEach(item => {
        item.addEventListener("click", async (e) => {
            if (e.target.closest(".noti-item-delete")) return;
            const id = parseInt(item.dataset.id);
            const n = notifications.find(x => x.id === id);
            if (n && !n.is_read) {
                n.is_read = 1;
                renderNotifications();
                try {
                    const token = localStorage.getItem('anlaa_token');
                    await fetch(`/api/notifications/${id}/read`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
                } catch {}
            }
        });
    });

    list.querySelectorAll(".noti-item-delete").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            notifications = notifications.filter(n => n.id !== id);
            renderNotifications();
            try {
                const token = localStorage.getItem('anlaa_token');
                await fetch(`/api/notifications/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            } catch {}
        });
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
}

function initNotifications() {
    const btn = document.getElementById("btnNotifications");
    if (!btn) return;

    let dropdown = document.getElementById("notiDropdown");
    if (!dropdown) {
        dropdown = document.createElement("div");
        dropdown.id = "notiDropdown";
        dropdown.className = "noti-dropdown no-print";
        dropdown.style.display = "none";
        dropdown.style.zIndex = "9999";
        dropdown.innerHTML = `
            <div class="noti-header">
                <h3>Thông báo</h3>
                <button id="btnNotiMarkAllRead" class="noti-mark-read-btn">Đọc tất cả</button>
            </div>
            <div id="notiList" class="noti-list" style="max-height: 280px; overflow-y: auto;">
                <div class="noti-empty">Đang tải...</div>
            </div>
            <div class="noti-footer">
                <button id="btnNotiClearAll" class="noti-clear-all-btn">Xóa tất cả</button>
                <button id="btnNotiClose" class="noti-close-btn">Đóng</button>
            </div>
        `;
        const container = document.getElementById('appContainer') || document.body;
        container.appendChild(dropdown);
    }

    const btnMarkAll = document.getElementById("btnNotiMarkAllRead");
    const btnClearAll = document.getElementById("btnNotiClearAll");
    const btnClose = document.getElementById("btnNotiClose");

    // Load from server
    loadNavNotificationsFromServer();

    // Toggle dropdown
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const show = dropdown.style.display === "none" || dropdown.style.display === "";
        dropdown.style.display = show ? "flex" : "none";
        if (show) {
            const rect = btn.getBoundingClientRect();
            dropdown.style.position = "fixed";
            if (window.innerWidth <= 1200) {
                dropdown.style.bottom = "60px";
                dropdown.style.left = "16px";
                dropdown.style.width = "calc(100vw - 32px)";
            } else {
                dropdown.style.left = Math.max(10, rect.left - 150) + "px";
                dropdown.style.bottom = (window.innerHeight - rect.top + 8) + "px";
                dropdown.style.width = "340px";
            }
            dropdown.style.top = "auto";
            dropdown.style.right = "auto";
            loadNavNotificationsFromServer();
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".noti-container") && !e.target.closest(".noti-dropdown")) {
            dropdown.style.display = "none";
        }
    });

    btnMarkAll?.addEventListener("click", async () => {
        try {
            const token = localStorage.getItem('anlaa_token');
            await fetch('/api/notifications/read-all', { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
            notifications.forEach(n => { n.is_read = 1; });
            renderNotifications();
        } catch {}
    });

    btnClearAll?.addEventListener("click", async () => {
        if (confirm("Xóa toàn bộ thông báo?")) {
            try {
                const token = localStorage.getItem('anlaa_token');
                await fetch('/api/notifications', { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                notifications = [];
                renderNotifications();
            } catch {}
        }
    });

    btnClose?.addEventListener("click", () => { dropdown.style.display = "none"; });

    // Real-time: listen on Socket.IO if available (pages that load socket.io.js)
    if (typeof io !== 'undefined') {
        try {
            const _s = io({ auth: { token: localStorage.getItem('anlaa_token') }, transports: ['websocket', 'polling'] });
            _s.on('notification:new', (notif) => {
                if (!notif) return;
                notifications.unshift({ ...notif, meta: notif.meta || {} });
                if (notifications.length > 50) notifications.pop();
                renderNotifications();
            });
            _s.on('notification:unread_count', ({ count }) => updateNavNotifBadge(count));
        } catch {}
    }

    renderNotifications();
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function initAppSidebar({ activePage = '' } = {}) {
    const sidebar = document.getElementById('appSidebar');
    if (!sidebar) return;

    // Render HTML inside the appSidebar aside element
    sidebar.innerHTML = renderSidebarHTML(activePage);

    // Make sure overlay exists, if not create and append to appContainer
    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.className = 'sidebar-overlay';
        const appContainer = document.getElementById('appContainer');
        if (appContainer) {
            appContainer.appendChild(overlay);
        } else {
            document.body.appendChild(overlay);
        }
    }

    // Dynamic inject absolute dropdown outside the sidebar to prevent scroll limits
    let dropdown = document.getElementById('notiDropdown');
    if (!dropdown) {
        dropdown = document.createElement("div");
        dropdown.id = "notiDropdown";
        dropdown.className = "noti-dropdown no-print";
        dropdown.style.display = "none";
        dropdown.style.zIndex = "9999";
        dropdown.innerHTML = `
            <div class="noti-header">
                <h3>Thông báo</h3>
                <button id="btnNotiMarkAllRead" class="noti-mark-read-btn">Đọc tất cả</button>
            </div>
            <div id="notiList" class="noti-list" style="max-height: 280px; overflow-y: auto;">
                <div class="noti-empty">Không có thông báo mới</div>
            </div>
            <div class="noti-footer">
                <button id="btnNotiClearAll" class="noti-clear-all-btn">Xóa tất cả</button>
                <button id="btnNotiClose" class="noti-close-btn">Đóng</button>
            </div>
        `;
        const container = document.getElementById('appContainer') || document.body;
        container.appendChild(dropdown);
    }

    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Initialize Theme Switcher
    if (typeof initThemeSwitcher === 'function') {
        initThemeSwitcher();
    }

    // Initialize Notification System
    initNotifications();

    // Register mobile off-canvas toggle events
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');

    const closeSidebar = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    };

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });
    }

    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Auto-close sidebar on mobile when a nav item is clicked
    const navItems = sidebar.querySelectorAll('.sb-nav .tab-btn, .sb-nav a');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 1200) {
                closeSidebar();
            }
        });
    });

    // Register logout click event
    const logoutBtn = document.getElementById('sidebarLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

window.initAppSidebar = initAppSidebar;
