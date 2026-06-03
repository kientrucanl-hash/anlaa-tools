'use client'

import { useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BarChart2, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { formatNumber } from '@/lib/utils'
import type { Contractor } from '@/lib/types/models'

// ── Types ──────────────────────────────────────────────────────────────────

interface PriceRow {
  itemId: string
  itemName: string
  unit: string
  qty: number
  prices: (number | null)[]
  chosen: number // index of chosen contractor 0-2
}

// ── Fetch ──────────────────────────────────────────────────────────────────

async function fetchProject(id: string) {
  const res = await fetch(`/api/projects/${id}`)
  if (!res.ok) throw new Error('Không tìm thấy dự án')
  return res.json()
}
async function fetchContractors(): Promise<Contractor[]> {
  const res = await fetch('/api/contractors?status=ACTIVE')
  if (!res.ok) return []
  return res.json()
}

function getUnit(type?: string): string {
  if (type === 'masonry') return 'm²'
  if (type === 'plastering') return 'm²'
  if (type === 'tiling') return 'm²'
  return 'm²'
}
function getQty(item: Record<string, unknown>): number {
  const r = (item.results ?? {}) as Record<string, unknown>
  return typeof r.netArea === 'number' ? r.netArea : (typeof r.area === 'number' ? r.area : 0)
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { showToast } = useToast()
  const projectId = searchParams.get('projectId')

  const { data: project, isLoading } = useQuery({ queryKey: ['project', projectId], queryFn: () => fetchProject(projectId!), enabled: !!projectId })
  const { data: contractors = [] } = useQuery({ queryKey: ['contractors', 'ACTIVE'], queryFn: fetchContractors })

  const [ntpNames, setNtpNames] = useState(['', '', ''])
  const [rows, setRows] = useState<PriceRow[] | null>(null)

  // Init rows from project data when loaded
  const initRows = useCallback(() => {
    if (!project?.data) return
    return (project.data as Array<Record<string, unknown>>).map((item) => ({
      itemId: String(item.id ?? ''),
      itemName: String(item.name ?? 'Hạng mục'),
      unit: getUnit(String(item.type ?? '')),
      qty: getQty(item),
      prices: [null, null, null] as (number | null)[],
      chosen: 0,
    }))
  }, [project])

  const displayRows: PriceRow[] = rows ?? (project ? (initRows() ?? []) : [])

  function updatePrice(rowIdx: number, colIdx: number, val: string) {
    const next = [...displayRows]
    if (next[rowIdx]) {
      const prices = [...next[rowIdx].prices]
      prices[colIdx] = val === '' ? null : parseFloat(val) || 0
      next[rowIdx] = { ...next[rowIdx], prices }
      setRows(next)
    }
  }

  function updateChosen(rowIdx: number, val: number) {
    const next = [...displayRows]
    if (next[rowIdx]) { next[rowIdx] = { ...next[rowIdx], chosen: val }; setRows(next) }
  }

  function totals() {
    return [0, 1, 2].map((ci) => displayRows.reduce((sum, r) => sum + (r.prices[ci] ?? 0) * r.qty, 0))
  }

  function cheapestIdx() {
    const t = totals()
    const valid = t.filter(v => v > 0)
    if (valid.length === 0) return -1
    return t.indexOf(Math.min(...valid.filter(v => v > 0)))
  }

  function handleSave() {
    showToast('Đã lưu bảng giá', 'success')
  }

  if (!projectId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: '1rem', color: 'var(--text-muted)' }}>
        <BarChart2 size={48} style={{ opacity: 0.3 }} />
        <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Chưa chọn dự án</p>
        <p style={{ fontSize: '0.85rem' }}>Mở một dự án từ Dashboard để so sánh bảng giá NTP</p>
        <Button variant="secondary" size="sm" onClick={() => router.push('/dashboard')}><ArrowLeft size={13} /> Về Dashboard</Button>
      </div>
    )
  }

  if (isLoading) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Đang tải...</div>

  const t = totals()
  const cheap = cheapestIdx()

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Bảng Giá & NTP</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 2 }}>{project?.name} · So sánh 3 nhà thầu phụ</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => router.push(`/estimate?projectId=${projectId}`)}>
          <ArrowLeft size={13} /> Về dự toán
        </Button>
        <Button size="sm" onClick={handleSave}><Save size={13} /> Lưu</Button>
      </div>

      {/* NTP name row */}
      <div className="glass-card" style={{ padding: '0.875rem 1rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>CHỌN / ĐẶT TÊN NHÀ THẦU PHỤ</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <select className="input-base" style={{ width: '100%', marginBottom: '0.3rem', fontSize: '0.8rem' }}
                value={ntpNames[i] || ''}
                onChange={(e) => {
                  const next = [...ntpNames]; next[i] = e.target.value; setNtpNames(next)
                }}>
                <option value="">-- Tự nhập --</option>
                {(contractors as Contractor[]).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <input className="input-base" style={{ width: '100%', fontWeight: 600 }}
                placeholder={`NTP ${i + 1}`} value={ntpNames[i] ?? ''}
                onChange={(e) => { const next = [...ntpNames]; next[i] = e.target.value; setNtpNames(next) }} />
            </div>
          ))}
        </div>
      </div>

      {/* Pricing table */}
      {displayRows.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <BarChart2 size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Dự án chưa có hạng mục nào</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 800 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}>
                  <th style={th}>#</th>
                  <th style={{ ...th, width: '25%' }}>Hạng mục</th>
                  <th style={th}>ĐVT</th>
                  <th style={th}>KL</th>
                  {[0, 1, 2].map((i) => (
                    <th key={i} style={{ ...th, color: i === cheap && t[i]! > 0 ? '#22c55e' : undefined }}>
                      {ntpNames[i] || `NTP ${i + 1}`} (đ/ĐVT)
                    </th>
                  ))}
                  {[0, 1, 2].map((i) => (
                    <th key={`t${i}`} style={{ ...th, color: i === cheap && t[i]! > 0 ? '#22c55e' : undefined }}>
                      Thành tiền {i + 1}
                    </th>
                  ))}
                  <th style={th}>Chọn</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, ri) => (
                  <tr key={row.itemId} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ ...td, color: 'var(--text-muted)' }}>{ri + 1}</td>
                    <td style={{ ...td, fontWeight: 600, color: 'var(--text-primary)' }}>{row.itemName}</td>
                    <td style={{ ...td, color: 'var(--text-muted)' }}>{row.unit}</td>
                    <td style={{ ...td, textAlign: 'right', color: 'var(--text-secondary)' }}>{formatNumber(row.qty, 1)}</td>
                    {[0, 1, 2].map((ci) => (
                      <td key={ci} style={td}>
                        <input className="input-base" type="number" style={{ width: 90, textAlign: 'right' }}
                          value={row.prices[ci] ?? ''} placeholder="0"
                          onChange={(e) => updatePrice(ri, ci, e.target.value)} />
                      </td>
                    ))}
                    {[0, 1, 2].map((ci) => {
                      const val = (row.prices[ci] ?? 0) * row.qty
                      const isMin = val > 0 && [0, 1, 2].every((x) => x === ci || (row.prices[x] ?? 0) * row.qty >= val || (row.prices[x] ?? 0) === 0)
                      return (
                        <td key={`t${ci}`} style={{ ...td, textAlign: 'right', fontWeight: val > 0 ? 600 : undefined, color: isMin ? '#22c55e' : 'var(--text-secondary)' }}>
                          {val > 0 ? val.toLocaleString('vi-VN') : '—'}
                        </td>
                      )
                    })}
                    <td style={td}>
                      <select className="input-base" style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
                        value={row.chosen} onChange={(e) => updateChosen(ri, parseInt(e.target.value))}>
                        {[0, 1, 2].map((i) => <option key={i} value={i}>{ntpNames[i] || `NTP ${i + 1}`}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border-glass)', background: 'var(--bg-card)' }}>
                  <td colSpan={4} style={{ ...td, fontWeight: 700, color: 'var(--text-primary)' }}>Tổng cộng</td>
                  {t.map((total, i) => <td key={i} style={{ ...td }} />)}
                  {t.map((total, i) => (
                    <td key={`t${i}`} style={{ ...td, textAlign: 'right', fontWeight: 700, color: i === cheap && total > 0 ? '#22c55e' : 'var(--color-primary)', fontSize: '0.88rem' }}>
                      {total > 0 ? total.toLocaleString('vi-VN') + 'đ' : '—'}
                      {i === cheap && total > 0 && <span style={{ fontSize: '0.65rem', marginLeft: 3 }}>✓ rẻ nhất</span>}
                    </td>
                  ))}
                  <td style={td} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.72rem', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '0.55rem 0.75rem' }
