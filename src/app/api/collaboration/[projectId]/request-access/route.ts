import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, serverError } from '@/lib/api/helpers'

const schema = z.object({
  role: z.enum(['EDITOR', 'VIEWER']).default('VIEWER'),
  message: z.string().trim().max(300).default(''),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = getRequestUser(req)
    const projectId = parseId((await params).projectId)
    if (!projectId) return badRequest('ID không hợp lệ')

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return notFound('Không tìm thấy dự án')
    if (project.userId === user.id) return badRequest('Bạn là chủ dự án này')

    const existing = await prisma.projectCollaborator.findUnique({
      where: { projectId_inviteeId: { projectId, inviteeId: user.id } },
    })
    if (existing?.status === 'ACCEPTED') return badRequest('Bạn đã có quyền truy cập dự án này')

    const body = schema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))

    const accessReq = await prisma.projectAccessRequest.upsert({
      where: { projectId_requesterId: { projectId, requesterId: user.id } },
      create: {
        projectId,
        requesterId: user.id,
        roleRequested: body.data.role,
        message: body.data.message || null,
        status: 'PENDING',
      },
      update: { roleRequested: body.data.role, message: body.data.message || null, status: 'PENDING' },
    })

    const roleLabel = body.data.role === 'EDITOR' ? 'Chỉnh sửa' : 'Chỉ xem'
    await prisma.notification.create({
      data: {
        userId: project.userId,
        type: 'ACCESS_REQUEST',
        title: 'Yêu cầu truy cập dự án',
        body: `${user.username ?? 'User'} yêu cầu quyền ${roleLabel} dự án "${project.name}".${body.data.message ? ` Ghi chú: ${body.data.message}` : ''}`,
        link: '/',
        meta: { projectId, requestId: accessReq.id, requesterId: user.id, role: body.data.role },
      },
    })
    return NextResponse.json({ message: 'Đã gửi yêu cầu quyền truy cập. Chờ chủ dự án xét duyệt.' })
  } catch {
    return serverError()
  }
}
