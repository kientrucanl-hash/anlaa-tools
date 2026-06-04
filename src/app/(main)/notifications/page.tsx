'use client'

import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, ExternalLink, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/layout/PageHeader'
import { notificationsApi } from '@/lib/api/client'
import { useMarkAllRead, useMarkRead, useNotifications } from '@/lib/hooks/useNotifications'
import { formatDateTime } from '@/lib/utils'
import type { Notification } from '@/lib/types/models'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export default function NotificationsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { data, isLoading } = useNotifications()
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()
  const deleteAll = useMutation({
    mutationFn: () => notificationsApi.deleteAll(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const notifications = data?.notifications ?? []
  const unread = data?.unread ?? 0

  function openNotification(item: Notification) {
    if (!item.isRead) markRead.mutate(item.id)
    if (item.link) router.push(item.link)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Hệ thống"
        title="Thông báo"
        subtitle={`${notifications.length} thông báo · ${unread} chưa đọc`}
        actions={(
          <>
            <Button variant="secondary" size="sm" onClick={() => markAll.mutate()} disabled={unread === 0 || markAll.isPending}>
              <CheckCheck size={13} /> Đã đọc tất cả
            </Button>
            <Button variant="danger" size="sm" onClick={() => deleteAll.mutate()} disabled={notifications.length === 0 || deleteAll.isPending}>
              <Trash2 size={13} /> Xóa tất cả
            </Button>
          </>
        )}
      />

      {isLoading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Đang tải...</div>
      ) : notifications.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Bell size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Chưa có thông báo</p>
          <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>Các duyệt dự án, nháp nhà thầu và cập nhật hệ thống sẽ hiện ở đây.</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
          {notifications.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openNotification(item)}
              style={{
                width: '100%',
                border: 0,
                borderBottom: index < notifications.length - 1 ? '1px solid var(--border-glass)' : undefined,
                background: item.isRead ? 'transparent' : 'rgba(0,242,254,0.06)',
                padding: '0.85rem 1rem',
                cursor: item.link ? 'pointer' : 'default',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: '0.75rem',
                alignItems: 'start',
                textAlign: 'left',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 7, background: item.isRead ? 'var(--border-glass)' : 'var(--color-primary)' }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.86rem' }}>{item.title}</span>
                <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5, marginTop: 2 }}>{item.body}</span>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 5 }}>{formatDateTime(item.createdAt)}</span>
              </span>
              {item.link && <ExternalLink size={14} style={{ color: 'var(--text-muted)', marginTop: 4 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
