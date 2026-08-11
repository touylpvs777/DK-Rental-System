import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { DocumentHeaderFormValues } from '@/schemas/documentEditorSchema'
import './DocumentEditor.css'

const CURRENCY_SYMBOLS: Record<string, string> = { LAK: '₭', THB: '฿', USD: '$', CNY: '¥' }

function fmt(n: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency]
  const num = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return symbol ? `${symbol} ${num}` : num
}

interface DocumentTotalsPanelProps {
  subtotal: number
  taxTotal: number
  grandTotal: number
  balanceDue?: number
  currency: string
  readOnly: boolean
  /** Balance Due only makes sense for documents tracking payments against them (Invoice), not Quotation. */
  showBalanceDue?: boolean
  /** Round Amount has no backing field on Invoice — hide the (otherwise dead) control there. */
  showRoundAmount?: boolean
}

export default function DocumentTotalsPanel({
  subtotal, taxTotal, grandTotal, balanceDue, currency, readOnly, showBalanceDue = false,
  showRoundAmount = true,
}: DocumentTotalsPanelProps) {
  const { t } = useTranslation()
  const { register } = useFormContext<DocumentHeaderFormValues>()

  return (
    <div className="doc-editor-totals">
      <div className="doc-editor-totals-row">
        <span>{t('documentEditor.totals.subtotal')}</span>
        <span className="doc-editor-totals-value">{fmt(subtotal, currency)}</span>
      </div>

      <div className="doc-editor-totals-row">
        <span>{t('documentEditor.totals.discount')}</span>
        <input
          type="number" step="any" min="0" className="doc-editor-totals-input"
          {...register('discount_amount', { valueAsNumber: true })}
          disabled={readOnly}
        />
      </div>

      <div className="doc-editor-totals-row">
        <span>{t('documentEditor.totals.vat')}</span>
        <span className="doc-editor-totals-value">{fmt(taxTotal, currency)}</span>
      </div>

      <div className="doc-editor-totals-row doc-editor-totals-default-rate">
        <span>
          {t('documentEditor.totals.defaultTaxRate')}
          <input
            type="number" step="any" min="0" max="100" className="doc-editor-totals-rate-input"
            {...register('tax_rate', { valueAsNumber: true })}
            disabled={readOnly}
          />%
        </span>
      </div>

      {showRoundAmount && (
        <div className="doc-editor-totals-row">
          <span>{t('documentEditor.totals.roundAmount')}</span>
          <input
            type="number" step="any" className="doc-editor-totals-input"
            {...register('round_amount', { valueAsNumber: true })}
            disabled={readOnly}
          />
        </div>
      )}

      <div className="doc-editor-totals-row doc-editor-totals-grand">
        <span>{t('documentEditor.totals.grandTotal')}</span>
        <span className="doc-editor-totals-value">{fmt(grandTotal, currency)}</span>
      </div>

      {showBalanceDue && (
        <div className="doc-editor-totals-row">
          <span>{t('documentEditor.totals.balanceDue')}</span>
          <span className="doc-editor-totals-value">{fmt(balanceDue ?? grandTotal, currency)}</span>
        </div>
      )}
    </div>
  )
}
