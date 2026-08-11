export type DeliveryNoteStatus = 'draft' | 'dispatched' | 'delivered' | 'cancelled'

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

export interface SalesOrderBrief {
  id: number
  so_number: string
  title: string
}

export interface DeliveryNoteItemOut {
  id: number
  delivery_note_id: number
  line_number: number
  item_code: string | null
  description: string
  quantity_ordered: number | null
  quantity_delivered: number
  unit: string
  notes: string | null
  sort_order: number
  created_at: string
}

export interface StatusHistoryEntry {
  id: number
  delivery_note_id: number
  from_status: string | null
  to_status: string
  reason: string | null
  user: UserBrief | null
  changed_at: string
}

export interface DeliveryNote {
  id: number
  dn_number: string
  status: DeliveryNoteStatus
  sales_order: SalesOrderBrief | null
  customer: CustomerBrief | null
  assigned_user: UserBrief | null
  delivery_date: string
  warehouse: string | null
  item_count: number
  created_at: string
  updated_at: string | null
  is_active: boolean
}

export interface DeliveryNoteDetail extends DeliveryNote {
  delivery_address: string | null
  driver_name: string | null
  vehicle_plate: string | null
  customer_reference: string | null
  notes: string | null
  internal_notes: string | null
  terms_conditions: string | null
  created_by: number | null
  updated_by: number | null
  items: DeliveryNoteItemOut[]
  recent_status_history: StatusHistoryEntry[]
  available_actions: string[]
}

export interface DeliveryNoteListResponse {
  items: DeliveryNote[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface DeliveryNoteCreate {
  sales_order_id: number
  customer_id?: number | null
  assigned_to?: number | null
  delivery_date?: string | null
  delivery_address?: string
  warehouse?: string
  driver_name?: string
  vehicle_plate?: string
  customer_reference?: string
  terms_conditions?: string
  notes?: string
  internal_notes?: string
}

export interface DeliveryNoteUpdate {
  customer_id?: number | null
  assigned_to?: number | null
  delivery_date?: string | null
  delivery_address?: string
  warehouse?: string
  driver_name?: string
  vehicle_plate?: string
  customer_reference?: string
  terms_conditions?: string
  notes?: string
  internal_notes?: string
}

export interface DeliveryNoteItemCreate {
  item_code?: string
  description: string
  quantity_ordered?: number | null
  quantity_delivered?: number
  unit?: string
  notes?: string
  sort_order?: number
}

export interface DeliveryNoteItemBulkItem extends DeliveryNoteItemCreate {
  id?: number | null
}

export interface DeliveryNoteListParams {
  q?: string
  status?: DeliveryNoteStatus
  customer_id?: number
  sales_order_id?: number
  assigned_to?: number
  is_active?: boolean
  created_from?: string
  created_to?: string
  page?: number
  page_size?: number
  sort?: 'created_at' | 'updated_at' | 'delivery_date' | 'dn_number' | 'status'
  order?: 'asc' | 'desc'
}
