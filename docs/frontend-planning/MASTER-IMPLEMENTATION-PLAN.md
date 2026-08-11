# Master Implementation Plan — DK Service Design System Rollout

**Strategy:** Incremental. Each step ships a working application.  
**Constraint:** Frontend only. Zero backend/API/database changes. All existing business logic preserved.  
**Baseline:** 108 source files across 5 modules.  
**Date:** 2026-06-21

---

## Execution Rules

1. **One step at a time.** Complete step N before starting step N+1.
2. **Test after every step.** Verify the app renders, all routes work, no console errors.
3. **One commit per step.** Each step is a single, revertible Git commit.
4. **No page logic changes.** Forms, API calls, hooks, types, stores — untouched unless explicitly listed.
5. **CSS variable aliases.** New token names AND old names coexist — zero breakage for existing pages.

---

## Phase 1: Layout Foundation

**Goal:** Design tokens, theme system, responsive sidebar, enterprise header.  
**Result:** New app shell visible to all users. All 19 routes still work. Zero page-level changes.

---

### Step 1.1 — Design Tokens

**Create:** `src/styles/tokens.css`

**Content:** Complete `:root` block with all design system tokens:

```
COLOR TOKENS (from DESIGN-SYSTEM.md Section 1):
  Primary blue scale:    --color-primary-25 through --color-primary-900
  Success green scale:   --color-success-25 through --color-success-900
  Warning amber scale:   --color-warning-25 through --color-warning-900
  Danger red scale:      --color-danger-25 through --color-danger-900
  Info cyan scale:       --color-info-50 through --color-info-700
  Purple scale:          --color-purple-50 through --color-purple-700
  Gray neutral scale:    --color-gray-25 through --color-gray-950
  
  Semantic aliases:      --color-bg, --color-surface, --color-border, --color-text, etc.
  
  CRITICAL — backwards compatibility aliases:
    --color-primary: var(--color-primary-600)         ← existing pages use this
    --color-primary-dark: var(--color-primary-700)    ← existing pages use this
    --color-primary-light: var(--color-primary-50)    ← existing pages use this
    --color-danger: var(--color-danger-500)            ← existing pages use this
    --color-success: var(--color-success-500)          ← existing pages use this
    --color-warning: var(--color-warning-500)          ← existing pages use this

LAYOUT TOKENS:
  --sidebar-width-expanded: 248px
  --sidebar-width-collapsed: 68px
  --topbar-height: 56px
  --content-max-width: 1440px

SPACING TOKENS (from DESIGN-SYSTEM.md Section 9):
  --space-0.5 through --space-20

RADIUS TOKENS (from DESIGN-SYSTEM.md Appendix B):
  --radius-sm: 4px
  --radius: 6px         ← existing pages use this name — keep as-is
  --radius-md: 8px
  --radius-lg: 12px
  --radius-xl: 16px
  --radius-full: 9999px

SHADOW TOKENS (from DESIGN-SYSTEM.md Appendix A):
  --shadow-xs through --shadow-xl
  --shadow: existing value kept   ← existing pages use this name
  --shadow-md: existing value kept

Z-INDEX TOKENS (from DESIGN-SYSTEM.md Appendix C):
  --z-base through --z-toast

TRANSITION TOKENS (from DESIGN-SYSTEM.md Appendix D):
  --duration-fast through --duration-slower
  --ease-default through --ease-bounce

SIDEBAR TOKENS:
  --sidebar-bg: #0f172a
  --sidebar-text through --sidebar-active-bg

[data-theme="dark"] block:
  Override all semantic color aliases
  Override shadow intensities
  Override sidebar-bg

prefers-reduced-motion media query
```

**Verify:** No visual change — file exists but isn't imported yet.

---

### Step 1.2 — Breakpoint Utilities

**Create:** `src/styles/breakpoints.css`

**Content:** Reference comment with 6 named breakpoints (xs through 2xl). Utility classes: `.hide-below-sm`, `.hide-below-md`, `.hide-below-lg`, `.show-below-md`, `.show-below-lg`, `.sr-only`, `.text-truncate`, `.line-clamp-2`, `.line-clamp-3`.

**Verify:** No visual change.

---

### Step 1.3 — Wire Tokens Into Entry Point

**Modify:** `src/index.css`

```
REMOVE: lines 7-28 (the :root { } block — 10 existing variables)
ADD at top: @import './styles/tokens.css';
ADD after: @import './styles/breakpoints.css';
UPDATE: body font-family to 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif
KEEP: everything else (reset, .btn classes, .spin animation)
```

**Modify:** `index.html`

```
ADD to <head>:
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
CHANGE: <title>DK Service — Enterprise Platform</title>
ADD: data-theme="light" on <html> tag
```

**Verify:** App renders identically. Font changes to Inter. Title bar updated. All pages look the same (token aliases map 1:1).

---

### Step 1.4 — Theme & Sidebar Stores

**Create:** `src/store/themeStore.ts`

```
Zustand store. Interface: { mode: 'light'|'dark'|'system', resolved: 'light'|'dark', setMode, setResolved }
Reads initial mode from localStorage('dk-theme'), defaults to 'system'.
setMode persists to localStorage.
Pattern: identical to existing authStore.ts.
```

**Create:** `src/store/sidebarStore.ts`

