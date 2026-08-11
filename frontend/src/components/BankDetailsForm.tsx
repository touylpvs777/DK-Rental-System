import { useTranslation } from 'react-i18next'
import type { DocumentBankDetails } from './DocumentPreview'

export type { DocumentBankDetails }

export const EMPTY_BANK_DETAILS: DocumentBankDetails = {
  bankName: '',
  accountName: '',
  accountNumber: '',
  swift: '',
}

/**
 * Flattens the structured bank fields into the single freeform-text
 * `bank_details` string the backend stores today (invoices/quotations),
 * matching the same "Bank Name / Account Name / Account Number / SWIFT: x"
 * layout `DocumentPreview` already renders for structured `bankDetails`.
 */
export function serializeBankDetails(bankData: DocumentBankDetails): string {
  const lines = [
    bankData.bankName?.trim(),
    bankData.accountName?.trim(),
    bankData.accountNumber?.trim(),
    bankData.swift?.trim() ? `SWIFT: ${bankData.swift.trim()}` : undefined,
  ].filter(Boolean)
  return lines.join('\n')
}

interface BankDetailsFormProps {
  bankData: DocumentBankDetails
  onChange: (bankData: DocumentBankDetails) => void
  /** Hide the section title when the parent already renders its own heading. */
  hideTitle?: boolean
}

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-400'

/**
 * Per-document bank / payment-instructions form. Rendered inside each
 * financial document's create/edit form (invoice, quotation, purchase
 * order, etc.) so payment details can be tailored per transaction instead
 * of coming from one static company-wide setting.
 */
export default function BankDetailsForm({ bankData, onChange, hideTitle }: BankDetailsFormProps) {
  const { t } = useTranslation()

  const setField = (field: keyof DocumentBankDetails) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...bankData, [field]: e.target.value })

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {!hideTitle && <h3 className="mb-4 text-sm font-semibold text-slate-800">{t('settings.company.bankDetails.title')}</h3>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm text-slate-700">
          <span>{t('settings.company.bankDetails.bankName')}</span>
          <input className={fieldClass} value={bankData.bankName ?? ''} onChange={setField('bankName')} />
        </label>
        <label className="grid gap-1.5 text-sm text-slate-700">
          <span>{t('settings.company.bankDetails.accountName')}</span>
          <input className={fieldClass} value={bankData.accountName ?? ''} onChange={setField('accountName')} />
        </label>
        <label className="grid gap-1.5 text-sm text-slate-700">
          <span>{t('settings.company.bankDetails.accountNumber')}</span>
          <input className={fieldClass} value={bankData.accountNumber ?? ''} onChange={setField('accountNumber')} />
        </label>
        <label className="grid gap-1.5 text-sm text-slate-700">
          <span>{t('settings.company.bankDetails.swift')}</span>
          <input className={fieldClass} value={bankData.swift ?? ''} onChange={setField('swift')} />
        </label>
      </div>
    </div>
  )
}
