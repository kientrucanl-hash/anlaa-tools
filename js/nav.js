/**
 * Shared top navigation bar for secondary pages (history, settings, help).
 * Call initNav({ activePage }) after DOMContentLoaded.
 * Requires: api.js, auth.js loaded before this file.
 */

const NAV_PAGES = [
    { id: 'calculator', label: 'Bóc KL Vật tư', icon: 'calculator', href: 'index.html' },
    { id: 'history',    label: 'Lịch sử Dự toán', icon: 'clock',      href: 'history.html' },
    { id: 'settings',   label: 'Cài đặt',          icon: 'settings',   href: 'settings.html' },
];

function renderSharedNav(activePage) {
    const user = getCurrentUser();
    const isAdmin = user && user.role === 'admin';

    const links = NAV_PAGES.map(p => {
        const isActive = p.id === activePage;
        return `<a href="${p.href}" class="snav-link${isActive ? ' active' : ''}">
            <i data-lucide="${p.icon}"></i>
            <span>${p.label}</span>
        </a>`;
    }).join('');

    const adminLink = isAdmin
        ? `<a href="admin.html" class="snav-link snav-admin"><i data-lucide="shield-check"></i><span>Quản lý</span></a>`
        : '';

    const userName = user ? `${isAdmin ? '⚡ ' : ''}${user.username}` : '';

    const nav = document.createElement('nav');
    nav.className = 'shared-nav no-print';
    nav.innerHTML = `
        <div class="snav-brand">
            <img src="logo-tool-anlc.webp" alt="ANLAA" class="snav-logo">
            <span class="snav-title">Dự toán ANLAA</span>
        </div>
        <div class="snav-links">
            ${links}
            ${adminLink}
        </div>
        <div class="snav-right">
            <span class="snav-user">${userName}</span>
            <button id="sharedLogoutBtn" class="btn btn-secondary btn-sm">
                <i data-lucide="log-out"></i>
            </button>
        </div>
    `;

    return nav;
}

function initNav({ activePage = '' } = {}) {
    const placeholder = document.getElementById('sharedNavPlaceholder');
    if (!placeholder) return;

    const nav = renderSharedNav(activePage);
    placeholder.replaceWith(nav);

    if (typeof lucide !== 'undefined') lucide.createIcons();

    const logoutBtn = document.getElementById('sharedLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
}

window.initNav = initNav;
