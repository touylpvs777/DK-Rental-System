export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'voided'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'mobile_payment' | 'other'
export type PaymentRecordStatus = 'pending' | 'confirmed' | 'rejected' | 'refunded'
export type DepositType = 'security' | 'advance' | 'guarantee'
export type DepositRecordStatus = 'pending' | 'received' | 'partially_refunded' | 'refunded' | 'forfeited' | 'applied'
export type RecognitionType = 'rental_income' | 'service_fee' | 'penalty_fee' | 'damage_recovery' | 'deposit_forfeiture'
export type RecognitionStatus = 'scheduled' | 'recognized' | 'reversed'
export type ReferenceType = 'work_order' | 'rental'

export interface CustomerBrief { id: number; first_name: string; last_name: string; company: string | null }
export interface UserBrief { id: number; username: string; full_name: string | null }
export interface ContractBrief { id: number; contract_number: string; status: string }

export interface InvoiceItemOut {
  id: number; invoice_id: number; billing_cycle_id: number | null
  line_number: number; item_code: string | null; description: string; unit: string | null
  quantity: number; unit_rate: number; amount: number; tax_amount: number; line_total: number
  sort_order: number; created_at: string; updated_at: string | null
}

export interface PaymentAllocationOut {
  id: number; payment_id: number; invoice_id: number
  allocated_amount: number; allocated_at: string; allocated_by: number | null
}

export interface InvoiceOut {
  id: number; invoice_number: string; contract_id: number | null; customer_id: number
  reference_type: ReferenceType | null; reference_id: number | null
  status: InvoiceStatus; issue_date: string | null; due_date: string | null; paid_date: string | null
  subtotal: number; tax_rate: number; tax_amount: number; discount_amount: number
  total_amount: number; amount_paid: number; balance_due: number; currency: string
  billing_period_start: string | null; billing_period_end: string | null
  customer: CustomerBrief; contract: ContractBrief | null; creator: UserBrief | null
  created_at: string; updated_at: string | null; is_active: boolean
}

export interface InvoiceDetail extends InvoiceOut {
  items: InvoiceItemOut[]
  allocations: PaymentAllocationOut[]
  notes: string | null; internal_notes: string | null
  sent_at: string | null; cancelled_at: string | null; cancellation_reason: string | null
  vehicle_make: string | null; vehicle_model: string | null; vehicle_vin: string | null
  vehicle_engine_no: string | null; vehicle_reg_no: string | null; job_number: string | null
  exchange_rate: number; bank_details: string | null
}

export interface InvoiceListResponse { items: InvoiceOut[]; total: number; page: number; page_size: number; pages: number }

export interface PaymentOut {
  id: number; payment_number: string; customer_id: number; contract_id: number | null
  payment_method: string; payment_status: PaymentRecordStatus
  amount: number; currency: string; payment_date: string; received_date: string | null
  reference_number: string | null; notes: string | null
  confirmed_by: number | null; confirmed_at: string | null
  customer: CustomerBrief; contract: ContractBrief | null
  confirmer: UserBrief | null; creator: UserBrief | null
  created_at: string; updated_at: string | null
}

export interface PaymentListResponse { items: PaymentOut[]; total: number; page: number; page_size: number; pages: number }

export interface DepositOut {
  id: number; deposit_number: string; contract_id: number; customer_id: number
  deposit_type: string; deposit_status: DepositRecordStatus
  amount: number; currency: string
  received_date: string | null; refund_date: string | null
  refund_amount: number; forfeit_amount: number; applied_amount: number
  payment_id: number | null; refund_payment_id: number | null
  notes: string | null
  contract: ContractBrief; customer: CustomerBrief; creator: UserBrief | null
  created_at: string; updated_at: string | null
}

export interface DepositListResponse { items: DepositOut[]; total: number; page: number; page_size: number; pages: number }

export interface RevenueRecognitionOut {
  id: number; recognition_number: string
  invoice_id: number | null; invoice_item_id: number | null; contract_id: number
  recognition_type: string; recognition_status: RecognitionStatus
  recognition_date: string; amount: number; currency: string
  period_start: string | null; period_end: string | null
  description: string | null; notes: string | null
  creator: UserBrief | null; created_at: string; updated_at: string | null
}

export interface RevenueRecognitionListResponse { items: RevenueRecognitionOut[]; total: number; page: number; page_size: number; pages: number }

export interface BillingDashboardSummary {
  total_invoiced: number; total_paid: number; total_outstanding: number
  total_overdue: number; invoice_count: number; payment_count: number; currency: string
}

export interface InvoiceItemCreate { item_code?: string; description: string; unit?: string; quantity: number; unit_rate: number }

export interface InvoiceCreate {
  contract_id?: number; customer_id: number
  reference_type?: ReferenceType; reference_id?: number
  issue_date?: string; due_date?: string
  billing_period_start?: string; billing_period_end?: string
  tax_rate?: number; discount_amount?: number; currency?: string
  exchange_rate?: number; bank_details?: string
  vehicle_make?: string; vehicle_model?: string; vehicle_vin?: string
  vehicle_engine_no?: string; vehicle_reg_no?: string; job_number?: string
  notes?: string; internal_notes?: string
  billing_cycle_ids?: number[]; items?: InvoiceItemCreate[]
}
export interface InvoiceUpdate { due_date?: string; tax_rate?: number; discount_amount?: number; exchange_rate?: number; bank_details?: string; notes?: string; internal_notes?: string }
export interface InvoiceFromCyclesRequest { contract_id: number; billing_cycle_ids: number[]; tax_rate?: number; discount_amount?: number; currency?: string; notes?: string }

// Payload handed from the rental contract editor to the invoice editor via
// router state, for the Contract -> Invoice hand-off.
export interface InvoiceConversionPrefill {
  contract_id: number
  contract_number: string
  customer_id: number
  currency: string
  tax_rate: number
  items: InvoiceItemCreate[]
}
export interface PaymentCreate { customer_id: number; contract_id?: number; payment_method: PaymentMethod; amount: number; currency?: string; payment_date: string; received_date?: string; reference_number?: string; notes?: string }
export interface DepositCreate { contract_id: number; customer_id: number; deposit_type: DepositType; amount: number; currency?: string; notes?: string }

export interface InvoiceListParams { q?: string; status?: string; customer_id?: number; contract_id?: number; is_active?: boolean; issue_from?: string; issue_to?: string; due_from?: string; due_to?: string; page?: number; page_size?: number; sort?: string; order?: 'asc' | 'desc' }

export interface PaymentListParams { q?: string; customer_id?: number; contract_id?: number; payment_status?: string; payment_method?: string; date_from?: string; date_to?: string; page?: number; page_size?: number; sort?: string; order?: 'asc' | 'desc' }
