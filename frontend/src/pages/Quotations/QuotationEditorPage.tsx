import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowRightCircle, ChevronLeft, FileDown, FileSpreadsheet, Loader2 } from 'lucide-react'
import {
  getQuotation, createQuotation, updateQuotation, bulkReplaceItems,
  submitQuotation, approveQuotation, rejectQuotation, sendQuotation,
  acceptQuotation, declineQuotation, cancelQuotation, reactivateQuotation,
} from '@/api/quotation'
import { getCustomers } from '@/api/customers'
import type { Customer } from '@/types/customer'
import type {
  QuotationDetail, QuotationCreate, QuotationUpdate, QuotationItemBulkItem, QuotationType,
} from '@/types/quotation'
import { quotationHeaderSchema, QUOTATION_EDITOR_DEFAULTS, type QuotationEditorFormValues } from '@/schemas/quotationEditorSchema'
import type { SalesOrderConversionPrefill } from '@/types/salesOrder'
import LineItemsGrid, { type GridColumn, type GridRow } from '@/components/grid/LineItemsGrid'
import DocumentEditorHeader from '@/components/documents/DocumentEditorHeader'
import VehicleInfoSection from '@/components/documents/VehicleInfoSection'
import DocumentTotalsPanel from '@/components/documents/DocumentTotalsPanel'
import DocumentFooterSection from '@/components/documents/DocumentFooterSection'
import DocumentPreview from '@/components/DocumentPreview'
import { calcDocumentTotals, calcDiscountAmount, calcLineTaxAmount, calcLineGrandTotal } from '@/utils/documentCalculations'
import { exportDocumentToExcel } from '@/utils/exportExcel'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import PrintButton from '@/components/ui/PrintButton'
import { toast } from '@/store/toastStore'
import { useCompanyStore } from '@/store/companyStore'
import { getHeaderColorClass } from '@/utils/routeHeaderColor'
import '@/styles/shared.css'
import '@/styles/detail.css'

interface QuotationLineRow extends GridRow {
  id: number | null
  item_type: string
  item_code: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  discount_percent: number
  tax_percent: number
}

let nextRowKey = 1
function emptyRow(defaultTaxRate: number): QuotationLineRow {
  return {
    _key: nextRowKey++, id: null, item_type: 'custom', item_code: '', description: '',
    quantity: 1, unit: 'unit', unit_price: 0, discount_percent: 0, tax_percent: defaultTaxRate,
  }
}

const ITEM_TYPE_OPTIONS = [
  { value: 'custom', label: 'Custom' },
  { value: 'forklift_rental', label: 'Forklift Rental' },
  { value: 'forklift_sale', label: 'Forklift Sale' },
  { value: 'service', label: 'Service' },
  { value: 'spare_part', label: 'Spare Part' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'insurance', label: 'Insurance' },
]

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'gray', under_review: 'amber', approved: 'blue', revision: 'amber',
  sent: 'purple', accepted: 'green', rejected: 'red', expired: 'gray',
  converted: 'green', cancelled: 'gray',
}

// `quotations.status` uses camelCase keys (pre-existing, shared with the old
// detail page) while the backend returns snake_case — map between them here
// rather than duplicating the translations under new snake_case keys.
const STATUS_LABEL_KEY: Record<string, string> = {
  draft: 'quotations.status.draft',
  under_review: 'quotations.status.underReview',
  approved: 'quotations.status.approved',
  revision: 'quotations.status.revision',
  sent: 'quotations.status.sent',
  accepted: 'quotations.status.accepted',
  rejected: 'quotations.status.rejected',
  expired: 'quotations.status.expired',
  converted: 'quotations.status.converted',
  cancelled: 'quotations.status.cancelled',
}
function statusLabelKey(status: string): string {
  return STATUS_LABEL_KEY[status] ?? status
}

function fmtNum(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
}

