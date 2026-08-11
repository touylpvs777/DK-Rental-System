import { useNavigate } from 'react-router-dom'
import { FileText, CreditCard, Landmark, FileSpreadsheet, TrendingUp, Receipt, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function FinanceQuickNav() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const ITEMS = [
    { id: 'invoices', label: t('finance.quickNav.invoices.label'), desc: t('finance.quickNav.invoices.desc'), icon: FileText, color: 'var(--color-primary-600)', href: '/billing/invoices' },
    { id: 'payments', label: t('finance.quickNav.payments.label'), desc: t('finance.quickNav.payments.desc'), icon: CreditCard, color: 'var(--color-success-600)', href: '/billing/payments' },
    { id: 'deposits', label: t('finance.quickNav.deposits.label'), desc: t('finance.quickNav.deposits.desc'), icon: Landmark, color: 'var(--color-info-600)', href: '/billing/deposits' },
    { id: 'statements', label: t('finance.quickNav.statements.label'), desc: t('finance.quickNav.statements.desc'), icon: FileSpreadsheet, color: 'var(--color-purple-600)', href: '/billing/statements' },
    { id: 'finance', label: t('finance.quickNav.analytics.label'), desc: t('finance.quickNav.analytics.desc'), icon: TrendingUp, color: 'var(--color-warning-600)', href: '/billing/finance' },
    { id: 'recognition', label: t('finance.quickNav.revenue.label'), desc: t('finance.quickNav.revenue.desc'), icon: Receipt, color: 'var(--color-gray-500)', href: '/billing/revenue-recognitions' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
      {ITEMS.map((item) => (
        <div key={item.id} className="mp-card" onClick={() => navigate(item.href)} style={{ cursor: 'pointer' }}>
          <div className="mp-card-body" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 'var(--radius-md)',
                background: `color-mix(in srgb, ${item.color} 12%, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <item.icon size={16} style={{ color: item.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.desc}</div>
              </div>
              <ArrowRight size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
