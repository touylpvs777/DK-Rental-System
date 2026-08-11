# Equipment Registry — Fleetio & Samsara-Inspired Architecture

**Domain:** Forklift fleet management for a material handling rental business  
**Constraint:** Existing APIs only. Zero backend, database, or API changes.  
**Date:** 2026-06-21

---

## 0. Data Source Inventory

### Forklift (list item — `GET /forklifts/`)

```
id, serial_number, slug, internal_code,
name_en, name_lo, model_number,
model: { id, name, slug, series, fuel_type, capacity_kg } | null,
brand: { id, name, slug, logo_url } | null,
customer: { id, first_name, last_name, company } | null,
status: 'in_stock' | 'sold' | 'rented' | 'in_service' | 'reserved' | 'decommissioned',
condition: 'new' | 'used' | 'refurbished',
fuel_type: 'electric' | 'diesel' | 'lpg' | 'dual_fuel' | null,
capacity_kg: number | null,
year_manufactured: number | null,
current_hour_meter: number,
is_active: boolean,
primary_photo_url: string | null,
created_at, updated_at
```

### ForkliftDetail (single item — `GET /forklifts/:id`)

```
+ mast_type, max_lift_height_mm,
  purchase_date, warranty_expiry,
  initial_hour_meter, notes,
  photos: { id, image_url, thumbnail_url, alt_text, caption, is_primary, sort_order, taken_at }[],
  documents: { id, document_type, title, file_url, file_size_bytes, expiry_date }[],
  recent_status_history: { id, from_status, to_status, reason, user, changed_at }[],
  current_location: { id, location_name, warehouse_zone, address, effective_date, notes } | null,
  created_by, updated_by
```

### Filter Params (`ForkliftListParams`)

```
q, brand_id, model_id, customer_id,
status, condition, fuel_type, is_active,
page, page_size,
sort: 'name_en' | 'serial_number' | 'status' | 'created_at' | 'updated_at' | 'current_hour_meter',
order: 'asc' | 'desc'
```

### Cross-Module Data (existing APIs, no changes)

```
GET /rental-contracts/  → RentalContract[] (has items[].forklift for linking)
GET /quotations/        → Quotation[] (has items[].forklift for linking)
GET /activity/          → ActivityLog[] (for timeline)
```

---

## 1. Page Architecture

### 1.1 Equipment Registry — List Page

```
┌═════════════════════════════════════════════════════════════════════════════┐
║                                                                             ║
║  FLEET HEADER                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐║
║  │  Equipment Registry                        [↻ Refresh] [+ Register]    │║
║  │  52 units in fleet                                                      │║
║  └─────────────────────────────────────────────────────────────────────────┘║
║                                                                             ║
║  FLEET STATUS STRIP                                                         ║
║  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       ║
║  │All  52 │ │Stock 24│ │Rent  18│ │Svc   5 │ │Rsv   2 │ │Other 3 │       ║
║  │● active│ │● green │ │●purple │ │●amber  │ │● cyan  │ │● gray  │       ║
║  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘       ║
║   ↑ clickable — each chip filters the fleet below                          ║
║                                                                             ║
║  FLEET STATS BAR                                                            ║
║  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     ║
║  │ Utilization   │ │ Avg Hours    │ │ PM Due        │ │ Avg Age       │     ║
║  │ 82%           │ │ 2,140 hrs    │ │ 5 units       │ │ 3.2 years     │     ║
║  │ ↑ from 78%    │ │ fleet avg    │ │ 3 critical    │ │ 2019-2024     │     ║
║  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘     ║
║                                                                             ║
║  TOOLBAR                                                                    ║
║  ┌─────────────────────────────────────────────────────────────────────────┐║
║  │ [🔍 Search serial, name, model...]                                      │║
║  │ [Brand ▾]  [Fuel ▾]  [Condition ▾]  [✕ Clear]  52 results  [▦] [≡]   │║
║  └─────────────────────────────────────────────────────────────────────────┘║
║                                                                             ║
║  CONTENT — Grid View                                                        ║
║  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐              ║
║  │   FLEET CARD     │ │   FLEET CARD     │ │   FLEET CARD     │             ║
║  │                   │ │                   │ │                   │             ║
║  │                   │ │                   │ │                   │             ║
║  └─────────────────┘ └─────────────────┘ └─────────────────┘              ║
║  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐              ║
║  │   FLEET CARD     │ │   FLEET CARD     │ │   FLEET CARD     │             ║
║  └─────────────────┘ └─────────────────┘ └─────────────────┘              ║
║                                                                             ║
║  CONTENT — List View (table with thumbnails)                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐║
║  │ [img] FORKLIFT        SERIAL      STATUS    HOURS    BRAND   FUEL  [⋯]│║
║  │ [img] Toyota 8FD25    JH-001      ● Stock   2,450   Toyota  Diesel [⋯]│║
║  │ [img] Komatsu FD30    KM-003      ● Rented  1,200   Komatsu LPG   [⋯]│║
║  └─────────────────────────────────────────────────────────────────────────┘║
║                                                                             ║
║  PAGINATION                                                                 ║
║  ┌─────────────────────────────────────────────────────────────────────────┐║
║  │  Page 1 of 3 (52 total)              ◀  1  2  3  ▶    [20 ▾] / page  │║
║  └─────────────────────────────────────────────────────────────────────────┘║
║                                                                             ║
╚═════════════════════════════════════════════════════════════════════════════╝
```

### 1.2 Equipment Detail Page

