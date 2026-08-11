import client from './client'
import type { NotificationItem, NotificationPreference } from '@/types/notification'

export const getMyNotifications = (params?: { skip?: number; limit?: number; unread_only?: boolean }) =>
  client.get<NotificationItem[]>('/notifications/me', { params })

export const getMyUnreadCount = () =>
  client.get<{ count: number }>('/notifications/me/unread-count')

export const markNotificationRead = (id: number) =>
  client.post<NotificationItem>(`/notifications/${id}/read`)

export const markAllNotificationsRead = () =>
  client.post<{ count: number }>('/notifications/read-all')

export const getPreferences = () =>
  client.get<NotificationPreference[]>('/notifications/preferences/')

export const subscribeToEvent = (eventType: string) =>
  client.post<NotificationPreference>('/notifications/preferences/', { event_type: eventType, is_enabled: true })

export const updatePreference = (id: number, isEnabled: boolean) =>
  client.patch<NotificationPreference>(`/notifications/preferences/${id}`, { is_enabled: isEnabled })

export const deletePreference = (id: number) =>
  client.delete(`/notifications/preferences/${id}`)
