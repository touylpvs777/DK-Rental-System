import client from './client'
import type {
  Movement,
  MovementCreate,
  MovementCheckpoint,
  MovementDetail,
  MovementListParams,
  MovementListResponse,
} from '@/types/movement'

const BASE = '/movements'

export const getMovements = (params?: MovementListParams) =>
  client.get<MovementListResponse>(`${BASE}/`, { params })

export const getMovement = (id: number) =>
  client.get<MovementDetail>(`${BASE}/${id}`)

export const createMovement = (data: MovementCreate) =>
  client.post<Movement>(`${BASE}/`, data)

export const updateMovement = (id: number, data: Record<string, unknown>) =>
  client.put<Movement>(`${BASE}/${id}`, data)

export const prepareMovement = (id: number, notes?: string) =>
  client.post<Movement>(`${BASE}/${id}/prepare`, { notes })

export const departMovement = (id: number, departure_hour_meter: number, notes?: string) =>
  client.post<Movement>(`${BASE}/${id}/depart`, { departure_hour_meter, notes })

export const arriveMovement = (id: number, arrival_hour_meter: number, notes?: string) =>
  client.post<Movement>(`${BASE}/${id}/arrive`, { arrival_hour_meter, notes })

export const completeMovement = (id: number, notes?: string) =>
  client.post<Movement>(`${BASE}/${id}/complete`, { notes })

export const cancelMovement = (id: number, cancellation_reason: string) =>
  client.post<Movement>(`${BASE}/${id}/cancel`, { cancellation_reason })

export const addCheckpoint = (id: number, data: { location?: string; latitude?: number; longitude?: number; notes?: string }) =>
  client.post<MovementCheckpoint>(`${BASE}/${id}/checkpoint`, data)