```
┌═════════════════════════════════════════════════════════════════════════════┐
║                                                                             ║
║  BREADCRUMB: Equipment Registry / JH-2024-001                               ║
║                                                                             ║
║  ASSET HEADER                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐║
║  │                                                                         │║
║  │  [📷 64px]  Toyota 8FD25 Diesel Forklift                                │║
║  │             S/N: JH-2024-001 · Toyota · 2022 · Diesel                   │║
║  │             ● In Stock   ○ Used   ✓ Active                              │║
║  │                                                                         │║
║  │  [✏️ Edit]  [🔄 Change Status ▾]  [📄 New Quote]  [📋 New Contract] [⋯]│║
║  │                                                                         │║
║  └─────────────────────────────────────────────────────────────────────────┘║
║                                                                             ║
║  TAB BAR                                                                    ║
║  ┌─────────────────────────────────────────────────────────────────────────┐║
║  │ [Overview●]  [Photos 5]  [Timeline 12]  [Documents 3]  [Contracts]    │║
║  └─────────────────────────────────────────────────────────────────────────┘║
║                                                                             ║
║  ═══ OVERVIEW TAB ═══════════════════════════════════════════════════════  ║
║                                                                             ║
║  ┌─────── LEFT COLUMN (58%) ──────────┐ ┌──── RIGHT COLUMN (42%) ──────┐  ║
║  │                                      │ │                              │  ║
║  │  ┌── SPECIFICATIONS CARD ──────┐   │ │  ┌── HOUR METER WIDGET ──┐  │  ║
║  │  │                              │   │ │  │                        │  │  ║
║  │  │  ┌────────┐ ┌──────┐ ┌────┐│   │ │  │      2,450.0           │  │  ║
║  │  │  │⛽Diesel│ │🏗1.6T│ │📅22││   │ │  │      hours              │  │  ║
║  │  │  └────────┘ └──────┘ └────┘│   │ │  │                        │  │  ║
║  │  │                              │   │ │  │  █████████████████░░  │  │  ║
║  │  │  Serial    JH-2024-001     │   │ │  │  49% of 5,000 hrs    │  │  ║
║  │  │  Internal  DK-FL-012       │   │ │  │                        │  │  ║
║  │  │  Model     8FD25           │   │ │  │  Initial    0.0 hrs   │  │  ║
║  │  │  Mast      Triplex         │   │ │  │  Used       2,450 hrs │  │  ║
║  │  │  Max Lift  6,000 mm        │   │ │  │  Daily avg  8.2 hrs  │  │  ║
║  │  │                              │   │ │  │                        │  │  ║
║  │  └──────────────────────────────┘   │ │  └────────────────────────┘  │  ║
║  │                                      │ │                              │  ║
║  │  ┌── LOCATION CARD ────────────┐   │ │  ┌── ASSET SUMMARY ──────┐  │  ║
║  │  │                              │   │ │  │                        │  │  ║
║  │  │  📍 Current Location        │   │ │  │  Purchase  Jun 2022   │  │  ║
║  │  │                              │   │ │  │  Age       4.0 years │  │  ║
║  │  │  🏢 Bangkok Warehouse       │   │ │  │  Warranty  Expired ●  │  │  ║
║  │  │     Zone A                   │   │ │  │                        │  │  ║
║  │  │     123 Industrial Road      │   │ │  │  Condition Used       │  │  ║
║  │  │     Since: Jun 15, 2026     │   │ │  │  Status Δ  12 changes │  │  ║
║  │  │                              │   │ │  │  Documents 3 files   │  │  ║
║  │  │  Notes: Parked in bay 3     │   │ │  │  Photos    5 images  │  │  ║
║  │  │                              │   │ │  │                        │  │  ║
║  │  └──────────────────────────────┘   │ │  └────────────────────────┘  │  ║
║  │                                      │ │                              │  ║
║  │  ┌── NOTES ────────────────────┐   │ │  ┌── CUSTOMER LINK ──────┐  │  ║
║  │  │  Scheduled for PM next week │   │ │  │                        │  │  ║
║  │  │  Contact driver before move │   │ │  │  Currently assigned to │  │  ║
║  │  └──────────────────────────────┘   │ │  │  📍 Toyota Motor TH   │  │  ║
║  │                                      │ │  │     Bangkok           │  │  ║
║  │                                      │ │  │  [View Customer →]   │  │  ║
║  │                                      │ │  │                        │  │  ║
║  │                                      │ │  └────────────────────────┘  │  ║
║  │                                      │ │                              │  ║
║  └──────────────────────────────────────┘ └──────────────────────────────┘  ║
║                                                                             ║
║  ═══ PHOTOS TAB ═════════════════════════════════════════════════════════  ║
║  (see Section 3.6)                                                          ║
║                                                                             ║
║  ═══ TIMELINE TAB ═══════════════════════════════════════════════════════  ║
║  (see Section 3.7)                                                          ║
║                                                                             ║
║  ═══ DOCUMENTS TAB ══════════════════════════════════════════════════════  ║
║  (see Section 3.8)                                                          ║
║                                                                             ║
║  ═══ CONTRACTS TAB ══════════════════════════════════════════════════════  ║
║  (see Section 3.9)                                                          ║
║                                                                             ║
╚═════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Component Tree

```
EquipmentRegistryPage (REWRITE)
│
├── FleetHeader                                 NEW
│
├── FleetStatusStrip                            NEW
│   └── StatusChip × 7                          (all, in_stock, rented, in_service, reserved, sold, decommissioned)
│
├── FleetStatsBar                               NEW
│   └── FleetStatCard × 4                       (utilization, avg hours, PM due, avg age)
│
├── FleetToolbar                                NEW
│   ├── SearchInput
│   ├── FilterSelect × 3 (brand, fuel, condition)
│   ├── ClearButton
│   ├── ResultCount
│   └── ViewToggle (grid/list)
│
├── FleetCard × N                               NEW
│   ├── FleetCardImage
│   ├── StatusBadge (existing ForkliftStatusBadge)
│   ├── ConditionBadge (existing ForkliftConditionBadge)
│   ├── FleetCardMeta (fuel, capacity, year chips)
│   ├── HourMeterBar                            NEW
│   └── FleetCardActions (View, Edit — hover)
│
├── FleetTableRow × N                           NEW
│   ├── RowThumbnail
│   ├── StatusBadge
│   └── RowActionMenu                           NEW
│
├── ForkliftForm (existing — UNCHANGED)
├── ConfirmDialog (existing — UNCHANGED)
└── Pagination

