# DK Service Design System

**Platform:** DK Service Enterprise — Material Handling & Forklift Rental  
**Theme Direction:** Blue + Bright Green + White + Dark Gray  
**Inspiration:** JenStore (e-commerce warmth), Fleetio (operational density), Linear (craft & precision)  
**Date:** 2026-06-21

---

## Design Philosophy

| Principle | From | Application |
|---|---|---|
| **Warmth in commerce** | JenStore | Hero gradients, brand showcases, product galleries |
| **Operational density** | Fleetio | Compact tables, stat strips, fleet overview dashboards |
| **Craft & precision** | Linear | Sharp typography, restrained motion, monochrome surfaces with bold accent pops |
| **Clarity through status** | Samsara | Every equipment unit, quotation, and contract communicates its state at a glance |

---

## 1. Color Tokens

### 1.1 Core Palette

The four-color foundation: **Blue** (action, trust), **Bright Green** (success, availability), **White** (surface, clarity), **Dark Gray** (text, depth).

```
TOKEN NAME                    HEX        ROLE
──────────────────────────── ────────── ──────────────────────────────────────

PRIMARY — Brand Blue (action, navigation, links)
--color-primary-25            #f0f7ff    Faintest tint — selected table row
--color-primary-50            #eff6ff    Light tint — active nav background
--color-primary-100           #dbeafe    Hover states, focus rings
--color-primary-200           #bfdbfe    Borders on primary elements
--color-primary-300           #93c5fd    Disabled primary buttons
--color-primary-400           #60a5fa    Active sidebar nav text
--color-primary-500           #3b82f6    Default interactive blue
--color-primary-600           #2563eb    ★ Primary button background
--color-primary-700           #1d4ed8    Primary button hover
--color-primary-800           #1e40af    Primary button pressed
--color-primary-900           #1e3a5f    Hero banner gradient end

SUCCESS — Bright Green (available, active, confirmed)
--color-success-25            #f0fdf9    Faintest tint
--color-success-50            #f0fdf4    Badge background, toast bg
--color-success-100           #dcfce7    Border
--color-success-200           #bbf7d0    Subtle emphasis
--color-success-300           #86efac    Toast border
--color-success-400           #4ade80    Chart fill
--color-success-500           #22c55e    ★ Primary green — status dot, icon
--color-success-600           #16a34a    Green text on light bg
--color-success-700           #15803d    Darker green text
--color-success-800           #166534    —
--color-success-900           #14532d    —

WARNING — Amber (pending, attention needed, approaching threshold)
--color-warning-25            #fffcf0
--color-warning-50            #fffbeb    Badge background
--color-warning-100           #fef3c7    Border
--color-warning-200           #fde68a    Emphasis
--color-warning-300           #fcd34d    Chart fill
--color-warning-400           #fbbf24    —
--color-warning-500           #f59e0b    ★ Primary amber — icon, dot
--color-warning-600           #d97706    Amber text
--color-warning-700           #b45309    Darker amber
--color-warning-800           #92400e    —
--color-warning-900           #78350f    Internal note text

DANGER — Red (error, overdue, rejected, destructive)
--color-danger-25             #fff5f5
--color-danger-50             #fef2f2    Badge background, error toast bg
--color-danger-100            #fee2e2    Hover on danger actions
--color-danger-200            #fecaca    Error border, toast border
--color-danger-300            #fca5a5    Subtle emphasis
--color-danger-400            #f87171    —
--color-danger-500            #ef4444    ★ Primary red — error icon, dot
--color-danger-600            #dc2626    Danger button, red text
--color-danger-700            #b91c1c    Error banner text, hover
--color-danger-800            #991b1b    —
--color-danger-900            #7f1d1d    —

INFO — Cyan (informational, neutral status, reserved)
--color-info-50               #ecfeff
--color-info-100              #cffafe
--color-info-200              #a5f3fc
--color-info-300              #67e8f9
--color-info-400              #22d3ee
--color-info-500              #06b6d4    ★ Primary cyan
--color-info-600              #0891b2    Cyan text
--color-info-700              #0e7490    —

PURPLE (rented status, featured, special indicators)
--color-purple-50             #f5f3ff
--color-purple-100            #ede9fe
--color-purple-200            #ddd6fe
--color-purple-300            #c4b5fd
--color-purple-400            #a78bfa
--color-purple-500            #8b5cf6    ★ Primary purple
--color-purple-600            #7c3aed    Purple text, rented badge
--color-purple-700            #6d28d9    —
```

### 1.2 Neutral Palette — White to Dark Gray

```
TOKEN NAME                    HEX        LIGHT THEME ROLE
──────────────────────────── ────────── ──────────────────────────────────────

SURFACES
--color-white                 #ffffff    Pure white — modals, raised cards
--color-gray-25               #fcfcfd    Extremely subtle off-white
--color-gray-50               #f8fafc    ★ Page background (--color-bg)
--color-gray-100              #f1f5f9    Subtle bg — table row hover, input bg
--color-gray-200              #e2e8f0    ★ Borders (--color-border)
--color-gray-300              #cbd5e1    Strong borders, dividers
--color-gray-400              #94a3b8    ★ Muted text (--color-text-muted)
--color-gray-500              #64748b    Secondary text
--color-gray-600              #475569    Body text secondary
--color-gray-700              #334155    —
--color-gray-800              #1e293b    ★ Body text primary (--color-text)
--color-gray-900              #0f172a    ★ Sidebar background, headings
--color-gray-950              #020617    Near-black for maximum contrast
```

