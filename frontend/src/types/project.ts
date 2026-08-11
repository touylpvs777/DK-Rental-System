export type ProjectStatus =
  | 'draft'
  | 'survey'
  | 'design'
  | 'boq_approved'
  | 'installation'
  | 'handover'
  | 'completed'

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed'

export interface Project {
  id: number
  project_number: string
  name: string
  customer_id: number
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
  milestone_total: number
  milestone_completed: number
  customer_name: string
}

export interface ProjectCreate {
  name: string
  customer_id: number
  start_date?: string
  end_date?: string
  notes?: string
}

export interface ProjectUpdate {
  name?: string
  status?: ProjectStatus
  start_date?: string
  end_date?: string
  notes?: string
}

export interface Milestone {
  id: number
  project_id: number
  name: string
  due_date: string | null
  status: MilestoneStatus
  created_at: string
  updated_at: string | null
}

export interface MilestoneCreate {
  name: string
  due_date?: string
  status?: MilestoneStatus
}

export interface BOQItem {
  id: number
  project_id: number
  spare_part_id: number | null
  description: string
  quantity: number
  unit_price: number
  total_price: number
  currency: string
  created_at: string
  updated_at: string | null
}

export interface BOQItemCreate {
  spare_part_id?: number
  description: string
  quantity: number
  unit_price: number
  currency?: string
}

export interface BOQItemUpdate {
  spare_part_id?: number
  description?: string
  quantity?: number
  unit_price?: number
}

export interface ProjectCustomerBrief {
  id: number
  first_name: string
  last_name: string
  company: string | null
}

export interface ProjectDetail extends Project {
  customer: ProjectCustomerBrief | null
  milestones: Milestone[]
  boq_items: BOQItem[]
}

export interface ProjectListResponse {
  items: Project[]
  total: number
  page: number
  page_size: number
  pages: number
}
