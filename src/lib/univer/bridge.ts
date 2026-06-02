// Port of js/univer-bridge.js → TypeScript
// Client-side only — import with 'use client' or dynamic import

import type { IWorkbookData } from './types'

type UniverAPI = Record<string, unknown> & {
  createUniverSheet?: (data: IWorkbookData) => void
  onCommandExecuted?: (cb: () => void) => void
  getSnapshot?: () => IWorkbookData | null
  getActiveWorkbook?: () => { save?: () => IWorkbookData; getSnapshot?: () => IWorkbookData } | null
  exportXlsx?: (filename: string) => Promise<void>
  executeCommand?: (cmd: string, params: Record<string, unknown>) => Promise<void>
}

declare global {
  interface Window {
    UniverPresets?: Record<string, unknown>
    univer?: Record<string, unknown>
  }
}

// ── Wait for Univer UMD global ─────────────────────────────────────────────

function waitForUniver(maxMs = 10000): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    const start = Date.now()
    const check = () => {
      const pkg =
        window.UniverPresets ??
        (window as unknown as Record<string, unknown>)['@univerjs/presets'] ??
        window.univer
      if (pkg) return resolve(pkg as Record<string, unknown>)
      if (Date.now() - start > maxMs) return resolve(null)
      setTimeout(check, 100)
    }
    check()
  })
}

// ── Init ───────────────────────────────────────────────────────────────────

export async function initUniver(
  container: HTMLElement,
  snapshot?: IWorkbookData | null
): Promise<UniverAPI | null> {
  const UniverPresets = await waitForUniver()
  if (!UniverPresets) return null

  let univerAPI: UniverAPI

  try {
    const presets = UniverPresets as Record<string, unknown>
    if (typeof presets.createUniverOnce === 'function') {
      univerAPI = (presets.createUniverOnce as Function)(container, {
        theme: presets.defaultTheme,
        locale: 'zh-CN',
        collaboration: false,
      }) as UniverAPI
    } else {
      const core = presets.core as Record<string, unknown>
      const { univer } = (core.createUniver as Function)({
        theme: (core.defaultTheme ?? presets.defaultTheme),
        locale: 'zh-CN',
      })
      const sheets = presets.sheets as Record<string, unknown>
      const sheetsUi = presets.sheetsUi as Record<string, unknown> | undefined
      const formulaEngine = presets.formulaEngine as Record<string, unknown> | undefined
      const sheetsFormula = presets.sheetsFormula as Record<string, unknown> | undefined
      univer.registerPlugin(sheets.UniverSheetsPlugin)
      if (sheetsUi?.UniverSheetsUIPlugin) univer.registerPlugin(sheetsUi.UniverSheetsUIPlugin)
      if (formulaEngine?.UniverFormulaEnginePlugin) univer.registerPlugin(formulaEngine.UniverFormulaEnginePlugin)
      if (sheetsFormula?.UniverSheetsFormulaPlugin) univer.registerPlugin(sheetsFormula.UniverSheetsFormulaPlugin)
      univerAPI = univer as UniverAPI
    }
  } catch {
    return null
  }

  if (snapshot && typeof snapshot === 'object') {
    try {
      univerAPI.createUniverSheet?.(snapshot)
    } catch {
      createBlankWorkbook(univerAPI)
    }
  } else {
    createBlankWorkbook(univerAPI)
  }

  return univerAPI
}

// ── Blank workbook ─────────────────────────────────────────────────────────

function createBlankWorkbook(api: UniverAPI) {
  api.createUniverSheet?.({
    id: 'estimate-workbook',
    name: 'Dự Toán',
    sheetOrder: ['estimate-sheet'],
    sheets: {
      'estimate-sheet': {
        id: 'estimate-sheet',
        name: 'Dự Toán Chi Phí',
        cellData: {
          0: { 0: { v: 'BẢNG DỰ TOÁN CHI PHÍ THI CÔNG' } },
          1: { 0: { v: 'Mở Calculator để bóc KL, hoặc nhập trực tiếp vào bảng.' } },
        },
        rowCount: 100,
        columnCount: 13,
      },
    },
    styles: {},
    locale: 'vi-VN',
  })
}

// ── Snapshot helpers ───────────────────────────────────────────────────────

export function getSnapshot(api: UniverAPI): IWorkbookData | null {
  try {
    if (typeof api.getSnapshot === 'function') return api.getSnapshot()
    if (typeof api.getActiveWorkbook === 'function') {
      const wb = api.getActiveWorkbook()
      if (wb?.save) return wb.save()
      if (wb?.getSnapshot) return wb.getSnapshot()
    }
    return null
  } catch {
    return null
  }
}

export function loadSnapshot(api: UniverAPI, snapshot: IWorkbookData) {
  try {
    api.createUniverSheet?.(snapshot)
  } catch (e) {
    console.error('[UniverBridge] loadSnapshot error:', e)
  }
}

// ── Export xlsx ────────────────────────────────────────────────────────────

export async function exportXlsx(api: UniverAPI, filename?: string): Promise<void> {
  const name = filename ?? `DuToan_${new Date().toISOString().slice(0, 10)}.xlsx`
  if (typeof api.exportXlsx === 'function') {
    await api.exportXlsx(name)
    return
  }
  if (typeof api.executeCommand === 'function') {
    await api.executeCommand('export-xlsx.command.export', { filename: name })
    return
  }
  alert('Tính năng xuất Excel chưa sẵn sàng. Vui lòng thử lại sau.')
}

// ── Auto-save ──────────────────────────────────────────────────────────────

interface AutoSaveOptions {
  projectId: number
  saveFn: (projectId: number, snapshot: string) => Promise<void>
  onStateChange?: (state: 'syncing' | 'saved' | 'error') => void
  debounceMs?: number
}

export function setupAutoSave(api: UniverAPI, opts: AutoSaveOptions) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let isSaving = false

  async function doSave() {
    if (isSaving) return
    isSaving = true
    try {
      const snap = getSnapshot(api)
      if (snap) {
        opts.onStateChange?.('syncing')
        await opts.saveFn(opts.projectId, JSON.stringify(snap))
        opts.onStateChange?.('saved')
      }
    } catch {
      opts.onStateChange?.('error')
    } finally {
      isSaving = false
    }
  }

  function schedule() {
    if (timer) clearTimeout(timer)
    opts.onStateChange?.('syncing')
    timer = setTimeout(doSave, opts.debounceMs ?? 5000)
  }

  if (typeof api.onCommandExecuted === 'function') {
    api.onCommandExecuted(schedule)
  } else {
    const interval = setInterval(doSave, 30000)
    return () => clearInterval(interval)
  }

  return () => { if (timer) clearTimeout(timer) }
}
