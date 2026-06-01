/**
 * Constants & Material Estimation Standards for MECALC (Northern Standards)
 * Language: English 100% (Rule §2)
 */

// 1. Brick standard dimensions & properties
const BRICK_PROPERTIES = {
    "brick-solid": {
        name: "Gạch đặc đỏ tiêu chuẩn miền Bắc",
        length: 0.22, // meters
        width: 0.105,
        height: 0.065,
        weight: 2.2, // kg/brick
        estimation: {
            "110": 550, // bricks/m3 for wall type 110
            "220": 540  // bricks/m3 for wall type 220
        }
    },
    "brick-2-hole": {
        name: "Gạch rỗng 2 lỗ miền Bắc",
        length: 0.22,
        width: 0.105,
        height: 0.065,
        weight: 1.5,
        estimation: {
            "110": 550,
            "220": 540
        }
    },
    "brick-aac": {
        name: "Gạch bê tông nhẹ AAC",
        length: 0.60,
        width: 0.10,
        height: 0.20,
        weight: 8.5,
        estimation: {
            "110": 83, // bricks/m3 for 100mm wall
            "220": 83  // bricks/m3 for 200mm wall
        },
        specialMortarRate: 3.5 // kg/m2 for dán gạch AAC
    },
    "none": {
        name: "Chỉ trát hoàn thiện (Không xây thô)",
        length: 0,
        width: 0,
        height: 0,
        weight: 0,
        estimation: {
            "110": 0,
            "220": 0
        },
        specialMortarRate: 0
    }
};

// 2. Mortar volume ratio in masonry wall (m3 of mortar per m3 of wall)
const MASONRY_MORTAR_RATIO = {
    "110": 0.23,
    "220": 0.23
};

// 3. Plastering mortar thickness standard rates (m3 of mortar per m2 of surface area)
const PLASTERING_MORTAR_RATES = {
    "1.5": 0.017, // 1.5cm thickness
    "2.0": 0.023  // 2.0cm thickness
};

// 4. Mortar cement-sand mix designs per 1 m3 of mortar (using PC40 cement & fine sand)
const MORTAR_MIX_DESIGNS = {
    "M50": {
        cement: 230, // kg
        sand: 1.12,  // m3
        water: 250   // liters
    },
    "M75": {
        cement: 320,
        sand: 1.09,
        water: 260
    },
    "M100": {
        cement: 415,
        sand: 1.06,
        water: 268
    }
};

// 5. Commercial packing specifications (Rule WR-4)
const PACKING_SPECS = {
    cement: 50,       // 50kg per bag of cement PC40
    tileAdhesive: 25, // 25kg per bag of tile adhesive
    tileCross: 100,   // 100 pieces per pack of crosses
    tileClips: 100,   // 100 pieces per pack of clips
    tileWedges: 100   // 100 pieces per pack of wedges
};

// 6. Default waste factors in % (Waste Factors - default settings)
const DEFAULT_WASTE_FACTORS = {
    masonryBrick: 3,     // 3% waste for bricks
    masonryMortar: 5,    // 5% waste for masonry mortar (cement, sand)
    plasteringMortar: 8, // 8% waste for plastering mortar
    tilingTile: 5,       // 5% waste for tiles
    tilingAdhesive: 5,   // 5% waste for adhesive/cement dán gạch
    tilingGrout: 5        // 5% waste for grout (keo chà ron)
};

// 7. Tile commercial packing rates and accessory estimation rates
const TILE_SPECS = {
    "30x30": {
        area: 0.09, // m2 per tile
        packSize: 11, // 11 tiles per box (approx 0.99 m2)
        accessories: {
            cross: 11, // 11 crosses/m2
            clips: 0,  // no clips for small tile
            wedges: 0
        }
    },
    "40x40": {
        area: 0.16,
        packSize: 6, // 6 tiles per box (approx 0.96 m2)
        accessories: {
            cross: 7,
            clips: 0,
            wedges: 0
        }
    },
    "30x60": {
        area: 0.18,
        packSize: 8, // 8 tiles per box (1.44 m2)
        accessories: {
            cross: 6,
            clips: 8,
            wedges: 8
        }
    },
    "60x60": {
        area: 0.36,
        packSize: 4, // 4 tiles per box (1.44 m2)
        accessories: {
            cross: 4,
            clips: 6,
            wedges: 6
        }
    },
    "80x80": {
        area: 0.64,
        packSize: 3, // 3 tiles per box (1.92 m2)
        accessories: {
            cross: 4,
            clips: 4,
            wedges: 4
        }
    },
    "60x120": {
        area: 0.72,
        packSize: 2, // 2 tiles per box (1.44 m2)
        accessories: {
            cross: 3,
            clips: 4,
            wedges: 4
        }
    }
};

// 8. Tiling adhesive rate constants (kg of dry adhesive / m2)
const TILING_ADHESIVE_RATES = {
    "pure": {
        small: 5.0,  // for tiles <= 60x60
        large: 6.0   // for tiles > 60x60
    },
    "mixed": {
        rate: 7.0    // dry mix rate (Adhesive + Cement combined) for thickness 4-6mm
    }
};

