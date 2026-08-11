import type { ModuleConfig } from './types'

/**
 * Central module registry.
 * Add a new entry here to make a module visible in the Reports roadmap,
 * and eventually wire its route + sidebar nav from this single source.
 */
export const MODULE_REGISTRY: ModuleConfig[] = [
  // ── Active ─────────────────────────────────────────────
  {
    id: 'customers',
    label: 'Customers',
    description: 'Contact management, status tracking, and customer profiles',
    path: '/customers',
    group: 'main',
    status: 'active',
    color: '#2563eb',
    iconName: 'Users',
  },
  {
    id: 'leads',
    label: 'Leads',
    description: 'Lead pipeline, status workflow enforcement, and source tracking',
    path: '/leads',
    group: 'main',
    status: 'active',
    color: '#7c3aed',
    iconName: 'TrendingUp',
  },
  {
    id: 'activity',
    label: 'Activity',
    description: 'Full audit trail with action, entity type, and date filtering',
    path: '/activity',
    group: 'analytics',
    status: 'active',
    color: '#0891b2',
    iconName: 'Activity',
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Charts, conversion metrics, and CSV / Excel data exports',
    path: '/reports',
    group: 'analytics',
    status: 'active',
    color: '#d97706',
    iconName: 'BarChart2',
  },

  {
    id: 'catalog',
    label: 'Product Catalog',
    description: 'Product management with brands, categories, specs, images, and bulk Excel import',
    path: '/catalog',
    group: 'main',
    status: 'active',
    color: '#7c3aed',
    iconName: 'Package',
  },

  {
    id: 'equipment',
    label: 'Equipment Registry',
    description: 'Forklift fleet tracking with serial numbers, status history, and hour meters',
    path: '/equipment',
    group: 'main',
    status: 'active',
    color: '#0d9488',
    iconName: 'Truck',
  },

  {
    id: 'quotations',
    label: 'Quotations',
    description: 'Rental, sales, service, and spare parts quotation management with approval workflow',
    path: '/quotations',
    group: 'main',
    status: 'active',
    color: '#2563eb',
    iconName: 'FileText',
  },

  {
    id: 'rental-contracts',
    label: 'Rental Contracts',
    description: 'Forklift rental lifecycle with reservations, approvals, returns, and billing',
    path: '/rental-contracts',
    group: 'main',
    status: 'active',
    color: '#0891b2',
    iconName: 'ClipboardList',
  },

  // ── Planned ────────────────────────────────────────────
  {
    id: 'projects',
    label: 'Projects',
    description: 'Project management with milestones, status boards, and team assignment',
    path: '/projects',
    group: 'main',
    status: 'planned',
    color: '#16a34a',
    iconName: 'FolderKanban',
    plannedVersion: 'v2.0',
  },
  {
    id: 'services',
    label: 'Services',
    description: 'Service catalog, pricing tiers, and customer service assignments',
    path: '/services',
    group: 'main',
    status: 'planned',
    color: '#ea580c',
    iconName: 'Wrench',
    plannedVersion: 'v2.0',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    description: 'Task board with assignments, due dates, and priority levels',
    path: '/tasks',
    group: 'main',
    status: 'planned',
    color: '#0891b2',
    iconName: 'CheckSquare',
    plannedVersion: 'v2.1',
  },
  {
    id: 'invoices',
    label: 'Invoices',
    description: 'Invoice generation, payment tracking, and revenue reporting',
    path: '/invoices',
    group: 'admin',
    status: 'planned',
    color: '#7c3aed',
    iconName: 'Receipt',
    plannedVersion: 'v2.1',
  },
]

export const ACTIVE_MODULES  = MODULE_REGISTRY.filter(m => m.status === 'active')
export const PLANNED_MODULES = MODULE_REGISTRY.filter(m => m.status === 'planned')
