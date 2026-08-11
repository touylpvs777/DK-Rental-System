export type MovementType = 'warehouse_transfer' | 'customer_deployment' | 'customer_return' | 'internal_relocation'
export type MovementStatus = 'draft' | 'preparing' | 'in_transit' | 'delivered' | 'completed' | 'cancelled'
export type MovementPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface ForkliftBrief {
  id: number
  serial_number: string
  name_en: string
  status: string
  current_hour_meter: number
}

export interface CustomerBrief {
  id: number
  first_name: string
  last_name: string
  company: string | null
}

export interface UserBrief {
  id: number
  username: string
  full_name: string | null
}

export interface ContractBrief {
  id: number
  contract_number: string
  status: string
}

export interface MovementCheckpoint {
  id: number
  movement_id: number
  from_status: string | null
  to_status: string
  location: string | null
  latitude: number | null
  longitude: number | null
  notes: string | null
  user: UserBrief | null
  recorded_at: string
}

export interface Movement {
  id: number
  movement_number: string
  movement_type: MovementType
  status: MovementStatus
  priority: MovementPriority
  forklift: ForkliftBrief
  customer: CustomerBrief | null
  rental_contract: ContractBrief | null
  assigned_driver: UserBrief | null
  from_location: string
  to_location: string
  scheduled_date: string
  actual_departure: string | null
  actual_arrival: string | null
  tracking_code: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export interface MovementDetail extends Movement {
  from_address: string | null
  to_address: string | null
  departure_hour_meter: number | null
  arrival_hour_meter: number | null
  notes: string | null
  internal_notes: string | null
  cancellation_reason: string | null
  created_by: number | null
  updated_by: number | null
  checkpoints: MovementCheckpoint[]
}

export interface MovementListResponse {
  items: Movement[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface MovementCreate {
  movement_type: MovementType
  forklift_id: number
  customer_id?: number | null
  rental_contract_id?: number | null
  from_location: string
  from_address?: string
  to_location: string
  to_address?: string
  scheduled_date: string
  priority?: MovementPriority
  assigned_driver_id?: number | null
  tracking_code?: string | null
  notes?: string
  internal_notes?: string
}

export interface MovementListParams {
  q?: string
  movement_type?: MovementType
  status?: MovementStatus
  forklift_id?: number
  customer_id?: number
  assigned_driver_id?: number
  priority?: MovementPriority
  is_active?: boolean
  scheduled_from?: string
  scheduled_to?: string
  page?: number
  page_size?: number
  sort?: 'created_at' | 'scheduled_date' | 'movement_number' | 'status' | 'priority'
  order?: 'asc' | 'desc'
}
