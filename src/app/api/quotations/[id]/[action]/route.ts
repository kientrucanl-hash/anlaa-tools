import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser, requireAdmin } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, forbidden, serverError } from '@/lib/api/helpers'

const rejectSchema = z.object({
  note: z.string().trim().max(500).default(''),
})

type Params = { id: string; action: string }

export async function PUT(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const user = getRequestUser(req)
    const { id: rawId, action } = await params
    const id = parseId(rawId)
    if (!id) return badRequest('ID không hợp lệ')
    if (!['submit', 'approve', 'reject'].includes(action)) return badRequest('Action không hợp lệ')

    const q = await prisma.quotation.findUnique({ where: { id } })
    if (!q) return notFound('Không tìm thấy bảng báo giá')

    if (action === 'submit') {
      if (q.userId !== user.id) return forbidden()
      if (!['DRAFT', 'REJECTED'].includes(q.status))
        return badRequest('Bảng báo giá đã được gửi hoặc đã duyệt')
      const rows = Array.isArray(q.rows) ? q.rows : []
      if (rows.length === 0) return badRequest('Bảng báo giá chưa có hạng mục nào')
      return NextResponse.json(await prisma.quotation.update({ where: { id }, data: { status: 'PENDING' } }))
    }

    try { requireAdmin(user) } catch { return forbidden() }

    if (action === 'approve') {
      if (q.status !== 'PENDING') return badRequest('Bảng không ở trạng thái chờ duyệt')
      return NextResponse.json(await prisma.quotation.update({ where: { id }, data: { status: 'APPROVED', adminNote: null } }))
    }

    // reject
    if (q.status !== 'PENDING') return badRequest('Bảng không ở trạng thái chờ duyệt')
    const body = rejectSchema.safeParse(await req.json().catch(() => ({})))
    const note = body.success ? body.data.note : ''
    return NextResponse.json(
      await prisma.quotation.update({ where: { id }, data: { status: 'REJECTED', adminNote: note || null } })
    )
  } catch {
    return serverError()
  }
}