ForkliftDetailPage (REWRITE)
│
├── AssetHeader                                 NEW
│   ├── AssetAvatar (primary photo thumbnail)
│   ├── AssetTitle (name + serial + brand + year)
│   ├── AssetBadges (status + condition + active)
│   └── QuickActionBar                          NEW
│       ├── EditButton
│       ├── StatusChangeDropdown                NEW
│       ├── NewQuoteButton
│       ├── NewContractButton
│       └── MoreMenu                            NEW
│
├── AssetTabBar                                 NEW
│   └── Tab × 5 (Overview, Photos, Timeline, Documents, Contracts)
│
├── OverviewTab
│   ├── SpecificationsCard                      NEW
│   │   ├── SpecChip × 3 (fuel, capacity, year)
│   │   └── SpecRow × N (key-value pairs)
│   │
│   ├── LocationCard                            NEW
│   │   ├── LocationHeader
│   │   ├── LocationBody (name, zone, address, date)
│   │   └── LocationNotes
│   │
│   ├── NotesBlock                              (simple)
│   │
│   ├── HourMeterWidget                         NEW
│   │   ├── HourMeterValue (large number)
│   │   ├── HourMeterBar                        (reused from FleetCard)
│   │   └── HourMeterStats (initial, used, daily avg)
│   │
│   ├── AssetSummaryCard                        NEW
│   │   └── SummaryRow × N (purchase, age, warranty, condition, counts)
│   │
│   └── CustomerLinkCard                        NEW
│       ├── CustomerName
│       └── ViewCustomerLink
│
├── PhotosTab
│   └── PhotoGallery                            NEW
│       ├── GalleryMain (large image + arrows + counter)
│       ├── GalleryThumbs (strip)
│       ├── GalleryLightbox                     NEW
│       │   ├── LightboxImage
│       │   ├── LightboxThumbs
│       │   └── LightboxControls (arrows, close, counter)
│       └── GalleryEmpty
│
├── TimelineTab
│   └── StatusTimeline                          NEW
│       └── TimelineEntry × N
│           ├── TimelineDot
│           ├── TimelineDate
│           ├── TimelineBadges (from → to)
│           ├── TimelineReason
│           └── TimelineUser
│
├── DocumentsTab
│   └── DocumentsTable                          (enhanced from current inline table)
│       └── DocumentRow × N
│
├── ContractsTab
│   └── LinkedContractsPanel                    NEW
│       └── ContractLinkCard × N                NEW
│
└── ForkliftForm (existing — UNCHANGED)
```

---

## 3. Component Specifications

### 3.1 FleetStatusStrip

**File:** `src/components/equipment/FleetStatusStrip.tsx` + `.css`

**Props:**
```typescript
interface FleetStatusStripProps {
  counts: Record<ForkliftStatus | 'all', number>
  activeStatus: ForkliftStatus | null       // null = show all
  onStatusClick: (status: ForkliftStatus | null) => void
}
```

**Counts computation (client-side from forklifts array):**
```
On first unfiltered load, iterate forklifts[] and bucket by status.
Cache this breakdown. When user clicks a chip, apply status filter
to the API params — the strip counts remain from the cached full load.
```

**Visual:**
```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│All   │ │Stock │ │Rented│ │ Svc  │ │Rsrvd │ │ Sold │ │Decom │
│ 52   │ │  24  │ │  18  │ │   5  │ │   2  │ │   1  │ │   2  │
│●     │ │●grn  │ │●purp │ │●amb  │ │●cyan │ │●blue │ │●red  │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
              ↑ active: filled bg, ring

Chip: min-width 80px, padding 10px 16px, radius 10px
Active: status-color at 12% opacity bg + 2px ring
Inactive: surface bg, standard border
Count: 22px bold tabular-nums
Label: 11px uppercase muted
Dot: 6px circle in status color
Gap: 10px
Overflow: horizontal scroll on mobile

Status → Color (matches existing ForkliftStatusBadge):
  in_stock:        #22c55e
  rented:          #7c3aed
  in_service:      #f59e0b
  reserved:        #0891b2
  sold:            #3b82f6
  decommissioned:  #ef4444
```

---

### 3.2 FleetStatsBar

**File:** `src/components/equipment/FleetStatsBar.tsx` + `.css`

**Props:**
```typescript
interface FleetStatsBarProps {
  forklifts: Forklift[]
  loading: boolean
}
```

**4 computed metrics (all client-side from the forklifts array):**

| Metric | Computation | Icon |
|---|---|---|
| Fleet Utilization | `forklifts.filter(f => f.status === 'rented').length / forklifts.length * 100` | `Gauge` |
| Avg Hour Meter | `sum(forklifts.map(f => f.current_hour_meter)) / forklifts.length` | `Clock` |
| PM Due | `forklifts.filter(f => f.current_hour_meter >= 4000).length` + critical count `>= 4500` | `Wrench` |
| Avg Fleet Age | `sum(forklifts.map(f => currentYear - (f.year_manufactured ?? currentYear))) / forklifts.length` | `Calendar` |

**Visual:**
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ [⏱]          │ │ [🔧]          │ │ [📅]          │ │ [📊]          │
│ Utilization   │ │ Avg Hours    │ │ PM Due        │ │ Avg Age       │
│ 82%           │ │ 2,140 hrs    │ │ 5 units       │ │ 3.2 years     │
│               │ │              │ │ ⚠ 3 critical  │ │               │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

Card: surface bg, border, radius-md, padding 16px
Icon: 36px circle in accent-50 bg, accent color
Label: 11px muted uppercase
Value: 24px bold tabular-nums
Sub: 11px muted (alert count for PM in amber/red)
Grid: repeat(4, 1fr) desktop, repeat(2, 1fr) mobile
```

