export type ModuleStatus = 'active' | 'beta' | 'planned'
export type NavGroup    = 'main' | 'analytics' | 'admin'

export interface ModuleConfig {
  /** Unique slug — used as route ID and registry key */
  id: string
  label: string
  description: string
  /** React Router path */
  path: string
  group: NavGroup
  status: ModuleStatus
  /** Accent color for UI (hex) */
  color: string
  /** Lucide icon name (string so the registry is serializable) */
  iconName: string
  /** Planned release tag shown in roadmap UI */
  plannedVersion?: string
}
