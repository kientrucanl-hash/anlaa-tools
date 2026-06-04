'use client'

import { useMemo, useState } from 'react'
import { calculateMasonry } from '@/lib/calculations/masonry'
import type { BrickType, MortarGrade } from '@/lib/constants'
import { formatNumber } from '@/lib/utils'

export default function MasonryPage() {
  const [length, setLength] = useState(10)
  const [height, setHeight] = useState(3)
  const [wallType, setWallType] = useState<'110' | '220'>('110')
  const [brickType, setBrickType] = useState<BrickType>('brick-solid')
  const [mortarGrade, setMortarGrade] = useState<MortarGrade>('M75')
  const [brickWaste, setBrickWaste] = useState(3)
  const [mortarWaste, setMortarWaste] = useState(5)
  const [autoPlaster, setAutoPlaster] = useState(true)

  const result = useMemo(() => calculateMasonry({
    walls: [{ length, height, wallType, multiplier: 1, faces: 2 }],
    doors: [],
    brickType,
    mortarGrade,
    brickWaste,
    mortarWaste,
    autoPlaster: { enabled: autoPlaster, faces: 'auto', thickness: 1.5, mortarGrade, waste: 8 },
  }), [length, height, wallType, brickType, mortarGrade, brickWaste, mortarWaste, autoPlaster])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Xây & Trát</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 3 }}>Tính tường xây, gạch, vữa xây và tùy chọn trát tự động hai mặt.</p>
      </div>
      <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', padding: '1rem' }}>
        <NumberField label="Dài tường (m)" value={length} onChange={setLength} />
        <NumberField label="Cao tường (m)" value={height} onChange={setHeight} />
        <SelectField label="Loại tường" value={wallType} onChange={(value) => setWallType(value as '110' | '220')} options={['110', '220']} />
        <SelectField label="Loại gạch" value={brickType} onChange={(value) => setBrickType(value as BrickType)} options={['brick-solid', 'brick-2-hole', 'brick-aac', 'none']} />
        <SelectField label="Mác vữa" value={mortarGrade} onChange={(value) => setMortarGrade(value as MortarGrade)} options={['M50', 'M75', 'M100']} />
        <NumberField label="Hao hụt gạch (%)" value={brickWaste} onChange={setBrickWaste} />
        <NumberField label="Hao hụt vữa (%)" value={mortarWaste} onChange={setMortarWaste} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>
          <input type="checkbox" checked={autoPlaster} onChange={(e) => setAutoPlaster(e.target.checked)} />
          Tự tính trát 2 mặt
        </label>
      </div>
      <ResultGrid rows={[
        ['Diện tích tường', `${formatNumber(result.netArea, 2)} m²`],
        ['Khối xây', `${formatNumber(result.wallVolume, 3)} m³`],
        ['Gạch cần mua', `${result.bricksCount} viên`],
        ['Xi măng', `${formatNumber(result.cementKg, 1)} kg · ${result.cementBags} bao`],
        ['Cát', `${formatNumber(result.sandM3, 2)} m³`],
        ['Nước', `${formatNumber(result.waterLiters, 0)} lít`],
      ]} />
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label style={{ display: 'grid', gap: 4, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>
      {label}
      <input className="input-base" type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </label>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label style={{ display: 'grid', gap: 4, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>
      {label}
      <select className="input-base" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function ResultGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem', padding: '1rem' }}>
      {rows.map(([label, value]) => (
        <div key={label} style={{ border: '1px solid var(--border-glass)', borderRadius: 8, padding: '0.75rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700 }}>{label}</div>
          <div style={{ color: 'var(--color-primary)', fontSize: '1rem', fontWeight: 900, marginTop: 4 }}>{value}</div>
        </div>
      ))}
    </div>
  )
}
