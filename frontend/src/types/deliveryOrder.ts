export type DeliveryOrderStatus = 'pending' | 'in_transit' | 'delivered' | 'cancelled'
export type DeliveryOrderType = 'delivery' | 'return'

export interface CustomerBrief {
  id: number
  first_name: string
  last_name: string
  company: string | null
}

export interface ContractBrief {
  id: number
  contract_number: string
  status: string
  customer: CustomerBrief
}

export interface UserBrief {
  id: number
  username: string
  full_name: string | null
}

export interface DeliveryChecklistItem {
  id: number
  item_group: string
  item_name: string
  is_passed: boolean
  remark: string | null
  created_at: string
  updated_at: string | null
}

// What the form sends — no `id`, since checklist updates are a full
// delete-and-recreate rather than a per-row diff (see the backend service).
export interface DeliveryChecklistItemInput {
  item_group: string
  item_name: string
  is_passed: boolean
  remark?: string | null
}

export interface DeliveryOrder {
  id: number
  do_no: string
  order_type: DeliveryOrderType
  contract: ContractBrief
  delivery_date: string
  delivery_address: string
  driver_name: string
  status: DeliveryOrderStatus
  notes: string | null
  checklist_items: DeliveryChecklistItem[]
  creator: UserBrief | null
  created_at: string
  updated_at: string | null
}

export interface DeliveryOrderListResponse {
  items: DeliveryOrder[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface DeliveryOrderCreate {
  contract_id: number
  order_type?: DeliveryOrderType
  delivery_date: string
  delivery_address: string
  driver_name: string
  status?: DeliveryOrderStatus
  notes?: string
  checklist_items?: DeliveryChecklistItemInput[]
}

export interface DeliveryOrderUpdate {
  order_type?: DeliveryOrderType
  delivery_date?: string
  delivery_address?: string
  driver_name?: string
  status?: DeliveryOrderStatus
  notes?: string
  checklist_items?: DeliveryChecklistItemInput[]
}

export interface DeliveryOrderListParams {
  q?: string
  status?: DeliveryOrderStatus
  contract_id?: number
  page?: number
  page_size?: number
}

// Payload handed from the rental contract detail view to the delivery order
// form via router state, for the Contract -> Delivery Order hand-off.
export interface DeliveryOrderConversionPrefill {
  contract_id: number
  contract_number: string
  customer_name: string
  forklift_label: string | null
  delivery_address: string | null
  order_type: DeliveryOrderType
  // The date to prefill into the form's own `delivery_date` field — the
  // contract's start_date for an outbound delivery, its end_date for a
  // return, decided by the caller before navigating here.
  delivery_date: string
}
