# Executive Dashboard Redesign — Component Architecture

**Domain:** Forklift Rental, Material Handling, Maintenance Service  
**Constraint:** Existing APIs only. Zero backend changes.  
**Date:** 2026-06-21  

---

## 0. Data Source Inventory

Every number on this dashboard must come from an existing API. Here is the complete map of what's available and what each widget will consume.

### API Endpoints Available

| Endpoint | Returns | Useful Fields |
|---|---|---|
| `GET /dashboard/summary` | `DashboardSummary` | total_customers, active_customers, prospect_customers, total_leads, new/contacted/qualified/proposal/won/lost_leads, leads_by_source, conversion_rate, win_rate, lost_rate |
| `GET /dashboard/lead-trend?months=N` | `TrendPoint[]` | `{month, count}[]` — monthly lead counts |
| `GET /dashboard/customer-trend?months=N` | `TrendPoint[]` | `{month, count}[]` — monthly customer counts |
| `GET /dashboard/lead-metrics` | `LeadMetrics` | total, conversion_rate, win_rate, lost_rate, by_status, by_source |
| `GET /forklifts/?params` | `ForkliftListResponse` | `items[].status`, `items[].fuel_type`, `items[].current_hour_meter`, `items[].brand`, total, pages |
| `GET /quotations/?params` | `QuotationListResponse` | `items[].status`, `items[].total_amount`, `items[].valid_until`, `items[].quotation_type`, total |
| `GET /rental-contracts/?params` | `RentalContractListResponse` | `items[].status`, `items[].end_date`, `items[].total_value`, `items[].contract_type`, `items[].customer`, total |
| `GET /catalog/products/?params` | `ProductListResponse` | total (count) |
| `GET /catalog/brands/?params` | `Brand[]` | length (count) |
| `GET /activity/?params` | `ActivityLog[]` | action, entity_type, user, details, created_at |

### Widget → Data Source Mapping

| Widget | Data Source | API Call | Computation |
|---|---|---|---|
| **Total Customers** | `DashboardSummary` | `GET /dashboard/summary` | `.total_customers` direct |
| **Active Rentals** | `RentalContractListResponse` | `GET /rental-contracts/?status=active&page_size=1` | `.total` from response |
| **Available Forklifts** | `ForkliftListResponse` | `GET /forklifts/?status=in_stock&page_size=1` | `.total` from response |
| **Revenue** | `RentalContractListResponse` | `GET /rental-contracts/?status=active&page_size=100` | `sum(items[].total_value)` client-side |
| **Upcoming PM** | `ForkliftListResponse` | `GET /forklifts/?page_size=100` | `filter(items where current_hour_meter > 4000).length` client-side (heuristic: PM due at 5000hrs) |
| **Open Quotations** | `QuotationListResponse` | `GET /quotations/?status=draft&page_size=1` + `status=under_review` + `status=sent` | Sum of `.total` from 3 calls OR single call with no status filter, then count client-side |
| **Upcoming Returns** | `RentalContractListResponse` | `GET /rental-contracts/?status=active&page_size=50` | `filter(items where end_date within 30 days).length` client-side |
| **Fleet Utilization** | `ForkliftListResponse` | `GET /forklifts/?page_size=1` (total) + `GET /forklifts/?status=rented&page_size=1` (rented) | `rented.total / all.total × 100` |
| **Revenue Chart** | `RentalContractListResponse` | `GET /rental-contracts/?page_size=200` | Group by month from `start_date`, sum `total_value` per month |
| **Fleet Status Donut** | `ForkliftListResponse` | `GET /forklifts/?page_size=200` | Count items by `status` field |
| **Fleet by Fuel Type** | Same forklift data | Same call | Count items by `fuel_type` field |
| **Recent Activity** | `ActivityLog[]` | `GET /activity/?limit=10` | Direct display |
| **Upcoming Tasks: Returns** | `RentalContractListResponse` | Already fetched | Filter `end_date` ≤ now + 30d, sort by `end_date` asc |
| **Upcoming Tasks: Expiring Quotations** | `QuotationListResponse` | `GET /quotations/?page_size=50` | Filter `valid_until` ≤ now + 14d |
| **Upcoming Tasks: PM Due** | `ForkliftListResponse` | Already fetched | Filter `current_hour_meter > 4000`, sort desc |

### API Call Budget

**Total API calls on dashboard mount: 7**

