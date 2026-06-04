'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BarChart2, ChevronLeft, Copy, Download, FolderPlus, LayoutTemplate, Plus, Save, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PageHeader } from '@/components/layout/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { useProject, useSubmitProject } from '@/lib/hooks/useProjects'
import { projectsApi } from '@/lib/api/client'
import { DEFAULT_REGION, REGION_PRICES, WORK_ITEM_DIMS } from '@/lib/constants'
import { LEGACY_PROJECT_TEMPLATES, buildTemplateConstructionItems } from '@/lib/templates/legacy'
import type { ConstructionItem } from '@/lib/univer/types'

type SaveState = 'idle' | 'syncing' | 'saved' | 'error'
type EstimateCellKey = 'desc' | 'l' | 'w' | 'h' | 'n' | 'hs'

interface EstimateRow {
  desc?: string
  name?: string
  description?: string
  l?: number | string | null
  w?: number | string | null
  h?: number | string | null
  length?: number | string | null
  width?: number | string | null
  height?: number | string | null
  n?: number | string | null
  hs?: number | string | null
  coeff?: number | string | null
}

interface EstimateItem {
  id: string
  type?: string
  workItemKey?: string
  name?: string
  unit?: string
  qty?: number
  unitPrice?: number
  unitPriceMat?: number
  unitPriceLab?: number
  isAuto?: boolean
  expanded?: boolean
  rows?: EstimateRow[]
  stt?: string | number
}

const DEFAULT_PRICES = REGION_PRICES[DEFAULT_REGION].prices
const DETAIL_CELL_ORDER: EstimateCellKey[] = ['desc', 'l', 'w', 'h', 'n', 'hs']
const UNITS = ['m²', 'm³', 'md', 'm', 'cái', 'bộ', 'kg', 'tấm', 'bao', 'viên']

function EstimateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId') ? Number(searchParams.get('projectId')) : null
  const { showToast } = useToast()
  const { data: project, isLoading: projectLoading, refetch } = useProject(projectId)
  const submitProject = useSubmitProject()

  const [items, setItems] = useState<EstimateItem[]>([])
  const [contingencyEnabled, setContingencyEnabled] = useState(false)
  const [contingencyPct, setContingencyPct] = useState(5)
  const [vatEnabled, setVatEnabled] = useState(false)
  const [vatPct, setVatPct] = useState(10)
  const [roundingEnabled, setRoundingEnabled] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [showTemplates, setShowTemplates] = useState(false)

  const canEdit = project ? ['DRAFT', 'REJECTED'].includes(String(project.status)) : false

  useEffect(() => {
    if (!project) return
    setItems(normalizeItems(Array.isArray(project.data) ? project.data as unknown[] : []))
  }, [project])

  useEffect(() => {
    if (!projectId) return
    try {
      const saved = JSON.parse(localStorage.getItem(`anlaa_estimate_settings:${projectId}`) || 'null') as {
        contingencyEnabled?: boolean
        contingencyPct?: number
        vatEnabled?: boolean
        vatPct?: number
        roundingEnabled?: boolean
      } | null
      if (!saved) return
      setContingencyEnabled(!!saved.contingencyEnabled)
      setContingencyPct(Number(saved.contingencyPct) || 5)
      setVatEnabled(!!saved.vatEnabled)
      setVatPct(Number(saved.vatPct) || 10)
      setRoundingEnabled(!!saved.roundingEnabled)
    } catch {
      // Ignore broken local settings and keep sane defaults.
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    localStorage.setItem(`anlaa_estimate_settings:${projectId}`, JSON.stringify({
      contingencyEnabled,
      contingencyPct,
      vatEnabled,
      vatPct,
      roundingEnabled,
    }))
  }, [projectId, contingencyEnabled, contingencyPct, vatEnabled, vatPct, roundingEnabled])

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      if (isSection(item)) return sum
      return sum + calcItemTotalQty(item) * getUnitPrice(item)
    }, 0)
    const contingency = contingencyEnabled ? subtotal * (contingencyPct / 100) : 0
    const beforeVat = subtotal + contingency
    const vat = vatEnabled ? beforeVat * (vatPct / 100) : 0
    const beforeRound = beforeVat + vat
    const grand = roundingEnabled ? Math.round(beforeRound / 1000) * 1000 : beforeRound
    return { subtotal, contingency, beforeVat, vat, beforeRound, rounding: grand - beforeRound, grand }
  }, [items, contingencyEnabled, contingencyPct, vatEnabled, vatPct, roundingEnabled])

  function setAndSave(next: EstimateItem[]) {
    const normalized = normalizeItems(next)
    setItems(normalized)
    void saveItems(normalized)
  }

  async function saveItems(next = items) {
    if (!projectId || !canEdit) return
    setSaveState('syncing')
    try {
      await projectsApi.update(projectId, { data: serializeItems(next) })
      setSaveState('saved')
      void refetch()
    } catch {
      setSaveState('error')
      showToast('Lỗi lưu dự toán', 'error')
    }
  }

  function addSection() {
    const name = prompt('Tên phần / chương', `Phần ${items.filter(isSection).length + 1}`)
    if (!name) return
    setAndSave([...items, { id: genId(), type: 'section', name, stt: `P${items.filter(isSection).length + 1}` }])
  }

  function addItem() {
    setAndSave([
      ...items,
      {
        id: genId(),
        type: 'custom',
        workItemKey: 'custom',
        name: '',
        unit: 'm²',
        unitPrice: 0,
        unitPriceMat: 0,
        unitPriceLab: 0,
        expanded: true,
        rows: [blankRow()],
      },
    ])
  }

  function applyTemplate(templateId: string) {
    const template = LEGACY_PROJECT_TEMPLATES.find((item) => item.id === templateId)
    if (!template) return
    setAndSave(buildTemplateConstructionItems(template).map(fromTemplateItem))
    setShowTemplates(false)
    showToast('Đã áp dụng mẫu dự toán', 'success')
  }

  function updateItem(itemId: string, patch: Partial<EstimateItem>) {
    setAndSave(items.map((item) => item.id === itemId ? normalizeItem({ ...item, ...patch }) : item))
  }

  function updateRow(itemId: string, rowIndex: number, patch: Partial<EstimateRow>) {
    setAndSave(items.map((item) => {
      if (item.id !== itemId) return item
      const rows = normalizeRows(item.rows)
      rows[rowIndex] = { ...rows[rowIndex], ...patch }
      return normalizeItem({ ...item, rows })
    }))
  }

  function addDetailRow(itemId: string) {
    setAndSave(items.map((item) => item.id === itemId ? normalizeItem({ ...item, rows: [...normalizeRows(item.rows), blankRow()] }) : item))
  }

  function removeDetailRow(itemId: string, rowIndex: number) {
    setAndSave(items.map((item) => {
      if (item.id !== itemId) return item
      const rows = normalizeRows(item.rows)
      if (rows.length <= 1) return item
      return normalizeItem({ ...item, rows: rows.filter((_, index) => index !== rowIndex) })
    }))
  }

  function removeItem(itemId: string) {
    setAndSave(items.filter((item) => item.id !== itemId))
  }

  function focusCell(itemId: string, rowIndex: number, field: EstimateCellKey) {
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-est-cell="${itemId}:${rowIndex}:${field}"]`)
      el?.focus()
      if (el instanceof HTMLInputElement) el.select()
    })
  }

  function moveCell(itemId: string, rowIndex: number, field: EstimateCellKey, rowDelta: number, colDelta: number) {
    const item = items.find((entry) => entry.id === itemId)
    if (!item) return
    const rows = normalizeRows(item.rows)
    const currentCol = DETAIL_CELL_ORDER.indexOf(field)
    let nextCol = Math.max(0, Math.min(DETAIL_CELL_ORDER.length - 1, currentCol + colDelta))
    let nextRow = rowIndex + rowDelta

    if (colDelta > 0 && currentCol === DETAIL_CELL_ORDER.length - 1) {
      nextCol = 0
      nextRow = rowIndex + 1
    } else if (colDelta < 0 && currentCol === 0) {
      nextCol = DETAIL_CELL_ORDER.length - 1
      nextRow = rowIndex - 1
    }

    if (nextRow < 0) nextRow = 0
    if (nextRow >= rows.length) {
      setAndSave(items.map((entry) => entry.id === itemId ? normalizeItem({ ...entry, rows: [...rows, blankRow()] }) : entry))
    }
    focusCell(itemId, nextRow, DETAIL_CELL_ORDER[nextCol] ?? field)
  }

  function handleDetailKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, itemId: string, rowIndex: number, field: EstimateCellKey) {
    if (!canEdit) return
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        addDetailRow(itemId)
        const item = items.find((entry) => entry.id === itemId)
        focusCell(itemId, normalizeRows(item?.rows).length, 'desc')
      } else {
        moveCell(itemId, rowIndex, field, e.shiftKey ? -1 : 1, 0)
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      moveCell(itemId, rowIndex, field, 0, e.shiftKey ? -1 : 1)
    } else if (e.key === 'Escape') {
      e.currentTarget.blur()
    }
  }

  function handleDetailPaste(e: React.ClipboardEvent<HTMLInputElement>, itemId: string, rowIndex: number, field: EstimateCellKey) {
    if (!canEdit) return
    const text = e.clipboardData.getData('text')
    if (!text.includes('\t') && !text.includes('\n')) return
    e.preventDefault()

    const startCol = DETAIL_CELL_ORDER.indexOf(field)
    const pastedRows = text.replace(/\r/g, '').split('\n').filter((line, index, all) => line.length > 0 || index < all.length - 1)
    if (startCol < 0 || pastedRows.length === 0) return

    setAndSave(items.map((entry) => {
      if (entry.id !== itemId) return entry
      const rows = normalizeRows(entry.rows)
      const nextRows = [...rows]

      pastedRows.forEach((line, lineIndex) => {
        const targetIndex = rowIndex + lineIndex
        while (nextRows.length <= targetIndex) nextRows.push(blankRow())
        const target = { ...blankRow(), ...nextRows[targetIndex] }
        line.split('\t').forEach((rawCell, cellIndex) => {
          const key = DETAIL_CELL_ORDER[startCol + cellIndex]
          if (!key) return
          assignRowCell(target, key, rawCell)
        })
        nextRows[targetIndex] = target
      })

      return normalizeItem({ ...entry, rows: nextRows })
    }))
    focusCell(itemId, rowIndex + pastedRows.length - 1, DETAIL_CELL_ORDER[Math.min(DETAIL_CELL_ORDER.length - 1, startCol + pastedRows[0]!.split('\t').length - 1)] ?? field)
  }

  function cloneItem(itemId: string) {
    const index = items.findIndex((item) => item.id === itemId)
    if (index < 0) return
    const source = items[index]
    if (!source) return
    const clone = normalizeItem({
      ...source,
      id: genId(),
      name: isSection(source) ? `${source.name ?? 'Phần'} copy` : `${source.name ?? 'Hạng mục'} copy`,
      expanded: true,
      rows: normalizeRows(source.rows).map((row) => ({ ...row })),
    })
    setAndSave([...items.slice(0, index + 1), clone, ...items.slice(index + 1)])
  }

  function exportCsv() {
    const rows = [['STT', 'Hạng mục', 'ĐVT', 'Diễn giải', 'Dài', 'Rộng', 'Cao', 'n', 'H.số', 'KL', 'Đơn giá', 'Thành tiền']]
    let stt = 1
    items.forEach((item) => {
      if (isSection(item)) {
        rows.push([String(item.stt ?? ''), item.name ?? '', '', '', '', '', '', '', '', '', '', ''])
        return
      }
      const dims = getDims(item)
      const unitPrice = getUnitPrice(item)
      normalizeRows(item.rows).forEach((row, rowIndex) => {
        rows.push([
          rowIndex === 0 ? String(stt) : '',
          rowIndex === 0 ? item.name ?? '' : '',
          rowIndex === 0 ? item.unit ?? '' : '',
          getRowDesc(row),
          String(getRowValue(row, 'l') ?? ''),
          String(getRowValue(row, 'w') ?? ''),
          String(getRowValue(row, 'h') ?? ''),
          String(row.n ?? 1),
          String(row.hs ?? row.coeff ?? 1),
          formatQty(calcRowQty(row, dims)),
          rowIndex === 0 ? String(unitPrice) : '',
          rowIndex === 0 ? String(Math.round(calcItemTotalQty(item) * unitPrice)) : '',
        ])
      })
      stt += 1
    })
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `DuToan_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function handleSubmit() {
    if (!projectId) return
    if (items.filter((item) => !isSection(item)).length === 0) {
      showToast('Chưa có hạng mục nào trong bảng dự toán', 'error')
      return
    }
    await saveItems(items)
    try {
      await submitProject.mutateAsync(projectId)
      showToast('Đã nộp duyệt dự án', 'success')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  if (!projectId) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        <p style={{ marginBottom: '1rem' }}>Chưa chọn dự án</p>
        <Button variant="secondary" size="sm" onClick={() => router.push('/dashboard')}>
          <ChevronLeft size={14} /> Về Dashboard
        </Button>
      </div>
    )
  }

  if (projectLoading) return <EstimateLoader />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <PageHeader
        eyebrow="Bảng dự toán"
        title={project?.name ?? 'Dự toán chi phí thi công'}
        subtitle="Nhập hạng mục, diễn giải, kích thước và đơn giá theo bảng dự toán kiểu G8."
        actions={(
          <>
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} style={{ padding: '0.4rem 0.5rem' }}>
              <ChevronLeft size={14} />
            </Button>
          <SaveBadge state={saveState} />
          <Button variant="secondary" size="sm" onClick={() => router.push(`/pricing?projectId=${projectId}`)}><BarChart2 size={13} /> Bảng giá & NTP</Button>
          <Button variant="secondary" size="sm" onClick={exportCsv}><Download size={13} /> Xuất Excel</Button>
          {canEdit && <Button size="sm" onClick={handleSubmit} loading={submitProject.isPending}><Send size={13} /> Nộp duyệt</Button>}
          </>
        )}
      />

      <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 1180, borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: 'rgba(0,242,254,0.08)' }}>
                {['STT', 'Hạng mục / Diễn giải', 'ĐVT', 'Dài', 'Rộng', 'Cao', 'Số C.K', 'H.số', 'K.L', 'ĐG Vật tư', 'ĐG Nhân công', 'Thành tiền', 'Ghi chú', ''].map((head) => (
                  <th key={head} style={th}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={14} style={{ ...td, textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Chưa có hạng mục. Nhấn “Thêm hạng mục” hoặc “Từ mẫu”.
                  </td>
                </tr>
              ) : (
                renderRows({ items, canEdit, updateItem, updateRow, addDetailRow, removeDetailRow, removeItem, cloneItem, handleDetailKeyDown, handleDetailPaste })
              )}
            </tbody>
          </table>
        </div>

        {canEdit && (
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-glass)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowTemplates(true)}><LayoutTemplate size={13} /> Từ mẫu</Button>
            <Button variant="secondary" size="sm" onClick={addSection}><FolderPlus size={13} /> Thêm phần</Button>
            <Button size="sm" onClick={addItem}><Plus size={13} /> Thêm hạng mục</Button>
            <Button variant="secondary" size="sm" onClick={() => saveItems(items)}><Save size={13} /> Lưu</Button>
          </div>
        )}
      </div>

      <div className="glass-card" style={{ padding: '0.875rem 1rem', marginLeft: 'auto', width: 'min(100%, 520px)' }}>
        <TotalLine label="Tổng chi phí thi công" value={totals.subtotal} strong />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.6rem', alignItems: 'center', padding: '0.45rem 0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontWeight: 700 }}>
            <input type="checkbox" checked={contingencyEnabled} onChange={(e) => setContingencyEnabled(e.target.checked)} />
            Dự phòng phí
          </label>
          <input className="input-base" type="number" value={contingencyPct} onChange={(e) => setContingencyPct(Number(e.target.value) || 0)} style={{ width: 72, textAlign: 'right' }} />
          <span style={{ color: '#fbbf24', textAlign: 'right', fontWeight: 800 }}>+{formatCurrency(totals.contingency)}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.6rem', alignItems: 'center', padding: '0.45rem 0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontWeight: 700 }}>
            <input type="checkbox" checked={vatEnabled} onChange={(e) => setVatEnabled(e.target.checked)} />
            VAT
          </label>
          <input className="input-base" type="number" value={vatPct} onChange={(e) => setVatPct(Number(e.target.value) || 0)} style={{ width: 72, textAlign: 'right' }} />
          <span style={{ color: '#fbbf24', textAlign: 'right', fontWeight: 800 }}>+{formatCurrency(totals.vat)}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.6rem', alignItems: 'center', padding: '0.45rem 0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontWeight: 700 }}>
            <input type="checkbox" checked={roundingEnabled} onChange={(e) => setRoundingEnabled(e.target.checked)} />
            Làm tròn 1.000 VNĐ
          </label>
          <span style={{ color: totals.rounding >= 0 ? '#22c55e' : '#ef4444', textAlign: 'right', fontWeight: 800 }}>{formatCurrency(totals.rounding)}</span>
        </div>
        <TotalLine label="TỔNG DỰ TOÁN" value={totals.grand} strong accent />
      </div>

      <Modal open={showTemplates} onClose={() => setShowTemplates(false)} title="Chọn mẫu dự toán" width={620}>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {LEGACY_PROJECT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template.id)}
              style={{ textAlign: 'left', padding: '0.875rem 1rem', border: '1px solid var(--border-glass)', borderRadius: 8, background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{template.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 3 }}>{template.description}</div>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}

