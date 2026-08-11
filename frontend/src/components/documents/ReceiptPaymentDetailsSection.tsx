import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { ReceiptEditorFormValues } from '@/schemas/receiptEditorSchema'
import './DocumentEditor.css'

const PAYMENT_METHOD_OPTIONS = ['cash', 'transfer', 'cheque'] as const
const BANK_ACCOUNT_OPTIONS = ['LDB', 'BCEL', 'Other'] as const

interface ReceiptPaymentDetailsSectionProps {
  readOnly: boolean
  currency: string
  invoiceBalanceDue: number | null
}

function fmtNum(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ReceiptPaymentDetailsSection({
  readOnly, currency, invoiceBalanceDue,
}: ReceiptPaymentDetailsSectionProps) {
  const { t } = useTranslation()
  const { register, watch, formState: { errors } } = useFormContext<ReceiptEditorFormValues>()
  const paymentMethod = watch('payment_method')

  return (
    <div className="doc-editor-section">
      <h3 className="doc-editor-section-title">{t('receipts.editor.paymentDetails')}</h3>
      <div className="doc-editor-header-grid">
        <div className="form-group">
          <label>{t('receipts.editor.paymentDate')} <span className="required">*</span></label>
          <input type="date" {...register('payment_date')} disabled={readOnly} />
        </div>
        <div className="form-group">
          <label>{t('receipts.editor.paymentMethod')}</label>
          <select {...register('payment_method')} disabled={readOnly}>
            {PAYMENT_METHOD_OPTIONS.map((m) => (
              <option key={m} value={m}>{t(`receipts.editor.paymentMethods.${m}`)}</option>
            ))}
          </select>
        </div>
        {paymentMethod !== 'cash' && (
          <div className="form-group">
            <label>{t('receipts.editor.bankAccount')}</label>
            <select {...register('bank_account')} disabled={readOnly}>
              <option value="">{t('receipts.editor.selectBankAccount')}</option>
              {BANK_ACCOUNT_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>{t('receipts.editor.referenceNumber')}</label>
          <input {...register('reference_number')} placeholder={t('receipts.editor.referenceNumberPlaceholder')} disabled={readOnly} />
        </div>
        <div className="form-group">
          <label>{t('receipts.editor.amountReceived')} <span className="required">*</span></label>
          <input
            type="number" step="any" min="0"
            {...register('amount_received', { valueAsNumber: true })}
            disabled={readOnly}
          />
          {errors.amount_received && <span className="field-error">{errors.amount_received.message}</span>}
        </div>
        {invoiceBalanceDue !== null && (
          <div className="form-group">
            <label>{t('receipts.editor.invoiceBalanceDue')}</label>
            <input value={`${fmtNum(invoiceBalanceDue)} ${currency}`} readOnly disabled />
          </div>
        )}
      </div>
    </div>
  )
}
