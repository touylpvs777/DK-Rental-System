import client from './client'
import type { Lead, LeadDetail, LeadCreate, LeadUpdate, LeadNote, LeadNoteCreate } from '@/types/lead'

export const getLeads = (params?: {
  skip?: number
  limit?: number
  status?: string
  source?: string
  assigned_to?: number
  customer_id?: number
}) => client.get<Lead[]>('/leads/', { params })

export const getLead = (id: number) =>
  client.get<LeadDetail>(`/leads/${id}`)

export const createLead = (data: LeadCreate) =>
  client.post<Lead>('/leads/', data)

export const updateLead = (id: number, data: LeadUpdate) =>
  client.put<Lead>(`/leads/${id}`, data)

export const deleteLead = (id: number) =>
  client.delete(`/leads/${id}`)

export const addNote = (leadId: number, data: LeadNoteCreate) =>
  client.post<LeadNote>(`/leads/${leadId}/notes`, data)

export const getNotes = (leadId: number) =>
  client.get<LeadNote[]>(`/leads/${leadId}/notes`)

export const deleteNote = (leadId: number, noteId: number) =>
  client.delete(`/leads/${leadId}/notes/${noteId}`)
