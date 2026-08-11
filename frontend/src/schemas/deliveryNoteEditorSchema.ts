import { z } from 'zod'

export const deliveryNoteHeaderSchema = z.object({
  sales_order_id: z.number({ message: 'Sales order is required' }).nullable(),
  customer_id: z.number().nullable(),
  assigned_to: z.number().nullable(),
  delivery_date: z.string().optional().or(z.literal('')),
  delivery_address: z.string().optional(),
  warehouse: z.string().optional(),
  driver_name: z.string().optional(),
  vehicle_plate: z.string().optional(),
  customer_reference: z.string().optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  terms_conditions: z.string().optional(),
})

export type DeliveryNoteEditorFormValues = z.infer<typeof deliveryNoteHeaderSchema>

export const DELIVERY_NOTE_EDITOR_DEFAULTS: DeliveryNoteEditorFormValues = {
  sales_order_id: null,
  customer_id: null,
  assigned_to: null,
  delivery_date: '',
  delivery_address: '',
  warehouse: '',
  driver_name: '',
  vehicle_plate: '',
  customer_reference: '',
  notes: '',
  internal_notes: '',
  terms_conditions: '',
}
