import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { badRequest, serverError } from '@/lib/api/helpers'

const pricesSchema = z.object({
  region: z.string().max(50).default('hanoi'),
  prices: z.record(z.string().max(100), z.number().min(0)),
})

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req)
    const profile = await prisma.userPriceProfile.findUnique({ where: { userId: user.id } })
    return NextResponse.json(profile ?? { userId: user.id, region: 'hanoi', prices: {} })
  } catch {
    return serverError()
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getRequestUser(req)
    const body = pricesSchema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))
    const profile = await prisma.userPriceProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, region: body.data.region, prices: body.data.prices },
      update: { region: body.data.region, prices: body.data.prices },
    })
    return NextResponse.json(profile)
  } catch {
    return serverError()
  }
}