```
Zustand store. Interface: { state: 'expanded'|'collapsed'|'hidden', collapsedGroups: string[], 
  hoverExpanded: boolean, setState, toggle, toggleGroup, setHoverExpanded }
Reads state from localStorage('dk-sidebar'), defaults to 'expanded'.
Reads collapsedGroups from localStorage('dk-sidebar-groups'), defaults to [].
toggle(): desktop → expanded↔collapsed, mobile → hidden↔expanded.
Pattern: identical to existing authStore.ts.
```

**Verify:** No visual change. Stores exist but aren't consumed yet.

---

### Step 1.5 — Theme Provider

**Create:** `src/providers/ThemeProvider.tsx`

```
Reads themeStore.mode.
If 'system': attaches matchMedia('(prefers-color-scheme: dark)') listener.
Resolves actual theme. Sets document.documentElement.setAttribute('data-theme', resolved).
Calls themeStore.setResolved(resolved). Cleans up listener on unmount.
Renders: {children} — no wrapper div.
```

**Modify:** `src/main.tsx`

```
ADD: import ThemeProvider from '@/providers/ThemeProvider'
WRAP: <App /> inside <ThemeProvider>
```

**Verify:** App renders. `<html data-theme="light">` visible in DOM. No visual change.

---

### Step 1.6 — Route Configuration

**Create:** `src/config/routes.ts`

```
ROUTE_CONFIG array: 19 entries matching every route in App.tsx.
Each entry: { path, label, parent? }
Export: matchRoute(pathname), buildBreadcrumbs(pathname), getPageTitle(pathname)
All 19 routes from App.tsx lines 41-68 covered.
```

**Verify:** No visual change. Pure data module.

---

### Step 1.7 — Code Splitting

**Modify:** `src/App.tsx`

```
REPLACE: 16 direct imports (lines 5-22) → 16 React.lazy() calls
ADD: import { lazy, Suspense } from 'react'
ADD: inline LoadingFallback component (centered spinner, ~5 lines)
WRAP: <Outlet /> inside <Suspense fallback={<LoadingFallback />}>
KEEP: all route paths byte-for-byte identical
KEEP: PrivateRoute, AppLayout, ToastContainer unchanged
```

**Verify:** All 19 routes still work. Network tab shows chunk files. Brief spinner on first visit to each page.

---

### Step 1.8 — Sidebar Rewrite

**Create:** `src/components/layout/SidebarBrand.tsx`

```
Logo icon + "DK Service" / "Enterprise Platform" in expanded mode.
Icon only in collapsed mode. Click navigates to /dashboard.
Reads sidebarStore.state for display mode.
```

**Create:** `src/components/layout/SidebarNav.tsx`

```
6 nav groups matching current Sidebar.tsx nav arrays:
  main:      Dashboard
  crm:       Customers, Leads  
  sales:     Quotations, Rental Contracts
  fleet:     Equipment Registry
  catalog:   Products, Brands, Categories, Import
  analytics: Activity, Reports
  Fixed:     Settings (below divider)

Each group: collapsible header with ChevronDown → ChevronRight.
Collapse state from sidebarStore.collapsedGroups.
Each item: NavLink with isActive + aria-current="page".
Expanded: icon + label. Collapsed: icon only + tooltip.
Active: left 3px primary border + primary-50 bg.
All to= values identical to current Sidebar.tsx lines 27-51.
```

**Create:** `src/components/layout/SidebarFooter.tsx`

```
User avatar (initials) + name + role in expanded mode.
Avatar only in collapsed mode.
Collapse/expand toggle button: PanelLeftClose / PanelLeftOpen.
Reads authStore.user (same data as current Sidebar footer).
```

**Rewrite:** `src/components/layout/Sidebar.tsx`

```
REMOVE: all NAV_MAIN, NAV_SALES, etc. arrays (lines 26-51)
REMOVE: NavItem inline component (lines 61-84)
REMOVE: manual nav rendering (lines 123-157)
REPLACE with: <SidebarBrand /> + <nav><SidebarNav /></nav> + <SidebarFooter />
READ state from sidebarStore (not props)
NO PROPS — remove isOpen/onClose interface
data-state attribute: "expanded" | "collapsed" | "hidden"
Mobile overlay: same backdrop pattern as current
```

**Rewrite:** `src/components/layout/Sidebar.css`

```
Replace fixed width: 240px → width: var(--sidebar-width)
Add [data-state="expanded"], [data-state="collapsed"], [data-state="hidden"] rules
Collapsed: hide labels, center icons, 68px width
Hidden: transform translateX(-100%)
Hover-expand: temporary overlay at expanded width
Transition: width var(--duration-slow) var(--ease-default)
Keep: all existing color values (dark sidebar bg) — now via token vars
```

**Verify:** All 15 nav items render. Click each one — navigates correctly. Groups collapse/expand. Sidebar collapses to 68px rail. Mobile overlay works. State persists across refresh.

---

### Step 1.9 — Header (replaces Topbar)

**Create:** `src/components/layout/Breadcrumb.tsx` + `.css`

```
Reads useLocation().pathname.
Calls buildBreadcrumbs(pathname) from config/routes.ts.
Single level: renders page title only (15px semibold).
Multi level: renders Parent › Current with links.
Also sets document.title via useEffect.
```

**Create:** `src/components/ui/ThemeToggle.tsx` + `.css`

```
3-button segmented control: Sun (light), Moon (dark), Monitor (system).
Active: primary bg, white icon. Inactive: transparent, muted.
Reads/writes themeStore.mode.
```

