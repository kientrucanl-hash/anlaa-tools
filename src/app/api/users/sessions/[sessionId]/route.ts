import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser, requireAdmin } from '@/lib/auth/middleware'
import { parseId, badRequest, serverError } from '@/lib/api/helpers'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const user = getRequestUser(req)
    requireAdmin(user)
    const id = parseId((await params).sessionId)
    if (!id) return badRequest('ID không hợp lệ')
    await prisma.session.delete({ where: { id } })
    return NextResponse.json({ message: 'Đã thu hồi phiên đăng nhập' })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Forbidden')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return serverError()
  }
}
