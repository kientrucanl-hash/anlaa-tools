import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, forbidden, serverError } from '@/lib/api/helpers'
import { getCollabRole, canManage } from '@/lib/api/collab'

const schema = z.object({
  action: z.enum(['approve', 'deny']),
  role: z.enum(['EDITOR', 'VIEWER']).default('VIEWER'),
})

type Params = { projectId: string; requestId: string }

export async function PUT(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const user = getRequestUser(req)
    const projectId = parseId((await params).projectId)
    const requestId = parseId((await params).requestId)
    if (!projectId || !requestId) return badRequest('ID không hợp lệ')

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return notFound('Không tìm thấy dự án')
    const role = await getCollabRole(project, user.id, user.role)
    if (!canManage(role)) return forbidden('Chỉ chủ dự án mới có thể xét duyệt yêu cầu')

    const accessReq = await prisma.projectAccessRequest.findFirst({
      where: { id: requestId, projectId },
      include: { requester: { select: { id: true, username: true } } },
    })
    if (!accessReq) return notFound('Không tìm thấy yêu cầu')
    if (accessReq.status !== 'PENDING') return badRequest('Yêu cầu đã được xử lý')

    const body = schema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))

    if (body.data.action === 'approve') {
      await prisma.$transaction([
        prisma.projectAccessRequest.update({ where: { id: requestId }, data: { status: 'APPROVED' } }),
        prisma.projectCollaborator.upsert({
          where: { projectId_inviteeId: { projectId, inviteeId: accessReq.requesterId } },
          create: {
            projectId,
            ownerId: project.userId,
            inviteeId: accessReq.requesterId,
            role: body.data.role,
            status: 'ACCEPTED',
          },
          update: { role: body.data.role, status: 'ACCEPTED' },
        }),
      ])
      const approvedRoleLabel = body.data.role === 'EDITOR' ? 'Chỉnh sửa' : 'Chỉ xem'
      await prisma.notification.create({
        data: {
          userId: accessReq.requesterId,
          type: 'ACCESS_APPROVED',
          title: 'Yêu cầu truy cập được chấp thuận',
          body: `Bạn được cấp quyền ${approvedRoleLabel} dự án "${project.name}".`,
          link: '/',
          meta: { projectId, projectName: project.name, role: body.data.role },
        },
      })
      return NextResponse.json({ message: `Đã cấp quyền ${body.data.role} cho ${accessReq.requester.username}` })
    }

    // deny
    await prisma.projectAccessRequest.update({ where: { id: requestId }, data: { status: 'DENIED' } })
    await prisma.notification.create({
      data: {
        userId: accessReq.requesterId,
        type: 'ACCESS_DENIED',
        title: 'Yêu cầu truy cập bị từ chối',
        body: `Yêu cầu truy cập dự án "${project.name}" của bạn bị từ chối.`,
        link: null,
        meta: { projectId, projectName: project.name },
      },
    })
    return NextResponse.json({ message: `Đã từ chối yêu cầu của ${accessReq.requester.username}` })
  } catch {
    return serverError()
  }
}
