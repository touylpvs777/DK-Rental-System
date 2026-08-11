import client from './client'
import type {
  DeliveryNote,
  DeliveryNoteCreate,
  DeliveryNoteDetail,
  DeliveryNoteItemBulkItem,
  DeliveryNoteItemCreate,
  DeliveryNoteItemOut,
  DeliveryNoteListParams,
  DeliveryNoteListResponse,
  DeliveryNoteUpdate,
} from '@/types/deliveryNote'

const BASE = '/delivery-notes'

export const getDeliveryNotes = (params?: DeliveryNoteListParams) =>
  client.get<DeliveryNoteListResponse>(`${BASE}/`, { params })

export const getDeliveryNote = (id: number) =>
  client.get<DeliveryNoteDetail>(`${BASE}/${id}`)

export const createDeliveryNote = (data: DeliveryNoteCreate) =>
  client.post<DeliveryNote>(`${BASE}/`, data)

export const updateDeliveryNote = (id: number, data: DeliveryNoteUpdate) =>
  client.put<DeliveryNote>(`${BASE}/${id}`, data)

export const deleteDeliveryNote = (id: number) =>
  client.delete(`${BASE}/${id}`)

// ── Line Items ──────────────────────────────────────────────────────────────

export const addDeliveryNoteItem = (deliveryNoteId: number, data: DeliveryNoteItemCreate) =>
  client.post<DeliveryNoteItemOut>(`${BASE}/${deliveryNoteId}/items`, data)

export const deleteDeliveryNoteItem = (deliveryNoteId: number, itemId: number) =>
  client.delete(`${BASE}/${deliveryNoteId}/items/${itemId}`)

/** Replaces the entire line-item set in one transaction — the Excel-grid
 *  editor's Save action, instead of one request per row. */
export const bulkReplaceDeliveryNoteItems = (deliveryNoteId: number, items: DeliveryNoteItemBulkItem[]) =>
  client.put<DeliveryNoteItemOut[]>(`${BASE}/${deliveryNoteId}/items/bulk`, items)

// ── Workflow Actions ────────────────────────────────────────────────────────

export const dispatchDeliveryNote = (id: number, reason?: string) =>
  client.post<DeliveryNote>(`${BASE}/${id}/dispatch`, { reason })

export const deliverDeliveryNote = (id: number, reason?: string) =>
  client.post<DeliveryNote>(`${BASE}/${id}/deliver`, { reason })

export const cancelDeliveryNote = (id: number, reason?: string) =>
  client.post<DeliveryNote>(`${BASE}/${id}/cancel`, { reason })
