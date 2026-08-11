import client from './client'
import type {
  Forklift,
  ForkliftCreate,
  ForkliftDetail,
  ForkliftListParams,
  ForkliftListResponse,
  ForkliftUpdate,
} from '@/types/forklift'

const BASE = '/forklifts'

export const getForklifts = (params?: ForkliftListParams) =>
  client.get<ForkliftListResponse>(`${BASE}/`, { params })

export const getForklift = (id: number) =>
  client.get<ForkliftDetail>(`${BASE}/${id}`)

export const createForklift = (data: ForkliftCreate) =>
  client.post<Forklift>(`${BASE}/`, data)

export const updateForklift = (id: number, data: ForkliftUpdate) =>
  client.put<Forklift>(`${BASE}/${id}`, data)

export const deleteForklift = (id: number) =>
  client.delete(`${BASE}/${id}`)
