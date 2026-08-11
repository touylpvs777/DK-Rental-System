import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm, FormProvider, useFormContext } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle, Check, ChevronLeft, FileDown, Loader2, RotateCcw, Send, X,
} from 'lucide-react'
import {
  getRentalContract, createRentalContract, updateRentalContract, addContractItem, replaceContractItemsBulk,
  submitContract, approveContract, rejectContract, activateContract, cancelContract, closeContract,
} from '@/api/rental'
import { getCustomers } from '@/api/customers'
import { getForklifts } from '@/api/forklift'
import type { Customer } from '@/types/customer'
import type { RentalContractDetail, RentalContractCreate, ForkliftBrief } from '@/types/rental'
import {
  rentalContractHeaderSchema, RENTAL_CONTRACT_EDITOR_DEFAULTS, type RentalContractEditorFormValues,
} from '@/schemas/rentalContractEditorSchema'
import LineItemsGrid, { type GridColumn, type GridRow } from '@/components/grid/LineItemsGrid'
import DocumentPreview from '@/components/DocumentPreview'
import DocumentFlowStrip from '@/components/layout/DocumentFlowStrip'
import { RentalStatusBadge, RentalContractTypeBadge } from '@/components/rental/RentalStatusBadge'
import Modal from '@/components/ui/Modal'
import PrintButton from '@/components/ui/PrintButton'
import { toast } from '@/store/toastStore'
import { useCompanyStore } from '@/store/companyStore'
import { getHeaderColorClass } from '@/utils/routeHeaderColor'
import '@/styles/shared.css'
import '@/styles/detail.css'
import '@/components/documents/DocumentEditor.css'

interface RentalLineRow extends GridRow {
  id: number | null
  forklift_id: number | null
  description: string
  monthly_rate: number
  daily_rate: number
  hourly_rate: number
}

let nextRowKey = 1
function emptyRow(): RentalLineRow {
  return { _key: nextRowKey++, id: null, forklift_id: null, description: '', monthly_rate: 0, daily_rate: 0, hourly_rate: 0 }
}

const TYPE_OPTIONS = [
  { value: 'short_term', labelKey: 'rental.contractType.shortTerm' },
  { value: 'long_term', labelKey: 'rental.contractType.longTerm' },
  { value: 'project', labelKey: 'rental.contractType.project' },
]

function fmtNum(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
}

