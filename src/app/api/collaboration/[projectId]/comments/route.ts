import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, forbidden, serverError } from '@/lib/api/helpers'
import { getCollabRole } from '@/lib/api/collab'

const commentSchema = z.object({
  rowRef: z.string().trim().nullable().default(null),
  content: z.string().trim().min(1).max(1000),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = getRequestUser(req)
    const projectId = parseId((await params).projectId)
    if (!projectId) return badRequest('ID không hợp lệ')
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return notFound('Không tìm thấy dự án')
    const role = await getCollabRole(project, user.id, user.role)
    if (!role) return forbidden()
    const comments = await prisma.projectComment.findMany({
      where: { projectId },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(comments)
  } catch {
    return serverError()
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = getRequestUser(req)
    const projectId = parseId((await params).projectId)
    if (!projectId) return badRequest('ID không hợp lệ')
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return notFound('Không tìm thấy dự án')
    const role = await getCollabRole(project, user.id, user.role)
    if (!role) return forbidden()

    const body = commentSchema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))

    const comment = await prisma.projectComment.create({
      data: { projectId, userId: user.id, rowRef: body.data.rowRef, content: body.data.content },
      include: { user: { select: { id: true, username: true } } },
    })
    return NextResponse.json(comment, { status: 201 })
  } catch {
    return serverError()
  }
}
