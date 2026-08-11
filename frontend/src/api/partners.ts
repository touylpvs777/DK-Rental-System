import client from './client'

export interface PartnerBrief {
  id: number
  name: string
  partner_type: string
  address: string | null
  phone: string | null
}

export interface PartnerListResponse {
  items: PartnerBrief[]
  total: number
  page: number
  page_size: number
  pages: number
}

const B = '/partners'

export const getPartners = (params?: { q?: string; partner_type?: string; is_active?: boolean; page?: number; page_size?: number }) =>
  client.get<PartnerListResponse>(B, { params })
