import { create } from 'zustand'
import type { User } from '@/types/auth'

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: User | null
  setToken: (token: string) => void
  setRefreshToken: (token: string) => void
  setUser: (user: User) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  user: null,

  setToken: (token) => {
    localStorage.setItem('access_token', token)
    set({ token })
  },

  setRefreshToken: (token) => {
    localStorage.setItem('refresh_token', token)
    set({ refreshToken: token })
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ token: null, refreshToken: null, user: null })
  },

  isAuthenticated: () => !!get().token,
}))
