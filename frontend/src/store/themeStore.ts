import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  setResolved: (theme: ResolvedTheme) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: (localStorage.getItem('dk-theme-v2') as ThemeMode) || 'dark',
  resolved: 'dark',

  setMode: (mode) => {
    localStorage.setItem('dk-theme-v2', mode)
    set({ mode })
  },

  setResolved: (resolved) => set({ resolved }),
}))
