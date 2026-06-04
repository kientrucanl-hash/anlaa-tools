'use client'

import { useState } from 'react'
import { CheckCircle2, Plus, Search, Star, Phone, MapPin, Edit2, Trash2, ChevronDown, ChevronUp, Send, Users, XCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatDateTime } from '@/lib/utils'
import type { Contractor, ContractorType, ContractorStatus } from '@/lib/types/models'

async function fetchContractors(params?: string): Promise<Contractor[]> {
  const res = await fetch(`/api/contractors${params ? `?${params}` : ''}`)
  if (!res.ok) throw new Error('Lỗi tải danh sách')
  return res.json()
}
async function createContractor(data: Partial<Contractor>): Promise<Contractor> {
  const res = await fetch('/api/contractors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
  return res.json()
}
async function updateContractor(id: number, data: Partial<Contractor>): Promise<Contractor> {
  const res = await fetch(`/api/contractors/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
  return res.json()
}
async function deleteContractor(id: number): Promise<void> {
  const res = await fetch(`/api/contractors/${id}`, { method: 'DELETE' })
  if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
}
interface ContractorDraft {
  id: number
  contractorId?: number | null
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'
  payload: Partial<Contractor>
  adminNote?: string | null
  submitter?: { username: string } | null
  updatedAt: string
}
async function fetchDrafts(): Promise<ContractorDraft[]> {
  const res = await fetch('/api/contractors/drafts')
  if (!res.ok) return []
  return res.json()
}
async function createDraft(data: Partial<Contractor>): Promise<ContractorDraft> {
  const res = await fetch('/api/contractors/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, contractorId: null }) })
  if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
  return res.json()
}
async function submitDraft(id: number): Promise<ContractorDraft> {
  const res = await fetch(`/api/contractors/drafts/${id}/submit`, { method: 'PUT' })
  if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
  return res.json()
}
async function reviewDraft(id: number, action: 'approve' | 'reject'): Promise<ContractorDraft> {
  const res = await fetch(`/api/contractors/drafts/${id}/${action}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminNote: null }) })
  if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
  return res.json()
}
async function deleteDraft(id: number): Promise<void> {
  const res = await fetch(`/api/contractors/drafts/${id}`, { method: 'DELETE' })
  if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
}

const TYPE_LABELS: Record<ContractorType, string> = { TEAM: 'Đội thợ', COMPANY: 'Công ty', INDIVIDUAL: 'Cá nhân' }
const STATUS_LABELS: Record<ContractorStatus, string> = { ACTIVE: 'Hoạt động', INACTIVE: 'Ngừng', BLACKLIST: 'Blacklist' }
const STATUS_COLORS: Record<ContractorStatus, string> = { ACTIVE: '#22c55e', INACTIVE: 'var(--text-muted)', BLACKLIST: '#ef4444' }
const SPECIALTIES = ['Xây thô', 'Hoàn thiện', 'Điện', 'Nước', 'Ốp lát', 'Sơn', 'Trần thạch cao', 'Cửa nhôm', 'Cửa gỗ', 'Điều hòa', 'Nhôm kính', 'Nội thất']

const emptyForm = (): Partial<Contractor> => ({
  type: 'TEAM', name: '', contactName: '', phone: '', phone2: '', email: '',
  address: '', district: '', city: 'Hà Nội', specialty: [], workScope: '',
  taxCode: '', bankAccount: '', bankName: '', rating: 3, ratingNote: '',
  projectCount: 0, totalValue: 0, note: '', status: 'ACTIVE',
})

function Stars({ rating, onSet }: { rating: number; onSet?: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={onSet ? 20 : 12}
          style={{ cursor: onSet ? 'pointer' : 'default', color: n <= rating ? '#facc15' : 'var(--border-glass)', fill: n <= rating ? '#facc15' : 'none' }}
          onClick={() => onSet?.(n)} />
      ))}
    </div>
  )
}
function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )
}
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.3rem' }}>{title}</div>
      {children}
    </div>
  )
}
function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : undefined}>
      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</label>
      {children}
    </div>
  )
}

