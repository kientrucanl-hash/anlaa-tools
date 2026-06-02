import {
  PLASTERING_MORTAR_RATES,
  MORTAR_MIX_DESIGNS,
  PACKING_SPECS,
  type MortarGrade,
} from '@/lib/constants'

export interface PlasteringInput {
  area: number
  faces: number           // 1 = one side, 2 = both sides
  thickness: 1.5 | 2.0   // cm
  mortarGrade: MortarGrade
  mortarWaste: number     // %
}

export interface PlasteringResult {
  totalArea: number
  mortarVolume: number
  cementKg: number
  cementBags: number
  sandM3: number
  waterLiters: number
  mortarGrade: MortarGrade
  thickness: number
}

export function calculatePlastering(input: PlasteringInput): PlasteringResult {
  const { area, faces, thickness, mortarGrade, mortarWaste } = input

  const totalArea = area * faces
  const mortarRate = PLASTERING_MORTAR_RATES[thickness.toString()]
  if (mortarRate == null) throw new Error(`Unsupported plastering thickness: ${thickness}`)

  const mortarVolumeTheory = totalArea * mortarRate
  const mixDesign = MORTAR_MIX_DESIGNS[mortarGrade]

  const cementKg = mortarVolumeTheory * mixDesign.cement * (1 + mortarWaste / 100)
  const sandM3 = mortarVolumeTheory * mixDesign.sand * (1 + mortarWaste / 100)
  const waterLiters = mortarVolumeTheory * mixDesign.water * (1 + mortarWaste / 100)

  return {
    totalArea,
    mortarVolume: mortarVolumeTheory,
    cementKg,
    cementBags: Math.ceil(cementKg / PACKING_SPECS.cement),
    sandM3,
    waterLiters,
    mortarGrade,
    thickness,
  }
}
