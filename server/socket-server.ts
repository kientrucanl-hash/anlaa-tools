import 'dotenv/config'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { createLogger, format, transports } from 'winston'

// ── Env validation ─────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set and at least 32 characters. Socket server will not start.')
  process.exit(1)
}

const PORT = parseInt(process.env.SOCKET_PORT ?? '4000', 10)

// ── Logger ─────────────────────────────────────────────────────────────────

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console({ format: format.combine(format.colorize(), format.simple()) }),
  ],
})

// ── Prisma ─────────────────────────────────────────────────────────────────

const prisma = new PrismaClient({ log: ['error'] })

// ── Types ──────────────────────────────────────────────────────────────────

interface AuthedUser {
  id: number
  username: string
  role: string
  sid: string
}

interface AuthedSocket extends Socket {
  user: AuthedUser
}

// ── HTTP + Socket.io ──────────────────────────────────────────────────────

const httpServer = createServer((req, res) => {
  // Health check endpoint for Docker/Nginx
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', uptime: Math.floor(process.uptime()) }))
    return
  }
  res.writeHead(404)
  res.end()
})
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
})

// ── Auth middleware ────────────────────────────────────────────────────────

io.use(async (socket, next) => {
  const token =
    (socket.handshake.auth as Record<string, string>)?.token ??
    (socket.handshake.query as Record<string, string>)?.token

  if (!token) return next(new Error('Authentication required'))

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      id: number; username: string; role: string; sid: string
    }
    if (!payload.sid) return next(new Error('Invalid session'))

    const session = await prisma.session.findUnique({
      where: { sessionToken: payload.sid },
    })
    if (!session || session.userId !== payload.id) return next(new Error('Session revoked'))

    const user = await prisma.user.findUnique({ where: { id: payload.id } })
    if (!user) return next(new Error('User not found'))

    await prisma.session.update({
      where: { sessionToken: payload.sid },
      data: { lastSeen: new Date() },
    })

    ;(socket as AuthedSocket).user = {
      id: user.id,
      username: user.username,
      role: user.role.toLowerCase(),
      sid: payload.sid,
    }
    next()
  } catch {
    next(new Error('Invalid token'))
  }
})

// ── Helpers ────────────────────────────────────────────────────────────────

function parseId(value: unknown): number | null {
  const id = Number.parseInt(String(value), 10)
  return Number.isInteger(id) && id > 0 ? id : null
}

async function getProjectRole(
  projectId: number,
  user: AuthedUser,
  allowViewer = true
): Promise<'owner' | 'editor' | 'viewer' | null> {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return null

  if (user.role === 'admin' || project.userId === user.id) return 'owner'

  const collab = await prisma.projectCollaborator.findUnique({
    where: { projectId_inviteeId: { projectId, inviteeId: user.id } },
  })
  if (collab?.status === 'ACCEPTED') {
    const role = collab.role.toLowerCase() as 'editor' | 'viewer'
    if (!allowViewer && role === 'viewer') return null
    return role
  }
  return null
}

// ── Connection handler ─────────────────────────────────────────────────────

