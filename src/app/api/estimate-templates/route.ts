import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser, requireAdmin } from '@/lib/auth/middleware'
import { badRequest, serverError } from '@/lib/api/helpers'

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(50).default('nha-pho'),
  description: z.string().trim().max(500).nullable().default(null),
  snapshot: z.union([z.string(), z.record(z.unknown())]),
  isActive: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req)
    const { searchParams } = new URL(req.url)
    const includeInactive = user.role === 'ADMIN' && searchParams.get('all') === '1'

    const templates = await prisma.estimateTemplate.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: { id: true, name: true, category: true, description: true, isActive: true, createdAt: true, updatedAt: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(templates)
  } catch {
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req)
    requireAdmin(user)
    const body = createSchema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))

    const snapshotStr = typeof body.data.snapshot === 'string'
      ? body.data.snapshot
      : JSON.stringify(body.data.snapshot)
    if (snapshotStr.length > 2_000_000) return NextResponse.json({ error: 'Snapshot quá lớn' }, { status: 413 })

    const tmpl = await prisma.estimateTemplate.create({
      data: {
        name: body.data.name,
        category: body.data.category,
        description: body.data.description,
        snapshot: snapshotStr,
        isActive: body.data.isActive,
        createdById: user.id,
      },
    })
    return NextResponse.json(tmpl, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Forbidden')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return serverError()
  }
}
