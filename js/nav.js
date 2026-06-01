/**
 * Shared App Sidebar Navigation for all MECALC pages (Unified Dashboard Layout).
 * Call initAppSidebar({ activePage }) after DOMContentLoaded.
 * Requires: api.js, auth.js, and lucide icons library loaded.
 */

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
                    <div class="sb-nav-separator"></div>
                    ${getNavLink('history', 'Lịch sử Dự toán', 'clock', 'history.html')}
                    ${getNavLink('settings', 'Cài đặt Tài khoản', 'settings', 'settings.html')}
                    ${getNavLink('help', 'Hướng dẫn sử dụng', 'book-open', 'help.html')}
                    ${adminLink}
                </nav>
            </div>

        </div>

        <!-- FOOTER: user + actions -->
        <div class="sb-footer">
            <!-- User card -->
            <div class="sb-user-row">
                <div class="sb-user-avatar">
                    <i data-lucide="user"></i>
                    <span class="sb-user-dot"></span>
                </div>
                <div class="sb-user-info">
                    <span id="sidebarUserName" class="sb-user-name">${userName}</span>
                    <span class="sb-user-role">${userRole}</span>
                </div>
                <button id="sidebarLogoutBtn" class="sb-icon-btn sb-logout-btn" title="Đăng xuất">
                    <i data-lucide="log-out"></i>
                </button>
            </div>
        </div>
    `;
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

    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

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