// 9. Default Hanoi material unit prices in VNĐ (Rule §12a / WR-11a)
const DEFAULT_UNIT_PRICES = {
    "brick-solid": 1500,     // 1500 VNĐ per solid brick
    "brick-2-hole": 1400,    // 1400 VNĐ per 2-hole brick
    "brick-aac": 22000,      // 22000 VNĐ per AAC block
    "cement-pc40": 90000,    // 90000 VNĐ per 50kg bag
    "sand-fine": 280000,     // 280000 VNĐ per m3 of fine sand
    "tile-adhesive": 350000, // 350000 VNĐ per 25kg bag of adhesive
    "tile-grout": 45000,     // 45000 VNĐ per 1kg of tile grout
    "tile-cross": 15000,     // 15000 VNĐ per bag of 100 crosses
    "tile-clips": 60000,     // 60000 VNĐ per bag of 100 clips
    "tile-wedges": 50000      // 50000 VNĐ per bag of 100 wedges
};

// 10. Regional construction work item price table (nhân công + vật tư tổng hợp)
// Keys match WORK_ITEM_DIMS. Prices are "đơn giá thi công tổng hợp" cho nhà dân.
// Source: khảo sát thị trường thực tế + tham khảo thông báo giá vật liệu xây dựng Bộ Xây dựng
// Cập nhật: Q2/2026 (tháng 6/2026) — tăng ~8-10% so với Q1/2025 do lương tối thiểu vùng tăng 6%
// từ 1/7/2025 và giá xi măng/thép/vật tư hoàn thiện tăng 5-8%
const REGION_PRICES = {
    "hanoi": {
        label: "Hà Nội",
        quarter: "Q2/2026",
        updatedAt: "2026-06-01",
        note: "Hà Nội & vùng phụ cận — tháng 6/2026",
        prices: {
            "excavation":         330000,
            "backfill":           135000,
            "concrete-footing":  3050000,
            "concrete-column":   3450000,
            "concrete-beam":     3450000,
            "concrete-slab":     3050000,
            "concrete-stair":    3800000,
            "masonry-110":        275000,
            "masonry-220":        385000,
            "masonry-aac-110":    240000,
            "formwork":           132000,
            "plastering-1-face":   72000,
            "plastering-2-face":  132000,
            "plastering-ceiling":  78000,
            "skim-coat":           50000,
            "paint-interior":      62000,
            "paint-exterior":      72000,
            "paint-ceiling":       62000,
            "screed":              94000,
            "tiling-floor":       200000,
            "tiling-wall":        220000,
            "waterproof-floor":   135000,
            "waterproof-wall":    145000,
            "stone-floor":        310000,
            "stone-wall":         355000,
            "ceiling-gypsum":     200000,
            "ceiling-wood":       245000,
            "railing":            500000,
            "fence":              420000,
            "pathway":            245000,
            "door":              2750000,
            "window":            1980000,
            "sanitary":          1320000,
            "electrical":         94000,
            "plumbing":          105000,
        }
    },
    "hcm": {
        label: "TP. Hồ Chí Minh",
        quarter: "Q2/2026",
        updatedAt: "2026-06-01",
        note: "HCM & vùng phụ cận — tháng 6/2026",
        prices: {
            "excavation":         385000,
            "backfill":           155000,
            "concrete-footing":  3380000,
            "concrete-column":   3800000,
            "concrete-beam":     3800000,
            "concrete-slab":     3380000,
            "concrete-stair":    4150000,
            "masonry-110":        308000,
            "masonry-220":        428000,
            "masonry-aac-110":    275000,
            "formwork":           155000,
            "plastering-1-face":   83000,
            "plastering-2-face":  150000,
            "plastering-ceiling":  88000,
            "skim-coat":           58000,
            "paint-interior":      72000,
            "paint-exterior":      83000,
            "paint-ceiling":       72000,
            "screed":             105000,
            "tiling-floor":       220000,
            "tiling-wall":        242000,
            "waterproof-floor":   150000,
            "waterproof-wall":    165000,
            "stone-floor":        340000,
            "stone-wall":         396000,
            "ceiling-gypsum":     220000,
            "ceiling-wood":       275000,
            "railing":            550000,
            "fence":              475000,
            "pathway":            275000,
            "door":              3080000,
            "window":            2200000,
            "sanitary":          1540000,
            "electrical":         105000,
            "plumbing":           121000,
        }
    },
    "danang": {
        label: "Đà Nẵng",
        quarter: "Q2/2026",
        updatedAt: "2026-06-01",
        note: "Đà Nẵng & vùng phụ cận — tháng 6/2026",
        prices: {
            "excavation":         297000,
            "backfill":           121000,
            "concrete-footing":  2830000,
            "concrete-column":   3270000,
            "concrete-beam":     3270000,
            "concrete-slab":     2830000,
            "concrete-stair":    3600000,
            "masonry-110":        253000,
            "masonry-220":        363000,
            "masonry-aac-110":    220000,
            "formwork":           121000,
            "plastering-1-face":   66000,
            "plastering-2-face":  121000,
            "plastering-ceiling":  72000,
            "skim-coat":           47000,
            "paint-interior":      58000,
            "paint-exterior":      66000,
            "paint-ceiling":       58000,
            "screed":              88000,
            "tiling-floor":       187000,
            "tiling-wall":        209000,
            "waterproof-floor":   121000,
            "waterproof-wall":    132000,
            "stone-floor":        286000,
            "stone-wall":         330000,
            "ceiling-gypsum":     182000,
            "ceiling-wood":       220000,
            "railing":            462000,
            "fence":              385000,
            "pathway":            220000,
            "door":              2530000,
            "window":            1815000,
            "sanitary":          1210000,
            "electrical":          88000,
            "plumbing":            97000,
        }
    },
    "mien-trung": {
        label: "Miền Trung (tỉnh)",
        quarter: "Q2/2026",
        updatedAt: "2026-06-01",
        note: "Nghệ An, Hà Tĩnh, Quảng Bình, Quảng Trị, Thừa Thiên Huế — tháng 6/2026",
        prices: {
            "excavation":         264000,
            "backfill":           105000,
            "concrete-footing":  2620000,
            "concrete-column":   3050000,
            "concrete-beam":     3050000,
            "concrete-slab":     2620000,
            "concrete-stair":    3270000,
            "masonry-110":        231000,
            "masonry-220":        330000,
            "masonry-aac-110":    204000,
            "formwork":           110000,
            "plastering-1-face":   61000,
            "plastering-2-face":  110000,
            "plastering-ceiling":  64000,
            "skim-coat":           42000,
            "paint-interior":      50000,
            "paint-exterior":      61000,
            "paint-ceiling":       50000,
            "screed":              79000,
            "tiling-floor":       171000,
            "tiling-wall":        193000,
            "waterproof-floor":   110000,
            "waterproof-wall":    121000,
            "stone-floor":        264000,
            "stone-wall":         303000,
            "ceiling-gypsum":     165000,
            "ceiling-wood":       204000,
            "railing":            418000,
            "fence":              352000,
            "pathway":            198000,
            "door":              2310000,
            "window":            1650000,
            "sanitary":          1045000,
            "electrical":          79000,
            "plumbing":            88000,
        }
    },
};

