'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BarChart2, CheckCircle2, Download, Save, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatNumber } from '@/lib/utils'
import { apiFetch, projectsApi } from '@/lib/api/client'
import {
  calcEstimateItemQty,
  getEstimateName,
  getEstimateUnit,
  getEstimateUnitPrice,
  getEstimateWorkKey,
  isEstimateSection,
  serializeEstimateItems,
  type EstimateItemLike,
} from '@/lib/estimate/items'
import {
  DEFAULT_WORK_ITEM_PRICES,
  LEGACY_PROJECT_TEMPLATES,
  buildTemplateConstructionItems,
  type LegacyProjectTemplate,
} from '@/lib/templates/legacy'
import { WORK_ITEM_DIMS } from '@/lib/constants'
import type { Contractor } from '@/lib/types/models'
import type { ConstructionItem } from '@/lib/univer/types'

type TabKey = 'subcontractor' | 'selling' | 'templates'
type SourceKey = 'estimate' | `template:${string}`

const TAB_QUERY: Record<TabKey, string> = {
  subcontractor: 'ntp',
  selling: 'selling',
  templates: 'templates',
}

const TAB_FROM_QUERY: Record<string, TabKey> = {
  ntp: 'subcontractor',
  subcontractor: 'subcontractor',
  selling: 'selling',
  templates: 'templates',
}

interface PriceRow {
  itemId: string
  workItemKey: string
  itemName: string
  unit: string
  qty: number
  sectionName?: string
  costPrice: number
}

interface SubState {
  names: [string, string, string]
  contractorIds: [(number | null), (number | null), (number | null)]
  prices: [Record<string, number>, Record<string, number>, Record<string, number>]
  chosen: Record<string, number | 'lowest' | -1>
  notes: Record<string, string>
}

interface SellState {
  defaultMargin: number
  margins: Record<string, number>
  overrideSell: Record<string, number>
}

const DEFAULT_SUB_STATE: SubState = {
  names: ['Nhà thầu 1', 'Nhà thầu 2', 'Nhà thầu 3'],
  contractorIds: [null, null, null],
  prices: [{}, {}, {}],
  chosen: {},
  notes: {},
}

const DEFAULT_SELL_STATE: SellState = {
  defaultMargin: 1.15,
  margins: {},
  overrideSell: {},
}

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

function normalizeSourceParam(value: string, projectId: string | null): SourceKey {
  if (value === 'estimate' && projectId) return 'estimate'
  if (value.startsWith('template:') && LEGACY_PROJECT_TEMPLATES.some((item) => `template:${item.id}` === value)) return value as SourceKey
  return projectId ? 'estimate' : `template:${LEGACY_PROJECT_TEMPLATES[0]!.id}`
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Đang tải...</div>}>
      <PricingContent />
    </Suspense>
  )
}

function PricingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { showToast } = useToast()
  const projectId = searchParams.get('projectId')
  const viewParam = searchParams.get('view') ?? ''
  const sourceParam = searchParams.get('source') ?? ''
  const selectedTab = TAB_FROM_QUERY[viewParam] ?? (projectId ? 'subcontractor' : 'templates')
  const selectedSource = normalizeSourceParam(sourceParam, projectId)

  const { data: project, isLoading, refetch: refetchProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId!),
    enabled: !!projectId,
  })
  const { data: contractors = [] } = useQuery({ queryKey: ['contractors', 'ACTIVE'], queryFn: fetchContractors })

  const [tab, setTab] = useState<TabKey>(selectedTab)
  const [source, setSource] = useState<SourceKey>(selectedSource)
  const [subState, setSubState] = useState<SubState>(DEFAULT_SUB_STATE)
  const [sellState, setSellState] = useState<SellState>(DEFAULT_SELL_STATE)

  useEffect(() => {
    setTab(selectedTab)
    setSource(selectedSource)
  }, [selectedTab, selectedSource])

  const rows = useMemo(() => {
    if (source === 'estimate') return buildRowsFromProject(project)
    const template = LEGACY_PROJECT_TEMPLATES.find((item) => `template:${item.id}` === source)
    return template ? buildRowsFromTemplate(template) : []
  }, [project, source])

  const storageKey = `anlaa_pricing_state:${projectId ?? 'catalog'}:${source}`

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null') as { subState?: SubState; sellState?: SellState } | null
      setSubState(normalizeSubState(saved?.subState))
      setSellState({ ...DEFAULT_SELL_STATE, ...(saved?.sellState ?? {}) })
    } catch {
      setSubState(DEFAULT_SUB_STATE)
      setSellState(DEFAULT_SELL_STATE)
    }
  }, [storageKey])

  function persist(nextSub = subState, nextSell = sellState) {
    localStorage.setItem(storageKey, JSON.stringify({ subState: nextSub, sellState: nextSell }))
  }

  function updateSub(next: SubState) {
    setSubState(next)
    persist(next, sellState)
  }

  function updateSell(next: SellState) {
    setSellState(next)
    persist(subState, next)
  }

  function pricingHref(nextTab = tab, nextSource = source) {
    const params = new URLSearchParams()
    params.set('view', TAB_QUERY[nextTab])
    params.set('source', nextSource)
    if (projectId) params.set('projectId', projectId)
    return `/pricing?${params.toString()}`
  }

  function goPricing(nextTab = tab, nextSource = source) {
    router.push(pricingHref(nextTab, nextSource))
  }

  useEffect(() => {
    const hasValidView = Boolean(TAB_FROM_QUERY[viewParam])
    if (!hasValidView || sourceParam !== selectedSource) {
      router.replace(pricingHref(selectedTab, selectedSource), { scroll: false })
    }
  }, [router, viewParam, sourceParam, selectedTab, selectedSource])

  function updateContractor(slot: number, rawId: string) {
    const contractorId = rawId ? Number(rawId) : null
    const contractor = contractors.find((item) => item.id === contractorId)
    const next = cloneSubState(subState)
    next.contractorIds[slot] = contractorId
    next.names[slot] = contractor?.name ?? `Nhà thầu ${slot + 1}`

    if (contractor?.priceNotes) {
      const notes = contractor.priceNotes as Record<string, unknown>
      rows.forEach((row) => {
        const val = notes[row.workItemKey]
        if (typeof val === 'number' && val > 0) slotPrices(next, slot)[row.itemId] = val
      })
    }
    updateSub(next)
  }

  function updateNtpPrice(slot: number, itemId: string, value: string) {
    const next = cloneSubState(subState)
    const price = value === '' ? 0 : parseGridNumber(value)
    if (price > 0) slotPrices(next, slot)[itemId] = price
    else delete slotPrices(next, slot)[itemId]
    updateSub(next)
  }

  function pasteNtpPrices(startIndex: number, startSlot: number, text: string) {
    const next = cloneSubState(subState)
    text.replace(/\r/g, '').split('\n').filter((line) => line.length > 0).forEach((line, rowOffset) => {
      const row = rows[startIndex + rowOffset]
      if (!row) return
      line.split('\t').forEach((cell, colOffset) => {
        const slot = startSlot + colOffset
        if (slot < 0 || slot > 2) return
        const price = parseGridNumber(cell)
        if (price > 0) slotPrices(next, slot)[row.itemId] = price
        else delete slotPrices(next, slot)[row.itemId]
      })
    })
    updateSub(next)
  }

  function focusNtpCell(rowIndex: number, slot: number) {
    window.requestAnimationFrame(() => {
      const input = document.querySelector<HTMLInputElement>(`[data-ntp-cell="${rowIndex}:${slot}"]`)
      input?.focus()
      input?.select()
    })
  }

  function moveNtpCell(rowIndex: number, slot: number, rowDelta: number, slotDelta: number) {
    const nextSlot = slot + slotDelta
    const wrappedSlot = ((nextSlot % 3) + 3) % 3
    const wrapDelta = nextSlot > 2 ? 1 : nextSlot < 0 ? -1 : 0
    const nextRow = Math.max(0, Math.min(rows.length - 1, rowIndex + rowDelta + wrapDelta))
    focusNtpCell(nextRow, wrappedSlot)
  }

  function handleNtpKeyDown(e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, slot: number) {
    if (e.key === 'Enter') {
      e.preventDefault()
      moveNtpCell(rowIndex, slot, e.shiftKey ? -1 : 1, 0)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      moveNtpCell(rowIndex, slot, 0, e.shiftKey ? -1 : 1)
    } else if (e.key === 'Escape') {
      e.currentTarget.blur()
    }
  }

  function handleNtpPaste(e: React.ClipboardEvent<HTMLInputElement>, rowIndex: number, slot: number) {
    const text = e.clipboardData.getData('text')
    if (!text.includes('\t') && !text.includes('\n')) return
    e.preventDefault()
    pasteNtpPrices(rowIndex, slot, text)
    const pastedRows = text.replace(/\r/g, '').split('\n').filter((line) => line.length > 0)
    const lastRow = Math.min(rows.length - 1, rowIndex + Math.max(0, pastedRows.length - 1))
    const lastSlot = Math.min(2, slot + Math.max(0, (pastedRows.at(-1) ?? '').split('\t').length - 1))
    focusNtpCell(lastRow, lastSlot)
  }

  function updateChosen(itemId: string, value: string) {
    const next = cloneSubState(subState)
    next.chosen[itemId] = value === 'lowest' ? 'lowest' : Number(value)
    updateSub(next)
  }

  function updateNote(itemId: string, value: string) {
    const next = cloneSubState(subState)
    next.notes[itemId] = value
    updateSub(next)
  }

  function updateMargin(itemId: string, value: string) {
    const next = { ...sellState, margins: { ...sellState.margins }, overrideSell: { ...sellState.overrideSell } }
    next.margins[itemId] = Number(value) || 1
    delete next.overrideSell[itemId]
    updateSell(next)
  }

  function updateSellUnit(itemId: string, value: string) {
    const next = { ...sellState, overrideSell: { ...sellState.overrideSell } }
    const price = value === '' ? 0 : Number(value) || 0
    if (price > 0) next.overrideSell[itemId] = price
    else delete next.overrideSell[itemId]
    updateSell(next)
  }

  function exportCsv(kind: 'ntp' | 'selling') {
    const csv = kind === 'ntp' ? buildNtpCsv(rows, subState) : buildSellingCsv(rows, sellState)
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = kind === 'ntp' ? 'so-sanh-nha-thau.csv' : 'bang-gia-ban-cong-ty.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function savePricesToContractors() {
    const selectedSlots = [0, 1, 2].filter((slot) => subState.contractorIds[slot])
    if (selectedSlots.length === 0) {
      showToast('Chưa chọn nhà thầu để lưu đơn giá', 'error')
      return
    }

    try {
      await Promise.all(selectedSlots.map(async (slot) => {
        const contractorId = subState.contractorIds[slot]
        const contractor = contractors.find((item) => item.id === contractorId)
        if (!contractorId || !contractor) return
        const priceNotes = { ...(contractor.priceNotes ?? {}) }
        rows.forEach((row) => {
          const price = slotPrices(subState, slot)[row.itemId] || 0
          if (price > 0) priceNotes[row.workItemKey] = price
        })
        await apiFetch(`/contractors/${contractorId}`, {
          method: 'PUT',
          body: JSON.stringify({ priceNotes }),
        })
      }))
      showToast('Đã lưu đơn giá vào hồ sơ nhà thầu', 'success')
    } catch (e) {
      showToast((e as Error).message || 'Lỗi lưu đơn giá nhà thầu', 'error')
    }
  }

  async function applyNtpPrices(mode: 'lowest' | 'chosen') {
    if (!projectId || source !== 'estimate') {
      showToast('Cần mở bảng giá từ một dự án để áp giá vào dự toán', 'error')
      return
    }

    const priceByKey: Record<string, number> = {}
    rows.forEach((row) => {
      const price = mode === 'lowest' ? getLowestSlotPrice(row, subState) : getChosenSlotPrice(row, subState)
      if (price > 0) priceByKey[row.workItemKey] = price
    })
    await applyPricesToProject(priceByKey, mode === 'lowest' ? 'Đã áp giá thấp nhất vào dự toán' : 'Đã áp giá đã chọn vào dự toán')
  }

  async function applySellingPrices() {
    if (!projectId || source !== 'estimate') {
      showToast('Cần mở bảng giá từ một dự án để áp giá bán vào dự toán', 'error')
      return
    }

    const priceByKey: Record<string, number> = {}
    rows.forEach((row) => {
      const margin = sellState.margins[row.itemId] ?? sellState.defaultMargin
      priceByKey[row.workItemKey] = sellState.overrideSell[row.itemId] ?? Math.round(row.costPrice * margin)
    })
    await applyPricesToProject(priceByKey, 'Đã áp giá bán công ty vào dự toán')
  }

  async function applyPricesToProject(priceByKey: Record<string, number>, successMessage: string) {
    const data = Array.isArray(project?.data) ? project.data as EstimateItemLike[] : []
    if (Object.keys(priceByKey).length === 0) {
      showToast('Chưa có đơn giá hợp lệ để áp vào dự toán', 'error')
      return
    }
    const nextData = data.map((item) => {
      if (isEstimateSection(item)) return item
      const price = priceByKey[getEstimateWorkKey(item)] || 0
      return price > 0 ? { ...item, unitPrice: price, unitPriceMat: price } : item
    })

    try {
      await projectsApi.update(Number(projectId), { data: serializeEstimateItems(nextData) })
      await refetchProject()
      showToast(successMessage, 'success')
    } catch (e) {
      showToast((e as Error).message || 'Lỗi cập nhật dự toán', 'error')
    }
  }

  if (projectId === '__legacy-empty-state__') {
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

  return (
    <div>
      <PageHeader
        eyebrow="Đơn giá và NTP"
        title="Bảng giá thay G8"
        subtitle={`${(projectId ? project?.name : 'Catalog mẫu') ?? 'Dự án'} · ${rows.length} hạng mục · nguồn ${source === 'estimate' ? 'dự toán' : 'template'}`}
        actions={(
          <>
        <Button variant="secondary" size="sm" onClick={() => router.push(projectId ? `/estimate?projectId=${projectId}` : '/dashboard')}>
          <ArrowLeft size={13} /> {projectId ? 'Về dự toán' : 'Về Dashboard'}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => exportCsv(tab === 'selling' ? 'selling' : 'ntp')}>
          <Download size={13} /> CSV
        </Button>
        <Button size="sm" onClick={() => { persist(); showToast('Đã lưu bảng giá trên trình duyệt', 'success') }}>
          <Save size={13} /> Lưu
        </Button>
          </>
        )}
      />

      <div className="glass-card" style={{ padding: '0.875rem 1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="input-base" value={source} onChange={(e) => goPricing(tab, e.target.value as SourceKey)} style={{ minWidth: 250 }}>
            <option value="estimate">Dự toán hiện tại</option>
            {LEGACY_PROJECT_TEMPLATES.map((template) => (
              <option key={template.id} value={`template:${template.id}`}>{template.name}</option>
            ))}
          </select>

          <div style={{ display: 'inline-flex', border: '1px solid var(--border-glass)', borderRadius: 8, overflow: 'hidden' }}>
            {[
              ['subcontractor', 'So sánh NTP'],
              ['selling', 'Giá bán công ty'],
              ['templates', 'Catalog template'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => goPricing(key as TabKey)}
                style={{
                  border: 0,
                  padding: '0.5rem 0.75rem',
                  background: tab === key ? 'var(--color-primary)' : 'transparent',
                  color: tab === key ? '#001018' : 'var(--text-secondary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'subcontractor' && (
        <SubcontractorPanel
          rows={rows}
          contractors={contractors}
          subState={subState}
          onContractorChange={updateContractor}
          onPriceChange={updateNtpPrice}
          onPriceKeyDown={handleNtpKeyDown}
          onPricePaste={handleNtpPaste}
          onChosenChange={updateChosen}
          onNoteChange={updateNote}
          onSaveToContractors={savePricesToContractors}
          onApplyLowest={() => applyNtpPrices('lowest')}
          onApplyChosen={() => applyNtpPrices('chosen')}
          canApplyToEstimate={!!projectId && source === 'estimate'}
        />
      )}

      {tab === 'selling' && (
        <SellingPanel
          rows={rows}
          sellState={sellState}
          onDefaultMargin={(value) => updateSell({ ...sellState, defaultMargin: value })}
          onMarginChange={updateMargin}
          onSellUnitChange={updateSellUnit}
          onApplySelling={applySellingPrices}
          canApplyToEstimate={!!projectId && source === 'estimate'}
        />
      )}

      {tab === 'templates' && <TemplateCatalog />}
    </div>
  )
}

function SubcontractorPanel({ rows, contractors, subState, onContractorChange, onPriceChange, onPriceKeyDown, onPricePaste, onChosenChange, onNoteChange, onSaveToContractors, onApplyLowest, onApplyChosen, canApplyToEstimate }: {
  rows: PriceRow[]
  contractors: Contractor[]
  subState: SubState
  onContractorChange: (slot: number, rawId: string) => void
  onPriceChange: (slot: number, itemId: string, value: string) => void
  onPriceKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, slot: number) => void
  onPricePaste: (e: React.ClipboardEvent<HTMLInputElement>, rowIndex: number, slot: number) => void
  onChosenChange: (itemId: string, value: string) => void
  onNoteChange: (itemId: string, value: string) => void
  onSaveToContractors: () => void
  onApplyLowest: () => void
  onApplyChosen: () => void
  canApplyToEstimate: boolean
}) {
  const totals = [0, 1, 2].map((slot) => rows.reduce((sum, row) => sum + (slotPrices(subState, slot)[row.itemId] || 0) * row.qty, 0))
  const best = getBestIndex(totals)

  return (
    <>
      <div className="glass-card" style={{ padding: '0.875rem 1rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 700 }}>NHÀ THẦU PHỤ</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem' }}>
          {[0, 1, 2].map((slot) => (
            <select key={slot} className="input-base" value={subState.contractorIds[slot] ?? ''} onChange={(e) => onContractorChange(slot, e.target.value)}>
              <option value="">Nhà thầu {slot + 1}</option>
              {contractors.map((contractor) => <option key={contractor.id} value={contractor.id}>{contractor.name}</option>)}
            </select>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          <Button variant="secondary" size="sm" onClick={onSaveToContractors}><Save size={13} /> Lưu giá vào NTP</Button>
          <Button variant="secondary" size="sm" onClick={onApplyLowest} disabled={!canApplyToEstimate}><CheckCircle2 size={13} /> Áp giá thấp nhất</Button>
          <Button size="sm" onClick={onApplyChosen} disabled={!canApplyToEstimate}><CheckCircle2 size={13} /> Áp giá đã chọn</Button>
        </div>
      </div>

      <PricingTableShell empty={rows.length === 0} emptyText="Chưa có hạng mục để so sánh. Chọn template hoặc mở dự toán có hạng mục.">
        <table style={tableStyle}>
          <thead>
            <tr style={headRowStyle}>
              <th style={th}>#</th>
              <th style={{ ...th, minWidth: 240 }}>Hạng mục</th>
              <th style={th}>ĐVT</th>
              <th style={th}>KL</th>
              {[0, 1, 2].map((slot) => <th key={slot} style={th}>{subState.names[slot]}</th>)}
              {[0, 1, 2].map((slot) => <th key={`total-${slot}`} style={th}>Tổng {slot + 1}</th>)}
              <th style={th}>Chọn</th>
              <th style={{ ...th, minWidth: 160 }}>Ghi chú</th>
            </tr>
          </thead>
          <tbody>{renderNtpRows(rows, subState, onPriceChange, onPriceKeyDown, onPricePaste, onChosenChange, onNoteChange)}</tbody>
          <tfoot>
            <tr style={footRowStyle}>
              <td colSpan={4} style={{ ...td, fontWeight: 800 }}>Tổng cộng</td>
              {[0, 1, 2].map((slot) => <td key={slot} style={td} />)}
              {totals.map((total, slot) => (
                <td key={slot} style={{ ...td, textAlign: 'right', fontWeight: 800, color: best === slot ? '#22c55e' : 'var(--color-primary)' }}>
                  {total > 0 ? `${total.toLocaleString('vi-VN')}đ` : '-'}
                </td>
              ))}
              <td style={td} />
              <td style={td} />
            </tr>
          </tfoot>
        </table>
      </PricingTableShell>
    </>
  )
}

function SellingPanel({ rows, sellState, onDefaultMargin, onMarginChange, onSellUnitChange, onApplySelling, canApplyToEstimate }: {
  rows: PriceRow[]
  sellState: SellState
  onDefaultMargin: (value: number) => void
  onMarginChange: (itemId: string, value: string) => void
  onSellUnitChange: (itemId: string, value: string) => void
  onApplySelling: () => void
  canApplyToEstimate: boolean
}) {
  const summary = rows.reduce((acc, row) => {
    const margin = sellState.margins[row.itemId] ?? sellState.defaultMargin
    const sellUnit = sellState.overrideSell[row.itemId] ?? row.costPrice * margin
    acc.cost += row.costPrice * row.qty
    acc.sell += sellUnit * row.qty
    return acc
  }, { cost: 0, sell: 0 })

  return (
    <>
      <div className="glass-card" style={{ padding: '0.875rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 700 }}>Hệ số mặc định</label>
        <input className="input-base" type="number" value={sellState.defaultMargin} min={0.5} step={0.01} onChange={(e) => onDefaultMargin(Number(e.target.value) || 1)} style={{ width: 100 }} />
        <SummaryPill label="Tổng vốn" value={summary.cost} />
        <SummaryPill label="Tổng bán" value={summary.sell} />
        <SummaryPill label="Lợi nhuận" value={summary.sell - summary.cost} />
        <Button size="sm" onClick={onApplySelling} disabled={!canApplyToEstimate}><CheckCircle2 size={13} /> Áp giá bán vào dự toán</Button>
      </div>

      <PricingTableShell empty={rows.length === 0} emptyText="Chưa có hạng mục để lập bảng giá bán.">
        <table style={tableStyle}>
          <thead>
            <tr style={headRowStyle}>
              <th style={th}>#</th>
              <th style={{ ...th, minWidth: 260 }}>Hạng mục</th>
              <th style={th}>ĐVT</th>
              <th style={th}>KL</th>
              <th style={th}>Đơn giá vốn</th>
              <th style={th}>Tổng vốn</th>
              <th style={th}>Hệ số</th>
              <th style={th}>Đơn giá bán</th>
              <th style={th}>Thành tiền bán</th>
              <th style={th}>LN%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const margin = sellState.margins[row.itemId] ?? sellState.defaultMargin
              const sellUnit = sellState.overrideSell[row.itemId] ?? row.costPrice * margin
              const profitPct = row.costPrice > 0 ? ((sellUnit - row.costPrice) / row.costPrice) * 100 : 0
              return (
                <tr key={row.itemId} style={bodyRowStyle}>
                  <td style={td}>{index + 1}</td>
                  <td style={{ ...td, fontWeight: 700, color: 'var(--text-primary)' }}>{row.itemName}</td>
                  <td style={td}>{row.unit}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{formatNumber(row.qty, 2)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{formatCurrency(row.costPrice)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{formatCurrency(row.costPrice * row.qty)}</td>
                  <td style={td}><input className="input-base" type="number" value={margin} min={0.5} step={0.01} onChange={(e) => onMarginChange(row.itemId, e.target.value)} style={{ width: 82 }} /></td>
                  <td style={td}><input className="input-base" type="number" value={Math.round(sellUnit) || ''} onChange={(e) => onSellUnitChange(row.itemId, e.target.value)} style={{ width: 110, textAlign: 'right' }} /></td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)' }}>{formatCurrency(sellUnit * row.qty)}</td>
                  <td style={{ ...td, color: profitPct >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{profitPct.toFixed(1)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </PricingTableShell>
    </>
  )
}

function TemplateCatalog() {
  const rows = LEGACY_PROJECT_TEMPLATES.flatMap((template) =>
    template.sections.flatMap((section) =>
      section.items.map((item) => ({
        template,
        section: section.name,
        item,
        price: item.price ?? DEFAULT_WORK_ITEM_PRICES[item.key]?.price ?? 0,
        unit: item.unit ?? WORK_ITEM_DIMS[item.key]?.unit ?? DEFAULT_WORK_ITEM_PRICES[item.key]?.unit ?? 'm2',
      }))
    )
  )

  return (
    <PricingTableShell empty={false} emptyText="">
      <table style={tableStyle}>
        <thead>
          <tr style={headRowStyle}>
            <th style={th}>Template</th>
            <th style={th}>Phần</th>
            <th style={{ ...th, minWidth: 260 }}>Hạng mục</th>
            <th style={th}>ĐVT</th>
            <th style={th}>Đơn giá mẫu</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.template.id}-${index}`} style={bodyRowStyle}>
              <td style={{ ...td, fontWeight: 700 }}>{row.template.name}</td>
              <td style={td}>{row.section}</td>
              <td style={{ ...td, color: 'var(--text-primary)' }}>{row.item.name}</td>
              <td style={td}>{row.unit}</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(row.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PricingTableShell>
  )
}

function PricingTableShell({ empty, emptyText, children }: { empty: boolean; emptyText: string; children: React.ReactNode }) {
  if (empty) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        <Table2 size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
        <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{emptyText}</p>
      </div>
    )
  }
  return <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}><div style={{ overflowX: 'auto' }}>{children}</div></div>
}

function renderNtpRows(
  rows: PriceRow[],
  subState: SubState,
  onPriceChange: (slot: number, itemId: string, value: string) => void,
  onPriceKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, slot: number) => void,
  onPricePaste: (e: React.ClipboardEvent<HTMLInputElement>, rowIndex: number, slot: number) => void,
  onChosenChange: (itemId: string, value: string) => void,
  onNoteChange: (itemId: string, value: string) => void
) {
  let sectionName = ''
  let visibleIndex = 0
  const rendered: React.ReactNode[] = []

  rows.forEach((row, rowIndex) => {
    if (row.sectionName && row.sectionName !== sectionName) {
      sectionName = row.sectionName
      rendered.push(<tr key={`section-${sectionName}`} style={sectionRowStyle}><td colSpan={12} style={td}>{sectionName}</td></tr>)
    }
    visibleIndex += 1
    const rowTotals = [0, 1, 2].map((slot) => (slotPrices(subState, slot)[row.itemId] || 0) * row.qty)
    const best = getBestIndex(rowTotals)
    rendered.push(
      <tr key={row.itemId} style={bodyRowStyle}>
        <td style={td}>{visibleIndex}</td>
        <td style={{ ...td, fontWeight: 700, color: 'var(--text-primary)' }}>{row.itemName}</td>
        <td style={td}>{row.unit}</td>
        <td style={{ ...td, textAlign: 'right' }}>{row.qty > 0 ? formatNumber(row.qty, 2) : '-'}</td>
        {[0, 1, 2].map((slot) => (
          <td key={slot} style={td}>
            <input
              className="input-base"
              type="number"
              data-ntp-cell={`${rowIndex}:${slot}`}
              value={slotPrices(subState, slot)[row.itemId] || ''}
              placeholder="0"
              onChange={(e) => onPriceChange(slot, row.itemId, e.target.value)}
              onKeyDown={(e) => onPriceKeyDown(e, rowIndex, slot)}
              onPaste={(e) => onPricePaste(e, rowIndex, slot)}
              style={{ width: 96, textAlign: 'right' }}
            />
          </td>
        ))}
        {rowTotals.map((total, slot) => (
          <td key={slot} style={{ ...td, textAlign: 'right', color: best === slot ? '#22c55e' : 'var(--text-secondary)', fontWeight: total > 0 ? 700 : 400 }}>
            {total > 0 ? formatCurrency(total) : '-'}
          </td>
        ))}
        <td style={td}>
          <select className="input-base" value={subState.chosen[row.itemId] ?? -1} onChange={(e) => onChosenChange(row.itemId, e.target.value)} style={{ minWidth: 110 }}>
            <option value={-1}>-</option>
            <option value="lowest">Rẻ nhất</option>
            {[0, 1, 2].map((slot) => <option key={slot} value={slot}>{subState.names[slot]}</option>)}
          </select>
        </td>
        <td style={td}><input className="input-base" value={subState.notes[row.itemId] || ''} onChange={(e) => onNoteChange(row.itemId, e.target.value)} style={{ minWidth: 150 }} /></td>
      </tr>
    )
  })

  return rendered
}

function buildRowsFromProject(project: Record<string, unknown> | undefined): PriceRow[] {
  const items = Array.isArray(project?.data) ? project.data as EstimateItemLike[] : []
  return items.filter((item) => !isEstimateSection(item)).map((item) => {
    const type = getEstimateWorkKey(item)
    const qty = calcEstimateItemQty(item)
    return {
      itemId: String(item.id ?? `${type}-${item.name ?? ''}`),
      workItemKey: type,
      itemName: getEstimateName(item),
      unit: getEstimateUnit(item),
      qty,
      costPrice: getEstimateUnitPrice(item) || DEFAULT_WORK_ITEM_PRICES[type]?.price || 0,
    }
  })
}

function buildRowsFromTemplate(template: LegacyProjectTemplate): PriceRow[] {
  let sectionName = ''
  return buildTemplateConstructionItems(template)
    .flatMap((item: ConstructionItem) => {
      if (item.type === 'section') {
        sectionName = item.name ?? ''
        return []
      }
      return [{
        itemId: item.id,
        workItemKey: item.type,
        itemName: item.name ?? 'Hạng mục',
        unit: item.unit ?? 'm2',
        qty: numberValue(item.qty),
        sectionName,
        costPrice: numberValue(item.unitPriceMat) + numberValue(item.unitPriceLab),
      }]
    })
}

function normalizeSubState(value: SubState | undefined): SubState {
  if (!value) return cloneSubState(DEFAULT_SUB_STATE)
  return {
    names: (value.names?.length === 3 ? value.names : DEFAULT_SUB_STATE.names) as [string, string, string],
    contractorIds: (value.contractorIds?.length === 3 ? value.contractorIds : DEFAULT_SUB_STATE.contractorIds) as [(number | null), (number | null), (number | null)],
    prices: (value.prices?.length === 3 ? value.prices : DEFAULT_SUB_STATE.prices) as [Record<string, number>, Record<string, number>, Record<string, number>],
    chosen: value.chosen ?? {},
    notes: value.notes ?? {},
  }
}

function cloneSubState(value: SubState): SubState {
  return {
    names: [...value.names] as [string, string, string],
    contractorIds: [...value.contractorIds] as [(number | null), (number | null), (number | null)],
    prices: value.prices.map((item) => ({ ...item })) as [Record<string, number>, Record<string, number>, Record<string, number>],
    chosen: { ...value.chosen },
    notes: { ...value.notes },
  }
}

function slotPrices(state: SubState, slot: number): Record<string, number> {
  return state.prices[slot] ?? state.prices[0]
}

function numberValue(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseGridNumber(value: string): number {
  const compact = value.trim().replace(/\s/g, '')
  const normalized = compact.includes(',') ? compact.replace(/\./g, '').replace(',', '.') : compact
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function getBestIndex(values: number[]): number {
  const positive = values.filter((value) => value > 0)
  return positive.length ? values.indexOf(Math.min(...positive)) : -1
}

function getLowestSlotPrice(row: PriceRow, state: SubState): number {
  const values = [0, 1, 2].map((slot) => slotPrices(state, slot)[row.itemId] || 0).filter((value) => value > 0)
  return values.length ? Math.min(...values) : 0
}

function getChosenSlotPrice(row: PriceRow, state: SubState): number {
  const chosen = state.chosen[row.itemId]
  if (chosen === 'lowest') return getLowestSlotPrice(row, state)
  if (typeof chosen === 'number' && chosen >= 0) return slotPrices(state, chosen)[row.itemId] || 0
  return 0
}

function formatCurrency(value: number): string {
  return value > 0 ? `${Math.round(value).toLocaleString('vi-VN')}đ` : '-'
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: '1px solid var(--border-glass)', borderRadius: 8, padding: '0.45rem 0.75rem' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700 }}>{label}</div>
      <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 800 }}>{formatCurrency(value)}</div>
    </div>
  )
}

function buildNtpCsv(rows: PriceRow[], subState: SubState): string {
  const csvRows = [['STT', 'Hạng mục', 'ĐVT', 'KL', ...subState.names.flatMap((name) => [`ĐG ${name}`, `Tổng ${name}`]), 'Chọn', 'Ghi chú']]
  rows.forEach((row, index) => {
    csvRows.push([
      String(index + 1),
      row.itemName,
      row.unit,
      String(row.qty),
      ...[0, 1, 2].flatMap((slot) => {
        const price = slotPrices(subState, slot)[row.itemId] || 0
        return [String(price), String(price * row.qty)]
      }),
      String(subState.chosen[row.itemId] ?? ''),
      subState.notes[row.itemId] ?? '',
    ])
  })
  return csvRows.map((row) => row.map(csvCell).join(',')).join('\n')
}

function buildSellingCsv(rows: PriceRow[], sellState: SellState): string {
  const csvRows = [['STT', 'Hạng mục', 'ĐVT', 'KL', 'Đơn giá vốn', 'Tổng vốn', 'Hệ số', 'Đơn giá bán', 'Thành tiền bán', 'LN%']]
  rows.forEach((row, index) => {
    const margin = sellState.margins[row.itemId] ?? sellState.defaultMargin
    const sellUnit = sellState.overrideSell[row.itemId] ?? row.costPrice * margin
    const profitPct = row.costPrice > 0 ? ((sellUnit - row.costPrice) / row.costPrice) * 100 : 0
    csvRows.push([String(index + 1), row.itemName, row.unit, String(row.qty), String(row.costPrice), String(row.costPrice * row.qty), String(margin), String(sellUnit), String(sellUnit * row.qty), profitPct.toFixed(1)])
  })
  return csvRows.map((row) => row.map(csvCell).join(',')).join('\n')
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 980 }
const th: React.CSSProperties = { padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '0.55rem 0.75rem', verticalAlign: 'middle' }
const headRowStyle: React.CSSProperties = { borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-card)' }
const bodyRowStyle: React.CSSProperties = { borderBottom: '1px solid var(--border-glass)' }
const sectionRowStyle: React.CSSProperties = { borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.035)', color: 'var(--color-primary)', fontWeight: 800 }
const footRowStyle: React.CSSProperties = { borderTop: '2px solid var(--border-glass)', background: 'var(--bg-card)' }
