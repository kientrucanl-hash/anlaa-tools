// Material & pricing constants for MECALC — Northern Vietnam standards
// Ported 1:1 from js/constants.js — do NOT change numeric values without updating source

export type WallType = '110' | '220'
export type MortarGrade = 'M50' | 'M75' | 'M100'
export type BrickType = 'brick-solid' | 'brick-2-hole' | 'brick-aac' | 'none'
export type TileSize = '30x30' | '40x40' | '30x60' | '60x60' | '80x80' | '60x120'
export type TilingMethod = 'adhesive-pure' | 'adhesive-mixed'
export type MixRatio = '1:1' | '2:1' | '1:2'
export type RegionKey = 'hanoi' | 'hcm' | 'danang' | 'mien-trung'

// 1. Brick standard dimensions & properties (Northern standards — 6.5×10.5×22 cm)
export const BRICK_PROPERTIES = {
  'brick-solid': {
    name: 'Gạch đặc đỏ tiêu chuẩn miền Bắc',
    length: 0.22,
    width: 0.105,
    height: 0.065,
    weight: 2.2,
    estimation: { '110': 550, '220': 540 },
  },
  'brick-2-hole': {
    name: 'Gạch rỗng 2 lỗ miền Bắc',
    length: 0.22,
    width: 0.105,
    height: 0.065,
    weight: 1.5,
    estimation: { '110': 550, '220': 540 },
  },
  'brick-aac': {
    name: 'Gạch bê tông nhẹ AAC',
    length: 0.60,
    width: 0.10,
    height: 0.20,
    weight: 8.5,
    estimation: { '110': 83, '220': 83 },
    specialMortarRate: 3.5,
  },
  'none': {
    name: 'Chỉ trát hoàn thiện (Không xây thô)',
    length: 0,
    width: 0,
    height: 0,
    weight: 0,
    estimation: { '110': 0, '220': 0 },
    specialMortarRate: 0,
  },
} as const

// 2. Mortar volume ratio in masonry wall (m3 mortar per m3 wall)
export const MASONRY_MORTAR_RATIO: Record<WallType, number> = {
  '110': 0.23,
  '220': 0.23,
}

// 3. Plastering mortar thickness standard rates (m3 mortar per m2 surface)
export const PLASTERING_MORTAR_RATES: Record<string, number> = {
  '1.5': 0.017,
  '2.0': 0.023,
}

// 4. Mortar cement-sand mix designs per 1 m3 mortar (PC40 cement & fine sand)
export const MORTAR_MIX_DESIGNS: Record<MortarGrade, { cement: number; sand: number; water: number }> = {
  M50:  { cement: 230, sand: 1.12, water: 250 },
  M75:  { cement: 320, sand: 1.09, water: 260 },
  M100: { cement: 415, sand: 1.06, water: 268 },
}

// 5. Commercial packing specifications (Rule WR-4)
export const PACKING_SPECS = {
  cement: 50,        // 50 kg/bag PC40
  tileAdhesive: 25,  // 25 kg/bag
  tileCross: 100,
  tileClips: 100,
  tileWedges: 100,
} as const

// 6. Default waste factors (%)
export const DEFAULT_WASTE_FACTORS = {
  masonryBrick: 3,
  masonryMortar: 5,
  plasteringMortar: 8,
  tilingTile: 5,
  tilingAdhesive: 5,
  tilingGrout: 5,
} as const

// 7. Tile specs per size
export const TILE_SPECS: Record<TileSize, {
  area: number
  packSize: number
  accessories: { cross: number; clips: number; wedges: number }
}> = {
  '30x30':  { area: 0.09, packSize: 11, accessories: { cross: 11, clips: 0, wedges: 0 } },
  '40x40':  { area: 0.16, packSize: 6,  accessories: { cross: 7,  clips: 0, wedges: 0 } },
  '30x60':  { area: 0.18, packSize: 8,  accessories: { cross: 6,  clips: 8, wedges: 8 } },
  '60x60':  { area: 0.36, packSize: 4,  accessories: { cross: 4,  clips: 6, wedges: 6 } },
  '80x80':  { area: 0.64, packSize: 3,  accessories: { cross: 4,  clips: 4, wedges: 4 } },
  '60x120': { area: 0.72, packSize: 2,  accessories: { cross: 3,  clips: 4, wedges: 4 } },
}

