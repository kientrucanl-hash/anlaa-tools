import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma, toJson } from '@/lib/db/prisma'
import { getRequestUser, requireAdmin } from '@/lib/auth/middleware'
import { parseId, badRequest, notFound, forbidden, serverError } from '@/lib/api/helpers'

const reviewSchema = z.object({
  adminNote: z.string().trim().max(1000).nullable().default(null),
})

type Params = { id: string; action: string }

export async function PUT(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const user = getRequestUser(req)
    const { id: rawId, action } = await params
    const id = parseId(rawId)
    if (!id) return badRequest('ID không hợp lệ')
    if (!['submit', 'approve', 'reject'].includes(action)) return badRequest('Action không hợp lệ')

    const draft = await prisma.contractorDraft.findUnique({ where: { id } })
    if (!draft) return notFound('Không tìm thấy nháp nhà thầu')

    if (action === 'submit') {
      if (draft.submittedBy !== user.id) return forbidden()
      if (!['DRAFT', 'REJECTED'].includes(draft.status)) return forbidden('Nháp này không thể gửi duyệt')
      const submitted = await prisma.contractorDraft.update({
        where: { id },
        data: { status: 'PENDING', submittedAt: new Date() },
      })
      // Notify admins
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } })
      const payload = draft.payload as Record<string, unknown>
      await prisma.notification.createMany({
        data: admins.map((admin: { id: number }) => ({
          userId: admin.id,
          type: 'SYSTEM' as const,
          title: 'Nháp nhà thầu chờ duyệt',
          body: `${user.username ?? 'User'} đã gửi nháp "${payload.name ?? ''}" để admin phê duyệt.`,
          link: '/admin',
          meta: { draftId: id, submittedBy: user.id },
        })),
      })
      return NextResponse.json(submitted)
    }

    try { requireAdmin(user) } catch { return forbidden() }

    const body = reviewSchema.safeParse(await req.json().catch(() => ({})))
    const adminNote = body.success ? body.data.adminNote : null

    if (action === 'approve') {
      if (draft.status !== 'PENDING') return forbidden('Chỉ duyệt được nháp đang chờ duyệt')
      const payload = draft.payload as Record<string, unknown>

      // Build typed contractor data from untyped draft payload
      const contractorData: Prisma.ContractorUncheckedCreateInput = {
        name: String(payload.name ?? ''),
        type: (payload.type as Prisma.ContractorUncheckedCreateInput['type']) ?? 'TEAM',
        status: (payload.status as Prisma.ContractorUncheckedCreateInput['status']) ?? 'ACTIVE',
        contactName: (payload.contactName as string) ?? null,
        phone: (payload.phone as string) ?? null,
        phone2: (payload.phone2 as string) ?? null,
        email: (payload.email as string) ?? null,
        address: (payload.address as string) ?? null,
        district: (payload.district as string) ?? null,
        city: (payload.city as string) ?? 'Hà Nội',
        workScope: (payload.workScope as string) ?? null,
        taxCode: (payload.taxCode as string) ?? null,
        bankAccount: (payload.bankAccount as string) ?? null,
        bankName: (payload.bankName as string) ?? null,
        rating: typeof payload.rating === 'number' ? payload.rating : 3,
        ratingNote: (payload.ratingNote as string) ?? null,
        projectCount: typeof payload.projectCount === 'number' ? payload.projectCount : 0,
        totalValue: typeof payload.totalValue === 'number' ? payload.totalValue : 0,
        lastProjectAt: typeof payload.lastProjectAt === 'string' ? new Date(payload.lastProjectAt) : null,
        note: (payload.note as string) ?? null,
        specialty: payload.specialty != null ? toJson(payload.specialty) : Prisma.JsonNull,
        priceNotes: payload.priceNotes != null ? toJson(payload.priceNotes) : Prisma.JsonNull,
        createdById: draft.submittedBy,
      }
      let savedId: number
      if (draft.contractorId) {
        const { createdById, ...updateData } = contractorData
        const updated = await prisma.contractor.update({
          where: { id: draft.contractorId },
          data: updateData,
        })
        savedId = updated.id
      } else {
        const created = await prisma.contractor.create({ data: contractorData })
        savedId = created.id
      }

      const reviewed = await prisma.contractorDraft.update({
        where: { id },
        data: { status: 'APPROVED', reviewedBy: user.id, reviewedAt: new Date(), adminNote, contractorId: savedId },
      })
      await prisma.notification.create({
        data: {
          userId: draft.submittedBy,
          type: 'SYSTEM',
          title: 'Nháp nhà thầu đã được duyệt',
          body: `Nháp "${payload.name ?? ''}" đã được admin duyệt và lưu vào danh bạ nhà thầu.`,
          link: '/contractors',
          meta: { draftId: id, contractorId: savedId },
        },
      })
      return NextResponse.json(reviewed)
    }

    // reject
    if (draft.status !== 'PENDING') return forbidden('Chỉ từ chối được nháp đang chờ duyệt')
    const payload = draft.payload as Record<string, unknown>
    const rejected = await prisma.contractorDraft.update({
      where: { id },
      data: { status: 'REJECTED', reviewedBy: user.id, reviewedAt: new Date(), adminNote },
    })
    const note = adminNote ? ` Lý do: ${adminNote}` : ''
    await prisma.notification.create({
      data: {
        userId: draft.submittedBy,
        type: 'SYSTEM',
        title: 'Nháp nhà thầu bị từ chối',
        body: `Nháp "${payload.name ?? ''}" bị admin từ chối.${note}`,
        link: '/contractors',
        meta: { draftId: id },
      },
    })
    return NextResponse.json(rejected)
  } catch {
    return serverError()
  }
}
