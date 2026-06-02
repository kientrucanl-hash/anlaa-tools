'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { authApi } from '@/lib/api/client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'

export default function SettingsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPwd !== confirmPwd) { showToast('Mật khẩu mới không khớp', 'error'); return }
    if (newPwd.length < 6) { showToast('Mật khẩu mới phải có ít nhất 6 ký tự', 'error'); return }
    setLoading(true)
    try {
      await authApi.changePassword(currentPwd, newPwd)
      showToast('Đổi mật khẩu thành công', 'success')
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Cài đặt Tài khoản</h2>

      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Thông tin tài khoản</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', width: 120 }}>Tên đăng nhập</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{user?.username}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', width: 120 }}>Vai trò</span>
            <span style={{ color: user?.role === 'ADMIN' ? 'var(--color-tiling)' : 'var(--text-secondary)', fontWeight: 600 }}>
              {user?.role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng'}
            </span>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Đổi mật khẩu</h3>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {[
            { label: 'Mật khẩu hiện tại', value: currentPwd, onChange: setCurrentPwd },
            { label: 'Mật khẩu mới', value: newPwd, onChange: setNewPwd },
            { label: 'Xác nhận mật khẩu mới', value: confirmPwd, onChange: setConfirmPwd },
          ].map(({ label, value, onChange }) => (
            <div key={label}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{label}</label>
              <input className="input-base" type="password" style={{ width: '100%', padding: '0.6rem 0.875rem', fontSize: '0.875rem' }} value={value} onChange={(e) => onChange(e.target.value)} required />
            </div>
          ))}
          <Button type="submit" loading={loading} disabled={!currentPwd || !newPwd || !confirmPwd} style={{ alignSelf: 'flex-end' }}>
            Đổi mật khẩu
          </Button>
        </form>
      </div>
    </div>
  )
}
