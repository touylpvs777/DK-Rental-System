import type { ReactNode } from 'react'
import { amountInWords } from '@/utils/amountInWords'

export type DocumentType = 'invoice' | 'quotation' | 'purchase_order' | 'sales_order' | 'receipt' | 'work_order' | 'rental_contract'

export interface DocumentLineItem {
  itemCode?: string
  description: string
  qty: number
  unit?: string
  unitPrice: number
  total: number
}

export interface DocumentVehicleInfo {
  make?: string
  model?: string
  vin?: string
  engineNo?: string
  regNo?: string
  jobNumber?: string
  machineType?: string
  hourMeter?: number | null
  location?: string
}

export interface DocumentBankDetails {
  bankName?: string
  accountName?: string
  accountNumber?: string
  swift?: string
}

export interface DocumentBaseCurrencyTotal {
  amount: number
  currency: string
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  LAK: '₭',
  THB: '฿',
  USD: '$',
  CNY: '¥',
}

export interface DocumentPreviewProps {
  docType: DocumentType
  documentNumber: string
  date: string

  companyName?: string
  companyAddress?: string
  companyPhone?: string

  /** "Bill To" / "Customer" / "Vendor" */
  partyLabel: string
  partyName: string
  partyAddress?: string
  partyContact?: string

  vehicle?: DocumentVehicleInfo

  items: DocumentLineItem[]

  subtotal: number
  taxRate: number
  taxAmount: number
  grandTotal: number
  currency?: string

  showBankDetails?: boolean
  bankDetails?: DocumentBankDetails
  /** Freeform bank-details text (e.g. pasted/typed per-document) — takes priority over `bankDetails` when present. */
  bankDetailsText?: string

  /** Shown as an extra line under Grand Total when the document currency isn't the base currency. */
  grandTotalInBaseCurrency?: DocumentBaseCurrencyTotal

  issuedByLabel?: string
  approvedByLabel?: string

  /** A4 orientation for both the screen preview sizing and the print `@page`. */
  layout?: 'portrait' | 'landscape'

  /** e.g. "Quotation" / "Sales Order" — the document this one was converted/created from. */
  referenceLabel?: string
  referenceValue?: string

  /** Freeform terms/notes block, rendered only when non-empty. */
  termsText?: string
  termsLabel?: string

  /** Renders a "Say: <Currency> <words> Only" line under Grand Total. */
  showAmountInWords?: boolean
}

function fmtCurrency(n: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency]
  const num = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return symbol ? `${symbol} ${num} ${currency}` : `${num} ${currency}`.trim()
}

const DOC_TITLE: Record<DocumentType, string> = {
  invoice: 'INVOICE',
  quotation: 'QUOTATION',
  purchase_order: 'PURCHASE ORDER',
  sales_order: 'SALES ORDER',
  receipt: 'RECEIPT',
  work_order: 'WORK ORDER',
  rental_contract: 'RENTAL CONTRACT',
}

function fmtNum(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-[11px]">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{children}</span>
    </div>
  )
}

