import { create } from 'zustand'
import client from '@/api/client'

export interface CompanyProfile {
  company_name: string
  address?: string
  phone?: string
  fax?: string
  website?: string
  email?: string
  logo_url?: string
}

interface CompanyState {
  // Org-wide company profile (backend-persisted in Postgres, shared across users —
  // sidebar branding, invoices, print headers). Never persisted to localStorage so
  // it can't go stale or disappear across restarts/devices.
  profile: CompanyProfile | null
  isLoading: boolean
  fetch: () => Promise<void>
  setProfile: (profile: CompanyProfile) => void
}

export const useCompanyStore = create<CompanyState>()((set, get) => ({
  profile: null,
  isLoading: false,

  setProfile: (profile) => set({ profile }),

  fetch: async () => {
    if (get().profile || get().isLoading) return
    set({ isLoading: true })
    try {
      const { data } = await client.get<CompanyProfile>('/settings/company-profile')
      if (data && typeof data === 'object') {
        set({ profile: data })
      }
    } catch {
      // Branding just won't render — never block the app on this.
    } finally {
      set({ isLoading: false })
    }
  },
}))
