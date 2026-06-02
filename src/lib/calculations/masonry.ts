import {
  BRICK_PROPERTIES,
  MORTAR_MIX_DESIGNS,
  PACKING_SPECS,
  type BrickType,
  type MortarGrade,
} from '@/lib/constants'

export interface WallSegment {
  length: number
  height: number
  wallType: '110' | '220'
  multiplier: number
  faces?: number     // number of exposed faces to plaster (default 2)
}

export interface DoorDeduction {
  type: 'door-3' | 'door-4'  // 3-side or 4-side frame
  width: number
  height: number
  multiplier: number
  plasterJambs: boolean
}

export interface AutoPlasterSettings {
  enabled: boolean
  faces: 'auto' | string       // 'auto' = per-wall, or '1' | '2'
  thickness: number            // cm
  mortarGrade: MortarGrade
  waste: number                // %
  directPlasterArea?: number | null
}

export interface ColumnPlasterSettings {
  enabled: boolean
  length: number
  width: number
}

export interface MasonryInput {
  walls: WallSegment[]
  doors: DoorDeduction[]
  brickType: BrickType
  mortarGrade: MortarGrade
  brickWaste: number           // %
  mortarWaste: number          // %
  autoPlaster?: AutoPlasterSettings
  columnPlaster?: ColumnPlasterSettings
  directVolume?: number | null  // override: use direct m³ instead of wall segments
}

export interface AutoPlasterResult {
  faces: number
  thickness: number
  mortarGrade: MortarGrade
  waste: number
  plasterArea: number
  jambsLength: number
  plasterVolume: number
  cementKg: number
  sandM3: number
}

export interface MasonryResult {
  grossArea: number
  doorArea: number
  netArea: number
  wallVolume: number
  bricksCount: number      // to buy (Math.ceil with waste)
  bricksTheory: number     // raw theory count
  cementKg: number         // total (masonry + plaster if auto)
  cementBags: number       // Math.ceil
  sandM3: number
  waterLiters: number
  specialAACMortarKg: number
  specialAACMortarBags: number
  brickType: BrickType
  mortarGrade: MortarGrade
  hasAutoPlaster: boolean
  autoPlaster: AutoPlasterResult | null
}

