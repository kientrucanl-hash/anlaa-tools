import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getRequestUser } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/prisma'
import { verifyToken } from '@/lib/auth/jwt'
import { deleteSession } from '@/lib/auth/session'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
})

export async function PUT(req: NextRequest) {
  try {
    const authUser = getRequestUser(req)
    const body = schema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.errors.map((e) => e.message).join('; ') },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = body.data
    const user = await prisma.user.findUnique({ where: { id: authUser.id } })
    if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 401 })
    }

    const newHash = bcrypt.hashSync(newPassword, 10)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } })

    // Revoke all other sessions
    const token =
      req.headers.get('authorization')?.replace('Bearer ', '') ??
      req.cookies.get('anlaa_token')?.value
    let currentSid: string | null = null
    if (token) {
      try { currentSid = verifyToken(token).sid } catch {}
    }

    const sessions = await prisma.session.findMany({ where: { userId: user.id } })
    for (const s of sessions) {
      if (s.sessionToken !== currentSid) await deleteSession(s.sessionToken)
    }

    return NextResponse.json({ message: 'Đổi mật khẩu thành công' })
  } catch {
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 })
  }
}
