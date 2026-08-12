import client from './client'
import type {
  ShiftHandover,
  ShiftHandoverCreate,
  ShiftHandoverListParams,
  ShiftHandoverListResponse,
  ShiftHandoverUpdate,
} from '@/types/shiftHandover'

const BASE = '/shift-handovers'

export const getShiftHandovers = (params?: ShiftHandoverListParams) =>
  client.get<ShiftHandoverListResponse>(`${BASE}/`, { params })

export const getShiftHandover = (id: number) =>
  client.get<ShiftHandover>(`${BASE}/${id}`)

export const createShiftHandover = (data: ShiftHandoverCreate) =>
  client.post<ShiftHandover>(`${BASE}/`, data)

export const updateShiftHandover = (id: number, data: ShiftHandoverUpdate) =>
  client.put<ShiftHandover>(`${BASE}/${id}`, data)

export const deleteShiftHandover = (id: number) =>
  client.delete<void>(`${BASE}/${id}`)
