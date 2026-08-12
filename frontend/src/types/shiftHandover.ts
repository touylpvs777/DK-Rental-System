export type ShiftName = 'Morning' | 'Afternoon' | 'Night'
export type ChecklistStatus = 'Normal' | 'Issues Found'

export interface ForkliftBrief {
  id: number
  serial_number: string
  name_en: string
}

export interface RentalContractBrief {
  id: number
  contract_number: string
  status: string
}

export interface UserBrief {
  id: number
  username: string
  full_name: string | null
}

export interface ShiftHandoverSignatures {
  handover_person?: string | null
  receiver_person?: string | null
}

export interface ShiftHandover {
  id: number
  rental_contract: RentalContractBrief
  forklift: ForkliftBrief
  handover_datetime: string
  shift_name: string
  handover_person: string
  receiver_person: string
  hour_meter: number
  checklist_status: string
  issues_description: string | null
  issue_photos: string[] | null
  signatures: ShiftHandoverSignatures | null
  creator: UserBrief | null
  created_at: string
  updated_at: string | null
}

export interface ShiftHandoverListResponse {
  items: ShiftHandover[]
  total: number
}

export interface ShiftHandoverCreate {
  rental_contract_id: number
  forklift_id: number
  handover_datetime: string
  shift_name: string
  handover_person: string
  receiver_person: string
  hour_meter: number
  checklist_status?: string
  issues_description?: string | null
  issue_photos?: string[] | null
  signatures?: ShiftHandoverSignatures | null
}

export interface ShiftHandoverUpdate {
  handover_datetime?: string
  shift_name?: string
  handover_person?: string
  receiver_person?: string
  hour_meter?: number
  checklist_status?: string
  issues_description?: string | null
  issue_photos?: string[] | null
  signatures?: ShiftHandoverSignatures | null
}

export interface ShiftHandoverListParams {
  rental_contract_id?: number
  forklift_id?: number
  skip?: number
  limit?: number
}