function renderRows({ items, canEdit, updateItem, updateRow, addDetailRow, removeDetailRow, removeItem, cloneItem, handleDetailKeyDown, handleDetailPaste }: {
  items: EstimateItem[]
  canEdit: boolean
  updateItem: (itemId: string, patch: Partial<EstimateItem>) => void
  updateRow: (itemId: string, rowIndex: number, patch: Partial<EstimateRow>) => void
  addDetailRow: (itemId: string) => void
  removeDetailRow: (itemId: string, rowIndex: number) => void
  removeItem: (itemId: string) => void
  cloneItem: (itemId: string) => void
  handleDetailKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, itemId: string, rowIndex: number, field: EstimateCellKey) => void
  handleDetailPaste: (e: React.ClipboardEvent<HTMLInputElement>, itemId: string, rowIndex: number, field: EstimateCellKey) => void
}) {
  const rendered: React.ReactNode[] = []
  let stt = 1

  items.forEach((item) => {
    if (isSection(item)) {
      rendered.push(
        <tr key={item.id} style={{ background: 'rgba(255,255,255,0.04)' }}>
          <td style={{ ...td, fontWeight: 900, color: 'var(--color-primary)' }}>{item.stt ?? ''}</td>
          <td colSpan={12} style={{ ...td, fontWeight: 900, color: 'var(--color-primary)' }}>{item.name}</td>
          <td style={td}>{canEdit && <RowActions onClone={() => cloneItem(item.id)} onRemove={() => removeItem(item.id)} />}</td>
        </tr>
      )
      return
    }

    const dims = getDims(item)
    const totalQty = calcItemTotalQty(item)
    const unitPrice = getUnitPrice(item)
    const rows = normalizeRows(item.rows)
    const itemIndex = stt++

    rendered.push(
      <tr key={`${item.id}-head`} style={{ background: item.expanded ? 'rgba(0,242,254,0.035)' : 'transparent' }}>
        <td style={{ ...td, textAlign: 'center', fontWeight: 800 }}>{itemIndex}</td>
        <td colSpan={7} style={{ ...td, minWidth: 300 }}>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button type="button" onClick={() => updateItem(item.id, { expanded: !item.expanded })} style={plainButton}>{item.expanded ? '▼' : '▶'}</button>
            <input className="input-base" value={item.name ?? ''} disabled={!canEdit} list="workItemSuggestions" placeholder="Gõ tên hạng mục..." onChange={(e) => updateItemName(item, e.target.value, updateItem)} style={{ minWidth: 220, flex: 1 }} />
            <select className="input-base" disabled={!canEdit} value={item.unit ?? 'm²'} onChange={(e) => updateItem(item.id, { unit: e.target.value })} style={{ width: 78 }}>
              {UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </div>
        </td>
        <td style={{ ...td, textAlign: 'right', fontWeight: 800 }}>{formatQty(totalQty)}</td>
        <td style={td}><input className="input-base" type="number" disabled={!canEdit} value={unitPrice || ''} onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) || 0, unitPriceMat: Number(e.target.value) || 0 })} style={{ width: 110, textAlign: 'right' }} /></td>
        <td style={{ ...td, textAlign: 'right', color: 'var(--text-muted)' }}>{formatCurrency(Number(item.unitPriceLab) || 0)}</td>
        <td style={{ ...td, textAlign: 'right', fontWeight: 900, color: 'var(--color-primary)' }}>{formatCurrency(totalQty * unitPrice)}</td>
        <td style={td}>{item.workItemKey ?? item.type}</td>
        <td style={td}>{canEdit && <RowActions onClone={() => cloneItem(item.id)} onRemove={() => removeItem(item.id)} />}</td>
      </tr>
    )

    if (item.expanded) {
      rows.forEach((row, rowIndex) => {
        const qty = calcRowQty(row, dims)
        rendered.push(
          <tr key={`${item.id}-${rowIndex}`}>
            <td style={td} />
            <td style={{ ...td, minWidth: 260 }}>
              <input
                className="input-base"
                disabled={!canEdit}
                value={getRowDesc(row)}
                data-est-cell={`${item.id}:${rowIndex}:desc`}
                onKeyDown={(e) => handleDetailKeyDown(e, item.id, rowIndex, 'desc')}
                onPaste={(e) => handleDetailPaste(e, item.id, rowIndex, 'desc')}
                onChange={(e) => updateRow(item.id, rowIndex, { desc: e.target.value, name: e.target.value })}
                placeholder="Diễn giải..."
                style={{ width: '100%' }}
              />
            </td>
            <td style={td} />
            <DimInput field="l" itemId={item.id} rowIndex={rowIndex} disabled={!canEdit || !dims.includes('l')} value={getRowValue(row, 'l')} onKeyDown={handleDetailKeyDown} onPaste={handleDetailPaste} onChange={(value) => updateRow(item.id, rowIndex, { l: value, length: value })} />
            <DimInput field="w" itemId={item.id} rowIndex={rowIndex} disabled={!canEdit || !dims.includes('w')} value={getRowValue(row, 'w')} onKeyDown={handleDetailKeyDown} onPaste={handleDetailPaste} onChange={(value) => updateRow(item.id, rowIndex, { w: value, width: value })} />
            <DimInput field="h" itemId={item.id} rowIndex={rowIndex} disabled={!canEdit || !dims.includes('h')} value={getRowValue(row, 'h')} onKeyDown={handleDetailKeyDown} onPaste={handleDetailPaste} onChange={(value) => updateRow(item.id, rowIndex, { h: value, height: value })} />
            <DimInput field="n" itemId={item.id} rowIndex={rowIndex} disabled={!canEdit} value={row.n ?? 1} onKeyDown={handleDetailKeyDown} onPaste={handleDetailPaste} onChange={(value) => updateRow(item.id, rowIndex, { n: value })} />
            <td style={td}>
              <select
                className="input-base"
                disabled={!canEdit}
                value={Number(row.hs ?? row.coeff ?? 1) < 0 ? -1 : 1}
                data-est-cell={`${item.id}:${rowIndex}:hs`}
                onKeyDown={(e) => handleDetailKeyDown(e, item.id, rowIndex, 'hs')}
                onChange={(e) => updateRow(item.id, rowIndex, { hs: Number(e.target.value), coeff: Number(e.target.value) })}
                style={{ width: 64 }}
              >
                <option value={1}>+</option>
                <option value={-1}>-</option>
              </select>
            </td>
            <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: qty < 0 ? '#ef4444' : 'var(--text-secondary)' }}>{formatQty(qty)}</td>
            <td style={td} />
            <td style={td} />
            <td style={td} />
            <td style={td} />
            <td style={td}>{canEdit && rows.length > 1 && <IconButton onClick={() => removeDetailRow(item.id, rowIndex)} />}</td>
          </tr>
        )
      })

      if (canEdit) {
        rendered.push(
          <tr key={`${item.id}-add`}>
            <td style={td} />
            <td colSpan={13} style={td}>
              <button type="button" onClick={() => addDetailRow(item.id)} style={{ ...plainButton, color: 'var(--color-primary)', fontWeight: 800 }}>+ thêm dòng diễn giải</button>
            </td>
          </tr>
        )
      }
    }
  })

  return rendered
}

