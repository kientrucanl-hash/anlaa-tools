'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: number
}

export function Modal({ open, onClose, title, children, width = 480 }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="glass-card"
        style={{ width: '100%', maxWidth: width, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-glass)',
        }}>
          <h3 style={{ flex: 1, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