**Create:** `src/components/ui/SearchBar.tsx` + `.css`

```
Two modes: compact (in header, 36px, 280px) and overlay (command palette).
Cmd+K / Ctrl+K keyboard shortcut to open.
Client-side: fuzzy search over ROUTE_CONFIG items + recent pages from localStorage.
Groups: Recent, Quick Actions, Navigation.
Arrow keys navigate, Enter selects, Esc closes.
No API calls — purely client-side navigation.
```

**Create:** `src/components/ui/NotificationCenter.tsx` + `.css`

```
Bell icon button (34px) with unread count badge (red dot).
Dropdown (360px): header + activity items + "View all" link.
Data: getActivity({ limit: 10 }) from existing src/api/activity.ts.
Unread: compare timestamps against localStorage('dk-last-notification-read').
Click item → navigate. "View all" → /activity.
Close: outside click, Esc.
```

**Create:** `src/components/ui/UserProfileDropdown.tsx` + `.css`

```
Trigger: avatar circle (32px initials) + name (hide < 768px) + ChevronDown.
Dropdown (240px): user header (name, email, role) + ThemeToggle + Settings link + Logout.
Data: authStore.user (same data as current Topbar).
Logout: calls useAuth().logout() (same as current Topbar line 43-45).
```

**Create:** `src/components/layout/Header.tsx` + `.css`

```
Replaces Topbar.tsx. Fixed position.
Left: hamburger (calls sidebarStore.toggle) + Breadcrumb.
Center: SearchBar (compact mode).
Right: NotificationCenter + UserProfileDropdown.
CSS: left: var(--sidebar-width) — dynamic offset.
```

**Verify:** Breadcrumbs appear on sub-pages. Cmd+K opens search. Bell icon shows. User menu shows. Theme toggle works. Logout works. Mobile hamburger opens sidebar.

---

### Step 1.10 — Layout Shell Rewrite

**Rewrite:** `src/components/layout/AppLayout.tsx`

```
REMOVE: useState for sidebarOpen (line 10-12)
REMOVE: useEffect resize handler (lines 15-25)
REMOVE: toggle/close functions (lines 27-30)
REPLACE with: subscribe to sidebarStore.state
Compute --sidebar-width CSS variable based on state:
  expanded → var(--sidebar-width-expanded)
  collapsed → var(--sidebar-width-collapsed)
  hidden → 0px
Set on .app-shell via inline style.
Viewport resize auto-transitions:
  > 1024px → restore last desktop state
  768-1024px → force collapsed
  < 768px → force hidden
Render: <Sidebar /> + <div.app-main> <Header /> + <main> <Suspense> <Outlet /> </main>
```

**Rewrite:** `src/components/layout/AppLayout.css`

```
.app-main margin-left: var(--sidebar-width) — replaces hardcoded 240px
.app-main padding-top: var(--topbar-height) — replaces hardcoded 56px
Transition: margin-left var(--duration-slow) var(--ease-default)
Mobile: margin-left: 0
```

**Delete:** `src/components/layout/Topbar.tsx` + `Topbar.css`  
**Delete:** `src/App.css` (dead file, zero imports)

**Verify:** Full new shell live. All 19 routes render. Sidebar 3-state works. Header responsive. Content area adjusts fluidly.

---

### Step 1.10 Checkpoint — Layout Complete

```
NEW FILES (20):
  styles/tokens.css, styles/breakpoints.css
  store/themeStore.ts, store/sidebarStore.ts
  providers/ThemeProvider.tsx
  config/routes.ts
  components/layout/SidebarBrand.tsx, SidebarNav.tsx, SidebarFooter.tsx
  components/layout/Header.tsx + .css, Breadcrumb.tsx + .css
  components/ui/SearchBar.tsx + .css
  components/ui/NotificationCenter.tsx + .css
  components/ui/UserProfileDropdown.tsx + .css
  components/ui/ThemeToggle.tsx + .css

MODIFIED FILES (4):
  index.html, index.css, main.tsx, App.tsx

REWRITTEN FILES (4):
  AppLayout.tsx + .css, Sidebar.tsx + .css

DELETED FILES (3):
  Topbar.tsx, Topbar.css, App.css

PAGE FILES CHANGED: 0
```

---

## Phase 2: Dashboard

**Goal:** Transform stat-cards-only dashboard into an operational command center.  
**Depends on:** Phase 1 complete (tokens, Recharts already available).

---

### Step 2.1 — Dashboard Data Hook

**Create:** `src/hooks/useDashboardData.ts`

```
Single hook that fires 5 parallel API calls on mount:
  1. getSummary()                     (existing api/dashboard.ts)
  2. getForklifts({ page_size: 200 }) (existing api/forklift.ts)
  3. getRentalContracts({ page_size: 200 }) (existing api/rental.ts)
  4. getQuotations({ page_size: 200 })      (existing api/quotation.ts)
  5. getActivity({ limit: 10 })             (existing api/activity.ts)

Returns computed KPIs:
  totalCustomers, activeRentals, overdueRentals, availableForklifts,
  totalFleet, activeRevenue, upcomingPm, criticalPm, openQuotations,
  quotationPipelineValue, upcomingReturns, fleetUtilization

Returns chart data:
  revenueByMonth[], fleetByStatus[], fleetByFuel[], fleetByBrand[]

Returns task lists:
  expiringContracts[], expiringQuotations[], pmDueForklifts[]

Returns raw: activities[], forklifts[], contracts[], quotations[]
Returns: isLoading, error, refetch
```