---

### 3.3 FleetCard

**File:** `src/components/equipment/FleetCard.tsx` + `.css`

**Props:**
```typescript
interface FleetCardProps {
  forklift: Forklift
  onClick: () => void
  onEdit: () => void
  hourMeterThreshold?: number       // default 5000
}
```

**Visual:**
```
┌────────────────────────────────────┐
│ ┌────────────────────────────────┐ │
│ │                                │ │
│ │       FORKLIFT PHOTO           │ │  4:3 aspect, contain, bg-subtle
│ │                                │ │  fallback: SVG forklift icon
│ │  ┌──────────┐                  │ │
│ │  │ ● Stock  │       ┌──────┐ │ │  status top-left, condition top-right
│ │  └──────────┘       │ Used │ │ │
│ │                      └──────┘ │ │
│ └────────────────────────────────┘ │
│                                    │
│  TOYOTA                            │  brand (11px uppercase primary)
│  Toyota 8FD25 Diesel Forklift      │  name_en (14px semibold, 2-line clamp)
│  JH-2024-001 · EFG 216k           │  serial + model (12px mono muted)
│                                    │
│  ┌────────────────────────────┐   │
│  │ ⛽ Diesel │ 🏗 1,600kg │ 📅22│   │  meta chips row
│  └────────────────────────────┘   │
│                                    │
│  ┌────────────────────────────┐   │
│  │ ████████████████░░░░  49%  │   │  HourMeterBar
│  │ 2,450 / 5,000 hrs         │   │  color-coded (green/amber/red)
│  └────────────────────────────┘   │
│                                    │
│  👤 Toyota Motor (Thailand)        │  customer name (if rented)
│                                    │
│  [View]  [Edit]                    │  hover-visible actions
│                                    │
└────────────────────────────────────┘

Card: surface bg, border, radius 12px, overflow hidden
Width: minmax(280px, 1fr) in grid
Hover: border-color primary-100, shadow-md
Image hover: scale(1.03) with overflow hidden
Customer line: only shown if forklift.customer is not null
Actions: opacity 0 → 1 on card hover
```

---

### 3.4 HourMeterBar

**File:** `src/components/equipment/HourMeterBar.tsx` + `.css`

**Props:**
```typescript
interface HourMeterBarProps {
  current: number
  threshold?: number           // default 5000
  showLabel?: boolean          // default true
  size?: 'sm' | 'md'          // sm for card (6px), md for widget (10px)
}
```

**Visual:**
```
sm (fleet card):
  ████████████████░░░░  49%
  2,450 / 5,000 hrs

md (detail widget):
  ██████████████████████████░░░░  73%
  3,650 / 5,000 hrs

Bar: rounded-full
Track: var(--color-bg-subtle)
Fill gradient:
  < 60%:   var(--color-success)    #22c55e
  60-85%:  var(--color-warning)    #f59e0b
  > 85%:   var(--color-danger)     #ef4444
Label: "{current} / {threshold} hrs" in muted text
Percentage: right-aligned, same color as fill
```

---

### 3.5 HourMeterWidget

**File:** `src/components/equipment/HourMeterWidget.tsx` + `.css`

**Props:**
```typescript
interface HourMeterWidgetProps {
  currentHours: number
  initialHours: number
  createdAt: string            // for daily average computation
  threshold?: number           // default 5000
}
```

**Visual (Samsara engine-hours style):**
```
┌────────────────────────────────────┐
│  ⏱  Hour Meter                     │
├────────────────────────────────────┤
│                                    │
│           2,450.0                  │  28px bold tabular-nums
│           hours                    │  12px muted
│                                    │
│  ┌──────────────────────────────┐ │
│  │ █████████████████████░░░░░░░ │ │  HourMeterBar size=md
│  │ 49% of 5,000 hr service     │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────┬────────────┐   │
│  │ Initial      │ 0.0 hrs    │   │  key-value rows
│  │ Hours used   │ 2,450.0    │   │
│  │ Daily avg    │ 8.2 hrs    │   │  computed: (current-initial)/daysSinceCreated
│  │ Est. service │ ~312 days  │   │  computed: (threshold-current)/dailyAvg
│  └──────────────┴────────────┘   │
│                                    │
└────────────────────────────────────┘

"Est. service in": only shown if dailyAvg > 0 and current < threshold
Card: surface bg, border, radius 12px, padding 20px
```

---

### 3.6 PhotoGallery

**File:** `src/components/equipment/PhotoGallery.tsx` + `.css`

**Props:**
```typescript
interface PhotoGalleryProps {
  photos: ForkliftPhotoEntry[]
  assetName: string
}
```

**Visual:**
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │                                           │ │
│  │           MAIN IMAGE                      │ │  16:10 aspect, contain
│  │           (click → lightbox)              │ │
│  │                                           │ │
│  │  [◀]                              [▶]    │ │  navigation arrows
│  │                                   1 / 5   │ │  counter badge (bottom-right)
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│  │      │ │      │ │      │ │      │ │      ││  72px thumbnails
│  │●actv │ │      │ │      │ │      │ │      ││  active: 2px primary border
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘│
│                                                 │
│  Caption: "Front view — warehouse bay 3"       │  from photo.caption
│  Taken: Jun 15, 2026                           │  from photo.taken_at
│                                                 │
└─────────────────────────────────────────────────┘

