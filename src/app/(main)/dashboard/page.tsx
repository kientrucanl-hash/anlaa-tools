'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FolderOpen, Trash2, Send, CheckCircle, XCircle, Clock, FileText } from 'lucide-react'
import { useProjects, useCreateProject, useDeleteProject, useSubmitProject } from '@/lib/hooks/useProjects'
import { useAuth } from '@/lib/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatDateTime, statusLabel, statusClass } from '@/lib/utils'
import type { Project } from '@/lib/types/models'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { data: projects = [], isLoading } = useProjects()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()
  const submitProject = useSubmitProject()

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('Hà Nội')
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      const project = await createProject.mutateAsync({ name: newName.trim(), address: newAddress.trim() })
      showToast('Đã tạo dự án', 'success')
      setShowCreate(false)
      setNewName('')
      setNewAddress('Hà Nội')
      router.push(`/estimate?projectId=${(project as Project).id}`)
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteProject.mutateAsync(deleteTarget.id)
      showToast('Đã xóa dự án', 'success')
      setDeleteTarget(null)
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function handleSubmit(project: Project) {
    try {
      await submitProject.mutateAsync(project.id)
      showToast('Đã nộp duyệt dự án', 'success')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workspace dự toán"
        title="Dự án của tôi"
        subtitle={`${projects.length} dự án · mở dự án để lập bảng dự toán thay G8`}
        actions={(
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus size={14} /> Tạo dự án
        </Button>
        )}
      />

      {/* Project grid */}
      {isLoading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Đang tải...</div>
      ) : projects.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <FolderOpen size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Chưa có dự án nào</p>
          <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Tạo dự án mới để bắt đầu dự toán</p>
          <Button onClick={() => setShowCreate(true)} style={{ marginTop: '1.25rem' }} size="sm">
            <Plus size={14} /> Tạo dự án đầu tiên
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {(projects as Project[]).map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isAdmin={user?.role === 'ADMIN'}
              onOpen={() => router.push(`/estimate?projectId=${project.id}`)}
              onDelete={() => setDeleteTarget(project)}
              onSubmit={() => handleSubmit(project)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo dự án mới" width={420}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Tên dự án *
            </label>
            <input
              className="input-base"
              style={{ width: '100%', padding: '0.6rem 0.875rem', fontSize: '0.9rem' }}
              placeholder="VD: Cải tạo Căn hộ A12..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              autoFocus
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Địa chỉ
            </label>
            <input
              className="input-base"
              style={{ width: '100%', padding: '0.6rem 0.875rem', fontSize: '0.9rem' }}
              placeholder="Hà Nội"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button size="sm" onClick={handleCreate} loading={createProject.isPending} disabled={!newName.trim()}>
              Tạo dự án
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Xác nhận xóa" width={380}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Bạn chắc chắn muốn xóa dự án <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>? Hành động này không thể hoàn tác.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Hủy</Button>
          <Button variant="danger" size="sm" onClick={handleDelete} loading={deleteProject.isPending}>
            Xóa dự án
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function statusIcon(s: string) {
  if (s === 'APPROVED') return <CheckCircle size={13} />
  if (s === 'REJECTED') return <XCircle size={13} />
  if (s === 'PENDING') return <Clock size={13} />
  return <FileText size={13} />
}

function ProjectCard({ project, isAdmin, onOpen, onDelete, onSubmit }: {
  project: Project
  isAdmin: boolean
  onOpen: () => void
  onDelete: () => void
  onSubmit: () => void
}) {
  const canSubmit = ['DRAFT', 'REJECTED'].includes(project.status)
  const canDelete = isAdmin

  return (
    <div
      className="glass-card"
      style={{ padding: '1rem', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen() }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {(project as unknown as Record<string, string>).address || 'Không có địa chỉ'}
          </div>
        </div>
        <span className={statusClass(project.status)} style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, flexShrink: 0,
        }}>
          {statusIcon(project.status)}
          {statusLabel(project.status)}
        </span>
      </div>

      {/* Meta */}
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        Cập nhật {formatDateTime(project.updatedAt)}
        {(project as unknown as Record<string, string>).myRole && (project as unknown as Record<string, string>).myRole !== 'owner' && (
          <span style={{ marginLeft: '0.5rem', color: 'var(--color-tiling)' }}>
            ({(project as unknown as Record<string, string>).myRole})
          </span>
        )}
      </div>

      {/* Admin note */}
      {project.adminNote && project.status === 'REJECTED' && (
        <div style={{
          fontSize: '0.75rem', color: '#ef4444',
          background: 'rgba(239,68,68,0.08)', borderRadius: 7,
          padding: '0.4rem 0.6rem', marginBottom: '0.75rem',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          Lý do từ chối: {project.adminNote}
        </div>
      )}

      {/* Actions */}
      <div
        style={{ display: 'flex', gap: '0.4rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button size="sm" variant="secondary" onClick={onOpen} style={{ flex: 1 }}>
          <FolderOpen size={12} /> Mở
        </Button>
        {canSubmit && (
          <Button size="sm" variant="secondary" onClick={onSubmit} title="Nộp duyệt">
            <Send size={12} />
          </Button>
        )}
        {canDelete && (
          <Button size="sm" variant="danger" onClick={onDelete} title="Xóa">
            <Trash2 size={12} />
          </Button>
        )}
      </div>
    </div>
  )
}
