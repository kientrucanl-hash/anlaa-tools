'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

interface Props {
  title?: string
  children: React.ReactNode
}

export function AppLayout({ title = 'MECALC', children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-main)',
    }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