function updateItemName(item: EstimateItem, value: string, updateItem: (itemId: string, patch: Partial<EstimateItem>) => void) {
  const match = Object.entries(WORK_ITEM_DIMS).find(([, meta]) => meta.label === value)
  if (match) {
    const [key, meta] = match
    const price = DEFAULT_PRICES[key] ?? getUnitPrice(item)
    updateItem(item.id, { type: key, workItemKey: key, name: meta.label, unit: meta.unit, unitPrice: price, unitPriceMat: price })
  } else {
    updateItem(item.id, { type: 'custom', workItemKey: 'custom', name: value })
  }
}

function DimInput({ field, itemId, rowIndex, value, disabled, onChange, onKeyDown, onPaste }: {
  field: EstimateCellKey
  itemId: string
  rowIndex: number
  value: unknown
  disabled?: boolean
  onChange: (value: number | string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, itemId: string, rowIndex: number, field: EstimateCellKey) => void
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>, itemId: string, rowIndex: number, field: EstimateCellKey) => void
}) {
  return (
    <td style={td}>
      <input
        className="input-base"
        type="number"
        disabled={disabled}
        value={value === null || value === undefined ? '' : String(value)}
        data-est-cell={`${itemId}:${rowIndex}:${field}`}
        onKeyDown={(e) => onKeyDown(e, itemId, rowIndex, field)}
        onPaste={(e) => onPaste(e, itemId, rowIndex, field)}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        style={{ width: 82, textAlign: 'right' }}
      />
    </td>
  )
}

