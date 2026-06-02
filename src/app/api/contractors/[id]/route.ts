import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser, requireAdmin } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, serverError } from '@/lib/api/helpers'
import { contractorSchema } from '../_schema'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    getRequestUser(req)
    const id = parseId((await params).id)
    if (!id) return badRequest('ID không hợp lệ')
    const c = await prisma.contractor.findUnique({ where: { id } })
    if (!c) return notFound('Không tìm thấy nhà thầu')
    return NextResponse.json(c)
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
    if (!(await prisma.contractor.findUnique({ where: { id } }))) return notFound('Không tìm thấy nhà thầu')
    const body = contractorSchema.partial().safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))
    const updated = await prisma.contractor.update({ where: { id }, data: body.data })
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
    if (!(await prisma.contractor.findUnique({ where: { id } }))) return notFound('Không tìm thấy nhà thầu')
    await prisma.contractor.delete({ where: { id } })
    return NextResponse.json({ message: 'Đã xóa nhà thầu' })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Forbidden')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return serverError()
  }
}