**Verify:** Hook returns correct data. Can test via console.log in a temp component.

---

### Step 2.2 — Dashboard Components (parallel builds)

**Create:** `src/components/dashboard/` directory with:

```
KpiCard.tsx + .css
  Props: label, value, icon, accent, href, trend?, alert?
  Card with 3px top accent border, large value, clickable → href
  Alert badge for overdue/expiring items

KpiCardStrip.tsx + .css
  Grid: repeat(auto-fill, minmax(180px, 1fr))
  Responsive: 4 cols → 3 → 2 → 1

DashboardHeader.tsx + .css
  Title + subtitle + timestamp + Refresh button

RevenueChart.tsx + .css
  Recharts AreaChart with gradient fill (primary blue)
  Monthly revenue from rental contracts
  Wrapped in existing ChartCard component

FleetStatusDonut.tsx + .css
  Recharts PieChart with innerRadius (donut)
  Center label: total count
  Right legend with colored dots
  Wrapped in ChartCard

FleetByFuelChart.tsx
FleetByBrandChart.tsx
  Both reuse existing HorizontalBarChart component directly
  Wrapped in ChartCard

RecentActivityFeed.tsx + .css
  10-item list with icon + description + user + relative time
  "View All →" link to /activity

ExpiringContractsCard.tsx + .css
  Active contracts ending within 30 days
  Urgency coloring: ≤7d red, 8-14d amber, 15-30d default
  Click item → /rental-contracts/:id

ExpiringQuotationsCard.tsx + .css
  Open quotes expiring within 14 days
  Click item → /quotations/:id

PmDueCard.tsx + .css
  Forklifts with hour_meter > 4000
  Progress bar per unit (reuse HourMeterBar from Phase 4 — or inline here first)
  Click item → /equipment/:id

index.ts
  Barrel export for all dashboard components
```

**Verify:** Each component renders in isolation with mock data.

---

### Step 2.3 — Dashboard Page Rewrite

**Rewrite:** `src/pages/Dashboard/DashboardPage.tsx`

```
REPLACE current content (207 lines) with new layout:
  Section 1: KpiCardStrip (8 cards)
  Section 2: RevenueChart + FleetStatusDonut (2-col grid)
  Section 3: FleetByFuelChart + FleetByBrandChart (2-col grid)
  Section 4: RecentActivityFeed (full width)
  Section 5: ExpiringContracts + ExpiringQuotations + PmDueCard (3-col grid)
  Section 6: RETAIN existing Lead Pipeline + Results + CatalogDashboardWidget

Data: useDashboardData() hook + existing useDashboardSummary() for Section 6.
```

**Rewrite:** `src/pages/Dashboard/DashboardPage.css`

```
.dashboard: flex column, gap 32px
.dashboard-charts-row: grid 2-col, responsive
.dashboard-tasks-row: grid 3-col, responsive (2 at 1100px, 1 at 768px)
Keep existing section styling for retained Section 6
```

**Verify:** All 8 KPIs show real data. Charts render. Activity feed populates. Task cards show upcoming items. Responsive at all breakpoints. Section 6 (lead pipeline) still works.

---

### Phase 2 Checkpoint — Dashboard Complete

```
NEW FILES (23):
  hooks/useDashboardData.ts
  components/dashboard/ (11 component files + 10 CSS files + index.ts)

REWRITTEN FILES (2):
  pages/Dashboard/DashboardPage.tsx + .css

EXISTING COMPONENTS REUSED:
  ChartCard, HorizontalBarChart (from components/charts/)
  StatCard (retained for Section 6)
  CatalogDashboardWidget (retained)
```

---

## Phase 3: Product Catalog

**Goal:** JenStore-inspired catalog with hero banner, category slider, brand showcase, mega menu, filter sidebar, and enhanced product cards.  
**Depends on:** Phase 1 complete (tokens, breakpoints, layout shell).

---

### Step 3.1 — Catalog Leaf Components

**Create in `src/components/catalog/`:**

```
HeroBanner.tsx + .css
  Dark gradient header with 48px search bar + category scope dropdown
  3 CTA buttons that filter by category/type
  SearchSuggestionsPopover: fuzzy match against loaded products, categories, brands

CategorySlider.tsx + .css
  Horizontal carousel of top-level categories from useCategories().tree
  160×140px cards with icon circle, name, product count
  Scroll-snap, arrow buttons on desktop, native scroll on mobile

BrandShowcase.tsx + .css
  Horizontal carousel of brands from useBrands()
  150×130px cards with logo (or initial fallback), name, country flag
  Click: toggle brand_id filter. "View All →" → /catalog/brands

MegaMenuBar.tsx + .css
MegaMenuPanel.tsx + .css
  Sticky bar below header: "≡ All Categories" trigger + tab links
  Panel: multi-column flyout from category tree. Desktop: 3-col. Mobile: accordion.
  Click subcategory → set category_id filter + close panel

CatalogProductCard.tsx + .css (replaces ProductCard)
  Image hover zoom (scale 1.03). Featured star badge. Type pills.
  2-line name clamp. Category chip. Quick View overlay button.
  Actions: View + Edit (hover-visible)

FilterPanel.tsx + .css
  4 sections: Product Type, Brand (with search + show-more), Category (tree), Status
  Desktop: 248px sidebar. Mobile: rendered inside Drawer.

ActiveFilterPills.tsx + .css
  Removable pills for each active filter. "Clear all" button.
  Resolves brand_id → name, category_id → name from provided data.

ProductToolbar.tsx + .css
  Result count + Sort dropdown + View toggle + Mobile filter button

QuickViewDrawer.tsx + .css
  480px right drawer. Fetches getProduct(id) on open.
  Condensed view: image, name, badges, first 4 specs, "View Full" button.

FeaturedProductsRow.tsx + .css
  4 featured products. Visible only when no filters active.
  Calls getProducts({ is_featured: true, page_size: 4 }).
```

