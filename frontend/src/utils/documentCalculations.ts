/**
 * Pure line-item / document total math, mirroring the backend's per-line-tax
 * model exactly (see `quotation_service.py`'s `_recalculate_totals` and
 * `QuotationItemOut`'s computed `discount_amount`/`tax_amount`/`total`):
 *   discount_amount = qty * unitPrice * discountPercent / 100
 *   line_total       = qty * unitPrice - discount_amount        (pre-tax)
 *   tax_amount       = line_total * taxPercent / 100
 *   line grand total = line_total + tax_amount
 *   subtotal         = sum(line_total)
 *   document tax     = sum(line tax_amount)
 *   grand total      = subtotal + document tax - discountAmount + roundAmount
 */

export interface DocumentLineItemInput {
  quantity: number
  unitPrice: number
  discountPercent: number
  taxPercent: number
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function calcDiscountAmount(item: DocumentLineItemInput): number {
  return round2((item.quantity * item.unitPrice * item.discountPercent) / 100)
}

export function calcLineTotal(item: DocumentLineItemInput): number {
  return round2(item.quantity * item.unitPrice - calcDiscountAmount(item))
}

export function calcLineTaxAmount(item: DocumentLineItemInput): number {
  return round2((calcLineTotal(item) * item.taxPercent) / 100)
}

export function calcLineGrandTotal(item: DocumentLineItemInput): number {
  return round2(calcLineTotal(item) + calcLineTaxAmount(item))
}

export function calcSubtotal(items: DocumentLineItemInput[]): number {
  return round2(items.reduce((sum, i) => sum + calcLineTotal(i), 0))
}

export function calcDocumentTax(items: DocumentLineItemInput[]): number {
  return round2(items.reduce((sum, i) => sum + calcLineTaxAmount(i), 0))
}

export function calcGrandTotal(
  subtotal: number,
  taxTotal: number,
  discountAmount: number,
  roundAmount: number,
): number {
  return round2(Math.max(subtotal + taxTotal - discountAmount + roundAmount, 0))
}

export function calcBalanceDue(grandTotal: number, amountPaid: number): number {
  return round2(Math.max(grandTotal - amountPaid, 0))
}

export interface DocumentTotals {
  subtotal: number
  taxTotal: number
  grandTotal: number
  balanceDue: number
}

export function calcDocumentTotals(
  items: DocumentLineItemInput[],
  discountAmount: number,
  roundAmount: number,
  amountPaid: number,
): DocumentTotals {
  const subtotal = calcSubtotal(items)
  const taxTotal = calcDocumentTax(items)
  const grandTotal = calcGrandTotal(subtotal, taxTotal, discountAmount, roundAmount)
  const balanceDue = calcBalanceDue(grandTotal, amountPaid)
  return { subtotal, taxTotal, grandTotal, balanceDue }
}