```
1. GET /dashboard/summary                              (existing, already called)
2. GET /forklifts/?page_size=200                       (one call → fleet status + utilization + PM)
3. GET /rental-contracts/?page_size=200                 (one call → active rentals + revenue + returns)
4. GET /quotations/?page_size=200                       (one call → open quotations + expiring)
5. GET /activity/?limit=10                             (one call → recent activity)
6. GET /dashboard/lead-trend?months=6                  (existing, for lead section)
7. GET /dashboard/customer-trend?months=6              (existing, for customer section)
```

All calls are to existing endpoints. No new API needed. Client-side computation derives every widget metric.

---

## 1. Page Architecture

### Full Page Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DASHBOARD HEADER                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  Dashboard                              Jun 21, 2026 · 2:30 PM    ││
│  │  Operations overview            [Last 30 days ▾]  [↻ Refresh]     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ─── SECTION 1: KPI CARDS ─────────────────────────────────────────── │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
│  │Custmrs │ │Active  │ │Avail.  │ │Revenue │ │Upcomng │ │Open    │  │
│  │  247   │ │Rentals │ │Fklift  │ │  ฿2.4M │ │PM Due  │ │Quotes  │  │
│  │        │ │  47    │ │  24    │ │        │ │  5     │ │  12    │  │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘  │
│  ┌────────┐ ┌────────┐                                               │
│  │Returns │ │Fleet   │                                               │
│  │ Due 7  │ │Util 82%│                                               │
│  └────────┘ └────────┘                                               │
│                                                                         │
│  ─── SECTION 2: REVENUE & FLEET ───────────────────────────────────── │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────┐│
│  │  REVENUE CHART                  │  │  FLEET STATUS                ││
│  │  Monthly rental revenue         │  │                              ││
│  │                                 │  │  ┌─────────┐  In Stock: 24  ││
│  │  ┌──────────────────────────┐  │  │  │  DONUT  │  Rented:   18  ││
│  │  │    ▁▂▄▆█▇▅▃▄▆█          │  │  │  │  CHART  │  Service:   5  ││
│  │  │   Area chart with fill   │  │  │  │         │  Reserved:  2  ││
│  │  └──────────────────────────┘  │  │  └─────────┘  Sold:       1  ││
│  │                                 │  │               Decomm:     2  ││
│  │  Total: ฿14.2M (6 months)      │  │                              ││
│  └─────────────────────────────────┘  └──────────────────────────────┘│
│                                                                         │
│  ─── SECTION 3: FLEET BREAKDOWN ───────────────────────────────────── │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────┐│
│  │  FLEET BY FUEL TYPE             │  │  FLEET BY BRAND              ││
│  │                                 │  │                              ││
│  │  Diesel    ████████████░░  15   │  │  Toyota    ████████████  12  ││
│  │  Electric  ████████░░░░░░   8   │  │  Komatsu   ████████░░░   8  ││
│  │  LPG       █████░░░░░░░░   6   │  │  Jungh.    ██████░░░░    5  ││
│  │  Dual Fuel ███░░░░░░░░░░   3   │  │  Still     ████░░░░░░    3  ││
│  │                                 │  │  Mitsub.   ████░░░░░░    3  ││
│  └─────────────────────────────────┘  └──────────────────────────────┘│
│                                                                         │
│  ─── SECTION 4: RECENT ACTIVITY ───────────────────────────────────── │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  Recent Activity                                     [View All →] ││
│  │                                                                     ││
│  │  ● 📄  Quotation QT-0048 submitted for review         2 hours ago ││
│  │  ● 📋  Rental contract RC-0012 activated                 5 hours ago ││
│  │  ● 🚛  Forklift FLT-0015 status changed to Rented       6 hours ago ││
│  │  ● 👤  Customer "Toyota Motor" updated                   8 hours ago ││
│  │  ● 📈  Lead "Vientiane Motors" converted to Won          1 day ago ││
│  │                                                                     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ─── SECTION 5: UPCOMING TASKS ────────────────────────────────────── │
│  ┌────────────────────┐ ┌────────────────────┐ ┌──────────────────────┐│
│  │ CONTRACTS EXPIRING │ │ QUOTATIONS EXPIRING│ │ PM / SERVICE DUE     ││
│  │                    │ │                    │ │                      ││
│  │ RC-0012   5 days   │ │ QT-0044   3 days   │ │ JH-001   4,850 hrs  ││
│  │ Toyota Motor       │ │ Rental · ฿45K      │ │ Toyota 8FD25        ││
│  │ ── ── ── ── ──     │ │ ── ── ── ── ──     │ │ ●● 97% to service   ││
│  │ RC-0009  12 days   │ │ QT-0041   8 days   │ │ ── ── ── ── ──      ││
│  │ ABC Corp           │ │ Sales · ฿120K      │ │ KM-003   4,620 hrs  ││
│  │ ── ── ── ── ──     │ │ ── ── ── ── ──     │ │ Komatsu FD30        ││
│  │ RC-0007  18 days   │ │ QT-0038  12 days   │ │ ●● 92% to service   ││
│  │ XYZ Industries     │ │ Service · ฿8K      │ │                      ││
│  │                    │ │                    │ │                      ││
│  │ [View All →]       │ │ [View All →]       │ │ [View All →]         ││
│  └────────────────────┘ └────────────────────┘ └──────────────────────┘│
│                                                                         │
│  ─── SECTION 6: SALES PIPELINE (existing, retained) ──────────────── │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────┐│
│  │  LEAD PIPELINE                  │  │  CONVERSION METRICS          ││
│  │  (existing StatCards)           │  │  (existing StatCards)        ││
│  └─────────────────────────────────┘  └──────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Tree