**Verify:** Each component renders in isolation.

---

### Step 3.2 — Catalog Page Rewrite

**Rewrite:** `src/pages/Catalog/CatalogPage.tsx`

```
REPLACE current content (359 lines) with new layout:
  Zone A: HeroBanner (search + CTAs)
  Zone B: CategorySlider (top-level categories)
  Zone C: BrandShowcase (logo carousel)
  Zone D: MegaMenuBar (sticky, always visible)
  Zone E: FilterPanel (sidebar) + ProductToolbar + ProductGrid/List + Pagination
  Zone F: FeaturedProductsRow (when no filters active)

Data: existing useCatalog(), useBrands(), useCategories() hooks — UNCHANGED.
ActiveFilterPills shown when any filter active.
QuickViewDrawer opens on card Quick View button click.
ProductForm and ConfirmDialog: UNCHANGED, wired same as before.
```

**Create:** New `src/pages/Catalog/CatalogPage.css`

```
Layout grid: sidebar 248px + content area
Mega menu bar sticky positioning
Responsive collapses at 768px (sidebar → drawer)
```

**Verify:** Hero banner renders. Category slider scrolls. Brand showcase shows logos. Mega menu opens. Filter sidebar works. Cards show enhanced design. Quick View drawer fetches detail. Grid/list toggle works. Pagination works. Search debounces. All existing CRUD operations (create/edit/delete) still work via ProductForm + ConfirmDialog.

---

### Step 3.3 — Catalog Cleanup

```
DELETE: src/components/catalog/ProductCard.tsx + .css (replaced by CatalogProductCard)
VERIFY: EquipmentRegistryPage.tsx imports CatalogPage.css — create its own CSS (Step 4 will handle)
VERIFY: ProductDetailPage, BrandsPage, CategoriesPage, ImportPage all UNCHANGED
```

---

### Phase 3 Checkpoint — Catalog Complete

```
NEW FILES (26):
  components/catalog/ (13 component files + 13 CSS files)

REWRITTEN FILES (2):
  pages/Catalog/CatalogPage.tsx + .css

DELETED FILES (2):
  components/catalog/ProductCard.tsx + .css

UNCHANGED:
  ProductDetailPage, BrandsPage, CategoriesPage, ImportPage, ProductForm
  SpecTable, ProductImageGallery, CatalogDashboardWidget
```

---

## Phase 4: Equipment Registry

**Goal:** Fleetio/Samsara-inspired fleet management with status strip, fleet cards, hour meter widgets, photo gallery, status timeline, and quick actions.  
**Depends on:** Phase 1 complete (tokens). Phase 2 PmDueCard may share HourMeterBar — implement here, update Phase 2 to import.

---

### Step 4.1 — Equipment Leaf Components

**Create in `src/components/equipment/`:**

```
FleetStatusStrip.tsx + .css
  7 clickable status chips with counts. Click → filter by status.
  Counts computed client-side from forklifts array.

FleetStatsBar.tsx + .css
  4 computed metrics: utilization %, avg hours, PM due count, avg age.
  All computed client-side from forklifts array. No new API.

FleetCard.tsx + .css (replaces ForkliftCard)
  Photo + status/condition badges + brand + name + serial + meta chips
  + HourMeterBar + customer name (if rented). Hover-visible View/Edit.

HourMeterBar.tsx + .css
  Color-coded progress bar. <60% green, 60-85% amber, >85% red.
  Two sizes: sm (6px, for card) and md (10px, for widget).

HourMeterWidget.tsx + .css
  Large number (28px) + HourMeterBar md + computed stats:
  initial hours, hours used, daily avg, est. service date.

AssetHeader.tsx + .css
  Photo thumbnail + name + serial + brand + year + badges + QuickActionBar.

QuickActionBar.tsx + .css
  [Edit] [Change Status ▾] [New Quote] [New Contract] [⋯ More]
  Status dropdown: valid transitions based on current status.
  Status change calls updateForklift(id, { status }).

AssetTabBar.tsx + .css
  5 tabs: Overview, Photos, Timeline, Documents, Contracts.
  URL hash driven (#overview, #photos, etc.).

SpecificationsCard.tsx + .css
  3 spec chips (fuel, capacity, year) + key-value rows.

LocationCard.tsx + .css
  Renders ForkliftDetail.current_location. Empty state for null.

AssetSummaryCard.tsx + .css
  Purchase date, asset age, warranty status (green/red), condition, counts.

CustomerLinkCard.tsx + .css
  Shows assigned customer with "View Customer →" link. Hidden if null.

PhotoGallery.tsx + .css
  Main image (16:10) + thumbnail strip + counter badge + lightbox.
  Lightbox: full-screen, arrow keys, Esc close, thumbnail strip.

StatusTimeline.tsx + .css
  Vertical timeline. Dot rail + entry cards with from→to badges.
  Reason text + user name. Most recent at top.

LinkedContractsPanel.tsx + .css
  Cross-link to /rental-contracts?q={serial_number}.

FleetToolbar.tsx + .css
  Search + Brand/Fuel/Condition dropdowns + Clear + count + ViewToggle.
```

