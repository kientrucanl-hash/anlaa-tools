import {
  TILE_SPECS,
  TILING_ADHESIVE_RATES,
  PACKING_SPECS,
  type TileSize,
  type TilingMethod,
  type MixRatio,
} from '@/lib/constants'

export interface TilingInput {
  area: number
  tileSize: TileSize
  method: TilingMethod
  mixRatio: MixRatio       // only used when method === 'adhesive-mixed'
  groutWidth: number       // mm — mạch ron
  tileThickness: number    // mm — độ dày gạch
  tileWaste: number        // %
  adhesiveWaste: number    // %
  groutWaste: number       // %
}

export interface TilingResult {
  area: number
  tilesCount: number       // to buy (Math.ceil with waste)
  tilesTheory: number
  boxesCount: number
  tileSpecSize: number     // tiles per box
  method: TilingMethod
  mixRatio: MixRatio
  adhesiveKg: number
  adhesiveBags: number
  cementKg: number
  cementBags: number
  groutKg: number
  crossCount: number
  crossPacks: number
  clipsCount: number
  clipsPacks: number
  wedgesCount: number
  wedgesPacks: number
  tileSize: TileSize
}

export function calculateTiling(input: TilingInput): TilingResult {
  const {
    area, tileSize, method, mixRatio,
    groutWidth, tileThickness,
    tileWaste, adhesiveWaste, groutWaste,
  } = input

  const tileSpec = TILE_SPECS[tileSize]

  // 1. Tile count
  const tilesTheory = area / tileSpec.area
  const tilesToBuy = Math.ceil(tilesTheory * (1 + tileWaste / 100))
  const boxesToBuy = Math.ceil(tilesToBuy / tileSpec.packSize)

  // 2. Adhesive / cement
  let adhesiveKg = 0
  let adhesiveBags = 0
  let cementKg = 0
  let cementBags = 0

  if (method === 'adhesive-pure') {
    const isSmallTile = tileSpec.area <= 0.36
    const baseRate = isSmallTile ? TILING_ADHESIVE_RATES.pure.small : TILING_ADHESIVE_RATES.pure.large
    adhesiveKg = area * baseRate * (1 + adhesiveWaste / 100)
    adhesiveBags = Math.ceil(adhesiveKg / PACKING_SPECS.tileAdhesive)
  } else {
    const totalDryMix = area * TILING_ADHESIVE_RATES.mixed.rate * (1 + adhesiveWaste / 100)
    let adhesiveRatio = 0.5
    let cementRatio = 0.5
    if (mixRatio === '2:1') { adhesiveRatio = 2 / 3; cementRatio = 1 / 3 }
    else if (mixRatio === '1:2') { adhesiveRatio = 1 / 3; cementRatio = 2 / 3 }
    adhesiveKg = totalDryMix * adhesiveRatio
    adhesiveBags = Math.ceil(adhesiveKg / PACKING_SPECS.tileAdhesive)
    cementKg = totalDryMix * cementRatio
    cementBags = Math.ceil(cementKg / PACKING_SPECS.cement)
  }

  // 3. Grout — formula: [(W+L)/(W*L)] * tileThickness * groutWidth * 1.4
  const [dimW, dimL] = tileSize.split('x').map((d) => parseInt(d) * 10) // mm
  const groutRateTheory = ((dimW! + dimL!) / (dimW! * dimL!)) * tileThickness * groutWidth * 1.4
  const groutKg = area * groutRateTheory * (1 + groutWaste / 100)

  // 4. Accessories
  const crossToBuy = Math.ceil(area * tileSpec.accessories.cross * 1.05)
  const crossPacks = Math.ceil(crossToBuy / PACKING_SPECS.tileCross)

  let clipsCount = 0; let clipsPacks = 0
  let wedgesCount = 0; let wedgesPacks = 0

  if (tileSpec.accessories.clips > 0) {
    clipsCount = Math.ceil(area * tileSpec.accessories.clips * 1.05)
    clipsPacks = Math.ceil(clipsCount / PACKING_SPECS.tileClips)
    wedgesCount = Math.ceil(area * tileSpec.accessories.wedges * 1.05)
    wedgesPacks = Math.ceil(wedgesCount / PACKING_SPECS.tileWedges)
  }

  return {
    area,
    tilesCount: tilesToBuy,
    tilesTheory,
    boxesCount: boxesToBuy,
    tileSpecSize: tileSpec.packSize,
    method,
    mixRatio,
    adhesiveKg,
    adhesiveBags,
    cementKg,
    cementBags,
    groutKg,
    crossCount: crossToBuy,
    crossPacks,
    clipsCount,
    clipsPacks,
    wedgesCount,
    wedgesPacks,
    tileSize,
  }
}
