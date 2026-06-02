import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser, requireAdmin } from '@/lib/auth/middleware'
import { badRequest, serverError } from '@/lib/api/helpers'

const createSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9]+$/, 'Tên đăng nhập chỉ gồm chữ và số')
    .min(3, 'Tên đăng nhập tối thiểu 3 ký tự')
    .max(30, 'Tên đăng nhập tối đa 30 ký tự'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(100),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
})

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req)
    requireAdmin(user)
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, maxSessions: true, createdAt: true },
      orderBy: { username: 'asc' },
    })
    return NextResponse.json(users)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Forbidden')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req)
    requireAdmin(user)
    const body = createSchema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))

    const { username, password, role } = body.data
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 409 })

    const newUser = await prisma.user.create({
      data: { username, passwordHash: bcrypt.hashSync(password, 10), role },
      select: { id: true, username: true, role: true, createdAt: true },
    })
    return NextResponse.json(newUser, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Forbidden')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return serverError()
  }
}
