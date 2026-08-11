export type CustomerStatus = 'prospect' | 'active' | 'inactive' | 'churned'

export interface Customer {
  id: number
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  company: string | null
  status: CustomerStatus
  notes: string | null
  assigned_to: number | null
  created_by: number | null
  created_at: string
  updated_at: string | null
}

export interface CustomerCreate {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  company?: string
  status?: CustomerStatus
  notes?: string
}

export interface CustomerUpdate {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  company?: string
  status?: CustomerStatus
  notes?: string
}

// ── Customer 360 overview ───────────────────────────────────────────────────

export interface Customer360Forklift {
  id: number
  serial_number: string
  name_en: string
  status: string
  current_hour_meter: number
}

export interface Customer360RentalContract {
  id: number
  contract_number: string
  status: string
  start_date: string
  end_date: string
  total_value: number
  currency: string
}

export interface Customer360WorkOrder {
  id: number
  work_order_number: string
  status: string
  priority: string
  title: string
  scheduled_date: string
  completed_at: string | null
  forklift: { id: number; serial_number: string; name_en: string }
}

export interface Customer360Invoice {
  id: number
  invoice_number: string
  status: string
  total_amount: number
  balance_due: number
  currency: string
  due_date: string | null
}

export interface Customer360Summary {
  forklift_count: number
  active_rental_count: number
  open_work_order_count: number
  total_outstanding: number
  currency: string
}

export interface Customer360 {
  customer: Customer
  summary: Customer360Summary
  forklifts: Customer360Forklift[]
  rental_contracts: Customer360RentalContract[]
  work_orders: Customer360WorkOrder[]
  invoices: Customer360Invoice[]
}
