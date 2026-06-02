import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

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

// Helper to get Socket.io instance for broadcasting from API routes
// Socket.io runs in a separate server process — notifications are sent
// directly to the socket server via its own event loop, so API routes
// can only write to DB. Real-time push is handled by socket-server.ts.
// This placeholder exists for future integration (e.g., Redis pub/sub).
export function emitToUser(_userId: number, _event: string, _data: unknown) {
  // TODO Phase 6: emit via Redis pub/sub to socket-server.ts
}

export function emitToProject(_projectId: number, _event: string, _data: unknown) {
  // TODO Phase 6: emit via Redis pub/sub to socket-server.ts
}
