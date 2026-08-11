# Equipment Registry Redesign — Page Architecture & Component Structure

**Inspiration:** Fleetio fleet management + Samsara asset views  
**Constraint:** Existing APIs only (`/forklifts`, `/rental-contracts`, `/quotations`). Zero backend changes.  
**Date:** 2026-06-21

---

## 0. Current State vs Target

### What Exists Today

| Area | Current Implementation | File |
|---|---|---|
| **List page** | Grid/list toggle, search, 3 filters, pagination, skeleton/empty states | `EquipmentRegistryPage.tsx` (350 lines) |
| **Grid card** | Photo + brand + name + serial + fuel/capacity/year chips + hours | `ForkliftCard.tsx` + `ForkliftCard.css` |
| **List view** | HTML table with 8 columns, row click navigates | Inline in `EquipmentRegistryPage.tsx` |
| **Detail page** | Back button, 2-col layout (photo + info), status history table, documents table | `ForkliftDetailPage.tsx` (366 lines) |
| **Form** | Modal form, 7 row pairs, status/condition/fuel selects, notes, active toggle | `ForkliftForm.tsx` (335 lines) |
| **Badges** | `ForkliftStatusBadge` + `ForkliftConditionBadge` using generic `Badge` | `ForkliftStatusBadge.tsx` |
| **CSS** | Borrows `CatalogPage.css` + `ProductDetailPage.css` + `shared.css` | No dedicated equipment page CSS |

### Available Data Fields (from existing API — no changes needed)

**List item (`Forklift`):**
```
id, serial_number, slug, internal_code, name_en, name_lo, model_number,
model {id, name, slug, series, fuel_type, capacity_kg},
brand {id, name, slug, logo_url},
customer {id, first_name, last_name, company},
status, condition, fuel_type, capacity_kg, year_manufactured,
current_hour_meter, is_active, primary_photo_url,
created_at, updated_at
```

**Detail item (`ForkliftDetail` extends `Forklift`):**
```
+ mast_type, max_lift_height_mm, purchase_date, warranty_expiry,
  initial_hour_meter, notes,
  photos[] {id, image_url, thumbnail_url, alt_text, caption, is_primary, sort_order, taken_at},
  documents[] {id, document_type, title, file_url, file_size_bytes, mime_type, expiry_date},
  recent_status_history[] {id, from_status, to_status, reason, user, changed_at},
  current_location {id, location_name, warehouse_zone, address, customer_id, effective_date, notes},
  created_by, updated_by
```

**Cross-module data (for cost widget, existing APIs):**
- Rental contracts: `GET /rental-contracts/?forklift_id=X` — not in params yet but contract items have `forklift` field
- Quotation items: `quotation.items[].forklift.id` matches forklift

**Cost data derivation (client-side computation from rental contracts list):**
- Filter rental contracts where any `item.forklift.id === currentForklift.id`
- Sum `item.line_total` for revenue
- Use `billing_summary.total_billed / total_paid / total_outstanding` from contract detail
- Since we can't filter by forklift_id on the rental API, we'll use the contract items visible in ForkliftDetail's linked data (rendered in a new tab — see Section 3)

---

## 1. Page Architecture

### 1.1 Equipment Registry — List Page (Redesign)

**Route:** `/equipment` (unchanged)  
**File:** `src/pages/Equipment/EquipmentRegistryPage.tsx` (rewrite)  
**CSS:** `src/pages/Equipment/EquipmentRegistryPage.css` (new — stop borrowing CatalogPage.css)

#### Page Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PAGE HEADER                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Equipment Registry                                                  │ │
│ │ Manage and monitor your forklift fleet              [↻] [+ Register]│ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ FLEET SUMMARY STRIP                                                     │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────┐│
│ │ Total: 47  │ │ In Stock:24│ │ Rented: 15 │ │ Service: 5 │ │Decomm:3││
│ │ All ●      │ │ ● green    │ │ ● purple   │ │ ● amber    │ │● gray  ││
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────┘│
│  ↑ clickable — each chip filters the list by that status               │
│                                                                         │
│ TOOLBAR                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [🔍 Search serial, name, model...]                                  │ │
│ │ [Brand ▾]  [Fuel ▾]  [Condition ▾]  [✕ Clear]  47 results [▦] [≡] │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ CONTENT — Grid View (default for equipment)                             │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐         │
│ │  FLEET CARD       │ │  FLEET CARD       │ │  FLEET CARD       │        │
│ │  (see spec below) │ │                   │ │                   │        │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘         │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐         │
│ │                   │ │                   │ │                   │        │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘         │
│                                                                         │
│ CONTENT — List View (table)                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [ ] FORKLIFT      SERIAL    STATUS   COND.  BRAND   HOURS    FUEL  │ │
│ │ ──────────────────────────────────────────────────────────────────  │ │
│ │ [img] Toyota 8FD  JH-001   ● Stock  New    Toyota  2,450   Diesel │ │
│ │ [img] Komatsu FD  KM-003   ● Rented Used   Komatsu 1,200   LPG   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ PAGINATION                                                              │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Showing 1-20 of 47          [◀] 1  2  3 [▶]     [20▾] per page    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Fleet Summary Strip — New Component

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  [ALL]      [In Stock]   [Rented]   [In Service]  [Reserved]      │
│   47         24            15          5             2              │
│   ●          ● green      ● purple   ● amber       ● cyan         │
│                                                                    │
│  [Sold]     [Decommissioned]                                       │
│   1           2                                                    │
│  ● blue     ● gray                                                │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Behavior:
- Counts computed client-side from the full list total per status
  (or computed from the unfiltered first load)
- Clicking a chip sets the status filter (replaces the status dropdown)
- Active chip has solid background, others are outline
- "All" chip clears the status filter
- Data source: current useForklifts response + a secondary unfiltered
  call at page_size=1 to get total, then per-status counts from the
  first unfiltered load (cache the breakdown)