export default function QuotationEditorPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const headerColorClass = getHeaderColorClass(useLocation().pathname)

  const [quotation, setQuotation] = useState<QuotationDetail | null>(null)
  const [items, setItems] = useState<QuotationLineRow[]>(isNew ? [emptyRow(0)] : [])
  const [customers, setCustomers] = useState<Customer[]>([])
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
  }, [])

  const methods = useForm<QuotationEditorFormValues>({
    resolver: zodResolver(quotationHeaderSchema),
    defaultValues: QUOTATION_EDITOR_DEFAULTS,
  })

  const load = async () => {
    if (isNew) return
    setIsLoading(true)
    try {
      const { data } = await getQuotation(Number(id))
      setQuotation(data)
      methods.reset({
        quotation_type: data.quotation_type as QuotationEditorFormValues['quotation_type'],
        title: data.title,
        customer_id: data.customer?.id ?? null,
        assigned_to: data.assigned_user?.id ?? null,
        contact_name: data.contact_name ?? '',
        contact_email: data.contact_email ?? '',
        contact_phone: data.contact_phone ?? '',
        tax_rate: data.tax_rate,
        discount_amount: data.discount_amount,
        round_amount: data.round_amount,
        currency: data.currency,
        exchange_rate: data.exchange_rate,
        valid_from: data.valid_from ?? '',
        valid_until: data.valid_until ?? '',
        customer_reference: data.customer_reference ?? '',
        bank_details: data.bank_details ?? '',
        job_number: data.job_number ?? '',
        machine_type: data.machine_type ?? '',
        vehicle_make: data.vehicle_make ?? '',
        vehicle_model: data.vehicle_model ?? '',
        vehicle_vin: data.vehicle_vin ?? '',
        vehicle_engine_no: data.vehicle_engine_no ?? '',
        hour_meter: data.hour_meter,
        vehicle_reg_no: data.vehicle_reg_no ?? '',
        location: data.location ?? '',
        notes: data.notes ?? '',
        internal_notes: data.internal_notes ?? '',
      })
      setItems(data.items.length
        ? data.items.map((it) => ({
          _key: nextRowKey++, id: it.id, item_type: it.item_type, item_code: it.item_code ?? '',
          description: it.description, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price,
          discount_percent: it.discount_percent, tax_percent: it.tax_percent,
        }))
        : [emptyRow(data.tax_rate)])
    } catch {
      setError(t('quotations.detail.notFoundError'))
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  const values = methods.watch()
  const isDraft = isNew || quotation?.status === 'draft'
  const readOnly = !isDraft

  const calcInputs = useMemo(() => items.map((r) => ({
    quantity: r.quantity, unitPrice: r.unit_price, discountPercent: r.discount_percent, taxPercent: r.tax_percent,
  })), [items])
  const totals = useMemo(
    () => calcDocumentTotals(calcInputs, values.discount_amount || 0, values.round_amount || 0, 0),
    [calcInputs, values.discount_amount, values.round_amount],
  )

  const columns: GridColumn<QuotationLineRow>[] = [
    { key: 'item_type', header: t('quotations.editor.grid.type'), type: 'select', width: 130, options: ITEM_TYPE_OPTIONS },
    { key: 'item_code', header: t('quotations.editor.grid.itemCode'), type: 'text', width: 110 },
    { key: 'description', header: t('common.description'), type: 'text', width: 220 },
    { key: 'quantity', header: t('quotations.editor.grid.qty'), type: 'number', width: 70, align: 'right' },
    { key: 'unit', header: t('quotations.editor.grid.unit'), type: 'text', width: 80 },
    { key: 'unit_price', header: t('quotations.editor.grid.unitPrice'), type: 'number', width: 100, align: 'right' },
    { key: 'discount_percent', header: t('quotations.editor.grid.discountPercent'), type: 'number', width: 80, align: 'right' },
    {
      key: 'discount_amount', header: t('quotations.editor.grid.discountAmount'), type: 'number', width: 110, align: 'right',
      compute: (row) => calcDiscountAmount({ quantity: row.quantity, unitPrice: row.unit_price, discountPercent: row.discount_percent, taxPercent: row.tax_percent }),
      format: fmtNum,
    },
    { key: 'tax_percent', header: t('quotations.editor.grid.taxPercent'), type: 'number', width: 70, align: 'right' },
    {
      key: 'tax_amount', header: t('quotations.editor.grid.taxAmount'), type: 'number', width: 100, align: 'right',
      compute: (row) => calcLineTaxAmount({ quantity: row.quantity, unitPrice: row.unit_price, discountPercent: row.discount_percent, taxPercent: row.tax_percent }),
      format: fmtNum,
    },
    {
      key: 'total', header: t('common.total'), type: 'number', width: 110, align: 'right',
      compute: (row) => calcLineGrandTotal({ quantity: row.quantity, unitPrice: row.unit_price, discountPercent: row.discount_percent, taxPercent: row.tax_percent }),
      format: fmtNum,
    },
  ]

  const buildBulkItems = (): QuotationItemBulkItem[] => items.map((r) => ({
    id: r.id ?? undefined,
    item_type: r.item_type as QuotationItemBulkItem['item_type'],
    item_code: r.item_code || undefined,
    description: r.description,
    quantity: r.quantity,
    unit: r.unit,
    unit_price: r.unit_price,
    discount_percent: r.discount_percent,
    tax_percent: r.tax_percent,
  }))

  const onSave = methods.handleSubmit(async (form) => {
    setIsSaving(true)
    setError(null)
    try {
      let qId = quotation?.id
      if (isNew) {
        const payload: QuotationCreate = {
          quotation_type: form.quotation_type as QuotationType,
          title: form.title,
          customer_id: form.customer_id || null,
          assigned_to: form.assigned_to || null,
          contact_name: form.contact_name || undefined,
          contact_email: form.contact_email || undefined,
          contact_phone: form.contact_phone || undefined,
          tax_rate: form.tax_rate,
          currency: form.currency,
          exchange_rate: form.exchange_rate,
          bank_details: form.bank_details || undefined,
          valid_from: form.valid_from || undefined,
          valid_until: form.valid_until || undefined,
          customer_reference: form.customer_reference || undefined,
          vehicle_make: form.vehicle_make || undefined,
          vehicle_model: form.vehicle_model || undefined,
          vehicle_vin: form.vehicle_vin || undefined,
          vehicle_engine_no: form.vehicle_engine_no || undefined,
          vehicle_reg_no: form.vehicle_reg_no || undefined,
          job_number: form.job_number || undefined,
          machine_type: form.machine_type || undefined,
          hour_meter: form.hour_meter ?? undefined,
          location: form.location || undefined,
          round_amount: form.round_amount,
          terms_conditions: form.terms_conditions || undefined,
          notes: form.notes || undefined,
          internal_notes: form.internal_notes || undefined,
        }
        // The backend's quotation-number generator can lose a race under
        // concurrent creates (check-then-insert, no reservation) and returns
        // a 409 explicitly asking the caller to retry — so retry once here.
        let created
        try {
          created = await createQuotation(payload)
        } catch (err: unknown) {
          const status = (err as { response?: { status?: number } })?.response?.status
          if (status === 409) {
            created = await createQuotation(payload)
          } else {
            throw err
          }
        }
        qId = created.data.id
      } else {
        const payload: QuotationUpdate = {
          title: form.title,
          customer_id: form.customer_id || null,
          assigned_to: form.assigned_to || null,
          contact_name: form.contact_name,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          tax_rate: form.tax_rate,
          discount_amount: form.discount_amount,
          round_amount: form.round_amount,
          currency: form.currency,
          exchange_rate: form.exchange_rate,
          bank_details: form.bank_details,
          valid_from: form.valid_from || undefined,
          valid_until: form.valid_until || undefined,
          customer_reference: form.customer_reference,
          vehicle_make: form.vehicle_make,
          vehicle_model: form.vehicle_model,
          vehicle_vin: form.vehicle_vin,
          vehicle_engine_no: form.vehicle_engine_no,
          vehicle_reg_no: form.vehicle_reg_no,
          job_number: form.job_number,
          machine_type: form.machine_type,
          hour_meter: form.hour_meter,
          location: form.location,
          terms_conditions: form.terms_conditions,
          notes: form.notes,
          internal_notes: form.internal_notes,
        }
        await updateQuotation(qId!, payload)
      }

      const validItems = buildBulkItems().filter((it) => it.description.trim())
      if (validItems.length) {
        await bulkReplaceItems(qId!, validItems)
      }

      toast.success(t('quotations.editor.saveSuccess'))
      if (isNew) {
        navigate(`/quotations/${qId}`, { replace: true })
      } else {
        await load()
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? t('quotations.editor.saveFailed'))
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
      toast.error(t('quotations.detail.actionFailed', { action: label }))
    } finally {
      setIsSaving(false)
    }
  }

  const actions = quotation?.available_actions ?? []
  const qId = quotation?.id

  const handleExportExcel = () => {
    exportDocumentToExcel({
      documentTitle: values.title || t('quotations.editor.title'),
      documentNumber: quotation?.quotation_number ?? '',
      date: fmtDate(quotation?.created_at),
      customerName: customers.find((c) => c.id === values.customer_id)
        ? `${customers.find((c) => c.id === values.customer_id)!.first_name} ${customers.find((c) => c.id === values.customer_id)!.last_name}`
        : undefined,
      currency: values.currency,
      items: items.filter((r) => r.description.trim()).map((r) => ({
        itemCode: r.item_code, description: r.description, qty: r.quantity, unit: r.unit,
        unitPrice: r.unit_price,
        discountPercent: r.discount_percent,
        discountAmount: calcDiscountAmount({ quantity: r.quantity, unitPrice: r.unit_price, discountPercent: r.discount_percent, taxPercent: r.tax_percent }),
        taxPercent: r.tax_percent,
        taxAmount: calcLineTaxAmount({ quantity: r.quantity, unitPrice: r.unit_price, discountPercent: r.discount_percent, taxPercent: r.tax_percent }),
        total: calcLineGrandTotal({ quantity: r.quantity, unitPrice: r.unit_price, discountPercent: r.discount_percent, taxPercent: r.tax_percent }),
      })),
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
    })
  }

  const handleConvertToSalesOrder = () => {
    if (!quotation) return
    const prefill: SalesOrderConversionPrefill = {
      quotationBrief: { id: quotation.id, quotation_number: quotation.quotation_number, title: quotation.title },
      header: {
        title: quotation.title,
        customer_id: values.customer_id ?? null,
        assigned_to: values.assigned_to ?? null,
        contact_name: values.contact_name || '',
        contact_email: values.contact_email || '',
        contact_phone: values.contact_phone || '',
        tax_rate: values.tax_rate,
        discount_amount: values.discount_amount,
        round_amount: values.round_amount,
        currency: values.currency,
        exchange_rate: values.exchange_rate,
        customer_reference: values.customer_reference || '',
        bank_details: values.bank_details || '',
        job_number: values.job_number || '',
        machine_type: values.machine_type || '',
        vehicle_make: values.vehicle_make || '',
        vehicle_model: values.vehicle_model || '',
        vehicle_vin: values.vehicle_vin || '',
        vehicle_engine_no: values.vehicle_engine_no || '',
        hour_meter: values.hour_meter ?? null,
        vehicle_reg_no: values.vehicle_reg_no || '',
        location: values.location || '',
        notes: values.notes || '',
        internal_notes: values.internal_notes || '',
        terms_conditions: values.terms_conditions || '',
      },
      items: items.filter((r) => r.description.trim()).map((r) => ({
        item_code: r.item_code,
        description: r.description,
        quantity: r.quantity,
        unit: r.unit,
        unit_price: r.unit_price,
        discount_percent: r.discount_percent,
        tax_percent: r.tax_percent,
      })),
    }
    navigate('/sales-orders/new', { state: { fromQuotation: prefill } })
  }

  const selectedCustomer = customers.find((c) => c.id === values.customer_id)

  const previewProps = {
    docType: 'quotation' as const,
    documentNumber: quotation?.quotation_number ?? '',
    date: fmtDate(quotation?.created_at),
    companyName: companyProfile?.company_name,
    companyAddress: companyProfile?.address,
    companyPhone: companyProfile?.phone,
    partyLabel: t('documentPreview.customerDetails'),
    partyName: selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : (values.contact_name || '—'),
    partyContact: selectedCustomer?.phone ?? values.contact_phone,
    vehicle: {
      make: values.vehicle_make, model: values.vehicle_model, vin: values.vehicle_vin,
      engineNo: values.vehicle_engine_no, regNo: values.vehicle_reg_no, jobNumber: values.job_number,
      machineType: values.machine_type, hourMeter: values.hour_meter, location: values.location,
    },
    items: items.filter((r) => r.description.trim()).map((r) => ({
      itemCode: r.item_code, description: r.description, qty: r.quantity, unit: r.unit,
      unitPrice: r.unit_price,
      total: calcLineGrandTotal({ quantity: r.quantity, unitPrice: r.unit_price, discountPercent: r.discount_percent, taxPercent: r.tax_percent }),
    })),
    subtotal: totals.subtotal,
    taxRate: values.tax_rate,
    taxAmount: totals.taxTotal,
    grandTotal: totals.grandTotal,
    currency: values.currency,
    showBankDetails: true,
    bankDetailsText: values.bank_details,
    showAmountInWords: true,
    termsText: values.terms_conditions,
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('common.loading')}</div>
  if (error && !quotation && !isNew) return <div className="page-error"><AlertCircle size={16} /> {error}</div>

  return (
    <FormProvider {...methods}>
      <div>
        <div className="doc-preview-hide-on-print">
          <div className={`page-header page-header-banner doc-editor-toolbar-sticky ${headerColorClass}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => navigate('/quotations')} style={{ padding: '6px 8px' }}>
                <ChevronLeft size={16} />
              </button>
              <div>
                <div className="detail-title-row">
                  <h1 className="detail-name" style={{ fontSize: 20 }}>
                    {isNew ? t('quotations.editor.newTitle') : quotation?.quotation_number}
                  </h1>
                  {quotation && <Badge variant={STATUS_VARIANT[quotation.status] ?? 'gray'}>{t(statusLabelKey(quotation.status), quotation.status)}</Badge>}
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
              <button className="btn btn-ghost" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} /> {t('quotations.editor.exportExcel')}
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <FileDown size={14} /> {t('common.exportPdf')}
              </button>
              {isDraft && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => onSave()}>
                  {isSaving ? <Loader2 size={14} className="spin" /> : null} {t('quotations.editor.saveDraft')}
                </button>
              )}
              {qId && actions.includes('submit') && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('quotations.detail.toasts.submitted'), () => submitQuotation(qId))}>
                  {t('quotations.detail.submit')}
                </button>
              )}
              {qId && actions.includes('approve') && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('quotations.editor.actions.approved'), () => approveQuotation(qId))}>
                  {t('quotations.detail.approve')}
                </button>
              )}
              {quotation?.status === 'approved' && (
                <button className="btn btn-primary" disabled={isSaving} onClick={handleConvertToSalesOrder}>
                  <ArrowRightCircle size={14} /> {t('quotations.editor.actions.convertToSalesOrder')}
                </button>
              )}
              {qId && actions.includes('reject') && (
                <button className="btn btn-ghost" disabled={isSaving} onClick={() => runAction(t('quotations.detail.toasts.revisionRequested'), () => rejectQuotation(qId))}>
                  {t('quotations.detail.requestRevision')}
                </button>
              )}
              {qId && actions.includes('send') && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('quotations.detail.toasts.sent'), () => sendQuotation(qId))}>
                  {t('quotations.detail.sendToCustomer')}
                </button>
              )}
              {qId && actions.includes('accept') && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('quotations.detail.toasts.markedAccepted'), () => acceptQuotation(qId))}>
                  {t('quotations.detail.markAccepted')}
                </button>
              )}
              {qId && actions.includes('decline') && (
                <button className="btn btn-ghost" disabled={isSaving} onClick={() => runAction(t('quotations.detail.toasts.markedRejected'), () => declineQuotation(qId))}>
                  {t('quotations.detail.markRejected')}
                </button>
              )}
              {qId && actions.includes('reactivate') && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('quotations.detail.toasts.reactivated'), () => reactivateQuotation(qId))}>
                  {t('quotations.detail.reactivate')}
                </button>
              )}
              {qId && actions.includes('cancel') && (
                <button className="btn btn-danger" disabled={isSaving} onClick={() => setVoidOpen(true)}>
                  {t('quotations.editor.actions.void')}
                </button>
              )}
            </div>
          </div>

          {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

          {viewMode === 'edit' ? (
            <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
              <DocumentEditorHeader
                documentNumber={quotation?.quotation_number ?? ''}
                documentNumberLabel={t('quotations.editor.header.quotationNo')}
                statusVariant={STATUS_VARIANT[quotation?.status ?? 'draft'] ?? 'gray'}
                statusLabel={t(statusLabelKey(quotation?.status ?? 'draft'), quotation?.status ?? 'draft')}
                companyName={companyProfile?.company_name}
                companyAddress={companyProfile?.address}
                companyPhone={companyProfile?.phone}
                companyLogoUrl={companyProfile?.logo_url}
                customers={customers.map((c) => ({
                  id: c.id, label: `${c.first_name} ${c.last_name}${c.company ? ` — ${c.company}` : ''}`,
                  phone: c.phone, address: null,
                }))}
                assignedUserName={quotation?.assigned_user?.full_name ?? undefined}
                readOnly={readOnly}
              />

              <VehicleInfoSection readOnly={readOnly} />

              <div className="doc-editor-section">
                <h3 className="doc-editor-section-title">{t('quotations.editor.grid.title')}</h3>
                <LineItemsGrid<QuotationLineRow>
                  columns={columns}
                  rows={items}
                  onRowsChange={setItems}
                  createEmptyRow={() => emptyRow(values.tax_rate || 0)}
                  readOnly={readOnly}
                  filterKey="description"
                />
              </div>

              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 260 }} />
                <DocumentTotalsPanel
                  subtotal={totals.subtotal}
                  taxTotal={totals.taxTotal}
                  grandTotal={totals.grandTotal}
                  currency={values.currency}
                  readOnly={readOnly}
                />
              </div>

              <DocumentFooterSection
                readOnly={readOnly}
                issuedByName={quotation?.assigned_user?.full_name ?? undefined}
                approvedByName={quotation?.recent_approvals?.[0]?.user?.full_name ?? undefined}
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
          title={t('quotations.editor.actions.void')}
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
                  runAction(t('quotations.editor.actions.voided'), () => cancelQuotation(qId!, reason))
                }}
              >
                {t('quotations.editor.actions.void')}
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
