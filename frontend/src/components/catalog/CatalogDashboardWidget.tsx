import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, Tag, Layers, AlertCircle } from 'lucide-react'
import { getProducts } from '@/api/catalog'
import { getBrands } from '@/api/catalog'
import { getCategoriesFlat } from '@/api/catalog'
import { StatCard, StatCardSkeleton } from '@/components/ui/StatCard'
import { Link } from 'react-router-dom'

interface CatalogStats {
  totalProducts: number
  totalBrands: number
  totalCategories: number
}

export default function CatalogDashboardWidget() {
  const { t } = useTranslation()
  const [stats, setStats]         = useState<CatalogStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [prodRes, brandRes, catRes] = await Promise.all([
          getProducts({ page: 1, page_size: 1 }),
          getBrands({ limit: 1 }),
          getCategoriesFlat(),
        ])
        if (!cancelled) {
          setStats({
            totalProducts:   prodRes.data.total,
            totalBrands:     brandRes.data.length,
            totalCategories: catRes.data.length,
          })
        }
      } catch {
        if (!cancelled) setError(t('dashboard.catalog.loadError'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [t])

  return (
    <section className="dashboard-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 className="dashboard-section-title" style={{ marginBottom: 0 }}>{t('dashboard.catalog.title')}</h2>
        <Link
          to="/catalog"
          style={{ fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none' }}
        >
          {t('dashboard.catalog.viewCatalog')}
        </Link>
      </div>

      {error && (
        <div className="dashboard-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {isLoading ? (
        <div className="kpi-grid cols-3">
          {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : stats ? (
        <div className="kpi-grid cols-3">
          <StatCard
            label={t('dashboard.catalog.totalProducts')}
            value={stats.totalProducts.toLocaleString()}
            icon={Package}
            accent="#7c3aed"
            iconBg="#f5f3ff"
          />
          <StatCard
            label={t('dashboard.catalog.brands')}
            value={stats.totalBrands.toLocaleString()}
            icon={Tag}
            accent="#0891b2"
            iconBg="#ecfeff"
          />
          <StatCard
            label={t('dashboard.catalog.categories')}
            value={stats.totalCategories.toLocaleString()}
            icon={Layers}
            accent="#16a34a"
            iconBg="#f0fdf4"
          />
        </div>
      ) : null}
    </section>
  )
}
