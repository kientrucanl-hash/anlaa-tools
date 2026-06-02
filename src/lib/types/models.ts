// Domain model types — mirroring Prisma schema

export type Role = 'USER' | 'ADMIN'
export type ProjectStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'
export type CollabRole = 'EDITOR' | 'VIEWER'
export type CollabStatus = 'PENDING' | 'ACCEPTED' | 'DENIED'
export type ContractorType = 'TEAM' | 'COMPANY' | 'INDIVIDUAL'
export type ContractorStatus = 'ACTIVE' | 'INACTIVE' | 'BLACKLIST'
export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'DENIED'
export type NotifType =
  | 'COLLAB_INVITE'
  | 'COLLAB_RESPONDED'
  | 'ACCESS_REQUEST'
  | 'ACCESS_APPROVED'
  | 'ACCESS_DENIED'
  | 'PROJECT_APPROVED'
  | 'PROJECT_REJECTED'
  | 'ROLE_CHANGED'
  | 'SYSTEM'

export interface User {
  id: number
  username: string
  role: Role
  maxSessions: number
  createdAt: string
}

export interface Project {
  id: number
  userId: number
  name: string
  address: string
  data: ConstructionItem[]
  status: ProjectStatus
  adminNote?: string | null
  estimateSnapshot?: string | null
  createdAt: string
  updatedAt: string
  // joined
  username?: string
  collabRole?: CollabRole
}

export interface ConstructionItem {
  id: string
  type: 'wall' | 'plaster' | 'screed' | 'tile' | 'section' | 'note'
  name?: string
  inputs?: Record<string, unknown>
  results?: Record<string, unknown>
}

export interface ProjectCollaborator {
  id: number
  projectId: number
  ownerId: number
  inviteeId: number
  role: CollabRole
  status: CollabStatus
  createdAt: string
  invitee?: { id: number; username: string }
}

export interface Contractor {
  id: number
  type: ContractorType
  name: string
  contactName?: string | null
  phone?: string | null
  phone2?: string | null
  email?: string | null
  address?: string | null
  district?: string | null
  city: string
  specialty?: string[] | null
  workScope?: string | null
  taxCode?: string | null
  bankAccount?: string | null
  bankName?: string | null
  rating: number
  ratingNote?: string | null
  projectCount: number
  totalValue: number
  lastProjectAt?: string | null
  priceNotes?: Record<string, unknown> | null
  status: ContractorStatus
  note?: string | null
  createdById?: number | null
  createdAt: string
  updatedAt: string
}

export interface ContractorDraft {
  id: number
  contractorId?: number | null
  submittedBy: number
  reviewedBy?: number | null
  payload: Record<string, unknown>
  status: ProjectStatus
  adminNote?: string | null
  createdAt: string
  updatedAt: string
  submittedAt?: string | null
  reviewedAt?: string | null
  submitterUsername?: string
}

export interface Quotation {
  id: number
  userId: number
  name: string
  contractors: string[]
  rows: QuotationRow[]
  status: ProjectStatus
  adminNote?: string | null
  createdAt: string
  updatedAt: string
}

export interface QuotationRow {
  id: string
  description: string
  unit: string
  qty: number
  prices: (number | null)[]
  note?: string
}

export interface Notification {
  id: number
  userId: number
  type: NotifType
  title: string
  body: string
  link?: string | null
  meta: Record<string, unknown>
  isRead: boolean
  createdAt: string
}

export interface EstimateTemplate {
  id: number
  name: string
  category: string
  description?: string | null
  snapshot?: unknown
  isActive: boolean
  createdById?: number | null
  createdAt: string
  updatedAt: string
}
