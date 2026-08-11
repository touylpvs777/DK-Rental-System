import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n'
import './LanguageToggle.css'

const LABELS: Record<SupportedLanguage, string> = {
  en: 'EN',
  lo: 'ລາວ',
  th: 'ไทย',
  zh: '中文',
  vi: 'Tiếng Việt',
  fr: 'Français',
  ar: 'العربية',
  ru: 'Русский',
}

// The 3 languages with full app-wide coverage stay as quick-access pills;
// the rest live in the overflow dropdown purely for space in the topbar —
// both paths drive the exact same i18n.changeLanguage(), so every language
// here is a first-class, fully "instant, global" switch.
const PILL_LANGUAGES: SupportedLanguage[] = ['en', 'lo', 'th']
const MORE_LANGUAGES: SupportedLanguage[] = SUPPORTED_LANGUAGES.filter((lng) => !PILL_LANGUAGES.includes(lng))

export default function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const current = i18n.language as SupportedLanguage
  const isMoreActive = MORE_LANGUAGES.includes(current)

  return (
    <div className="lang-toggle-group">
      <div className="lang-toggle" role="radiogroup" aria-label={t('common.language')}>
        {PILL_LANGUAGES.map((lng) => (
          <button
            key={lng}
            className={`lang-toggle-btn${current === lng ? ' active' : ''}`}
            onClick={() => i18n.changeLanguage(lng)}
            aria-label={LABELS[lng]}
            aria-checked={current === lng}
            role="radio"
            title={LABELS[lng]}
          >
            {LABELS[lng]}
          </button>
        ))}
      </div>

      <select
        className={`lang-toggle-more${isMoreActive ? ' active' : ''}`}
        value={isMoreActive ? current : ''}
        onChange={(e) => { if (e.target.value) i18n.changeLanguage(e.target.value) }}
        title={t('common.moreLanguages')}
        aria-label={t('common.moreLanguages')}
      >
        <option value="" disabled>···</option>
        {MORE_LANGUAGES.map((lng) => (
          <option key={lng} value={lng}>{LABELS[lng]}</option>
        ))}
      </select>
    </div>
  )
}
