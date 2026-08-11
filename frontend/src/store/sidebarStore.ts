import { create } from 'zustand'

export type SidebarState = 'expanded' | 'collapsed' | 'hidden'

interface SidebarStore {
  state: SidebarState
  collapsedGroups: string[]
  hoverExpanded: boolean
  setState: (state: SidebarState) => void
  toggle: () => void
  toggleGroup: (groupId: string) => void
  setHoverExpanded: (v: boolean) => void
}

function readGroups(): string[] {
  try {
    return JSON.parse(localStorage.getItem('dk-sidebar-groups') || '[]')
  } catch {
    return []
  }
}

export const useSidebarStore = create<SidebarStore>((set, get) => ({
  state: (localStorage.getItem('dk-sidebar-v2') as SidebarState) || 'collapsed',
  collapsedGroups: readGroups(),
  hoverExpanded: false,

  setState: (state) => {
    localStorage.setItem('dk-sidebar-v2', state)
    set({ state })
  },

  toggle: () => {
    const isMobile = window.innerWidth <= 768
    const { state } = get()
    if (isMobile) {
      set({ state: state === 'hidden' ? 'expanded' : 'hidden' })
    } else {
      const next = state === 'expanded' ? 'collapsed' : 'expanded'
      localStorage.setItem('dk-sidebar-v2', next)
      set({ state: next })
    }
  },

  toggleGroup: (groupId) => {
    const { collapsedGroups } = get()
    const next = collapsedGroups.includes(groupId)
      ? collapsedGroups.filter((g) => g !== groupId)
      : [...collapsedGroups, groupId]
    localStorage.setItem('dk-sidebar-groups', JSON.stringify(next))
    set({ collapsedGroups: next })
  },

  setHoverExpanded: (v) => set({ hoverExpanded: v }),
}))
