import client from './client'
import type {
  Brand,
  BrandCreate,
  BrandUpdate,
  CategoryCreate,
  CategoryUpdate,
  CompatBrand,
  ImageCreate,
  ImportExecuteResponse,
  ImportJob,
  ImportPreviewResponse,
  Product,
  ProductCategory,
  ProductCreate,
  ProductDetail,
  ProductImage,
  ProductListParams,
  ProductListResponse,
  ProductSpec,
  ProductUpdate,
} from '@/types/catalog'

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

// ── Categories ────────────────────────────────────────────────────────────────

export const getCategoryTree = () =>
  client.get<ProductCategory[]>(`${BASE}/categories/`)

export const getCategoriesFlat = () =>
  client.get<ProductCategory[]>(`${BASE}/categories/flat`)

export const getCategory = (id: number) =>
  client.get<ProductCategory>(`${BASE}/categories/${id}`)

export const createCategory = (data: CategoryCreate) =>
  client.post<ProductCategory>(`${BASE}/categories/`, data)

export const updateCategory = (id: number, data: CategoryUpdate) =>
  client.put<ProductCategory>(`${BASE}/categories/${id}`, data)

export const deleteCategory = (id: number) =>
  client.delete(`${BASE}/categories/${id}`)

// ── Products ──────────────────────────────────────────────────────────────────

export const getProducts = (params?: ProductListParams) =>
  client.get<ProductListResponse>(`${BASE}/products/`, { params })

export const getProduct = (id: number) =>
  client.get<ProductDetail>(`${BASE}/products/${id}`)

export const createProduct = (data: ProductCreate) =>
  client.post<Product>(`${BASE}/products/`, data)

export const updateProduct = (id: number, data: ProductUpdate) =>
  client.put<Product>(`${BASE}/products/${id}`, data)

export const deleteProduct = (id: number) =>
  client.delete(`${BASE}/products/${id}`)

// ── Product specs ─────────────────────────────────────────────────────────────

export const addProductSpec = (
  productId: number,
  data: { spec_group: string; spec_key: string; spec_label: string; spec_value: string; spec_unit?: string; sort_order?: number }
) => client.post<ProductSpec>(`${BASE}/products/${productId}/specs`, data)

export const deleteProductSpec = (productId: number, specId: number) =>
  client.delete(`${BASE}/products/${productId}/specs/${specId}`)

// ── Product images ────────────────────────────────────────────────────────────

export const addProductImage = (productId: number, data: ImageCreate) =>
  client.post<ProductImage>(`${BASE}/products/${productId}/images`, data)

export const updateProductImage = (
  productId: number,
  imageId: number,
  data: { alt_text?: string; is_primary?: boolean; sort_order?: number }
) => client.put<ProductImage>(`${BASE}/products/${productId}/images/${imageId}`, data)

export const deleteProductImage = (productId: number, imageId: number) =>
  client.delete(`${BASE}/products/${productId}/images/${imageId}`)

// ── Compat brands ─────────────────────────────────────────────────────────────

export const addCompatBrand = (productId: number, data: { brand_id: number; notes?: string }) =>
  client.post<CompatBrand>(`${BASE}/products/${productId}/compat-brands`, data)

export const removeCompatBrand = (productId: number, compatId: number) =>
  client.delete(`${BASE}/products/${productId}/compat-brands/${compatId}`)

// ── Import ────────────────────────────────────────────────────────────────────

export const previewImport = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return client.post<ImportPreviewResponse>(`${BASE}/products/import/preview`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const executeImport = (jobId: number) =>
  client.post<ImportExecuteResponse>(`${BASE}/products/import/${jobId}/execute`)

export const importNow = (file: File, previewOnly = false) => {
  const fd = new FormData()
  fd.append('file', file)
  return client.post<ImportExecuteResponse>(
    `${BASE}/products/import/?preview_only=${previewOnly}`,
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
}

export const getImportJobs = (params?: { skip?: number; limit?: number }) =>
  client.get<ImportJob[]>(`${BASE}/products/import/jobs`, { params })

export const getImportJob = (id: number) =>
  client.get<ImportJob>(`${BASE}/products/import/jobs/${id}`)

export const deleteImportJob = (id: number) =>
  client.delete(`${BASE}/products/import/jobs/${id}`)
