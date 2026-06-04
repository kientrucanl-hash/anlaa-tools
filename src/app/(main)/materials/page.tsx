'use client'

import { useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, Package, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/layout/PageHeader'
import { extractMaterialsFromEstimateItems, type EstimateItemLike } from '@/lib/estimate/items'
import { formatNumber } from '@/lib/utils'

async function fetchProject(id: string) {
  const res = await fetch(`/api/projects/${id}`)
  if (!res.ok) throw new Error('Không tìm thấy dự án')
  return res.json()
}

export default function MaterialsPage() {
  return (
    <Suspense fallback={<div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Đang tải...</div>}>
      <MaterialsContent />
    </Suspense>
  )
}

function MaterialsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectId = searchParams.get('projectId')

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId!),
    enabled: !!projectId,
  })

  const materials = useMemo(() => {
    if (!project?.data) return []
    return extractMaterialsFromEstimateItems(project.data as EstimateItemLike[])
  }, [project])

  function exportCsv() {
    const header = 'STT,Vật tư,ĐVT,Quy cách,SL tính toán,SL mua,Từ hạng mục\n'
    const rows = materials.map((m, i) => [
      i + 1,
      csvCell(m.name),
      csvCell(m.unit),
      csvCell(m.packUnit),
      csvCell(formatNumber(m.qty, 2)),
      csvCell(formatNumber(m.purchaseQty, 1)),
      csvCell([...new Set(m.fromItems)].join(', ')),
    ].join(','))
    const blob = new Blob([`\ufeff${header}${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vat-tu-${project?.name ?? 'du-an'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!projectId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: '1rem', color: 'var(--text-muted)' }}>
        <Package size={48} style={{ opacity: 0.3 }} />
        <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Chưa chọn dự án</p>
        <p style={{ fontSize: '0.85rem' }}>Mở một dự án từ Dashboard để xem danh sách vật tư cần mua</p>
        <Button variant="secondary" size="sm" onClick={() => router.push('/dashboard')}>
          <ArrowLeft size={13} /> Về Dashboard
        </Button>
      </div>
    )
  }

  if (isLoading) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Đang tải...</div>
  if (error) return <div style={{ color: '#ef4444', padding: '2rem' }}>Lỗi: {(error as Error).message}</div>

  return (
    <div>
      <PageHeader
        eyebrow="Bóc vật tư"
        title="Vật tư cần mua"
        subtitle={`${project?.name ?? 'Dự án'} · ${materials.length} loại vật tư từ bảng dự toán`}
        actions={(
          <>
        <Button variant="secondary" size="sm" onClick={() => router.push(`/estimate/${projectId}`)}>
          <ArrowLeft size={13} /> Về dự toán
        </Button>
        {materials.length > 0 && (
          <>
            <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={13} /> In</Button>
            <Button size="sm" onClick={exportCsv}><Download size={13} /> Xuất CSV</Button>
          </>
        )}
          </>
        )}
      />

      {materials.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Package size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Chưa có dữ liệu vật tư</p>
          <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>Dự án cần có hạng mục đã nhập khối lượng và có định mức vật tư.</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}>
                  {['#', 'Tên vật tư', 'ĐVT', 'Quy cách', 'SL tính toán', 'SL cần mua', 'Từ hạng mục'].map((head) => (
                    <th key={head} style={{ padding: '0.6rem 1rem', textAlign: head.startsWith('SL') ? 'right' : 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.73rem', whiteSpace: 'nowrap' }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {materials.map((m, i) => (
                  <tr key={m.key} style={{ borderBottom: i < materials.length - 1 ? '1px solid var(--border-glass)' : undefined }}>
                    <td style={cellMuted}>{i + 1}</td>
                    <td style={{ ...cell, fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</td>
                    <td style={cellMuted}>{m.unit}</td>
                    <td style={cellMuted}>{m.packUnit}</td>
                    <td style={{ ...cell, textAlign: 'right', color: 'var(--text-secondary)' }}>{formatNumber(m.qty, 2)}</td>
                    <td style={{ ...cell, textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>{formatNumber(m.purchaseQty, 1)}</td>
                    <td style={{ ...cell, color: 'var(--text-muted)', fontSize: '0.78rem' }}>{[...new Set(m.fromItems)].join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

const cell: React.CSSProperties = {
  padding: '0.7rem 1rem',
  verticalAlign: 'top',
}

const cellMuted: React.CSSProperties = {
  ...cell,
  color: 'var(--text-muted)',
}
