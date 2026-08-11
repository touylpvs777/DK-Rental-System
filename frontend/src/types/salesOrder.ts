export type SalesOrderStatus = 'draft' | 'confirmed' | 'completed' | 'cancelled'

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

export interface QuotationBrief {
  id: number
  quotation_number: string
  title: string
}

export interface SalesOrderItemOut {
  id: number
  sales_order_id: number
  line_number: number
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
  notes: string | null
  sort_order: number
  created_at: string
}

export interface StatusHistoryEntry {
  id: number
  sales_order_id: number
  from_status: string | null
  to_status: string
  reason: string | null
  user: UserBrief | null
  changed_at: string
}

export interface SalesOrder {
  id: number
  so_number: string
  status: SalesOrderStatus
  title: string
  customer: CustomerBrief | null
  quotation: QuotationBrief | null
  assigned_user: UserBrief | null
  subtotal: number
  total_amount: number
  currency: string
  order_date: string
  expected_delivery_date: string | null
  item_count: number
  created_at: string
  updated_at: string | null
  is_active: boolean
}

export interface SalesOrderDetail extends SalesOrder {
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
  created_by: number | null
  updated_by: number | null
  items: SalesOrderItemOut[]
  recent_status_history: StatusHistoryEntry[]
  available_actions: string[]
}

export interface SalesOrderListResponse {
  items: SalesOrder[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface SalesOrderCreate {
  title: string
  quotation_id?: number | null
  customer_id?: number | null
  assigned_to?: number | null
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  tax_rate?: number
  currency?: string
  exchange_rate?: number
  bank_details?: string
  order_date?: string | null
  expected_delivery_date?: string | null
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

export interface SalesOrderUpdate {
  title?: string
  quotation_id?: number | null
  customer_id?: number | null
  assigned_to?: number | null
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  tax_rate?: number
  discount_amount?: number
  currency?: string
  exchange_rate?: number
  bank_details?: string
  order_date?: string | null
  expected_delivery_date?: string | null
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

export interface SalesOrderItemCreate {
  item_code?: string
  description: string
  quantity?: number
  unit?: string
  unit_price: number
  discount_percent?: number
  tax_percent?: number
  notes?: string
  sort_order?: number
}

export interface SalesOrderItemBulkItem extends SalesOrderItemCreate {
  id?: number | null
}

// Payload handed from QuotationEditorPage -> SalesOrderEditorPage (via router
// navigation state) when converting an approved Quotation into a new Sales
// Order, so the editor can be pre-filled without an extra round trip.
export interface SalesOrderConversionPrefill {
  quotationBrief: QuotationBrief
  header: {
    title: string
    customer_id: number | null
    assigned_to: number | null
    contact_name: string
    contact_email: string
    contact_phone: string
    tax_rate: number
    discount_amount: number
    round_amount: number
    currency: string
    exchange_rate: number
    customer_reference: string
    bank_details: string
    job_number: string
    machine_type: string
    vehicle_make: string
    vehicle_model: string
    vehicle_vin: string
    vehicle_engine_no: string
    hour_meter: number | null
    vehicle_reg_no: string
    location: string
    notes: string
    internal_notes: string
    terms_conditions: string
  }
  items: {
    item_code: string
    description: string
    quantity: number
    unit: string
    unit_price: number
    discount_percent: number
    tax_percent: number
  }[]
}

export interface SalesOrderListParams {
  q?: string
  status?: SalesOrderStatus
  customer_id?: number
  quotation_id?: number
  assigned_to?: number
  is_active?: boolean
  created_from?: string
  created_to?: string
  page?: number
  page_size?: number
  sort?: 'created_at' | 'updated_at' | 'total_amount' | 'order_date' | 'so_number' | 'status'
  order?: 'asc' | 'desc'
}