LIGHTBOX (click main image):
┌─────────────────────────────────────────────────────────┐
│  (black overlay, z-index 1000)                          │
│                                                         │
│  [✕ Close]                                    1 / 5    │
│                                                         │
│  [◀]          FULL-SIZE IMAGE                     [▶]  │
│               (90vw × 85vh max)                        │
│                                                         │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                            │
│  │ 1│ │ 2│ │ 3│ │ 4│ │ 5│  thumbnail strip            │
│  └──┘ └──┘ └──┘ └──┘ └──┘                            │
│                                                         │
│  Keyboard: ← → navigate, Esc close                    │
└─────────────────────────────────────────────────────────┘

EMPTY STATE:
┌─────────────────────────────────────────────────┐
│                                                 │
│             [📷 camera icon, 48px, muted]       │
│             No photos uploaded                  │
│             Photos help identify this unit      │
│                                                 │
└─────────────────────────────────────────────────┘

Sorting: primary photo first, then by sort_order
Default selected: is_primary === true or index 0
Arrow keys navigate in both normal and lightbox mode
```

---

### 3.7 StatusTimeline

**File:** `src/components/equipment/StatusTimeline.tsx` + `.css`

**Props:**
```typescript
interface StatusTimelineProps {
  history: ForkliftStatusHistoryEntry[]
}
```

**Visual (Fleetio activity-feed style):**
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ● ─── Jun 21, 2026 · 2:30 PM ───────────────────────────  │
│  │                                                           │
│  │   ┌──────────────────────────────────────────────────┐  │
│  │   │  Status changed                                   │  │
│  │   │                                                   │  │
│  │   │  ┌──────────┐       ┌──────────┐                │  │
│  │   │  │ ● Rented │  ──▶  │ ● Stock  │                │  │
│  │   │  └──────────┘       └──────────┘                │  │
│  │   │                                                   │  │
│  │   │  Reason: Contract RC-0012 completed              │  │
│  │   │  By: Touyl PVS                                   │  │
│  │   └──────────────────────────────────────────────────┘  │
│  │                                                           │
│  ● ─── Jun 1, 2026 · 9:15 AM ────────────────────────────  │
│  │                                                           │
│  │   ┌──────────────────────────────────────────────────┐  │
│  │   │  Status changed                                   │  │
│  │   │                                                   │  │
│  │   │  ┌──────────┐       ┌──────────┐                │  │
│  │   │  │ ● Stock  │  ──▶  │ ● Rented │                │  │
│  │   │  └──────────┘       └──────────┘                │  │
│  │   │                                                   │  │
│  │   │  Reason: Contract RC-0012 activated              │  │
│  │   │  By: Admin                                       │  │
│  │   └──────────────────────────────────────────────────┘  │
│  │                                                           │
│  ○ ─── May 15, 2026 ────────────── (initial entry) ──────  │
│                                                              │
│     Registered as In Stock                                   │
│     By: Touyl PVS                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Timeline line: 2px, var(--color-border), left 12px
Dot: 12px circle
  Recent (top): var(--color-primary), filled
  Older: var(--color-border), hollow
Entry card: surface bg, border, radius-md, padding 16px
  margin-left 32px
Date: 12px muted, above card
Badge arrow: "──▶" between from/to badges (using ArrowRight icon 14px)
Reason: 13px muted, italic if present, "—" if absent
User: 12px muted, bold name

EMPTY STATE:
  "No status changes recorded"
  Muted text, centered, dashed border box
```

---

### 3.8 LocationCard

**File:** `src/components/equipment/LocationCard.tsx` + `.css`

**Props:**
```typescript
interface LocationCardProps {
  location: ForkliftLocationEntry | null
}
```

**Visual:**
```
WITH LOCATION:
┌────────────────────────────────────┐
│  📍 Current Location               │
├────────────────────────────────────┤
│                                    │
│  ┌──────────────────────────────┐ │
│  │  🏢  Bangkok Warehouse       │ │  location_name (15px semibold)
│  │      Zone A                  │ │  warehouse_zone (13px muted)
│  │                              │ │
│  │  📍 123 Industrial Road,     │ │  address (12px muted)
│  │     Bang Na, Bangkok 10260   │ │
│  │                              │ │
│  │  📅 Since: Jun 15, 2026     │ │  effective_date
│  └──────────────────────────────┘ │
│                                    │
│  💬 Notes: Parked in bay 3        │  location.notes (if present)
│                                    │
└────────────────────────────────────┘

WITHOUT LOCATION:
┌────────────────────────────────────┐
│  📍 Current Location               │
├────────────────────────────────────┤
│                                    │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│    📍 No location recorded        │  dashed border, muted
│    Location will appear here       │
│    when assigned                   │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│                                    │
└────────────────────────────────────┘

Card: surface bg, border, radius 12px, padding 20px
Inner box: bg-subtle, border, radius 8px, padding 14px
Address icon: MapPin (Lucide) 14px
Date icon: Calendar (Lucide) 14px
```

---

### 3.9 QuickActionBar

**File:** `src/components/equipment/QuickActionBar.tsx` + `.css`

**Props:**
```typescript
interface QuickActionBarProps {
  forklift: ForkliftDetail
  onEdit: () => void
  onStatusChange: (newStatus: ForkliftStatus) => void
  onRefresh: () => void
}
```

