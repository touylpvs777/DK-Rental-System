import client from './client'
import type {
  Receipt,
  ReceiptCreate,
  ReceiptDetail,
  ReceiptListParams,
  ReceiptListResponse,
  ReceiptUpdate,
} from '@/types/receipt'

const BASE = '/receipts'

export const getReceipts = (params?: ReceiptListParams) =>
  client.get<ReceiptListResponse>(`${BASE}/`, { params })

export const getReceipt = (id: number) =>
  client.get<ReceiptDetail>(`${BASE}/${id}`)

export const createReceipt = (data: ReceiptCreate) =>
  client.post<Receipt>(`${BASE}/`, data)

export const updateReceipt = (id: number, data: ReceiptUpdate) =>
  client.put<Receipt>(`${BASE}/${id}`, data)

export const deleteReceipt = (id: number) =>
  client.delete(`${BASE}/${id}`)

// ── Workflow Actions ────────────────────────────────────────────────────────

export const confirmReceipt = (id: number, reason?: string) =>
  client.post<Receipt>(`${BASE}/${id}/confirm`, { reason })

export const cancelReceipt = (id: number, reason?: string) =>
  client.post<Receipt>(`${BASE}/${id}/cancel`, { reason })
