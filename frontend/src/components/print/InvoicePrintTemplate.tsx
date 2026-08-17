import { resolveMediaUrl } from '@/utils/media'
import { amountInWords } from '@/utils/amountInWords'
import { DEFAULT_BANK_ACCOUNTS } from './invoiceBankAccounts'
import './InvoicePrintTemplate.css'

export interface InvoicePrintCompany {
  name: string
  address?: string
  tel?: string
  fax?: string
  website?: string
  email?: string
  logoUrl?: string | null
}

export interface InvoicePrintCustomer {
  name: string
  tel?: string
  address?: string
}

export interface InvoicePrintEquipment {
  jobNumber?: string
  make?: string
  model?: string
  engineNo?: string
  vinSerial?: string
  regNo?: string
  /** Odometer/hour-meter reading — "KM/HOUR" on the meta box. No natural
   *  source on a plain Invoice today (it has no linked hour-meter field),
   *  so this stays optional and degrades to "—" like the other cells. */
  hourMeter?: string
  terms?: string
}

export interface InvoicePrintLineItem {
  itemCode?: string
  description: string
  qty: number
  unit?: string
  price: number
  amount: number
}

export interface InvoicePrintBankAccount {
  bank: string
  currency: string
  accountName: string
  accountNumber: string
}

export interface InvoicePrintTemplateProps {
  invoiceNumber: string
  date: string
  refLabel?: string

  company: InvoicePrintCompany
  customer: InvoicePrintCustomer
  equipment?: InvoicePrintEquipment

  items: InvoicePrintLineItem[]

  subtotal: number
  vatRate: number
  vatAmount: number
  total: number
  currency?: string
  /** Shown as an extra line under Total Invoice when the document currency isn't the base currency. */
  totalInBaseCurrency?: { amount: number; currency: string }

  /** Per-invoice freeform bank details text, if the document overrides the standard accounts. */
  bankDetailsText?: string | null
  /** Standard company bank accounts shown when no per-invoice override is set. */
  bankAccounts?: InvoicePrintBankAccount[]

  issuedByLabel?: string
  approvedByLabel?: string
  receivedByLabel?: string

  /** Renders a "Say: <Currency> <words> Only" line under Total Invoice. */
  showAmountInWords?: boolean
  /** Freeform notes block (Invoice has no terms_conditions column — `notes` is
   *  reused for this print slot), rendered only when non-empty. */
  notesText?: string | null
  notesLabel?: string

  /** Partner/dealership logos strip along the bottom, above the signatures. */
  partnerLogos?: string[]
}

const DEFAULT_PARTNER_LOGOS = ['Cummins', 'MITSUBISHI FORKLIFT TRUCKS', 'Kwick service', 'JUNGHEINRICH', 'Bangchak', 'Nilfisk', 'JLG']

const CURRENCY_SYMBOLS: Record<string, string> = { LAK: '₭', THB: '฿', USD: '$' }

function fmtNum(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtCurrency(n: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency]
  return symbol ? `${symbol} ${fmtNum(n)}` : fmtNum(n)
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-[10px]">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  )
}

function EquipmentCell({ labelEn, labelLo, value }: { labelEn: string; labelLo?: string; value?: string }) {
  return (
    <div className="flex-1 min-w-0 border-r border-gray-300 last:border-r-0 px-2 py-1.5">
      <div className="text-[8px] font-bold uppercase tracking-wide text-gray-500">
        {labelEn}
        {labelLo && <span className="font-normal normal-case"> / {labelLo}</span>}
      </div>
      <div className="text-[10px] font-semibold text-gray-900 truncate">{value || '—'}</div>
    </div>
  )
}

