import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ChevronLeft, Loader2 } from 'lucide-react'
import {
  getDeliveryNote, createDeliveryNote, updateDeliveryNote, bulkReplaceDeliveryNoteItems,
  dispatchDeliveryNote, deliverDeliveryNote, cancelDeliveryNote,
} from '@/api/deliveryNote'
import { getCustomers } from '@/api/customers'
import { getSalesOrders } from '@/api/salesOrder'
import type { Customer } from '@/types/customer'
import type {
  DeliveryNoteDetail, DeliveryNoteCreate, DeliveryNoteUpdate, DeliveryNoteItemBulkItem,
} from '@/types/deliveryNote'
import type { SalesOrder } from '@/types/salesOrder'
import {
  deliveryNoteHeaderSchema, DELIVERY_NOTE_EDITOR_DEFAULTS, type DeliveryNoteEditorFormValues,
} from '@/schemas/deliveryNoteEditorSchema'
import LineItemsGrid, { type GridColumn, type GridRow } from '@/components/grid/LineItemsGrid'
import DeliveryNoteEditorHeader from '@/components/documents/DeliveryNoteEditorHeader'
import DocumentFooterSection from '@/components/documents/DocumentFooterSection'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { toast } from '@/store/toastStore'
import { useCompanyStore } from '@/store/companyStore'
import { getHeaderColorClass } from '@/utils/routeHeaderColor'
import '@/styles/shared.css'
import '@/styles/detail.css'

interface DeliveryNoteLineRow extends GridRow {
  id: number | null
  item_code: string
  description: string
  quantity_ordered: number | null
  quantity_delivered: number
  unit: string
  notes: string
}

let nextRowKey = 1
function emptyRow(): DeliveryNoteLineRow {
  return {
    _key: nextRowKey++, id: null, item_code: '', description: '',
    quantity_ordered: null, quantity_delivered: 1, unit: 'unit', notes: '',
  }
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'gray', dispatched: 'amber', delivered: 'green', cancelled: 'gray',
}

const STATUS_LABEL_KEY: Record<string, string> = {
  draft: 'deliveryNotes.status.draft',
  dispatched: 'deliveryNotes.status.dispatched',
  delivered: 'deliveryNotes.status.delivered',
  cancelled: 'deliveryNotes.status.cancelled',
}
function statusLabelKey(status: string): string {
  return STATUS_LABEL_KEY[status] ?? status
}

