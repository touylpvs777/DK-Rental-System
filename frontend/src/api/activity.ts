import client from './client'
import type { ActivityLog } from '@/types/activity'

export const getActivity = (params?: {
  skip?: number
  limit?: number
  user_id?: number
  action?: string
  entity_type?: string
  entity_id?: number
  from_date?: string
  to_date?: string
}) => client.get<ActivityLog[]>('/activity/', { params })

export const getMyActivity = (params?: {
  action?: string
  from_date?: string
  to_date?: string
}) => client.get<ActivityLog[]>('/activity/me', { params })

export const getEntityHistory = (entityType: string, entityId: number) =>
  client.get<ActivityLog[]>(`/activity/entity/${entityType}/${entityId}`)
