'use client'

import { useState } from 'react'
import { Plus, Trash2, Send, ChevronLeft, CheckCircle, XCircle, Clock, FileText, Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatDateTime, statusLabel, statusClass, generateId } from '@/lib/utils'
import type { Quotation, QuotationRow, ProjectStatus } from '@/lib/types/models'

// ── API ────────────────────────────────────────────────────────────────────

async function fetchQuotations(): Promise<Quotation[]> {
  const res = await fetch('/api/quotations')
  if (!res.ok) throw new Error('Lỗi tải danh sách')
  return res.json()
}
async function fetchQuotation(id: number): Promise<Quotation> {
  const res = await fetch(`/api/quotations/${id}`)
  if (!res.ok) throw new Error('Lỗi tải báo giá')
  return res.json()
}
async function createQuotation(data: { name: string }): Promise<Quotation> {
  const res = await fetch('/api/quotations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
  return res.json()
}
async function updateQuotation(id: number, data: Partial<Quotation>): Promise<Quotation> {
  const res = await fetch(`/api/quotations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
  return res.json()
}
async function actionQuotation(id: number, action: string, body?: object): Promise<Quotation> {
  const res = await fetch(`/api/quotations/${id}/${action}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) })
  if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
  return res.json()
}
async function deleteQuotation(id: number): Promise<void> {
  const res = await fetch(`/api/quotations/${id}`, { method: 'DELETE' })
  if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function statusIcon(s: string) {
  if (s === 'APPROVED') return <CheckCircle size={12} />
  if (s === 'REJECTED') return <XCircle size={12} />
  if (s === 'PENDING') return <Clock size={12} />
  return <FileText size={12} />
}

function newRow(): QuotationRow {
  return { id: generateId(), description: '', unit: '', qty: 1, prices: [null, null, null] }
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function QuotationsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const qc = useQueryClient()
  const isAdmin = user?.role === 'ADMIN'

  const [view, setView] = useState<'list' | 'editor'>('list')
  const [editId, setEditId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [showReject, setShowReject] = useState<Quotation | null>(null)

  // Editor local state
  const [editorName, setEditorName] = useState('')
  const [contractors, setContractors] = useState(['', '', ''])
  const [rows, setRows] = useState<QuotationRow[]>([newRow()])
  const [saving, setSaving] = useState(false)

  const { data: quotations = [], isLoading } = useQuery({ queryKey: ['quotations'], queryFn: fetchQuotations })
  const { data: editQuotation } = useQuery({ queryKey: ['quotation', editId], queryFn: () => fetchQuotation(editId!), enabled: !!editId })

  const createMut = useMutation({ mutationFn: createQuotation, onSuccess: (q) => { qc.invalidateQueries({ queryKey: ['quotations'] }); setShowCreate(false); setNewName(''); openEditor(q) }, onError: (e: Error) => showToast(e.message, 'error') })
  const deleteMut = useMutation({ mutationFn: deleteQuotation, onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotations'] }); setDeleteTarget(null); showToast('Đã xóa', 'success') }, onError: (e: Error) => showToast(e.message, 'error') })
  const actionMut = useMutation({ mutationFn: ({ id, action, body }: { id: number; action: string; body?: object }) => actionQuotation(id, action, body), onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotations'] }); qc.invalidateQueries({ queryKey: ['quotation', editId] }); showToast('Thành công', 'success'); setShowReject(null) }, onError: (e: Error) => showToast(e.message, 'error') })

  function openEditor(q: Quotation) {
    setEditId(q.id)
    setEditorName(q.name)
    setContractors(q.contractors.length >= 3 ? q.contractors : [...q.contractors, '', '', ''].slice(0, 3))
    setRows(q.rows.length > 0 ? q.rows : [newRow()])
    setView('editor')
  }

  function backToList() { setView('list'); setEditId(null) }

  async function handleSave() {
    if (!editId) return
    setSaving(true)
    try {
      await updateQuotation(editId, { name: editorName, contractors, rows })
      qc.invalidateQueries({ queryKey: ['quotations'] })
      qc.invalidateQueries({ queryKey: ['quotation', editId] })
      showToast('Đã lưu', 'success')
    } catch (e) { showToast((e as Error).message, 'error') }
    setSaving(false)
  }

  function updateRow(i: number, patch: Partial<QuotationRow>) {
    setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }
  function updatePrice(rowIdx: number, colIdx: number, val: string) {
    const prices = [...(rows[rowIdx]?.prices ?? [null, null, null])]
    prices[colIdx] = val === '' ? null : parseFloat(val) || 0
    updateRow(rowIdx, { prices })
  }
  function addRow() { setRows([...rows, newRow()]) }
  function removeRow(i: number) { setRows(rows.filter((_, idx) => idx !== i)) }

  const currentQ = editQuotation ?? (quotations as Quotation[]).find(q => q.id === editId)
  const canEdit = currentQ ? ['DRAFT', 'REJECTED'].includes(currentQ.status) : false
  const canSubmit = currentQ ? ['DRAFT', 'REJECTED'].includes(currentQ.status) : false

  // ── Editor view ──────────────────────────────────────────────────────────

  if (view === 'editor') {
    return (
      <div>
        {/* Editor header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" onClick={backToList}><ChevronLeft size={14} /> Danh sách</Button>
          <input
            className="input-base"
            style={{ flex: 1, minWidth: 180, fontWeight: 700, fontSize: '1rem', padding: '0.4rem 0.75rem' }}
            value={editorName}
            onChange={(e) => setEditorName(e.target.value)}
            disabled={!canEdit}
            placeholder="Tên báo giá..."
          />
          {currentQ && (
            <span className={statusClass(currentQ.status)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.2rem 0.6rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600 }}>
              {statusIcon(currentQ.status)}{statusLabel(currentQ.status)}
            </span>
          )}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {canEdit && <Button size="sm" variant="secondary" onClick={handleSave} loading={saving}><Save size={12} /> Lưu</Button>}
            {canSubmit && <Button size="sm" onClick={() => currentQ && actionMut.mutate({ id: currentQ.id, action: 'submit' })} loading={actionMut.isPending}><Send size={12} /> Nộp duyệt</Button>}
            {isAdmin && currentQ?.status === 'PENDING' && (
              <>
                <Button size="sm" onClick={() => currentQ && actionMut.mutate({ id: currentQ.id, action: 'approve' })} loading={actionMut.isPending}><CheckCircle size={12} /> Duyệt</Button>
                <Button size="sm" variant="danger" onClick={() => currentQ && setShowReject(currentQ)}><XCircle size={12} /> Từ chối</Button>
              </>
            )}
          </div>
        </div>

        {/* Admin rejection note */}
        {currentQ?.adminNote && currentQ.status === 'REJECTED' && (
          <div style={{ fontSize: '0.8rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '0.5rem 0.875rem', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.2)' }}>
            Lý do từ chối: {currentQ.adminNote}
          </div>
        )}

        {/* Contractor names */}
        <div className="glass-card" style={{ padding: '0.875rem 1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>TÊN NHÀ THẦU</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
            {contractors.map((c, i) => (
              <input key={i} className="input-base" style={{ width: '100%', fontWeight: 600 }}
                placeholder={`Nhà thầu ${i + 1}`} value={c} disabled={!canEdit}
                onChange={(e) => setContractors(contractors.map((x, idx) => idx === i ? e.target.value : x))} />
            ))}
          </div>
        </div>

        {/* Rows table */}
        <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}>
                  <th style={thStyle}>#</th>
                  <th style={{ ...thStyle, width: '25%' }}>Hạng mục</th>
                  <th style={thStyle}>ĐVT</th>
                  <th style={thStyle}>SL</th>
                  {contractors.map((c, i) => <th key={i} style={thStyle}>{c || `NTP ${i + 1}`} (đ)</th>)}
                  {canEdit && <th style={thStyle}></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={tdStyle}><span style={{ color: 'var(--text-muted)' }}>{i + 1}</span></td>
                    <td style={tdStyle}>
                      <input className={canEdit ? 'input-base' : ''} style={{ width: '100%', background: 'none', border: canEdit ? undefined : 'none', padding: canEdit ? undefined : 0, color: 'var(--text-primary)' }}
                        value={row.description} disabled={!canEdit} onChange={(e) => updateRow(i, { description: e.target.value })} placeholder="Tên hạng mục..." />
                    </td>
                    <td style={tdStyle}>
                      <input className={canEdit ? 'input-base' : ''} style={{ width: 60, background: 'none', border: canEdit ? undefined : 'none', padding: canEdit ? undefined : 0, textAlign: 'center' }}
                        value={row.unit} disabled={!canEdit} onChange={(e) => updateRow(i, { unit: e.target.value })} placeholder="m²" />
                    </td>
                    <td style={tdStyle}>
                      <input className={canEdit ? 'input-base' : ''} type="number" style={{ width: 70, background: 'none', border: canEdit ? undefined : 'none', padding: canEdit ? undefined : 0, textAlign: 'right' }}
                        value={row.qty} disabled={!canEdit} onChange={(e) => updateRow(i, { qty: parseFloat(e.target.value) || 0 })} />
                    </td>
                    {[0, 1, 2].map((ci) => (
                      <td key={ci} style={tdStyle}>
                        <input className={canEdit ? 'input-base' : ''} type="number" style={{ width: 100, background: 'none', border: canEdit ? undefined : 'none', padding: canEdit ? undefined : 0, textAlign: 'right' }}
                          value={row.prices[ci] ?? ''} disabled={!canEdit} placeholder="0"
                          onChange={(e) => updatePrice(i, ci, e.target.value)} />
                      </td>
                    ))}
                    {canEdit && (
                      <td style={tdStyle}>
                        <Button size="sm" variant="danger" onClick={() => removeRow(i)} disabled={rows.length <= 1}><Trash2 size={11} /></Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border-glass)', background: 'var(--bg-card)' }}>
                  <td colSpan={4} style={{ ...tdStyle, fontWeight: 700, color: 'var(--text-primary)' }}>Tổng cộng</td>
                  {[0, 1, 2].map((ci) => {
                    const total = rows.reduce((sum, r) => sum + (r.prices[ci] ?? 0) * r.qty, 0)
                    return <td key={ci} style={{ ...tdStyle, fontWeight: 700, color: 'var(--color-primary)', textAlign: 'right' }}>
                      {total > 0 ? total.toLocaleString('vi-VN') + 'đ' : '—'}
                    </td>
                  })}
                  {canEdit && <td style={tdStyle}></td>}
                </tr>
              </tfoot>
            </table>
          </div>
          {canEdit && (
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-glass)' }}>
              <Button size="sm" variant="secondary" onClick={addRow}><Plus size={12} /> Thêm hàng</Button>
            </div>
          )}
        </div>

        {/* Reject modal */}
        <Modal open={!!showReject} onClose={() => setShowReject(null)} title="Từ chối báo giá" width={400}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Lý do từ chối</label>
            <textarea className="input-base" style={{ width: '100%', minHeight: 80, resize: 'vertical' }} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Nhập lý do..." />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button variant="secondary" size="sm" onClick={() => setShowReject(null)}>Hủy</Button>
              <Button variant="danger" size="sm" loading={actionMut.isPending}
                onClick={() => showReject && actionMut.mutate({ id: showReject.id, action: 'reject', body: { adminNote: rejectNote } })}>
                Từ chối
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Báo giá so sánh</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 2 }}>{(quotations as Quotation[]).length} báo giá</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Tạo báo giá</Button>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Đang tải...</div>
      ) : (quotations as Quotation[]).length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Chưa có báo giá nào</p>
          <Button size="sm" onClick={() => setShowCreate(true)} style={{ marginTop: '1rem' }}><Plus size={13} /> Tạo báo giá đầu tiên</Button>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}>
                {['Tên báo giá', 'Nhà thầu', 'Hạng mục', 'Cập nhật', 'Trạng thái', ''].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(quotations as Quotation[]).map((q, i) => (
                <tr key={q.id} style={{ borderBottom: i < quotations.length - 1 ? '1px solid var(--border-glass)' : undefined, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  onClick={() => openEditor(q)}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>{q.name}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {q.contractors.filter(Boolean).join(', ') || '—'}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)', textAlign: 'center' }}>{q.rows.length}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.77rem', whiteSpace: 'nowrap' }}>{formatDateTime(q.updatedAt)}</td>
                  <td style={tdStyle}>
                    <span className={statusClass(q.status as ProjectStatus)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600 }}>
                      {statusIcon(q.status)}{statusLabel(q.status as ProjectStatus)}
                    </span>
                  </td>
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(q)}><Trash2 size={11} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo báo giá mới" width={400}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Tên báo giá *</label>
            <input className="input-base" style={{ width: '100%' }} value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newName.trim() && createMut.mutate({ name: newName.trim() })} placeholder="VD: Báo giá hoàn thiện tầng 3..." autoFocus />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button size="sm" onClick={() => createMut.mutate({ name: newName.trim() })} loading={createMut.isPending} disabled={!newName.trim()}>Tạo</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Xác nhận xóa" width={360}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Xóa báo giá <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>?</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Hủy</Button>
          <Button variant="danger" size="sm" onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)} loading={deleteMut.isPending}>Xóa</Button>
        </div>
      </Modal>
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '0.6rem 0.875rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.73rem', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '0.65rem 0.875rem' }
