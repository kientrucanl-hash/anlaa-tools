'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Square, Layers, Grid3x3, Coins, HardHat,
  FileSpreadsheet, Package, BarChart2, Users,
  Clock, Settings, BookOpen, ShieldCheck,
  Bell, LogOut, X, ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { authApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

const NAV_TOOLS = [
  { href: '/masonry',   icon: Square,      label: 'Xây & Trát' },
  { href: '/screeding', icon: Layers,      label: 'Cán nền' },
  { href: '/tiling',    icon: Grid3x3,     label: 'Ốp lát gạch' },
  null,
  { href: '/pricing',   icon: Coins,       label: 'Đơn giá Vật tư' },
  { href: '/pricing',   icon: HardHat,     label: 'Đơn giá Thi công' },
]

const NAV_MAIN = [
  { href: '/estimate',    icon: FileSpreadsheet, label: 'Dự toán Chi phí' },
  { href: '/materials',   icon: Package,         label: 'Vật tư cần mua' },
  { href: '/pricing',     icon: BarChart2,        label: 'Bảng Giá & NTP' },
  { href: '/contractors', icon: Users,            label: 'Nhà thầu phụ' },
  null,
  { href: '/quotations',  icon: FileSpreadsheet,  label: 'Báo giá so sánh' },
  { href: '/history',     icon: Clock,            label: 'Lịch sử Dự toán' },
  { href: '/settings',    icon: Settings,         label: 'Cài đặt Tài khoản' },
  { href: '/help',        icon: BookOpen,         label: 'Hướng dẫn sử dụng' },
]

export function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth } = useAuth()
  const { data: notifData } = useNotifications()
  const unread = notifData?.unread ?? 0

  async function handleLogout() {
    try { await authApi.logout() } catch {}
    clearAuth()
    router.push('/login')
  }

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-30 h-full flex flex-col transition-transform duration-300',
          'lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          width: 'var(--sidebar-width)',
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-glass)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem', borderBottom: '1px solid var(--border-glass)',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Dự toán ANLAA
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mecalc v3.0</div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden"
            style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.5rem' }}>
          <NavSection label="Điều hướng">
            {NAV_MAIN.map((item, i) =>
              item === null
                ? <div key={i} style={{ height: 1, background: 'var(--border-glass)', margin: '4px 8px' }} />
                : <NavItem key={item.href + item.label} {...item} active={pathname === item.href} onClick={onClose} />
            )}
            {user?.role === 'ADMIN' && (
              <NavItem href="/admin" icon={ShieldCheck} label="Quản lý Admin" active={pathname === '/admin'} onClick={onClose} />
            )}
          </NavSection>
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.75rem',
          borderTop: '1px solid var(--border-glass)',
          background: 'var(--bg-sidebar-footer)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Avatar */}
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(0,242,254,0.12)',
              border: '1.5px solid var(--border-glass)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--border-focus)',
              fontSize: '0.875rem', fontWeight: 700,
            }}>
              {user?.username?.[0]?.toUpperCase() ?? '?'}
            </div>

            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.username ?? '—'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {user?.role === 'ADMIN' ? 'Quản trị viên' : 'KTS / Người dự toán'}
              </div>
            </div>

            {/* Notification bell */}
            <Link href="/notifications" style={{ position: 'relative', color: 'var(--text-muted)' }}>
              <Bell size={16} />
              {unread > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#ff5252', color: '#fff',
                  fontSize: '0.55rem', fontWeight: 800,
                  width: 14, height: 14, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Đăng xuất"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '0 0.75rem', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
        {label}
      </p>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </nav>
    </div>
  )
}

function NavItem({ href, icon: Icon, label, active, onClick }: {
  href: string; icon: React.ElementType; label: string; active: boolean; onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.625rem',
        padding: '0.5rem 0.75rem',
        borderRadius: 10,
        fontSize: '0.8125rem',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--border-focus)' : 'var(--text-secondary)',
        background: active ? 'rgba(0,242,254,0.08)' : 'transparent',
        border: active ? '1px solid rgba(0,242,254,0.15)' : '1px solid transparent',
        textDecoration: 'none',
        transition: 'all 0.15s ease',
      }}
    >
      <Icon size={15} />
      <span style={{ flex: 1 }}>{label}</span>
      {active && <ChevronRight size={12} />}
    </Link>
  )
}
