export type RentalContractStatus =
  | 'reservation' | 'draft' | 'pending_approval' | 'approved' | 'revision'
  | 'delivering' | 'active' | 'overdue' | 'returning' | 'inspecting'
  | 'settling' | 'closed' | 'cancelled'

export type ContractType = 'short_term' | 'long_term' | 'project'

export type ReturnType = 'scheduled' | 'early' | 'overdue'

export type DamageCategory = 'normal_wear' | 'minor_damage' | 'major_damage' | 'missing_parts' | 'total_loss'

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

export interface ForkliftBrief {
  id: number
  serial_number: string
  name_en: string
  status: string
  current_hour_meter: number
  condition: string
}

export interface LeadBrief {
  id: number
  title: string
}

// Contract item
export interface RentalContractItemOut {
  id: number
  contract_id: number
  line_number: number
  forklift: ForkliftBrief | null
  quotation_item_id: number | null
  description: string
  monthly_rate: number
  daily_rate: number
  hourly_rate: number | null
  contracted_hours_limit: number | null
  maintenance_interval_hours: number | null
  departure_hour_meter: number | null
  return_hour_meter: number | null
  hours_used: number | null
  line_status: string
  line_total: number
  sort_order: number
  notes: string | null
  created_at: string
  updated_at: string | null
}

// Extension
export interface RentalExtensionOut {
  id: number
  contract_id: number
  extension_number: number
  original_end_date: string
  new_end_date: string
  rate_adjustment_pct: number
  new_monthly_rate: number | null
  reason: string | null
  status: string
  conditions: string | null
  requester: UserBrief | null
  approver: UserBrief | null
  decided_at: string | null
  created_at: string
}

