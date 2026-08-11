import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import lo from './lo.json'
import th from './th.json'
import zh from './zh.json'
import vi from './vi.json'
import fr from './fr.json'
import ar from './ar.json'
import ru from './ru.json'

// en/lo/th carry full app-wide translations. zh/vi/fr/ar/ru currently cover
// the Executive Dashboard only — any other key gracefully falls back to
// English (fallbackLng below) rather than rendering blank or crashing.
export const SUPPORTED_LANGUAGES = ['en', 'lo', 'th', 'zh', 'vi', 'fr', 'ar', 'ru'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const RTL_LANGUAGES: SupportedLanguage[] = ['ar']

const STORAGE_KEY = 'dk-lang'

function getInitialLanguage(): SupportedLanguage {
  const saved = localStorage.getItem(STORAGE_KEY)
  return SUPPORTED_LANGUAGES.includes(saved as SupportedLanguage) ? (saved as SupportedLanguage) : 'en'
}

function applyDocumentDirection(lng: string) {
  document.documentElement.dir = RTL_LANGUAGES.includes(lng as SupportedLanguage) ? 'rtl' : 'ltr'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    lo: { translation: lo },
    th: { translation: th },
    zh: { translation: zh },
    vi: { translation: vi },
    fr: { translation: fr },
    ar: { translation: ar },
    ru: { translation: ru },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

applyDocumentDirection(i18n.language)

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng)
  applyDocumentDirection(lng)
})

export default i18n
