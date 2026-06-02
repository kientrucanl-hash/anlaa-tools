import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, forbidden, serverError } from '@/lib/api/helpers'
import { getCollabRole, canEdit } from '@/lib/api/collab'

const pricesSchema = z.object({
  prices: z.record(z.string().max(100), z.number().min(0)),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    const projectId = parseId((await params).id)
    if (!projectId) return badRequest('ID không hợp lệ')
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return notFound('Không tìm thấy dự án')
    const role = await getCollabRole(project, user.id, user.role)
    if (!role) return forbidden()
    const override = await prisma.projectPriceOverride.findUnique({ where: { projectId } })
    return NextResponse.json(override ?? { projectId, prices: {} })
  } catch {
    return serverError()
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    const projectId = parseId((await params).id)
    if (!projectId) return badRequest('ID không hợp lệ')
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return notFound('Không tìm thấy dự án')
    const role = await getCollabRole(project, user.id, user.role)
    if (!canEdit(role)) return forbidden('Không có quyền chỉnh sửa')
    const body = pricesSchema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))
    const override = await prisma.projectPriceOverride.upsert({
      where: { projectId },
      create: { projectId, prices: body.data.prices },
      update: { prices: body.data.prices },
    })
    return NextResponse.json(override)
  } catch {
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    const projectId = parseId((await params).id)
    if (!projectId) return badRequest('ID không hợp lệ')
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return notFound('Không tìm thấy dự án')
    if (project.userId !== user.id && user.role !== 'ADMIN')
      return forbidden('Chỉ chủ dự án mới có thể xóa ghi đè đơn giá')
    await prisma.projectPriceOverride.deleteMany({ where: { projectId } })
    return NextResponse.json({ ok: true })
  } catch {
    return serverError()
  }
}
