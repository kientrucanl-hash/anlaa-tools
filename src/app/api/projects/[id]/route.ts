import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma, toJson } from '@/lib/db/prisma'
import { getRequestUser, requireAdmin } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, forbidden, serverError } from '@/lib/api/helpers'
import { getCollabRole } from '@/lib/api/collab'

const updateSchema = z
  .object({
    name: z.string().trim().min(1, 'Tên dự án không được để trống').max(200).optional(),
    address: z.string().trim().max(500).optional(),
    data: z.array(z.unknown()).max(2000).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Không có trường nào để cập nhật' })

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    const id = parseId((await params).id)
    if (!id) return badRequest('ID không hợp lệ')

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        user: { select: { username: true } },
        collaborators: { include: { invitee: { select: { id: true, username: true } } } },
      },
    })
    if (!project) return notFound('Không tìm thấy project')

    const collabRole = await getCollabRole(project, user.id, user.role)
    if (!collabRole) {
      const pending = await prisma.projectAccessRequest.findUnique({
        where: { projectId_requesterId: { projectId: id, requesterId: user.id } },
      })
      if (pending?.status === 'PENDING') {
        return NextResponse.json(
          { error: 'access_pending', message: 'Yêu cầu quyền truy cập của bạn đang chờ xét duyệt.' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: 'access_denied', message: 'Bạn không có quyền truy cập dự án này.' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      ...project,
      ownerName: project.user.username,
      myRole: project.userId === user.id ? 'owner' : collabRole.toLowerCase(),
    })
  } catch {
    return serverError()
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    const id = parseId((await params).id)
    if (!id) return badRequest('ID không hợp lệ')

    const body = updateSchema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) return notFound('Không tìm thấy project')

    const collabRole = await getCollabRole(project, user.id, user.role)
    if (!collabRole || collabRole === 'VIEWER')
      return forbidden('Bạn chỉ có quyền xem dự án này, không thể chỉnh sửa')
    if (!['DRAFT', 'REJECTED'].includes(project.status))
      return badRequest('Project đang chờ duyệt hoặc đã được duyệt, không thể chỉnh sửa')

    const { data: projectData, ...rest } = body.data
    const updated = await prisma.project.update({
      where: { id },
      data: { ...rest, ...(projectData !== undefined && { data: toJson(projectData) }) },
    })
    return NextResponse.json(updated)
  } catch {
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    requireAdmin(user)
    const id = parseId((await params).id)
    if (!id) return badRequest('ID không hợp lệ')

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) return notFound('Không tìm thấy project')

    await prisma.project.delete({ where: { id } })
    return NextResponse.json({ message: 'Đã xóa project' })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Forbidden')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return serverError()
  }
}
