import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowRightCircle, ChevronLeft, FileDown, FileSpreadsheet, Loader2 } from 'lucide-react'
import {
  getSalesOrder, createSalesOrder, updateSalesOrder, bulkReplaceSalesOrderItems,
  confirmSalesOrder, completeSalesOrder, cancelSalesOrder,
} from '@/api/salesOrder'
import { getCustomers } from '@/api/customers'
import { getQuotations } from '@/api/quotation'
import type { Customer } from '@/types/customer'
import type {
  SalesOrderDetail, SalesOrderCreate, SalesOrderUpdate, SalesOrderItemBulkItem, SalesOrderConversionPrefill,
} from '@/types/salesOrder'
import type { InvoiceConversionPrefill } from '@/types/billing'
import {
  salesOrderHeaderSchema, SALES_ORDER_EDITOR_DEFAULTS, type SalesOrderEditorFormValues,
} from '@/schemas/salesOrderEditorSchema'
import LineItemsGrid, { type GridColumn, type GridRow } from '@/components/grid/LineItemsGrid'
import SalesOrderEditorHeader from '@/components/documents/SalesOrderEditorHeader'
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

interface SalesOrderLineRow extends GridRow {
  id: number | null
  item_code: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  discount_percent: number
  tax_percent: number
}

let nextRowKey = 1
function emptyRow(defaultTaxRate: number): SalesOrderLineRow {
  return {
    _key: nextRowKey++, id: null, item_code: '', description: '',
    quantity: 1, unit: 'unit', unit_price: 0, discount_percent: 0, tax_percent: defaultTaxRate,
  }
}

type QuotationOption = { id: number; quotation_number: string; title: string }

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'gray', confirmed: 'blue', completed: 'green', cancelled: 'gray',
}

