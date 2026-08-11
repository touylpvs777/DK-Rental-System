import { create } from 'zustand'

// NOTE: this store previously also held its own language + vocabulary
// dictionary, independent of the app's react-i18next setup. That's been
// retired — the topbar's LanguageToggle now drives i18n.changeLanguage()
// for every supported language (see src/i18n/index.ts), which is the only
// mechanism that can actually reach every page/component, since that's what
// the rest of the app already reads from. Keeping a second, parallel
// language system here could never satisfy "every page updates instantly"
// — only components that happen to import this store would react to it.
//
// Font size is a genuinely separate, non-translation UI preference, so it
// stays here.

export type FontSizeTier = 'small' | 'medium' | 'large'

const STORAGE_FONT_KEY = 'dk-custom-ui-font-size'

function loadStoredFontSize(): FontSizeTier {
  try {
    const v = localStorage.getItem(STORAGE_FONT_KEY)
    return v === 'small' || v === 'medium' || v === 'large' ? v : 'medium'
  } catch {
    return 'medium'
  }
}

interface CustomUIState {
  fontSize: FontSizeTier
  setFontSize: (size: FontSizeTier) => void
}

export const useCustomUI = create<CustomUIState>((set) => ({
  fontSize: loadStoredFontSize(),

  setFontSize: (size) => {
    try {
      localStorage.setItem(STORAGE_FONT_KEY, size)
    } catch {
      // localStorage unavailable — selection still applies for this session
    }
    set({ fontSize: size })
  },
}))