// Default region on first load
const DEFAULT_REGION = "hanoi";

// Backward-compat alias — code that reads DEFAULT_WORK_ITEM_PRICES[key].price still works
const DEFAULT_WORK_ITEM_PRICES = (() => {
    const base = REGION_PRICES[DEFAULT_REGION].prices;
    const dims = {
        "masonry-110":        { name: "Xây tường gạch 110 (tường đơn)",          unit: "m²" },
        "masonry-220":        { name: "Xây tường gạch 220 (tường đôi)",          unit: "m²" },
        "masonry-aac-110":    { name: "Xây tường gạch AAC 100mm",                unit: "m²" },
        "plastering-1-face":  { name: "Trát tường xi măng 1 mặt",                unit: "m²" },
        "plastering-2-face":  { name: "Trát tường xi măng 2 mặt",                unit: "m²" },
        "plastering-ceiling": { name: "Trát trần bê tông",                       unit: "m²" },
        "skim-coat":          { name: "Bả bột putty",                            unit: "m²" },
        "paint-interior":     { name: "Sơn tường trong nhà",                     unit: "m²" },
        "paint-exterior":     { name: "Sơn tường ngoài nhà",                     unit: "m²" },
        "paint-ceiling":      { name: "Sơn trần nhà",                            unit: "m²" },
        "screed":             { name: "Cán nền phẳng xi măng cát",               unit: "m²" },
        "tiling-floor":       { name: "Lát nền gạch (gạch + keo + nhân công)",   unit: "m²" },
        "tiling-wall":        { name: "Ốp tường gạch (gạch + keo + nhân công)",  unit: "m²" },
        "waterproof-floor":   { name: "Chống thấm sàn",                          unit: "m²" },
        "waterproof-wall":    { name: "Chống thấm tường",                        unit: "m²" },
        "stone-floor":        { name: "Lát đá sàn",                              unit: "m²" },
        "stone-wall":         { name: "Ốp đá tường",                             unit: "m²" },
        "ceiling-gypsum":     { name: "Trần thạch cao",                          unit: "m²" },
        "ceiling-wood":       { name: "Trần gỗ/nhựa PVC",                        unit: "m²" },
        "formwork":           { name: "Ván khuôn",                               unit: "m²" },
        "excavation":         { name: "Đào đất hố móng",                         unit: "m³" },
        "backfill":           { name: "Đắp đất",                                 unit: "m³" },
        "concrete-footing":   { name: "Bê tông móng (vật tư + nhân công)",       unit: "m³" },
        "concrete-column":    { name: "Bê tông cột (vật tư + nhân công)",        unit: "m³" },
        "concrete-beam":      { name: "Bê tông dầm (vật tư + nhân công)",        unit: "m³" },
        "concrete-slab":      { name: "Bê tông sàn (vật tư + nhân công)",        unit: "m³" },
        "concrete-stair":     { name: "Bê tông cầu thang (vật tư + nhân công)",  unit: "m³" },
        "railing":            { name: "Lan can/tay vịn",                         unit: "md" },
        "fence":              { name: "Hàng rào",                                unit: "md" },
        "pathway":            { name: "Đường dạo/lát vỉa hè",                   unit: "m²" },
        "door":               { name: "Lắp cửa đi",                              unit: "cái" },
        "window":             { name: "Lắp cửa sổ",                              unit: "cái" },
        "sanitary":           { name: "Thiết bị vệ sinh",                        unit: "bộ" },
        "electrical":         { name: "Hệ thống điện âm tường",                  unit: "m" },
        "plumbing":           { name: "Hệ thống cấp/thoát nước",                 unit: "m" },
    };
    const result = {};
    Object.entries(dims).forEach(([key, meta]) => {
        result[key] = { ...meta, price: base[key] || 0 };
    });
    return result;
})();