```
DashboardPage (REWRITE)
│
├── DashboardHeader                            NEW
│   ├── Title + subtitle
│   ├── TimeRangeSelector                      NEW (segmented: 7d/30d/90d)
│   └── RefreshButton (existing pattern)
│
├── SECTION 1: KPI Cards
│   └── KpiCardStrip                           NEW
│       ├── KpiCard × 8                        NEW (evolved from StatCard)
│       │   ├── icon + label
│       │   ├── primary value
│       │   ├── trend indicator (optional)
│       │   └── sparkline (optional)
│       └── KpiCardSkeleton × 8
│
├── SECTION 2: Revenue & Fleet
│   ├── RevenueChart                           NEW
│   │   └── Recharts AreaChart (reuses ResponsiveContainer pattern)
│   └── FleetStatusDonut                       NEW
│       └── Recharts PieChart + legend
│
├── SECTION 3: Fleet Breakdown
│   ├── FleetByFuelChart                       NEW
│   │   └── HorizontalBarChart (EXISTING — reuse)
│   └── FleetByBrandChart                      NEW
│       └── HorizontalBarChart (EXISTING — reuse)
│
├── SECTION 4: Recent Activity
│   └── RecentActivityFeed                     NEW
│       └── ActivityItem × 5-10                NEW
│
├── SECTION 5: Upcoming Tasks
│   ├── ExpiringContractsCard                  NEW
│   │   └── TaskItem × N
│   ├── ExpiringQuotationsCard                 NEW
│   │   └── TaskItem × N
│   └── PmDueCard                              NEW
│       └── TaskItem × N  (with hour-meter bar)
│
└── SECTION 6: Sales Pipeline (RETAINED from current dashboard)
    ├── StatCard × 5  (Lead Pipeline — existing)
    ├── StatCard × 5  (Results & Conversion — existing)
    └── CatalogDashboardWidget (existing)
```

---

## 3. Component Specifications

### 3.1 KpiCard (evolved StatCard)

**File:** `src/components/dashboard/KpiCard.tsx` + `.css`

**Props:**
```typescript
interface KpiCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  accent: string              // hex color for icon bg + top border
  href?: string               // click → navigate to module
  trend?: {
    value: number             // percentage change
    label: string             // "vs last month"
  }
  alert?: {
    count: number             // e.g. "3 overdue"
    variant: 'warning' | 'danger'
  }
  loading?: boolean
}
```

**Visual:**
```
┌──────────────────────────────────┐
│ ▔▔▔▔▔▔▔▔▔▔ (3px accent border)  │
│                                  │
│  ┌────┐                          │
│  │ 🚛 │  Available Forklifts     │  ← icon (38px, colored bg) + label (12.5px muted)
│  └────┘                          │
│                                  │
│  24                              │  ← value (28px, bold, tabular-nums)
│                                  │
│  ↑ 12% vs last month            │  ← trend (12px, green/red)
│                                  │
│  ⚠ 3 approaching PM             │  ← alert badge (optional, amber/red)
│                                  │
└──────────────────────────────────┘

Width: minmax(180px, 1fr)  in a responsive grid
Click: navigate to corresponding module list page
Hover: subtle shadow, cursor pointer
```

**Difference from existing StatCard:**
- Adds `href` prop (card is clickable → navigates)
- Adds `alert` prop (attention badge below value)
- Reuses same CSS variable approach (`--stat-accent`)
- Does NOT replace StatCard — KpiCard is a separate component used only on the dashboard. StatCard continues to exist for the reports page.

---

### 3.2 KpiCardStrip

**File:** `src/components/dashboard/KpiCardStrip.tsx` + `.css`

**Props:**
```typescript
interface KpiCardStripProps {
  cards: KpiCardProps[]
  loading: boolean
}
```

