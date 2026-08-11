import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import InvoiceStatusBadge from './InvoiceStatusBadge'
import type { InvoiceOut } from '@/types/billing'

function fmtAmt(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) }
function fmtDate(iso: string | null) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—' }

export default function InvoiceCard({ invoice }: { invoice: InvoiceOut }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/billing/invoices/${invoice.id}`)}
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderColor = 'var(--color-primary-300)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{invoice.invoice_number}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {invoice.customer.first_name} {invoice.customer.last_name}
          </div>
        </div>
        <InvoiceStatusBadge status={invoice.status} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}>
          {fmtAmt(invoice.total_amount)} {invoice.currency}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
          {t('billing.invoice.card.due', { date: fmtDate(invoice.due_date) })}
        </div>
      </div>
      {invoice.balance_due > 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--color-danger-600)', marginTop: 4, fontWeight: 500 }}>
          {t('billing.invoice.card.balance', { amount: fmtAmt(invoice.balance_due), currency: invoice.currency })}
        </div>
      )}
    </div>
  )
}