**Verify:** Each component renders with mock data.

---

### Step 4.2 — Equipment Pages Rewrite

**Create:** `src/pages/Equipment/EquipmentRegistryPage.css` (NEW — stops importing CatalogPage.css)

**Rewrite:** `src/pages/Equipment/EquipmentRegistryPage.tsx`

```
REMOVE: import '@/pages/Catalog/CatalogPage.css' (line 16 — critical CSS coupling fix)
REPLACE current content (350 lines) with:
  FleetHeader + FleetStatusStrip + FleetStatsBar
  FleetToolbar (search + filters + view toggle)
  Grid view: FleetCard × N
  List view: enhanced table rows with thumbnails
  Mobile: card-list below 640px
  Pagination
  ForkliftForm (UNCHANGED) + ConfirmDialog (UNCHANGED)

Data: existing useForklifts() + useBrands() — UNCHANGED.
```

**Create:** `src/pages/Equipment/ForkliftDetailPage.css` (NEW — stops importing ProductDetailPage.css)

**Rewrite:** `src/pages/Equipment/ForkliftDetailPage.tsx`

```
REMOVE: import '@/pages/Catalog/ProductDetailPage.css' (line 10 — critical CSS coupling fix)
REPLACE current content (366 lines) with:
  AssetHeader (name, serial, badges, QuickActionBar)
  AssetTabBar (5 tabs)
  Overview tab: SpecificationsCard + LocationCard + Notes + HourMeterWidget
                + AssetSummaryCard + CustomerLinkCard (2-col layout)
  Photos tab: PhotoGallery
  Timeline tab: StatusTimeline
  Documents tab: enhanced table (existing pattern)
  Contracts tab: LinkedContractsPanel

Data: existing getForklift(id) — UNCHANGED. Single API call for everything.
```

**Verify:** All fleet features work. Grid/list toggle. Status strip filters. Detail page tabs. Gallery lightbox. Timeline renders. Status change flow. ForkliftForm still creates/edits.

---

### Step 4.3 — Equipment Cleanup

```
DELETE: src/components/equipment/ForkliftCard.tsx + .css (replaced by FleetCard)
KEEP: src/components/equipment/ForkliftStatusBadge.tsx (reused everywhere)
KEEP: src/pages/Equipment/ForkliftForm.tsx (UNCHANGED)
```

---

### Phase 4 Checkpoint — Equipment Complete

```
NEW FILES (34):
  components/equipment/ (17 component files + 16 CSS files)
  pages/Equipment/EquipmentRegistryPage.css + ForkliftDetailPage.css

REWRITTEN FILES (2):
  pages/Equipment/EquipmentRegistryPage.tsx
  pages/Equipment/ForkliftDetailPage.tsx

DELETED FILES (2):
  components/equipment/ForkliftCard.tsx + .css

CRITICAL FIX: Cross-module CSS imports eliminated
  EquipmentRegistryPage no longer imports CatalogPage.css
  ForkliftDetailPage no longer imports ProductDetailPage.css
```

---

## Phase 5: Quotation Module

**Goal:** Extract inline styles to proper CSS. Add structured layout. Fix cross-module CSS dependency.  
**Depends on:** Phase 1 complete (tokens).

---

### Step 5.1 — Quotation CSS Extraction

**Create:** `src/pages/Quotations/QuotationListPage.css`

```
Extract any inline styles from QuotationListPage.tsx into proper CSS classes.
Current page has minimal inline — mostly uses shared.css. This file adds
any module-specific overrides.
```

**Create:** `src/pages/Quotations/QuotationDetailPage.css`

```
CRITICAL: This page currently has 50+ inline style={{}} props and imports
ProductDetailPage.css. Extract ALL inline styles to proper CSS classes:

  .quotation-detail           → max-width container
  .quotation-header           → flex header with title + actions
  .quotation-summary-grid     → 4-col KPI grid (subtotal, tax, discount, total)
  .quotation-summary-card     → individual summary card
  .quotation-summary-label    → 11.5px muted uppercase label
  .quotation-summary-value    → 18px bold tabular-nums value
  .quotation-info-grid        → 2-col detail metadata grid
  .quotation-internal-note    → amber bg internal note box
  .quotation-items-header     → flex header for line items section
  .quotation-item-empty       → centered empty state
```

**Create:** `src/pages/Quotations/QuotationFormPage.css`

```
  .quotation-form-back        → back button styling (currently inline)
  .quotation-form-card        → max-width 700px surface card
```

---

### Step 5.2 — Quotation Page Updates

**Modify:** `src/pages/Quotations/QuotationDetailPage.tsx`