function TotalLine({ label, value, strong, accent }: { label: string; value: number; strong?: boolean; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.45rem 0', borderTop: accent ? '1px solid var(--border-glass)' : undefined }}>
      <span style={{ color: strong ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: strong ? 900 : 700 }}>{label}</span>
      <span style={{ color: accent ? '#00e676' : 'var(--color-primary)', fontWeight: 900 }}>{formatCurrency(value)}</span>
    </div>
  )
}

function SaveBadge({ state }: { state: SaveState }) {
  const label = state === 'syncing' ? 'Đang lưu...' : state === 'saved' ? 'Đã lưu' : state === 'error' ? 'Lỗi lưu' : 'Chưa lưu'
  const color = state === 'saved' ? '#22c55e' : state === 'error' ? '#ef4444' : state === 'syncing' ? '#fbbf24' : 'var(--text-muted)'
  return <span style={{ fontSize: '0.75rem', color, border: '1px solid var(--border-glass)', borderRadius: 6, padding: '0.35rem 0.6rem', fontWeight: 800 }}>{label}</span>
}

function RowActions({ onClone, onRemove }: { onClone: () => void; onRemove: () => void }) {
  return (
    <div style={{ display: 'inline-flex', gap: 6 }}>
      <button type="button" onClick={onClone} style={copyButton} aria-label="Nhân bản"><Copy size={14} /></button>
      <IconButton onClick={onRemove} />
    </div>
  )
}

function IconButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} style={iconButton} aria-label="Xóa"><Trash2 size={14} /></button>
}

function EstimateLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: 'var(--text-muted)', gap: 12 }}>
      <LoadingSpinner size="lg" />
      <span>Đang tải dự toán...</span>
    </div>
  )
}

function normalizeItems(raw: unknown[]): EstimateItem[] {
  return raw.map((value) => normalizeItem(value as EstimateItem))
}

function normalizeItem(item: EstimateItem): EstimateItem {
  if (isSection(item)) return { id: String(item.id ?? genId()), type: 'section', name: item.name ?? 'Phần', stt: item.stt }
  const key = String(item.workItemKey ?? item.type ?? 'custom')
  const dim = WORK_ITEM_DIMS[key]
  const price = Number(item.unitPrice ?? item.unitPriceMat ?? DEFAULT_PRICES[key] ?? 0)
  const normalized: EstimateItem = {
    ...item,
    id: String(item.id ?? genId()),
    type: key,
    workItemKey: key,
    name: item.name ?? dim?.label ?? '',
    unit: item.unit ?? dim?.unit ?? 'm²',
    unitPrice: price,
    unitPriceMat: price,
    unitPriceLab: Number(item.unitPriceLab) || 0,
    expanded: item.expanded ?? true,
    rows: normalizeRows(item.rows),
  }
  normalized.qty = calcItemTotalQty(normalized)
  return normalized
}

