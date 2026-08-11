import type { BrandBrief } from './catalog'

// ── Enums ────────────────────────────────────────────────────────────────────

export type ForkliftStatus =
  | 'in_stock'
  | 'sold'
  | 'rented'
  | 'in_service'
  | 'reserved'
  | 'decommissioned'

export type ForkliftCondition = 'new' | 'used' | 'refurbished'

export type OwnershipState = 'for_sale' | 'rental' | 'customer_owned' | 'retired'

export type FuelType = 'electric' | 'diesel' | 'lpg' | 'dual_fuel'

// ── ForkliftModel ────────────────────────────────────────────────────────────

export interface ForkliftModelBrief {
  id: number
  name: string
  slug: string
  series: string | null
  fuel_type: string | null
  capacity_kg: number | null
}

// ── Customer brief ───────────────────────────────────────────────────────────

export interface CustomerBrief {
  id: number
  first_name: string
  last_name: string
  company: string | null
}

// ── Status history ───────────────────────────────────────────────────────────

export interface ForkliftStatusHistoryEntry {
  id: number
  forklift_id: number
  from_status: string | null
  to_status: string
  reason: string | null
  user: { id: number; username: string; full_name: string | null } | null
  changed_at: string
}

// ── Location ─────────────────────────────────────────────────────────────────

export interface ForkliftLocationEntry {
  id: number
  forklift_id: number
  location_name: string
  warehouse_zone: string | null
  address: string | null
  customer_id: number | null
  effective_date: string
  notes: string | null
  recorded_by: number | null
  created_at: string
}

// ── Document ─────────────────────────────────────────────────────────────────

export interface ForkliftDocumentEntry {
  id: number
  forklift_id: number
  document_type: string
  title: string
  file_url: string
  file_size_bytes: number | null
  mime_type: string | null
  expiry_date: string | null
  notes: string | null
  uploaded_by: number | null
  created_at: string
}

// ── Photo ────────────────────────────────────────────────────────────────────

export interface ForkliftPhotoEntry {
  id: number
  forklift_id: number
  image_url: string
  thumbnail_url: string | null
  alt_text: string | null
  caption: string | null
  is_primary: boolean
  sort_order: number
  taken_at: string | null
  uploaded_by: number | null
  created_at: string
}

// ── Forklift ─────────────────────────────────────────────────────────────────

export interface Forklift {
  id: number
  serial_number: string
  slug: string
  internal_code: string | null
  name_en: string
  name_lo: string | null
  model_number: string | null
  model: ForkliftModelBrief | null
  brand: BrandBrief | null
  customer: CustomerBrief | null
  status: ForkliftStatus
  ownership_state: OwnershipState
  condition: ForkliftCondition
  fuel_type: string | null
  capacity_kg: number | null
  year_manufactured: number | null
  current_hour_meter: number
  meter_hours: number
  is_active: boolean
  primary_photo_url: string | null
  iot_device_id: string | null
  last_telemetry_ping: string | null
  current_latitude: number | null
  current_longitude: number | null
  last_location_update: string | null
  created_at: string
  updated_at: string | null
}

export interface ForkliftSpec {
  id: number
  forklift_id: number
  mast_type: string | null
  max_lift_height_mm: number | null
  front_tire: string | null
  rear_tire: string | null
  tire_type: string | null
  fork_length_mm: number | null
  battery_type: string | null
  attachment_type: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface ForkliftDetail extends Forklift {
  mast_type: string | null
  max_lift_height_mm: number | null
  purchase_date: string | null
  warranty_expiry: string | null
  initial_hour_meter: number
  notes: string | null
  specs: ForkliftSpec[]
  photos: ForkliftPhotoEntry[]
  documents: ForkliftDocumentEntry[]
  recent_status_history: ForkliftStatusHistoryEntry[]
  current_location: ForkliftLocationEntry | null
  created_by: number | null
  updated_by: number | null
}

export interface ForkliftListResponse {
  items: Forklift[]
  total: number
  page: number
  page_size: number
  pages: number
}

// ── Create / Update ──────────────────────────────────────────────────────────

export interface ForkliftCreate {
  serial_number: string
  name_en: string
  name_lo?: string
  model_number?: string
  internal_code?: string
  model_id?: number | null
  brand_id?: number | null
  customer_id?: number | null
  status?: ForkliftStatus
  ownership_state?: OwnershipState
  condition?: ForkliftCondition
  fuel_type?: FuelType | null
  capacity_kg?: number | null
  year_manufactured?: number | null
  purchase_date?: string | null
  warranty_expiry?: string | null
  initial_hour_meter?: number
  current_hour_meter?: number
  notes?: string
}

export interface ForkliftUpdate extends Partial<ForkliftCreate> {
  is_active?: boolean
  iot_device_id?: string | null
}

export interface ForkliftListParams {
  q?: string
  brand_id?: number
  model_id?: number
  customer_id?: number
  status?: ForkliftStatus
  ownership_state?: OwnershipState
  condition?: ForkliftCondition
  fuel_type?: FuelType
  is_active?: boolean
  page?: number
  page_size?: number
  sort?: 'name_en' | 'serial_number' | 'status' | 'created_at' | 'updated_at' | 'current_hour_meter'
  order?: 'asc' | 'desc'
}
