import {
  MORTAR_MIX_DESIGNS,
  PACKING_SPECS,
  type MortarGrade,
} from '@/lib/constants'

export interface ScreedingInput {
  area: number
  thickness: number    // cm
  mortarGrade: MortarGrade
  mortarWaste: number  // %
}

export interface ScreedingResult {
  area: number
  mortarVolume: number
  cementKg: number
  cementBags: number
  sandM3: number
  waterLiters: number
  mortarGrade: MortarGrade
  thickness: number
}

export function calculateScreeding(input: ScreedingInput): ScreedingResult {
  const { area, thickness, mortarGrade, mortarWaste } = input

  const thicknessM = thickness / 100
  const mortarVolumeTheory = area * thicknessM
  const mixDesign = MORTAR_MIX_DESIGNS[mortarGrade]

  const cementKg = mortarVolumeTheory * mixDesign.cement * (1 + mortarWaste / 100)
  const sandM3 = mortarVolumeTheory * mixDesign.sand * (1 + mortarWaste / 100)
  const waterLiters = mortarVolumeTheory * mixDesign.water * (1 + mortarWaste / 100)

  return {
    area,
    mortarVolume: mortarVolumeTheory,
    cementKg,
    cementBags: Math.ceil(cementKg / PACKING_SPECS.cement),
    sandM3,
    waterLiters,
    mortarGrade,
    thickness,
  }
}