**Layout:**
```css
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

/* Force 4 columns on desktop for the top row */
@media (min-width: 1280px) {
  .kpi-strip { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 640px) {
  .kpi-strip { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 420px) {
  .kpi-strip { grid-template-columns: 1fr; }
}
```

---

### 3.3 KPI Cards — Exact Data Mapping (8 cards)

| # | Label | Icon | Value Source | Trend Source | Alert | href |
|---|---|---|---|---|---|---|
| 1 | Total Customers | `Users` | `summary.total_customers` | Compare: `summary.active_customers / summary.total_customers` → show % active as sublabel | — | `/customers` |
| 2 | Active Rentals | `ClipboardList` | `rentalContracts.filter(c => c.status === 'active').length` | — | `count where status === 'overdue'` → danger badge "N overdue" | `/rental-contracts` |
| 3 | Available Forklifts | `Truck` | `forklifts.filter(f => f.status === 'in_stock').length` | Sublabel: `"{total} total fleet"` | `count where current_hour_meter > 4000` → warning "N PM due" | `/equipment` |
| 4 | Revenue (Active) | `DollarSign` | `sum(rentalContracts.filter(active).map(c => c.total_value))` | — | — | `/rental-contracts` |
| 5 | Upcoming PM | `Wrench` | `forklifts.filter(f => f.current_hour_meter > 4000).length` | — | `count where > 4500` → danger "N critical" | `/equipment` |
| 6 | Open Quotations | `FileText` | `quotations.filter(q => ['draft','under_review','sent','approved'].includes(q.status)).length` | Sublabel: `"฿{totalAmount} pipeline"` where totalAmount = sum of their total_amount | `count where valid_until < now + 7d` → warning "N expiring soon" | `/quotations` |
| 7 | Upcoming Returns | `CalendarClock` | `rentalContracts.filter(c => c.status === 'active' && daysUntil(c.end_date) <= 30).length` | — | `count where daysUntil(end_date) <= 7` → danger "N this week" | `/rental-contracts` |
| 8 | Fleet Utilization | `Gauge` | `Math.round(rentedCount / totalForklifts * 100)` + `%` | Sublabel: `"{rented} of {total} rented"` | — | `/equipment` |

**Computation functions (all client-side, pure):**
```
daysUntil(date) = Math.ceil((new Date(date) - now) / 86400000)
sum(arr) = arr.reduce((a, b) => a + b, 0)
```

---

### 3.4 RevenueChart

**File:** `src/components/dashboard/RevenueChart.tsx` + `.css`

**Props:**
```typescript
interface RevenueChartProps {
  contracts: RentalContract[]
  months: number              // how many months to show (default 6)
  loading: boolean
}
```

**Data computation (client-side from rental contracts):**
```
1. Take all contracts (any status that had value: active, closed, overdue)
2. For each contract, assign to month bucket based on start_date
3. Sum total_value per month
4. Generate array: [{month: '2026-01', revenue: 450000}, ...]
```

**Visual:**
```
┌──────────────────────────────────────────┐
│  📊  Monthly Rental Revenue       [6M▾] │
├──────────────────────────────────────────┤
│                                          │
│                     ╭──╮                 │
│               ╭──╮  │  │  ╭──╮          │  ← Area chart with gradient fill
│         ╭──╮  │  │  │  │  │  │          │     Color: primary blue
│   ╭──╮  │  │  │  │  │  │  │  │  ╭──╮   │     Tooltip: month + formatted amount
│   │  │  │  │  │  │  │  │  │  │  │  │   │
│   Jan   Feb   Mar   Apr   May   Jun     │
│                                          │
│  Total: ฿14,200,000                      │  ← Computed sum below chart
│                                          │
└──────────────────────────────────────────┘

Chart type: Recharts AreaChart (not LineChart)
  Uses: ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
  Area fill: gradient from primary-500 at 30% opacity to transparent
  Line stroke: primary-500, 2.5px

Wrapper: ChartCard (existing component — reuse)
Height: 260px
```

**Why not reuse TrendLineChart:** TrendLineChart renders a `LineChart`. Revenue needs an `AreaChart` with gradient fill for visual impact. Different Recharts component, but same container pattern.

---

### 3.5 FleetStatusDonut

**File:** `src/components/dashboard/FleetStatusDonut.tsx` + `.css`

**Props:**
```typescript
interface FleetStatusDonutProps {
  forklifts: Forklift[]
  loading: boolean
}
```

**Data computation:**
```
Group forklifts by status → { in_stock: 24, rented: 18, in_service: 5, ... }
Convert to PieChart data: [{ name: 'In Stock', value: 24, color: '#22c55e' }, ...]
```

