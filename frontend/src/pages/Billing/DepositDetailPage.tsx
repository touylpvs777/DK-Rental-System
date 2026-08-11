import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { getDeposit, receiveDeposit, refundDeposit, forfeitDeposit, applyDeposit, getInvoices } from '@/api/billing'
import type { DepositOut, InvoiceOut } from '@/types/billing'
import { getHeaderColorClass } from '@/utils/routeHeaderColor'
import '@/styles/shared.css'
import '@/styles/detail.css'

function fmtDate(iso: string | null) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }
function fmtAmt(n: number, cur = 'LAK') { return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${cur}` }

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', received: '#3b82f6', partially_refunded: '#8b5cf6',
  refunded: '#10b981', forfeited: '#ef4444', applied: '#6b7280',
}
const STATUS_LABEL_KEYS: Record<string, string> = {
  pending: 'billing.deposit.status.pending', received: 'billing.deposit.status.received',
  partially_refunded: 'billing.deposit.status.partiallyRefunded', refunded: 'billing.deposit.status.refunded',
  forfeited: 'billing.deposit.status.forfeited', applied: 'billing.deposit.status.applied',
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 9999, background: `${STATUS_COLORS[status] || '#6b7280'}18`, color: STATUS_COLORS[status] || '#6b7280' }}>{label}</span>
}

export default function DepositDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const headerColorClass = getHeaderColorClass(useLocation().pathname)
  const [dep, setDep] = useState<DepositOut | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState<'receive' | 'refund' | 'forfeit' | 'apply' | null>(null)
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10))
  const [formAmount, setFormAmount] = useState('')
  const [formReason, setFormReason] = useState('')
  const [invoices, setInvoices] = useState<InvoiceOut[]>([])
  const [formInvoiceId, setFormInvoiceId] = useState<number | ''>('')

  const load = async () => {
    setIsLoading(true)
    try { setDep((await getDeposit(Number(id))).data) }
    catch { setError(t('billing.deposit.detail.loadError')) }
    finally { setIsLoading(false) }
  }
  useEffect(() => { load() }, [id])

  const action = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try { await fn(); setModal(null); await load() }
    catch { alert(t('billing.deposit.detail.actionFailed')) }
    finally { setBusy(false) }
  }

  const openApply = async () => {
    try {
      const all = [
        ...(await getInvoices({ status: 'issued', page_size: 100 })).data.items,
        ...(await getInvoices({ status: 'sent', page_size: 100 })).data.items,
        ...(await getInvoices({ status: 'partially_paid', page_size: 100 })).data.items,
        ...(await getInvoices({ status: 'overdue', page_size: 100 })).data.items,
      ]
      setInvoices(all)
      setModal('apply')
    } catch { alert(t('billing.deposit.detail.invoicesLoadError')) }
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('common.loading')}</div>
  if (error || !dep) return <div className="page-error"><AlertCircle size={16} /> {error || t('billing.deposit.detail.notFound')}</div>

  const remaining = dep.amount - dep.refund_amount - dep.forfeit_amount - dep.applied_amount
  const s = dep.deposit_status
  const statusLabel = STATUS_LABEL_KEYS[s] ? t(STATUS_LABEL_KEYS[s]) : s

  return (
    <div>
      <div className={`page-header page-header-banner ${headerColorClass}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/billing/deposits')} style={{ padding: '6px 10px' }}><ArrowLeft size={16} /></button>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{dep.deposit_number} <StatusBadge status={s} label={statusLabel} /></h1>
            <p className="page-header-sub">{dep.customer.first_name} {dep.customer.last_name} — {dep.deposit_type}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {s === 'pending' && <button className="btn btn-primary" disabled={busy} onClick={() => setModal('receive')}>{t('billing.deposit.actions.markReceived')}</button>}
          {(s === 'received' || s === 'partially_refunded') && (
            <>
              <button className="btn btn-secondary" disabled={busy} onClick={() => setModal('refund')}>{t('billing.deposit.actions.refund')}</button>
              <button className="btn btn-secondary" style={{ color: 'var(--color-danger-500)' }} disabled={busy} onClick={() => setModal('forfeit')}>{t('billing.deposit.actions.forfeit')}</button>
              <button className="btn btn-primary" disabled={busy} onClick={openApply}>{t('billing.deposit.actions.applyToInvoice')}</button>
            </>
          )}
        </div>
      </div>

      {/* Financial Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginTop: 16 }}>
        {[
          { label: t('billing.deposit.summary.amount'), value: dep.amount },
          { label: t('billing.deposit.summary.refunded'), value: dep.refund_amount },
          { label: t('billing.deposit.summary.forfeited'), value: dep.forfeit_amount },
          { label: t('billing.deposit.summary.applied'), value: dep.applied_amount },
          { label: t('billing.deposit.summary.remaining'), value: remaining },
        ].map((c) => (
          <div key={c.label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{fmtAmt(c.value, dep.currency)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 24, marginTop: 16, fontSize: 13, color: 'var(--color-text-muted)' }}>
        <span>{t('billing.deposit.detail.receivedLabel', { date: fmtDate(dep.received_date) })}</span>
        <span>{t('billing.deposit.detail.refundDateLabel', { date: fmtDate(dep.refund_date) })}</span>
        <span>{t('billing.deposit.detail.contractLabel')} <span style={{ cursor: 'pointer', color: 'var(--color-primary-500)' }} onClick={() => navigate(`/rental-contracts/${dep.contract_id}`)}>{dep.contract.contract_number}</span></span>
      </div>

      {dep.notes && (
        <div style={{ marginTop: 16, padding: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
          <strong>{t('billing.deposit.detail.notesLabel')}</strong> {dep.notes}
        </div>
      )}

      {/* Modals */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setModal(null)}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 24, width: 400, maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            {modal === 'receive' && (
              <>
                <h3>{t('billing.deposit.modal.markReceived.title')}</h3>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginTop: 12, marginBottom: 4 }}>{t('billing.deposit.modal.markReceived.receivedDateLabel')}</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 13 }} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button className="btn btn-secondary" onClick={() => setModal(null)}>{t('common.cancel')}</button>
                  <button className="btn btn-primary" disabled={busy} onClick={() => action(() => receiveDeposit(dep.id, { received_date: formDate }))}>{t('common.confirm')}</button>
                </div>
              </>
            )}
            {modal === 'refund' && (
              <>
                <h3>{t('billing.deposit.modal.refund.title')}</h3>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginTop: 12, marginBottom: 4 }}>{t('billing.deposit.modal.refund.amountLabel', { max: fmtAmt(remaining, '') })}</label>
                <input type="number" step="0.01" min="0" max={remaining} value={formAmount} onChange={(e) => setFormAmount(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 13 }} />
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginTop: 12, marginBottom: 4 }}>{t('billing.deposit.modal.refund.dateLabel')}</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 13 }} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button className="btn btn-secondary" onClick={() => setModal(null)}>{t('common.cancel')}</button>
                  <button className="btn btn-primary" disabled={busy || !formAmount || Number(formAmount) <= 0} onClick={() => action(() => refundDeposit(dep.id, { refund_amount: Number(formAmount), refund_date: formDate }))}>{t('billing.deposit.actions.refund')}</button>
                </div>
              </>
            )}
            {modal === 'forfeit' && (
              <>
                <h3>{t('billing.deposit.modal.forfeit.title')}</h3>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginTop: 12, marginBottom: 4 }}>{t('billing.deposit.modal.forfeit.amountLabel', { max: fmtAmt(remaining, '') })}</label>
                <input type="number" step="0.01" min="0" max={remaining} value={formAmount} onChange={(e) => setFormAmount(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 13 }} />
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginTop: 12, marginBottom: 4 }}>{t('billing.deposit.modal.forfeit.reasonLabel')}</label>
                <textarea value={formReason} onChange={(e) => setFormReason(e.target.value)} rows={2} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 13, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button className="btn btn-secondary" onClick={() => setModal(null)}>{t('common.cancel')}</button>
                  <button className="btn btn-primary" style={{ background: 'var(--color-danger-500)' }} disabled={busy || !formAmount || Number(formAmount) <= 0} onClick={() => action(() => forfeitDeposit(dep.id, { forfeit_amount: Number(formAmount), reason: formReason || undefined }))}>{t('billing.deposit.actions.forfeit')}</button>
                </div>
              </>
            )}
            {modal === 'apply' && (
              <>
                <h3>{t('billing.deposit.modal.apply.title')}</h3>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginTop: 12, marginBottom: 4 }}>{t('billing.deposit.modal.apply.invoiceLabel')}</label>
                <select value={formInvoiceId} onChange={(e) => setFormInvoiceId(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                  <option value="">{t('billing.deposit.modal.apply.selectInvoicePlaceholder')}</option>
                  {invoices.map((inv) => <option key={inv.id} value={inv.id}>{t('billing.deposit.modal.apply.invoiceOption', { number: inv.invoice_number, balance: inv.balance_due.toLocaleString(), currency: inv.currency })}</option>)}
                </select>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginTop: 12, marginBottom: 4 }}>{t('billing.deposit.modal.apply.amountLabel', { max: fmtAmt(remaining, '') })}</label>
                <input type="number" step="0.01" min="0" max={remaining} value={formAmount} onChange={(e) => setFormAmount(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 13 }} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button className="btn btn-secondary" onClick={() => setModal(null)}>{t('common.cancel')}</button>
                  <button className="btn btn-primary" disabled={busy || !formInvoiceId || !formAmount || Number(formAmount) <= 0} onClick={() => action(() => applyDeposit(dep.id, { apply_amount: Number(formAmount), invoice_id: Number(formInvoiceId) }))}>{t('billing.deposit.modal.apply.confirm')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
