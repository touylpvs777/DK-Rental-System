import { z } from 'zod'
export const deliveryOrderSchema = z.object({ contract_id: z.number().min(1), order_type: z.enum(['delivery', 'return']), delivery_date: z.string().min(1), delivery_address: z.string().min(1), driver_name: z.string().min(1), status: z.enum(['pending', 'in_transit', 'delivered', 'cancelled']), notes: z.string().optional(), checklist_items: z.array(z.object({ item_group: z.string().min(1), item_name: z.string().min(1), is_passed: z.boolean(), remark: z.string().optional() })) })
export type DeliveryOrderFormValues = z.infer<typeof deliveryOrderSchema>
export const DELIVERY_ORDER_DEFAULTS: DeliveryOrderFormValues = { contract_id: 0, order_type: 'delivery', delivery_date: '', delivery_address: '', driver_name: '', status: 'pending', notes: '', checklist_items: [] }