```
REMOVE: import '@/pages/Catalog/ProductDetailPage.css' (line 19)
ADD: import './QuotationDetailPage.css'
REPLACE: all style={{...}} props with className references to new CSS classes
KEEP: all business logic, API calls, state management, doAction(), form handling IDENTICAL

Specific replacements (not exhaustive — every inline style gets a class):
  Line 134: style={{ display: 'flex'... }} → className="quotation-header"
  Line 207: style={{ display: 'grid'... }} → className="quotation-summary-grid"
  Line 214: style={{ background: 'var(--color-bg)'... }} → className="quotation-summary-card"
  Line 222: style={{ display: 'grid', gridTemplateColumns: '1fr 1fr'... }} → className="quotation-info-grid"
  Line 252: style={{ marginTop: 12, padding... }} → className="quotation-internal-note"
  ... (continue for every remaining inline style)

TOTAL: ~50 style={{}} props → ~20 CSS classes
```

**Modify:** `src/pages/Quotations/QuotationListPage.tsx`

```
ADD: import './QuotationListPage.css'
This page has minimal inline styles — mostly just one-off spacing.
Move any remaining inline styles to CSS classes.
```

**Modify:** `src/pages/Quotations/QuotationFormPage.tsx`

```
ADD: import './QuotationFormPage.css'
Line 72: style={{ display: 'flex'... }} on back button → className="quotation-form-back"
Line 83: style={{ maxWidth: 700... }} → className="quotation-form-card"
```

**Verify:** All quotation pages render identically. Create/edit quotation works. Add/remove items works. Status transitions work. All pages use CSS classes instead of inline styles. ProductDetailPage.css import removed.

---

### Phase 5 Checkpoint — Quotation Complete

```
NEW FILES (3):
  pages/Quotations/QuotationListPage.css
  pages/Quotations/QuotationDetailPage.css
  pages/Quotations/QuotationFormPage.css

MODIFIED FILES (3):
  pages/Quotations/QuotationDetailPage.tsx  (inline → classes, remove Catalog CSS import)
  pages/Quotations/QuotationListPage.tsx    (add CSS import)
  pages/Quotations/QuotationFormPage.tsx    (inline → classes)

BUSINESS LOGIC CHANGED: 0 lines
CRITICAL FIX: QuotationDetailPage no longer imports ProductDetailPage.css
```

---

## Phase 6: Rental Contract Module

**Goal:** Same treatment as Quotation — extract inline styles, fix CSS coupling, add proper classes.  
**Depends on:** Phase 1 complete (tokens).

---

### Step 6.1 — Rental CSS Extraction

**Create:** `src/pages/Rental/RentalContractListPage.css`

```
Module-specific overrides for the list page.
Current page mostly uses shared.css patterns.
```

**Create:** `src/pages/Rental/RentalContractDetailPage.css`

```
Same treatment as QuotationDetailPage:
  .rental-detail, .rental-header, .rental-summary-grid,
  .rental-summary-card, .rental-info-grid, .rental-internal-note,
  .rental-items-header, .rental-billing-section, .rental-returns-section,
  .rental-extensions-section
```

**Create:** `src/pages/Rental/RentalContractFormPage.css`

```
  .rental-form-back, .rental-form-card
```

---

### Step 6.2 — Rental Page Updates

**Modify:** `src/pages/Rental/RentalContractDetailPage.tsx`

```
REMOVE: import '@/pages/Catalog/ProductDetailPage.css' (line 17)
ADD: import './RentalContractDetailPage.css'
REPLACE: all style={{...}} props with className references
KEEP: all business logic, doAction(), item management, workflow actions IDENTICAL
```

**Modify:** `src/pages/Rental/RentalContractListPage.tsx`

```
ADD: import './RentalContractListPage.css'
Move remaining inline styles to CSS classes.
```

**Modify:** `src/pages/Rental/RentalContractFormPage.tsx`

```
ADD: import './RentalContractFormPage.css'
Move back button and card container styles to CSS classes.
```

**Verify:** All rental pages render identically. Create contract works. Add/remove items works. Submit/approve/reject/activate/cancel/close workflows all work. Returns and extensions work. ProductDetailPage.css import removed.

---

### Phase 6 Checkpoint — Rental Complete

```
NEW FILES (3):
  pages/Rental/RentalContractListPage.css
  pages/Rental/RentalContractDetailPage.css
  pages/Rental/RentalContractFormPage.css

MODIFIED FILES (3):
  pages/Rental/RentalContractDetailPage.tsx  (inline → classes, remove Catalog CSS import)
  pages/Rental/RentalContractListPage.tsx    (add CSS import)
  pages/Rental/RentalContractFormPage.tsx    (inline → classes)

BUSINESS LOGIC CHANGED: 0 lines
CRITICAL FIX: RentalContractDetailPage no longer imports ProductDetailPage.css
```

---

## Master File Ledger

### All 6 Phases Combined

```
                        NEW    REWRITE  MODIFY  DELETE  TOTAL TOUCHED
─────────────────────── ────── ──────── ─────── ─────── ──────────────
Phase 1: Layout           20      4       4       3        31
Phase 2: Dashboard        23      2       0       0        25
Phase 3: Catalog          26      2       0       2        30
Phase 4: Equipment        34      2       0       2        38
Phase 5: Quotation         3      0       3       0         6
Phase 6: Rental            3      0       3       0         6
─────────────────────── ────── ──────── ─────── ─────── ──────────────
TOTAL                    109     10      10       7       136 operations

STARTING FILE COUNT:     108
ENDING FILE COUNT:       108 + 109 new - 7 deleted = 210 files
```

### Files NEVER Touched (safe zone — 68 files)

