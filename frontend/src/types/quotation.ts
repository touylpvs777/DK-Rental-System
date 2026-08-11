export type QuotationType = 'rental' | 'sales' | 'service' | 'spare_parts'

export type QuotationStatus =
  | 'draft'
  | 'under_review'
  | 'approved'
  | 'revision'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted'
  | 'cancelled'

export type ItemType =
  | 'forklift_rental'
  | 'forklift_sale'
  | 'service'
  | 'spare_part'
  | 'delivery'
  | 'insurance'
  | 'custom'

export interface CustomerBrief {
  id: number
  first_name: string
  last_name: string
  company: string | null
}

export interface LeadBrief {
  id: number
  title: string
}

export interface UserBrief {
  id: number
  username: string
  full_name: string | null
}

export interface QuotationItemOut {
  id: number
  quotation_id: number
  line_number: number
  item_type: string
  forklift: { id: number; serial_number: string; name_en: string; status: string } | null
  product: { id: number; sku: string; name_en: string } | null
  item_code: string | null
  description: string
  quantity: number
  unit: string
  unit_price: number
  discount_percent: number
  tax_percent: number
  line_total: number
  discount_amount: number
  tax_amount: number
  total: number
  rental_duration_days: number | null
  rental_rate_period: string | null
  notes: string | null
  sort_order: number
  created_at: string
}

export interface StatusHistoryEntry {
  id: number
  quotation_id: number
  from_status: string | null
  to_status: string
  reason: string | null
  user: UserBrief | null
  changed_at: string
}

export interface ApprovalEntry {
  id: number
  quotation_id: number
  revision_number: number
  decision: string
  reason: string | null
  conditions: string | null
  user: UserBrief | null
  decided_at: string
}

export interface Quotation {
  id: number
  quotation_number: string
  revision_number: number
  quotation_type: string
  status: QuotationStatus
  title: string
  customer: CustomerBrief | null
  lead: LeadBrief | null
  assigned_user: UserBrief | null
  subtotal: number
  total_amount: number
  currency: string
  valid_from: string | null
  valid_until: string | null
  item_count: number
  created_at: string
  updated_at: string | null
  is_active: boolean
}

export interface QuotationDetail extends Quotation {
  parent_id: number | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  tax_rate: number
  tax_amount: number
  discount_amount: number
  round_amount: number
  exchange_rate: number
  bank_details: string | null
  customer_reference: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_vin: string | null
  vehicle_engine_no: string | null
  vehicle_reg_no: string | null
  job_number: string | null
  machine_type: string | null
  hour_meter: number | null
  location: string | null
  notes: string | null
  internal_notes: string | null
  terms_conditions: string | null
  converted_to_type: string | null
  converted_to_id: number | null
  created_by: number | null
  updated_by: number | null
  items: QuotationItemOut[]
  recent_status_history: StatusHistoryEntry[]
  recent_approvals: ApprovalEntry[]
  available_actions: string[]
}

export interface QuotationListResponse {
  items: Quotation[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface QuotationCreate {
  quotation_type: QuotationType
  title: string
  customer_id?: number | null
  lead_id?: number | null
  assigned_to?: number | null
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  tax_rate?: number
  currency?: string
  exchange_rate?: number
  bank_details?: string
  valid_from?: string | null
  valid_until?: string | null
  customer_reference?: string
  vehicle_make?: string
  vehicle_model?: string
  vehicle_vin?: string
  vehicle_engine_no?: string
  vehicle_reg_no?: string
  job_number?: string
  machine_type?: string
  hour_meter?: number | null
  location?: string
  round_amount?: number
  terms_conditions?: string
  notes?: string
  internal_notes?: string
}

export interface QuotationUpdate {
  title?: string
  customer_id?: number | null
  lead_id?: number | null
  assigned_to?: number | null
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  tax_rate?: number
  discount_amount?: number
  currency?: string
  exchange_rate?: number
  bank_details?: string
  valid_from?: string | null
  valid_until?: string | null
  customer_reference?: string
  vehicle_make?: string
  vehicle_model?: string
  vehicle_vin?: string
  vehicle_engine_no?: string
  vehicle_reg_no?: string
  job_number?: string
  machine_type?: string
  hour_meter?: number | null
  location?: string
  round_amount?: number
  terms_conditions?: string
  notes?: string
  internal_notes?: string
}

export interface QuotationItemCreate {
  item_type: ItemType
  forklift_id?: number | null
  product_id?: number | null
  item_code?: string
  description: string
  quantity?: number
  unit?: string
  unit_price: number
  discount_percent?: number
  tax_percent?: number
  rental_duration_days?: number | null
  rental_rate_period?: string | null
  notes?: string
  sort_order?: number
}

export interface QuotationItemBulkItem extends QuotationItemCreate {
  id?: number | null
}

export interface QuotationItemUpdate {
  item_code?: string
  description?: string
  quantity?: number
  unit?: string
  unit_price?: number
  discount_percent?: number
  tax_percent?: number
  rental_duration_days?: number | null
  rental_rate_period?: string | null
  notes?: string
  sort_order?: number
}

export interface QuotationListParams {
  q?: string
  status?: QuotationStatus
  quotation_type?: QuotationType
  customer_id?: number
  lead_id?: number
  assigned_to?: number
  is_active?: boolean
  created_from?: string
  created_to?: string
  page?: number
  page_size?: number
  sort?: 'created_at' | 'updated_at' | 'total_amount' | 'valid_until' | 'quotation_number' | 'status'
  order?: 'asc' | 'desc'
}