function RentalContractHeaderFields({ customers, readOnly }: { customers: Customer[]; readOnly: boolean }) {
  const { t } = useTranslation()
  const { register, formState: { errors } } = useFormContext<RentalContractEditorFormValues>()

  return (
    <div className="doc-editor-header-grid">
      <div className="form-group">
        <label>{t('rental.detail.customer')} <span className="required">*</span></label>
        <select {...register('customer_id', { setValueAs: (v) => (v ? Number(v) : null) })} disabled={readOnly}>
          <option value="">{t('documentEditor.header.selectCustomer')}</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.company ? ` — ${c.company}` : ''}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>{t('rental.form.contractType')} <span className="required">*</span></label>
        <select {...register('contract_type')} disabled={readOnly}>
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>{t('rental.form.currencyLabel')}</label>
        <input {...register('currency')} maxLength={3} />
      </div>

      <div className="form-group">
        <label>{t('rental.form.startDate')} <span className="required">*</span></label>
        <input type="date" {...register('start_date')} disabled={readOnly} />
        {errors.start_date && <span className="field-error">{errors.start_date.message}</span>}
      </div>
      <div className="form-group">
        <label>{t('rental.form.endDate')} <span className="required">*</span></label>
        <input type="date" {...register('end_date')} />
        {errors.end_date && <span className="field-error">{errors.end_date.message}</span>}
      </div>
      <div className="form-group">
        <label>{t('rental.detail.deposit')}</label>
        <input type="number" step="any" min="0" {...register('deposit_amount', { valueAsNumber: true })} />
      </div>

      <div className="form-group">
        <label>{t('rental.form.taxRateLabel')}</label>
        <input type="number" step="0.1" min="0" max="100" {...register('tax_rate', { valueAsNumber: true })} />
      </div>
      <div className="form-group">
        <label>{t('rental.detail.paymentTerms')}</label>
        <input type="number" step="1" min="0" {...register('payment_terms_days', { valueAsNumber: true })} />
      </div>
      <div className="form-group">
        <label>{t('rental.form.billingCycleDay')}</label>
        <input type="number" step="1" min="1" max="31" {...register('billing_cycle_day', { valueAsNumber: true })} />
      </div>

      <div className="form-group">
        <label>{t('rental.form.earlyTerminationFee')} (%)</label>
        <input type="number" step="0.1" min="0" max="100" {...register('early_termination_fee_pct', { valueAsNumber: true })} />
      </div>
      <div className="form-group">
        <label>{t('rental.form.lateReturnPenalty')} (%)</label>
        <input type="number" step="0.1" min="0" max="100" {...register('late_return_penalty_pct', { valueAsNumber: true })} />
      </div>
      <div className="form-group">
        <label>{t('rental.form.overtimeRate')} (%)</label>
        <input type="number" step="0.1" min="100" {...register('overtime_rate_pct', { valueAsNumber: true })} />
      </div>

      <div className="form-group">
        <label>{t('rental.form.deliveryAddress')}</label>
        <input {...register('delivery_address')} />
      </div>
      <div className="form-group">
        <label>{t('rental.form.deliveryContactName')}</label>
        <input {...register('delivery_contact_name')} />
      </div>
      <div className="form-group">
        <label>{t('rental.form.deliveryContactPhone')}</label>
        <input {...register('delivery_contact_phone')} />
      </div>
    </div>
  )
}