export default function InvoicePrintTemplate({
  invoiceNumber,
  date,
  refLabel,
  company,
  customer,
  equipment,
  items,
  subtotal,
  vatRate,
  vatAmount,
  total,
  currency = 'LAK',
  totalInBaseCurrency,
  bankDetailsText,
  bankAccounts = DEFAULT_BANK_ACCOUNTS,
  issuedByLabel = 'Issued By (Accounts Receivable)',
  approvedByLabel = 'Approved By (Finance Manager)',
  receivedByLabel = 'Received By (Customer)',
  showAmountInWords = false,
  notesText,
  notesLabel = 'Notes',
  partnerLogos = DEFAULT_PARTNER_LOGOS,
}: InvoicePrintTemplateProps) {
  // Falls back to the bundled brand logo until an admin uploads a custom one
  // via Settings > Company Profile — same convention as the sidebar, so a
  // fresh install prints a real logo instead of a blank header.
  const logoSrc = resolveMediaUrl(company.logoUrl) ?? '/dk-lao-logo.png'
  const useOverrideBank = !!bankDetailsText?.trim()

  return (
    <div
      className="
        invoice-print-root mx-auto w-[210mm] min-h-[297mm] bg-white text-gray-900
        p-[10mm_12mm_16mm] box-border text-[10.5px] leading-snug
        shadow-lg print:shadow-none print:w-full print:m-0 print:p-[10mm_12mm_16mm]
        flex flex-col
      "
    >
      {/* 1a. Top-center company logo + name */}
      <div className="text-center mb-2">
        <img src={logoSrc} alt="DK LAO" className="h-16 mx-auto mb-2 object-contain" />
        <div className="text-[13px] font-extrabold uppercase tracking-wide">{company.name}</div>
      </div>

      {/* 1b. Bill-to (left) / document title + company contact (right) */}
      <div className="flex items-start justify-between gap-6 pb-2 mb-2.5 border-b-2 border-gray-900">
        <div className="w-[85mm]">
          <div className="border border-gray-300 rounded px-2.5 py-1.5">
            <div className="text-[8.5px] font-bold uppercase tracking-wide text-gray-500">Bill To / ຊື່ລູກຄ້າ</div>
            <div className="text-[11.5px] font-bold text-gray-900 leading-tight">{customer.name}</div>
            {customer.tel && <div className="text-[9.5px] text-gray-700">TEL: {customer.tel}</div>}
            {customer.address && <div className="text-[9.5px] text-gray-700">{customer.address}</div>}
          </div>
        </div>

        <div className="w-[70mm] shrink-0 text-right">
          <div className="text-[15px] font-extrabold uppercase tracking-[0.1em] mb-1.5">ໃບເກັບເງິນ / Invoice</div>
          <div className="grid gap-0.5">
            <InfoRow label="ວັນທີ / Date" value={date} />
            <InfoRow label="ເລກທີ / Invoice No." value={invoiceNumber} />
            {refLabel && <InfoRow label="Ref." value={refLabel} />}
          </div>
          <div className="text-[9px] text-gray-600 mt-1.5 pt-1.5 border-t border-gray-200 grid gap-0.5">
            {company.address && <div>{company.address}</div>}
            {company.tel && <div>Tel: {company.tel}</div>}
            {company.email && <div>Email: {company.email}</div>}
          </div>
        </div>
      </div>

      {/* 2. Document title */}
      <div className="text-center mb-2">
        <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-500">Sales - Rentals - Service - Spare Parts</div>
      </div>

      {/* 3. Meta data box: Job No, Reg#, Make, Model, VIN/Serial#, Engine#, KM/Hour */}
      {equipment && (
        <div className="invoice-print-force-color flex border border-gray-300 divide-x divide-gray-300 bg-gray-50 mb-3">
          <EquipmentCell labelEn="JOB #" labelLo="ໃບສັ່ງສ້ອມ" value={equipment.jobNumber} />
          <EquipmentCell labelEn="REG#" labelLo="ເລກທະບຽນ" value={equipment.regNo} />
          <EquipmentCell labelEn="MAKE" labelLo="ຍີ່ຫໍ້" value={equipment.make} />
          <EquipmentCell labelEn="MODEL" labelLo="ຮຸ່ນ" value={equipment.model} />
          <EquipmentCell labelEn="VIN/SERIAL#" labelLo="ເລກຖັງ" value={equipment.vinSerial} />
          <EquipmentCell labelEn="ENGINE#" labelLo="ເລກຈັກ" value={equipment.engineNo} />
          <EquipmentCell labelEn="KM/HOUR" labelLo="ໄມ/ຊົ່ວໂມງ" value={equipment.hourMeter} />
        </div>
      )}

      {/* 4. Line items table */}
      <table className="w-full border-collapse mb-3 print:break-inside-auto">
        <thead>
          <tr className="invoice-print-force-color">
            <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left text-[9px] font-bold uppercase w-[14%]">Item Code</th>
            <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left text-[9px] font-bold uppercase">Description</th>
            <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-right text-[9px] font-bold uppercase w-[8%]">Qty</th>
            <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left text-[9px] font-bold uppercase w-[9%]">U/M</th>
            <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-right text-[9px] font-bold uppercase w-[15%]">Unit Price</th>
            <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-right text-[9px] font-bold uppercase w-[16%]">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className="border border-gray-300 px-2 py-4 text-center text-gray-400">No line items</td>
            </tr>
          ) : items.map((it, i) => (
            <tr key={i} className="break-inside-avoid">
              <td className="border border-gray-300 px-2 py-1">{it.itemCode || '—'}</td>
              <td className="border border-gray-300 px-2 py-1">{it.description}</td>
              <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">{it.qty}</td>
              <td className="border border-gray-300 px-2 py-1">{it.unit || '—'}</td>
              <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">{fmtNum(it.price)}</td>
              <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">{fmtNum(it.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 5. Footer: bank details + totals (aligned to the right, bottom of the table) */}
      <div className="flex justify-between items-start gap-6">
        <div className="flex-1 border border-gray-300 rounded px-3 py-2">
          <div className="text-[9px] font-bold uppercase tracking-wide text-gray-500 mb-1">Bank Details / ບັນຊີທະນາຄານ</div>
          {useOverrideBank ? (
            <div className="whitespace-pre-wrap text-[9.5px]">{bankDetailsText!.trim()}</div>
          ) : (
            <table className="w-full text-[9px] border-collapse">
              <tbody>
                {bankAccounts.map((acc, i) => (
                  <tr key={i}>
                    <td className="py-0.5 pr-2 font-semibold whitespace-nowrap">{acc.bank}</td>
                    <td className="py-0.5 pr-2 text-gray-600">{acc.currency}</td>
                    <td className="py-0.5 pr-2 text-gray-600">{acc.accountName}</td>
                    <td className="py-0.5 tabular-nums text-gray-900">{acc.accountNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="w-[62mm] shrink-0">
          <div className="flex justify-between py-0.5 text-[10.5px]">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmtCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between py-0.5 text-[10.5px]">
            <span>VAT ({vatRate.toFixed(1)}%)</span>
            <span className="tabular-nums">{fmtCurrency(vatAmount, currency)}</span>
          </div>
          <div className="invoice-print-force-color flex justify-between border-t-2 border-gray-900 mt-1 pt-1.5 px-1 font-extrabold text-[12.5px] bg-gray-50">
            <span>Total Invoice</span>
            <span className="tabular-nums">{fmtCurrency(total, currency)}</span>
          </div>
          {showAmountInWords && currency && (
            <div className="pt-1 text-[8.5px] italic text-gray-600">
              {amountInWords(total, currency)}
            </div>
          )}
          {totalInBaseCurrency && totalInBaseCurrency.currency !== currency && (
            <div className="flex justify-between pt-1 text-[9px] text-gray-500 italic">
              <span>Total ({totalInBaseCurrency.currency}, Base Currency)</span>
              <span className="tabular-nums">{fmtCurrency(totalInBaseCurrency.amount, totalInBaseCurrency.currency)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {notesText && notesText.trim() && (
        <div className="border border-gray-300 rounded px-3 py-2 mt-3">
          <div className="text-[9px] font-bold uppercase tracking-wide text-gray-500 mb-0.5">{notesLabel}</div>
          <div className="whitespace-pre-wrap text-[9.5px]">{notesText.trim()}</div>
        </div>
      )}

      {/* Signatures */}
      <div className="flex justify-between gap-8 mt-10">
        <div className="flex-1 text-center">
          <div className="border-t border-gray-900 h-10 mb-1.5" />
          <div className="text-[9.5px] text-gray-700">{issuedByLabel}</div>
        </div>
        <div className="flex-1 text-center">
          <div className="border-t border-gray-900 h-10 mb-1.5" />
          <div className="text-[9.5px] text-gray-700">{approvedByLabel}</div>
        </div>
        <div className="flex-1 text-center">
          <div className="border-t border-gray-900 h-10 mb-1.5" />
          <div className="text-[9.5px] text-gray-700">{receivedByLabel}</div>
        </div>
      </div>

      {/* 6. Partner logos strip — pinned to the very bottom of the page */}
      <div className="invoice-print-force-color invoice-print-tagline mt-auto pt-3 border-t border-gray-300 flex divide-x divide-gray-300 bg-gray-50">
        {partnerLogos.map((brand) => (
          <div
            key={brand}
            className="flex-1 h-9 flex items-center justify-center px-1 text-center text-[7.5px] font-bold uppercase tracking-tight text-gray-700"
          >
            {brand}
          </div>
        ))}
      </div>
    </div>
  )
}
