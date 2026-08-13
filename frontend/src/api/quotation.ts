import client from './client'
import type {
  Quotation, QuotationCreate, QuotationListParams, QuotationListResponse, QuotationUpdate,
} from '@/types/quotation'

const BASE = '/quotations'

export const getQuotations = (params?: QuotationListParams) =>
  client.get<QuotationListResponse>(`${BASE}/`, { params })

export const getQuotation = (id: number) =>
  client.get<Quotation>(`${BASE}/${id}`)

export const createQuotation = (data: QuotationCreate) =>
  client.post<Quotation>(`${BASE}/`, data)

export const updateQuotation = (id: number, data: QuotationUpdate) =>
  client.put<Quotation>(`${BASE}/${id}`, data)

export const deleteQuotation = (id: number) =>
  client.delete<void>(`${BASE}/${id}`)
