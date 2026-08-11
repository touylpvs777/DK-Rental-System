import client from './client'
import type {
  Quotation,
  QuotationCreate,
  QuotationDetail,
  QuotationItemBulkItem,
  QuotationItemCreate,
  QuotationItemOut,
  QuotationItemUpdate,
  QuotationListParams,
  QuotationListResponse,
  QuotationUpdate,
} from '@/types/quotation'

const BASE = '/quotations'

export const getQuotations = (params?: QuotationListParams) =>
  client.get<QuotationListResponse>(`${BASE}/`, { params })

export const getQuotation = (id: number) =>
  client.get<QuotationDetail>(`${BASE}/${id}`)

export const createQuotation = (data: QuotationCreate) =>
  client.post<Quotation>(`${BASE}/`, data)

export const updateQuotation = (id: number, data: QuotationUpdate) =>
  client.put<Quotation>(`${BASE}/${id}`, data)

export const deleteQuotation = (id: number) =>
  client.delete(`${BASE}/${id}`)

// ── Line Items ──────────────────────────────────────────────────────────────

export const addItem = (quotationId: number, data: QuotationItemCreate) =>
  client.post<QuotationItemOut>(`${BASE}/${quotationId}/items`, data)

export const updateItem = (quotationId: number, itemId: number, data: QuotationItemUpdate) =>
  client.put<QuotationItemOut>(`${BASE}/${quotationId}/items/${itemId}`, data)

export const deleteItem = (quotationId: number, itemId: number) =>
  client.delete(`${BASE}/${quotationId}/items/${itemId}`)

/** Replaces the entire line-item set in one transaction — what the Excel-grid
 *  editor's Save action calls, instead of one request per row. */
export const bulkReplaceItems = (quotationId: number, items: QuotationItemBulkItem[]) =>
  client.put<QuotationItemOut[]>(`${BASE}/${quotationId}/items/bulk`, items)

// ── Workflow Actions ────────────────────────────────────────────────────────

export const submitQuotation = (id: number, reason?: string) =>
  client.post<Quotation>(`${BASE}/${id}/submit`, { reason })

export const approveQuotation = (id: number, reason?: string, conditions?: string) =>
  client.post<Quotation>(`${BASE}/${id}/approve`, { reason, conditions })

export const rejectQuotation = (id: number, reason?: string) =>
  client.post<Quotation>(`${BASE}/${id}/reject`, { reason })

export const sendQuotation = (id: number, reason?: string) =>
  client.post<Quotation>(`${BASE}/${id}/send`, { reason })

export const acceptQuotation = (id: number, reason?: string) =>
  client.post<Quotation>(`${BASE}/${id}/accept`, { reason })

export const declineQuotation = (id: number, reason?: string) =>
  client.post<Quotation>(`${BASE}/${id}/decline`, { reason })

export const convertQuotation = (id: number, convertedToType: string, notes?: string) =>
  client.post<Quotation>(`${BASE}/${id}/convert`, { converted_to_type: convertedToType, notes })

export const cancelQuotation = (id: number, reason?: string) =>
  client.post<Quotation>(`${BASE}/${id}/cancel`, { reason })

export const reactivateQuotation = (id: number, reason?: string) =>
  client.post<Quotation>(`${BASE}/${id}/reactivate`, { reason })
