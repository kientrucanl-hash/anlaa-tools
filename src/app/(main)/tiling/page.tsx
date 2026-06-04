'use client'

import { useMemo, useState } from 'react'
import { calculateTiling } from '@/lib/calculations/tiling'
import type { MixRatio, TileSize, TilingMethod } from '@/lib/constants'
import { formatNumber } from '@/lib/utils'

export default function TilingPage() {
  const [area, setArea] = useState(25)
  const [tileSize, setTileSize] = useState<TileSize>('60x60')
  const [method, setMethod] = useState<TilingMethod>('adhesive-pure')
  const [mixRatio, setMixRatio] = useState<MixRatio>('1:1')
  const [groutWidth, setGroutWidth] = useState(2)
  const [tileThickness, setTileThickness] = useState(8)
  const [tileWaste, setTileWaste] = useState(5)
  const [adhesiveWaste, setAdhesiveWaste] = useState(5)
  const [groutWaste, setGroutWaste] = useState(5)

  const result = useMemo(() => calculateTiling({ area, tileSize, method, mixRatio, groutWidth, tileThickness, tileWaste, adhesiveWaste, groutWaste }), [area, tileSize, method, mixRatio, groutWidth, tileThickness, tileWaste, adhesiveWaste, groutWaste])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ốp lát gạch</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 3 }}>Tính số viên/hộp gạch, keo dán, chà ron và phụ kiện căn chỉnh.</p>
      </div>
      <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', padding: '1rem' }}>
        <NumberField label="Diện tích (m²)" value={area} onChange={setArea} />
        <SelectField label="Kích thước gạch" value={tileSize} onChange={(value) => setTileSize(value as TileSize)} options={['30x30', '40x40', '30x60', '60x60', '80x80', '60x120']} />
        <SelectField label="Phương pháp" value={method} onChange={(value) => setMethod(value as TilingMethod)} options={['adhesive-pure', 'adhesive-mixed']} />
        <SelectField label="Tỷ lệ trộn" value={mixRatio} onChange={(value) => setMixRatio(value as MixRatio)} options={['1:1', '2:1', '1:2']} />
        <NumberField label="Mạch ron (mm)" value={groutWidth} onChange={setGroutWidth} />
        <NumberField label="Dày gạch (mm)" value={tileThickness} onChange={setTileThickness} />
        <NumberField label="Hao hụt gạch (%)" value={tileWaste} onChange={setTileWaste} />
        <NumberField label="Hao hụt keo (%)" value={adhesiveWaste} onChange={setAdhesiveWaste} />
        <NumberField label="Hao hụt ron (%)" value={groutWaste} onChange={setGroutWaste} />
      </div>
      <ResultGrid rows={[
        ['Gạch cần mua', `${result.tilesCount} viên · ${result.boxesCount} hộp`],
        ['Keo dán', `${formatNumber(result.adhesiveKg, 1)} kg · ${result.adhesiveBags} bao`],
        ['Xi măng trộn', result.cementKg > 0 ? `${formatNumber(result.cementKg, 1)} kg · ${result.cementBags} bao` : '-'],
        ['Keo chà ron', `${formatNumber(result.groutKg, 1)} kg`],
        ['Ke chữ thập', `${result.crossCount} cái · ${result.crossPacks} gói`],
        ['Nêm/clip cân bằng', result.clipsCount > 0 ? `${result.clipsCount} clip · ${result.clipsPacks} gói` : '-'],
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