function serializeItems(next: EstimateItem[]): EstimateItem[] {
  return next.map((item) => normalizeItem({ ...item, qty: calcItemTotalQty(item), unitPriceMat: getUnitPrice(item) }))
}

function normalizeRows(rows: EstimateRow[] | undefined): EstimateRow[] {
  if (!Array.isArray(rows) || rows.length === 0) return [blankRow()]
  return rows.map((row) => ({ ...blankRow(), ...row }))
}

function fromTemplateItem(item: ConstructionItem): EstimateItem {
  if (item.type === 'section') return normalizeItem({ id: item.id, type: 'section', name: item.name, stt: item.stt })
  return normalizeItem({
    id: item.id,
    type: item.type,
    workItemKey: item.type,
    name: item.name,
    unit: item.unit,
    unitPrice: Number(item.unitPriceMat) || DEFAULT_PRICES[item.type] || 0,
    unitPriceMat: Number(item.unitPriceMat) || DEFAULT_PRICES[item.type] || 0,
    unitPriceLab: Number(item.unitPriceLab) || 0,
    expanded: true,
    rows: (item.rows ?? []).map((row) => ({
      desc: row.name ?? row.description ?? '',
      name: row.name,
      l: row.length,
      w: row.width,
      h: row.height,
      n: row.n ?? 1,
      hs: row.coeff ?? 1,
    })),
  })
}

function blankRow(): EstimateRow {
  return { desc: '', l: '', w: '', h: '', n: 1, hs: 1 }
}

