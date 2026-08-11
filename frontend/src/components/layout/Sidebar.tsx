import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Users, TrendingUp, Activity, BarChart2, Settings,
  Package, Truck, Car, FileText, ClipboardList,
  Building2, ArrowRightLeft, Wrench, Radio,
  Box, Receipt, CreditCard, Landmark, FileSpreadsheet, Warehouse, LogOut, ShoppingCart,
  UserCircle, KeyRound, PanelLeftClose, PanelLeftOpen, ChevronDown,
  FileCheck2, ReceiptText, Undo2, Banknote, FileOutput, PackageCheck, PackageMinus,
  BadgeCheck, Camera, LayoutGrid,
} from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { useAuthStore } from '@/store/authStore'
import { useSidebarStore } from '@/store/sidebarStore'
import { useCompanyStore } from '@/store/companyStore'
import { useAvatarStore } from '@/store/avatarStore'
import { resolveMediaUrl } from '@/utils/media'
import './Sidebar.css'

interface NavGroup {
  id: string
  labelKey: string
  items: { to: string; labelKey: string; icon: React.ElementType; adminOnly?: boolean }[]
}

// Maps a user's `avatar_icon` value to a Lucide icon, used when they have
// no uploaded photo but picked a stand-in icon instead (e.g. drivers/dispatchers).
const AVATAR_ICONS: Record<string, React.ElementType> = {
  truck: Truck,
  car: Car,
}

function SidebarAvatarContent({
  avatarUrl,
  avatarIcon,
  initials,
}: {
  avatarUrl: string | null
  avatarIcon?: string | null
  initials: string
}) {
  if (avatarUrl) return <img src={avatarUrl} alt="" className="sidebar-avatar-img" />
  const Icon = avatarIcon ? AVATAR_ICONS[avatarIcon] : undefined
  if (Icon) return <Icon size={16} />
  return <>{initials}</>
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'dashboard',
    labelKey: 'nav.groups.dashboard',
    items: [
      { to: '/dashboard', labelKey: 'nav.items.overview', icon: LayoutDashboard },
    ],
  },
  {
    id: 'crm',
    labelKey: 'nav.groups.crm',
    items: [
      { to: '/customers', labelKey: 'nav.items.customers', icon: Users },
      { to: '/leads', labelKey: 'nav.items.leads', icon: TrendingUp },
    ],
  },
  {
    id: 'sales',
    labelKey: 'nav.groups.sales',
    items: [
      { to: '/quotations', labelKey: 'nav.items.quotations', icon: FileText },
      { to: '/sales-orders', labelKey: 'nav.items.salesOrders', icon: FileCheck2 },
      { to: '/inventory/delivery-notes', labelKey: 'nav.items.deliveryNotes', icon: FileOutput },
    ],
  },
  {
    id: 'purchasing',
    labelKey: 'nav.groups.purchasing',
    items: [
      { to: '/inventory/purchase-orders', labelKey: 'nav.items.purchaseOrders', icon: ShoppingCart },
      { to: '/inventory/goods-receive', labelKey: 'nav.items.goodsReceive', icon: PackageCheck },
    ],
  },
  {
    id: 'equipment',
    labelKey: 'nav.groups.equipment',
    items: [
      { to: '/equipment', labelKey: 'nav.items.registry', icon: Truck },
      { to: '/movements', labelKey: 'nav.items.movements', icon: ArrowRightLeft },
    ],
  },
  {
    id: 'rental',
    labelKey: 'nav.groups.rental',
    items: [
      { to: '/rental-contracts', labelKey: 'nav.items.contracts', icon: ClipboardList },
    ],
  },
  {
    id: 'maintenance',
    labelKey: 'nav.groups.maintenance',
    items: [
      { to: '/maintenance', labelKey: 'nav.items.maintenance', icon: Wrench },
    ],
  },
  {
    id: 'inventory',
    labelKey: 'nav.groups.inventory',
    items: [
      { to: '/inventory', labelKey: 'nav.items.inventory', icon: Box },
      { to: '/inventory/pos', labelKey: 'nav.items.partsPOS', icon: LayoutGrid },
      { to: '/inventory/goods-issue', labelKey: 'nav.items.goodsIssue', icon: PackageMinus },
      { to: '/inventory/goods-receive', labelKey: 'nav.items.goodsReceive', icon: PackageCheck },
      { to: '/catalog', labelKey: 'nav.items.products', icon: Package },
    ],
  },
  {
    id: 'projects',
    labelKey: 'nav.groups.projects',
    items: [
      { to: '/projects', labelKey: 'nav.items.warehouseProjects', icon: Warehouse },
    ],
  },
  {
    id: 'finance',
    labelKey: 'nav.groups.finance',
    items: [
      { to: '/billing', labelKey: 'nav.items.billing', icon: Receipt },
      { to: '/billing/invoices', labelKey: 'nav.items.invoices', icon: FileText },
      { to: '/billing/tax-invoices', labelKey: 'nav.items.taxInvoices', icon: ReceiptText },
      { to: '/billing/credit-notes', labelKey: 'nav.items.creditNotes', icon: Undo2 },
      { to: '/billing/payments', labelKey: 'nav.items.payments', icon: CreditCard },
      { to: '/billing/receipts', labelKey: 'nav.items.receipts', icon: BadgeCheck },
      { to: '/billing/payment-vouchers', labelKey: 'nav.items.paymentVouchers', icon: Banknote },
      { to: '/billing/deposits', labelKey: 'nav.items.deposits', icon: Landmark },
      { to: '/billing/statements', labelKey: 'nav.items.statements', icon: FileSpreadsheet },
    ],
  },
  {
    id: 'executive',
    labelKey: 'nav.groups.executive',
    items: [
      { to: '/activities', labelKey: 'nav.items.activity', icon: Activity, adminOnly: true },
      { to: '/reports', labelKey: 'nav.items.reports', icon: BarChart2 },
      { to: '/iot-management', labelKey: 'nav.items.iotTelemetry', icon: Radio, adminOnly: true },
      // '/executive' (Analytics) removed for the MVP presentation — redundant with
      // the new /dashboard executive overview, and the endpoint isn't wired up yet.
    ],
  },
]

