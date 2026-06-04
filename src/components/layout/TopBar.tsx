'use client'

import { Menu, Sun, Moon, Contrast } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState } from 'react'

interface Props {
  title: string
  onMenuClick: () => void
}

const THEMES = [
  { key: 'dark',  icon: Moon,     label: 'Dark' },
  { key: 'light', icon: Sun,      label: 'Light' },
  { key: 'hc',    icon: Contrast, label: 'High Contrast' },
]

export function TopBar({ title, onMenuClick }: Props) {
  const { theme, setTheme } = useTheme()
  const [showThemePicker, setShowThemePicker] = useState(false)

  const currentTheme = THEMES.find((t) => t.key === theme) ?? THEMES[0]!
  const Icon = currentTheme.icon

  return (
    <header style={{
      height: 52,
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0 1rem',
      borderBottom: '1px solid var(--border-glass)',
      background: 'var(--bg-card)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
      >
        <Menu size={20} />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: '0.9375rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
          {title}
        </h1>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 700 }}>
          App dự toán thay G8 · bóc KL · đơn giá · NTP
        </div>
      </div>

      {/* Theme switcher */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowThemePicker((v) => !v)}
          title="Đổi giao diện"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-glass)',
            borderRadius: 8,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <Icon size={15} />
        </button>

        {showThemePicker && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowThemePicker(false)} />
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 6,
              background: 'var(--bg-more-menu)',
              border: '1px solid var(--border-glass)',
              borderRadius: 10,
              padding: '0.25rem',
              zIndex: 50,
              minWidth: 140,
              boxShadow: 'var(--shadow-glass)',
            }}>
              {THEMES.map((t) => {
                const TIcon = t.icon
                return (
                  <button
                    key={t.key}
                    onClick={() => { setTheme(t.key); setShowThemePicker(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      width: '100%', padding: '0.4rem 0.6rem',
                      background: theme === t.key ? 'rgba(0,242,254,0.08)' : 'none',
                      border: 'none', borderRadius: 7, cursor: 'pointer',
                      color: theme === t.key ? 'var(--border-focus)' : 'var(--text-secondary)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <TIcon size={13} /> {t.label}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </header>
  )
}