// 8. Tiling adhesive rates (kg dry adhesive / m2)
export const TILING_ADHESIVE_RATES = {
  pure:   { small: 5.0, large: 6.0 },
  mixed:  { rate: 7.0 },
} as const

// 9. Default Hanoi material unit prices (VNĐ)
export const DEFAULT_UNIT_PRICES: Record<string, number> = {
  'brick-solid':   1500,
  'brick-2-hole':  1400,
  'brick-aac':     22000,
  'cement-pc40':   90000,
  'sand-fine':     280000,
  'tile-adhesive': 350000,
  'tile-grout':    45000,
  'tile-cross':    15000,
  'tile-clips':    60000,
  'tile-wedges':   50000,
}

// 10. Regional construction prices (nhân công + vật tư tổng hợp) — Q2/2026
export const REGION_PRICES: Record<RegionKey, {
  label: string
  quarter: string
  updatedAt: string
  note: string
  prices: Record<string, number>
}> = {
  hanoi: {
    label: 'Hà Nội',
    quarter: 'Q2/2026',
    updatedAt: '2026-06-01',
    note: 'Hà Nội & vùng phụ cận — tháng 6/2026',
    prices: {
      'excavation': 330000, 'backfill': 135000,
      'concrete-footing': 3050000, 'concrete-column': 3450000,
      'concrete-beam': 3450000, 'concrete-slab': 3050000, 'concrete-stair': 3800000,
      'masonry-110': 275000, 'masonry-220': 385000, 'masonry-aac-110': 240000,
      'formwork': 132000,
      'plastering-1-face': 72000, 'plastering-2-face': 132000, 'plastering-ceiling': 78000,
      'skim-coat': 50000,
      'paint-interior': 62000, 'paint-exterior': 72000, 'paint-ceiling': 62000,
      'screed': 94000,
      'tiling-floor': 200000, 'tiling-wall': 220000,
      'waterproof-floor': 135000, 'waterproof-wall': 145000,
      'stone-floor': 310000, 'stone-wall': 355000,
      'ceiling-gypsum': 200000, 'ceiling-wood': 245000,
      'railing': 500000, 'fence': 420000, 'pathway': 245000,
      'door': 2750000, 'window': 1980000, 'sanitary': 1320000,
      'electrical': 94000, 'plumbing': 105000,
    },
  },
  hcm: {
    label: 'TP. Hồ Chí Minh',
    quarter: 'Q2/2026',
    updatedAt: '2026-06-01',
    note: 'HCM & vùng phụ cận — tháng 6/2026',
    prices: {
      'excavation': 385000, 'backfill': 155000,
      'concrete-footing': 3380000, 'concrete-column': 3800000,
      'concrete-beam': 3800000, 'concrete-slab': 3380000, 'concrete-stair': 4150000,
      'masonry-110': 308000, 'masonry-220': 428000, 'masonry-aac-110': 275000,
      'formwork': 155000,
      'plastering-1-face': 83000, 'plastering-2-face': 150000, 'plastering-ceiling': 88000,
      'skim-coat': 58000,
      'paint-interior': 72000, 'paint-exterior': 83000, 'paint-ceiling': 72000,
      'screed': 105000,
      'tiling-floor': 220000, 'tiling-wall': 242000,
      'waterproof-floor': 150000, 'waterproof-wall': 165000,
      'stone-floor': 340000, 'stone-wall': 396000,
      'ceiling-gypsum': 220000, 'ceiling-wood': 275000,
      'railing': 550000, 'fence': 475000, 'pathway': 275000,
      'door': 3080000, 'window': 2200000, 'sanitary': 1540000,
      'electrical': 105000, 'plumbing': 121000,
    },
  },
  danang: {
    label: 'Đà Nẵng',
    quarter: 'Q2/2026',
    updatedAt: '2026-06-01',
    note: 'Đà Nẵng & vùng phụ cận — tháng 6/2026',
    prices: {
      'excavation': 297000, 'backfill': 121000,
      'concrete-footing': 2830000, 'concrete-column': 3270000,
      'concrete-beam': 3270000, 'concrete-slab': 2830000, 'concrete-stair': 3600000,
      'masonry-110': 253000, 'masonry-220': 363000, 'masonry-aac-110': 220000,
      'formwork': 121000,
      'plastering-1-face': 66000, 'plastering-2-face': 121000, 'plastering-ceiling': 72000,
      'skim-coat': 47000,
      'paint-interior': 58000, 'paint-exterior': 66000, 'paint-ceiling': 58000,
      'screed': 88000,
      'tiling-floor': 187000, 'tiling-wall': 209000,
      'waterproof-floor': 121000, 'waterproof-wall': 132000,
      'stone-floor': 286000, 'stone-wall': 330000,
      'ceiling-gypsum': 182000, 'ceiling-wood': 220000,
      'railing': 462000, 'fence': 385000, 'pathway': 220000,
      'door': 2530000, 'window': 1815000, 'sanitary': 1210000,
      'electrical': 88000, 'plumbing': 97000,
    },
  },
  'mien-trung': {
    label: 'Miền Trung (tỉnh)',
    quarter: 'Q2/2026',
    updatedAt: '2026-06-01',
    note: 'Nghệ An, Hà Tĩnh, Quảng Bình, Quảng Trị, Thừa Thiên Huế — tháng 6/2026',
    prices: {
      'excavation': 264000, 'backfill': 105000,
      'concrete-footing': 2620000, 'concrete-column': 3050000,
      'concrete-beam': 3050000, 'concrete-slab': 2620000, 'concrete-stair': 3270000,
      'masonry-110': 231000, 'masonry-220': 330000, 'masonry-aac-110': 204000,
      'formwork': 110000,
      'plastering-1-face': 61000, 'plastering-2-face': 110000, 'plastering-ceiling': 64000,
      'skim-coat': 42000,
      'paint-interior': 50000, 'paint-exterior': 61000, 'paint-ceiling': 50000,
      'screed': 79000,
      'tiling-floor': 171000, 'tiling-wall': 193000,
      'waterproof-floor': 110000, 'waterproof-wall': 121000,
      'stone-floor': 264000, 'stone-wall': 303000,
      'ceiling-gypsum': 165000, 'ceiling-wood': 204000,
      'railing': 418000, 'fence': 352000, 'pathway': 198000,
      'door': 2310000, 'window': 1650000, 'sanitary': 1045000,
      'electrical': 79000, 'plumbing': 88000,
    },
  },
}

