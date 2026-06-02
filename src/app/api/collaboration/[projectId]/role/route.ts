import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, forbidden, serverError } from '@/lib/api/helpers'
import { getCollabRole, canManage } from '@/lib/api/collab'

const schema = z.object({
  inviteeId: z.number().int(),
  role: z.enum(['EDITOR', 'VIEWER']),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = getRequestUser(req)
    const projectId = parseId((await params).projectId)
    if (!projectId) return badRequest('ID không hợp lệ')

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return notFound('Không tìm thấy dự án')
    const role = await getCollabRole(project, user.id, user.role)
    if (!canManage(role)) return forbidden()

    const body = schema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))

    await prisma.projectCollaborator.update({
      where: { projectId_inviteeId: { projectId, inviteeId: body.data.inviteeId } },
      data: { role: body.data.role },
    })

    const newRoleLabel = body.data.role === 'EDITOR' ? 'Chỉnh sửa' : 'Chỉ xem'
    await prisma.notification.create({
      data: {
        userId: body.data.inviteeId,
        type: 'ROLE_CHANGED',
        title: 'Quyền cộng tác thay đổi',
        body: `Quyền của bạn trong dự án của ${user.username ?? 'Owner'} đã thay đổi thành "${newRoleLabel}".`,
        link: '/',
        meta: { projectId, role: body.data.role },
      },
    })
    return NextResponse.json({ message: 'Đã cập nhật quyền' })
  } catch {
    return serverError()
  }
}
