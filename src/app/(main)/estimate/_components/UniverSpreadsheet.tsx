'use client'

import { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import { initUniver, getSnapshot, loadSnapshot, exportXlsx, setupAutoSave } from '@/lib/univer/bridge'
import { useEstimateStore } from '../_hooks/useEstimateStore'
import type { CellProps, IWorkbookData } from '@/lib/univer/types'

interface Props {
  projectId: number
  initialSnapshot?: IWorkbookData | null
  onSave: (snapshot: string) => Promise<void>
  readonly?: boolean
}

export function UniverSpreadsheet({ projectId, initialSnapshot, onSave, readonly = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<Record<string, unknown> | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const setSaveBadge = useEstimateStore((s) => s.setSaveBadge)
  const onSaveRef = useRef(onSave)
  const [mode, setMode] = useState<'loading' | 'univer' | 'fallback'>('loading')

  // Keep ref current so the auto-save closure always calls the latest onSave
  // without triggering a Univer re-init on every render.
  useEffect(() => { onSaveRef.current = onSave }, [onSave])

  const handleSave = useCallback(async (_pid: number, snapshot: string) => {
    await onSaveRef.current(snapshot)
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    async function init() {
      const container = containerRef.current!
      const api = await initUniver(container, initialSnapshot ?? null)
      if (cancelled) return
      if (!api) {
        setMode('fallback')
        return
      }

      apiRef.current = api
      setMode('univer')

      if (!readonly) {
        const cleanup = setupAutoSave(api, {
          projectId,
          saveFn: handleSave,
          onStateChange: setSaveBadge,
          debounceMs: 5000,
        })
        cleanupRef.current = cleanup ?? null
      }
    }

    init()
    return () => {
      cancelled = true
      cleanupRef.current?.()
    }
    // Univer instance is initialized once on mount — projectId/readonly changes
    // do not re-init the spreadsheet engine to avoid losing in-memory state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When initialSnapshot changes (e.g. loaded from API), reload into existing instance
  useEffect(() => {
    if (!apiRef.current || !initialSnapshot) return
    loadSnapshot(apiRef.current, initialSnapshot)
  }, [initialSnapshot])

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 500, position: 'relative' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 500,
          display: mode === 'fallback' ? 'none' : 'block',
          background: 'var(--bg-main)',
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid var(--border-glass)',
        }}
      />
      {mode === 'fallback' && <WorkbookFallback snapshot={initialSnapshot} readonly={readonly} />}
    </div>
  )
}

function WorkbookFallback({ snapshot, readonly }: { snapshot?: IWorkbookData | null; readonly: boolean }) {
  const table = useMemo(() => extractSheetTable(snapshot), [snapshot])

  return (
    <div className="glass-card" style={{ height: '100%', minHeight: 500, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Bảng dự toán chi phí</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Đang dùng chế độ bảng dự phòng vì engine bảng tính chưa tải được.
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', color: readonly ? '#fbbf24' : '#22c55e', fontWeight: 700 }}>
          {readonly ? 'Chỉ xem' : 'Có thể xem dữ liệu'}
        </span>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980, fontSize: '0.8125rem' }}>
          <tbody>
            {table.map((row, rowIndex) => (
              <tr key={rowIndex} style={{ background: rowIndex === 5 ? 'rgba(0, 242, 254, 0.08)' : 'transparent' }}>
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    style={{
                      border: '1px solid var(--border-glass)',
                      padding: rowIndex <= 4 ? '0.5rem 0.625rem' : '0.375rem 0.5rem',
                      color: rowIndex <= 5 ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: rowIndex <= 5 || colIndex === 1 ? 700 : 500,
                      textAlign: colIndex >= 3 && colIndex <= 11 ? 'right' : 'left',
                      whiteSpace: colIndex === 1 ? 'normal' : 'nowrap',
                    }}
                  >
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function extractSheetTable(snapshot?: IWorkbookData | null): CellProps[][] {
  const sheetId = snapshot?.sheetOrder?.[0]
  const sheet = sheetId ? snapshot?.sheets?.[sheetId] : undefined
  const rowCount = Math.min(sheet?.rowCount ?? 12, 80)
  const colCount = Math.min(sheet?.columnCount ?? 13, 13)

  return Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from({ length: colCount }, (_, colIndex) => sheet?.cellData?.[rowIndex]?.[colIndex] ?? {})
  ).filter((row, index) => index <= 6 || row.some((cell) => cell.v !== undefined && cell.v !== null && cell.v !== ''))
}

function formatCell(cell: CellProps): string {
  if (cell.v === null || cell.v === undefined || cell.v === '') return cell.f ? '...' : ''
  if (typeof cell.v === 'number') return cell.v.toLocaleString('vi-VN')
  return String(cell.v)
}

export function getSpreadsheetSnapshot(): IWorkbookData | null {
  // Call this from parent to get current snapshot imperatively
  // (used by save-now button)
  return null
}
