import { create } from 'zustand'

// Frontend-only avatar override: a base64 data URL persisted in localStorage
// so a user can set a custom photo without any backend/DB change. Shared via
// this store (not per-component state) so uploading it on the Profile page
// is reflected immediately in the Sidebar, and vice versa.
export const CUSTOM_AVATAR_STORAGE_KEY = 'custom_user_avatar'

interface AvatarStore {
  customAvatar: string | null
  setCustomAvatar: (dataUrl: string | null) => void
}

export const useAvatarStore = create<AvatarStore>((set) => ({
  customAvatar: localStorage.getItem(CUSTOM_AVATAR_STORAGE_KEY),
  setCustomAvatar: (dataUrl) => {
    if (dataUrl) localStorage.setItem(CUSTOM_AVATAR_STORAGE_KEY, dataUrl)
    else localStorage.removeItem(CUSTOM_AVATAR_STORAGE_KEY)
    set({ customAvatar: dataUrl })
  },
}))
