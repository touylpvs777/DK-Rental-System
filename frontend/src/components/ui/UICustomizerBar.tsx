import { useTranslation } from 'react-i18next'
import { useCustomUI, type FontSizeTier } from '@/config/customLanguageStore'

const FONT_SIZE_OPTIONS: { tier: FontSizeTier; label: string; titleKey: string }[] = [
  { tier: 'small', label: 'S', titleKey: 'dashboard.exec.customizer.small' },
  { tier: 'medium', label: 'M', titleKey: 'dashboard.exec.customizer.medium' },
  { tier: 'large', label: 'L', titleKey: 'dashboard.exec.customizer.large' },
]

// Language now lives entirely in the topbar (LanguageToggle → i18next,
// global). This bar only controls font size, via customLanguageStore.ts.
export default function UICustomizerBar() {
  const { t } = useTranslation()
  const { fontSize, setFontSize } = useCustomUI()

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2">
      <span className="text-xs font-medium text-blue-100">{t('dashboard.exec.customizer.fontSize')}</span>
      <div className="flex gap-1">
        {FONT_SIZE_OPTIONS.map((opt) => (
          <button
            key={opt.tier}
            type="button"
            onClick={() => setFontSize(opt.tier)}
            aria-pressed={fontSize === opt.tier}
            title={t(opt.titleKey)}
            className={`w-7 rounded-md border py-1 text-xs font-semibold transition-colors ${
              fontSize === opt.tier ? 'border-white bg-white text-blue-900' : 'border-white/30 text-white hover:bg-white/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
