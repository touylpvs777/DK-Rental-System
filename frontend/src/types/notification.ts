export interface NotificationItem {
  id: number
  channel: string
  status: string
  recipient: string
  subject: string | null
  message: string
  provider_message_id: string | null
  error_message: string | null
  event_type: string | null
  entity_type: string | null
  entity_id: number | null
  recipient_user_id: number | null
  target_role: string | null
  is_read: boolean
  created_at: string
  sent_at: string | null
}

export interface NotificationPreference {
  id: number
  user_id: number
  event_type: string
  is_enabled: boolean
  created_at: string
  updated_at: string | null
}
