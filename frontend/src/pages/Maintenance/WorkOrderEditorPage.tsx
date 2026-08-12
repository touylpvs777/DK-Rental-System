import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm, FormProvider, useFormContext } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle, Check, ChevronLeft, FileDown, Loader2, Play, ShieldCheck, X,
} from 'lucide-react'
import {
  getWorkOrder, createWorkOrder, updateWorkOrder, getTechnicians,
  startWorkOrder, completeWorkOrder, verifyWorkOrder, cancelWorkOrder, addCost, replaceCostsBulk,
} from '@/api/maintenance'
import AssetSelect from '@/components/maintenance/AssetSelect'
import WorkOrderEquipmentSection from '@/components/maintenance/WorkOrderEquipmentSection'
import { WOStatusBadge, WOTypeBadge, WOPriorityBadge } from '@/components/maintenance/MaintenanceStatusBadge'
import type { WorkOrderDetail, WOCreate, UserBrief, MCostType } from '@/types/maintenance'
import type { Forklift } from '@/types/forklift'
import {
  workOrderHeaderSchema, WORK_ORDER_EDITOR_DEFAULTS, type WorkOrderEditorFormValues,
} from '@/schemas/workOrderEditorSchema'
import LineItemsGrid, { type GridColumn, type GridRow } from '@/components/grid/LineItemsGrid'
import DocumentPreview from '@/components/DocumentPreview'
import DocumentFlowStrip from '@/components/layout/DocumentFlowStrip'
import Modal from '@/components/ui/Modal'
import PrintButton from '@/components/ui/PrintButton'
import { toast } from '@/store/toastStore'
import { useCompanyStore } from '@/store/companyStore'
import { getHeaderColorClass } from '@/utils/routeHeaderColor'
import '@/styles/shared.css'
import '@/styles/detail.css'
import '@/components/documents/DocumentEditor.css'

interface CostRow extends GridRow {
  id: number | null
  cost_type: string
  description: string
  quantity: number
  unit_rate: number
}

let nextRowKey = 1
function emptyCostRow(): CostRow {
  return { _key: nextRowKey++, id: null, cost_type: 'parts', description: '', quantity: 1, unit_rate: 0 }
}

const TYPE_OPTIONS = [
  { value: 'preventive', labelKey: 'maintenance.type.preventive' },
  { value: 'corrective', labelKey: 'maintenance.type.corrective' },
  { value: 'emergency', labelKey: 'maintenance.type.emergency' },
  { value: 'inspection', labelKey: 'maintenance.type.inspection' },
  { value: 'install', labelKey: 'maintenance.type.install' },
]
const PRIORITY_OPTIONS = [
  { value: 'low', labelKey: 'maintenance.priority.low' },
  { value: 'normal', labelKey: 'maintenance.priority.normal' },
  { value: 'high', labelKey: 'maintenance.priority.high' },
  { value: 'critical', labelKey: 'maintenance.priority.critical' },
]
const COST_TYPE_OPTIONS = [
  { value: 'parts', label: 'Parts' },
  { value: 'labor', label: 'Labor' },
  { value: 'external_service', label: 'External Service' },
  { value: 'other', label: 'Other' },
]