export const DEFAULT_REGION: RegionKey = 'hanoi'

// 11. Work item dimension rules
export const WORK_ITEM_DIMS: Record<string, { label: string; unit: string; dims: string[] }> = {
  'excavation':         { label: 'Đào đất hố móng',        unit: 'm³',  dims: ['l','w','h'] },
  'backfill':           { label: 'Đắp đất',                 unit: 'm³',  dims: ['l','w','h'] },
  'concrete-footing':   { label: 'Bê tông móng',            unit: 'm³',  dims: ['l','w','h'] },
  'concrete-column':    { label: 'Bê tông cột',             unit: 'm³',  dims: ['l','w','h'] },
  'concrete-beam':      { label: 'Bê tông dầm',             unit: 'm³',  dims: ['l','w','h'] },
  'concrete-slab':      { label: 'Bê tông sàn',             unit: 'm³',  dims: ['l','w','h'] },
  'concrete-stair':     { label: 'Bê tông cầu thang',       unit: 'm³',  dims: ['l','w','h'] },
  'masonry-110':        { label: 'Xây tường gạch 110',      unit: 'm²',  dims: ['l','h'] },
  'masonry-220':        { label: 'Xây tường gạch 220',      unit: 'm²',  dims: ['l','h'] },
  'masonry-aac-110':    { label: 'Xây tường AAC 100mm',     unit: 'm²',  dims: ['l','h'] },
  'formwork':           { label: 'Ván khuôn',               unit: 'm²',  dims: ['l','h'] },
  'plastering-1-face':  { label: 'Trát tường 1 mặt',        unit: 'm²',  dims: ['l','h'] },
  'plastering-2-face':  { label: 'Trát tường 2 mặt',        unit: 'm²',  dims: ['l','h'] },
  'plastering-ceiling': { label: 'Trát trần',               unit: 'm²',  dims: ['l','w'] },
  'skim-coat':          { label: 'Bả bột putty',            unit: 'm²',  dims: ['l','h'] },
  'paint-interior':     { label: 'Sơn tường trong nhà',     unit: 'm²',  dims: ['l','h'] },
  'paint-exterior':     { label: 'Sơn tường ngoài nhà',     unit: 'm²',  dims: ['l','h'] },
  'paint-ceiling':      { label: 'Sơn trần nhà',            unit: 'm²',  dims: ['l','w'] },
  'screed':             { label: 'Cán nền xi măng cát',     unit: 'm²',  dims: ['l','w'] },
  'tiling-floor':       { label: 'Lát nền gạch',            unit: 'm²',  dims: ['l','w'] },
  'tiling-wall':        { label: 'Ốp tường gạch',           unit: 'm²',  dims: ['l','h'] },
  'waterproof-floor':   { label: 'Chống thấm sàn',          unit: 'm²',  dims: ['l','w'] },
  'waterproof-wall':    { label: 'Chống thấm tường',        unit: 'm²',  dims: ['l','h'] },
  'stone-floor':        { label: 'Lát đá sàn',              unit: 'm²',  dims: ['l','w'] },
  'stone-wall':         { label: 'Ốp đá tường',             unit: 'm²',  dims: ['l','h'] },
  'ceiling-gypsum':     { label: 'Trần thạch cao',          unit: 'm²',  dims: ['l','w'] },
  'ceiling-wood':       { label: 'Trần gỗ/nhựa PVC',        unit: 'm²',  dims: ['l','w'] },
  'railing':            { label: 'Lan can/tay vịn',         unit: 'md',  dims: ['l'] },
  'fence':              { label: 'Hàng rào',                unit: 'md',  dims: ['l'] },
  'pathway':            { label: 'Đường dạo/lát vỉa hè',   unit: 'm²',  dims: ['l','w'] },
  'door':               { label: 'Lắp cửa đi',             unit: 'cái', dims: [] },
  'window':             { label: 'Lắp cửa sổ',             unit: 'cái', dims: [] },
  'sanitary':           { label: 'Thiết bị vệ sinh',        unit: 'bộ',  dims: [] },
  'electrical':         { label: 'Hệ thống điện âm tường', unit: 'm',   dims: ['l'] },
  'plumbing':           { label: 'Hệ thống cấp/thoát nước',unit: 'm',   dims: ['l'] },
}

