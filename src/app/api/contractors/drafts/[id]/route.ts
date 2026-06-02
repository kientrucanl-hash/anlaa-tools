import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, forbidden, serverError } from '@/lib/api/helpers'
import { contractorSchema } from '../../_schema'

function canRead(draft: { submittedBy: number }, userId: number, role: string) {
  return role === 'ADMIN' || draft.submittedBy === userId
}
function canEdit(draft: { status: string; submittedBy: number }, userId: number, role: string) {
  return (role === 'ADMIN' || draft.submittedBy === userId) && ['DRAFT', 'REJECTED'].includes(draft.status)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    const id = parseId((await params).id)
    if (!id) return badRequest('ID không hợp lệ')
    const draft = await prisma.contractorDraft.findUnique({ where: { id } })
    if (!draft) return notFound('Không tìm thấy nháp nhà thầu')
    if (!canRead(draft, user.id, user.role)) return forbidden()
    return NextResponse.json(draft)
  } catch {
    return serverError()
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    const id = parseId((await params).id)
    if (!id) return badRequest('ID không hợp lệ')
    const draft = await prisma.contractorDraft.findUnique({ where: { id } })
    if (!draft) return notFound('Không tìm thấy nháp nhà thầu')
    if (!canEdit(draft, user.id, user.role)) return forbidden('Chỉ có thể sửa nháp đang Draft hoặc bị từ chối')

    const body = contractorSchema.partial().safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))

    const payload = { ...(draft.payload as Record<string, unknown>), ...body.data }
    const updated = await prisma.contractorDraft.update({ where: { id }, data: { payload } })
    return NextResponse.json(updated)
  } catch {
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    const id = parseId((await params).id)
    if (!id) return badRequest('ID không hợp lệ')
    const draft = await prisma.contractorDraft.findUnique({ where: { id } })
    if (!draft) return notFound('Không tìm thấy nháp nhà thầu')
    if (!canEdit(draft, user.id, user.role)) return forbidden('Chỉ xóa được nháp Draft hoặc bị từ chối')
    await prisma.contractorDraft.delete({ where: { id } })
    return NextResponse.json({ message: 'Đã xóa nháp nhà thầu' })
  } catch {
    return serverError()
  }
}
