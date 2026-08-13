export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected'

export interface CustomerBrief {
  id: number
  first_name: string
  last_name: string
  company: string | null
}

export interface ForkliftBrief {
  id: number
  serial_number: string
  name_en: string
}

export interface UserBrief {
  id: number
  username: string
  full_name: string | null
}

export interface Quotation {
  id: number
  quotation_no: string
  customer: CustomerBrief
  forklift: ForkliftBrief | null
  expected_start_date: string
  expected_end_date: string
  rental_price: number
  daily_hours_quota: number
  status: QuotationStatus
  notes: string | null
  creator: UserBrief | null
  created_at: string
  updated_at: string | null
}

export interface QuotationListResponse {
  items: Quotation[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface QuotationCreate {
  customer_id: number
  forklift_id?: number | null
  expected_start_date: string
  expected_end_date: string
  rental_price: number
  daily_hours_quota?: number
  status?: QuotationStatus
  notes?: string
}

export interface QuotationUpdate {
  customer_id?: number
  forklift_id?: number | null
  expected_start_date?: string
  expected_end_date?: string
  rental_price?: number
  daily_hours_quota?: number
  status?: QuotationStatus
  notes?: string
}

export interface QuotationListParams {
  q?: string
  status?: QuotationStatus
  customer_id?: number
  page?: number
  page_size?: number
}

// Payload handed from QuotationDetailPage to the rental contract editor via
// router state when converting an approved quotation into a contract.
export interface QuotationConversionPrefill {
  quotation_id: number
  quotation_no: string
  customer_id: number
  forklift_id: number | null
  expected_start_date: string
  expected_end_date: string
  rental_price: number
  daily_hours_quota: number
}