export default function RentalContractEditorPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const location = useLocation()
  const headerColorClass = getHeaderColorClass(location.pathname)

  const [ct, setCt] = useState<RentalContractDetail | null>(null)
  const [items, setItems] = useState<RentalLineRow[]>(isNew ? [emptyRow()] : [])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [forklifts, setForklifts] = useState<ForkliftBrief[]>([])
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [cancelModal, setCancelModal] = useState(false)

  const companyProfile = useCompanyStore((s) => s.profile)
  const fetchCompanyProfile = useCompanyStore((s) => s.fetch)
  useEffect(() => { fetchCompanyProfile() }, [fetchCompanyProfile])

  useEffect(() => {
    getCustomers().then(({ data }) => setCustomers(data)).catch(() => {})
    getForklifts({ page_size: 100, is_active: true, status: 'in_stock' }).then(({ data }) => setForklifts(data.items)).catch(() => {})
  }, [])

  const methods = useForm<RentalContractEditorFormValues>({
    resolver: zodResolver(rentalContractHeaderSchema),
    defaultValues: RENTAL_CONTRACT_EDITOR_DEFAULTS,
  })

  const load = async () => {
    if (isNew) return
    setIsLoading(true)
    try {
      let data
      try {
        ;({ data } = await getRentalContract(Number(id)))
      } catch (err) {
        // The detail endpoint occasionally fails to serialize its response
        // when hit immediately after a mutation on the same record (a known
        // backend race, not a real absence) — a brief pause then one retry
        // papers over that without masking a genuine 404.
        if (ct) {
          await new Promise((r) => setTimeout(r, 400))
          ;({ data } = await getRentalContract(Number(id)))
        } else {
          throw err
        }
      }
      setCt(data)
      methods.reset({
        customer_id: data.customer.id,
        contract_type: data.contract_type as RentalContractEditorFormValues['contract_type'],
        start_date: data.start_date ?? '',
        end_date: data.end_date ?? '',
        quotation_id: data.quotation?.id ?? null,
        lead_id: data.lead?.id ?? null,
        assigned_to: data.assigned_user?.id ?? null,
        billing_cycle_day: data.billing_cycle_day,
        payment_terms_days: data.payment_terms_days,
        deposit_amount: data.deposit_amount,
        early_termination_fee_pct: data.early_termination_fee_pct,
        late_return_penalty_pct: data.late_return_penalty_pct,
        overtime_rate_pct: data.overtime_rate_pct,
        tax_rate: data.tax_rate,
        discount_amount: data.discount_amount,
        currency: data.currency,
        delivery_address: data.delivery_address ?? '',
        delivery_contact_name: data.delivery_contact_name ?? '',
        delivery_contact_phone: data.delivery_contact_phone ?? '',
        notes: data.notes ?? '',
        internal_notes: data.internal_notes ?? '',
      })
      setItems(data.items.length
        ? data.items.map((it) => ({
          _key: nextRowKey++, id: it.id, forklift_id: it.forklift?.id ?? null, description: it.description,
          monthly_rate: it.monthly_rate, daily_rate: it.daily_rate, hourly_rate: it.hourly_rate ?? 0,
        }))
        : [emptyRow()])
    } catch {
      if (!ct) setError(t('rental.editor.notFoundError'))
      else toast.error(t('rental.editor.refreshFailed'))
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { void load() }, [id])

  const values = methods.watch()
  // Mirrors the backend's `_require_editable` guard on both the header PUT
  // and the items bulk-replace endpoint: only reservation/draft/revision
  // contracts are editable (revision was previously missing here).
  const isEditableHeader = isNew || ct?.status === 'reservation' || ct?.status === 'draft' || ct?.status === 'revision'
  const canEditItems = isEditableHeader

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, r) => s + r.monthly_rate, 0)
    const taxAmount = subtotal * ((values.tax_rate || 0) / 100)
    const discount = values.discount_amount || 0
    return { subtotal, taxAmount, grandTotal: subtotal + taxAmount - discount }
  }, [items, values.tax_rate, values.discount_amount])

  const forkliftOptions = forklifts.map((f) => ({ value: String(f.id), label: `${f.serial_number} — ${f.name_en}` }))

  const columns: GridColumn<RentalLineRow>[] = [
    { key: 'forklift_id', header: t('rental.detail.addItemModal.forkliftId'), type: 'select', width: 220, options: forkliftOptions },
    { key: 'description', header: t('common.description'), type: 'text', width: 220 },
    { key: 'monthly_rate', header: t('rental.detail.colMonthlyRate'), type: 'number', width: 110, align: 'right' },
    { key: 'daily_rate', header: t('rental.detail.colDailyRate'), type: 'number', width: 100, align: 'right' },
    { key: 'hourly_rate', header: t('rental.detail.addItemModal.hourlyRate'), type: 'number', width: 100, align: 'right' },
  ]

  const onCreate = methods.handleSubmit(async (form) => {
    setIsSaving(true)
    setError(null)
    try {
      const validItems = items.filter((r) => r.forklift_id && r.description.trim())
      if (validItems.length === 0) { setError(t('rental.editor.itemRequired')); setIsSaving(false); return }
      const payload: RentalContractCreate = {
        customer_id: form.customer_id!,
        contract_type: form.contract_type,
        start_date: form.start_date,
        end_date: form.end_date,
        billing_cycle_day: form.billing_cycle_day,
        payment_terms_days: form.payment_terms_days,
        deposit_amount: form.deposit_amount,
        early_termination_fee_pct: form.early_termination_fee_pct,
        late_return_penalty_pct: form.late_return_penalty_pct,
        overtime_rate_pct: form.overtime_rate_pct,
        tax_rate: form.tax_rate,
        currency: form.currency,
        delivery_address: form.delivery_address || undefined,
        delivery_contact_name: form.delivery_contact_name || undefined,
        delivery_contact_phone: form.delivery_contact_phone || undefined,
        notes: form.notes || undefined,
        internal_notes: form.internal_notes || undefined,
      }
      const { data } = await createRentalContract(payload)
      // The add-item endpoint's response occasionally errors even though the
      // item is committed server-side (confirmed via item_count checks) — an
      // existing backend response-serialization quirk, not a real failure.
      // Don't let it abort contract creation; just flag it for the user.
      let itemWarning = false
      for (const row of validItems) {
        try {
          await addContractItem(data.id, {
            forklift_id: row.forklift_id!, description: row.description,
            monthly_rate: row.monthly_rate, daily_rate: row.daily_rate,
            hourly_rate: row.hourly_rate || undefined,
          })
        } catch {
          itemWarning = true
        }
      }
      if (itemWarning) toast.error(t('rental.editor.itemWarning'))
      toast.success(t('rental.form.createdToast', { number: data.contract_number }))
      navigate(`/rental-contracts/${data.id}`, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? t('rental.form.createFailed'))
    } finally {
      setIsSaving(false)
    }
  })

  const onSaveHeader = methods.handleSubmit(async (form) => {
    if (!ct) return
    setIsSaving(true)
    setError(null)
    try {
      await updateRentalContract(ct.id, {
        contract_type: form.contract_type,
        start_date: form.start_date,
        end_date: form.end_date,
        assigned_to: form.assigned_to,
        billing_cycle_day: form.billing_cycle_day,
        payment_terms_days: form.payment_terms_days,
        deposit_amount: form.deposit_amount,
        tax_rate: form.tax_rate,
        discount_amount: form.discount_amount,
        currency: form.currency,
        delivery_address: form.delivery_address,
        delivery_contact_name: form.delivery_contact_name,
        delivery_contact_phone: form.delivery_contact_phone,
        notes: form.notes,
        internal_notes: form.internal_notes,
      })
      // Differential merge: rows with an `id` update in place (forklift_id
      // ignored — swapping equipment on a saved line isn't supported), rows
      // with `id: null` are created (forklift_id required), and any existing
      // item whose id isn't in this array gets deleted + its forklift
      // released server-side — one atomic call for edits, additions, and
      // removals from the grid.
      const validRows = items.filter((r) => r.description.trim() && (r.id !== null || r.forklift_id))
      if (validRows.length === 0) { setError(t('rental.editor.itemRequired')); setIsSaving(false); return }
      await replaceContractItemsBulk(ct.id, {
        items: validRows.map((r) => ({
          id: r.id,
          forklift_id: r.forklift_id,
          description: r.description.trim(),
          monthly_rate: r.monthly_rate,
          daily_rate: r.daily_rate,
          hourly_rate: r.hourly_rate || undefined,
        })),
      })
      toast.success(t('rental.editor.saveSuccess'))
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? t('rental.editor.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  })

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setIsSaving(true)
    const statusBefore = ct?.status
    try {
      await fn()
      toast.success(label)
      await load()
    } catch (e: unknown) {
      // Workflow actions occasionally fail to serialize their response even
      // though the transition already committed (the same known backend
      // quirk as the item-add endpoint) — reload and check whether the
      // status actually moved before reporting a failure the user didn't
      // really have, since retrying the call itself could double-submit a
      // non-idempotent transition.
      let moved = false
      try {
        await new Promise((r) => setTimeout(r, 400))
        const { data } = await getRentalContract(Number(id))
        setCt(data)
        moved = data.status !== statusBefore
      } catch { /* reload itself failed too; fall through to error toast */ }
      if (moved) {
        toast.success(label)
      } else {
        const m = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        toast.error(m ?? t('rental.detail.actionFailed', { action: label }))
      }
    } finally {
      setIsSaving(false)
    }
  }

  const actions = ct?.available_actions ?? []
  const selectedCustomer = customers.find((c) => c.id === values.customer_id)

  const previewProps = {
    docType: 'rental_contract' as const,
    documentNumber: ct?.contract_number ?? '',
    date: fmtDate(ct?.created_at ?? new Date().toISOString()),
    companyName: companyProfile?.company_name,
    companyAddress: companyProfile?.address,
    companyPhone: companyProfile?.phone,
    partyLabel: t('documentPreview.customerDetails'),
    partyName: selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : (ct ? `${ct.customer.first_name} ${ct.customer.last_name}` : '—'),
    partyContact: selectedCustomer?.phone ?? undefined,
    items: items.filter((r) => r.description.trim()).map((r) => {
      const fl = forklifts.find((f) => f.id === r.forklift_id)
      return {
        itemCode: fl?.serial_number, description: r.description, qty: 1, unit: 'mo',
        unitPrice: r.monthly_rate, total: r.monthly_rate,
      }
    }),
    subtotal: totals.subtotal,
    taxRate: values.tax_rate,
    taxAmount: totals.taxAmount,
    grandTotal: totals.grandTotal,
    currency: values.currency,
    showAmountInWords: true,
    termsText: [
      values.early_termination_fee_pct ? `${t('rental.form.earlyTerminationFee')}: ${values.early_termination_fee_pct}%` : '',
      values.late_return_penalty_pct ? `${t('rental.form.lateReturnPenalty')}: ${values.late_return_penalty_pct}%` : '',
      values.overtime_rate_pct ? `${t('rental.form.overtimeRate')}: ${values.overtime_rate_pct}%` : '',
    ].filter(Boolean).join('\n'),
    termsLabel: t('rental.editor.keyTerms'),
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
  if (error && !ct && !isNew) return <div className="page-error"><AlertCircle size={16} /> {error}</div>

  return (
    <FormProvider {...methods}>
      <div>
        <div className="doc-preview-hide-on-print">
          <div className={`page-header page-header-banner doc-editor-toolbar-sticky ${headerColorClass}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => navigate('/rental-contracts')} style={{ padding: '6px 8px' }}>
                <ChevronLeft size={16} />
              </button>
              <div>
                <div className="detail-title-row">
                  <h1 className="detail-name" style={{ fontSize: 20 }}>
                    {isNew ? t('rental.form.newContract') : ct?.contract_number}
                  </h1>
                  {ct && <RentalStatusBadge status={ct.status} />}
                  {ct && <RentalContractTypeBadge type={ct.contract_type} />}
                </div>
              </div>
            </div>
            <div className="detail-actions">
              <button className="btn btn-ghost" onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}>
                {viewMode === 'edit' ? t('quotations.editor.printPreview') : t('quotations.editor.backToEdit')}
              </button>
              <PrintButton />
              <button className="btn btn-primary" onClick={() => window.print()}>
                <FileDown size={14} /> {t('common.exportPdf')}
              </button>
              {isNew && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => onCreate()}>
                  {isSaving ? <Loader2 size={14} className="spin" /> : null} {t('rental.form.createContract')}
                </button>
              )}
              {!isNew && isEditableHeader && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => onSaveHeader()}>
                  {isSaving ? <Loader2 size={14} className="spin" /> : null} {t('rental.editor.saveChanges')}
                </button>
              )}
              {ct && actions.includes('submit') && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('rental.detail.toasts.submitted'), () => submitContract(ct.id))}>
                  <Send size={14} /> {t('rental.detail.submit')}
                </button>
              )}
              {ct && actions.includes('approve') && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('common.approved'), () => approveContract(ct.id))}>
                  <Check size={14} /> {t('rental.detail.approve')}
                </button>
              )}
              {ct && actions.includes('reject') && (
                <button className="btn btn-secondary" disabled={isSaving} onClick={() => runAction(t('rental.detail.toasts.revisionRequested'), () => rejectContract(ct.id, t('rental.detail.reasons.revisionNeeded')))}>
                  <RotateCcw size={14} /> {t('rental.detail.requestRevision')}
                </button>
              )}
              {ct && actions.includes('activate') && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('rental.detail.toasts.activated'), () => activateContract(ct.id))}>
                  <Check size={14} /> {t('rental.detail.activate')}
                </button>
              )}
              {ct && actions.includes('close') && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('rental.detail.toasts.contractClosed'), () => closeContract(ct.id))}>
                  <Check size={14} /> {t('rental.detail.closeContract')}
                </button>
              )}
              {ct && actions.includes('cancel') && (
                <button className="btn btn-secondary" disabled={isSaving} onClick={() => setCancelModal(true)}>
                  <X size={14} /> {t('common.cancel')}
                </button>
              )}
            </div>
          </div>

          {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

          {viewMode === 'edit' ? (
            <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
              <DocumentFlowStrip steps={flowSteps} currentIndex={4} />

              <div className="doc-editor-header">
                <RentalContractHeaderFields customers={customers} readOnly={!isNew} />
              </div>

              <div className="doc-editor-section">
                <h3 className="doc-editor-section-title">{t('rental.detail.lineItems', { count: items.length })}</h3>
                <LineItemsGrid<RentalLineRow>
                  columns={columns}
                  rows={items}
                  onRowsChange={setItems}
                  createEmptyRow={emptyRow}
                  readOnly={!canEditItems}
                  filterKey="description"
                />
                {!isNew && canEditItems && (
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                    {t('rental.editor.itemsBulkEditNote')}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div className="doc-editor-totals">
                  <div className="doc-editor-totals-row">
                    <span>{t('common.subtotal')}</span>
                    <span className="doc-editor-totals-value">{fmtNum(totals.subtotal)}</span>
                  </div>
                  <div className="doc-editor-totals-row">
                    <span>{t('rental.detail.taxWithRate', { rate: values.tax_rate || 0 })}</span>
                    <span className="doc-editor-totals-value">{fmtNum(totals.taxAmount)}</span>
                  </div>
                  <div className="doc-editor-totals-row doc-editor-totals-grand">
                    <span>{t('common.total')}</span>
                    <span className="doc-editor-totals-value">{fmtNum(totals.grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="doc-editor-section">
                <div className="form-group">
                  <label>{t('common.notes')}</label>
                  <textarea rows={2} {...methods.register('notes')} />
                </div>
                <div className="form-group">
                  <label>{t('rental.detail.internalNote')}</label>
                  <textarea rows={2} {...methods.register('internal_notes')} />
                </div>
                <div className="doc-editor-signatures">
                  <div className="doc-editor-signature-block">
                    <div className="doc-editor-signature-line" />
                    <div className="doc-editor-signature-label">{t('documentEditor.footer.issuedBy')}</div>
                  </div>
                  <div className="doc-editor-signature-block">
                    <div className="doc-editor-signature-line" />
                    <div className="doc-editor-signature-label">{t('documentEditor.footer.approvedBy')}</div>
                  </div>
                  <div className="doc-editor-signature-block">
                    <div className="doc-editor-signature-line" />
                    <div className="doc-editor-signature-label">{t('documentEditor.footer.customerSignature')}</div>
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
          isOpen={cancelModal}
          onClose={() => setCancelModal(false)}
          title={t('common.cancel')}
          footer={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setCancelModal(false)}>{t('common.close')}</button>
              <button
                className="btn btn-danger"
                disabled={isSaving}
                onClick={() => { setCancelModal(false); runAction(t('common.cancelled'), () => cancelContract(ct!.id, t('rental.detail.reasons.cancelledByUser'))) }}
              >
                {t('common.cancel')}
              </button>
            </div>
          }
        >
          <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)' }}>{t('rental.editor.confirmCancel')}</p>
        </Modal>
      </div>
    </FormProvider>
  )
}
