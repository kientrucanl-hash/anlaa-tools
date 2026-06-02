import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { parseId, badRequest, serverError } from '@/lib/api/helpers'

// PUT /api/notifications/read-all — must be registered before [id]
// Next.js App Router: static segment "read-all" takes precedence over [id]
// so we handle it in the parent route via a separate file.

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    const rawId = (await params).id
    if (rawId === 'read-all') {
      await prisma.notification.updateMany({ where: { userId: user.id }, data: { isRead: true } })
      return NextResponse.json({ ok: true })
    }
    const id = parseId(rawId)
    if (!id) return badRequest('ID không hợp lệ')
    await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { isRead: true } })
    return NextResponse.json({ ok: true })
  } catch {
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    const id = parseId((await params).id)
    if (!id) return badRequest('ID không hợp lệ')
    await prisma.notification.deleteMany({ where: { id, userId: user.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return serverError()
  }
}
