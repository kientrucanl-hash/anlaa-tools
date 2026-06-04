'use client'

import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { Download, RefreshCw, Send, ChevronLeft } from 'lucide-react'
import { useProject, useUpdateProject, useSubmitProject } from '@/lib/hooks/useProjects'
import { projectsApi, estimateTemplatesApi } from '@/lib/api/client'
import { useEstimateStore } from './_hooks/useEstimateStore'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { buildEstimateWorkbookData } from '@/lib/univer/template'
import type { ConstructionItem, IWorkbookData } from '@/lib/univer/types'

// Dynamic import so Univer only loads client-side (heavy bundle)
const UniverSpreadsheet = dynamic(
  () => import('./_components/UniverSpreadsheet').then((m) => ({ default: m.UniverSpreadsheet })),
  { ssr: false, loading: () => <UniverseLoader /> }
)

function UniverseLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
      <LoadingSpinner size="lg" />
      <p style={{ fontSize: '0.875rem' }}>Đang tải bảng tính...</p>
    </div>
  )
}

function EstimateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId') ? parseInt(searchParams.get('projectId')!) : null
  const { showToast } = useToast()

  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const submitProject = useSubmitProject()
  const { setProject, saveBadge, setSaveBadge, project: storeMeta } = useEstimateStore()

  const [snapshot, setSnapshot] = useState<IWorkbookData | null>(null)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState<unknown[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Sync project meta into store
  useEffect(() => {
    if (!project) return
    const p = project as unknown as Record<string, unknown>
    setProject({
      id: Number(p.id),
      name: String(p.name ?? ''),
      address: String(p.address ?? ''),
      status: String(p.status ?? 'DRAFT'),
    })
  }, [project, setProject])

  // Load snapshot from API
  useEffect(() => {
    if (!projectId || !project) return
    const projectData = project as unknown as Record<string, unknown>
    setSnapshotLoading(true)
    projectsApi.getSnapshot(projectId)
      .then((res) => {
        if (res.snapshot) {
          try { setSnapshot(JSON.parse(res.snapshot)) } catch { setSnapshot(null) }
        } else {
          setSnapshot(buildEstimateWorkbookData(
            {
              name: String(projectData.name ?? ''),
              address: String(projectData.address ?? ''),
            },
            (Array.isArray(projectData.data) ? projectData.data : []) as ConstructionItem[]
          ))
        }
      })
      .catch(() => {
        setSnapshot(buildEstimateWorkbookData(
          {
            name: String(projectData.name ?? ''),
            address: String(projectData.address ?? ''),
          },
          (Array.isArray(projectData.data) ? projectData.data : []) as ConstructionItem[]
        ))
      })
      .finally(() => setSnapshotLoading(false))
  }, [projectId, project])

  const handleSave = useCallback(async (snapshotStr: string) => {
    if (!projectId) return
    await projectsApi.saveSnapshot(projectId, snapshotStr)
  }, [projectId])

  async function handleSubmit() {
    if (!projectId) return
    try {
      await submitProject.mutateAsync(projectId)
      showToast('Đã nộp duyệt dự án', 'success')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function handleExport() {
    // Dynamically import export function to avoid SSR
    const { exportXlsx } = await import('@/lib/univer/bridge')
    const { getSpreadsheetSnapshot } = await import('./_components/UniverSpreadsheet')
    showToast('Xuất Excel... (tính năng đầy đủ cần Univer xlsx plugin)', 'info')
  }

  async function openTemplates() {
    setShowTemplates(true)
    if (templates.length === 0) {
      setLoadingTemplates(true)
      try {
        const list = await estimateTemplatesApi.list()
        setTemplates(list as unknown[])
      } catch { }
      finally { setLoadingTemplates(false) }
    }
  }

  async function applyTemplate(templateId: number) {
    try {
      const tmpl = await estimateTemplatesApi.get(templateId) as Record<string, unknown>
      const snap = typeof tmpl.snapshot === 'string' ? JSON.parse(tmpl.snapshot) : tmpl.snapshot
      setSnapshot(snap)
      setShowTemplates(false)
      showToast('Đã áp dụng mẫu dự toán', 'success')
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

  const p = project as Record<string, unknown> | undefined
  const canEdit = p && ['DRAFT', 'REJECTED'].includes(String(p.status))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px - 3rem)', gap: '0.75rem' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} style={{ padding: '0.375rem 0.5rem' }}>
          <ChevronLeft size={14} />
        </Button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {projectLoading ? (
            <div style={{ height: 20, width: 160, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
          ) : (
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p ? String(p.name) : '—'}
            </div>
          )}
        </div>

        {/* Save badge */}
        <span style={{
          fontSize: '0.75rem', fontWeight: 500, padding: '0.2rem 0.6rem', borderRadius: 6,
          color: saveBadge === 'saved' ? '#22c55e' : saveBadge === 'error' ? '#ef4444' : 'var(--text-muted)',
          background: saveBadge === 'saved' ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-glass)',
        }}>
          {saveBadge === 'syncing' ? '⟳ Đang lưu...' : saveBadge === 'saved' ? '✓ Đã lưu' : saveBadge === 'error' ? '⚠ Lỗi lưu' : '○ Chưa lưu'}
        </span>

        <Button variant="secondary" size="sm" onClick={openTemplates}>
          Từ mẫu
        </Button>

        <Button variant="secondary" size="sm" onClick={handleExport}>
          <Download size={13} /> Xuất xlsx
        </Button>

        {canEdit && (
          <Button size="sm" onClick={handleSubmit} loading={submitProject.isPending}>
            <Send size={13} /> Nộp duyệt
          </Button>
        )}
      </div>

      {/* Spreadsheet */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {(projectLoading || snapshotLoading) ? (
          <UniverseLoader />
        ) : (
          <UniverSpreadsheet
            projectId={projectId}
            initialSnapshot={snapshot}
            onSave={handleSave}
            readonly={!canEdit}
          />
        )}
      </div>

      {/* Templates modal */}
      <Modal open={showTemplates} onClose={() => setShowTemplates(false)} title="Chọn mẫu dự toán" width={520}>
        {loadingTemplates ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Đang tải mẫu...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(templates as Array<{ id: number; name: string; category: string; description?: string }>).map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => applyTemplate(tmpl.id)}
                style={{
                  textAlign: 'left', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)',
                  borderRadius: 10, padding: '0.875rem 1rem', cursor: 'pointer', transition: 'background 0.15s',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{tmpl.name}</div>
                {tmpl.description && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 3 }}>{tmpl.description}</div>
                )}
              </button>
            ))}
            {templates.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Chưa có mẫu dự toán</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default function EstimatePage() {
  return (
    <Suspense fallback={<UniverseLoader />}>
      <EstimateContent />
    </Suspense>
  )
}