**Visual:**
```
[✏️ Edit]  [🔄 Change Status ▾]  [📄 New Quote]  [📋 New Contract]  [⋯ More]

Buttons: btn-ghost style, 13px, icon + label
"Change Status" dropdown (valid transitions):
  Current: in_stock
    → [Rent Out] [Reserve] [Send to Service] [Mark as Sold] [Decommission]
  Current: rented
    → [Return to Stock] [Send to Service]
  Current: in_service
    → [Return to Stock] [Mark as Decommissioned]
  Current: reserved
    → [Release to Stock] [Rent Out]
  ... etc

"New Quote" → navigate /quotations/new
"New Contract" → navigate /rental-contracts/new

"More" dropdown:
  ├── 📝 Update Hour Meter      → opens inline edit (calls updateForklift)
  ├── 📷 Manage Photos           → switches to Photos tab
  ├── 📎 Manage Documents        → switches to Documents tab
  ├── 🖨️ Print Asset Report     → window.print() (future)
  ├── ─────────────────
  └── 🗑️ Decommission (danger)  → confirm dialog → status change

Status change: calls existing updateForklift(id, { status: newStatus })
  with optional reason prompt (simple window.prompt or inline input)
```

---

### 3.10 AssetSummaryCard

**File:** `src/components/equipment/AssetSummaryCard.tsx` + `.css`

**Props:**
```typescript
interface AssetSummaryCardProps {
  forklift: ForkliftDetail
}
```

**All fields from ForkliftDetail — no new API:**

**Visual:**
```
┌────────────────────────────────────┐
│  📊 Asset Summary                   │
├────────────────────────────────────┤
│                                    │
│  Purchase       Jun 15, 2022      │  purchase_date (fmtDate or "—")
│  Asset Age      4.0 years         │  computed: (now - purchase_date) / 365
│  Warranty       Expired ●         │  warranty_expiry: red dot + "Expired" if past
│                  (Dec 2024)       │    or green dot + "Valid until {date}" if future
│                                    │
│  ──────────────────────────────   │
│                                    │
│  Condition      Used              │  forklift.condition
│  Status Changes 12                │  forklift.recent_status_history.length
│  Documents      3 attached        │  forklift.documents.length
│  Photos         5 images          │  forklift.photos.length
│                                    │
└────────────────────────────────────┘

Card: surface bg, border, radius 12px, padding 20px
Rows: 2-column grid, label (muted 12px) | value (text 13px)
Warranty indicator:
  Past: red dot + "Expired" + date in parentheses
  Future: green dot + "Valid until" + date
  Null: "—"
```

---

### 3.11 LinkedContractsPanel

**File:** `src/components/equipment/LinkedContractsPanel.tsx` + `.css`

**Props:**
```typescript
interface LinkedContractsPanelProps {
  serialNumber: string
  forkliftId: number
}
```

**Data strategy (no backend change):**

The rental list API does NOT support `forklift_id` filter. Two approaches:

**Approach A (recommended — honest UX):**
```
┌──────────────────────────────────────────────────────────┐
│  📋 Linked Contracts                                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  View all rental contracts related to this equipment     │
│  by searching its serial number.                         │
│                                                          │
│  [View in Rental Contracts →]                            │
│  Searches: "JH-2024-001"                                │
│                                                          │
└──────────────────────────────────────────────────────────┘

Link: /rental-contracts?q=JH-2024-001
```

**Approach B (richer but heavier):**
Fetch first 50 rental contracts, client-side check each for `items` — but contract list items don't include `items[]`. Would require fetching each contract detail (N+1 problem). Not recommended without backend support.

---

### 3.12 AssetTabBar

**File:** `src/components/equipment/AssetTabBar.tsx` + `.css`

**Props:**
```typescript
interface AssetTabBarProps {
  tabs: { id: string; label: string; count?: number }[]
  activeTab: string
  onTabChange: (tabId: string) => void
}
```

**Tab configuration for Equipment Detail:**
```typescript
const TABS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'photos',     label: 'Photos',     count: forklift.photos.length },
  { id: 'timeline',   label: 'Timeline',   count: forklift.recent_status_history.length },
  { id: 'documents',  label: 'Documents',  count: forklift.documents.length },
  { id: 'contracts',  label: 'Contracts' },
]
```

**State:** URL hash (`#overview`, `#photos`, `#timeline`, `#documents`, `#contracts`). Default: `overview`. Browser back navigates between tabs.

**Visual:**
```
┌───────────────────────────────────────────────────────────────┐
│ [Overview●]  [Photos (5)]  [Timeline (12)]  [Documents (3)]  │
│              [Contracts]                                      │
└───────────────────────────────────────────────────────────────┘

Active: primary text, 3px bottom border in primary
Inactive: muted text, hover → text color
Count: inline "(N)" in muted, 11px
Mobile: horizontal scroll, no wrap
Bar: border-bottom 1px, background surface
```

---

