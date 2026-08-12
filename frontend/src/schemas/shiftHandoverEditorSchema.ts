import { z } from 'zod'

// Messages are short codes (not display text) — translated at render time via
// t(`shiftHandover.validation.${code}`), so this schema doesn't hardcode
// English UI copy.
export const shiftHandoverSchema = z.object({
  rental_contract_id: z.number().nullable(),
  forklift_id: z.number().nullable(),
  handover_datetime: z.string().min(1, 'required'),
  shift_name: z.enum(['Morning', 'Afternoon', 'Night']),
  handover_person: z.string().trim().min(1, 'required'),
  receiver_person: z.string().trim().min(1, 'required'),
  hour_meter: z.number({ error: 'required' }).min(0, 'min0'),
  checklist_status: z.enum(['Normal', 'Issues Found']),
  issues_description: z.string().optional(),
}).refine(
  (v) => v.checklist_status !== 'Issues Found' || !!v.issues_description?.trim(),
  { message: 'issueDescRequired', path: ['issues_description'] },
)

export type ShiftHandoverFormValues = z.infer<typeof shiftHandoverSchema>

export const SHIFT_HANDOVER_DEFAULTS: ShiftHandoverFormValues = {
  rental_contract_id: null,
  forklift_id: null,
  handover_datetime: '',
  shift_name: 'Morning',
  handover_person: '',
  receiver_person: '',
  hour_meter: 0,
  checklist_status: 'Normal',
  issues_description: '',
}
