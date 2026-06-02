import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { badRequest, serverError } from '@/lib/api/helpers'

const rowSchema = z.object({
  item: z.string().trim().max(200).default(''),
  unit: z.string().trim().max(50).default(''),
  prices: z.tuple([z.number().nullable(), z.number().nullable(), z.number().nullable()]).default([null, null, null]),
  notes: z.tuple([z.string().trim().max(500), z.string().trim().max(500), z.string().trim().max(500)]).default(['', '', '']),
})

const createSchema = z.object({
  name: z.string().trim().min(1, 'Thiếu tên bảng báo giá').max(200),
  contractors: z.tuple([z.string().trim().max(100), z.string().trim().max(100), z.string().trim().max(100)]).default(['', '', '']),
  rows: z.array(rowSchema).max(1000).default([]),
})

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req)
    const quotations = user.role === 'ADMIN'
      ? await prisma.quotation.findMany({ orderBy: { updatedAt: 'desc' } })
      : await prisma.quotation.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } })
    return NextResponse.json(quotations)
  } catch {
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req)
    const body = createSchema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))
    const q = await prisma.quotation.create({
      data: {
        userId: user.id,
        name: body.data.name,
        contractors: body.data.contractors,
        rows: body.data.rows,
      },
    })
    return NextResponse.json(q, { status: 201 })
  } catch {
    return serverError()
  }
}
