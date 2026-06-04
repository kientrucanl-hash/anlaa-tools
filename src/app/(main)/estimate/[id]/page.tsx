import { redirect } from 'next/navigation'

export default async function EstimateProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/estimate?projectId=${encodeURIComponent(id)}`)
}