```
src/api/*                   (9 files)   ← zero changes
src/hooks/useAuth.ts                    ← zero changes
src/hooks/useCustomers.ts               ← zero changes
src/hooks/useLeads.ts                   ← zero changes
src/hooks/useCatalog.ts                 ← zero changes
src/hooks/useBrands.ts                  ← zero changes
src/hooks/useCategories.ts              ← zero changes
src/hooks/useForklifts.ts              ← zero changes
src/hooks/useQuotations.ts             ← zero changes
src/hooks/useRentals.ts                ← zero changes
src/hooks/useActivity.ts               ← zero changes
src/hooks/useDashboard.ts              ← zero changes (new hook is useDashboardData)
src/types/*                  (9 files)  ← zero changes
src/utils/*                  (1 file)   ← zero changes
src/store/authStore.ts                  ← zero changes
src/store/toastStore.ts                 ← zero changes
src/modules/*                (2 files)  ← zero changes
src/components/ui/Badge.tsx             ← zero changes
src/components/ui/ConfirmDialog.tsx     ← zero changes
src/components/ui/Modal.tsx + .css      ← zero changes
src/components/ui/Toast.tsx + .css      ← zero changes
src/components/ui/Drawer.tsx + .css     ← zero changes
src/components/ui/StatCard.tsx + .css   ← zero changes
src/components/charts/*      (5 files)  ← zero changes
src/components/quotation/*   (1 file)   ← zero changes
src/components/rental/*      (1 file)   ← zero changes
src/components/catalog/SpecTable.tsx                ← zero changes
src/components/catalog/ProductImageGallery.tsx      ← zero changes
src/components/catalog/CatalogDashboardWidget.tsx   ← zero changes
src/pages/Catalog/ProductDetailPage.tsx + .css      ← zero changes
src/pages/Catalog/BrandsPage.tsx + .css             ← zero changes
src/pages/Catalog/CategoriesPage.tsx + .css         ← zero changes
src/pages/Catalog/ImportPage.tsx + .css             ← zero changes
src/pages/Catalog/ProductForm.tsx                   ← zero changes
src/pages/Customers/CustomersPage.tsx + .css        ← zero changes
src/pages/Customers/CustomerForm.tsx                ← zero changes
src/pages/Leads/LeadsPage.tsx + .css                ← zero changes
src/pages/Leads/LeadForm.tsx                        ← zero changes
src/pages/Activity/ActivityPage.tsx + .css          ← zero changes
src/pages/Reports/ReportsPage.tsx + .css            ← zero changes
src/pages/Login/LoginPage.tsx + .css                ← zero changes
src/pages/Equipment/ForkliftForm.tsx                ← zero changes
src/styles/shared.css                               ← zero changes
src/components/equipment/ForkliftStatusBadge.tsx    ← zero changes
```

---

## Critical Fixes Achieved

| Issue (from UX Audit) | Fixed In | How |
|---|---|---|
| P-01: Zero code splitting | Step 1.7 | React.lazy + Suspense on all 16 pages |
| N-01: No breadcrumbs | Step 1.9 | Breadcrumb.tsx + config/routes.ts |
| N-02: No global search | Step 1.9 | SearchBar.tsx with Cmd+K |
| N-03: PAGE_TITLES incomplete | Step 1.9 | Replaced by Breadcrumb reading routes.ts |
| N-04: Sidebar not collapsible | Step 1.8 | 3-state sidebar with collapsible groups |
| N-05: No sidebar rail | Step 1.8 | 68px collapsed state |
| N-07: No notifications | Step 1.9 | NotificationCenter.tsx |
| N-08: No user menu | Step 1.9 | UserProfileDropdown.tsx |
| D-03: No dark mode | Step 1.5 | ThemeProvider + tokens.css [data-theme="dark"] |
| M-01: Cross-module CSS | Steps 4.2, 5.2, 6.2 | Each module gets its own CSS files |
| M-02: Inline styles | Steps 5.2, 6.2 | All style={{}} extracted to CSS classes |
| A-11: Title never updates | Step 1.9 | Breadcrumb sets document.title per route |
| R-05: Topbar hardcoded 240px | Step 1.10 | var(--sidebar-width) dynamic offset |
| M-06: Dead App.css | Step 1.10 | Deleted |

---

## Execution Timeline

```
Phase 1: Layout         Steps 1.1-1.10    ~9 days     Commits: 10
Phase 2: Dashboard      Steps 2.1-2.3     ~5 days     Commits: 3
Phase 3: Catalog        Steps 3.1-3.3     ~7 days     Commits: 3
Phase 4: Equipment      Steps 4.1-4.3     ~7 days     Commits: 3
Phase 5: Quotation      Steps 5.1-5.2     ~2 days     Commits: 2
Phase 6: Rental         Steps 6.1-6.2     ~2 days     Commits: 2
                                          ──────      ──────────
                                          ~32 days    23 commits
```

```
         DAY
Phase 1  ████████████████████  (1-9)     Layout live
Phase 2       ░░░░░░░░░░░     (10-14)    Dashboard live
Phase 3            ░░░░░░░░░░░░░░ (15-21)  Catalog live
Phase 4                  ░░░░░░░░░░░░░░ (22-28)  Equipment live
Phase 5                            ░░░░ (29-30)  Quotation cleaned
Phase 6                              ░░░░ (31-32)  Rental cleaned
```

Each phase ships independently. The app is fully functional after every step.