const STATUS_LABEL_KEY: Record<string, string> = {
  draft: 'salesOrders.status.draft',
  confirmed: 'salesOrders.status.confirmed',
  completed: 'salesOrders.status.completed',
  cancelled: 'salesOrders.status.cancelled',
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

export default function SalesOrderEditorPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const location = useLocation()
  const headerColorClass = getHeaderColorClass(location.pathname)

  // Present only when navigated to from the Quotation editor's "Convert to
  // Sales Order" action — pre-fills header/vehicle/line-item data so the
  // user doesn't have to re-enter an already-approved quotation by hand.
  const prefill = isNew
    ? (location.state as { fromQuotation?: SalesOrderConversionPrefill } | null)?.fromQuotation
    : undefined

  const [salesOrder, setSalesOrder] = useState<SalesOrderDetail | null>(null)
  const [items, setItems] = useState<SalesOrderLineRow[]>(isNew
    ? (prefill?.items.length
      ? prefill.items.map((it) => ({
        _key: nextRowKey++, id: null, item_code: it.item_code, description: it.description,
        quantity: it.quantity, unit: it.unit, unit_price: it.unit_price,
        discount_percent: it.discount_percent, tax_percent: it.tax_percent,
      }))
      : [emptyRow(0)])
    : [])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [quotations, setQuotations] = useState<QuotationOption[]>(prefill ? [prefill.quotationBrief] : [])
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
    if (prefill) {
      toast.success(t('salesOrders.editor.prefilledFromQuotation', { number: prefill.quotationBrief.quotation_number }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    getCustomers().then(({ data }) => setCustomers(data)).catch(() => {})
    // The dropdown normally only offers "accepted" quotations; when arriving
    // via "Convert to Sales Order" the source quotation is "approved" and
    // wouldn't appear in that list, so keep it merged in as an extra option.
    getQuotations({ status: 'accepted', page_size: 100 }).then(({ data }) => {
      setQuotations((prev) => {
        const extra = prev.filter((p) => !data.items.some((q) => q.id === p.id))
        return [...extra, ...data.items]
      })
    }).catch(() => {})
  }, [])

  const methods = useForm<SalesOrderEditorFormValues>({
    resolver: zodResolver(salesOrderHeaderSchema),
    defaultValues: prefill
      ? { ...SALES_ORDER_EDITOR_DEFAULTS, ...prefill.header, quotation_id: prefill.quotationBrief.id }
      : SALES_ORDER_EDITOR_DEFAULTS,
  })

  // The customer <select> is an uncontrolled RHF field whose options only
  // exist once `getCustomers()` resolves — applying `customer_id` via the
  // initial `defaultValues` above loses that race (the option isn't in the
  // DOM yet), so re-apply the full prefill once customers have actually
  // loaded and rendered as <option> elements.
  const prefillReappliedRef = useRef(false)
  useEffect(() => {
    if (prefill && customers.length > 0 && !prefillReappliedRef.current) {
      prefillReappliedRef.current = true
      methods.reset({ ...SALES_ORDER_EDITOR_DEFAULTS, ...prefill.header, quotation_id: prefill.quotationBrief.id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers])

  const load = async () => {
    if (isNew) return
    setIsLoading(true)
    try {
      const { data } = await getSalesOrder(Number(id))
      setSalesOrder(data)
      methods.reset({
        title: data.title,
        quotation_id: data.quotation?.id ?? null,
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
        order_date: data.order_date ?? '',
        expected_delivery_date: data.expected_delivery_date ?? '',
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
        terms_conditions: data.terms_conditions ?? '',
      })
      setItems(data.items.length
        ? data.items.map((it) => ({
          _key: nextRowKey++, id: it.id, item_code: it.item_code ?? '',
          description: it.description, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price,
          discount_percent: it.discount_percent, tax_percent: it.tax_percent,
        }))
        : [emptyRow(data.tax_rate)])
    } catch {
      setError(t('salesOrders.editor.notFoundError'))
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  const values = methods.watch()
  const isDraft = isNew || salesOrder?.status === 'draft'
  const readOnly = !isDraft

  const calcInputs = useMemo(() => items.map((r) => ({
    quantity: r.quantity, unitPrice: r.unit_price, discountPercent: r.discount_percent, taxPercent: r.tax_percent,
  })), [items])
  const totals = useMemo(
    () => calcDocumentTotals(calcInputs, values.discount_amount || 0, values.round_amount || 0, 0),
    [calcInputs, values.discount_amount, values.round_amount],
  )

  const columns: GridColumn<SalesOrderLineRow>[] = [
    { key: 'item_code', header: t('quotations.editor.grid.itemCode'), type: 'text', width: 110 },
    { key: 'description', header: t('common.description'), type: 'text', width: 240 },
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

  const buildBulkItems = (): SalesOrderItemBulkItem[] => items.map((r) => ({
    id: r.id ?? undefined,
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
      let soId = salesOrder?.id
      if (isNew) {
        const payload: SalesOrderCreate = {
          title: form.title,
          quotation_id: form.quotation_id || null,
          customer_id: form.customer_id || null,
          assigned_to: form.assigned_to || null,
          contact_name: form.contact_name || undefined,
          contact_email: form.contact_email || undefined,
          contact_phone: form.contact_phone || undefined,
          tax_rate: form.tax_rate,
          currency: form.currency,
          exchange_rate: form.exchange_rate,
          bank_details: form.bank_details || undefined,
          order_date: form.order_date || undefined,
          expected_delivery_date: form.expected_delivery_date || undefined,
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
        let created
        try {
          created = await createSalesOrder(payload)
        } catch (err: unknown) {
          const status = (err as { response?: { status?: number } })?.response?.status
          if (status === 409) {
            created = await createSalesOrder(payload)
          } else {
            throw err
          }
        }
        soId = created.data.id
      } else {
        const payload: SalesOrderUpdate = {
          title: form.title,
          quotation_id: form.quotation_id || null,
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
          order_date: form.order_date || undefined,
          expected_delivery_date: form.expected_delivery_date || undefined,
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
        await updateSalesOrder(soId!, payload)
      }

      const validItems = buildBulkItems().filter((it) => it.description.trim())
      if (validItems.length) {
        await bulkReplaceSalesOrderItems(soId!, validItems)
      }

      toast.success(t('salesOrders.editor.saveSuccess'))
      if (isNew) {
        navigate(`/sales-orders/${soId}`, { replace: true })
      } else {
        await load()
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? t('salesOrders.editor.saveFailed'))
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
      toast.error(t('salesOrders.editor.actionFailed', { action: label }))
    } finally {
      setIsSaving(false)
    }
  }

  const actions = salesOrder?.available_actions ?? []
  const soId = salesOrder?.id

  const handleExportExcel = () => {
    exportDocumentToExcel({
      documentTitle: values.title || t('salesOrders.editor.title'),
      documentNumber: salesOrder?.so_number ?? '',
      date: fmtDate(salesOrder?.created_at),
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

  const handleConvertToInvoice = () => {
    if (!salesOrder) return
    const prefill: InvoiceConversionPrefill = {
      salesOrderBrief: { id: salesOrder.id, so_number: salesOrder.so_number, title: salesOrder.title },
      header: {
        customer_id: values.customer_id ?? null,
        reference_type: 'sales',
        reference_id: salesOrder.id,
        tax_rate: values.tax_rate,
        currency: values.currency,
        exchange_rate: values.exchange_rate,
        bank_details: values.bank_details || '',
        vehicle_make: values.vehicle_make || '',
        vehicle_model: values.vehicle_model || '',
        vehicle_vin: values.vehicle_vin || '',
        vehicle_engine_no: values.vehicle_engine_no || '',
        vehicle_reg_no: values.vehicle_reg_no || '',
        job_number: values.job_number || '',
        notes: values.notes || '',
        internal_notes: values.internal_notes || '',
      },
      items: items.filter((r) => r.description.trim()).map((r) => ({
        item_code: r.item_code,
        description: r.description,
        quantity: r.quantity,
        unit: r.unit,
        unit_rate: r.unit_price,
      })),
    }
    navigate('/billing/invoices/new', { state: { fromSalesOrder: prefill } })
  }

  const selectedCustomer = customers.find((c) => c.id === values.customer_id)

  const previewProps = {
    docType: 'sales_order' as const,
    documentNumber: salesOrder?.so_number ?? '',
    date: fmtDate(salesOrder?.created_at),
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
    referenceLabel: salesOrder?.quotation ? t('salesOrders.editor.quotationRef') : undefined,
    referenceValue: salesOrder?.quotation?.quotation_number,
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('common.loading')}</div>
  if (error && !salesOrder && !isNew) return <div className="page-error"><AlertCircle size={16} /> {error}</div>

  return (
    <FormProvider {...methods}>
      <div>
        <div className="doc-preview-hide-on-print">
          <div className={`page-header page-header-banner doc-editor-toolbar-sticky ${headerColorClass}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => navigate('/sales-orders')} style={{ padding: '6px 8px' }}>
                <ChevronLeft size={16} />
              </button>
              <div>
                <div className="detail-title-row">
                  <h1 className="detail-name" style={{ fontSize: 20 }}>
                    {isNew ? t('salesOrders.editor.newTitle') : salesOrder?.so_number}
                  </h1>
                  {salesOrder && <Badge variant={STATUS_VARIANT[salesOrder.status] ?? 'gray'}>{t(statusLabelKey(salesOrder.status), salesOrder.status)}</Badge>}
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
                  {isSaving ? <Loader2 size={14} className="spin" /> : null} {t('salesOrders.editor.saveDraft')}
                </button>
              )}
              {soId && actions.includes('confirm') && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('salesOrders.editor.actions.confirmed'), () => confirmSalesOrder(soId))}>
                  {t('salesOrders.editor.actions.confirm')}
                </button>
              )}
              {soId && actions.includes('complete') && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('salesOrders.editor.actions.completed'), () => completeSalesOrder(soId))}>
                  {t('salesOrders.editor.actions.complete')}
                </button>
              )}
              {soId && actions.includes('cancel') && (
                <button className="btn btn-danger" disabled={isSaving} onClick={() => setVoidOpen(true)}>
                  {t('salesOrders.editor.actions.void')}
                </button>
              )}
              {soId && (salesOrder?.status === 'confirmed' || salesOrder?.status === 'completed') && (
                <button className="btn btn-primary" disabled={isSaving} onClick={handleConvertToInvoice}>
                  <ArrowRightCircle size={14} /> {t('salesOrders.editor.actions.convertToInvoice')}
                </button>
              )}
            </div>
          </div>

          {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

          {viewMode === 'edit' ? (
            <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
              <SalesOrderEditorHeader
                documentNumber={salesOrder?.so_number ?? ''}
                documentNumberLabel={t('salesOrders.editor.soNumber')}
                statusVariant={STATUS_VARIANT[salesOrder?.status ?? 'draft'] ?? 'gray'}
                statusLabel={t(statusLabelKey(salesOrder?.status ?? 'draft'), salesOrder?.status ?? 'draft')}
                companyName={companyProfile?.company_name}
                companyAddress={companyProfile?.address}
                companyPhone={companyProfile?.phone}
                companyLogoUrl={companyProfile?.logo_url}
                customers={customers.map((c) => ({
                  id: c.id, label: `${c.first_name} ${c.last_name}${c.company ? ` — ${c.company}` : ''}`,
                  phone: c.phone, address: null,
                }))}
                quotations={quotations.map((q) => ({ id: q.id, label: `${q.quotation_number} — ${q.title}` }))}
                assignedUserName={salesOrder?.assigned_user?.full_name ?? undefined}
                readOnly={readOnly}
              />

              <VehicleInfoSection readOnly={readOnly} />

              <div className="doc-editor-section">
                <h3 className="doc-editor-section-title">{t('quotations.editor.grid.title')}</h3>
                <LineItemsGrid<SalesOrderLineRow>
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
                issuedByName={salesOrder?.assigned_user?.full_name ?? undefined}
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
          title={t('salesOrders.editor.actions.void')}
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
                  runAction(t('salesOrders.editor.actions.voided'), () => cancelSalesOrder(soId!, reason))
                }}
              >
                {t('salesOrders.editor.actions.void')}
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