### 1.3 Semantic Aliases

```
LIGHT THEME (:root)                     DARK THEME ([data-theme="dark"])
──────────────────────────────────────  ──────────────────────────────────────

SURFACES
--color-bg             → gray-50         --color-bg             → #0f1117
--color-bg-subtle      → gray-100        --color-bg-subtle      → #1a1d27
--color-surface        → white           --color-surface        → #1e2130
--color-surface-raised → white           --color-surface-raised → #252836
--color-surface-overlay→ white           --color-surface-overlay→ #2d3148

BORDERS
--color-border         → gray-200        --color-border         → #2d3148
--color-border-strong  → gray-300        --color-border-strong  → #3d4260
--color-border-focus   → primary-500     --color-border-focus   → primary-400

TEXT
--color-text           → gray-800        --color-text           → gray-100
--color-text-secondary → gray-600        --color-text-secondary → gray-400
--color-text-muted     → gray-400        --color-text-muted     → gray-500
--color-text-inverse   → white           --color-text-inverse   → gray-900
--color-text-link      → primary-600     --color-text-link      → primary-400

INTERACTIVE
--color-primary        → primary-600     --color-primary        → primary-500
--color-primary-hover  → primary-700     --color-primary-hover  → primary-400
--color-primary-active → primary-800     --color-primary-active → primary-300
--color-focus-ring     → primary-100     --color-focus-ring     → primary-900/40

SIDEBAR (always dark regardless of theme)
--sidebar-bg           → gray-900        --sidebar-bg           → #0a0e1a
--sidebar-text         → gray-400        --sidebar-text         → gray-500
--sidebar-text-hover   → gray-100        --sidebar-text-hover   → gray-300
--sidebar-text-active  → primary-400     --sidebar-text-active  → primary-300
--sidebar-border       → white/6%        --sidebar-border       → white/4%
--sidebar-active-bg    → primary-600/18% --sidebar-active-bg    → primary-500/15%
```

### 1.4 Module Accent Colors

Used for sidebar indicators, dashboard KPI card accents, and chart legends:

```
MODULE               COLOR       TOKEN
──────────────────── ────────── ────────────────────
Customers            #2563eb    --module-customers
Leads                #7c3aed    --module-leads
Product Catalog      #7c3aed    --module-catalog
Equipment Registry   #0d9488    --module-equipment
Quotations           #2563eb    --module-quotations
Rental Contracts     #0891b2    --module-rental
Activity             #0891b2    --module-activity
Reports              #d97706    --module-reports
```

---

## 2. Typography

### 2.1 Font Stack

```
PRIMARY:  'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif
MONO:     'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace

Loading: Google Fonts — Inter 400, 500, 600, 700
Fallback: system-ui renders immediately; Inter swaps in via font-display: swap
```

### 2.2 Type Scale

```
TOKEN           SIZE    WEIGHT  LINE-H  LETTER-SP  USE CASE
──────────────  ──────  ──────  ──────  ─────────  ──────────────────────────────
--text-2xs      10px    500     14px    +0.4px     Micro labels (status strip counts)
--text-xs       11px    500     16px    +0.3px     Badges, timestamps, table headers
--text-sm       12.5px  400     18px    normal     Form labels, card subtitles, meta
--text-base     14px    400     20px    normal     Body text, form inputs, table cells
--text-md       15px    500     22px    normal     Card titles, topbar page title
--text-lg       18px    600     26px    -0.2px     Page section headings
--text-xl       20px    700     28px    -0.3px     Page titles (h1)
--text-2xl      24px    700     32px    -0.5px     Dashboard section headings
--text-3xl      28px    700     36px    -0.6px     Hero titles, large KPI values
--text-4xl      32px    700     40px    -0.8px     Login page heading

MONO:
--text-mono     13px    400     20px    normal     SKUs, serial numbers, amounts, codes
```

### 2.3 Font Weight Scale

```
TOKEN              VALUE   USE CASE
──────────────────  ──────  ──────────────────────────
--font-normal       400     Body text, table cells
--font-medium       500     Form labels, nav items, badges
--font-semibold     600     Card titles, section headings, table headers
--font-bold         700     Page titles, KPI values, hero text
```

### 2.4 Current Codebase Audit — Font Sizes in Use

