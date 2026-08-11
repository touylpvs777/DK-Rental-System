import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import type { Lead, LeadCreate, LeadSource, LeadStatus } from '@/types/lead'

// Valid status transitions mirroring the backend VALID_TRANSITIONS dict
const TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new:       ['new', 'contacted', 'lost'],
  contacted: ['contacted', 'qualified', 'lost'],
  qualified: ['qualified', 'proposal', 'lost'],
  proposal:  ['proposal', 'won', 'lost'],
  won:       ['won'],
  lost:      ['lost', 'new'],
}

const SOURCE_VALUES: LeadSource[] = ['website', 'referral', 'cold_call', 'email', 'social_media', 'other']

// Maps LeadSource values to the camelCase key suffix used under leads.source.*
const SOURCE_KEY: Record<LeadSource, string> = {
  website: 'website', referral: 'referral', cold_call: 'coldCall',
  email: 'email', social_media: 'socialMedia', other: 'other',
}

interface LeadFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: LeadCreate) => Promise<boolean>
  lead?: Lead | null
}

const EMPTY = {
  title: '',
  description: '',
  value: '',
  source: '' as LeadSource | '',
  status: 'new' as LeadStatus,
}

export default function LeadForm({ isOpen, onClose, onSubmit, lead }: LeadFormProps) {
  const { t } = useTranslation()
  const isEdit = !!lead
  const [fields, setFields] = useState(EMPTY)
  const [isLoading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setFields(
      lead
        ? {
            title:       lead.title,
            description: lead.description ?? '',
            value:       lead.value != null ? String(lead.value) : '',
            source:      lead.source ?? '',
            status:      lead.status,
          }
        : EMPTY
    )
  }, [isOpen, lead])

  const set =
    (key: keyof typeof EMPTY) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFields((p) => ({ ...p, [key]: e.target.value }))

  const allowedStatuses: LeadStatus[] = isEdit
    ? TRANSITIONS[lead!.status]
    : ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const payload: LeadCreate = {
      title:  fields.title.trim(),
      status: fields.status,
      ...(fields.description.trim() && { description: fields.description.trim() }),
      ...(fields.value              && { value: parseFloat(fields.value) }),
      ...(fields.source             && { source: fields.source as LeadSource }),
    }
    const ok = await onSubmit(payload)
    setLoading(false)
    if (ok) onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('leads.form.editTitle') : t('leads.form.newTitle')}
      width={500}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="lead-form" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? t('common.saving') : isEdit ? t('leads.form.saveChanges') : t('leads.form.createLead')}
          </button>
        </>
      }
    >
      <form id="lead-form" onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="lf-title">{t('leads.form.titleLabel')} <span className="required">*</span></label>
          <input
            id="lf-title"
            value={fields.title}
            onChange={set('title')}
            required
            placeholder={t('leads.form.titlePlaceholder')}
          />
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="lf-status">{t('common.status')}</label>
            <select id="lf-status" value={fields.status} onChange={set('status')}>
              {allowedStatuses.map((s) => (
                <option key={s} value={s}>{t(`leads.status.${s}`)}</option>
              ))}
            </select>
            {isEdit && lead!.status === 'won' && (
              <small style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                {t('leads.form.wonLeadsCannotChange')}
              </small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="lf-source">{t('leads.form.sourceLabel')}</label>
            <select id="lf-source" value={fields.source} onChange={set('source')}>
              <option value="">{t('leads.form.sourceNone')}</option>
              {SOURCE_VALUES.map((v) => (
                <option key={v} value={v}>{t(`leads.source.${SOURCE_KEY[v]}`)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="lf-value">{t('leads.form.valueLabel')}</label>
          <div className="input-prefix-wrap">
            <span className="input-prefix">$</span>
            <input
              id="lf-value"
              type="number"
              min="0"
              step="0.01"
              value={fields.value}
              onChange={set('value')}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="lf-desc">{t('common.description')}</label>
          <textarea
            id="lf-desc"
            value={fields.description}
            onChange={set('description')}
            placeholder={t('leads.form.descriptionPlaceholder')}
            rows={3}
          />
        </div>
      </form>
    </Modal>
  )
}
