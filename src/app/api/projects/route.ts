import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser } from '@/lib/auth/middleware'
import { badRequest, serverError } from '@/lib/api/helpers'

const createSchema = z.object({
  name: z.string().trim().min(1, 'Tên dự án không được để trống').max(200, 'Tên dự án không được vượt quá 200 ký tự'),
  address: z.string().trim().max(500).default(''),
  data: z.array(z.unknown()).max(2000).default([]),
})

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req)
    if (user.role === 'ADMIN') {
      const projects = await prisma.project.findMany({
        include: { user: { select: { username: true } } },
        orderBy: { updatedAt: 'desc' },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return NextResponse.json(
        (projects as any[]).map((p: any) => ({ ...p, ownerName: p.user.username, myRole: 'admin', user: undefined }))
      )
    }

    const own = await prisma.project.findMany({
      where: { userId: user.id },
      include: { user: { select: { username: true } } },
      orderBy: { updatedAt: 'desc' },
    })

    const shared = await prisma.projectCollaborator.findMany({
      where: { inviteeId: user.id, status: 'ACCEPTED' },
      include: {
        project: {
          include: { user: { select: { username: true } } },
        },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ownIds = new Set((own as any[]).map((p: any) => p.id as number))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sharedProjects = (shared as any[])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((c: any) => !ownIds.has(c.projectId))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => ({ ...c.project, ownerName: c.project.user.username, myRole: c.role.toLowerCase(), user: undefined }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ownMapped = (own as any[]).map((p: any) => ({ ...p, ownerName: p.user.username, myRole: 'owner', user: undefined }))
    return NextResponse.json([...ownMapped, ...sharedProjects])
  } catch {
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req)
    const body = createSchema.safeParse(await req.json())
    if (!body.success) return badRequest(body.error.errors.map((e) => e.message).join('; '))

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: body.data.name,
        address: body.data.address,
        data: body.data.data,
      },
    })
    return NextResponse.json(project, { status: 201 })
  } catch {
    return serverError()
  }
}
