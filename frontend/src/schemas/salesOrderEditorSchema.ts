import { z } from 'zod'

export const salesOrderHeaderSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  quotation_id: z.number().nullable(),
  customer_id: z.number().nullable(),
  assigned_to: z.number().nullable(),
  contact_name: z.string().optional(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  tax_rate: z.number().min(0).max(100),
  discount_amount: z.number().min(0),
  round_amount: z.number(),
  currency: z.string().min(1),
  exchange_rate: z.number().gt(0),
  order_date: z.string().optional().or(z.literal('')),
  expected_delivery_date: z.string().optional().or(z.literal('')),
  customer_reference: z.string().optional(),
  bank_details: z.string().optional(),

  // Vehicle / equipment information
  job_number: z.string().optional(),
  machine_type: z.string().optional(),
  vehicle_make: z.string().optional(),
  vehicle_model: z.string().optional(),
  vehicle_vin: z.string().optional(),
  vehicle_engine_no: z.string().optional(),
  hour_meter: z.number().nullable().optional(),
  vehicle_reg_no: z.string().optional(),
  location: z.string().optional(),

  // Footer
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  terms_conditions: z.string().optional(),
})

export type SalesOrderEditorFormValues = z.infer<typeof salesOrderHeaderSchema>

export const SALES_ORDER_EDITOR_DEFAULTS: SalesOrderEditorFormValues = {
  title: '',
  quotation_id: null,
  customer_id: null,
  assigned_to: null,
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  tax_rate: 0,
  discount_amount: 0,
  round_amount: 0,
  currency: 'LAK',
  exchange_rate: 1,
  order_date: '',
  expected_delivery_date: '',
  customer_reference: '',
  bank_details: '',
  job_number: '',
  machine_type: '',
  vehicle_make: '',
  vehicle_model: '',
  vehicle_vin: '',
  vehicle_engine_no: '',
  hour_meter: null,
  vehicle_reg_no: '',
  location: '',
  notes: '',
  internal_notes: '',
  terms_conditions: '',
}