**Status → Color mapping (matching existing ForkliftStatusBadge):**
```
in_stock:        #22c55e  (green)
rented:          #7c3aed  (purple)
in_service:      #f59e0b  (amber)
reserved:        #0891b2  (cyan)
sold:            #3b82f6  (blue)
decommissioned:  #ef4444  (red)
```

**Visual:**
```
┌──────────────────────────────────────────┐
│  🚛  Fleet Status                        │
├──────────────────────────────────────────┤
│                                          │
│     ┌─────────────┐                      │
│     │             │   ● In Stock     24  │
│     │   52 total  │   ● Rented       18  │  ← Legend with colored dots
│     │   (center)  │   ● In Service    5  │
│     │             │   ● Reserved      2  │
│     └─────────────┘   ● Sold          1  │
│                       ● Decomm.       2  │
│                                          │
└──────────────────────────────────────────┘

Chart: Recharts PieChart with innerRadius (donut)
Center label: total count
Legend: right-aligned, vertical list
Wrapper: ChartCard (reuse)
Height: 260px (same as RevenueChart for grid alignment)
```

**Recharts components used:** `PieChart`, `Pie`, `Cell`, `ResponsiveContainer`, `Tooltip`

---

### 3.6 FleetByFuelChart + FleetByBrandChart

**Files:** `src/components/dashboard/FleetByFuelChart.tsx`, `FleetByBrandChart.tsx` + `.css`

**Both reuse the existing `HorizontalBarChart` component directly.**

**FleetByFuelChart props:**
```typescript
interface FleetByFuelChartProps {
  forklifts: Forklift[]
  loading: boolean
}
```

**Data computation:**
```
Group forklifts by fuel_type → { diesel: 15, electric: 8, lpg: 6, dual_fuel: 3 }
Map to BarItem[]: [{ key: 'diesel', name: 'Diesel', value: 15 }, ...]
```

**Color map:**
```
diesel:    #f59e0b
electric:  #22c55e
lpg:       #3b82f6
dual_fuel: #7c3aed
null:      #94a3b8  (unknown)
```

**FleetByBrandChart** — same pattern:
```
Group forklifts by brand?.name → { 'Toyota': 12, 'Komatsu': 8, ... }
Map to BarItem[]
Top 8 brands, rest grouped as "Other"
```

**Both wrapped in `ChartCard`.**

---

### 3.7 RecentActivityFeed

**File:** `src/components/dashboard/RecentActivityFeed.tsx` + `.css`

**Props:**
```typescript
interface RecentActivityFeedProps {
  activities: ActivityLog[]
  loading: boolean
}
```

**Data source:** `getActivity({ limit: 10 })` — existing API.

**Visual:**
```
┌──────────────────────────────────────────────────────────┐
│  ⚡  Recent Activity                       [View All →] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ ● ───────────────────────────────────────────────┐  │
│  │ 📄  Quotation QT-0048 submitted for review        │  │
│  │     by Touyl PVS                      2 hours ago │  │
│  ├─ ● ───────────────────────────────────────────────┤  │
│  │ 📋  Rental contract RC-0012 activated              │  │
│  │     by Admin                          5 hours ago │  │
│  ├─ ● ───────────────────────────────────────────────┤  │
│  │ 👤  Customer "Toyota Motor" created                │  │
│  │     by Touyl PVS                        1 day ago │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘

Each item:
  Icon: mapped from entity_type (customer→Users, lead→TrendingUp, etc.)
  Title: human-readable action description
  User: from activity.user.full_name
  Time: relative ("2 hours ago", "1 day ago")
  Click: navigate to entity (if entity_type + entity_id available)

"View All →" → navigates to /activity
```

**Action → Description mapping (client-side):**
```
customer_created  → 'Customer "{name}" created'
customer_updated  → 'Customer "{name}" updated'
lead_created      → 'Lead "{title}" created'
lead_status_changed → 'Lead "{title}" status changed to {new_status}'
user_login        → '{user} logged in'
```

Details are extracted from `activity.details` object.

---

### 3.8 ExpiringContractsCard

**File:** `src/components/dashboard/ExpiringContractsCard.tsx` + `.css`

**Props:**
```typescript
interface ExpiringContractsCardProps {
  contracts: RentalContract[]     // full list — component filters internally
  loading: boolean
}
```

**Data computation:**
```
1. Filter: status === 'active' && daysUntil(end_date) > 0 && daysUntil(end_date) <= 30
2. Sort: by end_date ascending (soonest first)
3. Take top 5
```