// 11. Work item dimension rules — defines which dimensions are active per work type
// dims: ["l","h"] = Dài × Cao (tường đứng), ["l","w"] = Dài × Rộng (sàn ngang), ["l","w","h"] = m³, [] = chỉ đếm số cái
const WORK_ITEM_DIMS = {
    // Phần thô
    "excavation":         { label: "Đào đất hố móng",       unit: "m³",  dims: ["l","w","h"] },
    "backfill":           { label: "Đắp đất",                unit: "m³",  dims: ["l","w","h"] },
    "concrete-footing":   { label: "Bê tông móng",           unit: "m³",  dims: ["l","w","h"] },
    "concrete-column":    { label: "Bê tông cột",            unit: "m³",  dims: ["l","w","h"] },
    "concrete-beam":      { label: "Bê tông dầm",            unit: "m³",  dims: ["l","w","h"] },
    "concrete-slab":      { label: "Bê tông sàn",            unit: "m³",  dims: ["l","w","h"] },
    "concrete-stair":     { label: "Bê tông cầu thang",      unit: "m³",  dims: ["l","w","h"] },
    "masonry-110":        { label: "Xây tường gạch 110",     unit: "m²",  dims: ["l","h"] },
    "masonry-220":        { label: "Xây tường gạch 220",     unit: "m²",  dims: ["l","h"] },
    "masonry-aac-110":    { label: "Xây tường AAC 100mm",    unit: "m²",  dims: ["l","h"] },
    "formwork":           { label: "Ván khuôn",              unit: "m²",  dims: ["l","h"] },
    // Hoàn thiện tường/trần
    "plastering-1-face":  { label: "Trát tường 1 mặt",       unit: "m²",  dims: ["l","h"] },
    "plastering-2-face":  { label: "Trát tường 2 mặt",       unit: "m²",  dims: ["l","h"] },
    "plastering-ceiling": { label: "Trát trần",               unit: "m²",  dims: ["l","w"] },
    "skim-coat":          { label: "Bả bột putty",            unit: "m²",  dims: ["l","h"] },
    "paint-interior":     { label: "Sơn tường trong nhà",    unit: "m²",  dims: ["l","h"] },
    "paint-exterior":     { label: "Sơn tường ngoài nhà",    unit: "m²",  dims: ["l","h"] },
    "paint-ceiling":      { label: "Sơn trần nhà",           unit: "m²",  dims: ["l","w"] },
    // Nền/sàn
    "screed":             { label: "Cán nền xi măng cát",    unit: "m²",  dims: ["l","w"] },
    "tiling-floor":       { label: "Lát nền gạch",           unit: "m²",  dims: ["l","w"] },
    "tiling-wall":        { label: "Ốp tường gạch",          unit: "m²",  dims: ["l","h"] },
    "waterproof-floor":   { label: "Chống thấm sàn",         unit: "m²",  dims: ["l","w"] },
    "waterproof-wall":    { label: "Chống thấm tường",       unit: "m²",  dims: ["l","h"] },
    "stone-floor":        { label: "Lát đá sàn",             unit: "m²",  dims: ["l","w"] },
    "stone-wall":         { label: "Ốp đá tường",            unit: "m²",  dims: ["l","h"] },
    // Trần
    "ceiling-gypsum":     { label: "Trần thạch cao",         unit: "m²",  dims: ["l","w"] },
    "ceiling-wood":       { label: "Trần gỗ/nhựa PVC",       unit: "m²",  dims: ["l","w"] },
    // Mét dài / cái
    "railing":            { label: "Lan can/tay vịn",        unit: "md",  dims: ["l"] },
    "fence":              { label: "Hàng rào",               unit: "md",  dims: ["l"] },
    "pathway":            { label: "Đường dạo/lát vỉa hè",  unit: "m²",  dims: ["l","w"] },
    "door":               { label: "Lắp cửa đi",             unit: "cái", dims: [] },
    "window":             { label: "Lắp cửa sổ",             unit: "cái", dims: [] },
    "sanitary":           { label: "Thiết bị vệ sinh",       unit: "bộ",  dims: [] },
    "electrical":         { label: "Hệ thống điện âm tường", unit: "m",   dims: ["l"] },
    "plumbing":           { label: "Hệ thống cấp/thoát nước",unit: "m",   dims: ["l"] },
};