// 12. Material norms per unit of work (định mức vật tư — TCVN)
export const MATERIAL_NORMS: Record<string, Array<{ key: string; perUnit: number }>> = {
  'masonry-110':        [{ key: 'brick-solid',   perUnit: 60    }, { key: 'cement-pc40', perUnit: 8    }, { key: 'sand-fine', perUnit: 0.03  }],
  'masonry-220':        [{ key: 'brick-solid',   perUnit: 120   }, { key: 'cement-pc40', perUnit: 16   }, { key: 'sand-fine', perUnit: 0.06  }],
  'masonry-aac-110':    [{ key: 'brick-aac',     perUnit: 8.5   }, { key: 'aac-adhesive', perUnit: 2   }],
  'plastering-1-face':  [{ key: 'cement-pc40',   perUnit: 4.5   }, { key: 'sand-fine',  perUnit: 0.012 }],
  'plastering-2-face':  [{ key: 'cement-pc40',   perUnit: 9     }, { key: 'sand-fine',  perUnit: 0.024 }],
  'plastering-ceiling': [{ key: 'cement-pc40',   perUnit: 4.5   }, { key: 'sand-fine',  perUnit: 0.012 }],
  'screed':             [{ key: 'cement-pc40',   perUnit: 6     }, { key: 'sand-fine',  perUnit: 0.03  }],
  'tiling-floor':       [{ key: 'tile-adhesive', perUnit: 5     }, { key: 'tile-grout', perUnit: 0.3   }],
  'tiling-wall':        [{ key: 'tile-adhesive', perUnit: 5     }, { key: 'tile-grout', perUnit: 0.3   }],
  'waterproof-floor':   [{ key: 'waterproof',    perUnit: 0.5   }],
  'waterproof-wall':    [{ key: 'waterproof',    perUnit: 0.5   }],
  'stone-floor':        [{ key: 'tile-adhesive', perUnit: 6     }, { key: 'tile-grout', perUnit: 0.4   }],
  'stone-wall':         [{ key: 'tile-adhesive', perUnit: 6     }, { key: 'tile-grout', perUnit: 0.4   }],
  'concrete-footing':   [{ key: 'cement-pc40',   perUnit: 280   }, { key: 'sand-fine',  perUnit: 0.45  }, { key: 'gravel', perUnit: 0.85 }],
  'concrete-column':    [{ key: 'cement-pc40',   perUnit: 300   }, { key: 'sand-fine',  perUnit: 0.43  }, { key: 'gravel', perUnit: 0.82 }],
  'concrete-beam':      [{ key: 'cement-pc40',   perUnit: 300   }, { key: 'sand-fine',  perUnit: 0.43  }, { key: 'gravel', perUnit: 0.82 }],
  'concrete-slab':      [{ key: 'cement-pc40',   perUnit: 280   }, { key: 'sand-fine',  perUnit: 0.45  }, { key: 'gravel', perUnit: 0.85 }],
  'concrete-stair':     [{ key: 'cement-pc40',   perUnit: 300   }, { key: 'sand-fine',  perUnit: 0.43  }, { key: 'gravel', perUnit: 0.82 }],
  'backfill':           [{ key: 'sand-fine',     perUnit: 1.2   }],
}