```
CURRENT (arbitrary)           → MAPS TO TOKEN
──────────────────────────── → ────────────────
10px   (micro labels)         → --text-2xs (10px)
10.5px (badge text)           → --text-xs  (11px)  ← normalize to 11
11px   (timestamps, chips)    → --text-xs  (11px)
11.5px (badge text)           → --text-xs  (11px)  ← normalize to 11
12px   (secondary text)       → --text-sm  (12.5px)← normalize to 12.5
12.5px (form labels)          → --text-sm  (12.5px)
13px   (filter inputs)        → --text-base(14px)  ← normalize to 14
13.5px (table cells, body)    → --text-base(14px)  ← normalize to 14
14px   (body, descriptions)   → --text-base(14px)
15px   (topbar title)         → --text-md  (15px)
16px   (modal title)          → --text-md  (15px)  ← normalize to 15
18px   (section heading)      → --text-lg  (18px)
20px   (page h1)              → --text-xl  (20px)
22px   (detail name)          → --text-2xl (24px)  ← normalize to 24
26px   (rate stat value)      → --text-3xl (28px)  ← normalize to 28
28px   (login subtitle)       → --text-3xl (28px)
30px   (stat card value)      → --text-3xl (28px)  ← normalize to 28
32px   (login heading)        → --text-4xl (32px)

Result: 18 arbitrary sizes → 11 systematic tokens
```

---

## 3. Buttons

### 3.1 Variants

```
VARIANT       BG                TEXT               BORDER                USE CASE
────────────  ────────────────  ─────────────────  ────────────────────  ──────────────────
Primary       --primary-600     white              --primary-600         Main CTA. One per view.
Secondary     transparent       --text-secondary   --border              Supporting actions.
Ghost         transparent       --text-muted       transparent           Toolbar, inline, tertiary.
Danger        --danger-600      white              --danger-600          Delete, decommission.
DangerGhost   transparent       --danger-600       transparent           Inline danger actions.
Link          transparent       --primary-600      none                  Inline navigation text.

HOVER STATES:
  Primary     → bg: --primary-700, border: --primary-700
  Secondary   → bg: --bg-subtle, text: --text, border: --border-strong
  Ghost       → bg: --bg-subtle, text: --text
  Danger      → bg: --danger-700, border: --danger-700
  DangerGhost → bg: --danger-50, text: --danger-700
  Link        → text: --primary-700, text-decoration: underline
```

### 3.2 Sizes

```
SIZE   HEIGHT  PADDING (h/v)   FONT    ICON   RADIUS         USE CASE
─────  ──────  ──────────────  ──────  ─────  ─────────────  ───────────────────
xs     24px    2px  8px        11px    14px   --radius-sm    Inline row actions
sm     30px    4px  10px       12.5px  14px   --radius       Toolbar, compact UI
md     36px    6px  14px       14px    16px   --radius       ★ Default everywhere
lg     42px    8px  18px       14px    18px   --radius       Hero CTAs, form submit
xl     48px    10px 24px       15px    20px   --radius-md    Login button, hero search

All buttons:
  font-weight: 500
  gap: 6px (between icon and label)
  cursor: pointer
  transition: all var(--duration-fast) var(--ease-default)
  display: inline-flex; align-items: center; justify-content: center;

DISABLED state (all variants):
  opacity: 0.5
  cursor: not-allowed
  pointer-events: none

LOADING state:
  Spinner replaces icon (or appears left of text)
  Text stays visible
  Button disabled
  Minimum width maintained (no layout shift)

FOCUS state (all variants):
  outline: none
  box-shadow: 0 0 0 3px var(--color-focus-ring)
```

### 3.3 Icon-Only Button

```
SIZE   DIMENSIONS   ICON   RADIUS
─────  ───────────  ─────  ─────────────
sm     28px × 28px  14px   --radius
md     34px × 34px  16px   --radius
lg     40px × 40px  18px   --radius-md

aria-label: REQUIRED for accessibility
Tooltip: shows on hover (300ms delay)
```

### 3.4 Button Group

```
Adjacent buttons sharing a border:

  ┌──────┬──────┬──────┐
  │ Grid │ List │ Map  │
  └──────┴──────┴──────┘

  Container: overflow hidden, shared border, --radius
  Items: no individual border-radius, border-right between items
  Active: --primary-600 bg, white text
  Inactive: --surface bg, --text-muted text
```

---

## 4. Cards

### 4.1 Base Card

```
TOKEN/PROPERTY         VALUE
─────────────────────  ──────────────────────────────────
background             var(--color-surface)
border                 1px solid var(--color-border)
border-radius          var(--radius-lg)     12px
padding                var(--space-5)       20px
box-shadow             var(--shadow-sm)

VARIANTS:
  Flat       → no shadow, border only
  Raised     → shadow-sm (default)
  Elevated   → shadow-md (dropdowns, popovers)
  Interactive→ cursor: pointer, hover: shadow-md + border-primary-100
```

### 4.2 Card Anatomy

```
┌────────────────────────────────────────┐
│  CARD HEADER (optional)                │  padding: 16px 20px
│  Title              [Action]           │  border-bottom: 1px border
├────────────────────────────────────────┤
│                                        │
│  CARD BODY                             │  padding: 20px
│  Main content area                     │
│                                        │
├────────────────────────────────────────┤
│  CARD FOOTER (optional)               │  padding: 12px 20px
│  View All →                            │  border-top: 1px border
└────────────────────────────────────────┘
```

### 4.3 Specialized Card Types