Alternative (simpler): Remove status dropdown from toolbar, replace
with this strip. On first load, call getForklifts 7 times with each
status at page_size=0 to get counts. This is wasteful — better to
just derive counts from the full list if total is small, or accept
that counts show only within the current filtered set.

Recommended approach: On mount, fetch once with no status filter.
Cache the full item list's status distribution. Use that for the strip.
When a status chip is clicked, apply the filter param. The strip counts
remain from the initial full load (don't re-derive).
```

---

### 1.2 Fleet Card — Redesigned Component

**File:** `src/components/equipment/FleetCard.tsx` + `FleetCard.css` (replaces `ForkliftCard`)

```
┌──────────────────────────────────────────┐
│ ┌──────────────────────────────────────┐ │
│ │                                      │ │
│ │         FORKLIFT PHOTO               │ │  ← 4:3 aspect, object-fit: cover
│ │         (or placeholder SVG)         │ │
│ │                                      │ │
│ │  ┌──────────┐                        │ │  ← Status badge overlay (top-left)
│ │  │● In Stock│                        │ │
│ │  └──────────┘                        │ │
│ │                           ┌────────┐ │ │  ← Condition badge (top-right)
│ │                           │  Used  │ │ │
│ │                           └────────┘ │ │
│ └──────────────────────────────────────┘ │
│                                          │
│  TOYOTA                                  │  ← Brand (uppercase, primary color, 11px)
│  Jungheinrich EFG 216k                   │  ← Name (14px, semibold)
│  JH-2024-001                             │  ← Serial (mono, muted, 12px)
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ ⏱ 2,450 hrs  │ ⛽ Diesel │ 🏗 1.6T │  │  ← Meta chips row
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ HOUR METER PROGRESS BAR           │  │  ← Visual utilization indicator
│  │ ████████████░░░░░░░░ 2,450 / 5,000│  │     (NEW — Fleetio-style)
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 📍 Bangkok Warehouse · Zone A      │  │  ← Location line (if available)
│  └────────────────────────────────────┘  │
│                                          │
│  ┌──────────┐ ┌──────────┐             │
│  │  View    │ │  Edit    │  ← Quick actions (hover-visible) │
│  └──────────┘ └──────────┘             │
│                                          │
└──────────────────────────────────────────┘
```

**Data mapping (all from existing `Forklift` type — no API changes):**

| Card Element | Data Source | Fallback |
|---|---|---|
| Photo | `primary_photo_url` | SVG forklift placeholder |
| Status badge | `status` → `ForkliftStatusBadge` | — |
| Condition badge | `condition` → `ForkliftConditionBadge` | — |
| Brand | `brand.name` | Hidden if null |
| Name | `name_en` | — |
| Serial | `serial_number` | — |
| Hours | `current_hour_meter` | "0 hrs" |
| Fuel | `fuel_type` | Hidden if null |
| Capacity | `capacity_kg` | Hidden if null |
| Hour meter bar | `current_hour_meter` / 5000 (configurable ceiling) | Full bar = exceeded |
| Location | Not on list item — omit from card | — |

**Note:** The list API's `Forklift` type does NOT include `current_location`. The location line on the card is omitted. It only appears on the detail page where `ForkliftDetail` includes it. This keeps the card lean and avoids N+1 API calls.

**Hour meter progress bar logic:**
- Threshold configurable (default: 5,000 hours for service reminder)
- `< 60%` → green bar
- `60%–85%` → amber bar  
- `> 85%` → red bar
- Display: `{current} / {threshold} hrs`
- This is a visual heuristic for fleet managers (Fleetio shows this as "Next Service Due")

---

### 1.3 List View — Enhanced Table Row

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [ ] │ [IMG]  FORKLIFT          │ SERIAL      │ STATUS    │ CONDITION │ ... │
│─────│────────────────────────  │─────────────│───────────│───────────│─────│
│ [ ] │ [📷]   Toyota 8FD25     │ JH-2024-001 │ ● In Stock│ New       │ ... │
│     │        Model: EFG 216k  │             │           │           │     │
│─────│────────────────────────  │─────────────│───────────│───────────│─────│
│ [ ] │ [📷]   Komatsu FD30     │ KM-2024-003 │ ● Rented  │ Used      │ ... │
│     │        Customer: ABC Co │             │           │           │     │
└─────────────────────────────────────────────────────────────────────────────┘

 ... continued columns:  BRAND │ HOURS │ FUEL │ YEAR │ UPDATED │ [⋯]
```

**Enhancements over current:**

| Enhancement | Details |
|---|---|
| Thumbnail in forklift column | 36x36 rounded image from `primary_photo_url` |
| Two-line forklift cell | Line 1: `name_en` bold. Line 2: `model_number` or `customer.company` (muted) |
| Row hover preview | Entire row clickable, subtle bg change |
| Action menu | `⋯` button → dropdown: View, Edit, Change Status, Delete |
| Sortable columns | Click header for `name_en`, `serial_number`, `status`, `current_hour_meter`, `created_at` (uses existing `sort`/`order` params) |

---

### 1.4 Equipment Detail Page (Redesign)

**Route:** `/equipment/:id` (unchanged)  
**File:** `src/pages/Equipment/ForkliftDetailPage.tsx` (rewrite)  
**CSS:** `src/pages/Equipment/ForkliftDetailPage.css` (new — stop borrowing ProductDetailPage.css)

#### Full Page Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ BREADCRUMB: Equipment Registry / JH-2024-001                           │
│                                                                         │
│ ┌─── DETAIL HEADER ──────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │  [📷 48px]   Toyota 8FD25 Forklift                                 │ │
│ │              S/N: JH-2024-001 · Toyota · 2022                      │ │
│ │              ● In Stock   ○ New   ✓ Active                         │ │
│ │                                                                     │ │
│ │  QUICK ACTIONS:                                                     │ │
│ │  [Edit] [Change Status ▾] [Create Quotation] [Log Hours] [⋯ More] │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─── TAB BAR ────────────────────────────────────────────────────────┐ │
│ │ [Overview●] [Photos] [Status History] [Documents] [Contracts]      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─── TAB CONTENT ────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │  ┌─── LEFT COLUMN (60%) ────────┐  ┌─── RIGHT COLUMN (40%) ────┐  │ │
│ │  │                               │  │                            │  │ │
│ │  │  SPECIFICATIONS CARD          │  │  HOUR METER WIDGET         │  │ │
│ │  │  LOCATION CARD                │  │  COST SUMMARY WIDGET       │  │ │
│ │  │  NOTES SECTION                │  │  QUICK FACTS CARD          │  │ │
│ │  │                               │  │  CUSTOMER LINK CARD        │  │ │
│ │  └───────────────────────────────┘  └────────────────────────────┘  │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Structure

### 2.1 Complete Component Tree

```
EquipmentRegistryPage (list)
├── FleetSummaryStrip                 NEW
├── Toolbar (existing pattern, enhanced)
│   ├── SearchInput (existing shared)
│   ├── FilterSelect × 3 (brand, fuel, condition)
│   ├── ClearButton (existing shared)
│   └── ViewToggle (existing, keep)
├── FleetCard                          NEW (replaces ForkliftCard)
│   ├── FleetCardImage
│   ├── ForkliftStatusBadge (existing, keep)
│   ├── ForkliftConditionBadge (existing, keep)
│   ├── FleetCardMeta
│   └── HourMeterBar                  NEW (inline micro-component)
├── FleetTableRow                      NEW (enhanced table row)
│   ├── RowThumbnail
│   ├── ForkliftStatusBadge (reuse)
│   ├── ForkliftConditionBadge (reuse)
│   └── RowActionMenu                 NEW
├── ForkliftForm (existing, unchanged)
├── ConfirmDialog (existing, unchanged)
└── Pagination (existing shared pattern)

ForkliftDetailPage (detail)
├── DetailHeader                       NEW
│   ├── DetailHeaderAvatar
│   ├── ForkliftStatusBadge (reuse)
│   ├── ForkliftConditionBadge (reuse)
│   └── QuickActionBar                 NEW
├── DetailTabBar                       NEW
├── OverviewTab                        NEW
│   ├── SpecificationsCard             NEW
│   ├── LocationCard                   NEW
│   ├── NotesSection (simple)
│   ├── HourMeterWidget               NEW
│   ├── CostSummaryWidget             NEW
│   ├── QuickFactsCard                NEW
│   └── CustomerLinkCard              NEW
├── PhotosTab                          NEW
│   └── PhotoGallery                   NEW (dedicated, not borrowed)
├── StatusHistoryTab                   NEW
│   └── StatusTimeline                 NEW
├── DocumentsTab                       NEW
│   └── DocumentTable (existing pattern)
└── ContractsTab                       NEW
    └── LinkedContractsList            NEW
```

### 2.2 Component Dependency Map

```
LAYER 0 — Existing, unchanged
────────────────────────────────────
  ForkliftStatusBadge               ← reused in FleetCard, FleetTableRow, DetailHeader, StatusTimeline
  ForkliftConditionBadge            ← reused in FleetCard, FleetTableRow, DetailHeader
  Badge (ui/Badge.tsx)              ← consumed by above badges
  Modal, ConfirmDialog              ← consumed by ForkliftForm
  ForkliftForm                      ← consumed by EquipmentRegistryPage

LAYER 1 — New leaf components (no custom component deps)
────────────────────────────────────
  HourMeterBar                      depends on: nothing (pure CSS + props)
  HourMeterWidget                   depends on: nothing (Recharts for optional gauge)
  CostSummaryWidget                 depends on: nothing (pure display)
  QuickFactsCard                    depends on: nothing (pure display)
  CustomerLinkCard                  depends on: react-router-dom Link
  LocationCard                      depends on: lucide-react MapPin
  SpecificationsCard                depends on: lucide-react icons
  NotesSection                      depends on: nothing
  StatusTimeline                    depends on: ForkliftStatusBadge
  PhotoGallery                      depends on: lucide-react
  LinkedContractsList               depends on: react-router-dom Link, RentalStatusBadge (existing)
  FleetSummaryStrip                 depends on: nothing (data passed as props)
  RowActionMenu                     depends on: lucide-react
  DetailHeaderAvatar                depends on: nothing

LAYER 2 — Composite components
────────────────────────────────────
  FleetCard                         depends on: ForkliftStatusBadge, ForkliftConditionBadge, HourMeterBar
  FleetTableRow                     depends on: ForkliftStatusBadge, ForkliftConditionBadge, RowActionMenu
  QuickActionBar                    depends on: lucide-react, react-router-dom
  DetailHeader                      depends on: DetailHeaderAvatar, ForkliftStatusBadge,
                                                ForkliftConditionBadge, QuickActionBar
  DetailTabBar                      depends on: nothing (URL hash driven)

LAYER 3 — Tab containers
────────────────────────────────────
  OverviewTab                       depends on: SpecificationsCard, LocationCard, NotesSection,
                                                HourMeterWidget, CostSummaryWidget, QuickFactsCard,
                                                CustomerLinkCard
  PhotosTab                         depends on: PhotoGallery
  StatusHistoryTab                  depends on: StatusTimeline
  DocumentsTab                      depends on: existing table pattern
  ContractsTab                      depends on: LinkedContractsList

LAYER 4 — Page containers
────────────────────────────────────
  EquipmentRegistryPage             depends on: FleetSummaryStrip, FleetCard, FleetTableRow,
                                                ForkliftForm, ConfirmDialog
  ForkliftDetailPage                depends on: DetailHeader, DetailTabBar, OverviewTab,
                                                PhotosTab, StatusHistoryTab, DocumentsTab, ContractsTab
```

---

## 3. New Component Specifications

### 3.1 FleetSummaryStrip

**File:** `src/components/equipment/FleetSummaryStrip.tsx` + `.css`

**Props:**
```typescript
interface FleetSummaryStripProps {
  counts: Record<ForkliftStatus | 'all', number>
  activeStatus: ForkliftStatus | null     // null = "all"
  onStatusClick: (status: ForkliftStatus | null) => void
}
```

**Visual:**
```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│  All │ │Stock │ │Rented│ │ Svc  │ │Reserv│ │ Sold │ │Decom.│
│  47  │ │  24  │ │  15  │ │   5  │ │   2  │ │   1  │ │   2  │
│──────│ │ ●    │ │ ●    │ │ ●    │ │ ●    │ │ ●    │ │ ●    │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
              ↑ active chip: filled bg + ring

CSS:
  Container: horizontal scroll on mobile, flex-wrap on desktop
  Chip: min-width 80px, padding 12px 16px, border-radius 10px
  Active: filled with status color at 12% opacity, ring in status color
  Inactive: var(--color-surface), border var(--color-border)
  Count: 20px, font-weight 700
  Label: 11px, uppercase, muted
  Dot: 6px circle in status color
```

**Data source:** Computed on mount from first unfiltered `useForklifts()` call. The page calls `useForklifts` twice: once unfiltered (page_size=1 just for total, or cache from first load), once with active filters for display. Simpler: compute from the forklifts array if total < 500, or derive from a single full-count load.

**Acceptance criteria:**
- Clicking a chip filters the list below
- Active chip visually distinct
- Counts update on data refresh
- Horizontally scrollable on mobile (< 640px)

---

### 3.2 FleetCard (replaces ForkliftCard)

**File:** `src/components/equipment/FleetCard.tsx` + `FleetCard.css`

**Props:**
```typescript
interface FleetCardProps {
  forklift: Forklift
  onClick: () => void
  onEdit: () => void
  onQuickAction?: (action: string) => void
  hourMeterThreshold?: number    // default 5000
}
```

**Structure:**
```
┌──────────────────────────┐
│ [PHOTO 4:3]              │   ← img with fallback placeholder
│   ┌────────┐   ┌──────┐ │
│   │●Status │   │Cond. │ │   ← overlaid badges
│   └────────┘   └──────┘ │
├──────────────────────────┤
│ BRAND (if exists)        │   ← 11px uppercase primary
│ Name                     │   ← 14px semibold
│ Serial · Model           │   ← 12px mono muted
│                          │
│ ⛽ Diesel  🏗 1,600kg     │   ← meta chips
│ 📅 2022                  │
│                          │
│ ┌──────────────────────┐ │
│ │ ████████░░░░  2,450  │ │   ← HourMeterBar
│ │ of 5,000 hrs         │ │
│ └──────────────────────┘ │
│                          │
│ [View]  [Edit]           │   ← hover-visible actions
└──────────────────────────┘
```

**Differences from current ForkliftCard:**

| Aspect | Current | New |
|---|---|---|
| Hour meter | Text only ("2,450 hrs") | Visual progress bar with color coding |
| Meta layout | Inline chips | Wrapped grid with icons |
| Photo fallback | Data URI SVG | Dedicated component with brand-colored bg |
| Actions | Single "Edit" button | "View" + "Edit" buttons |
| Card hover | translateY(-2px) shadow | Subtle border-color change + shadow (Fleetio-style) |
| Font sizes | 11-13.5px | 11-14px (slightly larger name) |
| Card width | minmax(220px, 1fr) | minmax(260px, 1fr) — wider for more info |

---

### 3.3 HourMeterBar (micro-component)

**File:** Inline in `FleetCard.tsx` OR `src/components/equipment/HourMeterBar.tsx` (if reused in widget)

**Props:**
```typescript
interface HourMeterBarProps {
  current: number
  threshold?: number    // default 5000
  size?: 'sm' | 'md'   // sm for card, md for widget
}
```

**Visual:**
```
sm (card):
  ┌────────────────────────┐
  │ ████████████░░░░░  49% │   height: 6px, border-radius: 3px
  │ 2,450 / 5,000 hrs     │   text below: 11px muted
  └────────────────────────┘

md (widget):
  ┌────────────────────────────────┐
  │ ██████████████████░░░░░░  73%  │   height: 10px, border-radius: 5px
  │ 3,650 / 5,000 hrs             │   text below: 13px
  └────────────────────────────────┘
```

**Color logic:**
```
percentage = current / threshold
if percentage < 0.6  → var(--color-success)     green
if percentage < 0.85 → var(--color-warning)     amber
else                 → var(--color-danger)      red

Background track: var(--color-bg-subtle)
```

---

### 3.4 HourMeterWidget (detail page sidebar)

**File:** `src/components/equipment/HourMeterWidget.tsx` + `.css`

**Props:**
```typescript
interface HourMeterWidgetProps {
  currentHours: number
  initialHours: number
  threshold?: number          // configurable service interval
}
```

**Visual (inspired by Samsara engine hours widget):**
```
┌──────────────────────────────────┐
│  ⏱  Hour Meter                   │
├──────────────────────────────────┤
│                                  │
│         2,450.0                  │  ← Large number (28px, bold, tabular)
│         hours                    │  ← Label (12px, muted)
│                                  │
│  ┌──────────────────────────┐   │
│  │ █████████████████░░░░░░░ │   │  ← Progress bar (md size)
│  │ 49% of 5,000 hr service  │   │
│  └──────────────────────────┘   │
│                                  │
│  Initial reading    0.0 hrs      │  ← Meta row (12px)
│  Hours used         2,450.0 hrs  │
│  Est. daily avg     8.2 hrs      │  ← Computed: (current - initial) / days since created
│                                  │
└──────────────────────────────────┘

Card styling:
  background: var(--color-surface)
  border: 1px solid var(--color-border)
  border-radius: 10px
  padding: 20px
```

**Computation (client-side, no API):**
- `hoursUsed = currentHours - initialHours`
- `dailyAvg = hoursUsed / daysSinceCreation` (from `created_at`)
- `percentage = currentHours / threshold`

---

### 3.5 CostSummaryWidget (detail page sidebar)

**File:** `src/components/equipment/CostSummaryWidget.tsx` + `.css`

**Props:**
```typescript
interface CostSummaryWidgetProps {
  forkliftId: number
}
```

**Data source:** This widget fetches its own data. It calls the existing rental contracts list API filtered to find contracts where this forklift appears as a line item. Since the rental list API does not support `forklift_id` filter, the widget uses a client-side approach:

**Strategy (no backend change):**
1. Call `getRentalContracts({ page_size: 100 })` once
2. Filter contracts whose `items[].forklift.id === forkliftId`
3. BUT — the list API returns `RentalContract` (no items). Only `RentalContractDetail` has items.
4. **Revised strategy:** The `ForkliftDetail` response doesn't include linked contracts either.
5. **Practical approach:** This widget shows data from what IS available:
   - Purchase date + year = **age**
   - From the contracts tab (which we'll build), we can link to contracts
   - For the cost widget specifically, since we cannot derive billing data without new API, we show **operational stats** instead

**Revised visual — "Asset Summary" widget:**
```
┌──────────────────────────────────┐
│  📊  Asset Summary               │
├──────────────────────────────────┤
│                                  │
│  Purchase Date    Jun 15, 2022   │
│  Asset Age        4 years        │  ← computed from purchase_date
│  Warranty         Expired ●      │  ← red if past warranty_expiry
│                   (Dec 2024)     │
│                                  │
│  ────────────────────────────    │
│                                  │
│  Condition        Used           │
│  Status Changes   12             │  ← count of recent_status_history
│  Documents        3 attached     │  ← count of documents[]
│                                  │
└──────────────────────────────────┘
```

This uses only fields available on `ForkliftDetail` — no new API.

---

### 3.6 LocationCard (detail page left column)

**File:** `src/components/equipment/LocationCard.tsx` + `.css`

**Props:**
```typescript
interface LocationCardProps {
  location: ForkliftLocationEntry | null
}
```

**Visual (inspired by Fleetio location card):**
```
WITH LOCATION:
┌──────────────────────────────────┐
│  📍 Current Location             │
├──────────────────────────────────┤
│                                  │
│  ┌─────────────────────────────┐ │
│  │  🏢  Bangkok Warehouse      │ │  ← location_name (15px, semibold)
│  │      Zone A                 │ │  ← warehouse_zone (13px, muted)
│  │                             │ │
│  │  123 Industrial Road,       │ │  ← address (12px, muted, 2 lines max)
│  │  Bang Na, Bangkok 10260     │ │
│  │                             │ │
│  │  Since: Jun 15, 2026        │ │  ← effective_date
│  └─────────────────────────────┘ │
│                                  │
│  Notes: Parked in bay 3          │  ← location.notes (if any)
│                                  │
└──────────────────────────────────┘

WITHOUT LOCATION:
┌──────────────────────────────────┐
│  📍 Current Location             │
├──────────────────────────────────┤
│                                  │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│    No location recorded          │  ← dashed border box, muted text
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                                  │
└──────────────────────────────────┘
```

---

### 3.7 QuickActionBar (detail page header)

**File:** `src/components/equipment/QuickActionBar.tsx` + `.css`

**Props:**
```typescript
interface QuickActionBarProps {
  forklift: ForkliftDetail
  onEdit: () => void
  onStatusChange: () => void
  onRefresh: () => void
}
```

**Visual:**
```
[✏️ Edit]  [🔄 Change Status ▾]  [📄 Create Quotation]  [⋯ More]
  ↑ btn-ghost    ↑ btn-ghost dropdown     ↑ btn-primary      ↑ overflow menu

"More" dropdown items:
  - Log Hour Meter Reading
  - Upload Document
  - Upload Photo
  - Print Asset Report
  - ── divider ──
  - Decommission (danger)

"Change Status" dropdown items:
  (dynamic based on current status — show valid transitions)
  in_stock  → [Rent Out] [Reserve] [Send to Service] [Sell] [Decommission]
  rented    → [Return to Stock] [Send to Service]
  in_service → [Return to Stock]
  reserved  → [Return to Stock] [Rent Out]
  etc.
```

**Dependencies:** `lucide-react`, `react-router-dom` (Link to `/quotations/new?forklift_id=X`)

**Acceptance criteria:**
- "Edit" opens ForkliftForm modal
- "Create Quotation" navigates to `/quotations/new` (existing page)
- "Change Status" shows valid transitions only
- Status change calls existing `updateForklift(id, { status: newStatus })`
- "More" actions are placeholders that open the relevant form/modal

---

### 3.8 PhotoGallery (Photos tab)

**File:** `src/components/equipment/PhotoGallery.tsx` + `.css`

**Props:**
```typescript
interface PhotoGalleryProps {
  photos: ForkliftPhotoEntry[]
  forkliftName: string
}
```

**Visual (inspired by Samsara asset gallery):**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │              MAIN IMAGE (selected)                  │   │  ← 16:9 aspect
│  │              800px max-width                        │   │
│  │                                                     │   │
│  │  [◀ Prev]                              [Next ▶]     │   │  ← Arrow navigation
│  │                                                     │   │
│  │                               [🔍 Full Screen]      │   │  ← Lightbox trigger
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
│  │thumb │ │thumb │ │thumb │ │thumb │ │thumb │              │  ← 72x72, click to select
│  │●actv │ │      │ │      │ │      │ │      │              │     Active: blue border
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘            │
│                                                             │
│  Caption: "Front view of forklift"                         │  ← from photo.caption
│  Taken: Jun 15, 2026                                       │  ← from photo.taken_at
│                                                             │
└─────────────────────────────────────────────────────────────┘

LIGHTBOX (on fullscreen click):
┌─────────────────────────────────────────────────────────────┐
│  (dark overlay, z-index 1000)                               │
│                                                             │
│  [✕ Close]                                                  │
│                                                             │
│  [◀]      FULL-SIZE IMAGE (90vw × 85vh max)          [▶]   │
│                                                             │
│  2 / 5                                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

EMPTY STATE:
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│           [📷 illustration]                                 │
│           No photos uploaded                                │
│           Add photos to document this equipment             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Default selected: primary photo (`is_primary === true`) or first in `sort_order`
- Arrow keys navigate between photos
- Click thumbnail selects that photo
- Lightbox: Esc to close, arrow keys to navigate

**Data source:** `ForkliftDetail.photos[]` — already loaded by the detail page.

---

### 3.9 StatusTimeline (Status History tab)

**File:** `src/components/equipment/StatusTimeline.tsx` + `.css`

**Props:**
```typescript
interface StatusTimelineProps {
  history: ForkliftStatusHistoryEntry[]
}
```

**Visual (Fleetio-style timeline, replaces current table):**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ● ── Jun 21, 2026 · 2:30 PM ──────────────────────────   │
│  │   Status changed to In Stock                            │
│  │   ┌──────────┐    ┌──────────┐                         │
│  │   │● Rented  │ →  │● In Stock│                         │
│  │   └──────────┘    └──────────┘                         │
│  │   Reason: Contract RC-0012 completed                    │
│  │   By: Touyl PVS                                        │
│  │                                                         │
│  ● ── Jun 1, 2026 · 9:15 AM ───────────────────────────   │
│  │   Status changed to Rented                              │
│  │   ┌──────────┐    ┌──────────┐                         │
│  │   │● In Stock│ →  │● Rented  │                         │
│  │   └──────────┘    └──────────┘                         │
│  │   Reason: Contract RC-0012 activated                    │
│  │   By: Admin                                            │
│  │                                                         │
│  ● ── May 15, 2026 ────────────────── (initial entry) ──  │
│     Registered as In Stock                                 │
│     By: Touyl PVS                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

EMPTY STATE:
  "No status changes recorded yet"
```

**CSS structure:**
```
Timeline line: 2px vertical line, var(--color-border), left 10px
Dot: 10px circle, var(--color-primary), positioned over the line
Entry card: margin-left 28px, padding 14px, surface background, border
Date: 12px, muted, above the entry
Badge arrow: "→" between from/to badges
```

---

### 3.10 QuickFactsCard (detail page sidebar)

**File:** `src/components/equipment/QuickFactsCard.tsx` + `.css`

**Props:**
```typescript
interface QuickFactsCardProps {
  forklift: ForkliftDetail
}
```

**Visual:**
```
┌──────────────────────────────────┐
│  ⚡ Quick Facts                   │
├──────────────────────────────────┤
│                                  │
│  Brand          Toyota           │
│  Model          EFG 216k         │
│  Year           2022             │
│  Fuel           Diesel           │
│  Capacity       1,600 kg         │
│  Mast           Triplex          │
│  Max Lift       6,000 mm         │
│  Serial         JH-2024-001     │
│  Internal Code  DK-FL-012       │
│                                  │
└──────────────────────────────────┘

Layout:
  2-column grid: label (muted, 12px) | value (text, 13px, semibold)
  Rows: 28px height
  Card: standard surface card style
  Null values: show "—"
```

---

### 3.11 SpecificationsCard (detail page left column)

**File:** `src/components/equipment/SpecificationsCard.tsx` + `.css`

**Props:**
```typescript
interface SpecificationsCardProps {
  forklift: ForkliftDetail
}
```

**Visual:**
```
┌─────────────────────────────────────────────┐
│  🔧 Specifications                          │
├─────────────────────────────────────────────┤
│                                             │
│  ┌────────────┐ ┌────────────┐ ┌─────────┐ │
│  │ ⛽ Diesel   │ │ 🏗 1,600 kg│ │📅 2022  │ │  ← Feature chips
│  │  Fuel Type  │ │  Capacity  │ │  Year   │ │
│  └────────────┘ └────────────┘ └─────────┘ │
│                                             │
│  Mast Type        Triplex                   │
│  Max Lift Height  6,000 mm                  │  ← Detail rows
│  Model Number     EFG 216k                  │
│                                             │
│  ────────────────────────────────           │
│                                             │
│  Serial Number    JH-2024-001              │
│  Internal Code    DK-FL-012                │
│                                             │
└─────────────────────────────────────────────┘
```

Top section: 3 "feature chips" (icon + value + label) for the most important specs.
Bottom section: standard key-value rows for remaining details.

---

### 3.12 LinkedContractsList (Contracts tab)

**File:** `src/components/equipment/LinkedContractsList.tsx` + `.css`

**Props:**
```typescript
interface LinkedContractsListProps {
  forkliftId: number
}
```

**Data source:** This component fetches its own data independently:
1. Call `getRentalContracts({ page_size: 50 })` (existing API)
2. For each contract, call `getRentalContract(id)` to get items (only for first 5 contracts)
3. Filter to contracts where `items[].forklift.id === forkliftId`

**Alternative (lighter, no N+1):** Show a message "View contracts linked to this equipment in the Rental Contracts module" with a link to `/rental-contracts?q={serial_number}`. The serial number search on the rental list page will surface relevant contracts.

**Recommended approach (pragmatic):**
Since we cannot efficiently filter contracts by forklift without a backend endpoint, use a simplified display:

```
┌─────────────────────────────────────────────────────────────┐
│  Linked Rental Contracts                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  This feature will show rental contracts linked to    │   │
│  │  this equipment. Currently viewing is available via:  │   │
│  │                                                       │   │
│  │  [View in Rental Contracts →]                         │   │
│  │  (searches by serial number: JH-2024-001)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

This is honest about the API limitation and provides a useful cross-link without bad UX (slow N+1 loading) or backend changes.

---

### 3.13 DetailTabBar

**File:** `src/components/equipment/DetailTabBar.tsx` + `.css`

**Props:**
```typescript
interface DetailTabBarProps {
  tabs: { id: string; label: string; count?: number }[]
  activeTab: string
  onTabChange: (tabId: string) => void
}
```

**Visual:**
```
┌──────────────────────────────────────────────────────────────┐
│ [Overview●]  [Photos (5)]  [History (12)]  [Documents (3)]   │
│              [Contracts]                                      │
└──────────────────────────────────────────────────────────────┘

Active tab:  blue bottom border (3px), --color-primary text, font-weight 600
Inactive:    --color-text-muted, hover: --color-text
Count badge: inline (N), 11px, muted, after label
Tab bar:     horizontal scroll on mobile, border-bottom 1px
```

**State:** Driven by URL hash (`#overview`, `#photos`, `#history`, `#documents`, `#contracts`). Default: `overview`.

---

## 4. File Inventory

### 4.1 New Files (19)

```
src/pages/Equipment/
├── EquipmentRegistryPage.css           NEW — own styles (stop borrowing CatalogPage.css)
├── ForkliftDetailPage.css              NEW — own styles (stop borrowing ProductDetailPage.css)

src/components/equipment/
├── FleetCard.tsx                       NEW — replaces ForkliftCard
├── FleetCard.css                       NEW
├── FleetSummaryStrip.tsx               NEW
├── FleetSummaryStrip.css               NEW
├── HourMeterBar.tsx                    NEW
├── HourMeterBar.css                    NEW
├── HourMeterWidget.tsx                 NEW
├── HourMeterWidget.css                 NEW
├── CostSummaryWidget.tsx               NEW — "Asset Summary" variant
├── CostSummaryWidget.css               NEW
├── LocationCard.tsx                    NEW
├── LocationCard.css                    NEW
├── QuickActionBar.tsx                  NEW
├── QuickActionBar.css                  NEW
├── SpecificationsCard.tsx              NEW
├── SpecificationsCard.css              NEW
├── QuickFactsCard.tsx                  NEW
├── QuickFactsCard.css                  NEW
├── StatusTimeline.tsx                  NEW
├── StatusTimeline.css                  NEW
├── PhotoGallery.tsx                    NEW
├── PhotoGallery.css                    NEW
├── LinkedContractsList.tsx             NEW
├── LinkedContractsList.css             NEW
├── DetailTabBar.tsx                    NEW
├── DetailTabBar.css                    NEW
├── DetailHeader.tsx                    NEW
└── DetailHeader.css                    NEW
```

### 4.2 Modified Files (2)

```
src/pages/Equipment/EquipmentRegistryPage.tsx    REWRITE — new layout with FleetSummaryStrip, FleetCard
src/pages/Equipment/ForkliftDetailPage.tsx       REWRITE — tabbed layout with all new components
```

### 4.3 Unchanged Files (3)

```
src/pages/Equipment/ForkliftForm.tsx             UNCHANGED — modal form works fine
src/components/equipment/ForkliftStatusBadge.tsx  UNCHANGED — reused everywhere
src/components/ui/Badge.tsx                       UNCHANGED — foundation for status badges
```

### 4.4 Deprecated Files (to delete after migration)

```
src/components/equipment/ForkliftCard.tsx         REPLACED BY FleetCard
src/components/equipment/ForkliftCard.css         REPLACED BY FleetCard.css
```

---

## 5. Data Flow Map

```
┌─────────────────────────────────────────────────────────────────────┐
│ EQUIPMENT REGISTRY PAGE                                              │
│                                                                      │
│  useForklifts() hook ────────────→ GET /forklifts/?params            │
│       │                                                              │
│       ├─→ forklifts[] ─→ FleetSummaryStrip (compute status counts)  │
│       ├─→ forklifts[] ─→ FleetCard × N (grid view)                  │
│       ├─→ forklifts[] ─→ FleetTableRow × N (list view)              │
│       ├─→ total, pages ─→ Pagination                                │
│       └─→ params ─→ toolbar filter state                            │
│                                                                      │
│  useBrands() hook ───────────────→ GET /brands/?all=true             │
│       └─→ brands[] ─→ Brand filter dropdown                         │
│              └─→ ForkliftForm (brand select)                         │
│                                                                      │
│  create/update/remove ───────────→ POST/PUT/DELETE /forklifts/       │
│       └─→ refetch → re-renders list                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ FORKLIFT DETAIL PAGE                                                 │
│                                                                      │
│  getForklift(id) ────────────────→ GET /forklifts/:id                │
│       │                                                              │
│       ├─→ forklift ─→ DetailHeader (name, serial, status, badges)   │
│       ├─→ forklift ─→ QuickActionBar (actions based on status)      │
│       │                                                              │
│       ├─→ Overview Tab:                                              │
│       │   ├─→ forklift ─→ SpecificationsCard                        │
│       │   ├─→ forklift.current_location ─→ LocationCard             │
│       │   ├─→ forklift.notes ─→ NotesSection                        │
│       │   ├─→ forklift.current_hour_meter ─→ HourMeterWidget        │
│       │   ├─→ forklift (dates, counts) ─→ CostSummaryWidget         │
│       │   ├─→ forklift (specs) ─→ QuickFactsCard                    │
│       │   └─→ forklift.customer ─→ CustomerLinkCard                 │
│       │                                                              │
│       ├─→ Photos Tab:                                                │
│       │   └─→ forklift.photos[] ─→ PhotoGallery                     │
│       │                                                              │
│       ├─→ Status History Tab:                                        │
│       │   └─→ forklift.recent_status_history[] ─→ StatusTimeline    │
│       │                                                              │
│       ├─→ Documents Tab:                                             │
│       │   └─→ forklift.documents[] ─→ DocumentTable                 │
│       │                                                              │
│       └─→ Contracts Tab:                                             │
│           └─→ forklift.serial_number ─→ LinkedContractsList          │
│              (cross-links to /rental-contracts?q=serial)             │
│                                                                      │
│  ZERO additional API calls needed (all data from single GET)         │
│  Exception: LinkedContractsList may link out to another module       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Responsive Behavior

| Component | Desktop (≥1024) | Tablet (768-1023) | Mobile (<768) |
|---|---|---|---|
| **FleetSummaryStrip** | Single row, all chips | Single row, horizontal scroll | Horizontal scroll |
| **FleetCard grid** | 4 columns `minmax(260px, 1fr)` | 3 columns | 2 columns (< 640: 1 column) |
| **List table** | All columns visible | Hide: year, fuel, updated | Card list below 640px |
| **Detail header** | Horizontal: avatar + info + actions | Stack: info above, actions below | Full stack, actions as icon buttons |
| **Detail tabs** | Full width tab bar | Scrollable tabs | Scrollable tabs |
| **Detail content** | 2-column (60/40) | 2-column (55/45) | Single column, sidebar widgets on top |
| **PhotoGallery** | Large main + thumbnails row | Medium main + thumbnails | Full-width main, 2-row thumbs |
| **StatusTimeline** | Full width with badges | Full width | Compact: hide reason on narrow |
| **LocationCard** | Standard card | Standard card | Full width |
| **Sidebar widgets** | 40% column | 45% column | Full width, stacked above main content |

### Mobile Card List (replaces table below 640px)

```
┌──────────────────────────────────────┐
│ [📷]  Toyota 8FD25           ● Stock │
│       JH-2024-001 · Toyota          │
│       ⛽ Diesel · 🏗 1,600 kg        │
│       ⏱ 2,450 hrs                   │
│                                  [→] │
├──────────────────────────────────────┤
│ [📷]  Komatsu FD30         ● Rented │
│       ...                           │
└──────────────────────────────────────┘
```

---

## 7. Build Order

```
PHASE 1: Leaf components (can build in parallel, no page changes yet)
─────────────────────────────────────────────────────────────────────
  1. HourMeterBar.tsx + .css
  2. FleetSummaryStrip.tsx + .css
  3. LocationCard.tsx + .css
  4. QuickFactsCard.tsx + .css
  5. SpecificationsCard.tsx + .css
  6. CostSummaryWidget.tsx + .css (Asset Summary)
  7. HourMeterWidget.tsx + .css
  8. StatusTimeline.tsx + .css
  9. PhotoGallery.tsx + .css
  10. DetailTabBar.tsx + .css
  11. LinkedContractsList.tsx + .css

PHASE 2: Composite components
─────────────────────────────────────────────────────────────────────
  12. FleetCard.tsx + .css (depends on HourMeterBar, StatusBadge)
  13. QuickActionBar.tsx + .css
  14. DetailHeader.tsx + .css (depends on QuickActionBar, StatusBadge)

PHASE 3: Page rewrites
─────────────────────────────────────────────────────────────────────
  15. EquipmentRegistryPage.css (new, dedicated)
  16. EquipmentRegistryPage.tsx (rewrite — swap ForkliftCard → FleetCard, add FleetSummaryStrip)
  17. ForkliftDetailPage.css (new, dedicated)
  18. ForkliftDetailPage.tsx (rewrite — tabbed layout with all new components)

PHASE 4: Cleanup
─────────────────────────────────────────────────────────────────────
  19. Delete ForkliftCard.tsx + ForkliftCard.css
  20. Remove CatalogPage.css import from EquipmentRegistryPage
  21. Remove ProductDetailPage.css import from ForkliftDetailPage
```

---

## 8. Verification Checklist

```
LIST PAGE
  [ ] Fleet summary strip renders with accurate status counts
  [ ] Clicking a status chip filters the list
  [ ] Grid view shows FleetCard with hour meter bar
  [ ] List view shows enhanced table rows with thumbnails
  [ ] Search, brand, fuel, condition filters work
  [ ] Grid/list toggle works
  [ ] Pagination works in both views
  [ ] Mobile card-list view below 640px
  [ ] Register Forklift opens existing form modal
  [ ] Edit opens form modal with pre-filled data
  [ ] Delete shows confirm dialog
  [ ] Card click navigates to detail page
  [ ] Empty state renders correctly

DETAIL PAGE
  [ ] Header shows name, serial, brand, year, badges, photo avatar
  [ ] Quick actions: Edit, Change Status, Create Quotation
  [ ] Tab bar renders 5 tabs, default to Overview
  [ ] Tab state persisted in URL hash
  [ ] Overview tab: specifications card, location card, notes, sidebar widgets
  [ ] Hour meter widget shows progress bar and computed stats
  [ ] Asset summary widget shows purchase date, warranty, counts
  [ ] Quick facts card shows key specs
  [ ] Photos tab: gallery with main image, thumbnails, lightbox, keyboard nav
  [ ] Status History tab: timeline view with badges and reasons
  [ ] Documents tab: table with download links
  [ ] Contracts tab: cross-link to rental contracts
  [ ] Responsive: 2-col → 1-col below 768px
  [ ] Back navigation works
  [ ] Loading skeleton renders during fetch
  [ ] Error state renders correctly

PRESERVED FUNCTIONALITY
  [ ] All existing routes unchanged (/equipment, /equipment/:id)
  [ ] ForkliftForm modal works for create and edit
  [ ] All existing API calls unchanged
  [ ] ForkliftStatusBadge and ForkliftConditionBadge render correctly
  [ ] No backend/API/database changes
```
