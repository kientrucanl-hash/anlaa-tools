import { NextRequest, NextResponse } from 'next/server'
import { prisma, toJson } from '@/lib/db/prisma'
import { getRequestUser, requireAdmin } from '@/lib/auth/middleware'
import { badRequest, serverError } from '@/lib/api/helpers'
import { contractorSchema } from './_schema'

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
    const { specialty, priceNotes, lastProjectAt, ...rest } = body.data
    const contractor = await prisma.contractor.create({
      data: {
        ...rest,
        createdById: user.id,
        specialty: toJson(specialty),
        priceNotes: toJson(priceNotes),
        lastProjectAt: lastProjectAt ? new Date(lastProjectAt) : null,
      },
    })
    return NextResponse.json(contractor, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Forbidden')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return serverError()
  }
}
