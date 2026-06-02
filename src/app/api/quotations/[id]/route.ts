import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, forbidden, serverError } from '@/lib/api/helpers'

const rowSchema = z.object({
  item: z.string().trim().max(200).default(''),
  unit: z.string().trim().max(50).default(''),
  prices: z.tuple([z.number().nullable(), z.number().nullable(), z.number().nullable()]).default([null, null, null]),
  notes: z.tuple([z.string().trim().max(500), z.string().trim().max(500), z.string().trim().max(500)]).default(['', '', '']),
})

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  contractors: z.tuple([z.string().trim().max(100), z.string().trim().max(100), z.string().trim().max(100)]).optional(),
  rows: z.array(rowSchema).max(1000).optional(),
}).refine((d) => Object.keys(d).length > 0, 'Không có trường nào để cập nhật')

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    const id = parseId((await params).id)
    if (!id) return badRequest('ID không hợp lệ')
    const q = await prisma.quotation.findUnique({ where: { id } })
    if (!q) return notFound('Không tìm thấy bảng báo giá')
    if (user.role !== 'ADMIN' && q.userId !== user.id) return forbidden()
    return NextResponse.json(q)
  } catch {
    return serverError()
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    const id = parseId((await params).id)
    if (!id) return badRequest('ID không hợp lệ')
    const q = await prisma.quotation.findUnique({ where: { id } })
    if (!q) return notFound('Không tìm thấy bảng báo giá')
    if (q.userId !== user.id) return forbidden()
    if (!['DRAFT', 'REJECTED'].includes(q.status))
      return badRequest('Chỉ có thể chỉnh sửa bảng đang ở trạng thái Draft hoặc Bị từ chối')
    const body = updateSchema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))
    const updated = await prisma.quotation.update({ where: { id }, data: body.data })
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
    const q = await prisma.quotation.findUnique({ where: { id } })
    if (!q) return notFound('Không tìm thấy bảng báo giá')
    if (user.role !== 'ADMIN') {
      if (q.userId !== user.id) return forbidden()
      if (!['DRAFT', 'REJECTED'].includes(q.status))
        return badRequest('Chỉ có thể xóa bảng đang ở trạng thái Draft hoặc Bị từ chối')
    }
    await prisma.quotation.delete({ where: { id } })
    return NextResponse.json({ message: 'Đã xóa bảng báo giá' })
  } catch {
    return serverError()
  }
}
