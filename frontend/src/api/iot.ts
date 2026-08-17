import client from './client'
import type { IoTAlert } from '@/types/iot'

export const getIoTAlerts = (limit = 20) =>
  client.get<IoTAlert[]>('/iot/alerts', { params: { limit } })