function assignRowCell(row: EstimateRow, key: EstimateCellKey, value: string) {
  const raw = value.trim()
  if (key === 'desc') {
    row.desc = value
    row.name = value
    return
  }
  if (key === 'hs') {
    const hs = raw === '-' || raw === '(-)' ? -1 : raw === '+' || raw === '' ? 1 : parseExcelNumber(raw) || 1
    row.hs = hs < 0 ? -1 : 1
    row.coeff = row.hs
    return
  }
  const parsed = raw === '' ? '' : parseExcelNumber(raw)
  if (key === 'l') {
    row.l = parsed
    row.length = parsed
  } else if (key === 'w') {
    row.w = parsed
    row.width = parsed
  } else if (key === 'h') {
    row.h = parsed
    row.height = parsed
  } else if (key === 'n') {
    row.n = parsed === '' ? 1 : parsed
  }
}

function parseExcelNumber(value: string): number | '' {
  const compact = value.replace(/\s/g, '')
  const normalized = compact.includes(',') ? compact.replace(/\./g, '').replace(',', '.') : compact
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : ''
}

function isSection(item: EstimateItem): boolean {
  return item.type === 'section' || item.workItemKey === 'section'
}

function getDims(item: EstimateItem): string[] {
  return WORK_ITEM_DIMS[item.workItemKey ?? item.type ?? '']?.dims ?? ['l', 'w', 'h']
}

function getUnitPrice(item: EstimateItem): number {
  return Number(item.unitPrice ?? item.unitPriceMat ?? DEFAULT_PRICES[item.workItemKey ?? item.type ?? ''] ?? 0)
}

function calcRowQty(row: EstimateRow, dims: string[]): number {
  const n = Number(row.n) || 1
  const l = Number(getRowValue(row, 'l')) || 0
  const w = Number(getRowValue(row, 'w')) || 0
  const h = Number(getRowValue(row, 'h')) || 0
  const hs = row.hs !== undefined ? Number(row.hs) || 1 : Number(row.coeff) || 1
  if (dims.length === 0) return n * hs
  if (!l) return 0
  let qty = l
  if (dims.includes('w')) qty *= w || 0
  if (dims.includes('h')) qty *= h || 0
  return qty * n * hs
}

function calcItemTotalQty(item: EstimateItem): number {
  const dims = getDims(item)
  return normalizeRows(item.rows).reduce((sum, row) => sum + calcRowQty(row, dims), 0)
}

function getRowValue(row: EstimateRow, key: 'l' | 'w' | 'h'): number | string | null | undefined {
  if (key === 'l') return row.l ?? row.length
  if (key === 'w') return row.w ?? row.width
  return row.h ?? row.height
}

function getRowDesc(row: EstimateRow): string {
  return String(row.desc ?? row.name ?? row.description ?? '')
}

function genId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

function formatQty(value: number): string {
  return Math.abs(value) < 0.005 ? '0' : value.toLocaleString('vi-VN', { minimumFractionDigits: value % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })
}

function formatCurrency(value: number): string {
  return `${Math.round(value).toLocaleString('vi-VN')} VNĐ`
}

const th: React.CSSProperties = {
  padding: '0.65rem 0.55rem',
  border: '1px solid var(--border-glass)',
  color: 'var(--text-primary)',
  fontSize: '0.72rem',
  textAlign: 'center',
  whiteSpace: 'nowrap',
}

const td: React.CSSProperties = {
  padding: '0.45rem 0.5rem',
  border: '1px solid var(--border-glass)',
  color: 'var(--text-secondary)',
  verticalAlign: 'middle',
}

const plainButton: React.CSSProperties = {
  border: 0,
  background: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '0.25rem',
}

const iconButton: React.CSSProperties = {
  border: '1px solid rgba(239,68,68,0.25)',
  background: 'rgba(239,68,68,0.08)',
  color: '#ef4444',
  borderRadius: 6,
  width: 28,
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}

const copyButton: React.CSSProperties = {
  ...iconButton,
  border: '1px solid rgba(0,242,254,0.25)',
  background: 'rgba(0,242,254,0.08)',
  color: 'var(--color-primary)',
}

export default function EstimatePage() {
  return (
    <Suspense fallback={<EstimateLoader />}>
      <EstimateContent />
      <datalist id="workItemSuggestions">
        {Object.values(WORK_ITEM_DIMS).map((item) => <option key={item.label} value={item.label} />)}
      </datalist>
    </Suspense>
  )
}