// 13. Purchase unit metadata
export const PURCHASE_MATERIAL_LABELS: Record<string, {
  name: string; packSize: number | null; packUnit: string; displayUnit: string
}> = {
  'cement-pc40':   { name: 'Xi măng PC40',             packSize: 50,   packUnit: 'bao 50 kg', displayUnit: 'bao' },
  'sand-fine':     { name: 'Cát vàng/mịn',             packSize: null, packUnit: 'm³',        displayUnit: 'm³'  },
  'brick-solid':   { name: 'Gạch đặc 6.5×10.5×22 cm', packSize: null, packUnit: 'viên',      displayUnit: 'viên'},
  'brick-aac':     { name: 'Gạch AAC 10×20×60 cm',     packSize: null, packUnit: 'viên',      displayUnit: 'viên'},
  'aac-adhesive':  { name: 'Keo xây gạch AAC',         packSize: 25,   packUnit: 'bao 25 kg', displayUnit: 'bao' },
  'tile-adhesive': { name: 'Keo dán gạch',             packSize: 25,   packUnit: 'bao 25 kg', displayUnit: 'bao' },
  'tile-grout':    { name: 'Keo chà ron',              packSize: null, packUnit: 'kg',        displayUnit: 'kg'  },
  'gravel':        { name: 'Đá dăm 1×2',               packSize: null, packUnit: 'm³',        displayUnit: 'm³'  },
  'waterproof':    { name: 'Vật liệu chống thấm',      packSize: null, packUnit: 'kg',        displayUnit: 'kg'  },
}