**Visual:**
```
┌────────────────────────────────────┐
│  📋  Contracts Expiring            │
│      3 in next 30 days             │
├────────────────────────────────────┤
│                                    │
│  RC-0012                   5 days  │  ← contract_number + days until
│  Toyota Motor (Thailand)          │  ← customer name
│  ฿85,000 · Short Term            │  ← total_value + contract_type
│  ────────────────────────────────  │
│  RC-0009                  12 days  │
│  ABC Corporation                  │
│  ฿120,000 · Long Term            │
│  ────────────────────────────────  │
│  RC-0007                  18 days  │
│  XYZ Industries                   │
│  ฿45,000 · Project               │
│                                    │
│  [View All Contracts →]            │
│                                    │
└────────────────────────────────────┘

Urgency color coding:
  ≤ 7 days:  red text + red dot
  8-14 days: amber text + amber dot
  15-30 days: default muted text

"View All" → /rental-contracts
Click on item → /rental-contracts/{id}

Empty state: "No contracts expiring in the next 30 days"
```

---

### 3.9 ExpiringQuotationsCard

**File:** `src/components/dashboard/ExpiringQuotationsCard.tsx` + `.css`

**Props:**
```typescript
interface ExpiringQuotationsCardProps {
  quotations: Quotation[]
  loading: boolean
}
```

**Data computation:**
```
1. Filter: status in ['draft','under_review','approved','sent'] && valid_until != null && daysUntil(valid_until) <= 14
2. Sort: by valid_until ascending
3. Take top 5
```

**Visual — same pattern as ExpiringContractsCard:**
```
┌────────────────────────────────────┐
│  📄  Quotations Expiring           │
│      2 in next 14 days             │
├────────────────────────────────────┤
│                                    │
│  QT-0044                   3 days  │
│  Forklift Rental — VM             │
│  ฿45,000 · Rental                 │
│  ────────────────────────────────  │
│  QT-0041                   8 days  │
│  Parts Order — ABC Corp           │
│  ฿120,000 · Sales                 │
│                                    │
│  [View All Quotations →]           │
│                                    │
└────────────────────────────────────┘

Click item → /quotations/{id}
Empty state: "No quotations expiring soon"
```

---

### 3.10 PmDueCard (Preventive Maintenance)

**File:** `src/components/dashboard/PmDueCard.tsx` + `.css`

**Props:**
```typescript
interface PmDueCardProps {
  forklifts: Forklift[]
  threshold?: number          // default 5000 hrs
  warningZone?: number        // default 4000 hrs (when to start showing)
  loading: boolean
}
```

**Data computation:**
```
1. Filter: current_hour_meter >= warningZone (4000)
2. Sort: by current_hour_meter descending (closest to threshold first)
3. Take top 5
4. For each: percentage = current_hour_meter / threshold × 100
```

**Visual:**
```
┌────────────────────────────────────┐
│  🔧  PM / Service Due             │
│      5 approaching service        │
├────────────────────────────────────┤
│                                    │
│  JH-2024-001              4,850 h │  ← serial + hours
│  Toyota 8FD25 · Diesel            │  ← name + fuel
│  ██████████████████████░░ 97%     │  ← progress bar (red)
│  ────────────────────────────────  │
│  KM-2024-003              4,620 h │
│  Komatsu FD30 · LPG              │
│  █████████████████████░░░ 92%     │  ← progress bar (amber)
│  ────────────────────────────────  │
│  ST-2024-007              4,210 h │
│  Still RX20-16 · Electric        │
│  █████████████████░░░░░░░ 84%     │  ← progress bar (green-ish amber)
│                                    │
│  [View All Equipment →]            │
│                                    │
└────────────────────────────────────┘

Progress bar colors (same as HourMeterBar from Equipment Redesign):
  < 80%:  green
  80-90%: amber
  > 90%:  red

Click item → /equipment/{id}
Empty state: "All forklifts within service range"
```

---

### 3.11 DashboardHeader

**File:** `src/components/dashboard/DashboardHeader.tsx` + `.css`

**Props:**
```typescript
interface DashboardHeaderProps {
  onRefresh: () => void
  isLoading: boolean
  lastUpdated: string               // formatted timestamp
}
```

**Visual:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Dashboard                                      Jun 21, 2026   │
│  Operations overview for DK Service             2:30 PM        │
│                                                                 │
│                                              [↻ Refresh]       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. File Inventory

### New Files (22)

