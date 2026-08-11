export type ServiceType = 'preventive' | 'corrective' | 'inspection' | 'certification'
export type IntervalType = 'hours' | 'days' | 'months'
export type OrderType = 'preventive' | 'corrective' | 'emergency' | 'inspection' | 'install'
export type WOStatus = 'scheduled' | 'due' | 'in_progress' | 'completed' | 'verified' | 'cancelled'
export type WOPriority = 'low' | 'normal' | 'high' | 'critical'
export type MCostType = 'labor' | 'parts' | 'external_service' | 'other'

export interface ForkliftBrief { id: number; serial_number: string; name_en: string; status: string; current_hour_meter: number }
export interface UserBrief { id: number; username: string; full_name: string | null }
export interface PlanBrief { id: number; plan_number: string; name: string; service_type: string; interval_type: string; interval_value: number }
export interface ScheduleBrief { id: number; status: string; next_due_date: string | null }
export interface WOBrief { id: number; work_order_number: string; status: string }

export interface MaintenancePlan {
  id: number; plan_number: string; name: string; description: string | null
  service_type: string; interval_type: string; interval_value: number
  estimated_duration_hours: number; estimated_cost: number
  checklist: string[] | null; is_active: boolean
  created_at: string; updated_at: string | null
}

export interface MaintenanceSchedule {
  id: number; forklift: ForkliftBrief; plan: PlanBrief
  status: string; next_due_date: string | null; next_due_hours: number | null
  last_service_date: string | null; last_service_hours: number | null
  times_serviced: number; notes: string | null; is_active: boolean; created_at: string
}

export interface CostEntry {
  id: number; work_order_id: number; cost_type: string; description: string
  quantity: number; unit_rate: number; amount: number
  vendor: string | null; reference_number: string | null; currency: string; created_at: string
}

// A row with `id` updates that cost entry in place; `id: null` creates a new
// one; any existing entry whose id is omitted from the array is deleted.
export interface CostBulkItem {
  id: number | null
  cost_type: MCostType
  description: string
  quantity: number
  unit_rate: number
  vendor?: string | null
  reference_number?: string | null
}
export interface CostBulkReplaceRequest { costs: CostBulkItem[] }

export interface WorkOrder {
  id: number; work_order_number: string; forklift: ForkliftBrief
  schedule: ScheduleBrief | null; plan: PlanBrief | null; technician: UserBrief | null
  order_type: string; status: WOStatus; priority: string; title: string
  scheduled_date: string; started_at: string | null; completed_at: string | null
  estimated_hours: number; actual_hours: number | null
  estimated_cost: number; actual_cost: number | null
  is_active: boolean; created_at: string; updated_at: string | null
}

export interface WorkOrderDetail extends WorkOrder {
  description: string | null; hour_meter_at_service: number | null
  findings: string | null; resolution: string | null; cancellation_reason: string | null
  verifier: UserBrief | null; verified_at: string | null
  created_by: number | null; updated_by: number | null; costs: CostEntry[]
}

export interface WorkOrderListResponse { items: WorkOrder[]; total: number; page: number; page_size: number; pages: number }

export interface ServiceHistoryEntry {
  id: number; forklift: ForkliftBrief; work_order: WOBrief | null
  service_type: string; service_date: string; technician: UserBrief | null
  hour_meter_reading: number | null; duration_hours: number | null
  total_cost: number; currency: string; summary: string | null; created_at: string
}

export interface DashboardSummary {
  total_plans: number; active_schedules: number; overdue_count: number
  in_progress_count: number; completed_this_month: number
  total_cost_this_month: number; currency: string
}

export interface PlanCreate { name: string; service_type: ServiceType; interval_type: IntervalType; interval_value: number; description?: string; estimated_duration_hours?: number; estimated_cost?: number; checklist?: string[] }
export interface WOCreate { forklift_id: number; order_type: OrderType; title: string; scheduled_date: string; schedule_id?: number; plan_id?: number; priority?: WOPriority; description?: string; assigned_to?: number; estimated_hours?: number; estimated_cost?: number }
export interface WOListParams { q?: string; order_type?: string; status?: WOStatus; priority?: string; forklift_id?: number; assigned_to?: number; is_active?: boolean; scheduled_from?: string; scheduled_to?: string; page?: number; page_size?: number; sort?: string; order?: 'asc' | 'desc' }
