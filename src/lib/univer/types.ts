// Univer IWorkbookData compatible types

export interface CellProps {
  v?: string | number | null
  f?: string         // formula
  s?: string         // style id
  t?: number         // cell type
}

export interface SheetData {
  id: string
  name: string
  cellData: Record<number, Record<number, CellProps>>
  mergeData?: MergeData[]
  columnData?: Record<number, { w: number }>
  rowCount: number
  columnCount: number
  defaultRowHeight?: number
  showGridlines?: number
  freeze?: { startRow: number; startColumn: number; ySplit: number; xSplit: number }
}

export interface MergeData {
  startRow: number
  endRow: number
  startColumn: number
  endColumn: number
}

export interface IWorkbookData {
  id: string
  name: string
  sheetOrder: string[]
  sheets: Record<string, SheetData>
  styles: Record<string, unknown>
  locale?: string
}

export interface ProjectInfo {
  name?: string
  address?: string
}

export interface ConstructionItemRow {
  name?: string
  description?: string
  length?: number | string | null
  width?: number | string | null
  height?: number | string | null
  n?: number | string | null
  coeff?: number | string | null
  note?: string
}

export interface ConstructionItem {
  id: string
  type: string
  stt?: string | number
  name?: string
  unit?: string
  qty?: number | string
  unitPriceMat?: number | string
  unitPriceLab?: number | string
  note?: string
  rows?: ConstructionItemRow[]
}
