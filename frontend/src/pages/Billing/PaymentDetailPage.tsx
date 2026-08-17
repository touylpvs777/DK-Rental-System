import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ChevronLeft, CheckCircle, XCircle, ArrowRightLeft, Loader2, Info } from 'lucide-react'
import { getPayment, recordPayment, confirmPayment, rejectPayment, allocatePayment, getInvoices } from '@/api/billing'
import { getCustomers } from '@/api/customers'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import PrintButton from '@/components/ui/PrintButton'
import { toast } from '@/store/toastStore'
import type { PaymentOut, InvoiceOut, PaymentCreate, PaymentMethod, PaymentConversionPrefill } from '@/types/billing'
import type { Customer } from '@/types/customer'
import { getHeaderColorClass } from '@/utils/routeHeaderColor'
import '@/styles/shared.css'
import '@/styles/detail.css'

function fmtDate(iso: string | null) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }
function fmtAmt(n: number, cur = '') { return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${cur ? ' ' + cur : ''}` }
function todayIso() { return new Date().toISOString().slice(0, 10) }

const PAY_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: 'amber', confirmed: 'green', rejected: 'red', refunded: 'gray',
}

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'check', 'credit_card', 'mobile_payment', 'other']

interface PaymentFormState {
  customer_id: number | ''
  contract_id?: number
  contract_number?: string
  payment_method: PaymentMethod
  amount: string
  currency: string
  payment_date: string
  received_date: string
  reference_number: string
  notes: string
}

function emptyPaymentForm(prefill?: PaymentConversionPrefill): PaymentFormState {
  return {
    customer_id: prefill?.customer_id ?? '',
    contract_id: prefill?.contract_id,
    contract_number: prefill?.contract_number,
    payment_method: 'cash',
    amount: prefill ? String(prefill.suggested_amount) : '',
    currency: prefill?.currency ?? 'LAK',
    payment_date: todayIso(),
    received_date: '',
    reference_number: '',
    notes: '',
  }
}

export default function PaymentDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const location = useLocation()
  const headerColorClass = getHeaderColorClass(location.pathname)
  const fromInvoice = (location.state as { fromInvoice?: PaymentConversionPrefill } | null)?.fromInvoice

  const [pay, setPay] = useState<PaymentOut | null>(null)
  const [isLoading, setIsLoading] = useState(!isNew)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [form, setForm] = useState<PaymentFormState>(() => emptyPaymentForm(fromInvoice))
  const [isSaving, setIsSaving] = useState(false)
  const setField = <K extends keyof PaymentFormState>(key: K, value: PaymentFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const [allocOpen, setAllocOpen] = useState(false)
  const [invoices, setInvoices] = useState<InvoiceOut[]>([])
  const [allocInvId, setAllocInvId] = useState<number | ''>('')
  const [allocAmt, setAllocAmt] = useState('')

  useEffect(() => {
    if (isNew) getCustomers().then(({ data }) => setCustomers(data)).catch(() => {})
  }, [isNew])

  const load = async () => {
    setIsLoading(true)
    try { setPay((await getPayment(Number(id))).data) }
    catch { setError(t('billing.payment.toast.loadFailed')) }
    finally { setIsLoading(false) }
  }
  useEffect(() => { if (!isNew) void load() }, [id])

  const onCreate = async () => {
    if (!form.customer_id) { setError(t('billing.payment.form.errors.customerRequired')); return }
    if (!form.amount || Number(form.amount) <= 0) { setError(t('billing.payment.form.errors.amountRequired')); return }
    setIsSaving(true)
    setError(null)
    try {
      const payload: PaymentCreate = {
        customer_id: Number(form.customer_id),
        contract_id: form.contract_id,
        payment_method: form.payment_method,
        amount: Number(form.amount),
        currency: form.currency || undefined,
        payment_date: form.payment_date,
        received_date: form.received_date || undefined,
        reference_number: form.reference_number || undefined,
        notes: form.notes || undefined,
      }
      const { data } = await recordPayment(payload)
      toast.success(t('billing.payment.form.createSuccess', { number: data.payment_number }))
      navigate(`/billing/payments/${data.id}`, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? t('billing.payment.form.createFailed'))
    } finally {
      setIsSaving(false)
    }
  }

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
  if (!isNew && (error || !pay)) return <div className="page-error"><AlertCircle size={16} /> {error || t('billing.payment.notFound')}</div>

  if (isNew) {
    return (
      <div>
        <div className={`page-header page-header-banner ${headerColorClass}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => navigate('/billing/payments')} style={{ padding: '6px 8px' }}>
              <ChevronLeft size={16} />
            </button>
            <h1 className="detail-name" style={{ fontSize: 20 }}>{t('billing.payment.form.title')}</h1>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary" disabled={isSaving} onClick={onCreate}>
              {isSaving ? <Loader2 size={14} className="spin" /> : null} {t('billing.payment.form.save')}
            </button>
          </div>
        </div>

        {error && <div className="page-error" style={{ marginTop: 16 }}><AlertCircle size={16} /> {error}</div>}

        {fromInvoice && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300" style={{ marginTop: 16 }}>
            <Info size={15} />
            {t('billing.payment.form.prefilledFromInvoice', { customer: fromInvoice.customer_name })}
          </div>
        )}

        <div className="doc-editor-section" style={{ marginTop: 16 }}>
          <div className="form-grid">
            <div className="form-group">
              <label>{t('billing.payment.form.customer')} <span className="required">*</span></label>
              <select value={form.customer_id} onChange={(e) => setField('customer_id', e.target.value ? Number(e.target.value) : '')}>
                <option value="">{t('billing.payment.form.customerPlaceholder')}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}{c.company ? ` — ${c.company}` : ''}
                  </option>
                ))}
              </select>
            </div>
            {form.contract_number && (
              <div className="form-group">
                <label>{t('billing.payment.fields.contract')}</label>
                <input value={form.contract_number} disabled />
              </div>
            )}
            <div className="form-group">
              <label>{t('billing.payment.fields.method')} <span className="required">*</span></label>
              <select value={form.payment_method} onChange={(e) => setField('payment_method', e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`billing.payment.method.${m}`, m)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{t('common.amount')} <span className="required">*</span></label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setField('amount', e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('billing.payment.form.currency')}</label>
              <input value={form.currency} onChange={(e) => setField('currency', e.target.value.toUpperCase())} maxLength={3} />
            </div>
            <div className="form-group">
              <label>{t('billing.payment.fields.paymentDate')} <span className="required">*</span></label>
              <input type="date" value={form.payment_date} onChange={(e) => setField('payment_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('billing.payment.fields.received')}</label>
              <input type="date" value={form.received_date} onChange={(e) => setField('received_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('billing.payment.fields.reference')}</label>
              <input value={form.reference_number} onChange={(e) => setField('reference_number', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>{t('common.notes')}</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const variant = PAY_STATUS_VARIANTS[pay!.payment_status] ?? 'gray'
  const statusLabel = t(`billing.payment.status.${pay!.payment_status}`, pay!.payment_status)
  const payDetail = pay!

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
              <h1 className="detail-name" style={{ fontSize: 20 }}>{payDetail.payment_number}</h1>
              <Badge variant={variant}>{statusLabel}</Badge>
            </div>
            <div className="detail-subtitle">
              {payDetail.customer.first_name} {payDetail.customer.last_name}
              {payDetail.customer.company ? ` — ${payDetail.customer.company}` : ''}
            </div>
          </div>
        </div>
        <div className="detail-actions">
          <PrintButton />
          {payDetail.payment_status === 'pending' && (
            <>
              <button className="btn btn-primary" disabled={busy} onClick={() => run(t('billing.payment.toast.confirmed'), () => confirmPayment(payDetail.id))}>
                <CheckCircle size={14} /> {t('common.confirm')}
              </button>
              <button className="btn btn-danger" disabled={busy} onClick={() => run(t('billing.payment.toast.rejected'), () => rejectPayment(payDetail.id))}>
                <XCircle size={14} /> {t('billing.payment.actions.reject')}
              </button>
            </>
          )}
          {payDetail.payment_status === 'confirmed' && (
            <button className="btn btn-primary" disabled={busy} onClick={openAllocate}>
              <ArrowRightLeft size={14} /> {t('billing.payment.actions.allocateToInvoice')}
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="detail-summary-grid">
        {[
          { label: t('common.amount'), value: fmtAmt(payDetail.amount, payDetail.currency) },
          { label: t('billing.payment.fields.method'), value: t(`billing.payment.method.${payDetail.payment_method}`, payDetail.payment_method) },
          { label: t('billing.payment.fields.paymentDate'), value: fmtDate(payDetail.payment_date) },
          { label: t('billing.payment.fields.received'), value: fmtDate(payDetail.received_date) },
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
          <dt>{t('billing.payment.fields.reference')}</dt><dd>{payDetail.reference_number || '—'}</dd>
          <dt>{t('common.createdAt')}</dt><dd>{fmtDate(payDetail.created_at)}</dd>
          {payDetail.creator && <><dt>{t('billing.payment.fields.createdBy')}</dt><dd>{payDetail.creator.full_name || payDetail.creator.username}</dd></>}
        </dl>
        <dl className="detail-meta">
          {payDetail.confirmed_at && <><dt>{t('billing.payment.fields.confirmedAt')}</dt><dd>{fmtDate(payDetail.confirmed_at)}</dd></>}
          {payDetail.confirmer && <><dt>{t('billing.payment.fields.confirmedBy')}</dt><dd>{payDetail.confirmer.full_name || payDetail.confirmer.username}</dd></>}
          {payDetail.contract && (
            <>
              <dt>{t('billing.payment.fields.contract')}</dt>
              <dd>
                <span style={{ cursor: 'pointer', color: 'var(--color-primary-600)' }} onClick={() => navigate(`/rental-contracts/${payDetail.contract_id}`)}>
                  {payDetail.contract.contract_number}
                </span>
              </dd>
            </>
          )}
        </dl>
      </div>

      {payDetail.notes && (
        <div className="detail-internal-note" style={{ marginTop: 20, background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
          <strong style={{ color: 'var(--color-text-muted)' }}>{t('common.notes')}</strong>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text)' }}>{payDetail.notes}</p>
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
