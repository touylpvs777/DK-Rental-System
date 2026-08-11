import { z } from 'zod'

export const invoiceHeaderSchema = z.object({
  customer_id: z.number().nullable(),
  reference_type: z.enum(['sales', 'work_order', 'rental']),
  reference_id: z.number().nullable(),
  issue_date: z.string().optional().or(z.literal('')),
  due_date: z.string().optional().or(z.literal('')),
  tax_rate: z.number().min(0).max(100),
  discount_amount: z.number().min(0),
  currency: z.string().min(1),
  exchange_rate: z.number().gt(0),
  bank_details: z.string().optional(),

  // Vehicle / equipment information — Invoice's model only has these 6 fields
  // (no machine_type/hour_meter/location, unlike Quotation/SalesOrder).
  vehicle_make: z.string().optional(),
  vehicle_model: z.string().optional(),
  vehicle_vin: z.string().optional(),
  vehicle_engine_no: z.string().optional(),
  vehicle_reg_no: z.string().optional(),
  job_number: z.string().optional(),

  // Footer — `notes` doubles as the Terms & Conditions print slot (Invoice
  // has no terms_conditions column, unlike Quotation/SalesOrder).
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
})

export type InvoiceEditorFormValues = z.infer<typeof invoiceHeaderSchema>

export const INVOICE_EDITOR_DEFAULTS: InvoiceEditorFormValues = {
  customer_id: null,
  reference_type: 'sales',
  reference_id: null,
  issue_date: '',
  due_date: '',
  tax_rate: 0,
  discount_amount: 0,
  currency: 'LAK',
  exchange_rate: 1,
  bank_details: '',
  vehicle_make: '',
  vehicle_model: '',
  vehicle_vin: '',
  vehicle_engine_no: '',
  vehicle_reg_no: '',
  job_number: '',
  notes: '',
  internal_notes: '',
}
