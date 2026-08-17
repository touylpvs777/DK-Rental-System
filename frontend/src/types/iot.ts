export type IoTAlertType = 'offline' | 'maintenance_due'
export type IoTAlertSeverity = 'critical' | 'warning'

export interface IoTAlertForkliftBrief {
  id: number
  serial_number: string
  name_en: string
}

export interface IoTAlert {
  id: string
  type: IoTAlertType
  severity: IoTAlertSeverity
  forklift: IoTAlertForkliftBrief
  message: string
  occurred_at: string
}
