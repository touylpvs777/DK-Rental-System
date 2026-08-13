import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ChevronLeft, Loader2 } from 'lucide-react'
import { getQuotation } from '@/api/quotation'
import { getCustomers } from '@/api/customers'
import { getForklifts } from '@/api/forklift'
import { useQuotations } from '@/hooks/useQuotations'
import {
  quotationSchema, QUOTATION_EDITOR_DEFAULTS, type QuotationFormValues,
} from '@/schemas/quotationEditorSchema'
import { toast } from '@/store/toastStore'
import { getHeaderColorClass } from '@/utils/routeHeaderColor'
import type { Customer } from '@/types/customer'
import type { ForkliftBrief } from '@/types/quotation'
import '@/styles/shared.css'
import '@/styles/detail.css'
import '@/components/documents/DocumentEditor.css'

const STATUS_OPTIONS: QuotationFormValues['status'][] = ['draft', 'sent', 'approved', 'rejected']

export default function QuotationForm() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const headerColorClass = getHeaderColorClass('/quotations')

  const { create, update } = useQuotations()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [forklifts, setForklifts] = useState<ForkliftBrief[]>([])
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [quotationNo, setQuotationNo] = useState<string | null>(null)

  useEffect(() => {
    getCustomers().then(({ data }) => setCustomers(data)).catch(() => {})
    getForklifts({ page_size: 100, is_active: true }).then(({ data }) => setForklifts(data.items)).catch(() => {})
  }, [])

  const {
    register, handleSubmit, formState: { errors }, reset,
  } = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: QUOTATION_EDITOR_DEFAULTS,
  })

  const fieldError = (code?: string) => (code ? t(`quotation.validation.${code}`, code) : null)

  useEffect(() => {
    if (isNew) return
    // isLoading already starts true for the edit case (see useState above)
    // — setting it again here is what trips react-hooks/set-state-in-effect.
    getQuotation(Number(id))
      .then(({ data }) => {
        setQuotationNo(data.quotation_no)
        reset({
          customer_id: data.customer.id,
          forklift_id: data.forklift?.id ?? null,
          expected_start_date: data.expected_start_date,
          expected_end_date: data.expected_end_date,
          rental_price: data.rental_price,
          daily_hours_quota: data.daily_hours_quota,
          status: data.status as QuotationFormValues['status'],
          notes: data.notes ?? '',
        })
      })
      .catch(() => setLoadError(t('quotation.form.notFound', 'Quotation not found.')))
      .finally(() => setIsLoading(false))
  }, [id, isNew, reset, t])

  const onSubmit = handleSubmit(async (form) => {
    if (!form.customer_id) {
      toast.error(t('quotation.form.customerRequired', 'Select a customer.'))
      return
    }
    if (form.expected_end_date <= form.expected_start_date) {
      toast.error(t('quotation.form.dateOrderError', 'End date must be after start date.'))
      return
    }
    setIsSaving(true)
    try {
      const ok = isNew
        ? await create({
            customer_id: form.customer_id,
            forklift_id: form.forklift_id,
            expected_start_date: form.expected_start_date,
            expected_end_date: form.expected_end_date,
            rental_price: form.rental_price,
            daily_hours_quota: form.daily_hours_quota,
            status: form.status,
            notes: form.notes || undefined,
          })
        : await update(Number(id), {
            customer_id: form.customer_id,
            forklift_id: form.forklift_id,
            expected_start_date: form.expected_start_date,
            expected_end_date: form.expected_end_date,
            rental_price: form.rental_price,
            daily_hours_quota: form.daily_hours_quota,
            status: form.status,
            notes: form.notes,
          })
      if (ok) navigate(isNew ? '/quotations' : `/quotations/${id}`)
    } finally {
      setIsSaving(false)
    }
  })

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('common.loading')}</div>
  }

  if (loadError) {
    return <div className="page-error"><AlertCircle size={16} /> {loadError}</div>
  }

  return (
    <div>
      <div className={`page-header page-header-banner ${headerColorClass}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/quotations')} style={{ padding: '6px 8px' }}>
            <ChevronLeft size={16} />
          </button>
          <div>
            <div className="detail-title-row">
              <h1 className="detail-name" style={{ fontSize: 20 }}>
                {isNew ? t('quotation.form.newQuotation', 'New Quotation') : quotationNo}
              </h1>
            </div>
          </div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-primary" disabled={isSaving} onClick={() => onSubmit()}>
            {isSaving ? <Loader2 size={14} className="spin" /> : null}{' '}
            {isNew ? t('quotation.form.createQuotation', 'Create Quotation') : t('quotation.form.saveChanges', 'Save Changes')}
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16, marginTop: 16 }}>
        <div className="doc-editor-section">
          <h3 className="doc-editor-section-title">{t('quotation.form.detailsSection', 'Quotation Details')}</h3>
          <div className="doc-editor-header-grid">
            <div className="form-group">
              <label>{t('quotation.form.customer', 'Customer')} <span className="required">*</span></label>
              <select {...register('customer_id', { setValueAs: (v) => (v ? Number(v) : null) })}>
                <option value="">{t('quotation.form.selectCustomer', 'Select a customer…')}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.company ? ` — ${c.company}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('quotation.form.forklift', 'Forklift')}</label>
              <select {...register('forklift_id', { setValueAs: (v) => (v ? Number(v) : null) })}>
                <option value="">{t('quotation.form.noForklift', 'Not selected yet')}</option>
                {forklifts.map((f) => (
                  <option key={f.id} value={f.id}>{f.serial_number} — {f.name_en}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('quotation.form.status', 'Status')}</label>
              <select {...register('status')}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{t(`quotation.status.${s}`)}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>{t('quotation.form.expectedStartDate', 'Expected Start Date')} <span className="required">*</span></label>
              <input type="date" {...register('expected_start_date')} />
              {errors.expected_start_date && <span className="field-error">{fieldError(errors.expected_start_date.message)}</span>}
            </div>
            <div className="form-group">
              <label>{t('quotation.form.expectedEndDate', 'Expected End Date')} <span className="required">*</span></label>
              <input type="date" {...register('expected_end_date')} />
              {errors.expected_end_date && <span className="field-error">{fieldError(errors.expected_end_date.message)}</span>}
            </div>
            <div className="form-group">
              <label>{t('quotation.form.dailyHoursQuota', 'Daily Hours Quota')}</label>
              <input type="number" step="1" min="1" max="24" {...register('daily_hours_quota', { valueAsNumber: true })} />
            </div>

            <div className="form-group">
              <label>{t('quotation.form.rentalPrice', 'Rental Price')} <span className="required">*</span></label>
              <input type="number" step="any" min="0" {...register('rental_price', { valueAsNumber: true })} />
              {errors.rental_price && <span className="field-error">{fieldError(errors.rental_price.message)}</span>}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label>{t('common.notes')}</label>
            <textarea rows={3} placeholder={t('quotation.form.notesPlaceholder', 'Optional notes about this quotation…')} {...register('notes')} />
          </div>
        </div>
      </form>
    </div>
  )
}
