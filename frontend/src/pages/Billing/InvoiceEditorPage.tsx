import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Ban, CheckCircle, ChevronLeft, FileDown, Info, Loader2, Printer, Send, XCircle } from 'lucide-react'
import {
  getInvoice, createInvoice, updateInvoice,
  issueInvoice, sendInvoice, cancelInvoice, voidInvoice, getInvoicePdf,
} from '@/api/billing'
import { getCustomers } from '@/api/customers'
import type { Customer } from '@/types/customer'
import type { InvoiceDetail, InvoiceCreate, InvoiceUpdate, InvoiceConversionPrefill } from '@/types/billing'
import {
  invoiceHeaderSchema, INVOICE_EDITOR_DEFAULTS, type InvoiceEditorFormValues,
} from '@/schemas/invoiceEditorSchema'
import LineItemsGrid, { type GridColumn, type GridRow } from '@/components/grid/LineItemsGrid'
import InvoiceEditorHeader from '@/components/documents/InvoiceEditorHeader'
import InvoiceVehicleInfoSection from '@/components/documents/InvoiceVehicleInfoSection'
import DocumentTotalsPanel from '@/components/documents/DocumentTotalsPanel'
import InvoiceFooterSection from '@/components/documents/InvoiceFooterSection'
import InvoicePrintTemplate from '@/components/print/InvoicePrintTemplate'
import BankDetailsForm, { EMPTY_BANK_DETAILS, serializeBankDetails, type DocumentBankDetails } from '@/components/BankDetailsForm'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import PrintButton from '@/components/ui/PrintButton'
import { toast } from '@/store/toastStore'
import { useCompanyStore } from '@/store/companyStore'
import { getHeaderColorClass } from '@/utils/routeHeaderColor'
import '@/styles/shared.css'
import '@/styles/detail.css'

interface InvoiceLineRow extends GridRow {
  id: number | null
  item_code: string
  description: string
  quantity: number
  unit: string
  unit_rate: number
}

let nextRowKey = 1
function emptyRow(): InvoiceLineRow {
  return { _key: nextRowKey++, id: null, item_code: '', description: '', quantity: 1, unit: 'piece', unit_rate: 0 }
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'gray', issued: 'blue', sent: 'purple', partially_paid: 'amber',
  paid: 'green', overdue: 'red', cancelled: 'gray', voided: 'gray',
}
const STATUS_LABEL_KEYS: Record<string, string> = {
  draft: 'billing.invoice.status.draft', issued: 'billing.invoice.status.issued',
  sent: 'billing.invoice.status.sent', partially_paid: 'billing.invoice.status.partially_paid',
  paid: 'billing.invoice.status.paid', overdue: 'billing.invoice.status.overdue',
  cancelled: 'billing.invoice.status.cancelled', voided: 'billing.invoice.status.voided',
}
function statusLabelKey(status: string): string {
  return STATUS_LABEL_KEYS[status] ?? status
}

// Reference types with their own dedicated list page — rental invoices link to
// their contract directly instead (see the metadata block below).
const REFERENCE_LIST_ROUTE: Record<string, string> = {
  work_order: '/maintenance/work-orders',
}

function fmtNum(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
}

