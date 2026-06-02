// Socket.io event payload types

export interface PresenceJoinedPayload {
  userId: number
  username: string
}

export interface PresenceListPayload {
  userId: number
  username: string
}

export interface CursorUpdatePayload {
  userId: number
  username: string
  itemId?: string
  rowIdx?: number
}

export interface ProjectRemoteChangePayload {
  userId: number
  username: string
  patch: unknown
}

export interface UniverCellChangePayload {
  projectId: number
  row: number
  col: number
  value: unknown
}

export interface UniverRemoteCellPayload {
  userId: number
  username: string
  row: number
  col: number
  value: unknown
}

export interface UniverCursorPayload {
  projectId: number
  row: number
  col: number
}

export interface UniverRemoteCursorPayload {
  userId: number
  username: string
  row: number
  col: number
}

export interface UniverSnapshotSavePayload {
  projectId: number
  snapshot: string
}

export type ServerToClientEvents = {
  'presence:joined': (p: PresenceJoinedPayload) => void
  'presence:left': (p: PresenceJoinedPayload) => void
  'presence:list': (list: PresenceListPayload[]) => void
  'cursor:update': (p: CursorUpdatePayload) => void
  'project:remote_change': (p: ProjectRemoteChangePayload) => void
  'project:error': (p: { error: string; projectId?: number }) => void
  'univer:remote_cell': (p: UniverRemoteCellPayload) => void
  'univer:remote_cursor': (p: UniverRemoteCursorPayload) => void
  'univer:snapshot_ack': (p: { projectId: number }) => void
  'notification:unread_count': (p: { count: number }) => void
}

export type ClientToServerEvents = {
  'project:join': (p: { projectId: number }) => void
  'project:leave': (p: { projectId: number }) => void
  'cursor:move': (p: { projectId: number; itemId?: string; rowIdx?: number }) => void
  'project:changed': (p: { projectId: number; patch: unknown }) => void
  'univer:cell_change': (p: UniverCellChangePayload) => void
  'univer:cursor': (p: UniverCursorPayload) => void
  'univer:snapshot_save': (p: UniverSnapshotSavePayload) => void
}
