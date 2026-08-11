import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ChevronLeft, CheckCircle, XCircle, ArrowRightLeft } from 'lucide-react'
import { getPayment, confirmPayment, rejectPayment, allocatePayment, getInvoices } from '@/api/billing'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import PrintButton from '@/components/ui/PrintButton'
import { toast } from '@/store/toastStore'
import type { PaymentOut, InvoiceOut } from '@/types/billing'
import { getHeaderColorClass } from '@/utils/routeHeaderColor'
import '@/styles/shared.css'
import '@/styles/detail.css'

function fmtDate(iso: string | null) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }
function fmtAmt(n: number, cur = '') { return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${cur ? ' ' + cur : ''}` }

const PAY_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: 'amber', confirmed: 'green', rejected: 'red', refunded: 'gray',
}

export default function PaymentDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const headerColorClass = getHeaderColorClass(useLocation().pathname)
  const [pay, setPay] = useState<PaymentOut | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [allocOpen, setAllocOpen] = useState(false)
  const [invoices, setInvoices] = useState<InvoiceOut[]>([])
  const [allocInvId, setAllocInvId] = useState<number | ''>('')
  const [allocAmt, setAllocAmt] = useState('')

  const load = async () => {
    setIsLoading(true)
    try { setPay((await getPayment(Number(id))).data) }
    catch { setError(t('billing.payment.toast.loadFailed')) }
    finally { setIsLoading(false) }
  }
  useEffect(() => { load() }, [id])

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true)
    try { await fn(); toast.success(label); await load() }
    catch { toast.error(t('billing.payment.toast.actionFailed', { action: label })) }
    finally { setBusy(false) }
  }

  const openAllocate = async () => {
    try {
      const all: InvoiceOut[] = []
      for (const s of ['issued', 'sent', 'partially_paid', 'overdue']) {
        const { data } = await getInvoices({ status: s, page_size: 100 })
        all.push(...data.items)
      }
      setInvoices(all)
      setAllocOpen(true)
    } catch { toast.error(t('billing.payment.toast.loadInvoicesFailed')) }
  }

  const handleAllocate = () => {
    if (!allocInvId || !allocAmt || Number(allocAmt) <= 0) return
    setAllocOpen(false)
    run(t('billing.payment.toast.allocated'), () => allocatePayment(pay!.id, { invoice_id: Number(allocInvId), allocated_amount: Number(allocAmt) }))
    setAllocInvId(''); setAllocAmt('')
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('common.loading')}</div>
  if (error || !pay) return <div className="page-error"><AlertCircle size={16} /> {error || t('billing.payment.notFound')}</div>

  const variant = PAY_STATUS_VARIANTS[pay.payment_status] ?? 'gray'
  const statusLabel = t(`billing.payment.status.${pay.payment_status}`, pay.payment_status)

  return (
    <div>
      {/* Header */}
      <div className={`page-header page-header-banner ${headerColorClass}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/billing/payments')} style={{ padding: '6px 8px' }}>
            <ChevronLeft size={16} />
          </button>
          <div>
            <div className="detail-title-row">
              <h1 className="detail-name" style={{ fontSize: 20 }}>{pay.payment_number}</h1>
              <Badge variant={variant}>{statusLabel}</Badge>
            </div>
            <div className="detail-subtitle">
              {pay.customer.first_name} {pay.customer.last_name}
              {pay.customer.company ? ` — ${pay.customer.company}` : ''}
            </div>
          </div>
        </div>
        <div className="detail-actions">
          <PrintButton />
          {pay.payment_status === 'pending' && (
            <>
              <button className="btn btn-primary" disabled={busy} onClick={() => run(t('billing.payment.toast.confirmed'), () => confirmPayment(pay.id))}>
                <CheckCircle size={14} /> {t('common.confirm')}
              </button>
              <button className="btn btn-danger" disabled={busy} onClick={() => run(t('billing.payment.toast.rejected'), () => rejectPayment(pay.id))}>
                <XCircle size={14} /> {t('billing.payment.actions.reject')}
              </button>
            </>
          )}
          {pay.payment_status === 'confirmed' && (
            <button className="btn btn-primary" disabled={busy} onClick={openAllocate}>
              <ArrowRightLeft size={14} /> {t('billing.payment.actions.allocateToInvoice')}
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="detail-summary-grid">
        {[
          { label: t('common.amount'), value: fmtAmt(pay.amount, pay.currency) },
          { label: t('billing.payment.fields.method'), value: t(`billing.payment.method.${pay.payment_method}`, pay.payment_method) },
          { label: t('billing.payment.fields.paymentDate'), value: fmtDate(pay.payment_date) },
          { label: t('billing.payment.fields.received'), value: fmtDate(pay.received_date) },
        ].map((c) => (
          <div key={c.label} className="detail-summary-card">
            <div className="detail-summary-label">{c.label}</div>
            <div className="detail-summary-value">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Metadata */}
      <div className="detail-info-grid">
        <dl className="detail-meta">
          <dt>{t('billing.payment.fields.reference')}</dt><dd>{pay.reference_number || '—'}</dd>
          <dt>{t('common.createdAt')}</dt><dd>{fmtDate(pay.created_at)}</dd>
          {pay.creator && <><dt>{t('billing.payment.fields.createdBy')}</dt><dd>{pay.creator.full_name || pay.creator.username}</dd></>}
        </dl>
        <dl className="detail-meta">
          {pay.confirmed_at && <><dt>{t('billing.payment.fields.confirmedAt')}</dt><dd>{fmtDate(pay.confirmed_at)}</dd></>}
          {pay.confirmer && <><dt>{t('billing.payment.fields.confirmedBy')}</dt><dd>{pay.confirmer.full_name || pay.confirmer.username}</dd></>}
          {pay.contract && (
            <>
              <dt>{t('billing.payment.fields.contract')}</dt>
              <dd>
                <span style={{ cursor: 'pointer', color: 'var(--color-primary-600)' }} onClick={() => navigate(`/rental-contracts/${pay.contract_id}`)}>
                  {pay.contract.contract_number}
                </span>
              </dd>
            </>
          )}
        </dl>
      </div>

      {pay.notes && (
        <div className="detail-internal-note" style={{ marginTop: 20, background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
          <strong style={{ color: 'var(--color-text-muted)' }}>{t('common.notes')}</strong>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text)' }}>{pay.notes}</p>
        </div>
      )}

      {/* Allocate Modal */}
      <Modal isOpen={allocOpen} onClose={() => setAllocOpen(false)} title={t('billing.payment.allocate.title')} width={520} footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setAllocOpen(false)}>{t('common.cancel')}</button>
          <button className="btn btn-primary" disabled={!allocInvId || !allocAmt || Number(allocAmt) <= 0} onClick={handleAllocate}>{t('billing.payment.allocate.submit')}</button>
        </div>
      }>
        <div className="form-grid">
          <div className="form-group">
            <label>{t('billing.payment.allocate.invoiceLabel')} <span className="required">*</span></label>
            <select value={allocInvId} onChange={(e) => setAllocInvId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">{t('billing.payment.allocate.selectPlaceholder')}</option>
              {invoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.invoice_number} — {t('billing.payment.allocate.balance')}: {fmtAmt(inv.balance_due, inv.currency)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>{t('common.amount')} <span className="required">*</span></label>
            <input type="number" step="0.01" min="0" placeholder={t('billing.payment.allocate.amountPlaceholder')} value={allocAmt} onChange={(e) => setAllocAmt(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
