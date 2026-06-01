/**
 * API Client for Dự toán ANLAA — wraps fetch with JWT auth header
 */

const API_BASE = '/api';

function getToken() {
    return localStorage.getItem('anlaa_token');
}

function authHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { ...authHeaders(), ...(options.headers || {}) }
    });

    if (res.status === 401) {
        const body401 = await res.json().catch(() => ({}));
        localStorage.removeItem('anlaa_token');
        localStorage.removeItem('anlaa_user');
        // Show reason before redirect so user understands why they were kicked
        const msg = body401.error || '';
        if (msg.includes('thu hồi')) {
            sessionStorage.setItem('anlaa_kicked_msg', msg);
        }
        window.location.href = '/';
        return;
    }

    const body = await res.json();
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    return body;
}

const API = {
    // Auth
    login: (username, password) =>
        apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

    me: () => apiFetch('/auth/me'),

    logout: () => apiFetch('/auth/logout', { method: 'POST' }),

    changePassword: (currentPassword, newPassword) =>
        apiFetch('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),

    // Projects
    getProjects: () => apiFetch('/projects'),

    getProject: (id) => apiFetch(`/projects/${id}`),

    createProject: (name, address, data) =>
        apiFetch('/projects', { method: 'POST', body: JSON.stringify({ name, address, data }) }),

    updateProject: (id, name, address, data) =>
        apiFetch(`/projects/${id}`, { method: 'PUT', body: JSON.stringify({ name, address, data }) }),

    submitProject: (id) =>
        apiFetch(`/projects/${id}/submit`, { method: 'PUT' }),

    approveProject: (id) =>
        apiFetch(`/projects/${id}/approve`, { method: 'PUT' }),

    rejectProject: (id, note) =>
        apiFetch(`/projects/${id}/reject`, { method: 'PUT', body: JSON.stringify({ note }) }),

    deleteProject: (id) =>
        apiFetch(`/projects/${id}`, { method: 'DELETE' }),

    // Quotations
    getQuotations: () => apiFetch('/quotations'),

    getQuotation: (id) => apiFetch(`/quotations/${id}`),

    createQuotation: (name, contractors, rows) =>
        apiFetch('/quotations', { method: 'POST', body: JSON.stringify({ name, contractors, rows }) }),

    updateQuotation: (id, data) =>
        apiFetch(`/quotations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    submitQuotation: (id) =>
        apiFetch(`/quotations/${id}/submit`, { method: 'PUT' }),

    approveQuotation: (id) =>
        apiFetch(`/quotations/${id}/approve`, { method: 'PUT' }),

    rejectQuotation: (id, note) =>
        apiFetch(`/quotations/${id}/reject`, { method: 'PUT', body: JSON.stringify({ note }) }),

    deleteQuotation: (id) =>
        apiFetch(`/quotations/${id}`, { method: 'DELETE' }),

    // Users (admin only)
    getUsers: () => apiFetch('/users'),

    createUser: (username, password, role) =>
        apiFetch('/users', { method: 'POST', body: JSON.stringify({ username, password, role }) }),

    resetUserPassword: (id, newPassword) =>
        apiFetch(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ newPassword }) }),

    changeUserRole: (id, role) =>
        apiFetch(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),

    deleteUser: (id) =>
        apiFetch(`/users/${id}`, { method: 'DELETE' }),

    setMaxSessions: (id, max_sessions) =>
        apiFetch(`/users/${id}/max-sessions`, { method: 'PUT', body: JSON.stringify({ max_sessions }) }),

    getUserSessions: (id) => apiFetch(`/users/${id}/sessions`),

    revokeAllSessions: (id) =>
        apiFetch(`/users/${id}/sessions`, { method: 'DELETE' }),

    revokeSession: (sessionId) =>
        apiFetch(`/users/sessions/${sessionId}`, { method: 'DELETE' }),
};

window.API = API;
