import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, forbidden, serverError } from '@/lib/api/helpers'
import { getCollabRole, canManage } from '@/lib/api/collab'

type Params = { projectId: string; userId: string }

export async function DELETE(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const user = getRequestUser(req)
    const projectId = parseId((await params).projectId)
    const targetId = parseId((await params).userId)
    if (!projectId || !targetId) return badRequest('ID không hợp lệ')

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return notFound('Không tìm thấy dự án')

    const role = await getCollabRole(project, user.id, user.role)
    // Owner can remove others; users can remove themselves
    if (!canManage(role) && user.id !== targetId) return forbidden()

    await prisma.projectCollaborator.deleteMany({
      where: { projectId, inviteeId: targetId },
    })
    return NextResponse.json({ message: 'Đã xóa thành viên' })
  } catch {
    return serverError()
  }
}
