import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, AlertCircle } from 'lucide-react'
import { createMovement } from '@/api/movement'
import { toast } from '@/store/toastStore'
import type { MovementType, MovementPriority } from '@/types/movement'
import PageHeader from '@/components/layout/PageHeader'
import '@/styles/shared.css'

const TYPE_VALUES: MovementType[] = ['customer_deployment', 'customer_return', 'warehouse_transfer', 'internal_relocation']
const PRIORITY_VALUES: MovementPriority[] = ['low', 'normal', 'high', 'urgent']

const EMPTY = {
  movement_type: 'customer_deployment',
  forklift_id: '',
  customer_id: '',
  from_location: '',
  from_address: '',
  to_location: '',
  to_address: '',
  scheduled_date: '',
  priority: 'normal',
  tracking_code: '',
  notes: '',
  internal_notes: '',
}

export default function MovementForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ ...EMPTY })
  const [isSaving, setIsSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.forklift_id) { setErr(t('movement.form.errors.forkliftRequired')); return }
    if (!form.from_location.trim()) { setErr(t('movement.form.errors.fromLocationRequired')); return }
    if (!form.to_location.trim()) { setErr(t('movement.form.errors.toLocationRequired')); return }
    if (!form.scheduled_date) { setErr(t('movement.form.errors.scheduledDateRequired')); return }

    setIsSaving(true); setErr(null)
    try {
      const { data } = await createMovement({
        movement_type: form.movement_type as MovementType,
        forklift_id: Number(form.forklift_id),
        customer_id: form.customer_id ? Number(form.customer_id) : undefined,
        from_location: form.from_location.trim(),
        from_address: form.from_address.trim() || undefined,
        to_location: form.to_location.trim(),
        to_address: form.to_address.trim() || undefined,
        scheduled_date: form.scheduled_date,
        priority: form.priority as MovementPriority,
        tracking_code: form.tracking_code.trim() || undefined,
        notes: form.notes.trim() || undefined,
        internal_notes: form.internal_notes.trim() || undefined,
      })
      toast.success(t('movement.form.created', { number: data.movement_number }))
      navigate(`/movements/${data.id}`)
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErr(msg ?? t('movement.form.createFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <button
        className="detail-back"
        onClick={() => navigate('/movements')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 13.5, marginBottom: 20 }}
      >
        <ChevronLeft size={16} /> {t('movement.form.backToMovements')}
      </button>

      <PageHeader title={t('movement.form.title')} style={{ marginBottom: 24 }} />

      <div style={{ maxWidth: 700, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 24 }}>
        <form onSubmit={handleSubmit} className="form-grid">
          {err && <div className="page-error" style={{ margin: 0 }}><AlertCircle size={14} /> {err}</div>}

          <div className="form-row-2">
            <div className="form-group">
              <label>{t('movement.form.movementType')} <span className="required">*</span></label>
              <select value={form.movement_type} onChange={(e) => set('movement_type', e.target.value)}>
                {TYPE_VALUES.map((v) => <option key={v} value={v}>{t(`movement.type.${v}`)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{t('movement.form.priority')}</label>
              <select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {PRIORITY_VALUES.map((v) => <option key={v} value={v}>{t(`movement.priority.${v}`)}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>{t('movement.form.forkliftId')} <span className="required">*</span></label>
              <input type="number" value={form.forklift_id} onChange={(e) => set('forklift_id', e.target.value)} placeholder={t('movement.form.forkliftIdPlaceholder')} required />
            </div>
            <div className="form-group">
              <label>{t('movement.form.customerId')}</label>
              <input type="number" value={form.customer_id} onChange={(e) => set('customer_id', e.target.value)} placeholder={t('common.optional')} />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>{t('movement.form.fromLocation')} <span className="required">*</span></label>
              <input value={form.from_location} onChange={(e) => set('from_location', e.target.value)} placeholder={t('movement.form.fromLocationPlaceholder')} required />
            </div>
            <div className="form-group">
              <label>{t('movement.form.toLocation')} <span className="required">*</span></label>
              <input value={form.to_location} onChange={(e) => set('to_location', e.target.value)} placeholder={t('movement.form.toLocationPlaceholder')} required />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>{t('movement.form.fromAddress')}</label>
              <input value={form.from_address} onChange={(e) => set('from_address', e.target.value)} placeholder={t('movement.form.addressPlaceholder')} />
            </div>
            <div className="form-group">
              <label>{t('movement.form.toAddress')}</label>
              <input value={form.to_address} onChange={(e) => set('to_address', e.target.value)} placeholder={t('movement.form.addressPlaceholder')} />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>{t('movement.form.scheduledDate')} <span className="required">*</span></label>
              <input type="date" value={form.scheduled_date} onChange={(e) => set('scheduled_date', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('movement.form.trackingCode')}</label>
              <input value={form.tracking_code} onChange={(e) => set('tracking_code', e.target.value)} placeholder={t('movement.form.trackingCodePlaceholder')} />
            </div>
          </div>

          <div className="form-group">
            <label>{t('common.notes')}</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder={t('movement.form.notesPlaceholder')} />
          </div>

          <div className="form-group">
            <label>{t('movement.form.internalNotes')}</label>
            <textarea value={form.internal_notes} onChange={(e) => set('internal_notes', e.target.value)} rows={2} placeholder={t('movement.form.internalNotesPlaceholder')} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/movements')} disabled={isSaving}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? t('movement.form.creating') : t('movement.form.createMovement')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
