import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Users, TrendingUp, FileText, ClipboardList, Truck, Wrench,
  CreditCard, Box, Receipt, ArrowRight,
} from 'lucide-react'

interface Activity {
  id: number
  action: string
  entity_type: string | null
  entity_id: number | null
  details: Record<string, unknown> | null
  user: { id: number; username: string; full_name: string | null } | null
  created_at: string
}

const ENTITY_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  customer:        { icon: Users,         color: 'var(--color-primary-600)', bg: 'var(--color-primary-50)' },
  lead:            { icon: TrendingUp,    color: 'var(--color-purple-600)',  bg: 'var(--color-purple-50)' },
  quotation:       { icon: FileText,      color: 'var(--color-info-600)',    bg: 'var(--color-info-50)' },
  rental_contract: { icon: ClipboardList, color: 'var(--color-warning-600)', bg: 'var(--color-warning-50)' },
  forklift:        { icon: Truck,         color: 'var(--color-success-600)', bg: 'var(--color-success-50)' },
  invoice:         { icon: Receipt,       color: 'var(--color-primary-600)', bg: 'var(--color-primary-50)' },
  payment:         { icon: CreditCard,    color: 'var(--color-success-600)', bg: 'var(--color-success-50)' },
  deposit:         { icon: CreditCard,    color: 'var(--color-info-600)',    bg: 'var(--color-info-50)' },
  work_order:      { icon: Wrench,        color: 'var(--color-warning-600)', bg: 'var(--color-warning-50)' },
  spare_part:      { icon: Box,           color: 'var(--color-gray-500)',    bg: 'var(--color-gray-50)' },
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function relativeTime(iso: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return t('header.justNow')
  if (m < 60) return t('header.minutesAgo', { count: m })
  const h = Math.floor(m / 60)
  if (h < 24) return t('header.hoursAgo', { count: h })
  const d = Math.floor(h / 24)
  return t('header.daysAgo', { count: d })
}

export function EnterpriseActivityFeedSkeleton() {
  return (
    <div className="mp-chart-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="skeleton-line" style={{ width: 120, height: 12 }} />
        <div className="skeleton-line" style={{ width: 50, height: 12 }} />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
          <div className="skeleton-line" style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton-line" style={{ width: '60%', height: 12, marginBottom: 6 }} />
            <div className="skeleton-line" style={{ width: '30%', height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function EnterpriseActivityFeed({
  activities,
  maxItems = 8,
}: {
  activities: Activity[]
  maxItems?: number
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const items = activities.slice(0, maxItems)

  return (
    <div className="mp-chart-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span className="mp-chart-title" style={{ marginBottom: 0 }}>{t('dashboard.recentActivity')}</span>
        <a className="mp-section-link" onClick={() => navigate('/activity')}>
          {t('dashboard.viewAll')} <ArrowRight size={12} />
        </a>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
          {t('dashboard.noRecentActivity')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map((act, i) => {
            const cfg = ENTITY_ICONS[act.entity_type || ''] || { icon: FileText, color: 'var(--color-gray-500)', bg: 'var(--color-gray-50)' }
            const Icon = cfg.icon
            return (
              <div
                key={act.id}
                style={{
                  display: 'flex', gap: 10, padding: '10px 4px',
                  borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : undefined,
                  transition: 'background 0.1s', borderRadius: 'var(--radius)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-subtle)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 'var(--radius-md)',
                  background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={14} style={{ color: cfg.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>
                    {formatAction(act.action)}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 1 }}>
                    {act.user?.full_name || act.user?.username || t('header.systemUser')} · {relativeTime(act.created_at, t)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