export function calculateMasonry(input: MasonryInput): MasonryResult {
  const {
    walls,
    doors,
    brickType,
    mortarGrade,
    brickWaste,
    mortarWaste,
    autoPlaster: autoPlasterSettings,
    columnPlaster: columnPlasterSettings,
    directVolume,
  } = input

  const brickSpec = BRICK_PROPERTIES[brickType]

  let grossArea = 0
  let doorArea = 0
  let netArea = 0
  let wallVolume = 0
  let bricksTheory = 0
  let bricksToBuy = 0
  let wall110Volume = 0
  let wall220Volume = 0
  let grossPlasterArea = 0

  if (directVolume != null) {
    // Direct volume mode
    wallVolume = directVolume
    const bricksPerM3 = brickSpec.estimation['110']
    bricksTheory = wallVolume * bricksPerM3
    bricksToBuy = Math.ceil(bricksTheory * (1 + brickWaste / 100))
    netArea = wallVolume / 0.11
  } else {
    // Detailed wall-segment mode
    for (const wall of walls) {
      const wArea = wall.length * wall.height * wall.multiplier
      const wThickness = wall.wallType === '220' ? 0.22 : 0.11
      const wVolume = wArea * wThickness
      const wFaces = wall.faces ?? 2

      grossArea += wArea
      grossPlasterArea += wArea * wFaces

      if (wall.wallType === '220') {
        wall220Volume += wVolume
      } else {
        wall110Volume += wVolume
      }
    }

    for (const door of doors) {
      doorArea += door.width * door.height * door.multiplier
    }

    netArea = Math.max(0, grossArea - doorArea)

    const grossVolume = wall110Volume + wall220Volume
    const doorsVolume = doorArea * 0.11
    wallVolume = Math.max(0, grossVolume - doorsVolume)

    // Brick count by wall type ratio
    if (grossVolume > 0) {
      if (wall110Volume > 0) {
        const ratio = wall110Volume / grossVolume
        bricksTheory += wallVolume * ratio * brickSpec.estimation['110']
      }
      if (wall220Volume > 0) {
        const ratio = wall220Volume / grossVolume
        bricksTheory += wallVolume * ratio * brickSpec.estimation['220']
      }
    }
    bricksToBuy = Math.ceil(bricksTheory * (1 + brickWaste / 100))
  }

  let cementKg = 0
  let sandM3 = 0
  let waterLiters = 0
  let specialAACMortarKg = 0

  if (brickType === 'none') {
    bricksTheory = 0
    bricksToBuy = 0
  } else if (brickType === 'brick-aac') {
    const aacSpec = brickSpec as typeof BRICK_PROPERTIES['brick-aac']
    specialAACMortarKg = netArea * aacSpec.specialMortarRate * (1 + mortarWaste / 100)
  } else {
    const mortarVolumeTheory = wallVolume * 0.23
    const mixDesign = MORTAR_MIX_DESIGNS[mortarGrade]
    cementKg = mortarVolumeTheory * mixDesign.cement * (1 + mortarWaste / 100)
    sandM3 = mortarVolumeTheory * mixDesign.sand * (1 + mortarWaste / 100)
    waterLiters = mortarVolumeTheory * mixDesign.water * (1 + mortarWaste / 100)
  }

  // Auto plastering
  let hasAutoPlaster = false
  let autoPlasterResult: AutoPlasterResult | null = null

  if (autoPlasterSettings?.enabled && brickType !== 'brick-aac') {
    hasAutoPlaster = true
    const { thickness, mortarGrade: plasterGrade, waste: plasterWaste } = autoPlasterSettings

    const effectiveFaces = grossArea > 0 ? Math.round(grossPlasterArea / grossArea) : 2

    let plasterArea = 0
    if (autoPlasterSettings.directPlasterArea != null) {
      plasterArea = autoPlasterSettings.directPlasterArea
    } else if (autoPlasterSettings.faces === 'auto') {
      plasterArea = grossArea > 0 ? grossPlasterArea * (netArea / grossArea) : 0
    } else {
      const faces = parseInt(autoPlasterSettings.faces) || 2
      plasterArea = netArea * faces
    }

    // Door jambs
    let jambsLength = 0
    if (directVolume == null) {
      for (const door of doors) {
        if (door.plasterJambs) {
          if (door.type === 'door-3') {
            jambsLength += (2 * door.height + door.width) * door.multiplier
          } else {
            jambsLength += 2 * (door.height + door.width) * door.multiplier
          }
        }
      }
    }

    const avgThickness = wall220Volume > 0 && wall110Volume === 0 ? 0.22 : 0.11
    const jambsPlasterVolume = jambsLength * avgThickness * (thickness / 100)
    const flatPlasterVolume = plasterArea * (thickness / 100)
    let plasterVolume = flatPlasterVolume + jambsPlasterVolume

    if (columnPlasterSettings?.enabled) {
      plasterVolume += columnPlasterSettings.length * columnPlasterSettings.width * (thickness / 100)
    }

    const plasterMix = MORTAR_MIX_DESIGNS[plasterGrade]
    const plasterCementKg = plasterVolume * plasterMix.cement * (1 + plasterWaste / 100)
    const plasterSandM3 = plasterVolume * plasterMix.sand * (1 + plasterWaste / 100)

    cementKg += plasterCementKg
    sandM3 += plasterSandM3

    autoPlasterResult = {
      faces: effectiveFaces,
      thickness,
      mortarGrade: plasterGrade,
      waste: plasterWaste,
      plasterArea,
      jambsLength,
      plasterVolume,
      cementKg: plasterCementKg,
      sandM3: plasterSandM3,
    }
  }

  return {
    grossArea,
    doorArea,
    netArea,
    wallVolume,
    bricksCount: bricksToBuy,
    bricksTheory,
    cementKg,
    cementBags: Math.ceil(cementKg / PACKING_SPECS.cement),
    sandM3,
    waterLiters,
    specialAACMortarKg,
    specialAACMortarBags: Math.ceil(specialAACMortarKg / PACKING_SPECS.tileAdhesive),
    brickType,
    mortarGrade,
    hasAutoPlaster,
    autoPlaster: autoPlasterResult,
  }
}
