import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, CheckCheck, AlertTriangle } from 'lucide-react'
import { getMyNotifications, getMyUnreadCount, markNotificationRead, markAllNotificationsRead } from '@/api/notifications'
import type { NotificationItem } from '@/types/notification'
import './NotificationCenter.css'

function useRelativeTime() {
  const { t } = useTranslation()
  return (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return t('header.justNow')
    if (mins < 60) return t('header.minutesAgo', { count: mins })
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return t('header.hoursAgo', { count: hrs })
    return t('header.daysAgo', { count: Math.floor(hrs / 24) })
  }
}

function eventLabel(eventType: string | null): string {
  if (!eventType) return ''
  return eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function NotificationCenter() {
  const { t } = useTranslation()
  const relativeTime = useRelativeTime()
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const loadUnreadCount = useCallback(() => {
    getMyUnreadCount().then(({ data }) => setUnreadCount(data.count)).catch(() => {})
  }, [])

  useEffect(() => {
    loadUnreadCount()
  }, [loadUnreadCount])

  useEffect(() => {
    if (!isOpen) return
    getMyNotifications({ limit: 10 }).then(({ data }) => setItems(data)).catch(() => {})
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false)
  }, [])

  const handleItemClick = async (item: NotificationItem) => {
    if (item.is_read) return
    try {
      await markNotificationRead(item.id)
      setItems((current) => current.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)))
      setUnreadCount((count) => Math.max(0, count - 1))
    } catch {
      // non-fatal — leave item unread, user can retry
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setItems((current) => current.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // non-fatal
    }
  }

  return (
    <div className="notification-center" ref={ref} onKeyDown={handleKeyDown}>
      <button
        className="notification-trigger"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={unreadCount > 0 ? t('header.notificationsUnread', { count: unreadCount }) : t('header.notifications')}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-badge" aria-hidden="true">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown" role="menu" aria-label={t('header.notifications')}>
          <div className="notification-header">
            <span className="notification-header-title">{t('header.notifications')}</span>
          </div>
          <div className="notification-list" role="group">
            {items.length === 0 ? (
              <div className="notification-empty" role="status">{t('header.noRecentActivity')}</div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  className={`notification-item${!item.is_read ? ' notification-item-unread' : ''}`}
                  role="menuitem"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="notification-item-icon"><AlertTriangle size={14} /></div>
                  <div className="notification-item-content">
                    <div className="notification-item-text">
                      {item.subject ?? eventLabel(item.event_type)}
                      {item.target_role && (
                        <span className="notification-item-role-badge">{t('header.adminBroadcast')}</span>
                      )}
                    </div>
                    <div className="notification-item-meta">
                      {item.message} · {relativeTime(item.created_at)}
                    </div>
                  </div>
                  {!item.is_read && <span className="notification-item-dot" aria-hidden="true" />}
                </button>
              ))
            )}
          </div>
          <button className="notification-footer" role="menuitem" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
            <CheckCheck size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {t('header.markAllRead')}
          </button>
        </div>
      )}
    </div>
  )
}