```
TYPE             ACCENT    HEADER              BODY
───────────────  ────────  ──────────────────  ──────────────────────
StatCard         3px top   Icon + Label        Large value + trend
ChartCard        none      Title + Sub         Chart content
FleetCard        none      Photo + badges      Name + meta + meter bar
KpiCard          3px top   Icon + Label        Value + alert badge
LocationCard     pin icon  "Current Location"  Address + zone + date
SummaryCard      none      "Asset Summary"     Key-value rows
```

---

## 5. Tables

### 5.1 Base Table

```
ELEMENT             STYLE
──────────────────  ──────────────────────────────────────
.table-card         Card wrapper: surface, border, radius-lg, overflow hidden
.data-table         width: 100%, border-collapse: collapse

HEADER ROW:
  background        var(--color-bg-subtle)
  padding           10px 14px
  font-size         var(--text-xs)     11px
  font-weight       var(--font-semibold)  600
  text-transform    uppercase
  letter-spacing    0.5px
  color             var(--color-text-muted)
  border-bottom     1px solid var(--color-border)

DATA ROW:
  padding           12px 14px
  font-size         var(--text-base)   14px
  color             var(--color-text)
  border-bottom     1px solid var(--color-border)
  &:last-child      border-bottom: none
  &:hover           background: var(--color-primary-25)

SORTABLE HEADER:
  cursor            pointer
  user-select       none
  &:hover           color: var(--color-text)
  Active indicator  primary-500 color, arrow icon

ROW ACTIONS:
  Column width      80px (fixed)
  Buttons           icon-only, 28px, ghost variant
  Visible           always on mobile, hover-only on desktop

SELECTED ROW:
  background        var(--color-primary-25)
  left border       3px solid var(--color-primary-500)
```

### 5.2 Table States

```
LOADING (Skeleton):
  8 rows of skeleton cells
  Height: 14px per cell
  Background: var(--color-gray-200)
  Animation: pulse 1.4s ease-in-out infinite
  Staggered widths: 60%, 70%, 45%, 80%... for visual variety

EMPTY:
  Centered content, 56px vertical padding
  Icon: 36px, muted, 35% opacity
  Title: 14px, muted
  Subtitle: 12px, 70% opacity
  CTA button (optional): primary, md size

ERROR:
  Red banner above table: danger-50 bg, danger-200 border, danger-700 text
  AlertCircle icon + message + Retry button
```

### 5.3 Pagination

```
┌──────────────────────────────────────────────────────────────┐
│  Page 1 of 8 (152 total)        ◀  1  2  3  ...  8  ▶      │
└──────────────────────────────────────────────────────────────┘

.pagination         padding: 12px 16px, border-top: 1px
.pagination-info    text-xs, muted
.page-btn           min-width: 32px, height: 32px, radius: --radius
  .active           primary-600 bg, white text, bold
  :disabled         40% opacity
  :hover            bg-subtle
```

### 5.4 Responsive Table Rules

```
≥ 1024px   All columns visible
768-1023px Hide lowest-priority columns (.col-hide-md)
640-767px  Hide more columns (.col-hide-sm)
< 640px    REPLACE table with card-list view:

  ┌────────────────────────────────────┐
  │ [img] Name                 Status │
  │       Serial · Brand              │
  │       Meta line                   │
  │                               [→] │
  └────────────────────────────────────┘
```

---

## 6. Forms

### 6.1 Input Tokens

```
PROPERTY              VALUE
────────────────────  ──────────────────────────────
height                36px (md), 42px (lg — login)
padding               8px 12px
font-size             var(--text-base)   14px
font-family           inherit
color                 var(--color-text)
background            var(--color-bg-subtle)
border                1px solid var(--color-border)
border-radius         var(--radius)      6px
transition            border-color var(--duration-fast),
                      box-shadow var(--duration-fast)

:focus
  border-color        var(--color-primary-500)
  box-shadow          0 0 0 3px var(--color-primary-100)
  outline             none

:disabled
  opacity             0.5
  cursor              not-allowed
  background          var(--color-bg)

::placeholder
  color               var(--color-text-muted)
```

### 6.2 Form Layout

```
.form-grid            flex column, gap: 14px
.form-row-2           grid 2-col (1fr 1fr), gap: 12px
                      @media < 640px → single column
.form-row-3           grid 3-col, gap: 12px
                      @media < 768px → 2-col, < 640px → 1-col
.form-group           flex column, gap: 5px

Label:
  font-size           var(--text-sm)     12.5px
  font-weight         var(--font-medium) 500
  color               var(--color-text)

Required indicator:
  .required           color: var(--color-danger-600), content: "*"

Error message:
  font-size           var(--text-xs)     11px
  color               var(--color-danger-600)
  margin-top          4px
  linked via          aria-describedby to the input
```

### 6.3 Input Variants

