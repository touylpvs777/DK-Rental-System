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
