'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FolderOpen, RefreshCw, FileText, CheckCircle, XCircle, Clock, Users } from 'lucide-react'
import { useProjects } from '@/lib/hooks/useProjects'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatDateTime, statusLabel, statusClass } from '@/lib/utils'
import type { Project, ProjectStatus } from '@/lib/types/models'

const STATUS_FILTERS: { value: ProjectStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
]

function statusIcon(s: string) {
  if (s === 'APPROVED') return <CheckCircle size={12} />
  if (s === 'REJECTED') return <XCircle size={12} />
  if (s === 'PENDING') return <Clock size={12} />
  return <FileText size={12} />
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Đang tải...</div>}>
      <HistoryContent />
    </Suspense>
  )
}

function HistoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const detailId = Number(searchParams.get('id') || 0)
  const { data: projects = [], isLoading, refetch } = useProjects()
  const [filter, setFilter] = useState<ProjectStatus | 'ALL'>('ALL')
  const [detail, setDetail] = useState<Project | null>(null)

  useEffect(() => {
    if (!detailId) {
      setDetail(null)
      return
    }
    const found = (projects as Project[]).find((item) => item.id === detailId)
    if (found) setDetail(found)
  }, [detailId, projects])

  function closeDetail() {
    setDetail(null)
    router.push('/history')
  }

  const filtered = filter === 'ALL' ? projects : projects.filter((p) => p.status === filter)

  return (
    <div>
      <PageHeader
        eyebrow="Audit dự toán"
        title="Lịch sử dự toán"
        subtitle={`${filtered.length} dự án${filter !== 'ALL' ? ` · ${statusLabel(filter as ProjectStatus)}` : ''}`}
        actions={(
          <>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ProjectStatus | 'ALL')}
            className="input-base"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={() => refetch()} title="Làm mới">
            <RefreshCw size={13} />
          </Button>
          </>
        )}
      />

      {/* List */}
      {isLoading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Không có dự án nào</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}>
                {['Tên dự án', 'Địa chỉ', 'Hạng mục', 'Cập nhật', 'Trạng thái', ''].map((h) => (
                  <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(filtered as Project[]).map((project, i) => (
                <tr
                  key={project.id}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border-glass)' : undefined,
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  onClick={() => router.push(`/history/${project.id}`)}
                >
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.name}
                    </div>
                    {(project as unknown as Record<string, string>).myRole && (project as unknown as Record<string, string>).myRole !== 'owner' && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-tiling)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Users size={10} /> {(project as unknown as Record<string, string>).myRole}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', maxWidth: 150 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.address || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                    {Array.isArray(project.data) ? project.data.length : 0} hạng mục
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    {formatDateTime(project.updatedAt)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={statusClass(project.status)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
                    }}>
                      {statusIcon(project.status)}
                      {statusLabel(project.status)}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="secondary" onClick={() => router.push(`/estimate?projectId=${project.id}`)}>
                      <FolderOpen size={12} /> Mở
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      <Modal open={!!detail} onClose={closeDetail} title={detail?.name ?? ''} width={640}>
        {detail && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.82rem' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Địa chỉ:</span> <strong>{detail.address || '—'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Cập nhật:</span> <strong>{formatDateTime(detail.updatedAt)}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Trạng thái:</span>{' '}
                <span className={statusClass(detail.status)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '0.15rem 0.4rem', borderRadius: 5, fontSize: '0.7rem', fontWeight: 600 }}>
                  {statusIcon(detail.status)}{statusLabel(detail.status)}
                </span>
              </div>
              <div><span style={{ color: 'var(--text-muted)' }}>Hạng mục:</span> <strong>{Array.isArray(detail.data) ? detail.data.length : 0}</strong></div>
            </div>

            {detail.adminNote && detail.status === 'REJECTED' && (
              <div style={{ fontSize: '0.8rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: 7, padding: '0.5rem 0.75rem', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                Lý do từ chối: {detail.adminNote}
              </div>
            )}

            {/* BOQ table */}
            {Array.isArray(detail.data) && detail.data.length > 0 && (
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
                    <tr>
                      {['#', 'Tên hạng mục', 'Loại'].map((h) => (
                        <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.73rem', borderBottom: '1px solid var(--border-glass)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.data as unknown as Array<Record<string, unknown>>).map((item, i) => (
                      <tr key={String(item.id ?? i)} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                        <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-primary)', fontWeight: 500 }}>{String(item.name ?? '—')}</td>
                        <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-muted)' }}>{String(item.type ?? '—')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="secondary" size="sm" onClick={closeDetail}>Đóng</Button>
              <Button size="sm" onClick={() => { router.push(`/estimate?projectId=${detail.id}`); setDetail(null) }}>
                <FolderOpen size={13} /> Mở trong Calculator
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
