import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, forbidden, serverError } from '@/lib/api/helpers'
import { getCollabRole, canManage } from '@/lib/api/collab'

type Params = { projectId: string; commentId: string }

export async function PUT(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const user = getRequestUser(req)
    const projectId = parseId((await params).projectId)
    const commentId = parseId((await params).commentId)
    if (!projectId || !commentId) return badRequest('ID không hợp lệ')

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return notFound('Không tìm thấy dự án')
    const role = await getCollabRole(project, user.id, user.role)
    if (!canManage(role)) return forbidden('Chỉ chủ dự án mới có thể resolve comment')

    const comment = await prisma.projectComment.findFirst({ where: { id: commentId, projectId } })
    if (!comment) return notFound('Không tìm thấy comment')

    await prisma.projectComment.update({ where: { id: commentId }, data: { resolved: true } })
    return NextResponse.json({ message: 'Đã đánh dấu hoàn thành' })
  } catch {
    return serverError()
  }
}
