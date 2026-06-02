import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { signToken } from '@/lib/auth/jwt'
import { createSession, pruneOldSessions } from '@/lib/auth/session'

const loginSchema = z.object({
  username: z.string().min(1).max(100).trim(),
  password: z.string().min(1).max(200),
})

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json(
        { error: 'Vui lòng nhập tên đăng nhập và mật khẩu' },
        { status: 400 }
      )
    }

    const { username, password } = body.data
    const user = await prisma.user.findUnique({ where: { username } })

    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return NextResponse.json(
        { error: 'Tên đăng nhập hoặc mật khẩu không đúng' },
        { status: 401 }
      )
    }

    await pruneOldSessions(user.id, user.maxSessions)
    const session = await createSession(
      user.id,
      getClientIp(req),
      req.headers.get('user-agent') ?? undefined
    )

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role as 'USER' | 'ADMIN',
      sid: session.sessionToken,
    })

    const response = NextResponse.json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
    })

    // Set httpOnly cookie so middleware can read it
    response.cookies.set('anlaa_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 3600,
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Lỗi hệ thống. Vui lòng thử lại.' }, { status: 500 })
  }
}