```
src/components/dashboard/
├── DashboardHeader.tsx              NEW
├── DashboardHeader.css              NEW
├── KpiCard.tsx                      NEW
├── KpiCard.css                      NEW
├── KpiCardStrip.tsx                 NEW
├── KpiCardStrip.css                 NEW
├── RevenueChart.tsx                 NEW
├── RevenueChart.css                 NEW
├── FleetStatusDonut.tsx             NEW
├── FleetStatusDonut.css             NEW
├── FleetByFuelChart.tsx             NEW
├── FleetByBrandChart.tsx            NEW
├── FleetBreakdown.css               NEW  (shared CSS for both fleet charts)
├── RecentActivityFeed.tsx           NEW
├── RecentActivityFeed.css           NEW
├── ExpiringContractsCard.tsx        NEW
├── ExpiringContractsCard.css        NEW
├── ExpiringQuotationsCard.tsx       NEW
├── ExpiringQuotationsCard.css       NEW
├── PmDueCard.tsx                    NEW
├── PmDueCard.css                    NEW
└── index.ts                         NEW  (barrel export)

src/hooks/
└── useDashboardData.ts              NEW  (aggregation hook)
```

### Modified Files (2)

```
src/pages/Dashboard/DashboardPage.tsx    REWRITE — new layout with all widgets
src/pages/Dashboard/DashboardPage.css    REWRITE — new grid layout
```

### Unchanged Files

```
src/hooks/useDashboard.ts               KEEP — existing summary/trend hooks still used
src/api/dashboard.ts                     KEEP — existing endpoints still called
src/components/ui/StatCard.tsx + .css    KEEP — used by retained Section 6
src/components/charts/*                  KEEP — HorizontalBarChart reused, ChartCard reused
src/components/catalog/CatalogDashboardWidget.tsx  KEEP — retained in Section 6
```

---

## 5. Data Aggregation Hook

### `src/hooks/useDashboardData.ts` — NEW

**Purpose:** Single hook that fetches all data for the new dashboard in parallel, computes all derived metrics, and returns widget-ready data.

**Interface:**
```typescript
interface DashboardData {
  // Raw data
  summary: DashboardSummary | null
  forklifts: Forklift[]
  rentalContracts: RentalContract[]
  quotations: Quotation[]
  activities: ActivityLog[]

  // Computed KPIs
  kpis: {
    totalCustomers: number
    activeRentals: number
    overdueRentals: number
    availableForklifts: number
    totalFleet: number
    activeRevenue: number
    upcomingPm: number
    criticalPm: number
    openQuotations: number
    quotationPipelineValue: number
    expiringQuotations: number
    upcomingReturns: number
    urgentReturns: number
    fleetUtilization: number
    rentedCount: number
  }

  // Chart data
  revenueByMonth: { month: string; revenue: number }[]
  fleetByStatus: { name: string; value: number; color: string }[]
  fleetByFuel: BarItem[]
  fleetByBrand: BarItem[]

  // Task lists
  expiringContracts: RentalContract[]
  expiringQuotations: Quotation[]
  pmDueForklifts: Forklift[]

  // State
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useDashboardData(): DashboardData
```

**Internal logic:**
```
On mount, fire 5 API calls in parallel:
  1. getSummary()                              → summary
  2. getForklifts({ page_size: 200 })          → all forklifts
  3. getRentalContracts({ page_size: 200 })    → all contracts
  4. getQuotations({ page_size: 200 })         → all quotations
  5. getActivity({ limit: 10 })                → recent activity

Once all resolve, compute every derived metric.
Store in state. Return.
```

**Why page_size: 200?** For businesses with <200 forklifts, <200 contracts, <200 quotations (typical for a material handling company), this loads all data in 3 API calls. For larger datasets, the KPI counts are still accurate because the `.total` field from paginated responses gives the true count. The client-side computation (revenue sums, date filters) works on the loaded page of data. This is a pragmatic tradeoff — accurate enough for a dashboard overview without requiring new aggregate API endpoints.

---

## 6. Page Layout — Grid System

### DashboardPage.css — Grid Structure

```css
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Section: 2-column for charts */
.dashboard-charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* Section: 3-column for upcoming tasks */
.dashboard-tasks-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
}

/* Responsive */
@media (max-width: 1100px) {
  .dashboard-tasks-row { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 768px) {
  .dashboard-charts-row { grid-template-columns: 1fr; }
  .dashboard-tasks-row  { grid-template-columns: 1fr; }
}
```

---

## 7. Responsive Behavior