```
TYPE              NOTES
────────────────  ──────────────────────────────────────
Text input        Standard, with optional prefix/suffix icons
Select            Native <select> with custom arrow icon
Textarea          min-height: 80px, resize: vertical
Date input        Native <input type="date">
Number input      Native <input type="number">, tabular-nums
Checkbox          Custom: 18px box, primary check, rounded 3px
Radio             Custom: 18px circle, primary fill
Toggle/Switch     Future — not currently in use
Search input      Left-aligned Search icon, clear button on right
Prefix input      "฿" prefix before value (for currency)
```

### 6.4 Form-Level Patterns

```
ERROR BANNER (above form):
  Display: flex, align-items: center, gap: 10px
  Background: var(--color-danger-50)
  Border: 1px solid var(--color-danger-200)
  Color: var(--color-danger-700)
  Border-radius: var(--radius-md)
  Padding: 12px 16px
  Icon: AlertCircle (Lucide)

FORM ACTIONS (bottom):
  Display: flex, justify-content: flex-end, gap: 8px
  Margin-top: 8px
  Primary button right, Cancel button left

MODAL FORM:
  Max height: 90vh, overflow-y: auto on body
  Width: 480px (simple), 560px (medium), 660px (complex)

FULL-PAGE FORM:
  Max-width: 700px
  Surface card wrapper with padding 24px
  Back button above form
```

---

## 7. Status Badges

### 7.1 Badge Anatomy

```
┌─────────────┐
│ ● In Stock  │
└─────────────┘

Height: auto (content-driven)
Padding: 2px 9px
Border-radius: var(--radius-full) — 9999px (pill shape)
Font-size: var(--text-xs) — 11px
Font-weight: var(--font-semibold) — 600
Letter-spacing: 0.3px
Display: inline-flex, align-items: center
```

### 7.2 Badge Color Registry

```
VARIANT    BACKGROUND        TEXT COLOR        BORDER              USE CASES
─────────  ────────────────  ────────────────  ──────────────────  ──────────────────────
green      --success-50      --success-600     --success-300       Active, In Stock, Won,
           #f0fdf4           #16a34a           #86efac             Accepted, Approved, New (cond.)

amber      --warning-50      --warning-600     --warning-300       Pending, In Service,
           #fffbeb           #d97706           #fcd34d             Qualified, Under Review,
                                                                   Returning, Used (cond.)

red        --danger-50       --danger-600      --danger-300        Overdue, Rejected, Lost,
           #fef2f2           #dc2626           #fca5a5             Decommissioned, Cancelled

blue       --primary-50      --primary-600     --primary-200       Sold, Approved (qt.),
           #eff6ff           #2563eb           #93c5fd             For Sale, Refurbished (cond.)

purple     --purple-50       --purple-600      --purple-300        Rented, Revision,
           #f5f3ff           #7c3aed           #c4b5fd             For Rental, Settling

cyan       --info-50         --info-600        --info-300          Reserved, Sent, Inspecting,
           #ecfeff           #0891b2           #67e8f9             Delivering, Contacted

gray       --gray-100        --gray-500        --gray-200          Draft, Inactive, Expired,
           #f1f5f9           #64748b           #e2e8f0             Reservation, Cancelled,
                                                                   Decommissioned (alt.)
```

### 7.3 Status Mapping — Complete Cross-Module Reference

```
MODULE: EQUIPMENT (ForkliftStatus)
  in_stock         → green       "In Stock"
  rented           → purple      "Rented"
  in_service       → amber       "In Service"
  reserved         → cyan        "Reserved"
  sold             → blue        "Sold"
  decommissioned   → red         "Decommissioned"

MODULE: EQUIPMENT (ForkliftCondition)
  new              → green       "New"
  used             → amber       "Used"
  refurbished      → blue        "Refurbished"

MODULE: QUOTATION (QuotationStatus)
  draft            → gray        "Draft"
  under_review     → amber       "Under Review"
  approved         → blue        "Approved"
  revision         → purple      "Revision"
  sent             → cyan        "Sent"
  accepted         → green       "Accepted"
  rejected         → red         "Rejected"
  expired          → gray        "Expired"
  converted        → green       "Converted"
  cancelled        → gray        "Cancelled"

MODULE: QUOTATION (QuotationType)
  rental           → blue        "Rental"
  sales            → green       "Sales"
  service          → amber       "Service"
  spare_parts      → purple      "Spare Parts"

MODULE: RENTAL (RentalContractStatus)
  reservation      → gray        "Reservation"
  draft            → gray        "Draft"
  pending_approval → amber       "Pending Approval"
  approved         → blue        "Approved"
  revision         → purple      "Revision"
  delivering       → cyan        "Delivering"
  active           → green       "Active"
  overdue          → red         "Overdue"
  returning        → amber       "Returning"
  inspecting       → cyan        "Inspecting"
  settling         → purple      "Settling"
  closed           → green       "Closed"
  cancelled        → gray        "Cancelled"

MODULE: RENTAL (ContractType)
  short_term       → blue        "Short Term"
  long_term        → green       "Long Term"
  project          → purple      "Project"

MODULE: CRM (CustomerStatus)
  active           → green       "Active"
  prospect         → amber       "Prospect"
  inactive         → gray        "Inactive"
  churned          → red         "Churned"

MODULE: CRM (LeadStatus)
  new              → purple      "New"
  contacted        → cyan        "Contacted"
  qualified        → amber       "Qualified"
  proposal         → blue        "Proposal"
  won              → green       "Won"
  lost             → red         "Lost"

MODULE: CATALOG (Product Type Badges)
  is_sale          → green       "For Sale"
  is_rental        → blue        "For Rental"
  is_featured      → amber       "Featured"        (uses gold star icon)
  is_service_item  → amber       "Service Item"
  is_used_available→ cyan        "Used Available"
  !is_active       → gray        "Inactive"
```

