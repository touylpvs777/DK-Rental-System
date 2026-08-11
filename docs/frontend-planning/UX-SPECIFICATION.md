# DK Service Enterprise Platform — UX Specification

**Version:** 1.0  
**Date:** 2026-06-21  
**Role:** Principal Product Designer & Enterprise UX Architect  
**Scope:** Frontend transformation only — no backend, API, or database changes  

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Enterprise Design System](#2-enterprise-design-system)
3. [Dashboard Architecture](#3-dashboard-architecture)
4. [Navigation Architecture](#4-navigation-architecture)
5. [Component Library](#5-component-library)
6. [Responsive Strategy](#6-responsive-strategy)
7. [Migration Plan](#7-migration-plan)

---

## 1. Current State Assessment

### 1.1 Inventory Summary

| Dimension | Current State |
|---|---|
| **Framework** | React 19.2 + TypeScript 6 + Vite 8 |
| **State** | Zustand (auth, toast stores only) |
| **Routing** | react-router-dom 7.17 — flat, no lazy loading |
| **Styling** | Custom CSS + CSS variables (no design library) |
| **Icons** | Lucide React |
| **Charts** | Recharts |
| **Components** | ~108 custom-built files |
| **Pages** | 16 routes across 5 modules + Dashboard + Login |

### 1.2 UX Gap Analysis

| Area | Gap | Enterprise Benchmark (Fleetio/Samsara/HubSpot) |
|---|---|---|
| **Navigation** | Flat sidebar with 5 static section labels. No collapsible groups, no search, no favorites, no quick-switch. | Collapsible module groups, global search (Cmd+K), pinned favorites, workspace switcher |
| **Dashboard** | Stat cards only — no charts, no time-range selector, no drill-down, no role-based views | Interactive charts, configurable widgets, time comparisons, drill-to-detail |
| **Data Tables** | Vanilla HTML tables, no column resize, no column toggle, no bulk actions, no inline edit | Virtual-scrolled tables, drag-to-reorder columns, bulk select + actions, saved views |
| **Detail Pages** | Single-scroll layouts, no tab navigation, no activity timeline, no linked records | Tabbed detail shells, activity feeds, cross-module linking, action toolbars |
| **Forms** | Modal-only, no step/wizard, no auto-save, no inline validation | Full-page wizards for complex records, inline validation, auto-save drafts |
| **Search** | Per-page only — no global/universal search | Global omni-search across all entities (Cmd+K) |
| **Empty States** | Text only, no illustration, no guided action | Illustrated empty states with primary action CTA |
| **Loading** | Skeleton cells in tables, no page-level transition | Skeleton screens, progressive loading, optimistic updates |
| **Error Handling** | Banner-only, no inline field errors on forms | Inline field validation, toast + banner + retry patterns |
| **Notifications** | Toast only, no notification center, no bell icon | Notification center with unread count, toast for immediate |
| **Responsiveness** | Two breakpoints (640px, 768px) | Fluid 5-breakpoint system with tablet-optimized layouts |
| **Performance** | No code-splitting, no route lazy-loading | Route-based code-splitting, image lazy load, virtual scroll |
| **Accessibility** | Minimal — some aria-labels, no focus management | WCAG 2.1 AA, keyboard navigation, focus trapping in modals |
| **Dark Mode** | None | CSS variable-based theme switching |

### 1.3 What Works Well (Keep)

- Clean file organization (feature-based folders)
- Zustand for lightweight global state — correct tool for scope
- CSS custom properties as theming foundation — extensible
- Lucide icon system — consistent and tree-shakeable
- Module registry pattern — excellent for scaling navigation
- Recharts already installed — sufficient for enterprise charts

---

## 2. Enterprise Design System

### 2.1 Design Principles

| Principle | Description | Application |
|---|---|---|
| **Density-First** | Enterprise users need information density over whitespace | Compact table rows, multi-stat dashboards, dense toolbars |
| **Keyboard-Native** | Power users navigate without mouse | Cmd+K search, table keyboard nav, shortcut overlays |
| **Progressive Disclosure** | Show summary first, detail on demand | Collapsed sidebar groups, tabbed details, expandable rows |
| **Consistent Patterns** | Same interaction model everywhere | Every list page uses DataTable, every detail uses DetailShell |
| **Operational Clarity** | Status, urgency, and ownership always visible | Color-coded badges, assignee avatars, timestamp freshness |

### 2.2 Color System

#### 2.2.1 Semantic Palette

```
LIGHT THEME                          DARK THEME (future)
───────────────────────────────────   ─────────────────────────────
--color-bg:          #f8fafc          --color-bg:          #0f1117
--color-bg-subtle:   #f1f5f9          --color-bg-subtle:   #1a1d27
--color-surface:     #ffffff          --color-surface:     #1e2130
--color-surface-raised: #ffffff       --color-surface-raised: #252836
--color-border:      #e2e8f0          --color-border:      #2d3148
--color-border-strong: #cbd5e1        --color-border-strong: #3d4260

--color-text:        #0f172a          --color-text:        #e2e8f0
--color-text-secondary: #475569       --color-text-secondary: #94a3b8
--color-text-muted:  #94a3b8          --color-text-muted:  #64748b
--color-text-inverse: #ffffff         --color-text-inverse: #0f172a
```

#### 2.2.2 Brand & Status Colors

```
PRIMARY (Brand Blue)
  --color-primary-50:  #eff6ff
  --color-primary-100: #dbeafe
  --color-primary-500: #3b82f6    ← Primary actions
  --color-primary-600: #2563eb    ← Primary hover
  --color-primary-700: #1d4ed8    ← Primary pressed

STATUS PALETTE
  --color-success:     #22c55e    Green  — active, won, approved, available
  --color-warning:     #f59e0b    Amber  — pending, expiring, needs-attention
  --color-danger:      #ef4444    Red    — overdue, lost, rejected, error
  --color-info:        #3b82f6    Blue   — new, draft, in-progress

MODULE ACCENTS (from existing registry — keep)
  Customers:       #2563eb
  Leads:           #7c3aed
  Product Catalog: #7c3aed
  Equipment:       #0d9488
  Quotations:      #2563eb
  Rental:          #0891b2
  Activity:        #0891b2
  Reports:         #d97706
```

### 2.3 Typography Scale

```
Font Stack: Inter, system-ui, 'Segoe UI', sans-serif
            ↑ Upgrade from system-ui to Inter for professional feel

SCALE                    SIZE    WEIGHT  LINE-HEIGHT  USAGE
──────────────────────── ─────── ─────── ──────────── ─────────────────────
--text-xs                11px    400     16px         Badges, timestamps, captions
--text-sm                12.5px  400     18px         Table cells, form labels, metadata
--text-base              14px    400     20px         Body text, form inputs
--text-md                15px    500     22px         Subtitles, card titles
--text-lg                18px    600     26px         Page titles
--text-xl                22px    700     30px         Dashboard section headings
--text-2xl               28px    700     36px         Hero metrics / primary KPIs

MONO (for codes, IDs):   'JetBrains Mono', 'Fira Code', monospace
```

### 2.4 Spacing System

```
Base unit: 4px

--space-1:   4px      Inline icon gaps
--space-2:   8px      Compact element gaps, badge padding
--space-3:   12px     Form group gaps, card inner padding
--space-4:   16px     Section gaps, standard padding
--space-5:   20px     Page header margin
--space-6:   24px     Card padding, section spacing
--space-8:   32px     Dashboard section gaps
--space-10:  40px     Page-level vertical rhythm
--space-12:  48px     Major section separators
```

### 2.5 Elevation & Shadow System

```
LEVEL    TOKEN            VALUE                                           USAGE
──────── ──────────────── ─────────────────────────────────────────────── ──────────────────
0        --shadow-none    none                                            Flat elements
1        --shadow-xs      0 1px 2px rgba(0,0,0,0.05)                     Table rows hover
2        --shadow-sm      0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)  Cards (current)
3        --shadow-md      0 4px 6px -1px rgba(0,0,0,0.1)                 Dropdowns, popovers
4        --shadow-lg      0 10px 15px -3px rgba(0,0,0,0.1)               Modals, command palette
5        --shadow-xl      0 20px 25px -5px rgba(0,0,0,0.1)               Drawers
```

### 2.6 Border Radius System

```
--radius-sm:    4px     Badges, small buttons
--radius:       6px     Inputs, buttons (keep current)
--radius-md:    8px     Cards, alerts
--radius-lg:    12px    Modals, drawers, larger panels
--radius-xl:    16px    Dashboard widget cards
--radius-full:  9999px  Avatars, pills, circular buttons
```

### 2.7 Motion & Transitions

```
--duration-fast:    100ms    Hover states, color changes
--duration-normal:  200ms    Dropdowns, tooltips appearing
--duration-slow:    300ms    Modals, drawers, sidebar collapse
--duration-slower:  500ms    Page transitions, skeleton → content

--ease-default:     cubic-bezier(0.4, 0, 0.2, 1)   General-purpose
--ease-in:          cubic-bezier(0.4, 0, 1, 1)      Elements entering
--ease-out:         cubic-bezier(0, 0, 0.2, 1)      Elements exiting
--ease-spring:      cubic-bezier(0.34, 1.56, 0.64, 1)  Playful bounce (sparingly)
```

### 2.8 Iconography

```
Library:        Lucide React (keep — already in use)
Default Size:   16px (navigation, inline text)
                18px (toolbar actions, buttons)
                20px (stat cards, section headers)
                24px (empty states, hero illustrations)
Stroke Width:   1.75 (default), 2 for emphasis
Color:          Inherit from parent text color, or semantic color for status
```

---

## 3. Dashboard Architecture

### 3.1 Dashboard Layout Model

Inspired by: Fleetio fleet dashboard + Samsara operations view + HubSpot reporting

```
┌─────────────────────────────────────────────────────────────────────┐
│  TOPBAR: "Dashboard"   [Time: Last 30 days ▾]  [↻ Refresh] [👤]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─── HERO METRICS BAR ──────────────────────────────────────────┐  │
│  │ [Revenue]  [Active Contracts]  [Equipment Util.]  [Open Quot] │  │
│  │  ฿2.4M       47 active          82%                 12 open   │  │
│  │  ↑ 12%       ↑ 3 this week      ↓ 2% vs last mo    5 urgent  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─── SECTION: Fleet & Equipment ─── [View All →] ──────────────┐  │
│  │                                                                │  │
│  │  ┌──────────────────────┐  ┌──────────────────────────────┐   │  │
│  │  │ EQUIPMENT STATUS     │  │ EQUIPMENT BY FUEL TYPE       │   │  │
│  │  │ ● Available: 24     │  │ [Horizontal Bar Chart]       │   │  │
│  │  │ ● Rented: 18        │  │                              │   │  │
│  │  │ ● Maintenance: 5    │  │                              │   │  │
│  │  │ ● Retired: 3        │  │                              │   │  │
│  │  │ [Donut Chart]        │  │                              │   │  │
│  │  └──────────────────────┘  └──────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─── SECTION: Sales Pipeline ─── [View All →] ─────────────────┐  │
│  │                                                                │  │
│  │  ┌──────────────────────┐  ┌──────────────────────────────┐   │  │
│  │  │ LEAD FUNNEL          │  │ CONVERSION TREND (30 days)   │   │  │
│  │  │ New → Contact → Qual │  │ [Line Chart w/ area fill]    │   │  │
│  │  │ → Proposal → Won     │  │                              │   │  │
│  │  │ [Funnel / Pipeline]  │  │                              │   │  │
│  │  └──────────────────────┘  └──────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─── SECTION: Recent Activity ─── [View All →] ────────────────┐  │
│  │                                                                │  │
│  │  ┌────────────────────────────┐  ┌────────────────────────┐   │  │
│  │  │ RECENT QUOTATIONS          │  │ CONTRACTS EXPIRING     │   │  │
│  │  │ QT-0048 Toyota 8FD25  New  │  │ RC-0012 expires in 5d  │   │  │
│  │  │ QT-0047 Komatsu FD30 Sent │  │ RC-0009 expires in 12d │   │  │
│  │  │ QT-0046 Mitsubishi   Won  │  │ RC-0007 expires in 18d │   │  │
│  │  │ [Mini table - 5 rows max]  │  │ [Urgency color-coded]  │   │  │
│  │  └────────────────────────────┘  └────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─── SECTION: Product Catalog ─── [View All →] ────────────────┐  │
│  │  [Existing CatalogDashboardWidget — enhanced with charts]     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Dashboard Widget System

Every dashboard widget follows a consistent `DashboardCard` container:

```
┌────────────────────────────────────────────┐
│  [Icon]  Widget Title       [⋯ More menu]  │  ← Header (always)
│          Subtitle / date range             │
├────────────────────────────────────────────┤
│                                            │
│           CONTENT AREA                     │  ← Chart, table, or KPIs
│       (flexible height)                    │
│                                            │
├────────────────────────────────────────────┤
│  View all →                                │  ← Footer link (optional)
└────────────────────────────────────────────┘
```

**Widget types to implement:**

| Widget | Content | Data Source (existing API) |
|---|---|---|
| HeroMetricBar | 4 top-level KPIs with trend arrows | `/dashboard/summary` |
| EquipmentStatusDonut | Donut chart of equipment by status | `/forklifts` status counts |
| EquipmentByFuelBar | Horizontal bar by fuel type | `/forklifts` fuel_type counts |
| LeadFunnel | Pipeline stage visualization | `/dashboard/summary` lead counts |
| ConversionTrendLine | 30-day conversion line chart | `/dashboard/summary` rates |
| RecentQuotations | Mini table of latest 5 quotations | `/quotations?page_size=5` |
| ExpiringContracts | List of contracts nearing end date | `/rental-contracts?status=active` |
| CatalogOverview | Product count by category/brand | Existing widget (enhanced) |

### 3.3 Time Range Controls

```
┌──────────────────────────────────────────┐
│  Time Range:                             │
│  [Today] [7 days] [30 days●] [90 days]   │  ← Segmented control
│  [Custom: 2026-05-01 → 2026-06-21]      │  ← Date range picker
└──────────────────────────────────────────┘

Behavior:
- Default: Last 30 days
- Selection persists in URL query params (?range=30d)
- All widgets on page respond to the global time filter
- Individual widgets can override with local time filters
```

### 3.4 Dashboard KPI Comparison Spec

Each `StatCard` evolves to show trend comparison:

```
┌────────────────────────────────────┐
│  [👤]                              │
│  Total Customers                   │
│  1,247                             │  ← Primary value (--text-2xl)
│  ↑ 12.3% vs last period           │  ← Trend (green/red + direction)
│  847 active · 400 prospect         │  ← Breakdown subtitle
└────────────────────────────────────┘
```

---

## 4. Navigation Architecture

### 4.1 Navigation Model

Three-tier navigation inspired by Linear + HubSpot:

```
TIER 1: SIDEBAR (persistent)         TIER 2: MODULE TABS (contextual)
─────────────────────────────         ─────────────────────────────────
Always visible on desktop.            Appears inside module pages.
Collapsible on tablet/mobile.         Provides sub-navigation within
                                      a module boundary.
                                      
TIER 3: COMMAND PALETTE (overlay)
───────────────────────────────
Cmd+K or search icon. Searches
across all entities globally.
```

### 4.2 Sidebar Architecture (Tier 1)

```
┌─── SIDEBAR (240px wide, collapsible to 64px) ────────────────┐
│                                                                │
│  ┌─ Brand ──────────────────────────────────────────────────┐  │
│  │  [Logo]  DK Service                        [« Collapse]  │  │
│  │          Enterprise Platform                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─ Quick Actions ──────────────────────────────────────────┐  │
│  │  [🔍 Search...                              Cmd+K]       │  │
│  │  [+ Quick Create ▾]                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─ Navigation ─────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  📊 Dashboard                                  [pinned]   │  │
│  │                                                           │  │
│  │  ▾ CRM                                    [collapsible]   │  │
│  │    👥 Customers                                           │  │
│  │    📈 Leads                                               │  │
│  │                                                           │  │
│  │  ▾ Sales                                  [collapsible]   │  │
│  │    📄 Quotations                          [badge: 12]     │  │
│  │    📋 Rental Contracts                    [badge: 3]      │  │
│  │                                                           │  │
│  │  ▾ Fleet                                  [collapsible]   │  │
│  │    🚛 Equipment Registry                                  │  │
│  │                                                           │  │
│  │  ▾ Catalog                                [collapsible]   │  │
│  │    📦 Products                                            │  │
│  │    🏷️ Brands                                              │  │
│  │    📁 Categories                                          │  │
│  │    📤 Import                                              │  │
│  │                                                           │  │
│  │  ▾ Analytics                              [collapsible]   │  │
│  │    ⚡ Activity                                            │  │
│  │    📊 Reports                                             │  │
│  │                                                           │  │
│  │  ─────────────────────────── divider ──                   │  │
│  │  ⚙️ Settings                                              │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─ User Footer ────────────────────────────────────────────┐  │
│  │  [TL]  Touyl PVS            [⋯ menu]                     │  │
│  │        Administrator                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### Sidebar Behaviors:

| Behavior | Specification |
|---|---|
| **Collapse** | Click `«` or keyboard `[` to collapse to 64px icon-only rail. Tooltip shows label on hover. |
| **Expand on hover** | When collapsed, hovering for 300ms expands a temporary overlay sidebar. Moving mouse away collapses it. |
| **Group collapse** | Click section header (CRM, Sales, etc.) to collapse/expand children. State persists in localStorage. |
| **Active indicator** | Left 3px border accent in module color. Background: `--color-primary-50`. |
| **Badge counts** | Right-aligned count badges for actionable items (open quotations, active contracts). Fetched from existing list APIs with `page_size=0` for count only. |
| **Mobile** | Full overlay with backdrop at `< 768px`. Swipe-right to open from left edge. |
| **Tablet** | Auto-collapsed to icon rail at `768px–1024px`. |

### 4.3 Command Palette (Tier 3) — Global Search

Inspired by: Linear Cmd+K, HubSpot global search

```
┌─────────────────────────────────────────────────────────────┐
│  🔍  Search customers, equipment, quotations...             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  RECENT                                                     │
│  ├─ 👥 Toyota Motor Thailand          Customer              │
│  ├─ 🚛 FLT-2024-0012 Toyota 8FD25    Equipment             │
│  └─ 📄 QT-2024-0048                  Quotation             │
│                                                             │
│  QUICK ACTIONS                                              │
│  ├─ ➕ New Customer                   Cmd+Shift+C           │
│  ├─ ➕ New Quotation                  Cmd+Shift+Q           │
│  ├─ ➕ New Rental Contract            Cmd+Shift+R           │
│  └─ ➕ Register Equipment             Cmd+Shift+E           │
│                                                             │
│  NAVIGATION                                                 │
│  ├─ 📊 Go to Dashboard               Cmd+1                 │
│  ├─ 👥 Go to Customers               Cmd+2                 │
│  └─ 📈 Go to Leads                   Cmd+3                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

When typing:
┌─────────────────────────────────────────────────────────────┐
│  🔍  toyota                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CUSTOMERS (3)                                              │
│  ├─ 👥 Toyota Motor Thailand       Active    Bangkok        │
│  ├─ 👥 Toyota Tsusho (Thailand)    Active    Chonburi       │
│  └─ 👥 Toyota Boshoku             Prospect   Rayong         │
│                                                             │
│  EQUIPMENT (5)                                              │
│  ├─ 🚛 FLT-2024-0012  Toyota 8FD25    Available            │
│  ├─ 🚛 FLT-2024-0008  Toyota 8FBN30   Rented               │
│  └─ + 3 more...                                             │
│                                                             │
│  PRODUCTS (2)                                               │
│  ├─ 📦 Toyota 8FD25 Forklift      Diesel   2.5 Ton         │
│  └─ 📦 Toyota 8FBN30              Electric  3.0 Ton         │
│                                                             │
│  [Enter to open] [↑↓ to navigate] [Esc to close]           │
└─────────────────────────────────────────────────────────────┘

Implementation notes:
- Client-side fuzzy search across cached entity lists
- Each entity type searches: existing list API with ?search= param
- Debounce: 250ms after last keystroke
- Results grouped by entity type, max 5 per group
- Keyboard-driven: arrow keys navigate, Enter opens, Esc closes
- Recent items stored in localStorage (last 10 visited)
```

### 4.4 Breadcrumb System

Appears below the Topbar for all pages deeper than root:

```
Dashboard  /  Quotations  /  QT-2024-0048
                                ↑ current page (non-link, bold)
```

Rules:
- Level 1 (list pages): No breadcrumb — the sidebar active state is sufficient
- Level 2 (detail/create pages): Show `Module → Current Page`
- Level 3 (sub-entity): Show `Module → Parent → Current`
- Clicking any breadcrumb segment navigates to that page

### 4.5 Quick Create Menu

Floating action accessible from sidebar and Cmd+K:

```
┌─────────────────────────┐
│  Quick Create            │
│  ├─ 👥 New Customer      │
│  ├─ 📈 New Lead          │
│  ├─ 📄 New Quotation     │
│  ├─ 📋 New Contract      │
│  └─ 🚛 Register Forklift │
└─────────────────────────┘

Behavior:
- Dropdown from sidebar "+ Quick Create" button
- Each item opens the corresponding form modal or navigates to /new page
- Uses existing form components — no new API calls needed
```

---

## 5. Component Library

### 5.1 Component Architecture Map

```
PRIMITIVES (atoms)          PATTERNS (molecules)         TEMPLATES (organisms)
────────────────────        ─────────────────────        ────────────────────
Button                      SearchInput                  PageShell
Badge                       FilterBar                    DetailShell
Avatar                      StatCard (enhanced)          DataTable
IconButton                  DashboardCard                FormWizard
Tooltip                     EmptyState                   CommandPalette
Spinner                     ErrorBanner                  Sidebar (enhanced)
Skeleton                    ConfirmDialog                Topbar (enhanced)
Divider                     Drawer (enhanced)
Tag                         Breadcrumb
Toggle                      TabBar
Checkbox                    Timeline
Radio                       MiniTable
Select (enhanced)           MetricComparison
DatePicker                  StatusPipeline
TextInput                   ActivityFeed
Textarea                    LinkCard
```

### 5.2 Button System

```
VARIANTS
─────────────────────────────────────────────────────────────────
Primary     Solid blue background, white text. One per viewport.
Secondary   White background, gray border. Supporting actions.
Ghost       No background, no border. Tertiary / toolbar actions.
Danger      Red background. Destructive operations only.
Link        Text-only with underline hover. Inline navigation.

SIZES
─────────────────────────────────────────────────────────────────
sm          Height: 28px  Padding: 4px 10px   Font: 12px
md          Height: 34px  Padding: 6px 14px   Font: 13.5px  (default)
lg          Height: 40px  Padding: 8px 18px   Font: 14px

STATES
─────────────────────────────────────────────────────────────────
Default     Base appearance
Hover       Darker shade / subtle background
Active      Pressed — scale(0.98)
Loading     Spinner replaces icon, text stays, disabled
Disabled    50% opacity, cursor: not-allowed
Focus       2px ring in primary color (keyboard navigation)

ICON SUPPORT
─────────────────────────────────────────────────────────────────
Leading     [icon] Label        ← Most common
Trailing    Label [icon]        ← Dropdowns, external links
Icon-only   [icon]              ← Toolbar actions, requires tooltip
```

### 5.3 DataTable Component

Replaces all current `<table>` implementations across modules.

```
┌─────────────────────────────────────────────────────────────────┐
│ TOOLBAR                                                         │
│ [🔍 Search...        ]  [Status ▾]  [Brand ▾]  [✕ Clear]       │
│                                                                 │
│ [☐ Bulk Actions ▾]  [Columns ▾]  [Export ▾]     234 results    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ☐  NAME ↕          STATUS    BRAND     DATE ↓       ACTIONS   │
│  ─────────────────────────────────────────────────────────────  │
│  ☐  Toyota 8FD25    ● Active  Toyota    Jun 15, 2026  [⋯]     │
│  ☐  Komatsu FD30    ● Rented  Komatsu   Jun 12, 2026  [⋯]     │
│  ☐  Mitsubishi FG25 ○ Maint.  Mitsubishi Jun 10, 2026 [⋯]     │
│  ☐  Still RX20-16   ● Active  Still     Jun 08, 2026  [⋯]     │
│  ☐  Hyster H3.0FT   ◌ Retired Hyster    Jun 05, 2026  [⋯]     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Showing 1-20 of 234   [◀ Prev]  1  2  3  ...  12  [Next ▶]   │
└─────────────────────────────────────────────────────────────────┘
```

#### DataTable Feature Spec:

| Feature | Current | Target | Priority |
|---|---|---|---|
| Search with debounce | Yes | Keep — 300ms debounce | — |
| Column sorting | Click header | Keep — add multi-column sort | P1 |
| Filter dropdowns | Per-module custom | Unified `FilterBar` component | P1 |
| Pagination | Custom per-page | Unified, configurable page sizes (20/50/100) | P1 |
| Row selection (checkbox) | None | Bulk select with shift-click range | P2 |
| Bulk actions | None | Delete, status change, export selected | P2 |
| Column toggle | None | Show/hide columns via popover | P2 |
| Row click → detail | Inconsistent | Always navigate to detail page | P1 |
| Row actions menu | Edit/delete buttons | `⋯` overflow menu with contextual actions | P1 |
| Skeleton loading | Yes | Keep — enhance with staggered animation | — |
| Empty state | Text only | Illustrated empty state with CTA | P1 |
| Sticky header | CSS sticky | Keep | — |
| Keyboard navigation | None | Arrow keys, Enter to open row | P3 |
| Export | None | CSV/Excel export of current filtered view | P2 |
| Saved views | None | Save filter+sort+column combos as named views | P3 |

### 5.4 DetailShell Component

Consistent layout for all detail/view pages (Forklift, Quotation, Contract, Product, Customer).

```
┌─────────────────────────────────────────────────────────────────┐
│  BREADCRUMB:  Equipment Registry  /  FLT-2024-0012             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ DETAIL HEADER ─────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  [🚛]  Toyota 8FD25 Forklift                            │   │
│  │        Serial: FLT-2024-0012   ● Available              │   │
│  │        Registered: Jun 15, 2026                         │   │
│  │                                                          │   │
│  │  [Edit]  [Change Status ▾]  [Create Quotation]  [⋯]    │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ TAB BAR ────────────────────────────────────────────────┐  │
│  │  [Overview●]  [Specifications]  [History]  [Documents]   │  │
│  │               [Linked Contracts]  [Activity]             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ TAB CONTENT ─── (varies by tab) ───────────────────────┐  │
│  │                                                          │  │
│  │  Overview Tab Layout (2-column on desktop):              │  │
│  │                                                          │  │
│  │  ┌── Main Column (60%) ──┐  ┌── Sidebar (40%) ───────┐  │  │
│  │  │                        │  │                         │  │  │
│  │  │  Key Information       │  │  Quick Stats            │  │  │
│  │  │  ├─ Brand: Toyota      │  │  ├─ Total Hours: 2,450 │  │  │
│  │  │  ├─ Model: 8FD25       │  │  ├─ Contracts: 3       │  │  │
│  │  │  ├─ Year: 2022         │  │  ├─ Revenue: ฿450K     │  │  │
│  │  │  ├─ Fuel: Diesel       │  │  └─ Last Service: 30d  │  │  │
│  │  │  └─ Capacity: 2.5T     │  │                         │  │  │
│  │  │                        │  │  Related Records        │  │  │
│  │  │  Description           │  │  ├─ Contract RC-0012   │  │  │
│  │  │  Lorem ipsum...        │  │  ├─ Quote QT-0048      │  │  │
│  │  │                        │  │  └─ Customer: Toyota    │  │  │
│  │  └────────────────────────┘  └─────────────────────────┘  │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### DetailShell Tab Configurations Per Module:

| Module | Tabs |
|---|---|
| **Equipment** | Overview, Specifications, Rental History, Maintenance Log, Documents, Activity |
| **Quotation** | Overview, Line Items, Terms & Conditions, Approval History, Activity |
| **Rental Contract** | Overview, Equipment, Payment Schedule, Documents, Activity |
| **Product** | Overview, Specifications, Image Gallery, Linked Equipment, Activity |
| **Customer** | Overview, Contacts, Quotations, Contracts, Equipment, Activity |

### 5.5 FormWizard Component

For complex forms (Quotation, Rental Contract), replace single-scroll modals:

```
┌─────────────────────────────────────────────────────────────────┐
│  BREADCRUMB:  Quotations  /  New Quotation                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ STEP INDICATOR ────────────────────────────────────────┐   │
│  │  ① Customer  ─── ② Equipment  ─── ③ Terms  ─── ④ Review│   │
│  │  ● Done         ● Current        ○ Next      ○ Pending  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ STEP CONTENT ──────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  Step 2: Select Equipment                               │   │
│  │                                                          │   │
│  │  ┌─ Search ─────────────────────────────────────────┐   │   │
│  │  │  [🔍 Search equipment by name, serial, brand...  ]│   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  │  ┌─ Selected (2) ──────────────────────────────────┐   │   │
│  │  │  [Toyota 8FD25   FLT-0012   ✕ Remove]           │   │   │
│  │  │  [Komatsu FD30   FLT-0008   ✕ Remove]           │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ STEP ACTIONS ──────────────────────────────────────────┐   │
│  │                     [← Back]     [Continue →]            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Behavior:
- Steps navigable via indicator (click to jump if valid)
- Validation runs on "Continue" — blocks if errors
- Back preserves state (no data loss)
- Step 4 (Review) shows read-only summary of all steps
- Submit on final step
- Browser back warns if form has unsaved changes
```

### 5.6 StatusBadge System (Unified)

Replace per-module badge components with a single `StatusBadge`:

```
BADGE VARIANTS
─────────────────────────────────────────────────────
Dot + Label:        ● Active          (default)
Outline:            [ Active ]        (secondary)
Filled:             [■ Urgent]        (high emphasis)
Pill:               ( 12 )            (count)

STATUS → COLOR MAPPING (universal across modules)
─────────────────────────────────────────────────────
Active / Available / Approved / Won     → green
New / Draft / Open / Pending            → blue
Contacted / In-Progress / Sent          → cyan
Qualified / Reserved / Needs Attention  → amber
Proposal / Under Review / Expiring      → orange
Inactive / Lost / Rejected / Cancelled  → red
Retired / Closed / Completed            → gray
Maintenance / On Hold                   → purple
```

### 5.7 EmptyState Component

```
┌──────────────────────────────────────┐
│                                      │
│          [Illustration SVG]          │
│                                      │
│       No equipment registered        │  ← Title (--text-md, semibold)
│                                      │
│   Register your first forklift to    │  ← Description (--text-sm, muted)
│   start tracking your fleet.         │
│                                      │
│      [+ Register Equipment]          │  ← Primary CTA button
│                                      │
└──────────────────────────────────────┘

Variants:
- No data (first-time)  → Illustration + CTA
- No results (filtered) → Search icon + "Try different filters" + Clear button
- Error                 → Warning icon + "Something went wrong" + Retry button
- No permission         → Lock icon + "Contact your admin"
```

### 5.8 Toast & Notification System

```
LAYER 1: TOAST (current — enhance)
────────────────────────────────────────
Position:    Bottom-right (keep)
Duration:    4s (keep), with progress bar
Types:       Success (green), Error (red), Warning (amber), Info (blue)
Enhancement: Add action button ("Undo", "View"), add close button
Stack:       Max 3 visible, newest on top, older ones compact

LAYER 2: NOTIFICATION CENTER (new)
────────────────────────────────────────
┌─ Bell Icon [3] ──────────────────────────┐
│                                           │
│  Notifications                 [Mark all] │
│                                           │
│  TODAY                                    │
│  ├─ 📄 Quotation QT-0048 approved  2h    │
│  ├─ 📋 Contract RC-0012 expiring   5h    │
│  └─ 🚛 FLT-0015 maintenance due    6h    │
│                                           │
│  YESTERDAY                                │
│  ├─ 👥 New customer: ABC Corp      1d    │
│  └─ 📈 Lead converted to Won       1d    │
│                                           │
│  [View All Notifications]                 │
└───────────────────────────────────────────┘

Implementation: Client-side aggregation from Activity API.
No new backend endpoint required — poll /activity?limit=20 periodically.
```

### 5.9 Drawer Component (Enhanced)

For quick-view and quick-edit without full page navigation:

```
┌─── Page Content (dimmed) ───┐┌─── Drawer (420px) ──────────────┐
│                              ││                                  │
│                              ││  [✕ Close]  Equipment Detail     │
│                              ││                                  │
│    (click backdrop            ││  ┌─ Header ─────────────────┐   │
│     to close)                 ││  │  Toyota 8FD25             │   │
│                              ││  │  FLT-2024-0012  ● Active  │   │
│                              ││  └───────────────────────────┘   │
│                              ││                                  │
│                              ││  Key Details                     │
│                              ││  ├─ Brand: Toyota               │
│                              ││  ├─ Fuel: Diesel                │
│                              ││  ├─ Capacity: 2.5 Ton           │
│                              ││  ├─ Hours: 2,450                │
│                              ││  └─ Location: Bangkok           │
│                              ││                                  │
│                              ││  [Open Full Detail →]           │
│                              ││  [Edit] [Create Quotation]      │
│                              ││                                  │
└──────────────────────────────┘└──────────────────────────────────┘

Usage:
- Table row click → open drawer for quick preview
- Double-click or "Open Full" → navigate to detail page
- Form edits possible in drawer for simple entities (Customer, Lead)
- Complex entities (Quotation, Contract) → always full page
```

### 5.10 FilterBar Component (Unified)

Replaces per-page filter implementations:

```
┌─────────────────────────────────────────────────────────────────┐
│ [🔍 Search...        ]  [Status ▾]  [Brand ▾]  [Type ▾]       │
│                                                                 │
│ Active filters:  Status: Active ✕  |  Brand: Toyota ✕  |  ✕ Clear all │
└─────────────────────────────────────────────────────────────────┘

Features:
- Each filter is a dropdown with search within options
- Multi-select allowed per filter
- Active filters shown as removable pills below toolbar
- Filter state synced to URL query parameters (shareable URLs)
- "Clear all" resets to default view
- Filter configuration passed as props per module:
  - Equipment: status, brand, fuel_type, year_range
  - Quotations: status, type, customer, date_range
  - Contracts: status, type, customer, date_range
  - Products: brand, category, type, price_range
  - Customers: status, source
  - Leads: status, source, assigned_to
```

---

## 6. Responsive Strategy

### 6.1 Breakpoint System

```
TOKEN              WIDTH          LAYOUT BEHAVIOR
────────────────── ────────────── ─────────────────────────────────────
--bp-mobile        < 640px        Single column, stacked cards
--bp-mobile-lg     640–767px      Single column, 2-col grid for KPIs
--bp-tablet        768–1023px     Sidebar collapsed to rail, 2-col layouts
--bp-desktop       1024–1279px    Full sidebar, 2-col detail layouts
--bp-desktop-lg    1280–1535px    Full sidebar, 3-col KPI grids
--bp-widescreen    ≥ 1536px       Full sidebar, max-width content, 5-col KPI grids
```

### 6.2 Layout Adaptation Matrix

| Component | Mobile (<640) | Tablet (768-1023) | Desktop (≥1024) |
|---|---|---|---|
| **Sidebar** | Hidden, overlay on hamburger | Icon rail (64px), expand on hover | Full 240px, collapsible |
| **Topbar** | Hamburger + title only | Title + user avatar | Title + breadcrumb + search + user |
| **Dashboard KPIs** | 1 column | 2 columns | 3-5 columns (per section) |
| **Dashboard Charts** | Full width, stacked | 2-column grid | 2-column grid |
| **DataTable** | Card list view (not table) | Table with hidden columns | Full table |
| **Detail Header** | Stacked, full width | 2-column | 2-column with sidebar |
| **Detail Tabs** | Scrollable horizontal | Scrollable horizontal | Full tab bar |
| **Detail Content** | Single column | Single column | 2-column (main + sidebar) |
| **Forms** | Single column | 2-column grid | 2-column grid |
| **Modal** | Full screen | 560px centered | 560px centered |
| **Drawer** | Full screen | 420px right | 420px right |
| **Command Palette** | Full width, bottom sheet | 580px centered | 580px centered |
| **FilterBar** | Collapsible filter panel | Inline horizontal | Inline horizontal |

### 6.3 Mobile-Specific Patterns

#### Card List View (replaces tables on mobile)

```
┌──────────────────────────────────┐
│  Toyota 8FD25           ● Active │
│  FLT-2024-0012 · Toyota · Diesel │
│  2,450 hours · Bangkok           │
│  Jun 15, 2026                [→] │
├──────────────────────────────────┤
│  Komatsu FD30           ● Rented │
│  FLT-2024-0008 · Komatsu · LPG  │
│  1,200 hours · Chonburi          │
│  Jun 12, 2026                [→] │
├──────────────────────────────────┤
│  ...                             │
└──────────────────────────────────┘

Rules:
- Primary info (name, status) → first row, larger text
- Secondary info (serial, brand, fuel) → second row, muted
- Tertiary info (hours, location) → third row, smallest
- Tap entire card → navigate to detail
- No checkboxes on mobile (no bulk actions)
- Swipe actions not implemented (keep simple)
```

#### Bottom Sheet Pattern (mobile modals)

```
┌──────────────────────────────────┐
│           [drag handle]          │
│                                  │
│  Filter Equipment                │
│                                  │
│  Status                          │
│  [All] [● Available] [Rented]    │
│  [Maintenance] [Retired]         │
│                                  │
│  Brand                           │
│  [All ▾]                         │
│                                  │
│  Fuel Type                       │
│  [All ▾]                         │
│                                  │
│  [Apply Filters]  [Reset]        │
│                                  │
└──────────────────────────────────┘

Behavior:
- Slides up from bottom
- Drag handle to dismiss
- Max height: 80vh
- Backdrop click to close
```

### 6.4 Touch Target Guidelines

```
Minimum touch target:   44px × 44px (WCAG 2.5.8)
Button heights:         40px minimum on mobile (44px preferred)
Table row height:       48px minimum on mobile
Icon buttons:           44px × 44px tap area (visual size can be 32px)
Spacing between targets: 8px minimum
```

### 6.5 Performance Budgets

```
Metric                Target          Current (estimated)
──────────────────── ──────────────── ────────────────────
Bundle (gzipped)     < 150 KB         ~120 KB (no splitting)
FCP                  < 1.5s           ~2s (no lazy loading)
LCP                  < 2.5s           ~3s
TTI                  < 3.5s           ~4s
CLS                  < 0.1            ~0.05

Optimizations:
- Route-based code splitting with React.lazy + Suspense
- Image lazy loading for product/equipment galleries
- Virtual scrolling for tables > 100 rows
- Preload critical routes (Dashboard, current module)
```

---

## 7. Migration Plan

### 7.1 Migration Principles

1. **Incremental** — each phase ships independently and is usable
2. **No API changes** — frontend-only; all data from existing endpoints
3. **No data loss** — existing features preserved at every stage
4. **Side-by-side** — new components coexist with old during transition
5. **Feature-flag ready** — CSS class toggles between old/new styles if needed

### 7.2 Phase Overview

```
PHASE 0: Foundation          (Week 1-2)      No visible change
PHASE 1: Shell & Navigation  (Week 3-4)      User sees new nav
PHASE 2: Design System       (Week 5-6)      Visual refresh
PHASE 3: Dashboard           (Week 7-8)      New dashboard
PHASE 4: List Pages          (Week 9-11)     New tables
PHASE 5: Detail Pages        (Week 12-14)    New detail views
PHASE 6: Power Features      (Week 15-17)    Cmd+K, bulk, export
PHASE 7: Polish & Mobile     (Week 18-20)    Responsive + a11y
```

### 7.3 Phase Details

---

#### PHASE 0: Foundation (Week 1–2)

**Goal:** Establish infrastructure without changing any visible UI.

| Task | Files | Details |
|---|---|---|
| Install Inter font | `index.html`, `index.css` | Google Fonts or self-hosted |
| Create design token CSS file | `src/styles/tokens.css` | All CSS variables from Section 2 |
| Set up route-based code splitting | `App.tsx` | `React.lazy()` + `<Suspense>` for every page route |
| Create `PageShell` wrapper | `src/components/layout/PageShell.tsx` | Wrapper that provides consistent padding, max-width, breadcrumb slot |
| Create `DetailShell` wrapper | `src/components/layout/DetailShell.tsx` | Header + tabs + content layout (empty, wired later) |
| Create `TabBar` component | `src/components/ui/TabBar.tsx` | Horizontal tabs, URL-hash based state |
| Create `Breadcrumb` component | `src/components/ui/Breadcrumb.tsx` | Route-aware breadcrumb renderer |
| Create `StatusBadge` component | `src/components/ui/StatusBadge.tsx` | Unified badge with status→color mapping |

**Deliverable:** All new components exist, are unit-testable, but not wired into the app.

---

#### PHASE 1: Shell & Navigation (Week 3–4)

**Goal:** Replace the app shell — sidebar, topbar, layout.

| Task | Details |
|---|---|
| Enhance `Sidebar.tsx` | Collapsible groups, icon-rail mode, collapse toggle, localStorage state persistence |
| Enhance `Topbar.tsx` | Add breadcrumb slot, notification bell placeholder, search trigger button |
| Update `AppLayout.tsx` | Support 3 sidebar states (full / rail / hidden), tablet breakpoint for auto-rail |
| Add sidebar badge counts | Fetch entity counts from existing list APIs (small page_size=0 or 1 calls) |
| Add Quick Create dropdown | New dropdown component in sidebar |
| Wire `Breadcrumb` to routes | Populate breadcrumb data from route config |
| Mobile sidebar: add swipe-to-open | Touch event on left edge of screen |

**Deliverable:** New navigation is live. All routes still render existing page content.

**Rollback:** Revert `Sidebar.tsx`, `Topbar.tsx`, `AppLayout.tsx` to previous versions.

---

#### PHASE 2: Design System Rollout (Week 5–6)

**Goal:** Apply new design tokens globally. Visual refresh without functional change.

| Task | Details |
|---|---|
| Swap `index.css` variables | Replace current tokens with new token file import |
| Update font to Inter | Apply `font-family: 'Inter', ...` |
| Update `shared.css` | Align table, form, toolbar styles to new tokens |
| Update `Button` styles | Apply new size/variant system from Section 5.2 |
| Replace module-specific badges | Swap `ForkliftStatusBadge`, `QuotationStatusBadge`, `RentalStatusBadge` → `StatusBadge` |
| Enhance `Toast` component | Add progress bar, action buttons, close button |
| Enhance `Modal` component | Add size variants (sm/md/lg), focus trapping |
| Enhance `Drawer` component | Add proper animation, keyboard close, responsive full-screen on mobile |
| Create `EmptyState` component | Build illustrated empty state with CTA |

**Deliverable:** Entire app has refreshed visual language. Same features, better appearance.

---

#### PHASE 3: Dashboard Transformation (Week 7–8)

**Goal:** Transform dashboard from stat-cards-only to an operational command center.

| Task | Details |
|---|---|
| Create `DashboardCard` wrapper | Consistent widget container with header, body, footer |
| Create `HeroMetricBar` | 4 top-level KPIs — full-width row at page top |
| Create `EquipmentStatusDonut` | Donut chart widget using Recharts |
| Create `LeadFunnel` widget | Pipeline visualization from existing lead counts |
| Create `ConversionTrendLine` | 30-day line chart from existing summary data |
| Create `RecentQuotations` mini-table | Latest 5 quotations, clickable rows |
| Create `ExpiringContracts` list | Contracts expiring soon, urgency-colored |
| Enhance `CatalogDashboardWidget` | Add chart, wrap in `DashboardCard` |
| Add time range selector | Segmented control: Today / 7d / 30d / 90d |
| Responsive dashboard grid | 1-col mobile → 2-col tablet → mixed desktop |

**Deliverable:** Full operational dashboard. All data from existing APIs (no backend changes).

---

#### PHASE 4: List Pages (Week 9–11)

**Goal:** Replace all list/table pages with unified `DataTable` component.

| Task | Details |
|---|---|
| Build `DataTable` component | Configurable columns, sort, filter, paginate, select, skeleton, empty |
| Build `FilterBar` component | Dropdowns, active filter pills, URL sync |
| Build `ColumnToggle` popover | Show/hide columns |
| Migrate `CustomersPage` | First migration — test all DataTable features |
| Migrate `LeadsPage` | Second migration — validate filter patterns |
| Migrate `EquipmentRegistryPage` | Grid/list toggle preserved |
| Migrate `CatalogPage` | Grid/list toggle preserved, product cards in grid mode |
| Migrate `QuotationListPage` | Status filters, type filters |
| Migrate `RentalContractListPage` | Status filters, date range filters |
| Migrate `ActivityPage` | Timeline-style variant of DataTable |
| Mobile card-list variant | `DataTable` renders card list below 640px |

**Deliverable:** All 7 list pages use unified DataTable. Filters sync to URL.

**Migration per page (repeat for each):**
1. Create column config array for the entity
2. Create filter config array
3. Replace page body with `<DataTable columns={...} filters={...} />`
4. Remove old inline table JSX
5. Delete module-specific table CSS
6. Test: search, sort, filter, paginate, empty state, skeleton
7. Test: mobile card view

---

#### PHASE 5: Detail Pages (Week 12–14)

**Goal:** Wrap all detail pages in `DetailShell` with tabs and cross-links.

| Task | Details |
|---|---|
| Migrate `ForkliftDetailPage` | DetailShell + tabs: Overview, Specs, Rental History, Activity |
| Migrate `ProductDetailPage` | DetailShell + tabs: Overview, Specs, Gallery, Linked Equipment |
| Migrate `QuotationDetailPage` | DetailShell + tabs: Overview, Line Items, Approval, Activity |
| Migrate `RentalContractDetailPage` | DetailShell + tabs: Overview, Equipment, Payments, Activity |
| Build Activity tab content | Re-use ActivityPage filtered to entity |
| Build Related Records sidebar | Cross-module links (equipment → contracts → quotations) |
| Drawer quick-view | DataTable row click opens drawer preview |

**Deliverable:** All detail pages have consistent tabbed layout, cross-module links, activity feeds.

---

#### PHASE 6: Power Features (Week 15–17)

**Goal:** Add features that differentiate an enterprise platform.

| Task | Details |
|---|---|
| Build `CommandPalette` | Cmd+K global search across entities, quick actions, navigation |
| Build bulk select + actions | DataTable checkbox → bulk status change, delete, export |
| Build CSV/Excel export | Export current filtered view from any DataTable |
| Build notification center | Bell icon in topbar → dropdown list from Activity API |
| Build FormWizard component | Multi-step form for Quotation and Rental Contract creation |
| Migrate QuotationFormPage | Replace single-page form with FormWizard (4 steps) |
| Migrate RentalContractFormPage | Replace single-page form with FormWizard (4 steps) |
| Keyboard shortcuts | Cmd+K, Cmd+1-5 for navigation, Esc to close overlays |
| URL-synced filter state | Deep-linkable filtered views |

**Deliverable:** Command palette live, bulk actions working, forms improved.

---

#### PHASE 7: Polish & Mobile (Week 18–20)

**Goal:** Complete responsive optimization, accessibility, and quality pass.

| Task | Details |
|---|---|
| Mobile filter bottom sheet | Replace filter dropdowns with slide-up sheet on mobile |
| Touch optimizations | 44px touch targets, swipe gestures for sidebar |
| Keyboard navigation audit | Focus management, tab order, aria labels on all interactive elements |
| Screen reader audit | Announce page changes, table column headers, form errors |
| Focus trapping | Modals, drawers, command palette trap focus correctly |
| Loading state audit | Every page has skeleton → content transition |
| Error boundary pages | Graceful crash pages with retry |
| Image lazy loading | Product and equipment image galleries |
| Performance audit | Lighthouse score > 90, bundle analysis, remove dead code |
| Dark mode CSS variables | Wire `[data-theme="dark"]` token overrides (optional stretch) |

**Deliverable:** Production-ready enterprise platform.

---

### 7.4 File Change Impact Summary

```
MODIFIED FILES (existing)
────────────────────────────────────────
src/index.css                 → Token system overhaul
src/styles/shared.css         → Align to new tokens
src/App.tsx                   → Lazy routes, Suspense
src/components/layout/AppLayout.tsx  → 3-state sidebar support
src/components/layout/Sidebar.tsx    → Collapsible groups, rail, badges
src/components/layout/Sidebar.css    → New sidebar styles
src/components/layout/Topbar.tsx     → Breadcrumb, search, bell
src/components/layout/Topbar.css     → New topbar styles
src/components/ui/Modal.tsx          → Size variants, focus trap
src/components/ui/Modal.css          → Enhanced modal styles
src/components/ui/Toast.tsx          → Progress bar, actions
src/components/ui/Drawer.tsx         → Animation, responsive
src/components/ui/StatCard.tsx       → Trend comparison display
src/pages/Dashboard/*                → Full rebuild
src/pages/Customers/*                → DataTable migration
src/pages/Leads/*                    → DataTable migration
src/pages/Equipment/*                → DataTable + DetailShell
src/pages/Catalog/*                  → DataTable + DetailShell
src/pages/Quotations/*               → DataTable + DetailShell + FormWizard
src/pages/Rental/*                   → DataTable + DetailShell + FormWizard

NEW FILES
────────────────────────────────────────
src/styles/tokens.css                → Design token definitions
src/components/layout/PageShell.tsx  → Page wrapper with breadcrumb
src/components/layout/DetailShell.tsx → Detail page template
src/components/ui/TabBar.tsx         → Tab navigation
src/components/ui/Breadcrumb.tsx     → Route breadcrumbs
src/components/ui/StatusBadge.tsx    → Unified status badge
src/components/ui/EmptyState.tsx     → Illustrated empty states
src/components/ui/FilterBar.tsx      → Unified filter toolbar
src/components/ui/ColumnToggle.tsx   → Column visibility popover
src/components/ui/CommandPalette.tsx  → Cmd+K global search
src/components/ui/NotificationCenter.tsx → Bell dropdown
src/components/ui/FormWizard.tsx     → Multi-step form wrapper
src/components/ui/BottomSheet.tsx    → Mobile filter sheet
src/components/ui/DataTable.tsx      → Unified data table
src/components/ui/CardList.tsx       → Mobile card list view
src/components/dashboard/DashboardCard.tsx
src/components/dashboard/HeroMetricBar.tsx
src/components/dashboard/EquipmentStatusDonut.tsx
src/components/dashboard/LeadFunnel.tsx
src/components/dashboard/ConversionTrendLine.tsx
src/components/dashboard/RecentQuotations.tsx
src/components/dashboard/ExpiringContracts.tsx

DELETABLE AFTER MIGRATION
────────────────────────────────────────
src/components/equipment/ForkliftStatusBadge.tsx  → replaced by StatusBadge
src/components/quotation/QuotationStatusBadge.tsx → replaced by StatusBadge
src/components/rental/RentalStatusBadge.tsx       → replaced by StatusBadge
```

### 7.5 Risk Mitigation

| Risk | Mitigation |
|---|---|
| **Breaking existing features** | Each phase is a PR. Run full regression before merge. Keep old components until new ones are verified. |
| **Performance regression** | Bundle analysis at each phase. Code splitting in Phase 0 improves baseline. |
| **Scope creep** | Each phase has a clear deliverable. No phase depends on "extra" features. |
| **Mobile regressions** | Test matrix: Chrome mobile, Safari iOS, Chrome Android at each phase. |
| **Design inconsistency during migration** | Phases 0-2 establish the system. Phases 3+ consume it. No page uses "half old, half new." |

### 7.6 Success Metrics

| Metric | Current | Target |
|---|---|---|
| Lighthouse Performance | ~65 | > 90 |
| Lighthouse Accessibility | ~70 | > 95 |
| Time to find a record (user test) | ~15s | < 5s (via Cmd+K) |
| Time to create a quotation | ~4 min | < 2 min (wizard) |
| Mobile usability score | ~60 | > 90 |
| Component reuse ratio | ~30% | > 80% |
| CSS file count | ~25 files | ~15 files (consolidated) |

---

## Appendix A: Competitive Reference Points

| Feature | Fleetio | Samsara | HubSpot | Linear | JenStore TH | DK Target |
|---|---|---|---|---|---|---|
| Global search | Yes | Yes | Yes (Cmd+K) | Yes (Cmd+K) | Basic | Yes (Cmd+K) |
| Collapsible sidebar | Icon rail | Icon rail | Toggleable | Toggleable | Fixed | Collapsible + rail |
| Dashboard widgets | Configurable | Fixed | Configurable | Minimal | Fixed | Fixed (Phase 1), Configurable (v2) |
| Data tables | Virtual, sortable | Basic | Advanced, views | Minimal | Basic | Advanced, views |
| Detail page tabs | Yes | Yes | Yes | Side panel | Basic | Yes |
| Multi-step forms | Yes | Yes | Yes | Inline | Basic | Yes |
| Bulk actions | Yes | Yes | Yes | Yes | No | Yes |
| Mobile responsive | Good | Good | Good | Web-only | Basic | Good |
| Dark mode | No | Yes | No | Yes | No | Phase 7 stretch |
| Notifications | Yes | Yes | Yes | Yes | Basic | Yes |

---

## Appendix B: Keyboard Shortcut Map

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + \` | Toggle sidebar |
| `Cmd/Ctrl + Shift + C` | Quick create: Customer |
| `Cmd/Ctrl + Shift + Q` | Quick create: Quotation |
| `Cmd/Ctrl + Shift + R` | Quick create: Rental Contract |
| `Cmd/Ctrl + Shift + E` | Quick create: Equipment |
| `Esc` | Close modal / drawer / palette |
| `↑ / ↓` | Navigate table rows / search results |
| `Enter` | Open selected row / result |
| `Cmd/Ctrl + 1-5` | Navigate to module (Dashboard, Customers, Leads, Equipment, Quotations) |

---

*End of specification. This document is implementation-ready. Each section maps to specific files in the existing codebase. No backend, API, or database modifications are required.*
