import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, forbidden, serverError } from '@/lib/api/helpers'
import { getCollabRole } from '@/lib/api/collab'

const snapshotSchema = z.object({
  snapshot: z.string().min(1, 'snapshot phải là chuỗi JSON'),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    const id = parseId((await params).id)
    if (!id) return badRequest('ID không hợp lệ')

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) return notFound('Không tìm thấy project')

    const collabRole = await getCollabRole(project, user.id, user.role)
    if (!collabRole) return forbidden()

    return NextResponse.json({ snapshot: project.estimateSnapshot ?? null })
  } catch {
    return serverError()
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    const id = parseId((await params).id)
    if (!id) return badRequest('ID không hợp lệ')

    const body = snapshotSchema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors[0]?.message ?? 'Invalid snapshot')
    if (body.data.snapshot.length > 2_000_000)
      return NextResponse.json({ error: 'Snapshot quá lớn (tối đa 2MB)' }, { status: 413 })

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) return notFound('Không tìm thấy project')

    const collabRole = await getCollabRole(project, user.id, user.role)
    if (!collabRole || collabRole === 'VIEWER')
      return forbidden('Bạn chỉ có quyền xem, không thể chỉnh sửa')

    await prisma.project.update({ where: { id }, data: { estimateSnapshot: body.data.snapshot } })
    return NextResponse.json({ ok: true })
  } catch {
    return serverError()
  }
}
