import client from './client'
import type { SparePart, SparePartListResponse, SparePartCreate, PartListParams, Warehouse, InventoryBalance, InventoryTransaction, PurchaseOrder, POListResponse, POCreate, ReceiveItemAction, DashboardSummary, InventoryImportResult } from '@/types/inventory'

export interface POGridRow {
  id: number | null
  item_code?: string
  description?: string
  unit?: string
  quantity_ordered: number
  unit_cost: number
  line_total: number
}

const B = '/inventory'

export const getDashboard = () => client.get<DashboardSummary>(`${B}/dashboard`)

export const getParts = (params?: PartListParams) => client.get<SparePartListResponse>(`${B}/parts`, { params })

export const importInventory = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return client.post<InventoryImportResult>(`${B}/import`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
export const getPart = (id: number) => client.get<SparePart>(`${B}/parts/${id}`)
export const createPart = (data: SparePartCreate) => client.post<SparePart>(`${B}/parts`, data)
export const updatePart = (id: number, data: Record<string, unknown>) => client.put<SparePart>(`${B}/parts/${id}`, data)

export const getWarehouses = () => client.get<Warehouse[]>(`${B}/warehouses`)
export const getWarehouse = (id: number) => client.get<Warehouse>(`${B}/warehouses/${id}`)
export const createWarehouse = (data: { code: string; name: string; address?: string }) => client.post<Warehouse>(`${B}/warehouses`, data)

export const getBalances = (params?: { spare_part_id?: number; warehouse_id?: number }) => client.get<InventoryBalance[]>(`${B}/balances`, { params })
export const getTransactions = (params?: { spare_part_id?: number; warehouse_id?: number }) => client.get<InventoryTransaction[]>(`${B}/transactions`, { params })
export const createTransaction = (data: { transaction_type: string; spare_part_id: number; warehouse_id: number; quantity: number; unit_cost?: number; notes?: string }) => client.post<InventoryTransaction>(`${B}/transactions`, data)

export const getPurchaseOrders = (params?: { status?: string; page?: number; page_size?: number }) => client.get<POListResponse>(`${B}/purchase-orders`, { params })
export const getPurchaseOrder = (id: number) => client.get<PurchaseOrder>(`${B}/purchase-orders/${id}`)
export const createPurchaseOrder = (data: POCreate) => client.post<PurchaseOrder>(`${B}/purchase-orders`, data)
export const submitPO = (id: number) => client.post<PurchaseOrder>(`${B}/purchase-orders/${id}/submit`)
export const receivePO = (id: number, items: ReceiveItemAction[]) => client.post<PurchaseOrder>(`${B}/purchase-orders/${id}/receive`, items)
export const updatePOGrid = (id: number, rows: POGridRow[]) => client.put<PurchaseOrder>(`${B}/purchase-orders/${id}/grid`, { rows })
export const exportPOExcel = (id: number) => client.get(`${B}/purchase-orders/${id}/export-excel`, { responseType: 'blob' })

export const consumePart = (data: { spare_part_id: number; warehouse_id: number; quantity: number; work_order_id?: number; forklift_id?: number; notes?: string }) => client.post(`${B}/consume`, data)
export const getConsumptions = (params?: { spare_part_id?: number; work_order_id?: number }) => client.get(`${B}/consumptions`, { params })
