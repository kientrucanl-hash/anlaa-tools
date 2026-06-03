'use client'

import { useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatNumber } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

interface MaterialEntry {
  name: string
  unit: string
  qty: number
  purchaseQty: number
  fromItems: string[]
}

interface ConstructionItem {
  id: string
  name?: string
  type?: string
  results?: Record<string, unknown>
}

// ── Material extraction ────────────────────────────────────────────────────

const MATERIAL_MAP: Record<string, { key: string; name: string; unit: string }[]> = {
  masonry:    [{ key: 'bricksCount', name: 'Gạch', unit: 'viên' }, { key: 'cementBags', name: 'Xi măng (xây)', unit: 'bao' }, { key: 'sandM3', name: 'Cát (xây)', unit: 'm³' }],
  plastering: [{ key: 'cementBags', name: 'Xi măng (trát)', unit: 'bao' }, { key: 'sandM3', name: 'Cát (trát)', unit: 'm³' }],
  tiling:     [{ key: 'boxesCount', name: 'Gạch ốp/lát', unit: 'hộp' }, { key: 'adhesiveBags', name: 'Keo dán gạch', unit: 'túi' }, { key: 'groutKg', name: 'Keo chà ron', unit: 'kg' }, { key: 'clipsPacks', name: 'Clip chỉnh phẳng', unit: 'gói' }],
}

function extractMaterials(items: ConstructionItem[]): MaterialEntry[] {
  const map = new Map<string, MaterialEntry>()

  for (const item of items) {
    const type = item.type ?? ''
    const defs = MATERIAL_MAP[type] ?? []
    const results = item.results ?? {}
    const itemName = item.name ?? `Hạng mục ${item.id.slice(0, 6)}`

    for (const def of defs) {
      const raw = typeof results[def.key] === 'number' ? (results[def.key] as number) : 0
      if (raw <= 0) continue
      const purchase = Math.ceil(raw)
      const key = def.name
      const existing = map.get(key)
      if (existing) {
        existing.qty += raw
        existing.purchaseQty += purchase
        existing.fromItems.push(itemName)
      } else {
        map.set(key, { name: def.name, unit: def.unit, qty: raw, purchaseQty: purchase, fromItems: [itemName] })
      }
    }

    // Auto plaster from masonry
    if (type === 'masonry' && results.autoPlaster && typeof results.autoPlaster === 'object') {
      const ap = results.autoPlaster as Record<string, unknown>
      if (typeof ap.cementBags === 'number' && ap.cementBags > 0) {
        const key = 'Xi măng (trát tường)'
        const existing = map.get(key)
        if (existing) { existing.qty += ap.cementBags; existing.purchaseQty += Math.ceil(ap.cementBags); existing.fromItems.push(itemName) }
        else map.set(key, { name: 'Xi măng (trát tường)', unit: 'bao', qty: ap.cementBags as number, purchaseQty: Math.ceil(ap.cementBags as number), fromItems: [itemName] })
      }
      if (typeof ap.sandM3 === 'number' && ap.sandM3 > 0) {
        const key = 'Cát (trát tường)'
        const existing = map.get(key)
        if (existing) { existing.qty += ap.sandM3; existing.purchaseQty += Math.ceil(ap.sandM3 * 10) / 10; existing.fromItems.push(itemName) }
        else map.set(key, { name: 'Cát (trát tường)', unit: 'm³', qty: ap.sandM3 as number, purchaseQty: Math.ceil(ap.sandM3 as number * 10) / 10, fromItems: [itemName] })
      }
    }
  }

  return Array.from(map.values())
}

// ── Fetch ──────────────────────────────────────────────────────────────────

async function fetchProject(id: string) {
  const res = await fetch(`/api/projects/${id}`)
  if (!res.ok) throw new Error('Không tìm thấy dự án')
  return res.json()
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function MaterialsPage() {
  return <Suspense fallback={<div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Đang tải...</div>}><MaterialsContent /></Suspense>
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
    return extractMaterials(project.data as ConstructionItem[])
  }, [project])

  function exportCsv() {
    const header = 'STT,Vật tư,ĐVT,SL tính toán,SL mua\n'
    const rows = materials.map((m, i) => `${i + 1},"${m.name}","${m.unit}","${formatNumber(m.qty)}","${m.purchaseQty}"`)
    const csv = header + rows.join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `vat-tu-${project?.name ?? 'du-an'}.csv`; a.click()
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Vật tư cần mua</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 2 }}>
            {project?.name} · {materials.length} loại vật tư
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => router.push(`/estimate?projectId=${projectId}`)}>
          <ArrowLeft size={13} /> Về dự toán
        </Button>
        {materials.length > 0 && (
          <Button size="sm" onClick={exportCsv}><Download size={13} /> Xuất CSV</Button>
        )}
      </div>

      {materials.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Package size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Chưa có dữ liệu vật tư</p>
          <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>Dự án cần có hạng mục đã tính toán (xây, trát, lát) để xuất vật tư</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}>
                {['#', 'Tên vật tư', 'ĐVT', 'SL tính toán', 'SL cần mua', 'Từ hạng mục'].map((h) => (
                  <th key={h} style={{ padding: '0.6rem 1rem', textAlign: h === 'SL tính toán' || h === 'SL cần mua' ? 'right' : 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.73rem', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materials.map((m, i) => (
                <tr key={m.name} style={{ borderBottom: i < materials.length - 1 ? '1px solid var(--border-glass)' : undefined }}>
                  <td style={{ padding: '0.7rem 1rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ padding: '0.7rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</td>
                  <td style={{ padding: '0.7rem 1rem', color: 'var(--text-muted)' }}>{m.unit}</td>
                  <td style={{ padding: '0.7rem 1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatNumber(m.qty, 2)}</td>
                  <td style={{ padding: '0.7rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                    {formatNumber(m.purchaseQty, 1)}
                  </td>
                  <td style={{ padding: '0.7rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {[...new Set(m.fromItems)].join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