---

## 8. Icons

### 8.1 System

```
Library:    Lucide React (already in use — keep)
Package:    lucide-react (v1.18.0)
Tree-shaking: import individual icons only (current practice — maintain)
```

### 8.2 Size Scale

```
TOKEN       SIZE   STROKE  USE CASE
──────────  ─────  ──────  ──────────────────────────────────
--icon-xs   12px   1.5     Inline with text-xs (badges, chips)
--icon-sm   14px   1.75    ★ Table actions, form icons, nav items
--icon-md   16px   1.75    ★ Buttons, sidebar nav, toolbar
--icon-lg   18px   2.0     Stat cards, section headers
--icon-xl   20px   2.0     Page headers, feature highlights
--icon-2xl  24px   2.0     Empty states, hero elements
--icon-3xl  36px   1.5     Empty state illustrations
--icon-4xl  48px   1.25    Category slider icons, hero features
```

### 8.3 Icon Usage by Context

```
CONTEXT                    SIZE     EXAMPLES
───────────────────────── ────────  ────────────────────────────────
Navigation items           16px     LayoutDashboard, Users, Truck, FileText
Toolbar buttons            14-16px  Search, Plus, RefreshCw, LayoutGrid
Table row actions          14px     Pencil, Trash2, MoreHorizontal
Stat card accent           18px     Users, Trophy, Percent, TrendingUp
Form field icons           14px     Search (in search input), AlertCircle
Badge inline               10-11px  Wrench, ShoppingCart, Star
Status indicators          13px     Tag, Fuel, Gauge, Calendar, Clock
Page headers               16-18px  Clock, FileText, MapPin
Empty state illustration   36-48px  Package, Truck, FileText (muted, 35% opacity)
Breadcrumb separator       14px     ChevronRight
Sidebar section arrow      12px     ChevronDown, ChevronRight
Modal close                16px     X
Toast type icon            16px     CheckCircle, XCircle, Info
```

### 8.4 Icon Color Rules

```
1. Navigation icons:     inherit from parent text color
2. Status icons:         use corresponding status color
3. Interactive icons:    --color-text-muted default, --color-text on hover
4. Decorative icons:     --color-text-muted at 35% opacity (empty states)
5. Danger actions:       --color-danger-600 on hover
6. Stat card icons:      icon-specific accent color (per card)
```

---

## 9. Spacing System

### 9.1 Base Unit

```
Base: 4px
All spacing values are multiples of 4px.
```

### 9.2 Scale

```
TOKEN       VALUE   COMMON USAGE
──────────  ──────  ──────────────────────────────────────────────
--space-0   0px     Reset
--space-0.5 2px     Tight inline gaps (badge icon-to-text)
--space-1   4px     Icon gaps, tight inline spacing
--space-1.5 6px     Button icon-text gap, tight component gaps
--space-2   8px     Compact element gaps, badge padding-v
--space-2.5 10px    Nav item horizontal padding, chip gaps
--space-3   12px    Form group gaps, card inner padding, table cell padding
--space-3.5 14px    Form-grid gaps, nav item vertical padding
--space-4   16px    ★ Standard padding, section gaps, grid gaps
--space-5   20px    ★ Card body padding, page header margin
--space-6   24px    Card padding (large), section spacing
--space-7   28px    Page content padding (desktop)
--space-8   32px    ★ Dashboard section gaps, major separators
--space-10  40px    Empty state vertical padding
--space-12  48px    Hero section padding
--space-14  56px    Empty state illustration padding, topbar height
--space-16  64px    Major page-level vertical rhythm
--space-20  80px    Hero banner padding
```

### 9.3 Spacing Usage Patterns

```
PATTERN                    TOKEN(S)        PIXELS
─────────────────────────  ──────────────  ──────
Page content padding       --space-7       28px (desktop), --space-4 / 16px (mobile)
Page content max-width     1440px          (via --content-max-width)
Section gap (dashboard)    --space-8       32px
Card body padding          --space-5       20px
Card header padding        --space-4 / 5   16px-20px h, 16px v
Table cell padding         --space-3       10px h, 12px v
Form group gap             --space-3.5     14px
Form row gap               --space-3       12px
Button content gap         --space-1.5     6px
Nav item padding           --space-2.5 / 3.5   10px h, 14px v
Icon-to-text gap           --space-1.5     6px
Badge padding              --space-0.5 / 2.5   2px v, 9px h
Modal body padding         --space-5 / 6   20px-24px
Toolbar item gap           --space-2.5     10px
Grid card gap              --space-4       16px
```

### 9.4 Current Codebase Audit — Spacing in Use

