import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser, requireAdmin } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, serverError } from '@/lib/api/helpers'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = getRequestUser(req)
    requireAdmin(authUser)
    const id = parseId((await params).id)
    if (!id) return badRequest('ID không hợp lệ')
    if (id === authUser.id) return badRequest('Không thể xóa tài khoản của chính mình')
    if (!(await prisma.user.findUnique({ where: { id } }))) return notFound('Không tìm thấy người dùng')
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ message: 'Xóa người dùng thành công' })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Forbidden')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return serverError()
  }
}
