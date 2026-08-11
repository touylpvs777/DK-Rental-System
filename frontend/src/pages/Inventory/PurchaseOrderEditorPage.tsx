import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm, FormProvider, useFormContext } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ChevronLeft, FileDown, FileSpreadsheet, Loader2, PackageCheck, Send } from 'lucide-react'
import {
  getPurchaseOrder, createPurchaseOrder, updatePOGrid, submitPO, receivePO, getWarehouses, type POGridRow,
} from '@/api/inventory'
import { getPartners, type PartnerBrief } from '@/api/partners'
import type { PurchaseOrder, POCreate, Warehouse, ReceiveItemAction } from '@/types/inventory'
import {
  purchaseOrderHeaderSchema, PURCHASE_ORDER_EDITOR_DEFAULTS, type PurchaseOrderEditorFormValues,
} from '@/schemas/purchaseOrderEditorSchema'
import LineItemsGrid, { type GridColumn, type GridRow } from '@/components/grid/LineItemsGrid'
import DocumentPreview from '@/components/DocumentPreview'
import DocumentFlowStrip from '@/components/layout/DocumentFlowStrip'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import PrintButton from '@/components/ui/PrintButton'
import { exportDocumentToExcel } from '@/utils/exportExcel'
import { toast } from '@/store/toastStore'
import { useCompanyStore } from '@/store/companyStore'
import { getHeaderColorClass } from '@/utils/routeHeaderColor'
import '@/styles/shared.css'
import '@/styles/detail.css'
import '@/components/documents/DocumentEditor.css'

interface POLineRow extends GridRow {
  id: number | null
  item_code: string
  description: string
  unit: string
  quantity_ordered: number
  unit_cost: number
}

let nextRowKey = 1
function emptyRow(): POLineRow {
  return { _key: nextRowKey++, id: null, item_code: '', description: '', unit: 'piece', quantity_ordered: 1, unit_cost: 0 }
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'gray', ordered: 'blue', partially_received: 'amber', received: 'green', cancelled: 'red',
}

function fmtNum(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
}