| Component | Desktop (≥1280) | Tablet (768-1279) | Mobile (<768) |
|---|---|---|---|
| **KPI Strip** | 4 columns | 3 columns | 2 columns (< 420: 1) |
| **Revenue + Fleet Status** | 2-column side by side | 2-column | Stacked full-width |
| **Fleet Fuel + Brand** | 2-column side by side | 2-column | Stacked full-width |
| **Activity Feed** | Full-width, 10 items | Full-width, 8 items | Full-width, 5 items |
| **Upcoming Tasks** | 3-column | 2-column (PM drops below) | Stacked full-width |
| **Sales Pipeline** | 5-column KPI grid | 3-column KPI grid | 2-column |

---

## 8. Build Order

```
PHASE 1: Data layer (no visual change)
──────────────────────────────────────────
  1. useDashboardData.ts hook
  2. Test: all 5 API calls resolve, computed values correct

PHASE 2: Leaf components (parallel)
──────────────────────────────────────────
  3. KpiCard.tsx + .css
  4. KpiCardStrip.tsx + .css
  5. RevenueChart.tsx + .css
  6. FleetStatusDonut.tsx + .css
  7. FleetByFuelChart.tsx
  8. FleetByBrandChart.tsx + FleetBreakdown.css
  9. RecentActivityFeed.tsx + .css
  10. ExpiringContractsCard.tsx + .css
  11. ExpiringQuotationsCard.tsx + .css
  12. PmDueCard.tsx + .css
  13. DashboardHeader.tsx + .css
  14. index.ts barrel export

PHASE 3: Page rewrite
──────────────────────────────────────────
  15. DashboardPage.tsx — assemble all sections
  16. DashboardPage.css — grid layout

PHASE 4: Verification
──────────────────────────────────────────
  17. Test all widgets with real data
  18. Test empty states (no contracts, no forklifts, etc.)
  19. Test responsive at 420px, 768px, 1024px, 1280px, 1536px
  20. Test loading skeletons
```

---

## 9. Verification Checklist

```
KPI CARDS
  [ ] Total Customers shows correct count from /dashboard/summary
  [ ] Active Rentals counts contracts with status 'active'
  [ ] Available Forklifts counts forklifts with status 'in_stock'
  [ ] Revenue sums total_value of active contracts
  [ ] Upcoming PM counts forklifts with hours > 4000
  [ ] Open Quotations counts draft + under_review + sent + approved
  [ ] Upcoming Returns counts active contracts ending within 30 days
  [ ] Fleet Utilization shows rented/total percentage
  [ ] Clicking any KPI card navigates to correct module
  [ ] Alert badges show on cards with overdue/expiring items
  [ ] Skeleton loading state renders for all 8 cards

REVENUE CHART
  [ ] Area chart renders monthly revenue from rental contracts
  [ ] Tooltip shows formatted amount per month
  [ ] Total sum displayed below chart
  [ ] Empty state when no contracts exist
  [ ] Responsive width adjustment

FLEET STATUS
  [ ] Donut chart renders equipment by status
  [ ] Center label shows total count
  [ ] Legend shows all status categories with counts
  [ ] Colors match ForkliftStatusBadge colors

FLEET BREAKDOWN
  [ ] Fuel type horizontal bar chart renders correctly
  [ ] Brand horizontal bar chart renders correctly
  [ ] Both use existing HorizontalBarChart component

RECENT ACTIVITY
  [ ] Shows 10 most recent activities from /activity/
  [ ] Each item shows icon, description, user, relative time
  [ ] "View All →" navigates to /activity
  [ ] Clicking an item navigates to the entity (if possible)
  [ ] Empty state when no activities

UPCOMING TASKS
  [ ] Expiring Contracts shows contracts ending within 30 days
  [ ] Urgency color coding: red (≤7d), amber (8-14d), default (15-30d)
  [ ] Expiring Quotations shows quotes expiring within 14 days
  [ ] PM Due shows forklifts with hours > 4000, with progress bar
  [ ] Each "View All →" navigates correctly
  [ ] Each item click navigates to detail page
  [ ] Empty states render correctly for each card

SALES PIPELINE (retained)
  [ ] Existing Lead Pipeline section still renders
  [ ] Existing Results & Conversion section still renders
  [ ] CatalogDashboardWidget still renders

RESPONSIVE
  [ ] KPI cards: 4 cols → 3 → 2 → 1
  [ ] Charts: 2 cols → stacked
  [ ] Tasks: 3 cols → 2 → stacked
  [ ] No horizontal scrollbar at any width

ZERO REGRESSIONS
  [ ] All existing dashboard API calls still work
  [ ] StatCard component unchanged (used in Reports)
  [ ] ChartCard component unchanged
  [ ] TrendLineChart, DistributionBarChart, HorizontalBarChart unchanged
  [ ] No backend / API / database changes
```
