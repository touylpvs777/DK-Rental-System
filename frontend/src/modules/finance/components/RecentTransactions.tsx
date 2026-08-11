import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import InvoiceStatusBadge from '@/components/billing/InvoiceStatusBadge'
import PaymentStatusBadge from '@/components/billing/PaymentStatusBadge'
import { fmtAmt, fmtDateShort } from '../utils'
import type { InvoiceOut, PaymentOut } from '@/types/billing'

export function RecentInvoices({ invoices }: { invoices: InvoiceOut[] }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="mp-chart-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="mp-chart-title" style={{ marginBottom: 0 }}>{t('finance.recentTransactions.recentInvoices')}</span>
        <a className="mp-section-link" onClick={() => navigate('/billing/invoices')}>{t('finance.recentTransactions.viewAll')} <ArrowRight size={12} /></a>
      </div>
      {invoices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--color-text-muted)' }}>{t('finance.recentTransactions.noInvoicesYet')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {invoices.map((inv) => (
            <div
              key={inv.id}
              onClick={() => navigate(`/billing/invoices/${inv.id}`)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'background 0.1s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-subtle)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{inv.invoice_number}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{inv.customer.first_name} {inv.customer.last_name}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtAmt(inv.total_amount)} {inv.currency}</div>
                <InvoiceStatusBadge status={inv.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function RecentPayments({ payments }: { payments: PaymentOut[] }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="mp-chart-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="mp-chart-title" style={{ marginBottom: 0 }}>{t('finance.recentTransactions.recentPayments')}</span>
        <a className="mp-section-link" onClick={() => navigate('/billing/payments')}>{t('finance.recentTransactions.viewAll')} <ArrowRight size={12} /></a>
      </div>
      {payments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--color-text-muted)' }}>{t('finance.recentTransactions.noPaymentsYet')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {payments.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/billing/payments/${p.id}`)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'background 0.1s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-subtle)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{p.payment_number}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.customer.first_name} {p.customer.last_name} · {fmtDateShort(p.payment_date)}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-success-600)' }}>+{fmtAmt(p.amount)}</div>
                <PaymentStatusBadge status={p.payment_status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