## 4. Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ EQUIPMENT REGISTRY PAGE                                              │
│                                                                      │
│  useForklifts(params) ────────→ GET /forklifts/?params               │
│       │                                                              │
│       ├─→ forklifts[] ─→ FleetStatusStrip (status count buckets)    │
│       ├─→ forklifts[] ─→ FleetStatsBar (utilization, avg hrs, etc.) │
│       ├─→ forklifts[] ─→ FleetCard × N (grid view)                  │
│       ├─→ forklifts[] ─→ FleetTableRow × N (list view)              │
│       ├─→ total, pages ─→ Pagination                                │
│       └─→ params ─→ toolbar filter state                            │
│                                                                      │
│  useBrands(true) ─────────────→ GET /catalog/brands/?active=true     │
│       └─→ brands[] ─→ Brand filter dropdown + ForkliftForm          │
│                                                                      │
│  TOTAL CALLS: 2 on page load (forklifts + brands)                   │
│  INCREMENTAL: 1 call per filter/page change (forklifts)             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ FORKLIFT DETAIL PAGE                                                 │
│                                                                      │
│  getForklift(id) ─────────────→ GET /forklifts/:id                   │
│       │                                                              │
│       ├─→ forklift ─→ AssetHeader (name, serial, badges)            │
│       ├─→ forklift ─→ QuickActionBar (status-aware actions)         │
│       │                                                              │
│       ├─→ Overview Tab:                                              │
│       │   ├─→ forklift ─→ SpecificationsCard (fuel, capacity, etc.) │
│       │   ├─→ .current_location ─→ LocationCard                    │
│       │   ├─→ .notes ─→ NotesBlock                                  │
│       │   ├─→ .current_hour_meter + .initial_hour_meter             │
│       │   │       + .created_at ─→ HourMeterWidget                  │
│       │   ├─→ .purchase_date + .warranty_expiry + .condition        │
│       │   │       + counts ─→ AssetSummaryCard                      │
│       │   └─→ .customer ─→ CustomerLinkCard                        │
│       │                                                              │
│       ├─→ Photos Tab:                                                │
│       │   └─→ .photos[] ─→ PhotoGallery                             │
│       │                                                              │
│       ├─→ Timeline Tab:                                              │
│       │   └─→ .recent_status_history[] ─→ StatusTimeline            │
│       │                                                              │
│       ├─→ Documents Tab:                                             │
│       │   └─→ .documents[] ─→ DocumentsTable                       │
│       │                                                              │
│       └─→ Contracts Tab:                                             │
│           └─→ .serial_number ─→ LinkedContractsPanel (cross-link)   │
│                                                                      │
│  TOTAL CALLS: 1 per detail page view (GET /forklifts/:id)           │
│  ALL widget data derived from that single response.                  │
│  ZERO additional API calls.                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Responsive Behavior

| Component | Desktop (≥1280) | Laptop (1024-1279) | Tablet (768-1023) | Mobile (<768) |
|---|---|---|---|---|
| **FleetStatusStrip** | Single row | Single row | Horizontal scroll | Horizontal scroll |
| **FleetStatsBar** | 4 columns | 4 columns | 2 columns | 2 columns (< 420: 1) |
| **FleetCard grid** | 3 cols `minmax(280px,1fr)` | 2 cols | 2 cols | 1 col |
| **List table** | All cols visible | Hide: year | Hide: year, fuel | Card-list view |
| **AssetHeader** | Horizontal, actions inline | Horizontal | Stack: info + actions | Full stack |
| **TabBar** | Full, all visible | Full | Scrollable | Scrollable |
| **Overview content** | 2-col (58/42) | 2-col (55/45) | 1-col, sidebar widgets first | 1-col, widgets first |
| **PhotoGallery** | Large main + thumbs | Medium + thumbs | Full-width | Full-width, swipe |
| **Timeline** | Full, badges inline | Full | Compact: hide reason | Compact |
| **LocationCard** | Standard | Standard | Full-width | Full-width |

### Mobile List View (replaces table below 640px)

```
┌────────────────────────────────────┐
│ [📷]  Toyota 8FD25        ● Stock │
│       JH-2024-001 · Toyota        │
│       ⛽ Diesel · 🏗 1,600 kg      │
│       ⏱ 2,450 hrs                 │
│                                [→] │
├────────────────────────────────────┤
│ [📷]  Komatsu FD30       ● Rented │
│       KM-003 · Komatsu            │
│       ...                         │
└────────────────────────────────────┘

Tap card → navigate to detail
No hover effects (touch device)
No Edit/Delete inline (access via detail page)
```

---

## 6. File Inventory

### New Files (32)

```
src/components/equipment/
├── FleetStatusStrip.tsx + .css        (2)
├── FleetStatsBar.tsx + .css           (2)
├── FleetCard.tsx + .css               (2)     replaces ForkliftCard
├── FleetToolbar.tsx + .css            (2)
├── HourMeterBar.tsx + .css            (2)
├── HourMeterWidget.tsx + .css         (2)
├── AssetHeader.tsx + .css             (2)
├── AssetTabBar.tsx + .css             (2)
├── AssetSummaryCard.tsx + .css        (2)
├── LocationCard.tsx + .css            (2)
├── CustomerLinkCard.tsx + .css        (2)
├── SpecificationsCard.tsx + .css      (2)
├── QuickActionBar.tsx + .css          (2)
├── PhotoGallery.tsx + .css            (2)
├── StatusTimeline.tsx + .css          (2)
└── LinkedContractsPanel.tsx + .css    (2)

src/pages/Equipment/
├── EquipmentRegistryPage.css          (1)    NEW — own CSS, stop importing CatalogPage.css
└── ForkliftDetailPage.css             (1)    NEW — own CSS, stop importing ProductDetailPage.css
```

### Rewritten Files (2)

```
src/pages/Equipment/EquipmentRegistryPage.tsx    REWRITE
src/pages/Equipment/ForkliftDetailPage.tsx       REWRITE
```

### Unchanged Files (3)

```
src/pages/Equipment/ForkliftForm.tsx             UNCHANGED
src/components/equipment/ForkliftStatusBadge.tsx  UNCHANGED (reused everywhere)
src/components/ui/Badge.tsx                       UNCHANGED
```

### Deprecated (delete after migration)

```
src/components/equipment/ForkliftCard.tsx        REPLACED by FleetCard
src/components/equipment/ForkliftCard.css        REPLACED by FleetCard.css
```

---

## 7. Build Order

