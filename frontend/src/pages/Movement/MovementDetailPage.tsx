import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft, AlertCircle, Truck, MapPin,
  X, Check, Play,
} from 'lucide-react'
import {
  getMovement, prepareMovement, departMovement,
  arriveMovement, completeMovement, cancelMovement,
} from '@/api/movement'
import { MovementStatusBadge, MovementTypeBadge, MovementPriorityBadge } from '@/components/movement/MovementStatusBadge'
import MovementTimeline from '@/components/movement/MovementTimeline'
import Modal from '@/components/ui/Modal'
import { toast } from '@/store/toastStore'
import type { MovementDetail } from '@/types/movement'
import '@/pages/Catalog/ProductDetailPage.css'
import '@/styles/detail.css'
import '@/styles/shared.css'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function MovementDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [mv, setMv] = useState<MovementDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setAL] = useState(false)
  const [departModal, setDepartModal] = useState(false)
  const [arriveModal, setArriveModal] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setIsLoading(true); setError(null)
    try { setMv((await getMovement(Number(id))).data) }
    catch { setError(t('movement.detail.notFound')) }
    finally { setIsLoading(false) }
  }, [id, t])

  useEffect(() => { load() }, [load])

  const doAction = async (label: string, fn: () => Promise<unknown>) => {
    setAL(true)
    try { await fn(); toast.success(label); await load() }
    catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? t('movement.detail.actionFailed', { action: label }))
    }
    finally { setAL(false) }
  }

  if (isLoading) {
    return (
      <div className="product-detail">
        <div className="detail-skeleton">
          <div className="skeleton-cell" style={{ height: 18, width: '30%', marginBottom: 24 }} />
          <div className="detail-skeleton-body"><div className="detail-skeleton-info">
            <div className="skeleton-cell" style={{ height: 12, width: '50%' }} />
            <div className="skeleton-cell" style={{ height: 24, width: '80%', marginTop: 8 }} />
          </div></div>
        </div>
      </div>
    )
  }

  if (error || !mv) {
    return (
      <div className="product-detail">
        <button className="detail-back" onClick={() => navigate('/movements')}><ChevronLeft size={16} /> {t('common.back')}</button>
        <div className="page-error" style={{ marginTop: 24 }}><AlertCircle size={16} /> {error ?? t('movement.detail.notFound')}</div>
      </div>
    )
  }

  const s = mv.status
  const canPrepare = s === 'draft'
  const canDepart = s === 'preparing'
  const canArrive = s === 'in_transit'
  const canComplete = s === 'delivered'
  const canCancel = !['completed', 'cancelled'].includes(s)

  return (
    <div className="product-detail">
      <button className="detail-back" onClick={() => navigate('/movements')}><ChevronLeft size={16} /> {t('movement.form.backToMovements')}</button>

      <div className="detail-header">
        <div>
          <div className="detail-title-row">
            <h1 className="detail-name">{mv.movement_number}</h1>
          </div>
          <div className="detail-subtitle">
            <Truck size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
            {mv.forklift.serial_number} — {mv.forklift.name_en}
          </div>
          <div className="detail-badges">
            <MovementStatusBadge status={mv.status} />
            <MovementTypeBadge type={mv.movement_type} />
            <MovementPriorityBadge priority={mv.priority} />
          </div>
        </div>

        <div className="detail-actions">
          {canPrepare && (
            <button className="btn btn-primary" disabled={actionLoading}
              onClick={() => doAction(t('movement.detail.toasts.preparationStarted'), () => prepareMovement(mv.id))}>
              <Play size={14} /> {t('movement.detail.actions.startPreparing')}
            </button>
          )}
          {canDepart && (
            <button className="btn btn-primary" disabled={actionLoading} onClick={() => setDepartModal(true)}>
              <Truck size={14} /> {t('movement.detail.actions.recordDeparture')}
            </button>
          )}
          {canArrive && (
            <button className="btn btn-primary" disabled={actionLoading} onClick={() => setArriveModal(true)}>
              <MapPin size={14} /> {t('movement.detail.actions.recordArrival')}
            </button>
          )}
          {canComplete && (
            <button className="btn btn-primary" disabled={actionLoading}
              onClick={() => doAction(t('movement.detail.toasts.movementCompleted'), () => completeMovement(mv.id))}>
              <Check size={14} /> {t('movement.detail.actions.markComplete')}
            </button>
          )}
          {canCancel && (
            <button className="btn btn-secondary" disabled={actionLoading}
              onClick={() => doAction(t('movement.detail.toasts.cancelled'), () => cancelMovement(mv.id, t('movement.detail.cancelledByUser')))}>
              <X size={14} /> {t('common.cancel')}
            </button>
          )}
        </div>
      </div>

      {/* Route */}
      <div className="detail-summary-grid">
        <div className="detail-summary-card">
          <div className="detail-summary-label">{t('movement.detail.from')}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginTop: 4 }}>{mv.from_location}</div>
          {mv.from_address && <div className="cell-muted cell-sub">{mv.from_address}</div>}
        </div>
        <div className="detail-summary-card">
          <div className="detail-summary-label">{t('movement.detail.to')}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginTop: 4 }}>{mv.to_location}</div>
          {mv.to_address && <div className="cell-muted cell-sub">{mv.to_address}</div>}
        </div>
        <div className="detail-summary-card">
          <div className="detail-summary-label">{t('movement.detail.scheduled')}</div>
          <div className="detail-summary-value">{fmtDate(mv.scheduled_date)}</div>
        </div>
        {mv.tracking_code && (
          <div className="detail-summary-card">
            <div className="detail-summary-label">{t('movement.detail.trackingCode')}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginTop: 4, fontFamily: 'monospace' }}>{mv.tracking_code}</div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="detail-info-grid">
        <div>
          <dl className="detail-meta">
            <dt>{t('movement.detail.equipment')}</dt><dd>{mv.forklift.serial_number} — {mv.forklift.name_en}</dd>
            {mv.customer && (<><dt>{t('movement.detail.customer')}</dt><dd>{mv.customer.first_name} {mv.customer.last_name}{mv.customer.company ? ` (${mv.customer.company})` : ''}</dd></>)}
            {mv.rental_contract && (<><dt>{t('movement.detail.contract')}</dt><dd>{mv.rental_contract.contract_number}</dd></>)}
            {mv.assigned_driver && (<><dt>{t('movement.detail.driver')}</dt><dd>{mv.assigned_driver.full_name ?? mv.assigned_driver.username}</dd></>)}
          </dl>
        </div>
        <div>
          <dl className="detail-meta">
            <dt>{t('movement.detail.departed')}</dt><dd>{fmtDateTime(mv.actual_departure)}</dd>
            <dt>{t('movement.detail.arrived')}</dt><dd>{fmtDateTime(mv.actual_arrival)}</dd>
            {mv.departure_hour_meter != null && (<><dt>{t('movement.detail.departureHours')}</dt><dd>{mv.departure_hour_meter}</dd></>)}
            {mv.arrival_hour_meter != null && (<><dt>{t('movement.detail.arrivalHours')}</dt><dd>{mv.arrival_hour_meter}</dd></>)}
            <dt>{t('common.createdAt')}</dt><dd>{fmtDate(mv.created_at)}</dd>
          </dl>
        </div>
      </div>

      {mv.notes && (
        <div className="detail-description" style={{ marginTop: 16 }}>
          <div className="detail-section-title">{t('common.notes')}</div>
          <p>{mv.notes}</p>
        </div>
      )}
      {mv.internal_notes && (
        <div className="detail-internal-note"><strong>{t('movement.detail.internalNote')}</strong><p>{mv.internal_notes}</p></div>
      )}
      {mv.cancellation_reason && (
        <div className="detail-internal-note" style={{ borderColor: 'var(--color-danger-300)', background: 'var(--color-danger-50)' }}>
          <strong style={{ color: 'var(--color-danger-700)' }}>{t('movement.detail.cancellationReason')}</strong>
          <p style={{ color: 'var(--color-danger-900)' }}>{mv.cancellation_reason}</p>
        </div>
      )}

      {/* Timeline */}
      <MovementTimeline checkpoints={mv.checkpoints} />

      {/* Departure Modal */}
      <HourMeterModal
        isOpen={departModal} onClose={() => setDepartModal(false)}
        title={t('movement.detail.actions.recordDeparture')} label={t('movement.detail.departureHourMeter')}
        onSubmit={(reading, notes) => doAction(t('movement.detail.toasts.departed'), () => departMovement(mv.id, reading, notes)).then(() => setDepartModal(false))}
      />
      {/* Arrival Modal */}
      <HourMeterModal
        isOpen={arriveModal} onClose={() => setArriveModal(false)}
        title={t('movement.detail.actions.recordArrival')} label={t('movement.detail.arrivalHourMeter')}
        minReading={mv.departure_hour_meter ?? undefined}
        onSubmit={(reading, notes) => doAction(t('movement.detail.toasts.arrived'), () => arriveMovement(mv.id, reading, notes)).then(() => setArriveModal(false))}
      />
    </div>
  )
}


function HourMeterModal({ isOpen, onClose, title, label, minReading, onSubmit }: {
  isOpen: boolean; onClose: () => void; title: string; label: string
  minReading?: number; onSubmit: (reading: number, notes?: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const [reading, setReading] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (isOpen) { setReading(''); setNotes(''); } }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reading) return
    setSaving(true)
    await onSubmit(Number(reading), notes.trim() || undefined)
    setSaving(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width={400}>
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label>{label} <span className="required">*</span></label>
          <input type="number" value={reading} onChange={(e) => setReading(e.target.value)}
            min={minReading ?? 0} step="0.1" required />
        </div>
        <div className="form-group">
          <label>{t('common.notes')}</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('common.optional')} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !reading}>{saving ? t('common.saving') : t('common.confirm')}</button>
        </div>
      </form>
    </Modal>
  )
}
