import { z } from 'zod'

// Messages are short codes, translated at render time — see
// ShiftHandoverForm's `fieldError()` helper for the same convention.
export const quotationSchema = z.object({
  customer_id: z.number().nullable(),
  forklift_id: z.number().nullable(),
  expected_start_date: z.string().min(1, 'required'),
  expected_end_date: z.string().min(1, 'required'),
  rental_price: z.number({ error: 'required' }).min(0, 'min0'),
  daily_hours_quota: z.number().min(1).max(24),
  status: z.enum(['draft', 'sent', 'approved', 'rejected']),
  notes: z.string().optional(),
})

export type QuotationFormValues = z.infer<typeof quotationSchema>

export const QUOTATION_EDITOR_DEFAULTS: QuotationFormValues = {
  customer_id: null,
  forklift_id: null,
  expected_start_date: '',
  expected_end_date: '',
  rental_price: 0,
  daily_hours_quota: 8,
  status: 'draft',
  notes: '',
}
