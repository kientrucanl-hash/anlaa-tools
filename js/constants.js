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

// 10. Default construction work item prices (combined material + labor, Hanoi market Q1/2025)
// These are "đơn giá thi công tổng hợp" — suitable for private/residential projects (nhà dân)
// User can update these in the "Đơn Giá Thi Công" tab; changes persist in localStorage
const DEFAULT_WORK_ITEM_PRICES = {
    "masonry-110": {
        name: "Xây tường gạch 110 (tường đơn)",
        unit: "m²",
        price: 250000
    },
    "masonry-220": {
        name: "Xây tường gạch 220 (tường đôi)",
        unit: "m²",
        price: 350000
    },
    "masonry-aac-110": {
        name: "Xây tường gạch AAC 100mm",
        unit: "m²",
        price: 220000
    },
    "plastering-1-face": {
        name: "Trát tường xi măng 1 mặt",
        unit: "m²",
        price: 65000
    },
    "plastering-2-face": {
        name: "Trát tường xi măng 2 mặt",
        unit: "m²",
        price: 120000
    },
    "screed": {
        name: "Cán nền phẳng xi măng cát",
        unit: "m²",
        price: 85000
    },
    "tiling-floor": {
        name: "Lát nền gạch (gạch + keo + nhân công)",
        unit: "m²",
        price: 180000
    },
    "tiling-wall": {
        name: "Ốp tường gạch (gạch + keo + nhân công)",
        unit: "m²",
        price: 200000
    }
};

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