function ContractorDraftPanel({ drafts, isAdmin, onSubmit, onApprove, onReject, onDelete }: {
  drafts: ContractorDraft[]
  isAdmin: boolean
  onSubmit: (id: number) => void
  onApprove: (id: number) => void
  onReject: (id: number) => void
  onDelete: (id: number) => void
}) {
  const visible = drafts.filter((draft) => isAdmin ? draft.status === 'PENDING' : ['DRAFT', 'PENDING', 'REJECTED'].includes(draft.status))
  if (visible.length === 0) return null

  return (
    <div className="glass-card" style={{ padding: '0.875rem 1rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{isAdmin ? 'Nháp nhà thầu chờ duyệt' : 'Nháp nhà thầu của tôi'}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{visible.length} nháp cần xử lý</div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {visible.map((draft) => {
          const payload = draft.payload ?? {}
          return (
            <div key={draft.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'center', border: '1px solid var(--border-glass)', borderRadius: 8, padding: '0.65rem 0.75rem' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{payload.name ?? 'Chưa đặt tên'}</span>
                  <span style={{ color: draft.status === 'REJECTED' ? '#ef4444' : draft.status === 'PENDING' ? '#fbbf24' : 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800 }}>{draft.status}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                  {payload.phone || 'Chưa có SĐT'} · {payload.city || 'Chưa có thành phố'}{isAdmin && draft.submitter?.username ? ` · ${draft.submitter.username}` : ''}
                </div>
                {draft.adminNote && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 3 }}>Lý do: {draft.adminNote}</div>}
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {isAdmin && draft.status === 'PENDING' && (
                  <>
                    <Button size="sm" onClick={() => onApprove(draft.id)}><CheckCircle2 size={12} /> Duyệt</Button>
                    <Button size="sm" variant="danger" onClick={() => onReject(draft.id)}><XCircle size={12} /> Từ chối</Button>
                  </>
                )}
                {!isAdmin && ['DRAFT', 'REJECTED'].includes(draft.status) && (
                  <>
                    <Button size="sm" onClick={() => onSubmit(draft.id)}><Send size={12} /> Gửi duyệt</Button>
                    <Button size="sm" variant="danger" onClick={() => onDelete(draft.id)}><Trash2 size={12} /> Xóa</Button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ContractorsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const qc = useQueryClient()
  const isAdmin = user?.role === 'ADMIN'

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ContractorType | ''>('')
  const [statusFilter, setStatusFilter] = useState<ContractorStatus | ''>('ACTIVE')
  const [sortCol, setSortCol] = useState<'name' | 'rating' | 'projectCount'>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [draftMode, setDraftMode] = useState(false)
  const [editTarget, setEditTarget] = useState<Contractor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Contractor | null>(null)
  const [detail, setDetail] = useState<Contractor | null>(null)
  const [form, setForm] = useState<Partial<Contractor>>(emptyForm())

  const params = new URLSearchParams()
  if (statusFilter) params.set('status', statusFilter)
  if (typeFilter) params.set('type', typeFilter)

  const { data: contractors = [], isLoading } = useQuery({
    queryKey: ['contractors', statusFilter, typeFilter],
    queryFn: () => fetchContractors(params.toString()),
  })
  const { data: drafts = [] } = useQuery({ queryKey: ['contractor-drafts'], queryFn: fetchDrafts })

  const createMut = useMutation({ mutationFn: createContractor, onSuccess: () => { qc.invalidateQueries({ queryKey: ['contractors'] }); showToast('Đã thêm nhà thầu', 'success'); closeForm() }, onError: (e: Error) => showToast(e.message, 'error') })
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Contractor> }) => updateContractor(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['contractors'] }); showToast('Đã cập nhật', 'success'); closeForm() }, onError: (e: Error) => showToast(e.message, 'error') })
  const deleteMut = useMutation({ mutationFn: deleteContractor, onSuccess: () => { qc.invalidateQueries({ queryKey: ['contractors'] }); showToast('Đã xóa', 'success'); setDeleteTarget(null) }, onError: (e: Error) => showToast(e.message, 'error') })
  const draftMut = useMutation({ mutationFn: createDraft, onSuccess: () => { qc.invalidateQueries({ queryKey: ['contractor-drafts'] }); showToast('Đã lưu nháp nhà thầu', 'success'); closeForm() }, onError: (e: Error) => showToast(e.message, 'error') })
  const submitDraftMut = useMutation({ mutationFn: submitDraft, onSuccess: () => { qc.invalidateQueries({ queryKey: ['contractor-drafts'] }); showToast('Đã gửi admin duyệt', 'success') }, onError: (e: Error) => showToast(e.message, 'error') })
  const reviewDraftMut = useMutation({ mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' }) => reviewDraft(id, action), onSuccess: () => { qc.invalidateQueries({ queryKey: ['contractor-drafts'] }); qc.invalidateQueries({ queryKey: ['contractors'] }); showToast('Đã xử lý nháp', 'success') }, onError: (e: Error) => showToast(e.message, 'error') })
  const deleteDraftMut = useMutation({ mutationFn: deleteDraft, onSuccess: () => { qc.invalidateQueries({ queryKey: ['contractor-drafts'] }); showToast('Đã xóa nháp', 'success') }, onError: (e: Error) => showToast(e.message, 'error') })

  function openCreate() { setDraftMode(false); setForm(emptyForm()); setEditTarget(null); setShowForm(true) }
  function openDraftCreate() { setDraftMode(true); setForm(emptyForm()); setEditTarget(null); setShowForm(true) }
  function openEdit(c: Contractor) { setDraftMode(false); setForm({ ...c }); setEditTarget(c); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditTarget(null); setDraftMode(false) }
  function handleSave() {
    if (!form.name?.trim()) return showToast('Tên nhà thầu không được để trống', 'error')
    if (draftMode) draftMut.mutate(form)
    else if (editTarget) updateMut.mutate({ id: editTarget.id, data: form })
    else createMut.mutate(form)
  }
  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(true) }
  }

  const all = contractors as Contractor[]
  const filtered = all
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? '').includes(search) || (c.contactName ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const v = sortCol === 'name' ? a.name.localeCompare(b.name) : (a[sortCol] as number) - (b[sortCol] as number)
      return sortAsc ? v : -v
    })

  const SortIcon = ({ col }: { col: typeof sortCol }) => sortCol === col ? (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null

  return (
    <div>
      <PageHeader
        eyebrow="Cơ sở dữ liệu NTP"
        title="Nhà thầu phụ"
        subtitle={`${filtered.length} nhà thầu · hồ sơ đơn giá và luồng đề xuất duyệt`}
        actions={(
          <>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-base" style={{ paddingLeft: 28, paddingTop: '0.4rem', paddingBottom: '0.4rem', fontSize: '0.8rem', width: 180 }} placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-base" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ContractorType | '')}>
          <option value="">Tất cả loại</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input-base" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ContractorStatus | '')}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {isAdmin ? <Button size="sm" onClick={openCreate}><Plus size={13} /> Thêm</Button> : <Button size="sm" onClick={openDraftCreate}><Plus size={13} /> Đề xuất</Button>}
          </>
        )}
      />

      {drafts.length > 0 && (
        <ContractorDraftPanel
          drafts={drafts}
          isAdmin={isAdmin}
          onSubmit={(id) => submitDraftMut.mutate(id)}
          onApprove={(id) => reviewDraftMut.mutate({ id, action: 'approve' })}
          onReject={(id) => reviewDraftMut.mutate({ id, action: 'reject' })}
          onDelete={(id) => deleteDraftMut.mutate(id)}
        />
      )}

      {/* Stats */}
      {!isLoading && all.length > 0 && (
        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Hoạt động', value: all.filter(c => c.status === 'ACTIVE').length, color: '#22c55e' },
            { label: 'Ngừng', value: all.filter(c => c.status === 'INACTIVE').length, color: 'var(--text-muted)' },
            { label: 'Blacklist', value: all.filter(c => c.status === 'BLACKLIST').length, color: '#ef4444' },
            { label: 'Đội thợ', value: all.filter(c => c.type === 'TEAM').length, color: 'var(--text-secondary)' },
            { label: 'Công ty', value: all.filter(c => c.type === 'COMPANY').length, color: 'var(--text-secondary)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card" style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
              <span style={{ fontWeight: 700, color }}>{value}</span>
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Users size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Chưa có nhà thầu nào</p>
          {isAdmin && <Button size="sm" onClick={openCreate} style={{ marginTop: '1rem' }}><Plus size={13} /> Thêm nhà thầu</Button>}
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 650 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}>
                  {[{ h: 'Tên', c: 'name' as const }, { h: 'Loại' }, { h: 'Liên hệ' }, { h: 'Chuyên môn' }, { h: 'Thành phố' }, { h: 'Đánh giá', c: 'rating' as const }, { h: 'C.trình', c: 'projectCount' as const }, { h: 'T.thái' }, { h: '' }].map(({ h, c }) => (
                    <th key={h} onClick={c ? () => toggleSort(c) : undefined}
                      style={{ padding: '0.55rem 0.875rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.72rem', whiteSpace: 'nowrap', cursor: c ? 'pointer' : undefined, userSelect: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>{h}{c && <SortIcon col={c} />}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-glass)' : undefined, cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    onClick={() => setDetail(c)}>
                    <td style={{ padding: '0.6rem 0.875rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: 160 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    </td>
                    <td style={{ padding: '0.6rem 0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{TYPE_LABELS[c.type]}</td>
                    <td style={{ padding: '0.6rem 0.875rem', color: 'var(--text-muted)' }}>
                      {c.phone ? <span style={{ display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}><Phone size={10} />{c.phone}</span> : '—'}
                    </td>
                    <td style={{ padding: '0.6rem 0.875rem' }}>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: 160 }}>
                        {(c.specialty ?? []).slice(0, 2).map((s) => (
                          <span key={s} style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s}</span>
                        ))}
                        {(c.specialty ?? []).length > 2 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>+{(c.specialty ?? []).length - 2}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '0.6rem 0.875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} />{c.city || '—'}</span>
                    </td>
                    <td style={{ padding: '0.6rem 0.875rem' }}><Stars rating={c.rating} /></td>
                    <td style={{ padding: '0.6rem 0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{c.projectCount}</td>
                    <td style={{ padding: '0.6rem 0.875rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: STATUS_COLORS[c.status], whiteSpace: 'nowrap' }}>{STATUS_LABELS[c.status]}</span>
                    </td>
                    <td style={{ padding: '0.6rem 0.875rem' }} onClick={(e) => e.stopPropagation()}>
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: 3 }}>
                          <Button size="sm" variant="secondary" onClick={() => openEdit(c)}><Edit2 size={11} /></Button>
                          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(c)}><Trash2 size={11} /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ''} width={520}>
        {detail && (
          <div style={{ fontSize: '0.84rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <InfoRow label="Loại" value={TYPE_LABELS[detail.type]} />
              <InfoRow label="Trạng thái" value={<span style={{ color: STATUS_COLORS[detail.status], fontWeight: 600 }}>{STATUS_LABELS[detail.status]}</span>} />
              <InfoRow label="Người liên hệ" value={detail.contactName} />
              <InfoRow label="Điện thoại" value={detail.phone} />
              <InfoRow label="Email" value={detail.email} />
              <InfoRow label="Thành phố" value={detail.city} />
              <InfoRow label="Địa chỉ" value={detail.address} />
              <InfoRow label="Quận/Huyện" value={detail.district} />
              <InfoRow label="Số công trình" value={String(detail.projectCount)} />
              <InfoRow label="Cập nhật" value={formatDateTime(detail.updatedAt)} />
            </div>
            {(detail.specialty ?? []).length > 0 && (
              <div style={{ marginBottom: '0.6rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 4 }}>Chuyên môn</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(detail.specialty ?? []).map((s) => (
                    <span key={s} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 5, background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            <InfoRow label="Đánh giá" value={<Stars rating={detail.rating} />} />
            {detail.ratingNote && <InfoRow label="Ghi chú đánh giá" value={detail.ratingNote} />}
            {detail.note && <div style={{ marginTop: '0.5rem' }}><InfoRow label="Ghi chú" value={detail.note} /></div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              {isAdmin && <Button size="sm" variant="secondary" onClick={() => { setDetail(null); openEdit(detail) }}><Edit2 size={12} /> Sửa</Button>}
              <Button size="sm" variant="secondary" onClick={() => setDetail(null)}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit form */}
      <Modal open={showForm} onClose={closeForm} title={draftMode ? 'Đề xuất nhà thầu' : editTarget ? 'Sửa nhà thầu' : 'Thêm nhà thầu'} width={620}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.84rem' }}>
          <FormSection title="Thông tin cơ bản">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <Field label="Tên nhà thầu *" span={2}><input className="input-base" style={{ width: '100%' }} value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
              <Field label="Loại"><select className="input-base" style={{ width: '100%' }} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContractorType })}>{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <Field label="Trạng thái"><select className="input-base" style={{ width: '100%' }} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContractorStatus })}>{Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <Field label="Người liên hệ"><input className="input-base" style={{ width: '100%' }} value={form.contactName ?? ''} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></Field>
              <Field label="Điện thoại"><input className="input-base" style={{ width: '100%' }} value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Điện thoại 2"><input className="input-base" style={{ width: '100%' }} value={form.phone2 ?? ''} onChange={(e) => setForm({ ...form, phone2: e.target.value })} /></Field>
              <Field label="Email"><input className="input-base" style={{ width: '100%' }} value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            </div>
          </FormSection>
          <FormSection title="Địa chỉ">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <Field label="Địa chỉ" span={2}><input className="input-base" style={{ width: '100%' }} value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
              <Field label="Quận/Huyện"><input className="input-base" style={{ width: '100%' }} value={form.district ?? ''} onChange={(e) => setForm({ ...form, district: e.target.value })} /></Field>
              <Field label="Thành phố"><input className="input-base" style={{ width: '100%' }} value={form.city ?? 'Hà Nội'} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
            </div>
          </FormSection>
          <FormSection title="Năng lực & Đánh giá">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <Field label="Chuyên môn">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                  {SPECIALTIES.map((s) => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={(form.specialty ?? []).includes(s)} onChange={(e) => setForm({ ...form, specialty: e.target.checked ? [...(form.specialty ?? []), s] : (form.specialty ?? []).filter((x) => x !== s) })} />
                      {s}
                    </label>
                  ))}
                </div>
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <Field label="Đánh giá"><Stars rating={form.rating ?? 3} onSet={(n) => setForm({ ...form, rating: n })} /></Field>
                <Field label="Ghi chú đánh giá"><input className="input-base" style={{ width: '100%' }} value={form.ratingNote ?? ''} onChange={(e) => setForm({ ...form, ratingNote: e.target.value })} /></Field>
              </div>
              <Field label="Ghi chú"><textarea className="input-base" style={{ width: '100%', minHeight: 56, resize: 'vertical' }} value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            </div>
          </FormSection>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={closeForm}>Hủy</Button>
            <Button size="sm" onClick={handleSave} loading={createMut.isPending || updateMut.isPending || draftMut.isPending}>{draftMode ? 'Lưu nháp' : editTarget ? 'Lưu' : 'Thêm'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Xác nhận xóa" width={360}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Xóa nhà thầu <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>?</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Hủy</Button>
          <Button variant="danger" size="sm" onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)} loading={deleteMut.isPending}>Xóa</Button>
        </div>
      </Modal>
    </div>
  )
}