// 12. Material descriptions for printing BOQ table
const MATERIAL_METADATA = {
    "brick-solid": { name: "Gạch đặc đỏ tiêu chuẩn", spec: "Quy cách 6.5x10.5x22 cm", unit: "viên" },
    "brick-2-hole": { name: "Gạch rỗng 2 lỗ xây tường", spec: "Quy cách 6.5x10.5x22 cm", unit: "viên" },
    "brick-aac": { name: "Gạch bê tông khí chưng áp AAC", spec: "Quy cách 10x20x60 cm", unit: "viên" },
    "cement-pc40": { name: "Xi măng PC40 Hoàng Thạch/Bút Sơn", spec: "Đóng bao 50 kg/bao", unit: "bao" },
    "sand-fine": { name: "Cát vàng/Cát mịn sàng sạch", spec: "Cát xây trát tự nhiên", unit: "m³" },
    "tile-gạch": { name: "Gạch ốp lát hoàn thiện", spec: "Quy cách theo lựa chọn", unit: "viên" },
    "tile-adhesive": { name: "Keo dán gạch chuyên dụng", spec: "Đóng bao 25 kg/bao", unit: "bao" },
    "tile-grout": { name: "Keo chà ron/Bột chít mạch cao cấp", spec: "Đóng gói bao/hộp 1 kg", unit: "kg" },
    "tile-cross": { name: "Ke dấu cộng chữ thập định vị mạch", spec: "Túi 100 chiếc (ron 1.5-2mm)", unit: "túi" },
    "tile-clips": { name: "Ke móc cân bằng gạch (Clips)", spec: "Túi 100 chiếc (sử dụng 1 lần)", unit: "túi" },
    "tile-wedges": { name: "Nêm cân bằng khóa gạch phẳng (Wedges)", spec: "Túi 100 chiếc (tái sử dụng)", unit: "túi" }
};

// Material norms per unit of construction work (định mức vật tư/đơn vị thi công — TCVN)
// perUnit = quantity of material per 1 unit of work (m², m³, md, cái...)
const MATERIAL_NORMS = {
    "masonry-110":        [{ key:"brick-solid",   perUnit:60    }, { key:"cement-pc40", perUnit:8    }, { key:"sand-fine",   perUnit:0.03  }],
    "masonry-220":        [{ key:"brick-solid",   perUnit:120   }, { key:"cement-pc40", perUnit:16   }, { key:"sand-fine",   perUnit:0.06  }],
    "masonry-aac-110":    [{ key:"brick-aac",     perUnit:8.5   }, { key:"aac-adhesive",perUnit:2    }],
    "plastering-1-face":  [{ key:"cement-pc40",   perUnit:4.5   }, { key:"sand-fine",   perUnit:0.012 }],
    "plastering-2-face":  [{ key:"cement-pc40",   perUnit:9     }, { key:"sand-fine",   perUnit:0.024 }],
    "plastering-ceiling": [{ key:"cement-pc40",   perUnit:4.5   }, { key:"sand-fine",   perUnit:0.012 }],
    "screed":             [{ key:"cement-pc40",   perUnit:6     }, { key:"sand-fine",   perUnit:0.03  }],
    "tiling-floor":       [{ key:"tile-adhesive", perUnit:5     }, { key:"tile-grout",  perUnit:0.3   }],
    "tiling-wall":        [{ key:"tile-adhesive", perUnit:5     }, { key:"tile-grout",  perUnit:0.3   }],
    "waterproof-floor":   [{ key:"waterproof",    perUnit:0.5   }],
    "waterproof-wall":    [{ key:"waterproof",    perUnit:0.5   }],
    "stone-floor":        [{ key:"tile-adhesive", perUnit:6     }, { key:"tile-grout",  perUnit:0.4   }],
    "stone-wall":         [{ key:"tile-adhesive", perUnit:6     }, { key:"tile-grout",  perUnit:0.4   }],
    "concrete-footing":   [{ key:"cement-pc40",   perUnit:280   }, { key:"sand-fine",   perUnit:0.45  }, { key:"gravel", perUnit:0.85 }],
    "concrete-column":    [{ key:"cement-pc40",   perUnit:300   }, { key:"sand-fine",   perUnit:0.43  }, { key:"gravel", perUnit:0.82 }],
    "concrete-beam":      [{ key:"cement-pc40",   perUnit:300   }, { key:"sand-fine",   perUnit:0.43  }, { key:"gravel", perUnit:0.82 }],
    "concrete-slab":      [{ key:"cement-pc40",   perUnit:280   }, { key:"sand-fine",   perUnit:0.45  }, { key:"gravel", perUnit:0.85 }],
    "concrete-stair":     [{ key:"cement-pc40",   perUnit:300   }, { key:"sand-fine",   perUnit:0.43  }, { key:"gravel", perUnit:0.82 }],
    "backfill":           [{ key:"sand-fine",     perUnit:1.2   }],
};