function PurchaseOrderHeaderFields({ warehouses, partners, readOnly }: { warehouses: Warehouse[]; partners: PartnerBrief[]; readOnly: boolean }) {
  const { t } = useTranslation()
  const { register, setValue, formState: { errors } } = useFormContext<PurchaseOrderEditorFormValues>()

  const applyPartner = (partnerId: string) => {
    if (!partnerId) return
    const p = partners.find((x) => x.id === Number(partnerId))
    if (!p) return
    setValue('partner_id', p.id)
    setValue('vendor', p.name)
    setValue('vendor_address', p.address ?? '')
    setValue('vendor_contact', p.phone ?? '')
  }

  return (
    <div className="doc-editor-header-grid">
      <div className="form-group">
        <label>{t('inventory.purchaseOrder.editor.partner')}</label>
        <select disabled={readOnly} onChange={(e) => applyPartner(e.target.value)} defaultValue="">
          <option value="">{t('inventory.purchaseOrder.editor.noPartner')}</option>
          {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>{t('inventory.purchaseOrder.form.vendor')} <span className="required">*</span></label>
        <input {...register('vendor')} disabled={readOnly} />
        {errors.vendor && <span className="field-error">{errors.vendor.message}</span>}
      </div>
      <div className="form-group">
        <label>{t('inventory.purchaseOrder.form.warehouse')} <span className="required">*</span></label>
        <select {...register('warehouse_id', { setValueAs: (v) => (v === '' ? null : Number(v)) })} disabled={readOnly}>
          <option value="">{t('documentEditor.header.selectCustomer')}</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label>{t('inventory.purchaseOrder.form.vendorAddress')}</label>
        <input {...register('vendor_address')} disabled={readOnly} />
      </div>
      <div className="form-group">
        <label>{t('inventory.purchaseOrder.form.vendorContact')}</label>
        <input {...register('vendor_contact')} disabled={readOnly} />
      </div>
      <div className="form-group">
        <label>{t('inventory.purchaseOrder.form.orderDate')}</label>
        <input type="date" {...register('order_date')} disabled={readOnly} />
      </div>

      <div className="form-group">
        <label>{t('inventory.purchaseOrder.form.expectedDate')}</label>
        <input type="date" {...register('expected_date')} disabled={readOnly} />
      </div>
      <div className="form-group">
        <label>{t('inventory.purchaseOrder.form.taxRate')}</label>
        <input type="number" step="0.1" min="0" max="100" {...register('tax_rate', { valueAsNumber: true })} disabled={readOnly} />
      </div>
    </div>
  )
}

export default function PurchaseOrderEditorPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const location = useLocation()
  const headerColorClass = getHeaderColorClass(location.pathname)

  const [po, setPo] = useState<PurchaseOrder | null>(null)
  const [items, setItems] = useState<POLineRow[]>(isNew ? [emptyRow()] : [])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [partners, setPartners] = useState<PartnerBrief[]>([])
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [receiveQty, setReceiveQty] = useState<Record<number, string>>({})

  const companyProfile = useCompanyStore((s) => s.profile)
  const fetchCompanyProfile = useCompanyStore((s) => s.fetch)
  useEffect(() => { fetchCompanyProfile() }, [fetchCompanyProfile])

  useEffect(() => {
    getWarehouses().then(({ data }) => setWarehouses(data)).catch(() => {})
    getPartners({ partner_type: 'vendor', page_size: 100 }).then(({ data }) => setPartners(data.items)).catch(() => {})
  }, [])

  const methods = useForm<PurchaseOrderEditorFormValues>({
    resolver: zodResolver(purchaseOrderHeaderSchema),
    defaultValues: { ...PURCHASE_ORDER_EDITOR_DEFAULTS, order_date: new Date().toISOString().slice(0, 10) },
  })

  useEffect(() => {
    if (!isNew && warehouses.length > 0 && methods.getValues('warehouse_id') == null && po) {
      methods.setValue('warehouse_id', po.warehouse.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouses, po])

  const load = async () => {
    if (isNew) return
    setIsLoading(true)
    try {
      const { data } = await getPurchaseOrder(Number(id))
      setPo(data)
      methods.reset({
        vendor: data.vendor,
        vendor_address: data.vendor_address ?? '',
        vendor_contact: data.vendor_contact ?? '',
        partner_id: data.partner?.id ?? null,
        warehouse_id: data.warehouse.id,
        order_date: data.order_date ?? '',
        expected_date: data.expected_date ?? '',
        tax_rate: data.tax_rate,
        notes: data.notes ?? '',
      })
      setItems(data.items.length
        ? data.items.map((it) => ({
          _key: nextRowKey++, id: it.id, item_code: it.item_code ?? '',
          description: it.description ?? '', unit: it.unit ?? '', quantity_ordered: it.quantity_ordered, unit_cost: it.unit_cost,
        }))
        : [emptyRow()])
    } catch {
      setError(t('inventory.purchaseOrder.editor.notFoundError'))
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  const values = methods.watch()

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, r) => s + r.quantity_ordered * r.unit_cost, 0)
    const taxAmount = subtotal * ((values.tax_rate || 0) / 100)
    return { subtotal, taxAmount, grandTotal: subtotal + taxAmount }
  }, [items, values.tax_rate])

  const columns: GridColumn<POLineRow>[] = [
    { key: 'item_code', header: t('inventory.purchaseOrder.form.itemCode'), type: 'text', width: 110 },
    { key: 'description', header: t('inventory.purchaseOrder.form.description'), type: 'text', width: 260 },
    { key: 'unit', header: t('inventory.purchaseOrder.form.unit'), type: 'text', width: 80 },
    { key: 'quantity_ordered', header: t('inventory.purchaseOrder.form.qty'), type: 'number', width: 90, align: 'right' },
    { key: 'unit_cost', header: t('inventory.purchaseOrder.form.unitCost'), type: 'number', width: 110, align: 'right' },
    {
      key: 'line_total', header: t('common.total'), type: 'number', width: 120, align: 'right',
      compute: (row) => row.quantity_ordered * row.unit_cost,
      format: fmtNum,
    },
  ]

  // Purchase Order's header fields have no backend update endpoint at all —
  // once created, only line items remain editable (via the grid endpoint).
  const headerReadOnly = !isNew
  const canReceive = po?.status === 'ordered' || po?.status === 'partially_received'

  const onCreate = methods.handleSubmit(async (form) => {
    setIsSaving(true)
    setError(null)
    try {
      const validItems = items.filter((r) => r.description.trim() || r.item_code.trim())
      if (validItems.length === 0) { setError(t('inventory.purchaseOrder.form.itemRequired')); setIsSaving(false); return }
      const payload: POCreate = {
        vendor: form.vendor,
        vendor_address: form.vendor_address || undefined,
        vendor_contact: form.vendor_contact || undefined,
        partner_id: form.partner_id ?? undefined,
        warehouse_id: form.warehouse_id!,
        order_date: form.order_date || new Date().toISOString().slice(0, 10),
        expected_date: form.expected_date || undefined,
        tax_rate: form.tax_rate,
        notes: form.notes || undefined,
        items: validItems.map((r) => ({
          item_code: r.item_code || undefined,
          description: r.description || undefined,
          unit: r.unit || undefined,
          quantity_ordered: r.quantity_ordered,
          unit_cost: r.unit_cost,
        })),
      }
      const { data } = await createPurchaseOrder(payload)
      toast.success(t('inventory.purchaseOrder.editor.saveSuccess'))
      navigate(`/inventory/purchase-orders/${data.id}`, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? t('inventory.purchaseOrder.editor.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  })

  const onSaveItems = async () => {
    if (!po) return
    setIsSaving(true)
    setError(null)
    try {
      const rows: POGridRow[] = items
        .filter((r) => r.description.trim() || r.item_code.trim())
        .map((r) => ({
          id: r.id, item_code: r.item_code || undefined, description: r.description || undefined,
          unit: r.unit || undefined, quantity_ordered: r.quantity_ordered, unit_cost: r.unit_cost,
          line_total: r.quantity_ordered * r.unit_cost,
        }))
      await updatePOGrid(po.id, rows)
      toast.success(t('inventory.purchaseOrder.editor.itemsSaveSuccess'))
      await load()
    } catch {
      setError(t('inventory.purchaseOrder.editor.itemsSaveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setIsSaving(true)
    try {
      await fn()
      toast.success(label)
      await load()
    } catch {
      toast.error(t('inventory.purchaseOrder.detail.actionFailed', { action: label }))
    } finally {
      setIsSaving(false)
    }
  }

  const openReceiveModal = () => {
    if (!po) return
    const init: Record<number, string> = {}
    po.items.forEach((it) => { init[it.id] = String(it.quantity_ordered - it.quantity_received) })
    setReceiveQty(init)
    setReceiveOpen(true)
  }
  const submitReceive = async () => {
    if (!po) return
    const receiveItems: ReceiveItemAction[] = Object.entries(receiveQty)
      .map(([item_id, qty]) => ({ item_id: Number(item_id), quantity_received: Number(qty) || 0 }))
      .filter((r) => r.quantity_received > 0)
    if (receiveItems.length === 0) { setReceiveOpen(false); return }
    setReceiveOpen(false)
    await runAction(t('inventory.purchaseOrder.detail.received'), () => receivePO(po.id, receiveItems))
  }

  const handleExportExcel = () => {
    exportDocumentToExcel({
      documentTitle: t('inventory.purchaseOrder.form.title'),
      documentNumber: po?.po_number ?? '',
      date: fmtDate(po?.created_at),
      customerName: values.vendor || undefined,
      currency: po?.currency ?? 'LAK',
      items: items.filter((r) => r.description.trim() || r.item_code.trim()).map((r) => ({
        itemCode: r.item_code, description: r.description, qty: r.quantity_ordered, unit: r.unit,
        unitPrice: r.unit_cost, discountPercent: 0, discountAmount: 0, taxPercent: 0, taxAmount: 0,
        total: r.quantity_ordered * r.unit_cost,
      })),
      subtotal: totals.subtotal,
      taxTotal: totals.taxAmount,
      grandTotal: totals.grandTotal,
    })
  }

  const previewProps = {
    docType: 'purchase_order' as const,
    documentNumber: po?.po_number ?? '',
    date: fmtDate(po?.created_at ?? new Date().toISOString()),
    companyName: companyProfile?.company_name,
    companyAddress: companyProfile?.address,
    companyPhone: companyProfile?.phone,
    partyLabel: t('documentPreview.vendorDetails'),
    partyName: values.vendor || '—',
    partyAddress: values.vendor_address,
    partyContact: values.vendor_contact,
    items: items.filter((r) => r.description.trim() || r.item_code.trim()).map((r) => ({
      itemCode: r.item_code, description: r.description, qty: r.quantity_ordered, unit: r.unit,
      unitPrice: r.unit_cost, total: r.quantity_ordered * r.unit_cost,
    })),
    subtotal: totals.subtotal,
    taxRate: values.tax_rate,
    taxAmount: totals.taxAmount,
    grandTotal: totals.grandTotal,
    currency: po?.currency ?? 'LAK',
    showAmountInWords: true,
    termsText: values.notes,
    termsLabel: t('common.notes'),
  }

  const flowSteps = [
    { labelKey: 'nav.items.quotations', to: '/quotations' },
    { labelKey: 'nav.items.salesOrders', to: '/sales-orders' },
    { labelKey: 'nav.items.purchaseOrders', to: '/inventory/purchase-orders' },
    { labelKey: 'nav.items.workOrders', to: '/maintenance/work-orders' },
    { labelKey: 'nav.items.rentalContracts', to: '/rental-contracts' },
    { labelKey: 'nav.items.invoices', to: '/billing/invoices' },
  ]

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('common.loading')}</div>
  if (error && !po && !isNew) return <div className="page-error"><AlertCircle size={16} /> {error}</div>

  return (
    <FormProvider {...methods}>
      <div>
        <div className="doc-preview-hide-on-print">
          <div className={`page-header page-header-banner doc-editor-toolbar-sticky ${headerColorClass}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => navigate('/inventory/purchase-orders')} style={{ padding: '6px 8px' }}>
                <ChevronLeft size={16} />
              </button>
              <div>
                <div className="detail-title-row">
                  <h1 className="detail-name" style={{ fontSize: 20 }}>
                    {isNew ? t('inventory.purchaseOrder.editor.newTitle') : po?.po_number}
                  </h1>
                  {po && <Badge variant={STATUS_VARIANT[po.status] ?? 'gray'}>{t(`inventory.purchaseOrder.status.${po.status}`, po.status)}</Badge>}
                </div>
              </div>
            </div>
            <div className="detail-actions">
              <button className="btn btn-ghost" onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}>
                {viewMode === 'edit' ? t('quotations.editor.printPreview') : t('quotations.editor.backToEdit')}
              </button>
              <PrintButton />
              <button className="btn btn-ghost" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} /> {t('quotations.editor.exportExcel')}
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <FileDown size={14} /> {t('common.exportPdf')}
              </button>
              {isNew && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => onCreate()}>
                  {isSaving ? <Loader2 size={14} className="spin" /> : null} {t('inventory.purchaseOrder.form.createPO')}
                </button>
              )}
              {!isNew && (
                <button className="btn btn-primary" disabled={isSaving} onClick={onSaveItems}>
                  {isSaving ? <Loader2 size={14} className="spin" /> : null} {t('inventory.purchaseOrder.editor.saveItems')}
                </button>
              )}
              {po?.status === 'draft' && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('inventory.purchaseOrder.detail.submitted'), () => submitPO(po.id))}>
                  <Send size={14} /> {t('inventory.purchaseOrder.detail.submit')}
                </button>
              )}
              {canReceive && (
                <button className="btn btn-primary" disabled={isSaving} onClick={openReceiveModal}>
                  <PackageCheck size={14} /> {t('inventory.purchaseOrder.detail.receiveItems')}
                </button>
              )}
            </div>
          </div>

          {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

          {viewMode === 'edit' ? (
            <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
              <DocumentFlowStrip steps={flowSteps} currentIndex={2} />

              <div className="doc-editor-header">
                {headerReadOnly && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    {t('inventory.purchaseOrder.editor.headerLocked')}
                  </div>
                )}
                <PurchaseOrderHeaderFields warehouses={warehouses} partners={partners} readOnly={headerReadOnly} />
              </div>

              <div className="doc-editor-section">
                <h3 className="doc-editor-section-title">{t('inventory.purchaseOrder.form.lineItems')}</h3>
                <LineItemsGrid<POLineRow>
                  columns={columns}
                  rows={items}
                  onRowsChange={setItems}
                  createEmptyRow={emptyRow}
                  readOnly={false}
                  filterKey="description"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div className="doc-editor-totals">
                  <div className="doc-editor-totals-row">
                    <span>{t('documentEditor.totals.subtotal')}</span>
                    <span className="doc-editor-totals-value">{fmtNum(totals.subtotal)}</span>
                  </div>
                  <div className="doc-editor-totals-row">
                    <span>{t('billing.invoice.summary.tax', { rate: values.tax_rate || 0 })}</span>
                    <span className="doc-editor-totals-value">{fmtNum(totals.taxAmount)}</span>
                  </div>
                  <div className="doc-editor-totals-row doc-editor-totals-grand">
                    <span>{t('documentEditor.totals.grandTotal')}</span>
                    <span className="doc-editor-totals-value">{fmtNum(totals.grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="doc-editor-section">
                <div className="form-group">
                  <label>{t('common.notes')}</label>
                  <textarea rows={2} {...methods.register('notes')} disabled={false} />
                </div>
                <div className="doc-editor-signatures">
                  <div className="doc-editor-signature-block">
                    <div className="doc-editor-signature-line" />
                    <div className="doc-editor-signature-label">{t('documentEditor.footer.issuedBy')}</div>
                  </div>
                  <div className="doc-editor-signature-block">
                    <div className="doc-editor-signature-line" />
                    <div className="doc-editor-signature-label">{t('documentEditor.footer.reviewedBy')}</div>
                  </div>
                  <div className="doc-editor-signature-block">
                    <div className="doc-editor-signature-line" />
                    <div className="doc-editor-signature-label">{t('documentEditor.footer.approvedBy')}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 16, overflow: 'auto' }}>
              <DocumentPreview {...previewProps} />
            </div>
          )}
        </div>

        <div className="doc-preview">
          <DocumentPreview {...previewProps} />
        </div>

        <Modal
          isOpen={receiveOpen}
          onClose={() => setReceiveOpen(false)}
          title={t('inventory.purchaseOrder.detail.receiveModalTitle')}
          footer={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setReceiveOpen(false)}>{t('common.close')}</button>
              <button className="btn btn-primary" disabled={isSaving} onClick={submitReceive}>{t('inventory.purchaseOrder.detail.receiveItems')}</button>
            </div>
          }
        >
          <div className="form-grid">
            {po?.items.filter((it) => it.quantity_received < it.quantity_ordered).map((it) => (
              <div key={it.id} className="form-group">
                <label>{it.item_code ?? it.description ?? `#${it.id}`} ({t('inventory.purchaseOrder.detail.qtyOrdered')}: {it.quantity_ordered}, {t('inventory.purchaseOrder.detail.qtyReceived')}: {it.quantity_received})</label>
                <input
                  type="number" min="0" max={it.quantity_ordered - it.quantity_received} step="0.01"
                  value={receiveQty[it.id] ?? '0'}
                  onChange={(e) => setReceiveQty((prev) => ({ ...prev, [it.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </Modal>
      </div>
    </FormProvider>
  )
}
