import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import Redis from 'ioredis'

export function parseId(value: string): number | null {
  const id = parseInt(value, 10)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 })
}

export function notFound(msg = 'Không tìm thấy') {
  return NextResponse.json({ error: msg }, { status: 404 })
}

export function forbidden(msg = 'Không có quyền truy cập') {
  return NextResponse.json({ error: msg }, { status: 403 })
}

export function serverError(msg = 'Lỗi hệ thống. Vui lòng thử lại.') {
  return NextResponse.json({ error: msg }, { status: 500 })
}

export function zodError(err: ZodError) {
  return NextResponse.json(
    { error: err.errors.map((e) => e.message).join('; ') },
    { status: 400 }
  )
}

// ── Redis pub/sub publisher ────────────────────────────────────────────────
// Next.js API routes publish events here; socket-server.ts subscribes and
// emits them to the relevant Socket.io rooms.

const globalForRedis = globalThis as unknown as { redisPublisher: Redis | undefined }

function getPublisher(): Redis | null {
  if (!process.env.REDIS_URL) return null
  if (!globalForRedis.redisPublisher) {
    globalForRedis.redisPublisher = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    })
    globalForRedis.redisPublisher.on('error', () => {})
  }
  return globalForRedis.redisPublisher
}

async function publish(channel: string, payload: unknown): Promise<void> {
  const publisher = getPublisher()
  if (!publisher) return
  try {
    await publisher.publish(channel, JSON.stringify(payload))
  } catch {
    // Redis unavailable — degrade gracefully, DB write already done
  }
}

export async function emitToUser(userId: number, event: string, data: unknown): Promise<void> {
  await publish('socket:user', { userId, event, data })
}

export async function emitToProject(projectId: number, event: string, data: unknown): Promise<void> {
  await publish('socket:project', { projectId, event, data })
}