```
CURRENT (arbitrary)          → MAPS TO TOKEN
───────────────────────────  → ────────────────
1px (margins between cards)   → keep (structural, not spatial)
2px (badge padding vertical)  → --space-0.5
3px (tight gap)               → --space-1 (normalize to 4px)
4px (icon gaps)               → --space-1
5px (form label gap)          → --space-1 (normalize to 4px) or keep
6px (button gap)              → --space-1.5
8px (compact gaps)            → --space-2
9px (badge padding h)         → keep (component-specific)
10px (nav padding)            → --space-2.5
12px (card padding, cells)    → --space-3
14px (nav item v-pad)         → --space-3.5
16px (standard padding)       → --space-4
18px (nav side padding)       → --space-4 (normalize to 16px) or keep
20px (card body padding)      → --space-5
24px (section spacing)        → --space-6
28px (content padding)        → --space-7
32px (dashboard gaps)         → --space-8
56px (empty state padding)    → --space-14

Result: 19 arbitrary values → 16 systematic tokens
```

---

## 10. Responsive System

### 10.1 Breakpoints

```
TOKEN      NAME        WIDTH     TYPICAL DEVICE
─────────  ──────────  ────────  ──────────────────────────────
--bp-xs    mobile      < 420px   iPhone SE, small Android
--bp-sm    mobile-lg   < 640px   iPhone 14/15, standard phones
--bp-md    tablet      < 768px   iPad Mini portrait
--bp-lg    laptop      < 1024px  iPad landscape, small laptops
--bp-xl    desktop     < 1280px  Standard desktop monitors
--bp-2xl   widescreen  < 1536px  Large/ultra-wide monitors
```

### 10.2 Layout Behavior at Each Breakpoint

```
ELEMENT               ≥1280        1024-1279     768-1023      640-767       <640
────────────────────  ───────────  ────────────  ────────────  ────────────  ──────────
Sidebar               248px open   248px open    68px rail     hidden        hidden
Topbar left offset    248px        248px         68px          0             0
Content padding       28px         28px          20px          16px          16px
Content max-width     1440px       1440px        100%          100%          100%

KPI grid              4 cols       4 cols        3 cols        2 cols        1 col
Dashboard charts      2 cols       2 cols        1 col         1 col         1 col
Dashboard tasks       3 cols       2 cols        2 cols        1 col         1 col

Product grid          3 cols       3 cols        2 cols        2 cols        1 col
Equipment grid        3 cols       3 cols        2 cols        2 cols        1 col

Detail 2-col layout   58/42%       55/45%        100% (stack)  100%          100%
Form 2-col rows       2 cols       2 cols        2 cols        2 cols        1 col

Data tables           all cols     hide 1 col    hide 2 cols   card-list     card-list
Filter sidebar        visible      visible       drawer        drawer        drawer
Mega menu panel       3 cols       2 cols        2 cols        accordion     accordion
Category slider       5 cards      4 cards       3 cards       2.5 cards     2 cards
Brand showcase        6 cards      5 cards       3.5 cards     2.5 cards     2 cards
```

### 10.3 Container System

```
.app-content
  padding:      var(--space-7) var(--space-7)    // 28px
  max-width:    var(--content-max-width)          // 1440px
  
  @media < 768px:
    padding:    var(--space-5) var(--space-4)     // 20px 16px

.page-wide
  max-width:    100%                              // dashboard, full-bleed sections

.page-narrow
  max-width:    800px                             // forms, single-column content

.page-detail
  max-width:    1100px                            // detail pages
```

### 10.4 Touch Target Rules

```
Minimum interactive size:     44px × 44px (WCAG 2.5.8 AAA)
Minimum on constrained UI:   34px × 34px (current buttons — acceptable)
Spacing between targets:      8px minimum

Mobile-specific:
  Table rows:    min-height 48px (touch)
  Nav items:     min-height 44px
  Buttons:       min-height 42px
  Filter chips:  min-height 36px
  Pagination:    min-height 40px

Not required on desktop where mouse precision is higher.
Apply via @media (pointer: coarse) { } for touch devices.
```

### 10.5 Utility Classes

```
DISPLAY UTILITIES:
  .hide-below-xs   { @media < 420px: display: none }
  .hide-below-sm   { @media < 640px: display: none }   (existing: .col-hide-sm)
  .hide-below-md   { @media < 768px: display: none }
  .hide-below-lg   { @media < 1024px: display: none }
  .show-below-sm   { @media ≥ 640px: display: none }
  .show-below-md   { @media ≥ 768px: display: none }
  .show-below-lg   { @media ≥ 1024px: display: none }

TEXT UTILITIES:
  .text-truncate   { overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
  .line-clamp-2    { display: -webkit-box; -webkit-line-clamp: 2; overflow: hidden }
  .line-clamp-3    { display: -webkit-box; -webkit-line-clamp: 3; overflow: hidden }
  .text-mono       { font-family: var(--font-mono); font-variant-numeric: tabular-nums }

LAYOUT UTILITIES:
  .sr-only         { visually hidden, accessible to screen readers }
  .scroll-x        { overflow-x: auto; scroll-snap-type: x mandatory }
```

