// ── Brand ─────────────────────────────────────────────────────────────────────

export type BrandRole = 'primary' | 'parts_only' | 'both'

export interface BrandBrief {
  id: number
  name: string
  slug: string
  logo_url: string | null
  country: string | null
}

export interface Brand extends BrandBrief {
  brand_role: BrandRole
  website: string | null
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string | null
}

export interface BrandCreate {
  name: string
  brand_role?: BrandRole
  logo_url?: string
  country?: string
  website?: string
  description?: string
  sort_order?: number
}

export interface BrandUpdate {
  name?: string
  brand_role?: BrandRole
  logo_url?: string
  country?: string
  website?: string
  description?: string
  is_active?: boolean
  sort_order?: number
}

// ── Category ──────────────────────────────────────────────────────────────────

export interface CategoryBrief {
  id: number
  name_en: string
  name_lo: string | null
  slug: string
  level: number
}

export interface ProductCategory extends CategoryBrief {
  parent_id: number | null
  description: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string | null
  children: ProductCategory[]
}

export interface CategoryCreate {
  name_en: string
  name_lo?: string
  parent_id?: number
  description?: string
  sort_order?: number
}

export interface CategoryUpdate {
  name_en?: string
  name_lo?: string
  parent_id?: number | null
  description?: string
  sort_order?: number
  is_active?: boolean
}

// ── Product ───────────────────────────────────────────────────────────────────

export interface ProductSpec {
  id: number
  product_id: number
  spec_group: string
  spec_key: string
  spec_label: string
  spec_value: string
  spec_unit: string | null
  sort_order: number
}

export interface ProductImage {
  id: number
  product_id: number
  image_url: string
  alt_text: string | null
  is_primary: boolean
  sort_order: number
  created_at: string
}

export interface CompatBrand {
  id: number
  brand_id: number
  brand: BrandBrief
  notes: string | null
}

export interface Product {
  id: number
  sku: string
  name_en: string
  name_lo: string | null
  slug: string
  model_number: string | null
  brand: BrandBrief | null
  category: CategoryBrief | null
  is_active: boolean
  is_featured: boolean
  is_sale: boolean
  is_rental: boolean
  is_used_available: boolean
  is_service_item: boolean
  sort_order: number
  primary_image_url: string | null
  created_at: string
  updated_at: string | null
}

export interface ProductDetail extends Product {
  description_en: string | null
  description_lo: string | null
  specs_grouped: Record<string, ProductSpec[]>
  images: ProductImage[]
  compat_brands: CompatBrand[]
  created_by: number | null
  updated_by: number | null
}

export interface ProductListResponse {
  items: Product[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface ProductCreate {
  name_en: string
  name_lo?: string
  sku?: string
  model_number?: string
  brand_id?: number | null
  category_id?: number | null
  description_en?: string
  description_lo?: string
  is_active?: boolean
  is_featured?: boolean
  is_sale?: boolean
  is_rental?: boolean
  is_used_available?: boolean
  is_service_item?: boolean
  sort_order?: number
}

export type ProductUpdate = Partial<ProductCreate>

export interface ProductListParams {
  q?: string
  category_id?: number
  brand_id?: number
  is_active?: boolean
  is_rental?: boolean
  is_sale?: boolean
  is_featured?: boolean
  page?: number
  page_size?: number
  sort?: 'sort_order' | 'name_en' | 'created_at' | 'updated_at'
  order?: 'asc' | 'desc'
}

export interface ImageCreate {
  image_url: string
  alt_text?: string
  is_primary?: boolean
  sort_order?: number
}

// ── Import ────────────────────────────────────────────────────────────────────

export type ImportStatus =
  | 'pending'
  | 'preview'
  | 'processing'
  | 'completed'
  | 'partial'
  | 'failed'

export interface PreviewSpec {
  spec_group: string
  spec_key: string
  spec_label: string
  spec_value: string
  spec_unit: string | null
}

export interface PreviewProduct {
  row_number: number
  action: 'create' | 'update'
  name_en: string
  model_number: string | null
  brand_name: string | null
  category_l1: string | null
  category_l2: string | null
  category_l3: string | null
  description_en: string | null
  specs: PreviewSpec[]
}

export interface PreviewError {
  row_number: number
  sheet_name: string
  error_message: string
  row_data: Record<string, unknown> | null
}

export interface SheetPreview {
  sheet_name: string
  handler: string
  valid_rows: PreviewProduct[]
  error_rows: PreviewError[]
  total_valid: number
  total_errors: number
}

export interface ImportPreviewResponse {
  job_id: number
  filename: string
  sheets_detected: string[]
  total_valid: number
  total_errors: number
  sheets: SheetPreview[]
}

export interface ImportExecuteResponse {
  job_id: number
  status: ImportStatus
  success_rows: number
  error_rows: number
  errors: PreviewError[]
}

export interface ImportJob {
  id: number
  original_filename: string
  status: ImportStatus
  total_rows: number
  processed_rows: number
  success_rows: number
  error_rows: number
  created_by: number | null
  created_at: string
  completed_at: string | null
}