io.on('connection', (rawSocket) => {
  const socket = rawSocket as AuthedSocket
  const user = socket.user

  logger.info(`[Socket] Connected: ${user.username} (${socket.id})`)

  // Per-connection snapshot rate-limit map
  const snapshotLastSave: Record<string, number> = {}

  // Join personal notification room
  socket.join(`user:${user.id}`)

  // Send unread notification count immediately
  prisma.notification
    .count({ where: { userId: user.id, isRead: false } })
    .then((count: number) => { if (count > 0) socket.emit('notification:unread_count', { count }) })
    .catch(() => {})

  // ── project:join ─────────────────────────────────────────────────────────

  socket.on('project:join', async ({ projectId }: { projectId: unknown }) => {
    const id = parseId(projectId)
    if (!id) return socket.emit('project:error', { error: 'invalid_project_id' })

    const role = await getProjectRole(id, user)
    if (!role) return socket.emit('project:error', { error: 'access_denied', projectId: id })

    socket.join(`project:${id}`)
    socket.to(`project:${id}`).emit('presence:joined', { userId: user.id, username: user.username })

    // Build presence list from current room members
    const room = io.sockets.adapter.rooms.get(`project:${id}`)
    const presenceList: { userId: number; username: string }[] = []
    if (room) {
      room.forEach((sid) => {
        const s = io.sockets.sockets.get(sid) as AuthedSocket | undefined
        if (s?.user && s.id !== socket.id) {
          presenceList.push({ userId: s.user.id, username: s.user.username })
        }
      })
    }
    socket.emit('presence:list', presenceList)
    socket.data.currentProject = id
  })

  // ── project:leave ─────────────────────────────────────────────────────────

  socket.on('project:leave', ({ projectId }: { projectId: unknown }) => {
    const id = parseId(projectId)
    if (!id) return
    socket.leave(`project:${id}`)
    socket.to(`project:${id}`).emit('presence:left', { userId: user.id, username: user.username })
    if (socket.data.currentProject === id) socket.data.currentProject = null
  })

  // ── cursor:move ───────────────────────────────────────────────────────────

  socket.on('cursor:move', async ({ projectId, itemId, rowIdx }: {
    projectId: unknown; itemId?: string; rowIdx?: number
  }) => {
    const id = parseId(projectId)
    if (!id) return
    const role = await getProjectRole(id, user)
    if (!role) return
    socket.to(`project:${id}`).emit('cursor:update', {
      userId: user.id, username: user.username, itemId, rowIdx,
    })
  })

  // ── project:changed ───────────────────────────────────────────────────────

  socket.on('project:changed', async ({ projectId, patch }: {
    projectId: unknown; patch: unknown
  }) => {
    const id = parseId(projectId)
    if (!id) return
    const role = await getProjectRole(id, user, false)
    if (!role) return
    socket.to(`project:${id}`).emit('project:remote_change', {
      userId: user.id, username: user.username, patch,
    })
  })

  // ── univer:cell_change ────────────────────────────────────────────────────

  socket.on('univer:cell_change', async (data: {
    projectId: unknown; row: number; col: number; value: unknown
  }) => {
    const id = parseId(data?.projectId)
    if (!id) return
    const role = await getProjectRole(id, user, false)
    if (!role) return
    socket.to(`project:${id}`).emit('univer:remote_cell', {
      userId: user.id, username: user.username,
      row: data.row, col: data.col, value: data.value,
    })
  })

  // ── univer:cursor ─────────────────────────────────────────────────────────

  socket.on('univer:cursor', async (data: {
    projectId: unknown; row: number; col: number
  }) => {
    const id = parseId(data?.projectId)
    if (!id) return
    const role = await getProjectRole(id, user)
    if (!role) return
    socket.to(`project:${id}`).emit('univer:remote_cursor', {
      userId: user.id, username: user.username,
      row: data.row, col: data.col,
    })
  })

  // ── univer:snapshot_save (rate-limited: 1 write / 15s per user:project) ──

  socket.on('univer:snapshot_save', async (data: {
    projectId: unknown; snapshot: unknown
  }) => {
    const id = parseId(data?.projectId)
    if (!id) return
    const role = await getProjectRole(id, user, false)
    if (!role) return
    if (!data.snapshot || typeof data.snapshot !== 'string') return
    if (data.snapshot.length > 2_000_000) return

    const now = Date.now()
    const key = `${user.id}:${id}`
    if (snapshotLastSave[key] && now - snapshotLastSave[key] < 15_000) return
    snapshotLastSave[key] = now

    try {
      await prisma.project.update({
        where: { id },
        data: { estimateSnapshot: data.snapshot },
      })
      socket.emit('univer:snapshot_ack', { projectId: id })
    } catch (e) {
      logger.warn('[Socket] univer:snapshot_save failed', {
        error: (e as Error).message,
      })
    }
  })

  // ── disconnect ────────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    logger.info(`[Socket] Disconnected: ${user.username}`)
    const projectId = socket.data.currentProject as number | undefined
    if (projectId) {
      socket.to(`project:${projectId}`).emit('presence:left', {
        userId: user.id, username: user.username,
      })
    }
  })
})

// ── Start ──────────────────────────────────────────────────────────────────

httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info(`Socket.io server running on port ${PORT}`)
})

// ── Graceful shutdown ──────────────────────────────────────────────────────

async function shutdown(signal: string) {
  logger.info(`${signal} received. Shutting down gracefully...`)
  httpServer.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
