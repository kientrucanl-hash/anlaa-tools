'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, KeyRound, ShieldCheck, ShieldOff, CheckCircle, XCircle } from 'lucide-react'
import { usersApi, projectsApi } from '@/lib/api/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatDateTime, statusLabel, statusClass } from '@/lib/utils'
import { usePathname, useRouter } from 'next/navigation'

type Tab = 'users' | 'projects'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{label}</label>
      {children}
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const pathTab = pathname.split('/').filter(Boolean).at(-1)
  const selectedTab: Tab = pathTab === 'projects' ? 'projects' : 'users'
  const [tab, setTab] = useState<Tab>(selectedTab)
  useEffect(() => {
    if (user && user.role !== 'ADMIN') router.replace('/dashboard')
  }, [router, user])
  useEffect(() => {
    setTab(selectedTab)
    if (pathname === '/admin') router.replace(`/admin/${selectedTab}`, { scroll: false })
  }, [pathname, router, selectedTab])

  if (user?.role !== 'ADMIN') return null

  return (
    <div>
      <PageHeader
        eyebrow="Quản trị hệ thống"
        title="Admin Console"
        subtitle="Quản lý người dùng, duyệt dự án và kiểm soát dữ liệu ANLAA Estimate."
      />
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.25rem', width: 'fit-content', border: '1px solid var(--border-glass)' }}>
        {(['users', 'projects'] as Tab[]).map((t) => (
          <button key={t} onClick={() => router.push(`/admin/${t}`)} style={{ padding: '0.4rem 1rem', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: tab === t ? 'rgba(0,242,254,0.1)' : 'none', color: tab === t ? 'var(--border-focus)' : 'var(--text-muted)' }}>
            {t === 'users' ? 'Người dùng' : 'Dự án'}
          </button>
        ))}
      </div>
      {tab === 'users' ? <UsersTab /> : <ProjectsAdminTab />}
    </div>
  )
}

function UsersTab() {
  const { showToast } = useToast()
  const qc = useQueryClient()
  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: () => usersApi.list() })
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', role: 'USER' as 'USER' | 'ADMIN' })
  const [resetTarget, setResetTarget] = useState<{ id: number; username: string } | null>(null)
  const [newPwd, setNewPwd] = useState('')
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-users'] })
  const createUser = useMutation({ mutationFn: () => usersApi.create({ username: form.username, password: form.password, role: form.role }), onSuccess: () => { inv(); showToast('Đã tạo tài khoản', 'success'); setShowCreate(false); setForm({ username: '', password: '', role: 'USER' }) }, onError: (e: Error) => showToast(e.message, 'error') })
  const deleteUser = useMutation({ mutationFn: (id: number) => usersApi.delete(id), onSuccess: () => { inv(); showToast('Đã xóa người dùng', 'success') }, onError: (e: Error) => showToast(e.message, 'error') })
  const resetPwd = useMutation({ mutationFn: () => usersApi.resetPassword(resetTarget!.id, newPwd), onSuccess: () => { showToast('Đã đặt lại mật khẩu', 'success'); setResetTarget(null); setNewPwd('') }, onError: (e: Error) => showToast(e.message, 'error') })
  const changeRole = useMutation({ mutationFn: ({ id, role }: { id: number; role: string }) => usersApi.changeRole(id, role), onSuccess: () => { inv(); showToast('Đã cập nhật vai trò', 'success') }, onError: (e: Error) => showToast(e.message, 'error') })
  type U = { id: number; username: string; role: string; createdAt: string }
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Tạo tài khoản</Button>
      </div>
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border-glass)' }}>{['ID', 'Tên đăng nhập', 'Vai trò', 'Ngày tạo', 'Hành động'].map((h) => <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>{h}</th>)}</tr></thead>
            <tbody>{(users as U[]).map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <td style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)' }}>{u.id}</td>
                <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{u.username}</td>
                <td style={{ padding: '0.65rem 1rem' }}><Badge variant={u.role === 'ADMIN' ? 'warning' : 'default'}>{u.role === 'ADMIN' ? 'Admin' : 'User'}</Badge></td>
                <td style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)' }}>{formatDateTime(u.createdAt)}</td>
                <td style={{ padding: '0.65rem 1rem' }}><div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={() => changeRole.mutate({ id: u.id, role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>{u.role === 'ADMIN' ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}</button>
                  <button onClick={() => { setResetTarget({ id: u.id, username: u.username }); setNewPwd('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><KeyRound size={14} /></button>
                  <button onClick={() => deleteUser.mutate(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo tài khoản mới" width={400}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <Field label="Tên đăng nhập"><input className="input-base" style={{ width: '100%', padding: '0.6rem 0.875rem', fontSize: '0.875rem' }} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} autoFocus /></Field>
          <Field label="Mật khẩu"><input className="input-base" type="password" style={{ width: '100%', padding: '0.6rem 0.875rem', fontSize: '0.875rem' }} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></Field>
          <Field label="Vai trò"><select className="input-base" style={{ width: '100%', padding: '0.6rem 0.875rem', fontSize: '0.875rem' }} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'USER' | 'ADMIN' }))}><option value="USER">User</option><option value="ADMIN">Admin</option></select></Field>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}><Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Hủy</Button><Button size="sm" onClick={() => createUser.mutate()} loading={createUser.isPending} disabled={!form.username || !form.password}>Tạo</Button></div>
        </div>
      </Modal>
      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title="Đặt lại mật khẩu" width={380}>
        <Field label="Mật khẩu mới"><input className="input-base" type="password" style={{ width: '100%', padding: '0.6rem 0.875rem', fontSize: '0.875rem' }} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} autoFocus /></Field>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}><Button variant="secondary" size="sm" onClick={() => setResetTarget(null)}>Hủy</Button><Button size="sm" onClick={() => resetPwd.mutate()} loading={resetPwd.isPending} disabled={newPwd.length < 6}>Đặt lại</Button></div>
      </Modal>
    </>
  )
}

