import client from './client'
import type { Brand, BrandCreate, BrandUpdate } from '@/types/catalog'

const BASE = '/catalog'

// ── Brands ────────────────────────────────────────────────────────────────────

export const getBrands = (params?: { skip?: number; limit?: number; is_active?: boolean }) =>
  client.get<Brand[]>(`${BASE}/brands/`, { params })

export const getBrand = (id: number) =>
  client.get<Brand>(`${BASE}/brands/${id}`)

export const createBrand = (data: BrandCreate) =>
  client.post<Brand>(`${BASE}/brands/`, data)

export const updateBrand = (id: number, data: BrandUpdate) =>
  client.put<Brand>(`${BASE}/brands/${id}`, data)

export const deleteBrand = (id: number) =>
  client.delete(`${BASE}/brands/${id}`)
