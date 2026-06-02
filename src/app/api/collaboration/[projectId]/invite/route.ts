import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, forbidden, serverError } from '@/lib/api/helpers'
import { getCollabRole, canManage } from '@/lib/api/collab'

const inviteSchema = z.object({
  username: z.string().trim().min(1),
  role: z.enum(['EDITOR', 'VIEWER']).default('VIEWER'),
})

const respondSchema = z.object({
  action: z.enum(['accept', 'deny']),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = getRequestUser(req)
    const projectId = parseId((await params).projectId)
    if (!projectId) return badRequest('ID không hợp lệ')
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return notFound('Không tìm thấy dự án')
    const role = await getCollabRole(project, user.id, user.role)
    if (!canManage(role)) return forbidden('Chỉ chủ dự án mới có thể mời người dùng')

    const body = inviteSchema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))

    const invitee = await prisma.user.findUnique({ where: { username: body.data.username } })
    if (!invitee) return notFound(`Không tìm thấy người dùng "${body.data.username}"`)
    if (invitee.id === user.id) return badRequest('Không thể tự mời chính mình')

    const collab = await prisma.projectCollaborator.upsert({
      where: { projectId_inviteeId: { projectId, inviteeId: invitee.id } },
      create: { projectId, ownerId: user.id, inviteeId: invitee.id, role: body.data.role, status: 'PENDING' },
      update: { role: body.data.role, status: 'PENDING' },
    })

    const roleLabel = body.data.role === 'EDITOR' ? 'Chỉnh sửa' : 'Chỉ xem'
    await prisma.notification.create({
      data: {
        userId: invitee.id,
        type: 'COLLAB_INVITE',
        title: 'Lời mời cộng tác',
        body: `${user.username ?? 'Someone'} mời bạn vào dự án "${project.name}" với quyền ${roleLabel}.`,
        link: '/',
        meta: { projectId, projectName: project.name, role: body.data.role },
      },
    })
    return NextResponse.json({ message: `Đã mời ${invitee.username}`, collab })
  } catch {
    return serverError()
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  // /invite/respond — invitee accepts or declines
  try {
    const user = getRequestUser(req)
    const projectId = parseId((await params).projectId)
    if (!projectId) return badRequest('ID không hợp lệ')

    const body = respondSchema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))

    const collab = await prisma.projectCollaborator.findUnique({
      where: { projectId_inviteeId: { projectId, inviteeId: user.id } },
    })
    if (!collab || collab.status !== 'PENDING') return notFound('Không tìm thấy lời mời đang chờ')

    const newStatus = body.data.action === 'accept' ? 'ACCEPTED' : 'DENIED'
    await prisma.projectCollaborator.update({
      where: { projectId_inviteeId: { projectId, inviteeId: user.id } },
      data: { status: newStatus },
    })

    const actionLabel = body.data.action === 'accept' ? 'chấp nhận' : 'từ chối'
    await prisma.notification.create({
      data: {
        userId: collab.ownerId,
        type: 'COLLAB_RESPONDED',
        title: `${user.username ?? 'User'} ${actionLabel} lời mời`,
        body: `${user.username ?? 'User'} đã ${actionLabel} lời mời cộng tác vào dự án.`,
        link: '/',
        meta: { projectId, action: body.data.action },
      },
    })
    return NextResponse.json({
      message: body.data.action === 'accept' ? 'Đã chấp nhận lời mời' : 'Đã từ chối lời mời',
    })
  } catch {
    return serverError()
  }
}