function ProjectsAdminTab() {
  const { showToast } = useToast()
  const qc = useQueryClient()
  const { data: projects = [], isLoading } = useQuery({ queryKey: ['admin-projects'], queryFn: () => projectsApi.list() })
  const [rejectTarget, setRejectTarget] = useState<number | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const invP = () => { qc.invalidateQueries({ queryKey: ['admin-projects'] }); qc.invalidateQueries({ queryKey: ['projects'] }) }
  const approve = useMutation({ mutationFn: (id: number) => projectsApi.approve(id), onSuccess: () => { invP(); showToast('Đã duyệt', 'success') }, onError: (e: Error) => showToast(e.message, 'error') })
  const reject = useMutation({ mutationFn: () => projectsApi.reject(rejectTarget!, rejectNote), onSuccess: () => { invP(); showToast('Đã từ chối', 'success'); setRejectTarget(null); setRejectNote('') }, onError: (e: Error) => showToast(e.message, 'error') })
  const del = useMutation({ mutationFn: (id: number) => projectsApi.delete(id), onSuccess: () => { invP(); showToast('Đã xóa', 'success') }, onError: (e: Error) => showToast(e.message, 'error') })
  type P = Record<string, unknown>
  return (
    <>
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border-glass)' }}>{['Tên dự án', 'Chủ sở hữu', 'Trạng thái', 'Cập nhật', 'Hành động'].map((h) => <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>{h}</th>)}</tr></thead>
            <tbody>{(projects as P[]).map((p) => (
              <tr key={String(p.id)} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{String(p.name)}</td>
                <td style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)' }}>{String(p.ownerName ?? p.username ?? '—')}</td>
                <td style={{ padding: '0.65rem 1rem' }}><span className={statusClass(String(p.status) as never)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600 }}>{statusLabel(String(p.status) as never)}</span></td>
                <td style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)' }}>{formatDateTime(String(p.updatedAt))}</td>
                <td style={{ padding: '0.65rem 1rem' }}><div style={{ display: 'flex', gap: '0.4rem' }}>
                  {String(p.status) === 'PENDING' && <><Button size="sm" variant="secondary" onClick={() => approve.mutate(Number(p.id))} loading={approve.isPending} style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}><CheckCircle size={12} /> Duyệt</Button><Button size="sm" variant="danger" onClick={() => { setRejectTarget(Number(p.id)); setRejectNote('') }} style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}><XCircle size={12} /> Từ chối</Button></>}
                  <button onClick={() => del.mutate(Number(p.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Từ chối dự án" width={380}>
        <Field label="Lý do từ chối"><textarea className="input-base" style={{ width: '100%', padding: '0.6rem 0.875rem', fontSize: '0.875rem', minHeight: 80, resize: 'vertical' }} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} /></Field>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}><Button variant="secondary" size="sm" onClick={() => setRejectTarget(null)}>Hủy</Button><Button variant="danger" size="sm" onClick={() => reject.mutate()} loading={reject.isPending}>Xác nhận</Button></div>
      </Modal>
    </>
  )
}
