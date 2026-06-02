import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser, requireAdmin } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, serverError } from '@/lib/api/helpers'

const passwordSchema = z.object({
  newPassword: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(100),
})
const roleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
})
const maxSessionsSchema = z.object({
  maxSessions: z.number().int().min(1).max(10),
})

type Params = { id: string; action: string }

export async function PUT(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const authUser = getRequestUser(req)
    requireAdmin(authUser)
    const { id: rawId, action } = await params
    const id = parseId(rawId)
    if (!id) return badRequest('ID không hợp lệ')

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return notFound('Không tìm thấy người dùng')

    if (action === 'password') {
      const body = passwordSchema.safeParse(await req.json())
      if (!body.success) return badRequest(body.error.errors[0]?.message ?? 'Invalid')
      await prisma.user.update({ where: { id }, data: { passwordHash: bcrypt.hashSync(body.data.newPassword, 10) } })
      await prisma.session.deleteMany({ where: { userId: id } })
      return NextResponse.json({ message: 'Đặt lại mật khẩu thành công' })
    }

    if (action === 'role') {
      if (id === authUser.id) return badRequest('Không thể tự thay đổi vai trò của mình')
      const body = roleSchema.safeParse(await req.json())
      if (!body.success) return badRequest(body.error.errors[0]?.message ?? 'Invalid')
      await prisma.user.update({ where: { id }, data: { role: body.data.role } })
      await prisma.session.deleteMany({ where: { userId: id } })
      return NextResponse.json({ message: 'Cập nhật vai trò thành công' })
    }

    if (action === 'max-sessions') {
      const body = maxSessionsSchema.safeParse(await req.json())
      if (!body.success) return badRequest(body.error.errors[0]?.message ?? 'Invalid')
      await prisma.user.update({ where: { id }, data: { maxSessions: body.data.maxSessions } })
      // Enforce limit: delete oldest sessions beyond limit
      const sessions = await prisma.session.findMany({ where: { userId: id }, orderBy: { lastSeen: 'asc' } })
      if (sessions.length > body.data.maxSessions) {
        const toDelete = sessions.slice(0, sessions.length - body.data.maxSessions)
        await prisma.session.deleteMany({ where: { id: { in: toDelete.map((s: { id: number }) => s.id) } } })
      }
      return NextResponse.json({ message: 'Đã cập nhật giới hạn thiết bị' })
    }

    return badRequest('Action không hợp lệ')
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Forbidden')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return serverError()
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const authUser = getRequestUser(req)
    requireAdmin(authUser)
    const { id: rawId, action } = await params
    const id = parseId(rawId)
    if (!id) return badRequest('ID không hợp lệ')
    if (action !== 'sessions') return badRequest('Action không hợp lệ')
    if (!(await prisma.user.findUnique({ where: { id } }))) return notFound('Không tìm thấy người dùng')
    const sessions = await prisma.session.findMany({ where: { userId: id }, orderBy: { lastSeen: 'desc' } })
    return NextResponse.json(sessions)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Forbidden')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const authUser = getRequestUser(req)
    requireAdmin(authUser)
    const { id: rawId, action } = await params
    const id = parseId(rawId)
    if (!id) return badRequest('ID không hợp lệ')

    if (action === 'sessions') {
      if (!(await prisma.user.findUnique({ where: { id } }))) return notFound('Không tìm thấy người dùng')
      await prisma.session.deleteMany({ where: { userId: id } })
      return NextResponse.json({ message: 'Đã đăng xuất tất cả thiết bị của người dùng này' })
    }

    return badRequest('Action không hợp lệ')
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Forbidden')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return serverError()
  }
}
