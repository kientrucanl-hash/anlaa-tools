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
        localStorage.removeItem('anlaa_token');
        localStorage.removeItem('anlaa_user');
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

    getUsers: () => apiFetch('/projects/meta/users'),
};

window.API = API;
