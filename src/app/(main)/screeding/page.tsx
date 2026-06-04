'use client'

import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { calculateScreeding } from '@/lib/calculations/screeding'
import type { MortarGrade } from '@/lib/constants'
import { formatNumber } from '@/lib/utils'

export default function ScreedingPage() {
  const [area, setArea] = useState(25)
  const [thickness, setThickness] = useState(3)
  const [mortarGrade, setMortarGrade] = useState<MortarGrade>('M75')
  const [mortarWaste, setMortarWaste] = useState(8)

  const result = useMemo(() => calculateScreeding({ area, thickness, mortarGrade, mortarWaste }), [area, thickness, mortarGrade, mortarWaste])

  return (
    <ToolShell title="Cán nền xi măng cát" subtitle="Tính khối lượng vữa, xi măng, cát và nước theo diện tích cán nền.">
      <InputGrid>
        <NumberField label="Diện tích (m²)" value={area} onChange={setArea} />
        <NumberField label="Chiều dày (cm)" value={thickness} onChange={setThickness} />
        <SelectField label="Mác vữa" value={mortarGrade} onChange={(value) => setMortarGrade(value as MortarGrade)} options={['M50', 'M75', 'M100']} />
        <NumberField label="Hao hụt vữa (%)" value={mortarWaste} onChange={setMortarWaste} />
      </InputGrid>
      <ResultGrid rows={[
        ['Khối lượng vữa', `${formatNumber(result.mortarVolume, 3)} m³`],
        ['Xi măng', `${formatNumber(result.cementKg, 1)} kg · ${result.cementBags} bao`],
        ['Cát', `${formatNumber(result.sandM3, 2)} m³`],
        ['Nước', `${formatNumber(result.waterLiters, 0)} lít`],
      ]} />
    </ToolShell>
  )
}

function ToolShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <PageHeader eyebrow="Calculator bóc tách" title={title} subtitle={subtitle} />
      {children}
    </div>
  )
}

function InputGrid({ children }: { children: React.ReactNode }) {
  return <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', padding: '1rem' }}>{children}</div>
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
