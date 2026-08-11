# Frontend Modules — DK Service CRM

**48 pages · 76 components · 17 API clients · 4 Zustand stores**

## Pages by Domain (48 total)

| Domain | Pages | Route Prefix |
|--------|-------|-------------|
| Login | 1 | /login |
| Dashboard | 1 | /dashboard |
| Customers | 2 (list + form) | /customers |
| Leads | 2 (list + form) | /leads |
| Catalog | 5 (list + detail + brands + categories + import) | /catalog |
| Equipment | 3 (registry + detail + form) | /equipment |
| Quotations | 3 (list + detail + form) | /quotations |
| Rental | 3 (list + detail + form) | /rental-contracts |
| Movements | 3 (list + detail + form) | /movements |
| Maintenance | 4 (dashboard + schedules + WO list + WO detail) | /maintenance |
| Inventory | 5 (dashboard + parts list + part detail + warehouses + POs) | /inventory |
| Billing | 9 (dashboard + invoices + invoice detail + payments + payment detail + deposits + deposit detail + revenue + statements) | /billing |
| Reports | 1 | /reports |
| Executive | 1 | /executive |
| Activity | 1 | /activity |
| Settings | 1 (placeholder) | /settings |

## Component Architecture

### Layout Components (6)
- `AppLayout` — Shell with sidebar + header + content area
- `Sidebar` — Collapsible navigation with 9 groups
- `Header` — Top bar with search + notifications + user menu
- `Breadcrumb` — Route-aware breadcrumb trail
- `PrivateRoute` — Auth guard with loading state
- `Topbar` — Legacy top bar (unused)

### UI Components (14)
- `Modal` — Focus trap + aria-modal dialog
- `Drawer` — Slide-in panel with focus trap
- `Toast` — Notification system (success/error/info)
- `Badge` — 7-color status badges (CSS variable based)
- `ConfirmDialog` — Delete confirmation modal
- `ImageUpload` — Drag-and-drop with progress bar
- `KpiWidget` — KPI card with accent color
- `MarketplaceCard` — Card with hover lift effect
- `NotificationCenter` — Bell icon dropdown
- `SearchBar` — Global search with ARIA combobox
- `StatCard` — Dashboard stat card with trends
- `ThemeToggle` — Light/Dark/System toggle
- `UserProfileDropdown` — Avatar + logout menu
- `ViewToggle` — Grid/List view switcher

### Domain Components (27)
- **Billing**: 8 (InvoiceCard, InvoiceStatusBadge, PaymentStatusBadge, RevenueChart, AgingChart, StatementTable, DepositSummaryCard, InvoiceSummaryCard, PaymentSummaryCard)
- **Catalog**: 5 (CatalogComponents, CatalogDashboardWidget, ProductCard, ProductImageGallery, SpecTable)
- **Equipment**: 5 (FleetCard, ForkliftCard, ForkliftStatusBadge, PhotoGallery, StatusTimeline)
- **Inventory**: 3 (InventoryCard, ReorderAlert, StockBadge)
- **Maintenance**: 3 (MaintenanceStatusBadge, PMCalendar, WorkOrderCard)
- **Movement**: 3 (MovementCard, MovementStatusBadge, MovementTimeline)
- **Charts**: 4 (ChartCard, TrendLineChart, HorizontalBarChart, DistributionBarChart)

### Module Components (`src/modules/`)
- **Dashboard**: 7 (EnterpriseKpiStrip, QuickActions, ActivityFeed, Charts ×4, hooks, types)
- **Equipment**: 7 (EquipmentCard, EquipmentGrid, EquipmentSearch, EquipmentFilters, EquipmentDrawer, EquipmentQuickActions)
- **Inventory**: 7 (InventoryKpiStrip, LowStockAlerts, WarehouseGrid, PurchaseOrderTable, StockDistributionChart, InventoryQuickNav)
- **Finance**: 9 (FinanceKpiStrip, RevenueAreaChart, AgingReceivablesChart, InvoiceStatusChart, CollectionRateGauge, RecentTransactions, FinanceQuickNav, utils)

## State Management (Zustand)

| Store | File | Purpose |
|-------|------|---------|
| authStore | store/authStore.ts | JWT token, user object, login/logout |
| sidebarStore | store/sidebarStore.ts | Sidebar state (expanded/collapsed/hidden), collapsed groups |
| themeStore | store/themeStore.ts | Theme mode (light/dark/system), resolved theme |
| toastStore | store/toastStore.ts | Toast notification queue |

## API Clients (17)

| Client | File | Endpoints |
|--------|------|-----------|
| auth | api/auth.ts | login, logout, refresh, getMe |
| customers | api/customers.ts | CRUD |
| leads | api/leads.ts | CRUD + notes |
| dashboard | api/dashboard.ts | summary, trends, metrics |
| activity | api/activity.ts | list |
| forklift | api/forklift.ts | CRUD |
| catalog | api/catalog.ts | products, brands, categories, import |
| quotation | api/quotation.ts | CRUD + workflow actions |
| rental | api/rental.ts | CRUD + workflow + returns + billing |
| movement | api/movement.ts | CRUD + workflow |
| maintenance | api/maintenance.ts | plans, schedules, work orders |
| inventory | api/inventory.ts | parts, warehouses, POs, transactions |
| billing | api/billing.ts | invoices, payments, deposits, revenue |
| reports | api/reports.ts | CSV/Excel export |
| upload | api/upload.ts | Image upload with progress |

## Routing

All pages lazy-loaded via `React.lazy()` with `<Suspense>` fallback. 48 `<Route>` definitions in `App.tsx`. Breadcrumbs configured in `config/routes.ts` (53 entries).

## CSS Architecture

- `tokens.css` — Design tokens (colors, spacing, shadows, z-index)
- `index.css` — Global resets, button classes, focus-visible, skip-to-content
- `shared.css` — Data tables, forms, pagination, skeletons, error states
- `marketplace.css` — Card grid, KPI strip, hero sections, chart panels
- Per-component `.css` files — Scoped styles
- Theme: `[data-theme="dark"]` selector in tokens.css with full palette override
