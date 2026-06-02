// API request/response shape types

export interface ApiError {
  error: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: number
    username: string
    role: 'USER' | 'ADMIN'
  }
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface CreateProjectRequest {
  name: string
  address?: string
  data?: unknown[]
}

export interface UpdateProjectRequest {
  name?: string
  address?: string
  data?: unknown[]
}

export interface SaveSnapshotRequest {
  snapshot: string
}

export interface CreateQuotationRequest {
  name: string
  contractors?: string[]
  rows?: unknown[]
}

export interface CollabInviteRequest {
  inviteeId: number
  role: 'EDITOR' | 'VIEWER'
}

export interface AccessRequestPayload {
  projectId: number
  roleRequested: 'EDITOR' | 'VIEWER'
  message?: string
}
