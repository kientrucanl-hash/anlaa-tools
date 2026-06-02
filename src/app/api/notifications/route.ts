import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { serverError } from '@/lib/api/helpers'

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req)
    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ])
    return NextResponse.json({ notifications, unread })
  } catch {
    return serverError()
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getRequestUser(req)
    await prisma.notification.deleteMany({ where: { userId: user.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return serverError()
  }
}
