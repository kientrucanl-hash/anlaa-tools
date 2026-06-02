'use client'

import { useEffect, useCallback } from 'react'
import { useSocket } from '@/components/providers/SocketProvider'
import type {
  PresenceJoinedPayload,
  CursorUpdatePayload,
  ProjectRemoteChangePayload,
  UniverRemoteCellPayload,
  UniverRemoteCursorPayload,
} from '@/lib/types/socket'

interface UseCollabOptions {
  projectId: number | null
  onPresenceJoined?: (p: PresenceJoinedPayload) => void
  onPresenceLeft?: (p: PresenceJoinedPayload) => void
  onCursorUpdate?: (p: CursorUpdatePayload) => void
  onRemoteChange?: (p: ProjectRemoteChangePayload) => void
  onRemoteCell?: (p: UniverRemoteCellPayload) => void
  onRemoteCursor?: (p: UniverRemoteCursorPayload) => void
  onUnreadCount?: (count: number) => void
}

export function useCollab({
  projectId,
  onPresenceJoined,
  onPresenceLeft,
  onCursorUpdate,
  onRemoteChange,
  onRemoteCell,
  onRemoteCursor,
  onUnreadCount,
}: UseCollabOptions) {
  const { socket } = useSocket()

  // Join / leave project room
  useEffect(() => {
    if (!socket || !projectId) return
    socket.emit('project:join', { projectId })
    return () => { socket.emit('project:leave', { projectId }) }
  }, [socket, projectId])

  // Register event listeners
  useEffect(() => {
    if (!socket) return
    if (onPresenceJoined) socket.on('presence:joined', onPresenceJoined)
    if (onPresenceLeft)   socket.on('presence:left', onPresenceLeft)
    if (onCursorUpdate)   socket.on('cursor:update', onCursorUpdate)
    if (onRemoteChange)   socket.on('project:remote_change', onRemoteChange)
    if (onRemoteCell)     socket.on('univer:remote_cell', onRemoteCell)
    if (onRemoteCursor)   socket.on('univer:remote_cursor', onRemoteCursor)
    if (onUnreadCount)    socket.on('notification:unread_count', ({ count }) => onUnreadCount(count))

    return () => {
      socket.off('presence:joined')
      socket.off('presence:left')
      socket.off('cursor:update')
      socket.off('project:remote_change')
      socket.off('univer:remote_cell')
      socket.off('univer:remote_cursor')
      socket.off('notification:unread_count')
    }
  }, [socket, onPresenceJoined, onPresenceLeft, onCursorUpdate, onRemoteChange, onRemoteCell, onRemoteCursor, onUnreadCount])

  // Emit helpers
  const emitCursorMove = useCallback(
    (itemId?: string, rowIdx?: number) => {
      if (!socket || !projectId) return
      socket.emit('cursor:move', { projectId, itemId, rowIdx })
    },
    [socket, projectId]
  )

  const emitProjectChanged = useCallback(
    (patch: unknown) => {
      if (!socket || !projectId) return
      socket.emit('project:changed', { projectId, patch })
    },
    [socket, projectId]
  )

  const emitCellChange = useCallback(
    (row: number, col: number, value: unknown) => {
      if (!socket || !projectId) return
      socket.emit('univer:cell_change', { projectId, row, col, value })
    },
    [socket, projectId]
  )

  const emitCursor = useCallback(
    (row: number, col: number) => {
      if (!socket || !projectId) return
      socket.emit('univer:cursor', { projectId, row, col })
    },
    [socket, projectId]
  )

  const emitSnapshotSave = useCallback(
    (snapshot: string) => {
      if (!socket || !projectId) return
      socket.emit('univer:snapshot_save', { projectId, snapshot })
    },
    [socket, projectId]
  )

  return { emitCursorMove, emitProjectChanged, emitCellChange, emitCursor, emitSnapshotSave }
}