// ─── PROJECT TEMPLATES ────────────────────────────────────────────────────
// Each template generates constructionItems (sections + items) when applied.
// rows[0].l is the placeholder quantity — user replaces with actual measurements.
const PROJECT_TEMPLATES = [
    {
        id: "caito-chungcu",
        name: "Cải tạo căn hộ chung cư",
        desc: "Tháo dỡ, hoàn thiện nội thất toàn bộ (không đụng kết cấu)",
        icon: "building-2",
        sections: [
            {
                name: "Phần I — Tháo dỡ & Chuẩn bị",
                items: [
                    { key: "custom", name: "Tháo dỡ vách gạch cũ", unit: "m²", price: 80000 },
                    { key: "custom", name: "Tháo dỡ gạch lát nền cũ", unit: "m²", price: 60000 },
                    { key: "custom", name: "Tháo dỡ trần thạch cao cũ", unit: "m²", price: 50000 },
                    { key: "custom", name: "Chuyển phế thải ra ngoài", unit: "m³", price: 250000 },
                ]
            },
            {
                name: "Phần II — Xây & Trát",
                items: [
                    { key: "masonry-110",       name: "Xây tường ngăn phòng gạch 110" },
                    { key: "plastering-2-face", name: "Trát tường 2 mặt" },
                    { key: "plastering-ceiling",name: "Trát trần bê tông" },
                ]
            },
            {
                name: "Phần III — Điện & Nước",
                items: [
                    { key: "electrical", name: "Hệ thống điện âm tường (đi dây + ổ cắm + công tắc)" },
                    { key: "plumbing",   name: "Hệ thống cấp/thoát nước (ống âm tường)" },
                ]
            },
            {
                name: "Phần IV — Hoàn thiện tường & trần",
                items: [
                    { key: "skim-coat",      name: "Bả bột putty tường trong" },
                    { key: "paint-interior", name: "Sơn tường trong 2 nước" },
                    { key: "ceiling-gypsum", name: "Trần thạch cao phẳng" },
                    { key: "paint-ceiling",  name: "Sơn trần 2 nước" },
                ]
            },
            {
                name: "Phần V — Nền & Ốp lát",
                items: [
                    { key: "waterproof-floor", name: "Chống thấm vệ sinh" },
                    { key: "screed",           name: "Cán nền xi măng cát san phẳng" },
                    { key: "tiling-floor",     name: "Lát nền gạch ceramic/porcelain" },
                    { key: "tiling-wall",      name: "Ốp tường nhà vệ sinh" },
                ]
            },
            {
                name: "Phần VI — Cửa & Hoàn thiện khác",
                items: [
                    { key: "door",     name: "Lắp cửa đi (gỗ công nghiệp)" },
                    { key: "window",   name: "Lắp cửa sổ / cửa ban công (nhôm)" },
                    { key: "sanitary", name: "Lắp đặt thiết bị vệ sinh (lavabo, bồn cầu, vòi...)" },
                ]
            },
        ]
    },
    {
        id: "xaymoi-nha-dan",
        name: "Xây mới nhà dân (1 tầng)",
        desc: "Từ đào móng đến hoàn thiện cơ bản nhà ở 1 tầng",
        icon: "home",
        sections: [
            {
                name: "Phần I — Công tác đất & Móng",
                items: [
                    { key: "excavation",       name: "Đào đất móng bằng máy" },
                    { key: "backfill",          name: "Đắp đất san lấp" },
                    { key: "concrete-footing",  name: "Bê tông móng M200 (đá 1×2)" },
                ]
            },
            {
                name: "Phần II — Kết cấu BTCT",
                items: [
                    { key: "formwork",        name: "Ván khuôn cột, dầm, sàn" },
                    { key: "concrete-column", name: "Bê tông cột M200" },
                    { key: "concrete-beam",   name: "Bê tông dầm M200" },
                    { key: "concrete-slab",   name: "Bê tông sàn mái M200 (dày 10cm)" },
                ]
            },
            {
                name: "Phần III — Xây tường",
                items: [
                    { key: "masonry-220", name: "Xây tường ngoài gạch 220 (tường đôi)" },
                    { key: "masonry-110", name: "Xây tường trong gạch 110 (tường đơn)" },
                ]
            },
            {
                name: "Phần IV — Hoàn thiện",
                items: [
                    { key: "plastering-2-face",  name: "Trát tường trong + ngoài 2 mặt" },
                    { key: "plastering-ceiling", name: "Trát trần bê tông" },
                    { key: "skim-coat",          name: "Bả bột putty trong nhà" },
                    { key: "paint-interior",     name: "Sơn tường trong 2 nước" },
                    { key: "paint-exterior",     name: "Sơn tường ngoài chống thấm" },
                ]
            },
            {
                name: "Phần V — Nền & Ốp lát",
                items: [
                    { key: "screed",       name: "Cán nền xi măng cát" },
                    { key: "tiling-floor", name: "Lát nền gạch" },
                    { key: "tiling-wall",  name: "Ốp tường nhà vệ sinh" },
                    { key: "waterproof-floor", name: "Chống thấm sàn vệ sinh + mái" },
                ]
            },
            {
                name: "Phần VI — Điện, Nước & Hoàn thiện khác",
                items: [
                    { key: "electrical", name: "Hệ thống điện âm tường" },
                    { key: "plumbing",   name: "Hệ thống cấp/thoát nước" },
                    { key: "door",       name: "Lắp cửa đi" },
                    { key: "window",     name: "Lắp cửa sổ" },
                    { key: "sanitary",   name: "Thiết bị vệ sinh" },
                    { key: "railing",    name: "Lan can cầu thang" },
                ]
            },
        ]
    },
    {
        id: "caito-wc",
        name: "Cải tạo nhà vệ sinh",
        desc: "Tháo dỡ và hoàn thiện lại toàn bộ 1 nhà vệ sinh",
        icon: "droplets",
        sections: [
            {
                name: "Phần I — Tháo dỡ",
                items: [
                    { key: "custom", name: "Tháo gạch ốp tường cũ", unit: "m²", price: 80000 },
                    { key: "custom", name: "Tháo gạch lát nền cũ", unit: "m²", price: 70000 },
                    { key: "custom", name: "Tháo thiết bị vệ sinh cũ", unit: "bộ", price: 500000 },
                ]
            },
            {
                name: "Phần II — Chống thấm & Hoàn thiện",
                items: [
                    { key: "waterproof-floor", name: "Chống thấm sàn vệ sinh (quét 2 lớp)" },
                    { key: "waterproof-wall",  name: "Chống thấm tường (quét 1,5m)" },
                    { key: "screed",           name: "Cán nền xi măng tạo dốc thoát nước" },
                    { key: "tiling-floor",     name: "Lát nền gạch chống trơn" },
                    { key: "tiling-wall",      name: "Ốp tường gạch ceramic/porcelain" },
                ]
            },
            {
                name: "Phần III — Thiết bị & Hoàn thiện",
                items: [
                    { key: "plumbing",   name: "Thay ống cấp/thoát nước" },
                    { key: "sanitary",   name: "Lắp thiết bị vệ sinh mới" },
                    { key: "electrical", name: "Điện chiếu sáng + quạt hút" },
                    { key: "door",       name: "Cửa nhôm kính chống nước" },
                ]
            },
        ]
    },
    {
        id: "xay-tron-goi",
        name: "Xây nhà trọn gói (2–3 tầng)",
        desc: "Từ phá dỡ / đào móng đến hoàn thiện bàn giao nhà 2–3 tầng liền kề / biệt thự nhỏ",
        icon: "building",
        sections: [
            {
                name: "Phần I — Phá dỡ & Chuẩn bị mặt bằng",
                items: [
                    { key: "custom", name: "Phá dỡ công trình cũ (nếu có)", unit: "m²", price: 150000 },
                    { key: "excavation",  name: "Đào đất hố móng bằng máy" },
                    { key: "backfill",    name: "Đắp đất san lấp + đầm chặt" },
                    { key: "custom", name: "Xử lý nền, đổ bê tông lót móng C10", unit: "m²", price: 180000 },
                ]
            },
            {
                name: "Phần II — Móng & Tầng hầm / Tầng 1",
                items: [
                    { key: "concrete-footing", name: "Bê tông móng đơn / móng băng M200" },
                    { key: "formwork",         name: "Ván khuôn móng + giằng móng" },
                    { key: "concrete-column",  name: "Bê tông cột tầng 1 M200" },
                    { key: "concrete-beam",    name: "Bê tông dầm sàn tầng 2 M200" },
                    { key: "concrete-slab",    name: "Bê tông sàn tầng 2 (dày 10cm) M200" },
                    { key: "masonry-220",      name: "Xây tường ngoài tầng 1 gạch 220" },
                    { key: "masonry-110",      name: "Xây tường trong tầng 1 gạch 110" },
                ]
            },
            {
                name: "Phần III — Kết cấu tầng 2",
                items: [
                    { key: "formwork",        name: "Ván khuôn cột dầm sàn tầng 2" },
                    { key: "concrete-column", name: "Bê tông cột tầng 2 M200" },
                    { key: "concrete-beam",   name: "Bê tông dầm sàn tầng 3 M200" },
                    { key: "concrete-slab",   name: "Bê tông sàn tầng 3 (dày 10cm) M200" },
                    { key: "masonry-220",     name: "Xây tường ngoài tầng 2 gạch 220" },
                    { key: "masonry-110",     name: "Xây tường trong tầng 2 gạch 110" },
                ]
            },
            {
                name: "Phần IV — Kết cấu tầng 3 & Mái",
                items: [
                    { key: "formwork",        name: "Ván khuôn cột dầm sàn tầng 3" },
                    { key: "concrete-column", name: "Bê tông cột tầng 3 M200" },
                    { key: "concrete-beam",   name: "Bê tông dầm mái M200" },
                    { key: "concrete-slab",   name: "Bê tông sàn mái (dày 10cm) M200" },
                    { key: "masonry-110",     name: "Xây tường trong tầng 3 gạch 110" },
                    { key: "waterproof-floor",name: "Chống thấm sàn mái (2 lớp)" },
                ]
            },
            {
                name: "Phần V — Cầu thang & Lan can",
                items: [
                    { key: "concrete-stair", name: "Bê tông cầu thang toàn nhà M200" },
                    { key: "railing",        name: "Lan can cầu thang + ban công (inox/sắt)" },
                    { key: "tiling-floor",   name: "Lát bậc cầu thang gạch granite" },
                ]
            },
            {
                name: "Phần VI — Hoàn thiện tường & trần",
                items: [
                    { key: "plastering-2-face",  name: "Trát tường trong + ngoài 2 mặt toàn nhà" },
                    { key: "plastering-ceiling", name: "Trát trần bê tông toàn nhà" },
                    { key: "skim-coat",          name: "Bả bột putty tường trong" },
                    { key: "paint-interior",     name: "Sơn tường trong 2 nước phủ" },
                    { key: "paint-exterior",     name: "Sơn ngoại thất chống thấm 2 nước" },
                    { key: "ceiling-gypsum",     name: "Trần thạch cao phòng khách + phòng ngủ" },
                    { key: "paint-ceiling",      name: "Sơn trần 2 nước" },
                ]
            },
            {
                name: "Phần VII — Nền & Ốp lát",
                items: [
                    { key: "waterproof-floor", name: "Chống thấm sàn vệ sinh các tầng" },
                    { key: "screed",           name: "Cán nền xi măng cát toàn nhà" },
                    { key: "tiling-floor",     name: "Lát nền gạch ceramic/porcelain toàn nhà" },
                    { key: "tiling-wall",      name: "Ốp tường gạch các phòng vệ sinh" },
                    { key: "stone-floor",      name: "Lát đá granite sảnh + phòng khách (nếu có)" },
                ]
            },
            {
                name: "Phần VIII — Điện & Nước",
                items: [
                    { key: "electrical", name: "Hệ thống điện âm tường toàn nhà (dây + CB + ổ cắm)" },
                    { key: "plumbing",   name: "Hệ thống cấp/thoát nước toàn nhà" },
                    { key: "sanitary",   name: "Lắp đặt thiết bị vệ sinh (mỗi phòng tắm)" },
                ]
            },
            {
                name: "Phần IX — Cửa & Hoàn thiện khác",
                items: [
                    { key: "door",     name: "Lắp cửa đi chính + cửa phòng (gỗ công nghiệp)" },
                    { key: "window",   name: "Lắp cửa sổ / cửa ban công nhôm kính" },
                    { key: "fence",    name: "Tường rào + cổng (nếu có)" },
                    { key: "pathway",  name: "Sân trước + lối đi lát gạch" },
                ]
            },
        ]
    },
    {
        id: "son-noi-that",
        name: "Sơn & Hoàn thiện nội thất",
        desc: "Bả putty + sơn tường trần toàn nhà / căn hộ",
        icon: "paint-roller",
        sections: [
            {
                name: "Phần I — Chuẩn bị bề mặt",
                items: [
                    { key: "custom", name: "Đục tẩy vết thấm, nứt, bong tróc", unit: "m²", price: 30000 },
                    { key: "custom", name: "Bơm keo chống nứt khe hở", unit: "md", price: 25000 },
                ]
            },
            {
                name: "Phần II — Bả & Sơn tường",
                items: [
                    { key: "skim-coat",      name: "Bả bột putty tường trong (2 lớp + đánh giấy)" },
                    { key: "paint-interior", name: "Sơn tường trong 1 nước lót + 2 nước phủ" },
                    { key: "paint-exterior", name: "Sơn ngoại thất chống thấm (nếu có)" },
                ]
            },
            {
                name: "Phần III — Trần",
                items: [
                    { key: "ceiling-gypsum", name: "Trần thạch cao (nếu cải tạo)" },
                    { key: "paint-ceiling",  name: "Sơn trần 1 nước lót + 2 nước phủ" },
                ]
            },
        ]
    },
];

