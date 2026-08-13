import client from './client'
import type { DeliveryOrder, DeliveryOrderCreate, DeliveryOrderListParams, DeliveryOrderListResponse, DeliveryOrderUpdate } from '@/types/deliveryOrder'

const BASE = '/delivery-orders'

export const getDeliveryOrders = (params?: DeliveryOrderListParams) => client.get<DeliveryOrderListResponse>(`${BASE}/`, { params })
export const getDeliveryOrder = (id: number) => client.get<DeliveryOrder>(`${BASE}/${id}`)
export const createDeliveryOrder = (data: DeliveryOrderCreate) => client.post<DeliveryOrder>(`${BASE}/`, data)
export const updateDeliveryOrder = (id: number, data: DeliveryOrderUpdate) => client.put<DeliveryOrder>(`${BASE}/${id}`, data)
export const deleteDeliveryOrder = (id: number) => client.delete<void>(`${BASE}/${id}`)
