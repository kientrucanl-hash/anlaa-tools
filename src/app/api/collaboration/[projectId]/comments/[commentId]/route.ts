import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, forbidden, serverError } from '@/lib/api/helpers'
import { getCollabRole, canManage } from '@/lib/api/collab'

type Params = { projectId: string; commentId: string }

export async function DELETE(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const user = getRequestUser(req)
    const projectId = parseId((await params).projectId)
    const commentId = parseId((await params).commentId)
    if (!projectId || !commentId) return badRequest('ID không hợp lệ')

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return notFound('Không tìm thấy dự án')

    const comment = await prisma.projectComment.findFirst({ where: { id: commentId, projectId } })
    if (!comment) return notFound('Không tìm thấy comment')

    const role = await getCollabRole(project, user.id, user.role)
    // Author or project owner can delete
    if (comment.userId !== user.id && !canManage(role))
      return forbidden('Không có quyền xóa comment này')

    await prisma.projectComment.delete({ where: { id: commentId } })
    return NextResponse.json({ message: 'Đã xóa comment' })
  } catch {
    return serverError()
  }
}
