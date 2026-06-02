import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { badRequest, serverError } from '@/lib/api/helpers'
import { contractorSchema } from '../_schema'

const draftSchema = contractorSchema.extend({
  contractorId: z.number().int().positive().nullable().default(null),
})

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')?.toUpperCase()

    const drafts = user.role === 'ADMIN'
      ? await prisma.contractorDraft.findMany({
          where: status ? { status: status as 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' } : {},
          include: { submitter: { select: { id: true, username: true } } },
          orderBy: { updatedAt: 'desc' },
        })
      : await prisma.contractorDraft.findMany({
          where: { submittedBy: user.id },
          orderBy: { updatedAt: 'desc' },
        })
    return NextResponse.json(drafts)
  } catch {
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req)
    const body = draftSchema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))
    const { contractorId, ...payload } = body.data
    if (contractorId) {
      const c = await prisma.contractor.findUnique({ where: { id: contractorId } })
      if (!c) return NextResponse.json({ error: 'Không tìm thấy nhà thầu cần cập nhật' }, { status: 404 })
    }
    const draft = await prisma.contractorDraft.create({
      data: { contractorId, submittedBy: user.id, payload },
    })
    return NextResponse.json(draft, { status: 201 })
  } catch {
    return serverError()
  }
}
