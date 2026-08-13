import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle, ArrowRightLeft, ChevronLeft, Pencil, Trash2,
} from 'lucide-react'
import { getQuotation } from '@/api/quotation'
import { useQuotations } from '@/hooks/useQuotations'
import { QuotationStatusBadge } from '@/components/quotation/QuotationStatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { Quotation, QuotationConversionPrefill } from '@/types/quotation'
import '@/styles/shared.css'
import '@/styles/detail.css'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtAmount(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export default function QuotationDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { remove } = useQuotations()

  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    // isLoading already starts true (see useState above) — no need to set it
    // again here, and doing so is what trips react-hooks/set-state-in-effect.
    getQuotation(Number(id))
      .then(({ data }) => setQuotation(data))
      .catch(() => setError(t('quotation.detail.notFoundError', 'Quotation not found or failed to load.')))
      .finally(() => setIsLoading(false))
  }, [id, t])

  const handleDelete = async () => {
    if (!quotation) return
    setIsDeleting(true)
    const ok = await remove(quotation.id)
    setIsDeleting(false)
    if (ok) navigate('/quotations')
  }

  const handleConvertToContract = () => {
    if (!quotation) return
    const prefill: QuotationConversionPrefill = {
      quotation_id: quotation.id,
      quotation_no: quotation.quotation_no,
      customer_id: quotation.customer.id,
      forklift_id: quotation.forklift?.id ?? null,
      expected_start_date: quotation.expected_start_date,
      expected_end_date: quotation.expected_end_date,
      rental_price: quotation.rental_price,
      daily_hours_quota: quotation.daily_hours_quota,
    }
    navigate('/rental-contracts/new', { state: { fromQuotation: prefill } })
  }

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('common.loading')}</div>
  }

  if (error || !quotation) {
    return (
      <div>
        <button className="detail-back" onClick={() => navigate('/quotations')}><ChevronLeft size={16} /> {t('quotation.detail.backToQuotations', 'Back to Quotations')}</button>
        <div className="page-error" style={{ marginTop: 24 }}><AlertCircle size={16} /> {error}</div>
      </div>
    )
  }

  return (
    <div className="product-detail">
      <button className="detail-back" onClick={() => navigate('/quotations')}><ChevronLeft size={16} /> {t('quotation.detail.backToQuotations', 'Back to Quotations')}</button>

      <div className="detail-header">
        <div>
          <div className="detail-title-row">
            <h1 className="detail-name">{quotation.quotation_no}</h1>
          </div>
          <div className="detail-badges">
            <QuotationStatusBadge status={quotation.status} />
          </div>
        </div>

        <div className="detail-actions">
          {quotation.status === 'approved' && (
            <button className="btn btn-primary" onClick={handleConvertToContract}>
              <ArrowRightLeft size={14} /> {t('quotation.detail.convertToContract', 'Convert to Contract')}
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => navigate(`/quotations/${quotation.id}/edit`)}>
            <Pencil size={14} /> {t('common.edit')}
          </button>
          {quotation.status === 'draft' && (
            <button className="btn btn-secondary" onClick={() => setDeleteModal(true)}>
              <Trash2 size={14} /> {t('common.delete')}
            </button>
          )}
        </div>
      </div>

      <div className="detail-summary-grid">
        <div className="detail-summary-card">
          <div className="detail-summary-label">{t('quotation.detail.rentalPrice', 'Rental Price')}</div>
          <div className="detail-summary-value">{fmtAmount(quotation.rental_price)}</div>
        </div>
        <div className="detail-summary-card">
          <div className="detail-summary-label">{t('quotation.form.expectedStartDate', 'Expected Start Date')}</div>
          <div className="detail-summary-value">{fmtDate(quotation.expected_start_date)}</div>
        </div>
        <div className="detail-summary-card">
          <div className="detail-summary-label">{t('quotation.form.expectedEndDate', 'Expected End Date')}</div>
          <div className="detail-summary-value">{fmtDate(quotation.expected_end_date)}</div>
        </div>
        <div className="detail-summary-card">
          <div className="detail-summary-label">{t('quotation.form.dailyHoursQuota', 'Daily Hours Quota')}</div>
          <div className="detail-summary-value">{quotation.daily_hours_quota} h</div>
        </div>
      </div>

      <div className="detail-info-grid">
        <div>
          <dl className="detail-meta">
            <dt>{t('quotation.form.customer', 'Customer')}</dt>
            <dd>{quotation.customer.first_name} {quotation.customer.last_name}{quotation.customer.company ? ` (${quotation.customer.company})` : ''}</dd>
            <dt>{t('quotation.form.forklift', 'Forklift')}</dt>
            <dd>{quotation.forklift ? `${quotation.forklift.serial_number} — ${quotation.forklift.name_en}` : t('quotation.form.noForklift', 'Not selected yet')}</dd>
          </dl>
        </div>
        <div>
          <dl className="detail-meta">
            {quotation.creator && (<><dt>{t('quotation.detail.createdBy', 'Created By')}</dt><dd>{quotation.creator.full_name ?? quotation.creator.username}</dd></>)}
            <dt>{t('common.createdAt')}</dt>
            <dd>{fmtDate(quotation.created_at)}</dd>
          </dl>
        </div>
      </div>

      {quotation.notes && (
        <div className="detail-description" style={{ marginTop: 16 }}>
          <div className="detail-section-title">{t('common.notes')}</div>
          <p>{quotation.notes}</p>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title={t('quotation.list.deleteConfirmTitle', 'Delete quotation')}
        message={t('quotation.list.deleteConfirmMessage', 'Delete quotation {{number}}? This cannot be undone.', { number: quotation.quotation_no })}
      />
    </div>
  )
}
