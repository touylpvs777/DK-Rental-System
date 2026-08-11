export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
export type LeadSource = 'website' | 'referral' | 'cold_call' | 'email' | 'social_media' | 'other'

export interface UserBrief {
  id: number
  username: string
  full_name: string | null
}

export interface CustomerBrief {
  id: number
  first_name: string
  last_name: string
  company: string | null
}

export interface LeadNote {
  id: number
  lead_id: number
  content: string
  created_at: string
  author: UserBrief | null
}

export interface Lead {
  id: number
  title: string
  description: string | null
  value: number | null
  source: LeadSource | null
  status: LeadStatus
  customer_id: number | null
  assigned_to: number | null
  created_by: number | null
  created_at: string
  updated_at: string | null
}

export interface LeadDetail extends Lead {
  assigned_user: UserBrief | null
  customer: CustomerBrief | null
  lead_notes: LeadNote[]
}

export interface LeadCreate {
  title: string
  description?: string
  value?: number
  source?: LeadSource
  status?: LeadStatus
  customer_id?: number
  assigned_to?: number
}

export interface LeadUpdate {
  title?: string
  description?: string
  value?: number
  source?: LeadSource
  status?: LeadStatus
  customer_id?: number
  assigned_to?: number
}

export interface LeadNoteCreate {
  content: string
}