---

## Appendix A: Shadow System

```
TOKEN          VALUE                                             USE CASE
─────────────  ───────────────────────────────────────────────  ────────────────────
--shadow-none  none                                             Flat elements
--shadow-xs    0 1px 2px rgba(0,0,0,0.04)                      Subtle lift (buttons)
--shadow-sm    0 1px 3px rgba(0,0,0,0.1),                      ★ Cards (default)
               0 1px 2px rgba(0,0,0,0.06)
--shadow-md    0 4px 6px -1px rgba(0,0,0,0.1),                 Dropdowns, popovers
               0 2px 4px -1px rgba(0,0,0,0.06)
--shadow-lg    0 10px 15px -3px rgba(0,0,0,0.1),               Modals, command palette
               0 4px 6px -2px rgba(0,0,0,0.05)
--shadow-xl    0 20px 25px -5px rgba(0,0,0,0.1),               Drawers
               0 10px 10px -5px rgba(0,0,0,0.04)

DARK MODE: all rgba(0,0,0,0.1) → rgba(0,0,0,0.4)
```

## Appendix B: Border Radius System

```
TOKEN           VALUE     USE CASE
──────────────  ────────  ──────────────────────────────────
--radius-none   0         Reset
--radius-sm     4px       Badges (pill uses --radius-full instead), small buttons
--radius        6px       ★ Inputs, buttons (default), action buttons
--radius-md     8px       Error banners, inner containers, alerts
--radius-lg     12px      ★ Cards, modals, sections, drawers
--radius-xl     16px      Hero banner inner elements
--radius-full   9999px    Pills, avatars, toggle buttons, pagination active

CURRENT CODEBASE AUDIT:
  3px  → --radius-sm  (normalize to 4)
  4px  → --radius-sm
  5px  → --radius     (normalize to 6)
  6px  → --radius
  8px  → --radius-md
  9px  → --radius-md  (normalize to 8)
  10px → --radius-lg  (normalize to 12)
  12px → --radius-lg
  20px → --radius-full
  50%  → --radius-full (for circles — use 9999px instead for pill shapes)
```

## Appendix C: Z-Index Scale

```
TOKEN           VALUE   USE CASE
──────────────  ──────  ──────────────────────────
--z-base        0       Default stacking context
--z-raised      1       Sticky table headers
--z-sticky      50      Sticky elements within content
--z-mega-menu   90      Mega menu bar (below header)
--z-header      100     Topbar / Header
--z-sidebar     200     Sidebar navigation
--z-dropdown    300     Search suggestions, notification dropdown, user menu
--z-modal       800     Modal overlay + dialog
--z-drawer      800     Drawer overlay + panel
--z-lightbox    1000    Photo lightbox
--z-toast       9999    Toast notifications (always on top)
```

## Appendix D: Transition System

```
TOKEN               VALUE                                       USE CASE
──────────────────  ──────────────────────────────────────────  ─────────────────
--duration-instant  0ms                                         Disabling animations
--duration-fast     100ms                                       Hover color changes
--duration-normal   200ms                                       Dropdowns appearing
--duration-slow     300ms                                       Sidebar toggle, modals
--duration-slower   500ms                                       Skeleton → content reveal

--ease-default      cubic-bezier(0.4, 0, 0.2, 1)               General purpose
--ease-in           cubic-bezier(0.4, 0, 1, 1)                 Elements entering view
--ease-out          cubic-bezier(0, 0, 0.2, 1)                 Elements leaving view
--ease-bounce       cubic-bezier(0.34, 1.56, 0.64, 1)          Playful (toast entry only)

PREFERS-REDUCED-MOTION:
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
```

---

## Appendix E: Migration Path from Current to Design System

```
CURRENT CODEBASE TOKEN         → DESIGN SYSTEM TOKEN
─────────────────────────────  → ─────────────────────────────

index.css :root variables:
--color-primary: #2563eb       → --color-primary (alias: --color-primary-600)
--color-primary-dark: #1d4ed8  → --color-primary-hover (alias: --color-primary-700)
--color-primary-light: #eff6ff → --color-primary-50
--color-bg: #f8fafc            → --color-bg (unchanged)
--color-surface: #ffffff       → --color-surface (unchanged)
--color-border: #e2e8f0        → --color-border (unchanged)
--color-text: #1e293b          → --color-text (remapped to gray-800)
--color-text-muted: #64748b    → --color-text-muted (remapped to gray-400)
--color-danger: #ef4444        → --color-danger-500
--color-success: #22c55e       → --color-success-500
--color-warning: #f59e0b       → --color-warning-500
--radius: 6px                  → --radius (unchanged)
--shadow:                      → --shadow-sm (unchanged)
--shadow-md:                   → --shadow-md (unchanged)

Strategy: tokens.css defines NEW tokens AND aliases OLD names.
  Example: --color-primary: var(--color-primary-600);
  This means: zero changes needed in existing page CSS files.
  Pages consume the old names. Tokens.css maps old → new.
  New components use the full token names directly.
```
