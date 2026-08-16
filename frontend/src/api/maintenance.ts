import client from './client'
import type { MaintenancePlan, MaintenanceSchedule, WorkOrder, WorkOrderDetail, WorkOrderListResponse, WOListParams, WOCreate, PlanCreate, CostEntry, CostBulkReplaceRequest, ServiceHistoryEntry, DashboardSummary, UserBrief } from '@/types/maintenance'

const B = '/maintenance'

export const getDashboard = () => client.get<DashboardSummary>(`${B}/dashboard`)

export const getTechnicians = () => client.get<UserBrief[]>(`${B}/technicians`)

export const getPlans = (is_active?: boolean) => client.get<MaintenancePlan[]>(`${B}/plans`, { params: { is_active } })
export const getPlan = (id: number) => client.get<MaintenancePlan>(`${B}/plans/${id}`)
export const createPlan = (data: PlanCreate) => client.post<MaintenancePlan>(`${B}/plans`, data)
export const updatePlan = (id: number, data: Record<string, unknown>) => client.put<MaintenancePlan>(`${B}/plans/${id}`, data)

export const getSchedules = (forklift_id?: number) => client.get<MaintenanceSchedule[]>(`${B}/schedules`, { params: { forklift_id } })
export const createSchedule = (data: { forklift_id: number; plan_id: number; next_due_date?: string; next_due_hours?: number; notes?: string }) => client.post<MaintenanceSchedule>(`${B}/schedules`, data)

export const getWorkOrders = (params?: WOListParams) => client.get<WorkOrderListResponse>(`${B}/work-orders`, { params })
export const getWorkOrder = (id: number) => client.get<WorkOrderDetail>(`${B}/work-orders/${id}`)
export const createWorkOrder = (data: WOCreate) => client.post<WorkOrder>(`${B}/work-orders`, data)
export const updateWorkOrder = (id: number, data: Record<string, unknown>) => client.put<WorkOrder>(`${B}/work-orders/${id}`, data)

export const startWorkOrder = (id: number, hour_meter_reading: number, notes?: string) => client.post<WorkOrder>(`${B}/work-orders/${id}/start`, { hour_meter_reading, notes })
export const completeWorkOrder = (id: number, actual_hours: number, findings?: string, resolution?: string, hour_meter_reading?: number) => client.post<WorkOrder>(`${B}/work-orders/${id}/complete`, { actual_hours, findings, resolution, hour_meter_reading })
export const verifyWorkOrder = (id: number) => client.post<WorkOrder>(`${B}/work-orders/${id}/verify`, {})
export const cancelWorkOrder = (id: number, cancellation_reason: string) => client.post<WorkOrder>(`${B}/work-orders/${id}/cancel`, { cancellation_reason })

export const addCost = (woId: number, data: { cost_type: string; description: string; quantity: number; unit_rate: number; vendor?: string }) => client.post<CostEntry>(`${B}/work-orders/${woId}/costs`, data)

export const replaceCostsBulk = (woId: number, data: CostBulkReplaceRequest) => client.put<CostEntry[]>(`${B}/work-orders/${woId}/items/bulk`, data)

export const getServiceHistory = (forkliftId: number) => client.get<ServiceHistoryEntry[]>(`${B}/service-history/${forkliftId}`)
