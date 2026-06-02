import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser, requireAdmin } from '@/lib/auth/middleware'
import { badRequest, serverError } from '@/lib/api/helpers'

export const contractorSchema = z.object({
  type: z.enum(['TEAM', 'COMPANY', 'INDIVIDUAL']).default('TEAM'),
  name: z.string().trim().min(1).max(200),
  contactName: z.string().trim().max(100).nullable().default(null),
  phone: z.string().trim().max(20).nullable().default(null),
  phone2: z.string().trim().max(20).nullable().default(null),
  email: z.string().trim().email().max(200).nullable().default(null),
  address: z.string().trim().max(500).nullable().default(null),
  district: z.string().trim().max(100).nullable().default(null),
  city: z.string().trim().max(100).default('Hà Nội'),
  specialty: z.array(z.string()).nullable().default(null),
  workScope: z.string().trim().max(200).nullable().default(null),
  taxCode: z.string().trim().max(20).nullable().default(null),
  bankAccount: z.string().trim().max(50).nullable().default(null),
  bankName: z.string().trim().max(100).nullable().default(null),
  rating: z.number().int().min(1).max(5).default(3),
  ratingNote: z.string().trim().max(500).nullable().default(null),
  projectCount: z.number().int().min(0).default(0),
  totalValue: z.number().min(0).default(0),
  lastProjectAt: z.string().nullable().default(null),
  priceNotes: z.record(z.unknown()).nullable().default(null),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLACKLIST']).default('ACTIVE'),
  note: z.string().trim().max(1000).nullable().default(null),
})

export async function GET(req: NextRequest) {
  try {
    getRequestUser(req)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')?.toUpperCase()
    const type = searchParams.get('type')?.toUpperCase()
    const search = searchParams.get('search')

    const contractors = await prisma.contractor.findMany({
      where: {
        ...(status ? { status: status as 'ACTIVE' | 'INACTIVE' | 'BLACKLIST' } : {}),
        ...(type ? { type: type as 'TEAM' | 'COMPANY' | 'INDIVIDUAL' } : {}),
        ...(search ? { OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { contactName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ]} : {}),
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(contractors)
  } catch {
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req)
    requireAdmin(user)
    const body = contractorSchema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))
    const contractor = await prisma.contractor.create({
      data: { ...body.data, createdById: user.id },
    })
    return NextResponse.json(contractor, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Forbidden')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return serverError()
  }
}