export default function Sidebar() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const sidebarState = useSidebarStore((s) => s.state)
  const setState = useSidebarStore((s) => s.setState)
  const toggle = useSidebarStore((s) => s.toggle)
  const collapsedGroups = useSidebarStore((s) => s.collapsedGroups)
  const toggleGroup = useSidebarStore((s) => s.toggleGroup)
  const isExpanded = sidebarState === 'expanded'

  const initials = user
    ? (user.full_name ?? user.username).split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'
  const userAvatarUrl = resolveMediaUrl(user?.avatar_url)
  const customAvatar = useAvatarStore((s) => s.customAvatar)
  const setCustomAvatar = useAvatarStore((s) => s.setCustomAvatar)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)
  const avatarUrl = customAvatar ?? userAvatarUrl

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCustomAvatar(reader.result as string)
    reader.readAsDataURL(file)
  }

  const displayName = user?.full_name ?? user?.username ?? '—'
  const role = user?.is_superuser ? t('header.roleAdmin') : t('header.roleUser')

  const closeMobile = () => {
    if (window.innerWidth <= 768) setState('hidden')
  }

  const [isUserMenuOpen, setUserMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ left: number; bottom: number } | null>(null)
  const userTriggerRef = useRef<HTMLButtonElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const toggleUserMenu = () => {
    if (!isUserMenuOpen) {
      const rect = userTriggerRef.current?.getBoundingClientRect()
      if (rect) setMenuPos({ left: rect.left, bottom: window.innerHeight - rect.top + 8 })
    }
    setUserMenuOpen((v) => !v)
  }

  useEffect(() => {
    if (!isUserMenuOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        userTriggerRef.current && !userTriggerRef.current.contains(target) &&
        userMenuRef.current && !userMenuRef.current.contains(target)
      ) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isUserMenuOpen])

  const handleLogout = () => {
    setUserMenuOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const companyProfile = useCompanyStore((s) => s.profile)
  const fetchCompanyProfile = useCompanyStore((s) => s.fetch)
  useEffect(() => {
    fetchCompanyProfile()
  }, [fetchCompanyProfile])
  const brandLogoUrl = resolveMediaUrl(companyProfile?.logo_url)
  const brandCompanyName = companyProfile?.company_name || t('common.brandName')

  return (
    <>
      <div
        className={`sidebar-overlay${sidebarState === 'expanded' && window.innerWidth <= 768 ? ' visible' : ''}`}
        onClick={() => setState('hidden')}
        aria-hidden="true"
      />

      <aside className="sidebar transition-all duration-300" data-state={sidebarState} aria-label={t('common.mainNavigation')}>
        {/* Brand */}
        <div className="sidebar-brand">
          <NavLink to="/dashboard" className="sidebar-brand-icon-link" onClick={closeMobile} title={brandCompanyName}>
            <div className={`sidebar-brand-icon${brandLogoUrl ? ' sidebar-brand-icon--logo' : ''}`}>
              {brandLogoUrl
                ? <img src={brandLogoUrl} alt="" className="sidebar-brand-logo-img" />
                : <Building2 size={18} />}
            </div>
          </NavLink>

          {isExpanded && (
            <span className="sidebar-brand-name-text">{brandCompanyName}</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group) => {
            const isGroupCollapsed = isExpanded && collapsedGroups.includes(group.id)
            return (
              <div key={group.id} className="sidebar-group">
                {isExpanded && (
                  <button
                    type="button"
                    className="sidebar-group-header"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={!isGroupCollapsed}
                  >
                    <span className="sidebar-group-label">{t(group.labelKey)}</span>
                    <ChevronDown className="sidebar-group-chevron" size={13} />
                  </button>
                )}
                <div className={`sidebar-group-items-wrap${isGroupCollapsed ? ' is-collapsed' : ''}`}>
                  <div className="sidebar-group-items">
                    {group.items
                      .filter((item) => !item.adminOnly || user?.is_superuser)
                      .map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/catalog' || item.to === '/billing'}
                        className={({ isActive }) =>
                          `sidebar-nav-item${isActive ? ' active' : ''}`
                        }
                        onClick={closeMobile}
                        title={t(item.labelKey)}
                      >
                        <item.icon className="sidebar-nav-icon" size={16} />
                        {isExpanded && <span className="sidebar-nav-label">{t(item.labelKey)}</span>}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}

          <div className="sidebar-divider" />
          {user?.is_superuser && (
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `sidebar-nav-item${isActive ? ' active' : ''}`
              }
              onClick={closeMobile}
              title={t('nav.items.settings')}
            >
              <Settings className="sidebar-nav-icon" size={16} />
              {isExpanded && <span className="sidebar-nav-label">{t('nav.items.settings')}</span>}
            </NavLink>
          )}
        </nav>

        {/* Expand / collapse toggle */}
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={toggle}
          title={isExpanded ? t('nav.collapseSidebar') : t('nav.expandSidebar')}
        >
          {isExpanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          {isExpanded && <span className="sidebar-nav-label">{t('nav.collapseSidebar')}</span>}
        </button>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-user"
            ref={userTriggerRef}
            onClick={toggleUserMenu}
            aria-haspopup="true"
            aria-expanded={isUserMenuOpen}
            title={displayName}
          >
            <div className={`sidebar-avatar${avatarUrl ? ' sidebar-avatar--image' : ''}`}>
              <SidebarAvatarContent avatarUrl={avatarUrl} avatarIcon={user?.avatar_icon} initials={initials} />
            </div>
            {isExpanded && (
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{displayName}</div>
                <div className="sidebar-user-role">{role}</div>
              </div>
            )}
          </button>

          {isUserMenuOpen && menuPos && createPortal(
            <div
              ref={userMenuRef}
              className="sidebar-user-menu"
              style={{ position: 'fixed', left: menuPos.left, bottom: menuPos.bottom }}
              role="menu"
            >
              <div className="sidebar-user-menu-header">
                <button
                  type="button"
                  className="sidebar-avatar-upload-trigger"
                  onClick={() => avatarFileInputRef.current?.click()}
                  title={t('header.changePhoto')}
                >
                  <div
                    className={`sidebar-avatar${avatarUrl ? ' sidebar-avatar--image' : ''}`}
                    style={{ width: 38, height: 38, fontSize: 13 }}
                  >
                    <SidebarAvatarContent avatarUrl={avatarUrl} avatarIcon={user?.avatar_icon} initials={initials} />
                  </div>
                  <span className="sidebar-avatar-upload-overlay" aria-hidden="true">
                    <Camera size={14} />
                  </span>
                </button>
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  className="sidebar-avatar-file-input"
                  onChange={handleAvatarFileChange}
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <div className="sidebar-user-menu-header-info">
                  <div className="sidebar-user-menu-name">{displayName}</div>
                  {user?.email && <div className="sidebar-user-menu-email">{user.email}</div>}
                  <div className="sidebar-user-menu-role">{role}</div>
                </div>
              </div>

              <div className="sidebar-user-menu-section">
                <div className="sidebar-user-menu-section-label">{t('header.appearance')}</div>
                <ThemeToggle />
              </div>

              <div className="sidebar-user-menu-divider" />

              <button
                type="button"
                className="sidebar-user-menu-item"
                role="menuitem"
                onClick={() => { setUserMenuOpen(false); closeMobile(); navigate('/settings') }}
              >
                <Settings size={14} /> {t('header.settings')}
              </button>

              <div className="sidebar-user-menu-divider" />

              <button
                type="button"
                className="sidebar-user-menu-item"
                role="menuitem"
                onClick={() => { setUserMenuOpen(false); closeMobile(); navigate('/profile') }}
              >
                <UserCircle size={14} /> {t('header.myProfile')}
              </button>
              <button
                type="button"
                className="sidebar-user-menu-item"
                role="menuitem"
                onClick={() => { setUserMenuOpen(false); closeMobile(); navigate('/change-password') }}
              >
                <KeyRound size={14} /> {t('header.changePassword')}
              </button>

              <div className="sidebar-user-menu-divider" />

              <button type="button" className="sidebar-user-menu-item danger" role="menuitem" onClick={handleLogout}>
                <LogOut size={14} /> {t('header.logout')}
              </button>
            </div>,
            document.body
          )}
        </div>
      </aside>
    </>
  )
}
