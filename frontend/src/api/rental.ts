import client from './client'
import type {
  RentalContract,
  RentalContractCreate,
  RentalContractDetail,
  RentalContractItemCreate,
  RentalContractItemOut,
  RentalContractItemBulkReplaceRequest,
  RentalContractListParams,
  RentalContractListResponse,
  RentalContractUpdate,
  RentalReturnCreate,
  RentalReturnOut,
  RentalExtensionCreate,
  RentalExtensionOut,
  RentalDamageReportOut,
  RentalBillingCycleOut,
} from '@/types/rental'

const BASE = '/rental-contracts'

export const getRentalContracts = (params?: RentalContractListParams) =>
  client.get<RentalContractListResponse>(`${BASE}/`, { params })

export const getRentalContract = (id: number) =>
  client.get<RentalContractDetail>(`${BASE}/${id}`)

export const createRentalContract = (data: RentalContractCreate) =>
  client.post<RentalContract>(`${BASE}/`, data)

export const updateRentalContract = (id: number, data: RentalContractUpdate) =>
  client.put<RentalContract>(`${BASE}/${id}`, data)

export const deleteRentalContract = (id: number) =>
  client.delete(`${BASE}/${id}`)

// -- Line Items ---------------------------------------------------------------

export const addContractItem = (contractId: number, data: RentalContractItemCreate) =>
  client.post<RentalContractItemOut>(`${BASE}/${contractId}/items`, data)

export const deleteContractItem = (contractId: number, itemId: number) =>
  client.delete(`${BASE}/${contractId}/items/${itemId}`)

export const replaceContractItemsBulk = (contractId: number, data: RentalContractItemBulkReplaceRequest) =>
  client.put<RentalContractItemOut[]>(`${BASE}/${contractId}/items/bulk`, data)

// -- Workflow Actions ---------------------------------------------------------

export const submitContract = (id: number, reason?: string) =>
  client.post<RentalContract>(`${BASE}/${id}/submit`, { reason })

export const approveContract = (id: number, reason?: string, conditions?: string) =>
  client.post<RentalContract>(`${BASE}/${id}/approve`, { reason, conditions })

export const rejectContract = (id: number, reason?: string) =>
  client.post<RentalContract>(`${BASE}/${id}/reject`, { reason })

export const activateContract = (id: number, actual_start_date?: string) =>
  client.post<RentalContract>(`${BASE}/${id}/activate`, { actual_start_date })

export const cancelContract = (id: number, cancellation_reason: string) =>
  client.post<RentalContract>(`${BASE}/${id}/cancel`, { cancellation_reason })

export const closeContract = (id: number) =>
  client.post<RentalContract>(`${BASE}/${id}/close`)

export const convertQuotation = (data: { quotation_id: number; [key: string]: unknown }) =>
  client.post<RentalContract>(`${BASE}/convert-quotation`, data)

// -- Returns ------------------------------------------------------------------

export const createReturn = (contractId: number, data: RentalReturnCreate) =>
  client.post<RentalReturnOut>(`${BASE}/${contractId}/returns`, data)

export const updateReturn = (contractId: number, returnId: number, data: Record<string, unknown>) =>
  client.put<RentalReturnOut>(`${BASE}/${contractId}/returns/${returnId}`, data)

export const pickupReturn = (contractId: number, returnId: number, data: Record<string, unknown>) =>
  client.post<RentalReturnOut>(`${BASE}/${contractId}/returns/${returnId}/pickup`, data)

export const receiveReturn = (contractId: number, returnId: number, data: Record<string, unknown>) =>
  client.post<RentalReturnOut>(`${BASE}/${contractId}/returns/${returnId}/receive`, data)

export const completeReturn = (contractId: number, returnId: number) =>
  client.post<RentalReturnOut>(`${BASE}/${contractId}/returns/${returnId}/complete`)

// -- Extensions ---------------------------------------------------------------

export const createExtension = (contractId: number, data: RentalExtensionCreate) =>
  client.post<RentalExtensionOut>(`${BASE}/${contractId}/extensions`, data)

export const approveExtension = (contractId: number, extId: number, reason?: string, conditions?: string) =>
  client.post<RentalExtensionOut>(`${BASE}/${contractId}/extensions/${extId}/approve`, { reason, conditions })

export const rejectExtension = (contractId: number, extId: number, reason?: string) =>
  client.post<RentalExtensionOut>(`${BASE}/${contractId}/extensions/${extId}/reject`, { reason })

// -- Damage Reports -----------------------------------------------------------

export const listDamageReports = (contractId: number) =>
  client.get<RentalDamageReportOut[]>(`${BASE}/${contractId}/damage-reports`)

export const createDamageReport = (contractId: number, data: Record<string, unknown>) =>
  client.post<RentalDamageReportOut>(`${BASE}/${contractId}/damage-reports`, data)

export const updateDamageReport = (contractId: number, reportId: number, data: Record<string, unknown>) =>
  client.put<RentalDamageReportOut>(`${BASE}/${contractId}/damage-reports/${reportId}`, data)

export const disputeDamage = (contractId: number, reportId: number, dispute_reason: string) =>
  client.post<RentalDamageReportOut>(`${BASE}/${contractId}/damage-reports/${reportId}/dispute`, { dispute_reason })

export const resolveDispute = (contractId: number, reportId: number, final_charge: number, dispute_resolution: string) =>
  client.post<RentalDamageReportOut>(`${BASE}/${contractId}/damage-reports/${reportId}/resolve-dispute`, { final_charge, dispute_resolution })

// -- Billing Cycles -----------------------------------------------------------

export const listBillingCycles = (contractId: number) =>
  client.get<RentalBillingCycleOut[]>(`${BASE}/${contractId}/billing-cycles`)

export const createBillingCycle = (contractId: number, data: Record<string, unknown>) =>
  client.post<RentalBillingCycleOut>(`${BASE}/${contractId}/billing-cycles`, data)

// -- Status History -----------------------------------------------------------

export const listStatusHistory = (contractId: number) =>
  client.get<unknown[]>(`${BASE}/${contractId}/status-history`)