```
PHASE 1: Primitives (parallel)                              ~2 days
───────────────────────────────────────────────────────────────
  1.  HourMeterBar.tsx + .css
  2.  FleetStatusStrip.tsx + .css
  3.  FleetStatsBar.tsx + .css
  4.  LocationCard.tsx + .css
  5.  SpecificationsCard.tsx + .css
  6.  AssetSummaryCard.tsx + .css
  7.  CustomerLinkCard.tsx + .css
  8.  AssetTabBar.tsx + .css
  9.  LinkedContractsPanel.tsx + .css

PHASE 2: Rich components (some sequential)                   ~3 days
───────────────────────────────────────────────────────────────
  10. HourMeterWidget.tsx + .css      (uses HourMeterBar)
  11. FleetCard.tsx + .css            (uses HourMeterBar + StatusBadge)
  12. FleetToolbar.tsx + .css
  13. PhotoGallery.tsx + .css
  14. StatusTimeline.tsx + .css
  15. QuickActionBar.tsx + .css
  16. AssetHeader.tsx + .css          (uses QuickActionBar + StatusBadge)

PHASE 3: Page assembly                                       ~3 days
───────────────────────────────────────────────────────────────
  17. EquipmentRegistryPage.css (NEW, dedicated)
  18. EquipmentRegistryPage.tsx (REWRITE)
  19. ForkliftDetailPage.css (NEW, dedicated)
  20. ForkliftDetailPage.tsx (REWRITE)

PHASE 4: Cleanup + testing                                   ~2 days
───────────────────────────────────────────────────────────────
  21. Delete ForkliftCard.tsx + .css
  22. Remove CatalogPage.css import from EquipmentRegistryPage
  23. Remove ProductDetailPage.css import from ForkliftDetailPage
  24. Mobile test: 375px, 414px, 768px, 1024px
  25. Tab navigation + keyboard test
  26. Status change flow test (all 6 states)

TOTAL: ~10 working days
```

---

## 8. Verification Checklist

```
LIST PAGE
  [ ] Fleet header shows total count and action buttons
  [ ] FleetStatusStrip shows correct counts per status
  [ ] Clicking status chip filters the grid
  [ ] Active chip visually distinguished
  [ ] "All" chip clears status filter
  [ ] FleetStatsBar shows utilization, avg hours, PM due, avg age
  [ ] PM due card shows critical count (>4500 hrs)
  [ ] Grid view renders FleetCard with all fields
  [ ] FleetCard shows photo (or placeholder)
  [ ] FleetCard shows HourMeterBar with correct color
  [ ] FleetCard shows customer name when rented
  [ ] FleetCard hover shows View + Edit buttons
  [ ] Card click navigates to detail page
  [ ] List view renders table rows with thumbnails
  [ ] Search filters by serial, name, model
  [ ] Brand, fuel, condition dropdowns filter correctly
  [ ] Clear button resets all filters
  [ ] View toggle switches grid ↔ list
  [ ] Pagination works in both views
  [ ] Mobile card-list view below 640px
  [ ] Skeleton loading for both views
  [ ] Empty state renders correctly
  [ ] Register Forklift opens existing modal form

DETAIL PAGE — HEADER
  [ ] AssetHeader shows photo thumbnail, name, serial, brand, year
  [ ] Status badge, condition badge, active indicator all render
  [ ] Edit button opens ForkliftForm modal
  [ ] Change Status dropdown shows valid transitions only
  [ ] Status change calls updateForklift API
  [ ] New Quote navigates to /quotations/new
  [ ] New Contract navigates to /rental-contracts/new
  [ ] More menu items work (switch to Photos tab, etc.)

DETAIL PAGE — TABS
  [ ] Tab bar renders 5 tabs with correct counts
  [ ] Tab state persisted in URL hash
  [ ] Browser back navigates between tabs
  [ ] Default tab is Overview

DETAIL PAGE — OVERVIEW TAB
  [ ] SpecificationsCard shows fuel/capacity/year chips + detail rows
  [ ] Null fields show "—" gracefully
  [ ] LocationCard shows location data (or empty state)
  [ ] NotesBlock shows forklift.notes (or hidden if null)
  [ ] HourMeterWidget shows large number, progress bar, computed stats
  [ ] Daily average computed correctly from created_at
  [ ] Est. service date computed (if daily avg > 0)
  [ ] AssetSummaryCard shows purchase date, age, warranty status
  [ ] Warranty: green if future, red if past, "—" if null
  [ ] Document/photo counts accurate
  [ ] CustomerLinkCard shows customer (or hidden if null)
  [ ] Responsive: 2-col → 1-col below 768px

DETAIL PAGE — PHOTOS TAB
  [ ] Gallery shows all photos from ForkliftDetail.photos[]
  [ ] Primary photo selected by default
  [ ] Thumbnails clickable
  [ ] Arrow navigation works
  [ ] Image counter shows "N / total"
  [ ] Click opens lightbox
  [ ] Lightbox: arrows, thumbnails, Esc close, keyboard nav
  [ ] Caption and taken_at displayed
  [ ] Empty state when no photos

DETAIL PAGE — TIMELINE TAB
  [ ] Renders vertical timeline from recent_status_history[]
  [ ] Each entry shows from → to badges with arrow
  [ ] Reason text shown (or "—")
  [ ] User name shown
  [ ] Dates formatted correctly
  [ ] Most recent entry at top
  [ ] Empty state when no history

DETAIL PAGE — DOCUMENTS TAB
  [ ] Table shows all documents from ForkliftDetail.documents[]
  [ ] Title is clickable link to file_url
  [ ] Document type formatted (underscores → spaces)
  [ ] Expiry date shown with warning if past
  [ ] Empty state when no documents

DETAIL PAGE — CONTRACTS TAB
  [ ] Shows cross-link to rental contracts with serial number search
  [ ] Link navigates correctly

PRESERVED FUNCTIONALITY
  [ ] Routes unchanged: /equipment, /equipment/:id
  [ ] ForkliftForm works for create and edit
  [ ] ForkliftStatusBadge and ForkliftConditionBadge unchanged
  [ ] All API calls unchanged
  [ ] No backend / database / API changes
```
