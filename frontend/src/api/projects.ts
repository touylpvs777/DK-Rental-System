import client from './client'
import type {
  BOQItem, BOQItemCreate, BOQItemUpdate,
  Milestone, MilestoneCreate, MilestoneStatus,
  Project, ProjectCreate, ProjectDetail, ProjectListResponse, ProjectUpdate,
} from '@/types/project'

const B = '/projects'

export const getProjects = (params?: { status?: string; customer_id?: number; page?: number; page_size?: number }) =>
  client.get<ProjectListResponse>(B, { params })

export const getProject = (id: number) =>
  client.get<ProjectDetail>(`${B}/${id}`)

export const createProject = (data: ProjectCreate) =>
  client.post<Project>(B, data)

export const updateProject = (id: number, data: ProjectUpdate) =>
  client.put<Project>(`${B}/${id}`, data)

export const deleteProject = (id: number) =>
  client.delete(`${B}/${id}`)

export const approveBoq = (id: number) =>
  client.post<Project>(`${B}/${id}/approve-boq`)

export const createMilestone = (projectId: number, data: MilestoneCreate) =>
  client.post<Milestone>(`${B}/${projectId}/milestones`, data)

export const updateMilestoneStatus = (projectId: number, milestoneId: number, status: MilestoneStatus) =>
  client.patch<Milestone>(`${B}/${projectId}/milestones/${milestoneId}/status`, { status })

export const deleteMilestone = (projectId: number, milestoneId: number) =>
  client.delete(`${B}/${projectId}/milestones/${milestoneId}`)

export const createBoqItem = (projectId: number, data: BOQItemCreate) =>
  client.post<BOQItem>(`${B}/${projectId}/boq-items`, data)

export const updateBoqItem = (projectId: number, itemId: number, data: BOQItemUpdate) =>
  client.put<BOQItem>(`${B}/${projectId}/boq-items/${itemId}`, data)

export const deleteBoqItem = (projectId: number, itemId: number) =>
  client.delete(`${B}/${projectId}/boq-items/${itemId}`)
