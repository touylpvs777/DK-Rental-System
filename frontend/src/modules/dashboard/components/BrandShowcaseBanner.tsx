import { Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useBrands } from '@/hooks/useBrands'

// Reads real, admin-managed brand records (logo_url is set via /catalog/brands)
// instead of static or scraped imagery — falls back to an icon chip per brand
// until a logo is uploaded, so it never shows a broken image.
export default function BrandShowcaseBanner() {
  const { t } = useTranslation()
  const { brands, isLoading } = useBrands(true)

  if (isLoading) {
    return (
      <section className="mt-8 rounded-2xl border border-white/8 bg-[#1c1c1e] p-5">
        <div className="flex gap-3 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 w-32 shrink-0 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      </section>
    )
  }

  if (brands.length === 0) return null

  return (
    <section className="mt-8 rounded-2xl border border-white/8 bg-[#1c1c1e] p-5">
      <h2 className="mb-4 text-base font-semibold text-gray-100">{t('dashboard.exec.brandsWeService')}</h2>
      <div className="flex flex-wrap gap-3">
        {brands.map((brand) => (
          <div
            key={brand.id}
            className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5"
          >
            {brand.logo_url ? (
              <img src={brand.logo_url} alt={brand.name} className="h-8 w-8 rounded-md object-contain" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10">
                <Building2 size={16} className="text-gray-400" />
              </div>
            )}
            <span className="text-sm font-medium text-gray-100">{brand.name}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
