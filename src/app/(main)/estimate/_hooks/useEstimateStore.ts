'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { ConstructionItem } from '@/lib/univer/types'

export interface ProjectMeta {
  id: number | null
  name: string
  address: string
  status: string
}

interface EstimateState {
  project: ProjectMeta
  items: ConstructionItem[]
  workItemPrices: Record<string, number>
  undoStack: ConstructionItem[][]
  redoStack: ConstructionItem[][]
  saveBadge: 'idle' | 'syncing' | 'saved' | 'error'
  isDirty: boolean

  setProject: (meta: Partial<ProjectMeta>) => void
  setItems: (items: ConstructionItem[]) => void
  addItem: (item: ConstructionItem) => void
  updateItem: (id: string, patch: Partial<ConstructionItem>) => void
  deleteItem: (id: string) => void
  setPrices: (prices: Record<string, number>) => void
  setSaveBadge: (state: 'idle' | 'syncing' | 'saved' | 'error') => void
  pushUndo: () => void
  undo: () => void
  redo: () => void
  reset: () => void
}

export const useEstimateStore = create<EstimateState>()(
  immer((set, get) => ({
    project: { id: null, name: '', address: '', status: 'DRAFT' },
    items: [],
    workItemPrices: {},
    undoStack: [],
    redoStack: [],
    saveBadge: 'idle',
    isDirty: false,

    setProject: (meta) =>
      set((s) => { Object.assign(s.project, meta) }),

    setItems: (items) =>
      set((s) => { s.items = items; s.isDirty = true }),

    addItem: (item) =>
      set((s) => { s.items.push(item); s.isDirty = true }),

    updateItem: (id, patch) =>
      set((s) => {
        const idx = s.items.findIndex((i) => i.id === id)
        if (idx !== -1) { Object.assign(s.items[idx]!, patch); s.isDirty = true }
      }),

    deleteItem: (id) =>
      set((s) => { s.items = s.items.filter((i) => i.id !== id); s.isDirty = true }),

    setPrices: (prices) =>
      set((s) => { s.workItemPrices = prices }),

    setSaveBadge: (state) =>
      set((s) => { s.saveBadge = state; if (state === 'saved') s.isDirty = false }),

    pushUndo: () =>
      set((s) => {
        s.undoStack.push([...s.items])
        if (s.undoStack.length > 50) s.undoStack.shift()
        s.redoStack = []
      }),

    undo: () =>
      set((s) => {
        const prev = s.undoStack.pop()
        if (prev) { s.redoStack.push([...s.items]); s.items = prev; s.isDirty = true }
      }),

    redo: () =>
      set((s) => {
        const next = s.redoStack.pop()
        if (next) { s.undoStack.push([...s.items]); s.items = next; s.isDirty = true }
      }),

    reset: () =>
      set((s) => {
        s.items = []
        s.undoStack = []
        s.redoStack = []
        s.isDirty = false
        s.saveBadge = 'idle'
      }),
  }))
)
