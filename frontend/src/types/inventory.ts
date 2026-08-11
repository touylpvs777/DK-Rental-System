export type PartCategory = 'filter' | 'belt' | 'brake' | 'hydraulic' | 'electrical' | 'engine' | 'tire' | 'chain' | 'battery' | 'lubricant' | 'general'
export type TxnType = 'receive' | 'issue' | 'adjust' | 'transfer' | 'return' | 'consume'
export type POStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled'

export interface BrandBrief { id: number; name: string; slug: string }
export interface WarehouseBrief { id: number; code: string; name: string }
export interface SparePartBrief { id: number; part_number: string; name: string; unit: string; unit_price: number }
export interface UserBrief { id: number; username: string; full_name: string | null }

export interface SparePart {
  id: number; part_number: string; name: string; description: string | null
  part_category: string; brand: BrandBrief | null
  unit: string; unit_price: number; currency: string
  min_stock_level: number; reorder_quantity: number; lead_time_days: number
  image_url: string | null; is_active: boolean
  created_at: string; updated_at: string | null
}
export interface SparePartListResponse { items: SparePart[]; total: number; page: number; page_size: number; pages: number }

export interface Warehouse {
  id: number; code: string; name: string; address: string | null
  contact_name: string | null; contact_phone: string | null
  is_active: boolean; created_at: string; updated_at: string | null
}

export interface InventoryBalance {
  id: number; spare_part: SparePartBrief; warehouse: WarehouseBrief
  quantity_on_hand: number; quantity_reserved: number; quantity_available: number
  last_count_date: string | null; updated_at: string | null
}

export interface InventoryTransaction {
  id: number; transaction_number: string; transaction_type: string
  spare_part: SparePartBrief; warehouse: WarehouseBrief
  quantity: number; unit_cost: number; total_cost: number
  reference_type: string | null; reference_id: number | null
  notes: string | null; user: UserBrief | null; created_at: string
}

export interface PartnerBrief { id: number; name: string; partner_type: string }

export interface POItem {
  id: number; spare_part: SparePartBrief | null
  item_code: string | null; description: string | null; unit: string | null
  quantity_ordered: number; quantity_received: number
  unit_cost: number; line_total: number; notes: string | null
}
export interface PurchaseOrder {
  id: number; po_number: string; status: POStatus; vendor: string
  vendor_address: string | null; vendor_contact: string | null; partner: PartnerBrief | null
  warehouse: WarehouseBrief; order_date: string; expected_date: string | null; received_date: string | null
  subtotal: number; tax_rate: number; tax_amount: number; total_amount: number; currency: string
  notes: string | null; is_active: boolean; created_at: string; updated_at: string | null
  items: POItem[]
}
export interface POListItem {
  id: number; po_number: string; status: string; vendor: string
  warehouse: WarehouseBrief; order_date: string; expected_date: string | null
  subtotal: number; total_amount: number; currency: string
  is_active: boolean; created_at: string
}
export interface POListResponse { items: POListItem[]; total: number; page: number; page_size: number; pages: number }

export interface POItemCreate {
  spare_part_id?: number
  item_code?: string; description?: string; unit?: string
  quantity_ordered: number; unit_cost: number; notes?: string
}
export interface POCreate {
  vendor: string; vendor_address?: string; vendor_contact?: string; partner_id?: number | null
  warehouse_id: number; order_date: string; expected_date?: string
  tax_rate: number; notes?: string; items: POItemCreate[]
}
export interface ReceiveItemAction { item_id: number; quantity_received: number }

export interface ReorderAlert {
  spare_part_id: number; part_number: string; name: string
  warehouse_id: number; warehouse_code: string; warehouse_name: string
  quantity_available: number; min_stock_level: number; reorder_quantity: number
}
export interface DashboardSummary {
  total_parts: number; total_warehouses: number; total_stock_value: number; currency: string
  low_stock_count: number; pending_po_count: number; reorder_alerts: ReorderAlert[]
}

export interface SparePartCreate { part_number: string; name: string; part_category?: PartCategory; unit_price?: number; description?: string; brand_id?: number; unit?: string; min_stock_level?: number; reorder_quantity?: number; lead_time_days?: number }
export interface PartListParams { q?: string; part_category?: string; brand_id?: number; is_active?: boolean; page?: number; page_size?: number; sort?: string; order?: 'asc' | 'desc' }

export interface InventoryImportRowError { row_number: number; error_message: string }
export interface InventoryImportResult {
  success: boolean
  rows_imported: number
  rows_updated: number
  errors: InventoryImportRowError[]
}