export default function DocumentPreview({
  docType,
  documentNumber,
  date,
  companyName = 'DK LAO TRADING',
  companyAddress,
  companyPhone,
  partyLabel,
  partyName,
  partyAddress,
  partyContact,
  vehicle,
  items,
  subtotal,
  taxRate,
  taxAmount,
  grandTotal,
  currency = '',
  showBankDetails = false,
  bankDetails,
  bankDetailsText,
  grandTotalInBaseCurrency,
  issuedByLabel = 'Issued By',
  approvedByLabel = 'Approved By',
  layout = 'portrait',
  referenceLabel,
  referenceValue,
  termsText,
  termsLabel = 'Terms & Conditions',
  showAmountInWords = false,
}: DocumentPreviewProps) {
  const hasVehicle = !!(vehicle && (
    vehicle.make || vehicle.model || vehicle.vin || vehicle.engineNo || vehicle.regNo
    || vehicle.jobNumber || vehicle.machineType || vehicle.hourMeter || vehicle.location
  ))
  const isLandscape = layout === 'landscape'

  return (
    <div
      className={`
        mx-auto bg-white text-gray-900
        p-[14mm_12mm] box-border text-[11.5px] leading-relaxed
        shadow-lg print:shadow-none print:m-0 print:p-[14mm_12mm]
        ${isLandscape ? 'w-[297mm] min-h-[210mm] doc-preview-landscape' : 'w-[210mm] min-h-[297mm]'}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-gray-900 pb-3 mb-4">
        <div>
          <div className="text-lg font-extrabold tracking-wide">{companyName}</div>
          {companyAddress && <div className="text-[11px] text-gray-600 mt-0.5">{companyAddress}</div>}
          {companyPhone && <div className="text-[11px] text-gray-600">{companyPhone}</div>}
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold uppercase tracking-widest text-gray-900 mb-1.5">{DOC_TITLE[docType]}</div>
          <Field label="Date">{date}</Field>
          <Field label="Document No.">{documentNumber}</Field>
          {referenceLabel && referenceValue && (
            <Field label={referenceLabel}>{referenceValue}</Field>
          )}
        </div>
      </div>

      {/* Party details */}
      <div className="border border-gray-300 rounded px-3 py-2 mb-3">
        <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-0.5">{partyLabel}</div>
        <div className="font-bold text-[12.5px]">{partyName}</div>
        {partyAddress && <div className="text-gray-700">{partyAddress}</div>}
        {partyContact && <div className="text-gray-700">{partyContact}</div>}
      </div>

      {/* Vehicle info */}
      {hasVehicle && (
        <div className="border border-gray-300 rounded px-3 py-2 mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Vehicle Information</div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <div><span className="text-gray-500">Job No.:</span> {vehicle?.jobNumber || '—'}</div>
            <div><span className="text-gray-500">Machine:</span> {vehicle?.machineType || '—'}</div>
            <div><span className="text-gray-500">Brand:</span> {vehicle?.make || '—'}</div>
            <div><span className="text-gray-500">Model:</span> {vehicle?.model || '—'}</div>
            <div><span className="text-gray-500">VIN:</span> {vehicle?.vin || '—'}</div>
            <div><span className="text-gray-500">Engine No.:</span> {vehicle?.engineNo || '—'}</div>
            <div><span className="text-gray-500">Hour Meter:</span> {vehicle?.hourMeter != null ? vehicle.hourMeter : '—'}</div>
            <div><span className="text-gray-500">Plate No.:</span> {vehicle?.regNo || '—'}</div>
            <div><span className="text-gray-500">Location:</span> {vehicle?.location || '—'}</div>
          </div>
        </div>
      )}

      {/* Line items */}
      <table className="w-full border-collapse mb-4">
        <thead>
          <tr>
            <th className="border border-gray-300 bg-gray-800 text-white px-2 py-1 text-left text-[10px] font-bold uppercase tracking-wide">Item Code</th>
            <th className="border border-gray-300 bg-gray-800 text-white px-2 py-1 text-left text-[10px] font-bold uppercase tracking-wide">Description</th>
            <th className="border border-gray-300 bg-gray-800 text-white px-2 py-1 text-left text-[10px] font-bold uppercase tracking-wide">Qty</th>
            <th className="border border-gray-300 bg-gray-800 text-white px-2 py-1 text-left text-[10px] font-bold uppercase tracking-wide">Unit</th>
            <th className="border border-gray-300 bg-gray-800 text-white px-2 py-1 text-left text-[10px] font-bold uppercase tracking-wide">Unit Price</th>
            <th className="border border-gray-300 bg-gray-800 text-white px-2 py-1 text-left text-[10px] font-bold uppercase tracking-wide">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td className="border border-gray-300 px-2 py-1">{it.itemCode || '—'}</td>
              <td className="border border-gray-300 px-2 py-1">{it.description}</td>
              <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">{it.qty}</td>
              <td className="border border-gray-300 px-2 py-1">{it.unit || '—'}</td>
              <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">{fmtNum(it.unitPrice)}</td>
              <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">{fmtNum(it.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer: bank details + totals */}
      <div className="flex justify-between items-start gap-6 mb-8">
        <div className="flex-1">
          {showBankDetails && bankDetailsText && bankDetailsText.trim() && (
            <div className="border border-gray-300 rounded px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-0.5">Bank Details</div>
              <div className="whitespace-pre-wrap">{bankDetailsText.trim()}</div>
            </div>
          )}
          {showBankDetails && !bankDetailsText?.trim() && bankDetails && (bankDetails.bankName || bankDetails.accountNumber) && (
            <div className="border border-gray-300 rounded px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-0.5">Bank Details</div>
              {bankDetails.bankName && <div>{bankDetails.bankName}</div>}
              {bankDetails.accountName && <div>{bankDetails.accountName}</div>}
              {bankDetails.accountNumber && <div>{bankDetails.accountNumber}</div>}
              {bankDetails.swift && <div>SWIFT: {bankDetails.swift}</div>}
            </div>
          )}
        </div>
        <div className="min-w-[240px]">
          <div className="flex justify-between py-0.5">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmtCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span>VAT ({taxRate}%)</span>
            <span className="tabular-nums">{fmtCurrency(taxAmount, currency)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-gray-900 mt-1 pt-1.5 font-extrabold text-[13px]">
            <span>Grand Total</span>
            <span className="tabular-nums">{fmtCurrency(grandTotal, currency)}</span>
          </div>
          {showAmountInWords && currency && (
            <div className="pt-1 text-[10px] italic text-gray-600">
              {amountInWords(grandTotal, currency)}
            </div>
          )}
          {grandTotalInBaseCurrency && grandTotalInBaseCurrency.currency !== currency && (
            <div className="flex justify-between pt-1 text-[10.5px] text-gray-500 italic">
              <span>Grand Total ({grandTotalInBaseCurrency.currency}, Base Currency)</span>
              <span className="tabular-nums">{fmtCurrency(grandTotalInBaseCurrency.amount, grandTotalInBaseCurrency.currency)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Terms & conditions / notes */}
      {termsText && termsText.trim() && (
        <div className="border border-gray-300 rounded px-3 py-2 mb-8">
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-0.5">{termsLabel}</div>
          <div className="whitespace-pre-wrap text-[10.5px]">{termsText.trim()}</div>
        </div>
      )}

      {/* Signatures */}
      <div className="flex justify-between gap-10 mt-10">
        <div className="flex-1 text-center">
          <div className="border-t border-gray-900 h-10 mb-1.5" />
          <div className="text-[10.5px] text-gray-600">{issuedByLabel}</div>
        </div>
        <div className="flex-1 text-center">
          <div className="border-t border-gray-900 h-10 mb-1.5" />
          <div className="text-[10.5px] text-gray-600">{approvedByLabel}</div>
        </div>
      </div>
    </div>
  )
}
