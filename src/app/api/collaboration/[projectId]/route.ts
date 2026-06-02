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

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = getRequestUser(req)
    const projectId = parseId((await params).projectId)
    if (!projectId) return badRequest('ID không hợp lệ')
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return notFound('Không tìm thấy dự án')
    const role = await getCollabRole(project, user.id, user.role)
    if (!canManage(role)) return forbidden('Chỉ chủ dự án mới xem được danh sách cộng tác')
    const [collaborators, accessRequests] = await Promise.all([
      prisma.projectCollaborator.findMany({
        where: { projectId },
        include: { invitee: { select: { id: true, username: true } } },
      }),
      prisma.projectAccessRequest.findMany({
        where: { projectId },
        include: { requester: { select: { id: true, username: true } } },
      }),
    ])
    return NextResponse.json({ collaborators, accessRequests })
  } catch {
    return serverError()
  }
}
