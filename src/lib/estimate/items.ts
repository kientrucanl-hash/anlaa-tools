import { DEFAULT_REGION, MATERIAL_NORMS, PURCHASE_MATERIAL_LABELS, REGION_PRICES, WORK_ITEM_DIMS } from '@/lib/constants'

export interface EstimateRowLike {
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

export interface EstimateItemLike {
  id?: string | number
  type?: string
  workItemKey?: string
  name?: string
  unit?: string
  qty?: number | string | null
  unitPrice?: number | string | null
  unitPriceMat?: number | string | null
  unitPriceLab?: number | string | null
  rows?: EstimateRowLike[]
  results?: Record<string, unknown>
  stt?: string | number
  expanded?: boolean
}

export interface MaterialPurchaseEntry {
  key: string
  name: string
  unit: string
  qty: number
  purchaseQty: number
  packUnit: string
  fromItems: string[]
}

const DEFAULT_PRICES = REGION_PRICES[DEFAULT_REGION].prices

export function isEstimateSection(item: EstimateItemLike): boolean {
  return item.type === 'section' || item.workItemKey === 'section'
}

export function getEstimateWorkKey(item: EstimateItemLike): string {
  return String(item.workItemKey ?? item.type ?? 'custom')
}

export function getEstimateName(item: EstimateItemLike): string {
  const key = getEstimateWorkKey(item)
  return String(item.name ?? WORK_ITEM_DIMS[key]?.label ?? 'Hang muc')
}

export function getEstimateUnit(item: EstimateItemLike): string {
  const key = getEstimateWorkKey(item)
  return String(item.unit ?? WORK_ITEM_DIMS[key]?.unit ?? 'm2')
}

export function getEstimateUnitPrice(item: EstimateItemLike): number {
  const key = getEstimateWorkKey(item)
  const direct = numberValue(item.unitPrice)
  if (direct > 0) return direct
  const material = numberValue(item.unitPriceMat)
  const labor = numberValue(item.unitPriceLab)
  if (material + labor > 0) return material + labor
  return DEFAULT_PRICES[key] ?? 0
}

export function normalizeEstimateRows(rows: EstimateRowLike[] | undefined): EstimateRowLike[] {
  if (!Array.isArray(rows) || rows.length === 0) return [blankEstimateRow()]
  return rows.map((row) => ({ ...blankEstimateRow(), ...row }))
}

export function blankEstimateRow(): EstimateRowLike {
  return { desc: '', l: '', w: '', h: '', n: 1, hs: 1 }
}

export function getEstimateDims(item: EstimateItemLike): string[] {
  return WORK_ITEM_DIMS[getEstimateWorkKey(item)]?.dims ?? ['l', 'w', 'h']
}

export function getEstimateRowValue(row: EstimateRowLike, key: 'l' | 'w' | 'h'): number | string | null | undefined {
  if (key === 'l') return row.l ?? row.length
  if (key === 'w') return row.w ?? row.width
  return row.h ?? row.height
}

export function getEstimateRowDesc(row: EstimateRowLike): string {
  return String(row.desc ?? row.name ?? row.description ?? '')
}

export function calcEstimateRowQty(row: EstimateRowLike, dims: string[]): number {
  const n = numberValue(row.n) || 1
  const l = numberValue(getEstimateRowValue(row, 'l'))
  const w = numberValue(getEstimateRowValue(row, 'w'))
  const h = numberValue(getEstimateRowValue(row, 'h'))
  const hs = row.hs !== undefined ? numberValue(row.hs) || 1 : numberValue(row.coeff) || 1
  if (dims.length === 0) return n * hs
  if (!l) return 0
  let qty = l
  if (dims.includes('w')) qty *= w || 0
  if (dims.includes('h')) qty *= h || 0
  return qty * n * hs
}

export function calcEstimateItemQty(item: EstimateItemLike): number {
  if (isEstimateSection(item)) return 0
  if (Array.isArray(item.rows) && item.rows.length > 0) {
    const dims = getEstimateDims(item)
    return normalizeEstimateRows(item.rows).reduce((sum, row) => sum + calcEstimateRowQty(row, dims), 0)
  }
  const resultsQty = getResultsQty(item.results)
  if (resultsQty > 0) return resultsQty
  return numberValue(item.qty)
}

export function serializeEstimateItems<T extends EstimateItemLike>(items: T[]): T[] {
  return items.map((item) => {
    if (isEstimateSection(item)) return item
    const qty = calcEstimateItemQty(item)
    const unitPrice = getEstimateUnitPrice(item)
    return {
      ...item,
      type: getEstimateWorkKey(item),
      workItemKey: getEstimateWorkKey(item),
      qty,
      unitPrice,
      unitPriceMat: unitPrice,
    }
  })
}

export function extractMaterialsFromEstimateItems(items: EstimateItemLike[]): MaterialPurchaseEntry[] {
  const map = new Map<string, MaterialPurchaseEntry>()

  for (const item of items) {
    if (isEstimateSection(item)) continue
    const workKey = getEstimateWorkKey(item)
    const qty = Math.max(0, calcEstimateItemQty(item))
    if (qty <= 0) continue

    for (const norm of MATERIAL_NORMS[workKey] ?? []) {
      const label = PURCHASE_MATERIAL_LABELS[norm.key]
      if (!label) continue
      const rawQty = qty * norm.perUnit
      const purchaseQty = toPurchaseQty(rawQty, label.packSize, label.displayUnit)
      const existing = map.get(norm.key)
      if (existing) {
        existing.qty += rawQty
        existing.purchaseQty += purchaseQty
        existing.fromItems.push(getEstimateName(item))
      } else {
        map.set(norm.key, {
          key: norm.key,
          name: label.name,
          unit: label.displayUnit,
          qty: rawQty,
          purchaseQty,
          packUnit: label.packUnit,
          fromItems: [getEstimateName(item)],
        })
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}

export function numberValue(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getResultsQty(results: Record<string, unknown> | undefined): number {
  if (!results) return 0
  return numberValue(results.netArea) || numberValue(results.area) || numberValue(results.volume) || numberValue(results.length) || numberValue(results.qty)
}

function toPurchaseQty(rawQty: number, packSize: number | null, unit: string): number {
  if (rawQty <= 0) return 0
  if (packSize && packSize > 0) return Math.ceil(rawQty / packSize)
  if (unit === 'm³' || unit === 'm3') return Math.ceil(rawQty * 10) / 10
  if (unit === 'kg') return Math.ceil(rawQty)
  return Math.ceil(rawQty)
}
