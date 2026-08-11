import client from './client'
import type {
  SalesOrder,
  SalesOrderCreate,
  SalesOrderDetail,
  SalesOrderItemBulkItem,
  SalesOrderItemCreate,
  SalesOrderItemOut,
  SalesOrderListParams,
  SalesOrderListResponse,
  SalesOrderUpdate,
} from '@/types/salesOrder'

const BASE = '/sales-orders'

export const getSalesOrders = (params?: SalesOrderListParams) =>
  client.get<SalesOrderListResponse>(`${BASE}/`, { params })

export const getSalesOrder = (id: number) =>
  client.get<SalesOrderDetail>(`${BASE}/${id}`)

export const createSalesOrder = (data: SalesOrderCreate) =>
  client.post<SalesOrder>(`${BASE}/`, data)

export const updateSalesOrder = (id: number, data: SalesOrderUpdate) =>
  client.put<SalesOrder>(`${BASE}/${id}`, data)

export const deleteSalesOrder = (id: number) =>
  client.delete(`${BASE}/${id}`)

// ── Line Items ──────────────────────────────────────────────────────────────

export const addSalesOrderItem = (salesOrderId: number, data: SalesOrderItemCreate) =>
  client.post<SalesOrderItemOut>(`${BASE}/${salesOrderId}/items`, data)

export const deleteSalesOrderItem = (salesOrderId: number, itemId: number) =>
  client.delete(`${BASE}/${salesOrderId}/items/${itemId}`)

/** Replaces the entire line-item set in one transaction — the Excel-grid
 *  editor's Save action, instead of one request per row. */
export const bulkReplaceSalesOrderItems = (salesOrderId: number, items: SalesOrderItemBulkItem[]) =>
  client.put<SalesOrderItemOut[]>(`${BASE}/${salesOrderId}/items/bulk`, items)

// ── Workflow Actions ────────────────────────────────────────────────────────

export const confirmSalesOrder = (id: number, reason?: string) =>
  client.post<SalesOrder>(`${BASE}/${id}/confirm`, { reason })

export const completeSalesOrder = (id: number, reason?: string) =>
  client.post<SalesOrder>(`${BASE}/${id}/complete`, { reason })

export const cancelSalesOrder = (id: number, reason?: string) =>
  client.post<SalesOrder>(`${BASE}/${id}/cancel`, { reason })
