import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getRequestUser, requireAdmin } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, forbidden, serverError } from '@/lib/api/helpers'

const rejectSchema = z.object({
  note: z.string().trim().max(500).default(''),
})

type Params = { id: string; action: string }

export async function PUT(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const user = getRequestUser(req)
    const { id: rawId, action } = await params
    const id = parseId(rawId)
    if (!id) return badRequest('ID không hợp lệ')
    if (!['submit', 'approve', 'reject'].includes(action))
      return badRequest('Action không hợp lệ')

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) return notFound('Không tìm thấy project')

    if (action === 'submit') {
      if (project.userId !== user.id) return forbidden()
      if (!['DRAFT', 'REJECTED'].includes(project.status))
        return badRequest('Chỉ có thể nộp duyệt project ở trạng thái Draft hoặc Từ chối')
      const updated = await prisma.project.update({
        where: { id },
        data: { status: 'PENDING', adminNote: null },
      })
      return NextResponse.json(updated)
    }

    // approve / reject — admin only
    try { requireAdmin(user) } catch {
      return forbidden()
    }

    if (action === 'approve') {
      if (project.status !== 'PENDING')
        return badRequest('Chỉ có thể duyệt project đang Chờ duyệt')
      const updated = await prisma.project.update({
        where: { id },
        data: { status: 'APPROVED', adminNote: null },
      })
      await prisma.notification.create({
        data: {
          userId: project.userId,
          type: 'PROJECT_APPROVED',
          title: 'Dự toán đã được duyệt',
          body: `Dự toán "${project.name}" đã được Admin phê duyệt.`,
          link: '/',
          meta: { projectId: id, projectName: project.name },
        },
      })
      return NextResponse.json(updated)
    }

    // reject
    if (project.status !== 'PENDING')
      return badRequest('Chỉ có thể từ chối project đang Chờ duyệt')
    const body = rejectSchema.safeParse(await req.json().catch(() => ({})))
    const note = body.success ? body.data.note : ''
    const updated = await prisma.project.update({
      where: { id },
      data: { status: 'REJECTED', adminNote: note || null },
    })
    const noteText = note ? ` Lý do: ${note}` : ''
    await prisma.notification.create({
      data: {
        userId: project.userId,
        type: 'PROJECT_REJECTED',
        title: 'Dự toán bị từ chối',
        body: `Dự toán "${project.name}" bị từ chối.${noteText}`,
        link: '/',
        meta: { projectId: id, projectName: project.name, note },
      },
    })
    return NextResponse.json(updated)
  } catch {
    return serverError()
  }
}
