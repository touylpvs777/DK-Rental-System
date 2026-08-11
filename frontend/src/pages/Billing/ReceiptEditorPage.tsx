import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ChevronLeft, FileDown, Loader2 } from 'lucide-react'
import {
  getReceipt, createReceipt, updateReceipt, confirmReceipt, cancelReceipt,
} from '@/api/receipt'
import { getCustomers } from '@/api/customers'
import { getInvoices } from '@/api/billing'
import type { Customer } from '@/types/customer'
import type { ReceiptDetail, ReceiptCreate, ReceiptUpdate } from '@/types/receipt'
import type { InvoiceOut } from '@/types/billing'
import {
  receiptHeaderSchema, RECEIPT_EDITOR_DEFAULTS, type ReceiptEditorFormValues,
} from '@/schemas/receiptEditorSchema'
import ReceiptEditorHeader from '@/components/documents/ReceiptEditorHeader'
import ReceiptPaymentDetailsSection from '@/components/documents/ReceiptPaymentDetailsSection'
import DocumentFooterSection from '@/components/documents/DocumentFooterSection'
import DocumentPreview from '@/components/DocumentPreview'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import PrintButton from '@/components/ui/PrintButton'
import { toast } from '@/store/toastStore'
import { useCompanyStore } from '@/store/companyStore'
import { getHeaderColorClass } from '@/utils/routeHeaderColor'
import '@/styles/shared.css'
import '@/styles/detail.css'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'gray', confirmed: 'blue', cancelled: 'gray',
}

const STATUS_LABEL_KEY: Record<string, string> = {
  draft: 'receipts.status.draft',
  confirmed: 'receipts.status.confirmed',
  cancelled: 'receipts.status.cancelled',
}
function statusLabelKey(status: string): string {
  return STATUS_LABEL_KEY[status] ?? status
}

function fmtDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
}

