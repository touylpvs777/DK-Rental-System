import client from './client'
import type {
  InvoiceOut, InvoiceDetail, InvoiceListResponse, InvoiceListParams,
  InvoiceCreate, InvoiceUpdate, InvoiceFromCyclesRequest,
  PaymentOut, PaymentListResponse, PaymentListParams, PaymentCreate, PaymentAllocationOut,
  DepositOut, DepositListResponse, DepositCreate,
  RevenueRecognitionOut, RevenueRecognitionListResponse,
  BillingDashboardSummary,
} from '@/types/billing'
import type { RentalBillingCycleOut } from '@/types/rental'

const B = '/billing'

// -- Invoices -----------------------------------------------------------------

export const getInvoices = (params?: InvoiceListParams) =>
  client.get<InvoiceListResponse>(`${B}/invoices`, { params })

export const getInvoice = (id: number) =>
  client.get<InvoiceDetail>(`${B}/invoices/${id}`)

export const createInvoice = (data: InvoiceCreate) =>
  client.post<InvoiceOut>(`${B}/invoices`, data)

export const updateInvoice = (id: number, data: InvoiceUpdate) =>
  client.put<InvoiceOut>(`${B}/invoices/${id}`, data)

export const issueInvoice = (id: number, data?: { issue_date?: string; due_date?: string }) =>
  client.post<InvoiceOut>(`${B}/invoices/${id}/issue`, data ?? {})

export const sendInvoice = (id: number) =>
  client.post<InvoiceOut>(`${B}/invoices/${id}/send`, {})

export const cancelInvoice = (id: number, cancellation_reason: string) =>
  client.post<InvoiceOut>(`${B}/invoices/${id}/cancel`, { cancellation_reason })

export const voidInvoice = (id: number) =>
  client.post<InvoiceOut>(`${B}/invoices/${id}/void`, {})

export const createInvoiceFromCycles = (data: InvoiceFromCyclesRequest) =>
  client.post<InvoiceOut>(`${B}/invoices/from-billing-cycles`, data)

export const getInvoicePdf = (id: number) =>
  client.get<Blob>(`${B}/invoices/${id}/pdf`, { responseType: 'blob' })

// -- Payments -----------------------------------------------------------------

export const getPayments = (params?: PaymentListParams) =>
  client.get<PaymentListResponse>(`${B}/payments`, { params })

export const getPayment = (id: number) =>
  client.get<PaymentOut>(`${B}/payments/${id}`)

export const recordPayment = (data: PaymentCreate) =>
  client.post<PaymentOut>(`${B}/payments`, data)

export const confirmPayment = (id: number) =>
  client.post<PaymentOut>(`${B}/payments/${id}/confirm`, {})

export const rejectPayment = (id: number, reason?: string) =>
  client.post<PaymentOut>(`${B}/payments/${id}/reject`, { reason })

export const allocatePayment = (paymentId: number, data: { invoice_id: number; allocated_amount: number }) =>
  client.post<PaymentAllocationOut>(`${B}/payments/${paymentId}/allocate`, { payment_id: paymentId, ...data })

// -- Deposits -----------------------------------------------------------------

export const getDeposits = (params?: { customer_id?: number; contract_id?: number; deposit_status?: string; deposit_type?: string; page?: number; page_size?: number }) =>
  client.get<DepositListResponse>(`${B}/deposits`, { params })

export const getDeposit = (id: number) =>
  client.get<DepositOut>(`${B}/deposits/${id}`)

export const createDeposit = (data: DepositCreate) =>
  client.post<DepositOut>(`${B}/deposits`, data)

export const receiveDeposit = (id: number, data: { received_date: string; payment_id?: number }) =>
  client.post<DepositOut>(`${B}/deposits/${id}/receive`, data)

export const refundDeposit = (id: number, data: { refund_amount: number; refund_date: string; refund_payment_id?: number; notes?: string }) =>
  client.post<DepositOut>(`${B}/deposits/${id}/refund`, data)

export const forfeitDeposit = (id: number, data: { forfeit_amount: number; reason?: string }) =>
  client.post<DepositOut>(`${B}/deposits/${id}/forfeit`, data)

export const applyDeposit = (id: number, data: { apply_amount: number; invoice_id: number }) =>
  client.post<DepositOut>(`${B}/deposits/${id}/apply`, data)

// -- Revenue Recognition ------------------------------------------------------

export const getRecognitions = (params?: { contract_id?: number; recognition_type?: string; recognition_status?: string; date_from?: string; date_to?: string; page?: number; page_size?: number }) =>
  client.get<RevenueRecognitionListResponse>(`${B}/revenue-recognitions`, { params })

export const createRecognition = (data: Record<string, unknown>) =>
  client.post<RevenueRecognitionOut>(`${B}/revenue-recognitions`, data)

export const recognizeRevenue = (id: number) =>
  client.post<RevenueRecognitionOut>(`${B}/revenue-recognitions/${id}/recognize`, {})

export const reverseRevenue = (id: number) =>
  client.post<RevenueRecognitionOut>(`${B}/revenue-recognitions/${id}/reverse`, {})

// -- Automation & Dashboard ---------------------------------------------------

export const generateBillingCycles = (contractId: number) =>
  client.post<RentalBillingCycleOut[]>(`${B}/contracts/${contractId}/generate-cycles`, {})

export const markOverdueInvoices = () =>
  client.post<{ marked_overdue: number }>(`${B}/invoices/mark-overdue`, {})

export const getBillingSummary = (params?: { customer_id?: number }) =>
  client.get<BillingDashboardSummary>(`${B}/summary`, { params })
