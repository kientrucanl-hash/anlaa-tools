import { redirect } from 'next/navigation'

export default async function MaterialsProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/materials?projectId=${encodeURIComponent(id)}`)
}
