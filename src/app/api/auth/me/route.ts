import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const authUser = getRequestUser(req)
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, username: true, role: true, createdAt: true },
    })
    if (!user) return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 })
    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
