import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser, requireAdmin } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, serverError } from '@/lib/api/helpers'

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().max(50).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  snapshot: z.union([z.string(), z.record(z.unknown())]).optional(),
  isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, 'Không có trường nào để cập nhật')

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    const id = parseId((await params).id)
    if (!id) return badRequest('ID không hợp lệ')
    const tmpl = await prisma.estimateTemplate.findUnique({ where: { id } })
    if (!tmpl || (!tmpl.isActive && user.role !== 'ADMIN')) return notFound('Không tìm thấy mẫu dự toán')
    let snapshot: unknown = tmpl.snapshot
    try { snapshot = JSON.parse(tmpl.snapshot) } catch {}
    return NextResponse.json({ ...tmpl, snapshot })
  } catch {
    return serverError()
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    requireAdmin(user)
    const id = parseId((await params).id)
    if (!id) return badRequest('ID không hợp lệ')
    if (!(await prisma.estimateTemplate.findUnique({ where: { id } }))) return notFound('Không tìm thấy mẫu')

    const body = updateSchema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))

    const data = { ...body.data } as Record<string, unknown>
    if (data.snapshot && typeof data.snapshot !== 'string') {
      data.snapshot = JSON.stringify(data.snapshot)
    }
    if (typeof data.snapshot === 'string' && data.snapshot.length > 2_000_000) {
      return NextResponse.json({ error: 'Snapshot quá lớn' }, { status: 413 })
    }

    const updated = await prisma.estimateTemplate.update({
      where: { id },
      data: data as { name?: string; category?: string; description?: string | null; snapshot?: string; isActive?: boolean },
    })
    return NextResponse.json(updated)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Forbidden')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return serverError()
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getRequestUser(req)
    requireAdmin(user)
    const id = parseId((await params).id)
    if (!id) return badRequest('ID không hợp lệ')
    if (!(await prisma.estimateTemplate.findUnique({ where: { id } }))) return notFound('Không tìm thấy mẫu')
    // Soft delete
    await prisma.estimateTemplate.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Forbidden')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return serverError()
  }
}
