'use client'

import { useAuth } from '@/lib/hooks/useAuth'

const BASE = '/api'

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Get token from Zustand store (cookie is set but also kept in store for non-middleware calls)
  const token = useAuth.getState().token

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    useAuth.getState().clearAuth()
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

// Projects
export const projectsApi = {
  list: () => apiFetch<unknown[]>('/projects'),
  get: (id: number) => apiFetch<unknown>(`/projects/${id}`),
  create: (data: { name: string; address?: string }) =>
    apiFetch<unknown>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) =>
    apiFetch<unknown>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    apiFetch<unknown>(`/projects/${id}`, { method: 'DELETE' }),
  submit: (id: number) =>
    apiFetch<unknown>(`/projects/${id}/submit`, { method: 'PUT' }),
  approve: (id: number) =>
    apiFetch<unknown>(`/projects/${id}/approve`, { method: 'PUT' }),
  reject: (id: number, note: string) =>
    apiFetch<unknown>(`/projects/${id}/reject`, { method: 'PUT', body: JSON.stringify({ note }) }),
  getSnapshot: (id: number) =>
    apiFetch<{ snapshot: string | null }>(`/projects/${id}/snapshot`),
  saveSnapshot: (id: number, snapshot: string) =>
    apiFetch<unknown>(`/projects/${id}/snapshot`, { method: 'PUT', body: JSON.stringify({ snapshot }) }),
}

// Auth
export const authApi = {
  me: () => apiFetch<unknown>('/auth/me'),
  logout: () => apiFetch<unknown>('/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<unknown>('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),
}

// Notifications
export const notificationsApi = {
  list: () => apiFetch<{ notifications: unknown[]; unread: number }>('/notifications'),
  markRead: (id: number) => apiFetch<unknown>(`/notifications/${id}`, { method: 'PUT' }),
  markAllRead: () => apiFetch<unknown>('/notifications/read-all', { method: 'PUT' }),
  delete: (id: number) => apiFetch<unknown>(`/notifications/${id}`, { method: 'DELETE' }),
  deleteAll: () => apiFetch<unknown>('/notifications', { method: 'DELETE' }),
}

// Users (admin)
export const usersApi = {
  list: () => apiFetch<unknown[]>('/users'),
  create: (data: { username: string; password: string; role?: string }) =>
    apiFetch<unknown>('/users', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<unknown>(`/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id: number, newPassword: string) =>
    apiFetch<unknown>(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ newPassword }) }),
  changeRole: (id: number, role: string) =>
    apiFetch<unknown>(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
}

// Estimate templates
export const estimateTemplatesApi = {
  list: () => apiFetch<unknown[]>('/estimate-templates'),
  get: (id: number) => apiFetch<unknown>(`/estimate-templates/${id}`),
}

export { apiFetch }