// Return
export interface RentalReturnOut {
  id: number
  return_number: string
  contract_id: number
  contract_item_id: number | null
  forklift: ForkliftBrief | null
  return_type: string
  status: string
  is_early_termination: boolean
  early_termination_reason: string | null
  requested_date: string
  scheduled_pickup_date: string | null
  actual_pickup_date: string | null
  actual_received_date: string | null
  pickup_address: string | null
  departure_hour_meter: number | null
  arrival_hour_meter: number | null
  condition_rating: number | null
  overall_condition: string | null
  mechanical_pass: boolean | null
  safety_equipment_pass: boolean | null
  customer_signoff_url: string | null
  driver_user: UserBrief | null
  inspector_user: UserBrief | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

// Damage report
export interface RentalDamageReportOut {
  id: number
  report_number: string
  return_id: number
  contract_id: number
  forklift: ForkliftBrief | null
  damage_category: string
  component: string | null
  description: string
  photo_urls: string[] | null
  repair_cost: number
  parts_cost: number
  downtime_days: number
  downtime_cost: number
  is_customer_liable: boolean
  total_charge: number
  final_charge: number | null
  dispute_status: string | null
  dispute_reason: string | null
  dispute_resolution: string | null
  assessor: UserBrief | null
  dispute_resolver: UserBrief | null
  dispute_resolved_at: string | null
  assessed_at: string | null
  created_at: string
  updated_at: string | null
}

// Billing cycle
export interface RentalBillingCycleOut {
  id: number
  billing_number: string
  contract_id: number
  contract_item_id: number | null
  billing_type: string
  description: string
  period_start: string | null
  period_end: string | null
  quantity: number
  unit_rate: number
  amount: number
  tax_amount: number
  total_amount: number
  currency: string
  is_credit: boolean
  payment_status: string
  due_date: string | null
  paid_date: string | null
  generated_by: number | null
  notes: string | null
  creator: UserBrief | null
  created_at: string
  updated_at: string | null
}

// Status history
export interface RentalStatusHistoryEntry {
  id: number
  contract_id: number
  from_status: string | null
  to_status: string
  reason: string | null
  user: UserBrief | null
  changed_at: string
}

// Billing summary
export interface BillingSummary {
  total_billed: number
  total_paid: number
  total_outstanding: number
  total_overdue: number
  total_credits: number
  currency: string
  event_count: number
}

// Main contract types
export interface RentalContract {
  id: number
  contract_number: string
  revision_number: number
  status: RentalContractStatus
  contract_type: string
  customer: CustomerBrief
  lead: LeadBrief | null
  quotation_id: number | null
  assigned_user: UserBrief | null
  start_date: string
  end_date: string
  actual_start_date: string | null
  actual_end_date: string | null
  item_count: number
  subtotal: number
  total_value: number
  currency: string
  deposit_amount: number
  deposit_status: string
  created_at: string
  updated_at: string | null
  is_active: boolean
}

export interface RentalContractDetail extends RentalContract {
  billing_cycle_day: number
  payment_terms_days: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  early_termination_fee_pct: number
  late_return_penalty_pct: number
  overtime_rate_pct: number
  daily_hours_quota: number
  overtime_rate_per_hour: number | null
  rest_policy_work_hours: number
  rest_policy_rest_minutes: number
  job_type: string | null
  contract_body: string | null
  attachment_url: string | null
  delivery_address: string | null
  delivery_contact_name: string | null
  delivery_contact_phone: string | null
  notes: string | null
  internal_notes: string | null
  cancellation_reason: string | null
  reservation_expires_at: string | null
  approved_by_user: UserBrief | null
  approved_at: string | null
  created_by: number | null
  updated_by: number | null
  items: RentalContractItemOut[]
  terms: { id: number; term_category: string; term_key: string; term_label: string; term_value: string }[]
  recent_status_history: RentalStatusHistoryEntry[]
  recent_extensions: RentalExtensionOut[]
  active_returns: RentalReturnOut[]
  billing_summary: BillingSummary | null
  available_actions: string[]
}

export interface RentalContractListResponse {
  items: RentalContract[]
  total: number
  page: number
  page_size: number
  pages: number
}

// Create/Update inputs
export interface RentalContractCreate {
  customer_id: number
  contract_type: ContractType
  start_date: string
  end_date: string
  quotation_id?: number | null
  lead_id?: number | null
  assigned_to?: number | null
  billing_cycle_day?: number
  payment_terms_days?: number
  deposit_amount?: number
  early_termination_fee_pct?: number
  late_return_penalty_pct?: number
  overtime_rate_pct?: number
  tax_rate?: number
  currency?: string
  delivery_address?: string
  delivery_contact_name?: string
  delivery_contact_phone?: string
  notes?: string
  internal_notes?: string
  daily_hours_quota?: number
  overtime_rate_per_hour?: number | null
  rest_policy_work_hours?: number
  rest_policy_rest_minutes?: number
  job_type?: string | null
  contract_body?: string | null
  attachment_url?: string | null
}

export interface RentalContractUpdate {
  contract_type?: ContractType
  start_date?: string
  end_date?: string
  assigned_to?: number | null
  billing_cycle_day?: number
  payment_terms_days?: number
  deposit_amount?: number
  tax_rate?: number
  discount_amount?: number
  currency?: string
  delivery_address?: string
  delivery_contact_name?: string
  delivery_contact_phone?: string
  notes?: string
  internal_notes?: string
  daily_hours_quota?: number
  overtime_rate_per_hour?: number | null
  rest_policy_work_hours?: number
  rest_policy_rest_minutes?: number
  job_type?: string | null
  contract_body?: string | null
  attachment_url?: string | null
}

export interface RentalContractItemCreate {
  forklift_id: number
  description: string
  monthly_rate: number
  daily_rate: number
  hourly_rate?: number | null
  contracted_hours_limit?: number | null
  maintenance_interval_hours?: number | null
  quotation_item_id?: number | null
  notes?: string
  sort_order?: number
}

// A row with `id` updates that line item in place; `id: null` creates a new
// one (forklift_id required in that case); any existing item whose id is
// omitted from the array is deleted.
export interface RentalContractItemBulkRow {
  id: number | null
  forklift_id: number | null
  description: string
  monthly_rate: number
  daily_rate: number
  hourly_rate?: number | null
  contracted_hours_limit?: number | null
  maintenance_interval_hours?: number | null
  quotation_item_id?: number | null
  notes?: string | null
  sort_order?: number
}
export interface RentalContractItemBulkReplaceRequest { items: RentalContractItemBulkRow[] }

export interface RentalReturnCreate {
  return_type: ReturnType
  requested_date: string
  contract_item_id?: number | null
  forklift_id?: number | null
  pickup_address?: string
  scheduled_pickup_date?: string | null
  is_early_termination?: boolean
  early_termination_reason?: string
  notes?: string
}

export interface RentalExtensionCreate {
  new_end_date: string
  rate_adjustment_pct?: number
  new_monthly_rate?: number | null
  reason?: string
}

export interface RentalContractListParams {
  q?: string
  status?: RentalContractStatus
  contract_type?: ContractType
  customer_id?: number
  assigned_to?: number
  is_active?: boolean
  start_from?: string
  start_to?: string
  end_from?: string
  end_to?: string
  page?: number
  page_size?: number
  sort?: 'created_at' | 'start_date' | 'end_date' | 'total_value' | 'contract_number' | 'status'
  order?: 'asc' | 'desc'
}
