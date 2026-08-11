import { z } from 'zod'

// Vehicle info is intentionally not part of this form: it's carried over
// automatically from the linked Invoice by the backend on create (see
// ReceiptService.create_receipt) and shown read-only in the print preview —
// a payment receipt doesn't need its own editable vehicle block.
export const receiptHeaderSchema = z.object({
  invoice_id: z.number().nullable(),
  customer_id: z.number().nullable(),
  assigned_to: z.number().nullable(),
  payment_date: z.string().optional().or(z.literal('')),
  payment_method: z.enum(['cash', 'transfer', 'cheque']),
  bank_account: z.string().optional(),
  reference_number: z.string().optional(),
  amount_received: z.number().gt(0, 'Amount received must be greater than zero'),
  currency: z.string().min(1),
  exchange_rate: z.number().gt(0),
  customer_reference: z.string().optional(),

  // Footer
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  terms_conditions: z.string().optional(),
})

export type ReceiptEditorFormValues = z.infer<typeof receiptHeaderSchema>

export const RECEIPT_EDITOR_DEFAULTS: ReceiptEditorFormValues = {
  invoice_id: null,
  customer_id: null,
  assigned_to: null,
  payment_date: '',
  payment_method: 'cash',
  bank_account: '',
  reference_number: '',
  amount_received: 0,
  currency: 'LAK',
  exchange_rate: 1,
  customer_reference: '',
  notes: '',
  internal_notes: '',
  terms_conditions: '',
}
