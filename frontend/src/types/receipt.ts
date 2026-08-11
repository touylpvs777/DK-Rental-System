export type ReceiptStatus = 'draft' | 'confirmed' | 'cancelled'
export type ReceiptPaymentMethod = 'cash' | 'transfer' | 'cheque'

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

export interface InvoiceBrief {
  id: number
  invoice_number: string
  total_amount: number
  balance_due: number
  currency: string
}

export interface StatusHistoryEntry {
  id: number
  receipt_id: number
  from_status: string | null
  to_status: string
  reason: string | null
  user: UserBrief | null
  changed_at: string
}

export interface Receipt {
  id: number
  receipt_number: string
  status: ReceiptStatus
  invoice: InvoiceBrief | null
  customer: CustomerBrief | null
  assigned_user: UserBrief | null
  payment_date: string
  payment_method: ReceiptPaymentMethod
  amount_received: number
  currency: string
  created_at: string
  updated_at: string | null
  is_active: boolean
}

export interface ReceiptDetail extends Receipt {
  bank_account: string | null
  reference_number: string | null
  exchange_rate: number
  customer_reference: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_vin: string | null
  vehicle_engine_no: string | null
  vehicle_reg_no: string | null
  job_number: string | null
  notes: string | null
  internal_notes: string | null
  terms_conditions: string | null
  created_by: number | null
  updated_by: number | null
  recent_status_history: StatusHistoryEntry[]
  available_actions: string[]
}

export interface ReceiptListResponse {
  items: Receipt[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface ReceiptCreate {
  invoice_id: number
  customer_id?: number | null
  assigned_to?: number | null
  payment_date?: string | null
  payment_method?: ReceiptPaymentMethod
  bank_account?: string
  reference_number?: string
  amount_received: number
  currency?: string
  exchange_rate?: number
  customer_reference?: string
  vehicle_make?: string
  vehicle_model?: string
  vehicle_vin?: string
  vehicle_engine_no?: string
  vehicle_reg_no?: string
  job_number?: string
  terms_conditions?: string
  notes?: string
  internal_notes?: string
}

export interface ReceiptUpdate {
  customer_id?: number | null
  assigned_to?: number | null
  payment_date?: string | null
  payment_method?: ReceiptPaymentMethod
  bank_account?: string
  reference_number?: string
  amount_received?: number
  customer_reference?: string
  vehicle_make?: string
  vehicle_model?: string
  vehicle_vin?: string
  vehicle_engine_no?: string
  vehicle_reg_no?: string
  job_number?: string
  terms_conditions?: string
  notes?: string
  internal_notes?: string
}

export interface ReceiptListParams {
  q?: string
  status?: ReceiptStatus
  customer_id?: number
  invoice_id?: number
  assigned_to?: number
  is_active?: boolean
  created_from?: string
  created_to?: string
  page?: number
  page_size?: number
  sort?: 'created_at' | 'updated_at' | 'payment_date' | 'receipt_number' | 'status' | 'amount_received'
  order?: 'asc' | 'desc'
}