// Purchase unit metadata for materials.html
const PURCHASE_MATERIAL_LABELS = {
    "cement-pc40":   { name: "Xi măng PC40",              packSize: 50,   packUnit: "bao 50 kg", displayUnit: "bao" },
    "sand-fine":     { name: "Cát vàng/mịn",              packSize: null, packUnit: "m³",        displayUnit: "m³"  },
    "brick-solid":   { name: "Gạch đặc 6.5×10.5×22 cm",  packSize: null, packUnit: "viên",      displayUnit: "viên"},
    "brick-aac":     { name: "Gạch AAC 10×20×60 cm",      packSize: null, packUnit: "viên",      displayUnit: "viên"},
    "aac-adhesive":  { name: "Keo xây gạch AAC",          packSize: 25,   packUnit: "bao 25 kg", displayUnit: "bao" },
    "tile-adhesive": { name: "Keo dán gạch",              packSize: 25,   packUnit: "bao 25 kg", displayUnit: "bao" },
    "tile-grout":    { name: "Keo chà ron",               packSize: null, packUnit: "kg",        displayUnit: "kg"  },
    "gravel":        { name: "Đá dăm 1×2",                packSize: null, packUnit: "m³",        displayUnit: "m³"  },
    "waterproof":    { name: "Vật liệu chống thấm",       packSize: null, packUnit: "kg",        displayUnit: "kg"  },
};
