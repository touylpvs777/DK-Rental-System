import { z } from 'zod'

export const workOrderHeaderSchema = z.object({
  forklift_id: z.number().nullable(),
  order_type: z.enum(['preventive', 'corrective', 'emergency', 'inspection', 'install']),
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().optional(),
  assigned_to: z.number().nullable(),
  scheduled_date: z.string().min(1, 'Scheduled date is required'),
  priority: z.enum(['low', 'normal', 'high', 'critical']),
  estimated_hours: z.number().min(0),
  estimated_cost: z.number().min(0),
})

export type WorkOrderEditorFormValues = z.infer<typeof workOrderHeaderSchema>

export const WORK_ORDER_EDITOR_DEFAULTS: WorkOrderEditorFormValues = {
  forklift_id: null,
  order_type: 'preventive',
  title: '',
  description: '',
  assigned_to: null,
  scheduled_date: '',
  priority: 'normal',
  estimated_hours: 1,
  estimated_cost: 0,
}