function fmtNum(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
}
function isoToLocalInput(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function WorkOrderHeaderFields({ technicians, onAssetChange, readOnly }: {
  technicians: UserBrief[]; onAssetChange: (f: Forklift | null) => void; readOnly: boolean
}) {
  const { t } = useTranslation()
  const { register, formState: { errors } } = useFormContext<WorkOrderEditorFormValues>()

  return (
    <div className="doc-editor-header-grid">
      {!readOnly && (
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label>{t('maintenance.workOrders.form.asset')} <span className="required">*</span></label>
          <AssetSelect onChange={onAssetChange} placeholder={t('maintenance.workOrders.form.assetSearchPlaceholder')} />
        </div>
      )}
      <div className="form-group">
        <label>{t('maintenance.workOrders.form.workType')} <span className="required">*</span></label>
        <select {...register('order_type')} disabled={readOnly}>
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
        </select>
      </div>

      <div className="form-group" style={{ gridColumn: readOnly ? 'span 2' : undefined }}>
        <label>{t('maintenance.workOrders.form.workOrderTitle')} <span className="required">*</span></label>
        <input {...register('title')} placeholder={t('maintenance.workOrders.form.workOrderTitlePlaceholder')} disabled={readOnly} />
        {errors.title && <span className="field-error">{errors.title.message}</span>}
      </div>
      <div className="form-group">
        <label>{t('maintenance.workOrders.form.assignee')}</label>
        <select {...register('assigned_to', { setValueAs: (v) => (v ? Number(v) : null) })}>
          <option value="">{t('maintenance.workOrders.form.unassigned')}</option>
          {technicians.map((u) => <option key={u.id} value={u.id}>{u.full_name ?? u.username}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label>{t('maintenance.workOrders.form.schedule')} <span className="required">*</span></label>
        <input type="datetime-local" {...register('scheduled_date')} />
        {errors.scheduled_date && <span className="field-error">{errors.scheduled_date.message}</span>}
      </div>
      <div className="form-group">
        <label>{t('maintenance.workOrders.editor.priority')}</label>
        <select {...register('priority')}>
          {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>{t('maintenance.workOrders.detail.fields.estHours')}</label>
        <input type="number" step="0.5" min="0" {...register('estimated_hours', { valueAsNumber: true })} />
      </div>

      <div className="form-group">
        <label>{t('maintenance.workOrders.editor.estimatedCost')}</label>
        <input type="number" step="any" min="0" {...register('estimated_cost', { valueAsNumber: true })} />
      </div>
      <div className="form-group" style={{ gridColumn: 'span 2' }}>
        <label>{t('common.description')}</label>
        <textarea rows={1} {...register('description')} />
      </div>
    </div>
  )
}

export default function WorkOrderEditorPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const location = useLocation()
  const headerColorClass = getHeaderColorClass(location.pathname)

  const [wo, setWo] = useState<WorkOrderDetail | null>(null)
  const [costs, setCosts] = useState<CostRow[]>(isNew ? [emptyCostRow()] : [])
  const [technicians, setTechnicians] = useState<UserBrief[]>([])
  const [asset, setAsset] = useState<Forklift | null>(null)
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [startModal, setStartModal] = useState(false)
  const [completeModal, setCompleteModal] = useState(false)
  const [cancelModal, setCancelModal] = useState(false)

  const companyProfile = useCompanyStore((s) => s.profile)
  const fetchCompanyProfile = useCompanyStore((s) => s.fetch)
  useEffect(() => { fetchCompanyProfile() }, [fetchCompanyProfile])

  useEffect(() => {
    getTechnicians().then(({ data }) => setTechnicians(data)).catch(() => {})
  }, [])

  const methods = useForm<WorkOrderEditorFormValues>({
    resolver: zodResolver(workOrderHeaderSchema),
    defaultValues: WORK_ORDER_EDITOR_DEFAULTS,
  })

  const load = async () => {
    if (isNew) return
    setIsLoading(true)
    try {
      const { data } = await getWorkOrder(Number(id))
      setWo(data)
      methods.reset({
        forklift_id: data.forklift.id,
        order_type: data.order_type as WorkOrderEditorFormValues['order_type'],
        title: data.title,
        description: data.description ?? '',
        assigned_to: data.technician?.id ?? null,
        scheduled_date: isoToLocalInput(data.scheduled_date),
        priority: data.priority as WorkOrderEditorFormValues['priority'],
        estimated_hours: data.estimated_hours,
        estimated_cost: data.estimated_cost,
      })
      setCosts(data.costs.map((c) => ({
        _key: nextRowKey++, id: c.id, cost_type: c.cost_type, description: c.description,
        quantity: c.quantity, unit_rate: c.unit_rate,
      })))
    } catch {
      setError(t('maintenance.workOrders.editor.notFoundError'))
    } finally {
      setIsLoading(false)
    }
  }
  // Same mount/id-change fetch pattern as every other document editor page
  // (Quotation/SalesOrder/Invoice/PurchaseOrder) — the compiler only skips
  // this check for those because they separately call RHF's watch(), which
  // isn't needed here.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [id])

  const s = wo?.status
  const canStart = s === 'scheduled' || s === 'due'
  const canComplete = s === 'in_progress'
  const canVerify = s === 'completed'
  const canCancel = !!s && !['completed', 'verified', 'cancelled'].includes(s)
  // Mirrors the backend's `_require_cost_editable` guard on the bulk-replace
  // endpoint: costs stay fully editable (add/edit/delete) through every
  // status except verified/cancelled.
  const canEditCosts = isNew || (!!s && !['verified', 'cancelled'].includes(s))

  const totalCost = useMemo(() => costs.reduce((sum, r) => sum + r.quantity * r.unit_rate, 0), [costs])

  const columns: GridColumn<CostRow>[] = [
    {
      key: 'cost_type', header: t('maintenance.workOrders.detail.costModal.costType'), type: 'select', width: 140,
      options: COST_TYPE_OPTIONS,
    },
    { key: 'description', header: t('common.description'), type: 'text', width: 260 },
    { key: 'quantity', header: t('common.quantity'), type: 'number', width: 80, align: 'right' },
    { key: 'unit_rate', header: t('maintenance.workOrders.detail.rate'), type: 'number', width: 110, align: 'right' },
    {
      key: 'amount', header: t('common.amount'), type: 'number', width: 120, align: 'right',
      compute: (row) => row.quantity * row.unit_rate,
      format: fmtNum,
    },
  ]

  const onCreate = methods.handleSubmit(async (form) => {
    if (!asset) { setError(t('maintenance.workOrders.form.errors.assetRequired')); return }
    setIsSaving(true)
    setError(null)
    try {
      const payload: WOCreate = {
        forklift_id: asset.id,
        order_type: form.order_type,
        title: form.title,
        scheduled_date: form.scheduled_date ? new Date(form.scheduled_date).toISOString() : new Date().toISOString(),
        priority: form.priority,
        description: form.description || undefined,
        assigned_to: form.assigned_to || undefined,
        estimated_hours: form.estimated_hours,
        estimated_cost: form.estimated_cost,
      }
      const { data } = await createWorkOrder(payload)
      for (const row of costs.filter((r) => r.description.trim())) {
        await addCost(data.id, {
          cost_type: row.cost_type, description: row.description, quantity: row.quantity, unit_rate: row.unit_rate,
        })
      }
      toast.success(t('maintenance.workOrders.form.created', { number: data.work_order_number }))
      navigate(`/maintenance/work-orders/${data.id}`, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? t('maintenance.workOrders.form.createFailed'))
    } finally {
      setIsSaving(false)
    }
  })

  const onSaveHeader = methods.handleSubmit(async (form) => {
    if (!wo) return
    setIsSaving(true)
    setError(null)
    try {
      await updateWorkOrder(wo.id, {
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        assigned_to: form.assigned_to,
        scheduled_date: form.scheduled_date ? new Date(form.scheduled_date).toISOString() : undefined,
        estimated_hours: form.estimated_hours,
        estimated_cost: form.estimated_cost,
      })
      // Differential merge: rows with an `id` update in place, rows with
      // `id: null` are created, and any existing cost whose id isn't in
      // this array gets deleted server-side — a single atomic call covers
      // edits, additions, and removals from the grid.
      await replaceCostsBulk(wo.id, {
        costs: costs.filter((r) => r.description.trim()).map((r) => ({
          id: r.id,
          cost_type: r.cost_type as MCostType,
          description: r.description.trim(),
          quantity: r.quantity,
          unit_rate: r.unit_rate,
        })),
      })
      toast.success(t('maintenance.workOrders.editor.saveSuccess'))
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? t('maintenance.workOrders.editor.saveFailed'))
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
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(m ?? t('maintenance.workOrders.detail.actionFailed', { label }))
    } finally {
      setIsSaving(false)
    }
  }

  const previewProps = {
    docType: 'work_order' as const,
    documentNumber: wo?.work_order_number ?? '',
    date: fmtDate(wo?.created_at ?? new Date().toISOString()),
    companyName: companyProfile?.company_name,
    companyAddress: companyProfile?.address,
    companyPhone: companyProfile?.phone,
    partyLabel: t('maintenance.workOrders.detail.fields.equipment'),
    partyName: wo ? `${wo.forklift.serial_number} — ${wo.forklift.name_en}` : (asset ? `${asset.serial_number} — ${asset.name_en}` : '—'),
    items: costs.filter((r) => r.description.trim()).map((r) => ({
      description: `[${r.cost_type.replace(/_/g, ' ')}] ${r.description}`, qty: r.quantity, unitPrice: r.unit_rate,
      total: r.quantity * r.unit_rate,
    })),
    subtotal: totalCost,
    taxRate: 0,
    taxAmount: 0,
    grandTotal: totalCost,
    currency: 'LAK',
    showAmountInWords: true,
  }

  const flowSteps = [
    { labelKey: 'nav.items.rentalContracts', to: '/rental-contracts' },
    { labelKey: 'nav.items.workOrders', to: '/maintenance/work-orders' },
    { labelKey: 'nav.items.invoices', to: '/billing/invoices' },
  ]

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('common.loading')}</div>
  if (error && !wo && !isNew) return <div className="page-error"><AlertCircle size={16} /> {error}</div>

  return (
    <FormProvider {...methods}>
      <div>
        <div className="doc-preview-hide-on-print">
          <div className={`page-header page-header-banner doc-editor-toolbar-sticky ${headerColorClass}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => navigate('/maintenance/work-orders')} style={{ padding: '6px 8px' }}>
                <ChevronLeft size={16} />
              </button>
              <div>
                <div className="detail-title-row">
                  <h1 className="detail-name" style={{ fontSize: 20 }}>
                    {isNew ? t('maintenance.workOrders.form.title') : wo?.work_order_number}
                  </h1>
                  {wo && <WOStatusBadge status={wo.status} />}
                  {wo && <WOTypeBadge type={wo.order_type} />}
                  {wo && <WOPriorityBadge priority={wo.priority} />}
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
                  {isSaving ? <Loader2 size={14} className="spin" /> : null} {t('maintenance.workOrders.form.createWorkOrder')}
                </button>
              )}
              {!isNew && canEditCosts && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => onSaveHeader()}>
                  {isSaving ? <Loader2 size={14} className="spin" /> : null} {t('maintenance.workOrders.editor.saveChanges')}
                </button>
              )}
              {canStart && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => setStartModal(true)}>
                  <Play size={14} /> {t('maintenance.workOrders.detail.startWork')}
                </button>
              )}
              {canComplete && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => setCompleteModal(true)}>
                  <Check size={14} /> {t('maintenance.workOrders.detail.completeAction')}
                </button>
              )}
              {canVerify && (
                <button className="btn btn-primary" disabled={isSaving} onClick={() => runAction(t('maintenance.status.verified'), () => verifyWorkOrder(wo!.id))}>
                  <ShieldCheck size={14} /> {t('maintenance.workOrders.detail.verify')}
                </button>
              )}
              {canCancel && (
                <button className="btn btn-secondary" disabled={isSaving} onClick={() => setCancelModal(true)}>
                  <X size={14} /> {t('common.cancel')}
                </button>
              )}
            </div>
          </div>

          {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

          {viewMode === 'edit' ? (
            <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
              <DocumentFlowStrip steps={flowSteps} currentIndex={3} />

              <div className="doc-editor-header">
                <WorkOrderHeaderFields technicians={technicians} onAssetChange={setAsset} readOnly={!isNew} />
              </div>

              {wo && <WorkOrderEquipmentSection forklift={wo.forklift} hourMeterAtService={wo.hour_meter_at_service} />}

              {wo?.findings && (
                <div className="doc-editor-section">
                  <h3 className="doc-editor-section-title">{t('maintenance.workOrders.detail.findings')}</h3>
                  <p style={{ margin: 0, fontSize: 13.5 }}>{wo.findings}</p>
                </div>
              )}
              {wo?.resolution && (
                <div className="doc-editor-section">
                  <h3 className="doc-editor-section-title">{t('maintenance.workOrders.detail.resolution')}</h3>
                  <p style={{ margin: 0, fontSize: 13.5 }}>{wo.resolution}</p>
                </div>
              )}

              <div className="doc-editor-section">
                <h3 className="doc-editor-section-title">{t('maintenance.workOrders.detail.costBreakdown', { count: costs.length })}</h3>
                <LineItemsGrid<CostRow>
                  columns={columns}
                  rows={costs}
                  onRowsChange={setCosts}
                  createEmptyRow={emptyCostRow}
                  readOnly={!canEditCosts}
                  filterKey="description"
                />
                {!isNew && canEditCosts && (
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                    {t('maintenance.workOrders.editor.costsBulkEditNote')}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div className="doc-editor-totals">
                  <div className="doc-editor-totals-row doc-editor-totals-grand">
                    <span>{t('common.total')}</span>
                    <span className="doc-editor-totals-value">{fmtNum(totalCost)}</span>
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

        <StartModal key={startModal ? 'start-open' : 'start-closed'} isOpen={startModal} onClose={() => setStartModal(false)} onSubmit={(r, n) => runAction(t('maintenance.workOrders.detail.toastStarted'), () => startWorkOrder(wo!.id, r, n)).then(() => setStartModal(false))} />
        <CompleteModal key={completeModal ? 'complete-open' : 'complete-closed'} isOpen={completeModal} onClose={() => setCompleteModal(false)} onSubmit={(h, f, r) => runAction(t('common.completed'), () => completeWorkOrder(wo!.id, h, f, r)).then(() => setCompleteModal(false))} />

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
                onClick={() => { setCancelModal(false); runAction(t('common.cancelled'), () => cancelWorkOrder(wo!.id, t('maintenance.workOrders.detail.cancelReasonDefault'))) }}
              >
                {t('common.cancel')}
              </button>
            </div>
          }
        >
          <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)' }}>{t('maintenance.workOrders.editor.confirmCancel')}</p>
        </Modal>
      </div>
    </FormProvider>
  )
}

function StartModal({ isOpen, onClose, onSubmit }: { isOpen: boolean; onClose: () => void; onSubmit: (reading: number, notes?: string) => Promise<void> }) {
  const { t } = useTranslation()
  const [r, setR] = useState(''); const [n, setN] = useState(''); const [s, setS] = useState(false)
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('maintenance.workOrders.detail.startModal.title')} width={400}>
      <form onSubmit={async (e) => { e.preventDefault(); if (!r) return; setS(true); await onSubmit(Number(r), n.trim() || undefined); setS(false) }} className="form-grid">
        <div className="form-group"><label>{t('maintenance.workOrders.detail.startModal.hourMeterReading')} <span className="required">*</span></label><input type="number" value={r} onChange={(e) => setR(e.target.value)} min="0" step="0.1" required /></div>
        <div className="form-group"><label>{t('common.notes')}</label><input value={n} onChange={(e) => setN(e.target.value)} placeholder={t('common.optional')} /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button type="button" className="btn btn-secondary" onClick={onClose} disabled={s}>{t('common.cancel')}</button><button type="submit" className="btn btn-primary" disabled={s || !r}>{s ? t('maintenance.workOrders.detail.startModal.starting') : t('maintenance.workOrders.detail.startModal.start')}</button></div>
      </form>
    </Modal>
  )
}

function CompleteModal({ isOpen, onClose, onSubmit }: { isOpen: boolean; onClose: () => void; onSubmit: (hours: number, findings?: string, resolution?: string) => Promise<void> }) {
  const { t } = useTranslation()
  const [h, setH] = useState(''); const [f, setF] = useState(''); const [r, setR] = useState(''); const [s, setS] = useState(false)
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('maintenance.workOrders.detail.completeModal.title')} width={500}>
      <form onSubmit={async (e) => { e.preventDefault(); if (!h) return; setS(true); await onSubmit(Number(h), f.trim() || undefined, r.trim() || undefined); setS(false) }} className="form-grid">
        <div className="form-group"><label>{t('maintenance.workOrders.detail.fields.actualHours')} <span className="required">*</span></label><input type="number" value={h} onChange={(e) => setH(e.target.value)} min="0.1" step="0.1" required /></div>
        <div className="form-group"><label>{t('maintenance.workOrders.detail.findings')}</label><textarea value={f} onChange={(e) => setF(e.target.value)} rows={2} placeholder={t('maintenance.workOrders.detail.completeModal.findingsPlaceholder')} /></div>
        <div className="form-group"><label>{t('maintenance.workOrders.detail.resolution')}</label><textarea value={r} onChange={(e) => setR(e.target.value)} rows={2} placeholder={t('maintenance.workOrders.detail.completeModal.resolutionPlaceholder')} /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button type="button" className="btn btn-secondary" onClick={onClose} disabled={s}>{t('common.cancel')}</button><button type="submit" className="btn btn-primary" disabled={s || !h}>{s ? t('maintenance.workOrders.detail.completeModal.completing') : t('maintenance.workOrders.detail.completeAction')}</button></div>
      </form>
    </Modal>
  )
}
