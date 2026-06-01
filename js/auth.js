/**
 * Authentication module for Dự toán ANLAA
 * Handles login overlay, session check, logout, and theme switching
 */

// ── localStorage cleanup — remove stale keys from old app versions ────────────
(function purgeStaleCache() {
    const staleKeys = [
        'anlaa_work_prices_v1', 'anlaa_prices_cache', 'anlaa_defaults',
        'anlaa_ui_state', 'anlaa_sidebar_state', 'anlaa_boq_cache',
    ];
    staleKeys.forEach(k => { if (localStorage.getItem(k) !== null) localStorage.removeItem(k); });
})();

// ── Theme System ──────────────────────────────────────────────────────────────
const THEME_KEY = 'anlaa_theme';
const THEMES = [
    { id: 'dark',  label: 'Tối',     icon: 'moon'  },
    { id: 'light', label: 'Sáng',    icon: 'sun'   },
    { id: 'hc',    label: 'Nét cao', icon: 'contrast' },
];

function applyTheme(id) {
    document.documentElement.setAttribute('data-theme', id);
    localStorage.setItem(THEME_KEY, id);
    // Sync all active buttons across any rendered sidebars
    document.querySelectorAll('.sb-theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === id);
    });
}

function initThemeSwitcher() {
    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(saved);

    const bar = document.getElementById('sbThemeBar');
    if (!bar) return;

    const btns = bar.querySelector('.sb-theme-btns');
    if (!btns) return;

    THEMES.forEach(({ id, label, icon }) => {
        const btn = document.createElement('button');
        btn.className = 'sb-theme-btn' + (id === saved ? ' active' : '');
        btn.dataset.theme = id;
        btn.title = label;
        btn.innerHTML = `<i data-lucide="${icon}"></i><span>${label}</span>`;
        btn.addEventListener('click', () => {
            applyTheme(id);
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
        btns.appendChild(btn);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function getCurrentUser() {
    const raw = localStorage.getItem('anlaa_user');
    return raw ? JSON.parse(raw) : null;
}

function saveSession(token, user) {
    localStorage.setItem('anlaa_token', token);
    localStorage.setItem('anlaa_user', JSON.stringify(user));
}

function clearSession() {
    localStorage.removeItem('anlaa_token');
    localStorage.removeItem('anlaa_user');
}

function showLoginOverlay() {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

function hideLoginOverlay(user) {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    updateUserBadge(user);
}

function updateUserBadge(user) {
    const badge = document.getElementById('userBadge');
    if (badge) {
        badge.textContent = `${user.role === 'admin' ? '⚡ ' : ''}${user.username}`;
        badge.title = `Role: ${user.role}`;
    }
    const adminBtn = document.getElementById('adminPanelBtn');
    if (adminBtn && user.role === 'admin') {
        adminBtn.style.display = '';
    }
    const adminNavBtn = document.getElementById('adminNavBtn');
    if (adminNavBtn && user.role === 'admin') {
        adminNavBtn.style.display = '';
    }
    
    // Update Sidebar User Profile Card mini
    const sidebarUserName = document.getElementById('sidebarUserName');
    if (sidebarUserName) {
        sidebarUserName.textContent = `${user.role === 'admin' ? '⚡ ' : ''}${user.username}`;
    }
    const sidebarUserRole = document.querySelector('.sb-user-role');
    if (sidebarUserRole) {
        sidebarUserRole.textContent = user.role === 'admin' ? 'Quản trị viên' : 'KTS / Người dự toán';
    }
}

async function initAuth() {
    const token = localStorage.getItem('anlaa_token');
    const user = getCurrentUser();

    if (!token || !user) {
        showLoginOverlay();
        return false;
    }

    // Verify token still valid
    try {
        await API.me();
        hideLoginOverlay(user);
        return true;
    } catch {
        clearSession();
        showLoginOverlay();
        return false;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Đang đăng nhập...';

    try {
        const { token, user } = await API.login(username, password);
        saveSession(token, user);

        hideLoginOverlay(user);
        if (typeof loadProjectsFromAPI === 'function') {
            await loadProjectsFromAPI();
        }
    } catch (err) {
        errorEl.textContent = err.message;
        btn.disabled = false;
        btn.textContent = 'Đăng nhập';
    }
}

async function handleLogout() {
    try {
        await API.logout();
    } catch {
        // Best-effort: still clear local session even if server call fails
    }
    clearSession();
    window.location.reload();
}

document.addEventListener('DOMContentLoaded', async () => {
    // Apply saved theme immediately before any rendering
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    initThemeSwitcher();

    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
    if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', handleLogout);

    // Show password toggle
    const togglePwd = document.getElementById('togglePassword');
    const pwdInput = document.getElementById('loginPassword');
    if (togglePwd && pwdInput) {
        togglePwd.addEventListener('click', () => {
            pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
            togglePwd.textContent = pwdInput.type === 'password' ? '👁' : '🙈';
        });
    }

    await initAuth();

    // Show kicked message if user was force-logged out
    const kickedMsg = sessionStorage.getItem('anlaa_kicked_msg');
    if (kickedMsg) {
        sessionStorage.removeItem('anlaa_kicked_msg');
        const errorEl = document.getElementById('loginError');
        if (errorEl) {
            errorEl.textContent = 'Tài khoản đã đăng nhập ở thiết bị khác. ' + kickedMsg;
            errorEl.style.color = 'var(--color-warning, #f6ad55)';
        }
    }
});
