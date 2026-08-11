import { useEffect } from 'react'
import { useCompanyStore } from '@/store/companyStore'
import { resolveMediaUrl } from '@/utils/media'
import './PrintHeader.css'

/**
 * Rendered once in AppLayout, invisible on screen — only shown by the
 * `@media print` rules in styles/print.css. Fixed-positioned so it repeats
 * on every page of a multi-page print job.
 */
export default function PrintHeader() {
  const profile = useCompanyStore((s) => s.profile)
  const fetchProfile = useCompanyStore((s) => s.fetch)

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  if (!profile) return null

  const logoSrc = resolveMediaUrl(profile.logo_url)

  return (
    <div className="print-header">
      <div className="print-header-brand">
        {logoSrc && <img src={logoSrc} alt={profile.company_name} className="print-header-logo" />}
        <span className="print-header-name">{profile.company_name}</span>
      </div>
    </div>
  )
}