export default function ReceiptEditorPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const headerColorClass = getHeaderColorClass(useLocation().pathname)

  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [invoices, setInvoices] = useState<InvoiceOut[]>([])
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [printLayout, setPrintLayout] = useState<'portrait' | 'landscape'>('portrait')
  const [voidOpen, setVoidOpen] = useState(false)
  const [voidReason, setVoidReason] = useState('')

  const companyProfile = useCompanyStore((s) => s.profile)
  const fetchCompanyProfile = useCompanyStore((s) => s.fetch)
  useEffect(() => { fetchCompanyProfile() }, [fetchCompanyProfile])

  useEffect(() => {
    getCustomers().then(({ data }) => setCustomers(data)).catch(() => {})
    // Only invoices that still have an outstanding balance are worth
    // recording a receipt against.
    getInvoices({ page_size: 100 }).then(({ data }) => {
      setInvoices(data.items.filter((inv) =>
        inv.balance_due > 0 && inv.status !== 'cancelled' && inv.status !== 'voided'))
    }).catch(() => {})
  }, [])

  const methods = useForm<ReceiptEditorFormValues>({
    resolver: zodResolver(receiptHeaderSchema),
    defaultValues: RECEIPT_EDITOR_DEFAULTS,
  })

  const load = async () => {
    if (isNew) return
    setIsLoading(true)
    try {
      const { data } = await getReceipt(Number(id))
      setReceipt(data)
      methods.reset({
        invoice_id: data.invoice?.id ?? null,
        customer_id: data.customer?.id ?? null,
        assigned_to: data.assigned_user?.id ?? null,
        payment_date: data.payment_date ?? '',
        payment_method: data.payment_method,
        bank_account: data.bank_account ?? '',
        reference_number: data.reference_number ?? '',
        amount_received: data.amount_received,
        currency: data.currency,
        exchange_rate: data.exchange_rate,
        customer_reference: data.customer_reference ?? '',
        notes: data.notes ?? '',
        internal_notes: data.internal_notes ?? '',
        terms_conditions: data.terms_conditions ?? '',
      })
    } catch {
      setError(t('receipts.editor.notFoundError'))
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  const values = methods.watch()
  const isDraft = isNew || receipt?.status === 'draft'
  const readOnly = !isDraft

  // Auto-pull the invoice's outstanding balance into Amount Received the
  // first time an invoice is picked on a new receipt, so the user only has
  // to override it if the payment doesn't fully settle the balance.
  useEffect(() => {
    if (isNew && values.invoice_id) {
      const inv = invoices.find((i) => i.id === values.invoice_id)
      if (inv && !values.amount_received) {
        methods.setValue('amount_received', inv.balance_due)
        methods.setValue('currency', inv.currency)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.invoice_id])

  const selectedInvoice = invoices.find((i) => i.id === values.invoice_id)
    ?? (receipt?.invoice ? { id: receipt.invoice.id, balance_due: receipt.invoice.balance_due, currency: receipt.invoice.currency } : undefined)

  const onSave = methods.handleSubmit(async (form) => {
    setIsSaving(true)
    setError(null)
    try {
      let rId = receipt?.id
      if (isNew) {
        if (!form.invoice_id) {
          setError(t('receipts.editor.invoiceRequired'))
          setIsSaving(false)
          return
        }
        const payload: ReceiptCreate = {
          invoice_id: form.invoice_id,
          customer_id: form.customer_id || null,
          assigned_to: form.assigned_to || null,
          payment_date: form.payment_date || undefined,
          payment_method: form.payment_method,
          bank_account: form.bank_account || undefined,
          reference_number: form.reference_number || undefined,
          amount_received: form.amount_received,
          currency: form.currency,
          exchange_rate: form.exchange_rate,
          customer_reference: form.customer_reference || undefined,
          terms_conditions: form.terms_conditions || undefined,
          notes: form.notes || undefined,
          internal_notes: form.internal_notes || undefined,
        }
        let created
        try {
          created = await createReceipt(payload)
        } catch (err: unknown) {
          const status = (err as { response?: { status?: number } })?.response?.status
          if (status === 409) {
            created = await createReceipt(payload)
          } else {
            throw err
          }
        }
        rId = created.data.id
      } else {
        const payload: ReceiptUpdate = {
          customer_id: form.customer_id || null,
          assigned_to: form.assigned_to || null,
          payment_date: form.payment_date || undefined,
          payment_method: form.payment_method,
          bank_account: form.bank_account,
          reference_number: form.reference_number,
          amount_received: form.amount_received,
          customer_reference: form.customer_reference,
          terms_conditions: form.terms_conditions,
          notes: form.notes,
          internal_notes: form.internal_notes,
        }
        await updateReceipt(rId!, payload)
      }

      toast.success(t('receipts.editor.saveSuccess'))
      if (isNew) {
        navigate(`/billing/receipts/${rId}`, { replace: true })
      } else {
        await load()
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? t('receipts.editor.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  })

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setIsSaving(true)
    try {
      await fn()
      toast.success(label)
      await load()
    } catch {
      toast.error(t('receipts.editor.actionFailed', { action: label }))
    } finally {
      setIsSaving(false)
    }
  }

  const actions = receipt?.available_actions ?? []
  const rId = receipt?.id

  const selectedCustomer = customers.find((c) => c.id === values.customer_id)

  const previewProps = {
    docType: 'receipt' as const,
    documentNumber: receipt?.receipt_number ?? '',
    date: fmtDate(receipt?.created_at),
    companyName: companyProfile?.company_name,
    companyAddress: companyProfile?.address,
    companyPhone: companyProfile?.phone,
    partyLabel: t('documentPreview.customerDetails'),
    partyName: selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : '—',
    partyContact: selectedCustomer?.phone ?? undefined,
    vehicle: receipt ? {
      make: receipt.vehicle_make ?? undefined, model: receipt.vehicle_model ?? undefined,
      vin: receipt.vehicle_vin ?? undefined, engineNo: receipt.vehicle_engine_no ?? undefined,
      regNo: receipt.vehicle_reg_no ?? undefined, jobNumber: receipt.job_number ?? undefined,
    } : undefined,
    items: [{
      description: receipt
        ? t('receipts.editor.paymentAgainstInvoice', { number: receipt.invoice?.invoice_number ?? '' })
        : t('receipts.editor.title'),
      qty: 1,
      unitPrice: values.amount_received || 0,
      total: values.amount_received || 0,
    }],
    subtotal: values.amount_received || 0,
    taxRate: 0,
    taxAmount: 0,
    grandTotal: values.amount_received || 0,
    currency: values.currency,
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('common.loading')}</div>
  if (error && !receipt && !isNew) return <div className="page-error"><AlertCircle size={16} /> {error}</div>

  return (
    <FormProvider {...methods}>
      <div>
        <div className="doc-preview-hide-on-print">
          <div className={`page-header page-header-banner ${headerColorClass}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => navigate('/billing/receipts')} style={{ padding: '6px 8px' }}>
                <ChevronLeft size={16} />
              </button>
              <div>
                <div className="detail-title-row">
                  <h1 className="detail-name" style={{ fontSize: 20 }}>
                    {isNew ? t('receipts.editor.newTitle') : receipt?.receipt_number}
                  </h1>
                  {receipt && <Badge variant={STATUS_VARIANT[receipt.status] ?? 'gray'}>{t(statusLabelKey(receipt.status), receipt.status)}</Badge>}
                </div>
              </div>
            </div>
            <div className="detail-actions">
              <button className="btn btn-ghost" onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}>
                {viewMode === 'edit' ? t('quotations.editor.printPreview') : t('quotations.editor.backToEdit')}
              </button>
              {viewMode === 'preview' && (
                <select className="filter-select" value={printLayout} onChange={(e) => setPrintLayout(e.target.value as 'portrait' | 'landscape')}>
                  <option value="portrait">{t('quotations.editor.portrait')}</option>
                  <option value="landscape">{t('quotations.editor.landscape')}</option>
                </select>
              )}
              <PrintButton />
              <button className="btn btn-primary" onClick={() => window.print()}>
                <FileDown size={14} /> {t('common.exportPdf')}
              </button>
              {isDraft && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => onSave()}>
                  {isSaving ? <Loader2 size={14} className="spin" /> : null} {t('receipts.editor.saveDraft')}
                </button>
              )}
              {rId && actions.includes('confirm') && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('receipts.editor.actions.confirmed'), () => confirmReceipt(rId))}>
                  {t('receipts.editor.actions.confirm')}
                </button>
              )}
              {rId && actions.includes('cancel') && (
                <button className="btn btn-danger" disabled={isSaving} onClick={() => setVoidOpen(true)}>
                  {t('receipts.editor.actions.void')}
                </button>
              )}
            </div>
          </div>

          {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

          {viewMode === 'edit' ? (
            <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
              <ReceiptEditorHeader
                documentNumber={receipt?.receipt_number ?? ''}
                documentNumberLabel={t('receipts.editor.receiptNumber')}
                statusVariant={STATUS_VARIANT[receipt?.status ?? 'draft'] ?? 'gray'}
                statusLabel={t(statusLabelKey(receipt?.status ?? 'draft'), receipt?.status ?? 'draft')}
                companyName={companyProfile?.company_name}
                companyAddress={companyProfile?.address}
                companyPhone={companyProfile?.phone}
                companyLogoUrl={companyProfile?.logo_url}
                customers={customers.map((c) => ({
                  id: c.id, label: `${c.first_name} ${c.last_name}${c.company ? ` — ${c.company}` : ''}`,
                  phone: c.phone,
                }))}
                invoices={invoices.map((inv) => ({ id: inv.id, label: `${inv.invoice_number} — ${inv.balance_due.toLocaleString()} ${inv.currency} due` }))}
                assignedUserName={receipt?.assigned_user?.full_name ?? undefined}
                readOnly={readOnly}
                invoiceLocked={!isNew}
              />

              <ReceiptPaymentDetailsSection
                readOnly={readOnly}
                currency={values.currency}
                invoiceBalanceDue={selectedInvoice?.balance_due ?? null}
              />

              <DocumentFooterSection
                readOnly={readOnly}
                issuedByName={receipt?.assigned_user?.full_name ?? undefined}
              />
            </div>
          ) : (
            <div style={{ marginTop: 16, overflow: 'auto' }}>
              <DocumentPreview {...previewProps} layout={printLayout} />
            </div>
          )}
        </div>

        <div className="doc-preview">
          <DocumentPreview {...previewProps} layout={printLayout} />
        </div>

        <Modal
          isOpen={voidOpen}
          onClose={() => setVoidOpen(false)}
          title={t('receipts.editor.actions.void')}
          footer={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setVoidOpen(false)}>{t('common.close')}</button>
              <button
                className="btn btn-danger"
                disabled={!voidReason.trim() || isSaving}
                onClick={() => {
                  setVoidOpen(false)
                  const reason = voidReason
                  setVoidReason('')
                  runAction(t('receipts.editor.actions.voided'), () => cancelReceipt(rId!, reason))
                }}
              >
                {t('receipts.editor.actions.void')}
              </button>
            </div>
          }
        >
          <div className="form-grid">
            <div className="form-group">
              <label>{t('quotations.editor.voidReasonLabel')} <span className="required">*</span></label>
              <textarea rows={3} value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
            </div>
          </div>
        </Modal>
      </div>
    </FormProvider>
  )
}