export default function DeliveryNoteEditorPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const headerColorClass = getHeaderColorClass(useLocation().pathname)

  const [deliveryNote, setDeliveryNote] = useState<DeliveryNoteDetail | null>(null)
  const [items, setItems] = useState<DeliveryNoteLineRow[]>(isNew ? [emptyRow()] : [])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voidOpen, setVoidOpen] = useState(false)
  const [voidReason, setVoidReason] = useState('')

  const companyProfile = useCompanyStore((s) => s.profile)
  const fetchCompanyProfile = useCompanyStore((s) => s.fetch)
  useEffect(() => { fetchCompanyProfile() }, [fetchCompanyProfile])

  useEffect(() => {
    getCustomers().then(({ data }) => setCustomers(data)).catch(() => {})
    getSalesOrders({ page_size: 100 }).then(({ data }) => setSalesOrders(data.items)).catch(() => {})
  }, [])

  const methods = useForm<DeliveryNoteEditorFormValues>({
    resolver: zodResolver(deliveryNoteHeaderSchema),
    defaultValues: DELIVERY_NOTE_EDITOR_DEFAULTS,
  })

  const load = async () => {
    if (isNew) return
    setIsLoading(true)
    try {
      const { data } = await getDeliveryNote(Number(id))
      setDeliveryNote(data)
      methods.reset({
        sales_order_id: data.sales_order?.id ?? null,
        customer_id: data.customer?.id ?? null,
        assigned_to: data.assigned_user?.id ?? null,
        delivery_date: data.delivery_date ?? '',
        delivery_address: data.delivery_address ?? '',
        warehouse: data.warehouse ?? '',
        driver_name: data.driver_name ?? '',
        vehicle_plate: data.vehicle_plate ?? '',
        customer_reference: data.customer_reference ?? '',
        notes: data.notes ?? '',
        internal_notes: data.internal_notes ?? '',
        terms_conditions: data.terms_conditions ?? '',
      })
      setItems(data.items.length
        ? data.items.map((it) => ({
          _key: nextRowKey++, id: it.id, item_code: it.item_code ?? '',
          description: it.description, quantity_ordered: it.quantity_ordered,
          quantity_delivered: it.quantity_delivered, unit: it.unit, notes: it.notes ?? '',
        }))
        : [emptyRow()])
    } catch {
      setError(t('deliveryNotes.editor.notFoundError'))
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  const isDraft = isNew || deliveryNote?.status === 'draft'
  const readOnly = !isDraft

  const columns: GridColumn<DeliveryNoteLineRow>[] = [
    { key: 'item_code', header: t('quotations.editor.grid.itemCode'), type: 'text', width: 110 },
    { key: 'description', header: t('common.description'), type: 'text', width: 260 },
    { key: 'quantity_ordered', header: t('deliveryNotes.editor.grid.qtyOrdered'), type: 'number', width: 100, align: 'right' },
    { key: 'quantity_delivered', header: t('deliveryNotes.editor.grid.qtyDelivered'), type: 'number', width: 100, align: 'right' },
    { key: 'unit', header: t('quotations.editor.grid.unit'), type: 'text', width: 80 },
    { key: 'notes', header: t('common.notes'), type: 'text', width: 180 },
  ]

  const buildBulkItems = (): DeliveryNoteItemBulkItem[] => items.map((r) => ({
    id: r.id ?? undefined,
    item_code: r.item_code || undefined,
    description: r.description,
    quantity_ordered: r.quantity_ordered,
    quantity_delivered: r.quantity_delivered,
    unit: r.unit,
    notes: r.notes || undefined,
  }))

  const onSave = methods.handleSubmit(async (form) => {
    if (!form.sales_order_id) {
      setError(t('deliveryNotes.editor.salesOrderRequired'))
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      let dnId = deliveryNote?.id
      if (isNew) {
        const payload: DeliveryNoteCreate = {
          sales_order_id: form.sales_order_id,
          customer_id: form.customer_id || null,
          assigned_to: form.assigned_to || null,
          delivery_date: form.delivery_date || undefined,
          delivery_address: form.delivery_address || undefined,
          warehouse: form.warehouse || undefined,
          driver_name: form.driver_name || undefined,
          vehicle_plate: form.vehicle_plate || undefined,
          customer_reference: form.customer_reference || undefined,
          terms_conditions: form.terms_conditions || undefined,
          notes: form.notes || undefined,
          internal_notes: form.internal_notes || undefined,
        }
        let created
        try {
          created = await createDeliveryNote(payload)
        } catch (err: unknown) {
          const status = (err as { response?: { status?: number } })?.response?.status
          if (status === 409) {
            created = await createDeliveryNote(payload)
          } else {
            throw err
          }
        }
        dnId = created.data.id
      } else {
        const payload: DeliveryNoteUpdate = {
          customer_id: form.customer_id || null,
          assigned_to: form.assigned_to || null,
          delivery_date: form.delivery_date || undefined,
          delivery_address: form.delivery_address,
          warehouse: form.warehouse,
          driver_name: form.driver_name,
          vehicle_plate: form.vehicle_plate,
          customer_reference: form.customer_reference,
          terms_conditions: form.terms_conditions,
          notes: form.notes,
          internal_notes: form.internal_notes,
        }
        await updateDeliveryNote(dnId!, payload)
      }

      const validItems = buildBulkItems().filter((it) => it.description.trim())
      if (validItems.length) {
        await bulkReplaceDeliveryNoteItems(dnId!, validItems)
      }

      toast.success(t('deliveryNotes.editor.saveSuccess'))
      if (isNew) {
        navigate(`/inventory/delivery-notes/${dnId}`, { replace: true })
      } else {
        await load()
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? t('deliveryNotes.editor.saveFailed'))
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
      toast.error(t('deliveryNotes.editor.actionFailed', { action: label }))
    } finally {
      setIsSaving(false)
    }
  }

  const actions = deliveryNote?.available_actions ?? []
  const dnId = deliveryNote?.id

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('common.loading')}</div>
  if (error && !deliveryNote && !isNew) return <div className="page-error"><AlertCircle size={16} /> {error}</div>

  return (
    <FormProvider {...methods}>
      <div>
        <div className={`page-header page-header-banner ${headerColorClass}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => navigate('/inventory/delivery-notes')} style={{ padding: '6px 8px' }}>
              <ChevronLeft size={16} />
            </button>
            <div>
              <div className="detail-title-row">
                <h1 className="detail-name" style={{ fontSize: 20 }}>
                  {isNew ? t('deliveryNotes.editor.newTitle') : deliveryNote?.dn_number}
                </h1>
                {deliveryNote && <Badge variant={STATUS_VARIANT[deliveryNote.status] ?? 'gray'}>{t(statusLabelKey(deliveryNote.status), deliveryNote.status)}</Badge>}
              </div>
            </div>
          </div>
          <div className="detail-actions">
            {isDraft && (
              <button className="btn btn-primary" disabled={isSaving} onClick={() => onSave()}>
                {isSaving ? <Loader2 size={14} className="spin" /> : null} {t('deliveryNotes.editor.saveDraft')}
              </button>
            )}
            {dnId && actions.includes('dispatch') && (
              <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('deliveryNotes.editor.actions.dispatched'), () => dispatchDeliveryNote(dnId))}>
                {t('deliveryNotes.editor.actions.dispatch')}
              </button>
            )}
            {dnId && actions.includes('deliver') && (
              <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('deliveryNotes.editor.actions.delivered'), () => deliverDeliveryNote(dnId))}>
                {t('deliveryNotes.editor.actions.deliver')}
              </button>
            )}
            {dnId && actions.includes('cancel') && (
              <button className="btn btn-danger" disabled={isSaving} onClick={() => setVoidOpen(true)}>
                {t('deliveryNotes.editor.actions.void')}
              </button>
            )}
          </div>
        </div>

        {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

        <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
          <DeliveryNoteEditorHeader
            documentNumber={deliveryNote?.dn_number ?? ''}
            documentNumberLabel={t('deliveryNotes.editor.dnNumber')}
            statusVariant={STATUS_VARIANT[deliveryNote?.status ?? 'draft'] ?? 'gray'}
            statusLabel={t(statusLabelKey(deliveryNote?.status ?? 'draft'), deliveryNote?.status ?? 'draft')}
            companyName={companyProfile?.company_name}
            companyAddress={companyProfile?.address}
            companyPhone={companyProfile?.phone}
            companyLogoUrl={companyProfile?.logo_url}
            customers={customers.map((c) => ({
              id: c.id, label: `${c.first_name} ${c.last_name}${c.company ? ` — ${c.company}` : ''}`,
              phone: c.phone,
            }))}
            salesOrders={salesOrders.map((so) => ({ id: so.id, label: `${so.so_number} — ${so.title}` }))}
            assignedUserName={deliveryNote?.assigned_user?.full_name ?? undefined}
            readOnly={readOnly}
            salesOrderLocked={!isNew}
          />

          <div className="doc-editor-section">
            <h3 className="doc-editor-section-title">{t('quotations.editor.grid.title')}</h3>
            <LineItemsGrid<DeliveryNoteLineRow>
              columns={columns}
              rows={items}
              onRowsChange={setItems}
              createEmptyRow={emptyRow}
              readOnly={readOnly}
              filterKey="description"
            />
          </div>

          <DocumentFooterSection
            readOnly={readOnly}
            issuedByName={deliveryNote?.assigned_user?.full_name ?? undefined}
          />
        </div>

        <Modal
          isOpen={voidOpen}
          onClose={() => setVoidOpen(false)}
          title={t('deliveryNotes.editor.actions.void')}
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
                  runAction(t('deliveryNotes.editor.actions.voided'), () => cancelDeliveryNote(dnId!, reason))
                }}
              >
                {t('deliveryNotes.editor.actions.void')}
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
