/**
 * Authentication module for Dự toán ANLAA
 * Handles login overlay, session check, and logout
 */

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
    
    // Update Sidebar User Profile Card mini
    const sidebarUserName = document.getElementById('sidebarUserName');
    if (sidebarUserName) {
        sidebarUserName.textContent = `${user.role === 'admin' ? '⚡ ' : ''}${user.username}`;
    }
    const sidebarUserRole = document.querySelector('.sidebar-user-card .user-role');
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

function handleLogout() {
    clearSession();
    window.location.reload();
}

document.addEventListener('DOMContentLoaded', async () => {
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
});
