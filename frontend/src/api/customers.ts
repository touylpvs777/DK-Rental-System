import client from './client'
import type { Customer, Customer360, CustomerCreate, CustomerUpdate } from '@/types/customer'

export const getCustomers = (params?: { skip?: number; limit?: number; status?: string; q?: string }) =>
  client.get<Customer[]>('/customers/', { params })

export const getCustomer = (id: number) =>
  client.get<Customer>(`/customers/${id}`)

export const getCustomerOverview = (id: number) =>
  client.get<Customer360>(`/customers/${id}/overview`)

export const createCustomer = (data: CustomerCreate) =>
  client.post<Customer>('/customers/', data)

export const updateCustomer = (id: number, data: CustomerUpdate) =>
  client.patch<Customer>(`/customers/${id}`, data)

export const deleteCustomer = (id: number) =>
  client.delete(`/customers/${id}`)
