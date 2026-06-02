'use client'

import { useEffect, useRef, useCallback } from 'react'
import { initUniver, getSnapshot, loadSnapshot, exportXlsx, setupAutoSave } from '@/lib/univer/bridge'
import { useEstimateStore } from '../_hooks/useEstimateStore'
import type { IWorkbookData } from '@/lib/univer/types'

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

  const handleSave = useCallback(
    async (pid: number, snapshot: string) => {
      await onSave(snapshot)
    },
    [onSave]
  )

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    async function init() {
      const container = containerRef.current!
      const api = await initUniver(container, initialSnapshot ?? null)
      if (cancelled || !api) return

      apiRef.current = api

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
    // projectId / readonly should not re-init; only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When initialSnapshot changes (e.g. loaded from API), reload into existing instance
  useEffect(() => {
    if (!apiRef.current || !initialSnapshot) return
    loadSnapshot(apiRef.current, initialSnapshot)
  }, [initialSnapshot])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 500,
        background: 'var(--bg-main)',
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid var(--border-glass)',
      }}
    />
  )
}

export function getSpreadsheetSnapshot(): IWorkbookData | null {
  // Call this from parent to get current snapshot imperatively
  // (used by save-now button)
  return null
}
