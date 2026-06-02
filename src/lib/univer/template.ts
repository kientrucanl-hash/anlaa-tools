// Port of js/univer-template.js → TypeScript
// Builds IWorkbookData for @univerjs/presets — 1:1 logic with source

import type { IWorkbookData, CellProps, MergeData, ConstructionItem, ProjectInfo } from './types'

const COL_COUNT = 13

function setCell(
  cellData: Record<number, Record<number, CellProps>>,
  r: number, c: number, props: CellProps
) {
  if (!cellData[r]) cellData[r] = {}
  cellData[r][c] = props
}

export function buildEstimateWorkbookData(
  projectInfo: ProjectInfo,
  constructionItems: ConstructionItem[],
  workItemPrices: Record<string, number> = {}
): IWorkbookData {
  const info = projectInfo ?? {}
  const items = Array.isArray(constructionItems) ? constructionItems : []
  const prices = workItemPrices ?? {}

  const today = new Date().toLocaleDateString('vi-VN')
  const projectName = (info.name ?? 'Chưa đặt tên').toUpperCase()
  const projectAddress = info.address ?? ''

  const cellData: Record<number, Record<number, CellProps>> = {}
  let row = 0

  // ── Header rows 0–4 ────────────────────────────────────────────────────────
  setCell(cellData, 0, 0, { v: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', s: 's_title_sm' })
  setCell(cellData, 1, 0, { v: 'Độc lập - Tự do - Hạnh phúc', s: 's_center_italic' })
  setCell(cellData, 2, 0, { v: 'BẢNG DỰ TOÁN CHI PHÍ THI CÔNG', s: 's_main_title' })
  setCell(cellData, 3, 0, { v: `Công trình: ${projectName}`, s: 's_project_info' })
  setCell(cellData, 4, 0, { v: `Địa điểm: ${projectAddress}`, s: 's_project_info' })
  setCell(cellData, 4, 8, { v: `Ngày lập: ${today}`, s: 's_project_info' })

  // ── Column headers (row 5) ─────────────────────────────────────────────────
  row = 5
  const headers = ['STT', 'Hạng mục / Diễn giải', 'ĐVT', 'Dài (m)', 'Rộng (m)', 'Cao (m)', 'Số C.K', 'Hệ số', 'Khối lượng', 'ĐG Vật tư', 'ĐG Nhân công', 'Thành tiền', 'Ghi chú']
  headers.forEach((h, c) => setCell(cellData, row, c, { v: h, s: 's_col_header' }))

  // ── Data rows (from row 6) ─────────────────────────────────────────────────
  row = 6
  let sttCounter = 1
  const dataStartRow = row

  for (const item of items) {
    const isSection = item.type === 'section'

    if (isSection) {
      setCell(cellData, row, 0, { v: item.stt ?? '', s: 's_section' })
      setCell(cellData, row, 1, { v: item.name ?? '', s: 's_section' })
      for (let c = 2; c < COL_COUNT; c++) setCell(cellData, row, c, { v: '', s: 's_section' })
      row++
      continue
    }

    const detailRows = Array.isArray(item.rows) && item.rows.length > 0 ? item.rows : [null]

    setCell(cellData, row, 0, { v: sttCounter, s: 's_item' })
    setCell(cellData, row, 1, { v: item.name ?? '', s: 's_item_name' })
    setCell(cellData, row, 2, { v: item.unit ?? 'm²', s: 's_item' })
    setCell(cellData, row, 3, { v: '', s: 's_dim' })
    setCell(cellData, row, 4, { v: '', s: 's_dim' })
    setCell(cellData, row, 5, { v: '', s: 's_dim' })
    setCell(cellData, row, 6, { v: '', s: 's_dim' })
    setCell(cellData, row, 7, { v: '', s: 's_dim' })

    const matPrice = parseFloat(String(item.unitPriceMat)) || prices[item.type] || 0
    const labPrice = parseFloat(String(item.unitPriceLab)) || 0

    if (detailRows.length === 1 && detailRows[0] === null) {
      const qty = parseFloat(String(item.qty)) || 0
      setCell(cellData, row, 8, { v: qty, s: 's_num' })
      setCell(cellData, row, 9, { v: matPrice || null, s: 's_price' })
      setCell(cellData, row, 10, { v: labPrice || null, s: 's_price' })
      setCell(cellData, row, 11, {
        f: matPrice || labPrice ? `=I${row + 1}*(J${row + 1}+K${row + 1})` : undefined,
        v: 0,
        s: 's_total',
      })
    } else {
      const subRowStart = row + 1
      const subRowEnd = row + detailRows.length
      setCell(cellData, row, 8, { f: `=SUM(I${subRowStart + 1}:I${subRowEnd + 1})`, s: 's_num_bold' })
      setCell(cellData, row, 9, { v: matPrice || null, s: 's_price' })
      setCell(cellData, row, 10, { v: labPrice || null, s: 's_price' })
      setCell(cellData, row, 11, { f: `=I${row + 1}*(J${row + 1}+K${row + 1})`, s: 's_total' })
    }
    setCell(cellData, row, 12, { v: item.note ?? '', s: 's_note' })
    row++

    for (const dr of detailRows) {
      if (dr === null) continue
      setCell(cellData, row, 0, { v: '', s: 's_sub' })
      setCell(cellData, row, 1, { v: dr.name ?? dr.description ?? '', s: 's_sub_name' })
      setCell(cellData, row, 2, { v: '', s: 's_sub' })
      setCell(cellData, row, 3, { v: parseFloat(String(dr.length)) || null, s: 's_dim' })
      setCell(cellData, row, 4, { v: parseFloat(String(dr.width)) || null, s: 's_dim' })
      setCell(cellData, row, 5, { v: parseFloat(String(dr.height)) || null, s: 's_dim' })
      setCell(cellData, row, 6, { v: parseFloat(String(dr.n)) || null, s: 's_dim' })
      setCell(cellData, row, 7, { v: dr.coeff !== undefined ? parseFloat(String(dr.coeff)) : 1, s: 's_dim' })
      setCell(cellData, row, 8, {
        f: `=IF(AND(D${row+1}="",E${row+1}="",F${row+1}=""),0,IFERROR(D${row+1}*E${row+1}*F${row+1}*IF(G${row+1}="",1,G${row+1})*IF(H${row+1}="",1,H${row+1}),0))`,
        s: 's_num',
      })
      setCell(cellData, row, 9, { v: '', s: 's_sub' })
      setCell(cellData, row, 10, { v: '', s: 's_sub' })
      setCell(cellData, row, 11, { v: '', s: 's_sub' })
      setCell(cellData, row, 12, { v: dr.note ?? '', s: 's_note' })
      row++
    }
    sttCounter++
  }

  const dataEndRow = row - 1

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalRow = row
  setCell(cellData, row, 0, { v: '', s: 's_total_label' })
  setCell(cellData, row, 1, { v: 'TỔNG CHI PHÍ THI CÔNG:', s: 's_total_label' })
  for (let c = 2; c < 11; c++) setCell(cellData, row, c, { v: '', s: 's_total_label' })
  setCell(cellData, row, 11, { f: `=SUMIF(A${dataStartRow+1}:A${dataEndRow+1},"<>",L${dataStartRow+1}:L${dataEndRow+1})`, s: 's_grand_total' })
  setCell(cellData, row, 12, { v: '', s: 's_total_label' })
  row++

  const contingencyRow = row
  setCell(cellData, row, 0, { v: '', s: 's_sub_total' })
  setCell(cellData, row, 1, { v: 'Dự phòng phí (5%):', s: 's_sub_total' })
  for (let c = 2; c < 11; c++) setCell(cellData, row, c, { v: '', s: 's_sub_total' })
  setCell(cellData, row, 11, { f: `=L${totalRow+1}*0.05`, s: 's_sub_total_val' })
  setCell(cellData, row, 12, { v: '', s: 's_sub_total' })
  row++

  const grandTotalRow = row
  setCell(cellData, row, 0, { v: '', s: 's_grand_label' })
  setCell(cellData, row, 1, { v: 'TỔNG DỰ TOÁN:', s: 's_grand_label' })
  for (let c = 2; c < 11; c++) setCell(cellData, row, c, { v: '', s: 's_grand_label' })
  setCell(cellData, row, 11, { f: `=L${totalRow+1}+L${contingencyRow+1}`, s: 's_grand_val' })
  setCell(cellData, row, 12, { v: '', s: 's_grand_label' })
  row += 2

  // ── Signature ─────────────────────────────────────────────────────────────
  setCell(cellData, row, 0, { v: 'ĐƠN VỊ THI CÔNG', s: 's_sig_header' })
  setCell(cellData, row, 7, { v: 'CHỦ ĐẦU TƯ / KHÁCH HÀNG', s: 's_sig_header' })
  row++
  setCell(cellData, row, 0, { v: '(Ký, ghi rõ họ tên)', s: 's_sig_sub' })
  setCell(cellData, row, 7, { v: '(Ký, ghi rõ họ tên)', s: 's_sig_sub' })
  row += 4
  setCell(cellData, row, 0, { v: '', s: 's_sig_name' })
  setCell(cellData, row, 7, { v: '', s: 's_sig_name' })

  // ── Styles ─────────────────────────────────────────────────────────────────
  const styles: Record<string, unknown> = {
    s_title_sm:       { bl: 0, fs: 11, ht: 1, vt: 1 },
    s_center_italic:  { it: 1, fs: 11, ht: 1, vt: 1 },
    s_main_title:     { bl: 1, fs: 14, ht: 1, vt: 1, fc: { rgb: '00f2fe' } },
    s_project_info:   { bl: 0, fs: 11, vt: 1 },
    s_col_header:     { bl: 1, fs: 10, ht: 1, vt: 1, bg: { rgb: '1a1f35' }, fc: { rgb: 'ffffff' }, bd: { b: { s: 1, cl: { rgb: '333850' } } } },
    s_section:        { bl: 1, fs: 11, bg: { rgb: '0d1117' }, fc: { rgb: '00f2fe' } },
    s_item:           { fs: 10, ht: 1, vt: 1 },
    s_item_name:      { fs: 10, vt: 1 },
    s_sub:            { fs: 10, fc: { rgb: '888888' }, ht: 1, vt: 1 },
    s_sub_name:       { fs: 10, fc: { rgb: 'aaaaaa' }, it: 1, pd: { l: 16 } },
    s_dim:            { fs: 10, ht: 1, vt: 1 },
    s_num:            { fs: 10, ht: 3, vt: 1, n: { pattern: '#,##0.00' } },
    s_num_bold:       { bl: 1, fs: 10, ht: 3, vt: 1, n: { pattern: '#,##0.00' } },
    s_price:          { fs: 10, ht: 3, vt: 1, n: { pattern: '#,##0' } },
    s_total:          { bl: 1, fs: 10, ht: 3, vt: 1, n: { pattern: '#,##0' }, fc: { rgb: '34d399' } },
    s_note:           { fs: 10, fc: { rgb: '888888' }, it: 1 },
    s_total_label:    { bl: 1, fs: 11, vt: 1, bg: { rgb: '161925' } },
    s_grand_total:    { bl: 1, fs: 12, ht: 3, vt: 1, n: { pattern: '#,##0' }, fc: { rgb: '00f2fe' }, bg: { rgb: '161925' } },
    s_sub_total:      { fs: 10, vt: 1, fc: { rgb: 'aaaaaa' } },
    s_sub_total_val:  { fs: 10, ht: 3, vt: 1, n: { pattern: '#,##0' }, fc: { rgb: 'fbbf24' } },
    s_grand_label:    { bl: 1, fs: 12, vt: 1, bg: { rgb: '0a0e1a' }, fc: { rgb: 'ffffff' } },
    s_grand_val:      { bl: 1, fs: 13, ht: 3, vt: 1, n: { pattern: '#,##0' }, fc: { rgb: '00e676' }, bg: { rgb: '0a0e1a' } },
    s_sig_header:     { bl: 1, fs: 11, ht: 1, vt: 1 },
    s_sig_sub:        { fs: 10, it: 1, ht: 1, vt: 1, fc: { rgb: '888888' } },
    s_sig_name:       { fs: 11, bd: { b: { s: 1, cl: { rgb: '444444' } } } },
  }

  // ── Merge cells ────────────────────────────────────────────────────────────
  const mergeData: MergeData[] = [
    { startRow: 0, endRow: 0, startColumn: 0, endColumn: COL_COUNT - 1 },
    { startRow: 1, endRow: 1, startColumn: 0, endColumn: COL_COUNT - 1 },
    { startRow: 2, endRow: 2, startColumn: 0, endColumn: COL_COUNT - 1 },
    { startRow: 3, endRow: 3, startColumn: 0, endColumn: COL_COUNT - 1 },
    { startRow: 4, endRow: 4, startColumn: 0, endColumn: 7 },
    { startRow: 4, endRow: 4, startColumn: 8, endColumn: COL_COUNT - 1 },
    { startRow: totalRow,      endRow: totalRow,      startColumn: 0, endColumn: 10 },
    { startRow: contingencyRow, endRow: contingencyRow, startColumn: 0, endColumn: 10 },
    { startRow: grandTotalRow, endRow: grandTotalRow, startColumn: 0, endColumn: 10 },
    { startRow: grandTotalRow + 2, endRow: grandTotalRow + 2, startColumn: 0, endColumn: 5 },
    { startRow: grandTotalRow + 2, endRow: grandTotalRow + 2, startColumn: 7, endColumn: COL_COUNT - 1 },
    { startRow: grandTotalRow + 3, endRow: grandTotalRow + 3, startColumn: 0, endColumn: 5 },
    { startRow: grandTotalRow + 3, endRow: grandTotalRow + 3, startColumn: 7, endColumn: COL_COUNT - 1 },
    { startRow: grandTotalRow + 7, endRow: grandTotalRow + 7, startColumn: 0, endColumn: 5 },
    { startRow: grandTotalRow + 7, endRow: grandTotalRow + 7, startColumn: 7, endColumn: COL_COUNT - 1 },
  ]

  const columnData: Record<number, { w: number }> = {
    0: { w: 45 }, 1: { w: 260 }, 2: { w: 55 },
    3: { w: 75 }, 4: { w: 75 },  5: { w: 75 },
    6: { w: 55 }, 7: { w: 55 },  8: { w: 90 },
    9: { w: 110 }, 10: { w: 110 }, 11: { w: 130 }, 12: { w: 120 },
  }

  return {
    id: 'estimate-workbook',
    name: 'Dự Toán',
    sheetOrder: ['estimate-sheet'],
    sheets: {
      'estimate-sheet': {
        id: 'estimate-sheet',
        name: 'Dự Toán Chi Phí',
        cellData,
        mergeData,
        columnData,
        rowCount: row + 5,
        columnCount: COL_COUNT,
        defaultRowHeight: 22,
        showGridlines: 1,
        freeze: { startRow: 6, startColumn: 2, ySplit: 6, xSplit: 2 },
      },
    },
    styles,
    locale: 'vi-VN',
  }
}