export default function InvoiceEditorPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const location = useLocation()
  const headerColorClass = getHeaderColorClass(location.pathname)

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [items, setItems] = useState<InvoiceLineRow[]>(isNew ? [emptyRow()] : [])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [bankData, setBankData] = useState<DocumentBankDetails>(EMPTY_BANK_DETAILS)

  const companyProfile = useCompanyStore((s) => s.profile)
  const fetchCompanyProfile = useCompanyStore((s) => s.fetch)
  useEffect(() => { fetchCompanyProfile() }, [fetchCompanyProfile])

  useEffect(() => {
    getCustomers().then(({ data }) => setCustomers(data)).catch(() => {})
  }, [])

  const methods = useForm<InvoiceEditorFormValues>({
    resolver: zodResolver(invoiceHeaderSchema),
    defaultValues: INVOICE_EDITOR_DEFAULTS,
  })

  // "Create Invoice" hand-off from RentalContractEditorPage — pre-fills a
  // brand-new invoice from an active contract's line items, passed via
  // router state so no extra round-trip is needed here.
  const fromContract = (location.state as { fromContract?: InvoiceConversionPrefill } | null)?.fromContract
  useEffect(() => {
    if (!isNew || !fromContract) return
    methods.reset({
      ...INVOICE_EDITOR_DEFAULTS,
      customer_id: fromContract.customer_id,
      contract_id: fromContract.contract_id,
      reference_type: 'rental',
      currency: fromContract.currency,
      tax_rate: fromContract.tax_rate,
    })
    setItems(fromContract.items.length
      ? fromContract.items.map((it) => ({
        _key: nextRowKey++, id: null, item_code: it.item_code ?? '',
        description: it.description, quantity: it.quantity, unit: it.unit ?? '', unit_rate: it.unit_rate,
      }))
      : [emptyRow()])
    // Runs once on mount only — re-applying on every render would stomp on
    // whatever the admin has since typed into the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = async () => {
    if (isNew) return
    setIsLoading(true)
    try {
      const { data } = await getInvoice(Number(id))
      setInvoice(data)
      methods.reset({
        customer_id: data.customer_id,
        contract_id: data.contract_id ?? null,
        reference_type: data.reference_type ?? 'work_order',
        reference_id: data.reference_id,
        issue_date: data.issue_date ?? '',
        due_date: data.due_date ?? '',
        tax_rate: data.tax_rate,
        discount_amount: data.discount_amount,
        currency: data.currency,
        exchange_rate: data.exchange_rate,
        bank_details: data.bank_details ?? '',
        vehicle_make: data.vehicle_make ?? '',
        vehicle_model: data.vehicle_model ?? '',
        vehicle_vin: data.vehicle_vin ?? '',
        vehicle_engine_no: data.vehicle_engine_no ?? '',
        vehicle_reg_no: data.vehicle_reg_no ?? '',
        job_number: data.job_number ?? '',
        notes: data.notes ?? '',
        internal_notes: data.internal_notes ?? '',
      })
      setItems(data.items.map((it) => ({
        _key: nextRowKey++, id: it.id, item_code: it.item_code ?? '',
        description: it.description, quantity: it.quantity, unit: it.unit ?? '', unit_rate: it.unit_rate,
      })))
    } catch {
      setError(t('billing.invoice.editor.notFoundError'))
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  const values = methods.watch()

  // Invoice items/customer/vehicle/issue-date/currency are permanently fixed
  // once created — InvoiceUpdate doesn't accept them, so there is no
  // "readOnly once submitted, editable while draft" status gating like
  // Quotation/SalesOrder have. The grid and those header fields are simply
  // locked forever once `!isNew`.
  const itemsReadOnly = !isNew

  const subtotal = useMemo(() => items.reduce((s, r) => s + r.quantity * r.unit_rate, 0), [items])
  // Invoice's tax model is a single document-level rate applied server-side —
  // not documentCalculations.ts's per-line tax%, which doesn't exist for
  // Invoice. Keep this simple math (matches billing_service.py exactly)
  // rather than routing through the per-line-tax shared util.
  const taxAmount = useMemo(() => subtotal * ((values.tax_rate || 0) / 100), [subtotal, values.tax_rate])
  const grandTotal = subtotal + taxAmount - (values.discount_amount || 0)

  const columns: GridColumn<InvoiceLineRow>[] = [
    { key: 'item_code', header: t('quotations.editor.grid.itemCode'), type: 'text', width: 110 },
    { key: 'description', header: t('common.description'), type: 'text', width: 280 },
    { key: 'quantity', header: t('quotations.editor.grid.qty'), type: 'number', width: 80, align: 'right' },
    { key: 'unit', header: t('quotations.editor.grid.unit'), type: 'text', width: 90 },
    { key: 'unit_rate', header: t('billing.invoice.form.unitPrice'), type: 'number', width: 120, align: 'right' },
    {
      key: 'amount', header: t('common.amount'), type: 'number', width: 130, align: 'right',
      compute: (row) => row.quantity * row.unit_rate,
      format: fmtNum,
    },
  ]

  const onSave = methods.handleSubmit(async (form) => {
    setError(null)
    if (isNew && !form.customer_id) { setError(t('billing.invoice.form.errors.customerRequired')); return }
    const validItems = items.filter((r) => r.description.trim())
    if (isNew && validItems.length === 0) { setError(t('billing.invoice.form.errors.itemRequired')); return }

    setIsSaving(true)
    try {
      if (isNew) {
        const payload: InvoiceCreate = {
          customer_id: form.customer_id!,
          contract_id: form.contract_id ?? undefined,
          reference_type: form.reference_type,
          reference_id: form.reference_id ?? undefined,
          issue_date: form.issue_date || undefined,
          due_date: form.due_date || undefined,
          tax_rate: form.tax_rate,
          currency: form.currency,
          exchange_rate: form.exchange_rate,
          bank_details: serializeBankDetails(bankData) || undefined,
          vehicle_make: form.vehicle_make || undefined,
          vehicle_model: form.vehicle_model || undefined,
          vehicle_vin: form.vehicle_vin || undefined,
          vehicle_engine_no: form.vehicle_engine_no || undefined,
          vehicle_reg_no: form.vehicle_reg_no || undefined,
          job_number: form.job_number || undefined,
          notes: form.notes || undefined,
          internal_notes: form.internal_notes || undefined,
          items: validItems.map((r) => ({
            item_code: r.item_code || undefined,
            description: r.description,
            unit: r.unit || undefined,
            quantity: r.quantity,
            unit_rate: r.unit_rate,
          })),
        }
        const { data } = await createInvoice(payload)
        toast.success(t('billing.invoice.editor.saveSuccess'))
        navigate(`/billing/invoices/${data.id}`, { replace: true })
      } else {
        // Only the 7 fields InvoiceUpdate actually accepts — picked
        // explicitly (never spread the whole form) so nothing else can leak
        // into the PUT body even if the form gains fields later.
        const payload: InvoiceUpdate = {
          due_date: form.due_date || undefined,
          tax_rate: form.tax_rate,
          discount_amount: form.discount_amount,
          exchange_rate: form.exchange_rate,
          bank_details: form.bank_details || undefined,
          notes: form.notes || undefined,
          internal_notes: form.internal_notes || undefined,
        }
        await updateInvoice(invoice!.id, payload)
        toast.success(t('billing.invoice.editor.saveSuccess'))
        await load()
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? t('billing.invoice.editor.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  })

  // Fetches the server-rendered (WeasyPrint) PDF as a blob and opens it in a
  // new tab — matches the endpoint's `inline` Content-Disposition, letting
  // the browser's own PDF viewer handle printing/saving.
  const handlePrintPdf = async () => {
    if (!invId) return
    setIsDownloadingPdf(true)
    try {
      const { data } = await getInvoicePdf(invId)
      const blob = new Blob([data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      toast.error(t('billing.invoice.toast.pdfFailed'))
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setIsSaving(true)
    try {
      await fn()
      toast.success(label)
      await load()
    } catch {
      toast.error(t('billing.invoice.editor.actionFailed', { action: label }))
    } finally {
      setIsSaving(false)
    }
  }

  const selectedCustomer = customers.find((c) => c.id === values.customer_id)
  const invId = invoice?.id
  const s = invoice?.status

  const printProps = {
    invoiceNumber: invoice?.invoice_number ?? t('billing.invoice.form.previewPendingNumber'),
    date: fmtDate(values.issue_date || invoice?.created_at),
    refLabel: values.reference_id ? `${values.reference_type} #${values.reference_id}` : undefined,
    company: {
      name: companyProfile?.company_name || 'DK LAO TRADING SOLE CO., LTD',
      address: companyProfile?.address,
      tel: companyProfile?.phone,
      fax: companyProfile?.fax,
      website: companyProfile?.website,
      email: companyProfile?.email,
      logoUrl: companyProfile?.logo_url,
    },
    customer: {
      name: selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}${selectedCustomer.company ? ` — ${selectedCustomer.company}` : ''}` : '—',
      tel: selectedCustomer?.phone ?? undefined,
    },
    equipment: {
      jobNumber: values.job_number || undefined,
      make: values.vehicle_make || undefined,
      model: values.vehicle_model || undefined,
      engineNo: values.vehicle_engine_no || undefined,
      vinSerial: values.vehicle_vin || undefined,
      regNo: values.vehicle_reg_no || undefined,
      terms: values.due_date ? `Due ${fmtDate(values.due_date)}` : 'Due on Receipt',
    },
    items: items.filter((r) => r.description.trim()).map((r) => ({
      itemCode: r.item_code || undefined, description: r.description, unit: r.unit || undefined,
      qty: r.quantity, price: r.unit_rate, amount: r.quantity * r.unit_rate,
    })),
    subtotal,
    vatRate: values.tax_rate || 0,
    vatAmount: taxAmount,
    total: grandTotal,
    currency: values.currency,
    totalInBaseCurrency: values.currency !== 'LAK' ? { amount: grandTotal * (values.exchange_rate || 1), currency: 'LAK' } : undefined,
    bankDetailsText: isNew ? serializeBankDetails(bankData) : values.bank_details,
    showAmountInWords: true,
    notesText: values.notes,
    notesLabel: t('billing.invoice.editor.notesLabel'),
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('common.loading')}</div>
  if (error && !invoice && !isNew) return <div className="page-error"><AlertCircle size={16} /> {error}</div>

  return (
    <FormProvider {...methods}>
      <div>
        <div className="doc-preview-hide-on-print">
          <div className={`page-header page-header-banner doc-editor-toolbar-sticky ${headerColorClass}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => navigate('/billing/invoices')} style={{ padding: '6px 8px' }}>
                <ChevronLeft size={16} />
              </button>
              <div>
                <div className="detail-title-row">
                  <h1 className="detail-name" style={{ fontSize: 20 }}>
                    {isNew ? t('billing.invoice.editor.newTitle') : invoice?.invoice_number}
                  </h1>
                  {invoice && <Badge variant={STATUS_VARIANT[invoice.status] ?? 'gray'}>{t(statusLabelKey(invoice.status), invoice.status)}</Badge>}
                </div>
              </div>
            </div>
            <div className="detail-actions">
              <button className="btn btn-ghost" onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}>
                {viewMode === 'edit' ? t('quotations.editor.printPreview') : t('quotations.editor.backToEdit')}
              </button>
              <PrintButton />
              {invoice && (
                <button className="btn btn-ghost" disabled={isDownloadingPdf} onClick={handlePrintPdf}>
                  {isDownloadingPdf ? <Loader2 size={14} className="spin" /> : <Printer size={14} />} {t('billing.invoice.actions.printPdf')}
                </button>
              )}
              <button className="btn btn-primary" onClick={() => window.print()}>
                <FileDown size={14} /> {t('common.exportPdf')}
              </button>
              {(isNew || invoice) && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => onSave()}>
                  {isSaving ? <Loader2 size={14} className="spin" /> : null} {isNew ? t('billing.invoice.editor.saveDraft') : t('common.save')}
                </button>
              )}
              {s === 'draft' && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('billing.invoice.toast.issued'), () => issueInvoice(invId!))}>
                  <CheckCircle size={14} /> {t('billing.invoice.actions.issue')}
                </button>
              )}
              {s === 'issued' && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('billing.invoice.toast.sent'), () => sendInvoice(invId!))}>
                  <Send size={14} /> {t('billing.invoice.actions.send')}
                </button>
              )}
              {(s === 'issued' || s === 'sent') && (
                <button className="btn btn-ghost" disabled={isSaving} onClick={() => runAction(t('billing.invoice.toast.voided'), () => voidInvoice(invId!))}>
                  <Ban size={14} /> {t('billing.invoice.actions.void')}
                </button>
              )}
              {invoice && !['paid', 'voided', 'cancelled'].includes(s ?? '') && (
                <button className="btn btn-danger" disabled={isSaving} onClick={() => setCancelOpen(true)}>
                  <XCircle size={14} /> {t('common.cancel')}
                </button>
              )}
            </div>
          </div>

          {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

          {isNew && fromContract && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300" style={{ marginTop: 16 }}>
              <Info size={15} />
              {t('billing.invoice.editor.prefilledFromContract', { number: fromContract.contract_number })}
            </div>
          )}

          {viewMode === 'edit' ? (
            <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
              <InvoiceEditorHeader
                documentNumber={invoice?.invoice_number ?? ''}
                statusVariant={STATUS_VARIANT[invoice?.status ?? 'draft'] ?? 'gray'}
                statusLabel={t(statusLabelKey(invoice?.status ?? 'draft'), invoice?.status ?? 'draft')}
                companyName={companyProfile?.company_name}
                companyAddress={companyProfile?.address}
                companyPhone={companyProfile?.phone}
                companyLogoUrl={companyProfile?.logo_url}
                customers={customers.map((c) => ({
                  id: c.id, label: `${c.first_name} ${c.last_name}${c.company ? ` — ${c.company}` : ''}`,
                  phone: c.phone, address: null,
                }))}
                isNew={isNew}
              />

              <InvoiceVehicleInfoSection isNew={isNew} />

              <div className="doc-editor-section">
                <h3 className="doc-editor-section-title">{t('quotations.editor.grid.title')}</h3>
                <LineItemsGrid<InvoiceLineRow>
                  columns={columns}
                  rows={items}
                  onRowsChange={setItems}
                  createEmptyRow={emptyRow}
                  readOnly={itemsReadOnly}
                  filterKey="description"
                />
              </div>

              <div className="doc-editor-section">
                <h3 className="doc-editor-section-title">{t('settings.company.bankDetails.title')}</h3>
                {isNew ? (
                  <BankDetailsForm bankData={bankData} onChange={setBankData} hideTitle />
                ) : (
                  <textarea rows={3} {...methods.register('bank_details')} />
                )}
              </div>

              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 260 }} />
                <DocumentTotalsPanel
                  subtotal={subtotal}
                  taxTotal={taxAmount}
                  grandTotal={grandTotal}
                  balanceDue={invoice?.balance_due}
                  currency={values.currency}
                  readOnly={false}
                  showBalanceDue={!isNew}
                  showRoundAmount={false}
                />
              </div>

              <InvoiceFooterSection />

              {invoice && invoice.allocations.length > 0 && (
                <div className="doc-editor-section">
                  <h3 className="doc-editor-section-title">{t('billing.invoice.allocations.title')}</h3>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead><tr><th>{t('billing.invoice.allocations.payment')}</th><th>{t('common.amount')}</th><th>{t('common.date')}</th></tr></thead>
                      <tbody>
                        {invoice.allocations.map((a) => (
                          <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/billing/payments/${a.payment_id}`)}>
                            <td className="cell-desc">{t('billing.invoice.allocations.paymentLabel', { id: a.payment_id })}</td>
                            <td className="cell-mono cell-total">{fmtNum(a.allocated_amount)} {invoice.currency}</td>
                            <td className="cell-muted">{fmtDate(a.allocated_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {invoice?.contract && (
                <div className="doc-editor-section">
                  <span style={{ color: 'var(--color-text-muted)' }}>{t('billing.invoice.meta.contract')}: </span>
                  <span style={{ cursor: 'pointer', color: 'var(--color-primary-600)' }} onClick={() => navigate(`/rental-contracts/${invoice.contract_id}`)}>
                    {invoice.contract.contract_number}
                  </span>
                </div>
              )}
              {invoice?.reference_type && REFERENCE_LIST_ROUTE[invoice.reference_type] && (
                <div className="doc-editor-section">
                  <span style={{ color: 'var(--color-text-muted)' }}>{t('billing.invoice.meta.referenceType')}: </span>
                  <Link to={REFERENCE_LIST_ROUTE[invoice.reference_type]} style={{ color: 'var(--color-primary-600)' }}>
                    {invoice.reference_type}{invoice.reference_id ? ` #${invoice.reference_id}` : ''}
                  </Link>
                </div>
              )}

              {invoice?.cancellation_reason && (
                <div className="detail-internal-note" style={{ background: 'var(--color-danger-50)', borderColor: 'var(--color-danger-300)' }}>
                  <strong style={{ color: 'var(--color-danger-700)' }}>{t('billing.invoice.detail.cancellationReason')}</strong>
                  <p style={{ margin: '4px 0 0', color: 'var(--color-danger-700)' }}>{invoice.cancellation_reason}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 16, overflow: 'auto' }}>
              <InvoicePrintTemplate {...printProps} />
            </div>
          )}
        </div>

        <div className="doc-preview">
          <InvoicePrintTemplate {...printProps} />
        </div>

        <Modal
          isOpen={cancelOpen}
          onClose={() => setCancelOpen(false)}
          title={t('billing.invoice.modal.cancel.title')}
          footer={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setCancelOpen(false)}>{t('common.close')}</button>
              <button
                className="btn btn-danger"
                disabled={!cancelReason.trim() || isSaving}
                onClick={() => {
                  setCancelOpen(false)
                  const reason = cancelReason
                  setCancelReason('')
                  runAction(t('billing.invoice.toast.cancelled'), () => cancelInvoice(invId!, reason))
                }}
              >
                {t('billing.invoice.modal.cancel.title')}
              </button>
            </div>
          }
        >
          <div className="form-grid">
            <div className="form-group">
              <label>{t('billing.invoice.modal.cancel.reasonLabel')} <span className="required">*</span></label>
              <textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder={t('billing.invoice.modal.cancel.reasonPlaceholder')} />
            </div>
          </div>
        </Modal>
      </div>
    </FormProvider>
  )
}
