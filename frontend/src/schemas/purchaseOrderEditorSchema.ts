import { z } from 'zod'

export const purchaseOrderHeaderSchema = z.object({
  vendor: z.string().trim().min(1, 'Vendor is required'),
  vendor_address: z.string().optional(),
  vendor_contact: z.string().optional(),
  partner_id: z.number().nullable(),
  warehouse_id: z.number().nullable(),
  order_date: z.string().optional().or(z.literal('')),
  expected_date: z.string().optional().or(z.literal('')),
  tax_rate: z.number().min(0).max(100),
  notes: z.string().optional(),
})

export type PurchaseOrderEditorFormValues = z.infer<typeof purchaseOrderHeaderSchema>

export const PURCHASE_ORDER_EDITOR_DEFAULTS: PurchaseOrderEditorFormValues = {
  vendor: '',
  vendor_address: '',
  vendor_contact: '',
  partner_id: null,
  warehouse_id: null,
  order_date: '',
  expected_date: '',
  tax_rate: 10,
  notes: '',
}
