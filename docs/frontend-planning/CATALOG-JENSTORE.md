# Product Catalog — JenStore-Inspired Component Architecture

**Domain:** Material Handling Equipment — Forklifts, Warehouse Equipment, Attachments, Spare Parts  
**Inspiration:** JenStore Thailand e-commerce catalog UX  
**Constraint:** Existing APIs only. Zero backend changes.  
**Date:** 2026-06-21

---

## 0. Available Data — Exact API Fields

Every visual element below is traceable to a specific field in the existing API.

### Product (list item — `GET /catalog/products/`)

```
id, sku, name_en, name_lo, slug, model_number,
brand: { id, name, slug, logo_url, country } | null,
category: { id, name_en, name_lo, slug, level } | null,
is_active, is_featured, is_sale, is_rental,
is_used_available, is_service_item,
sort_order, primary_image_url,
created_at, updated_at
```

### ProductDetail (single item — `GET /catalog/products/:id`)

```
+ description_en, description_lo,
  specs_grouped: Record<string, ProductSpec[]>,
  images: { id, image_url, alt_text, is_primary, sort_order }[],
  compat_brands: { brand: BrandBrief, notes }[],
  created_by, updated_by
```

### Brand (`GET /catalog/brands/`)

```
id, name, slug, logo_url, country,
brand_role: 'primary' | 'parts_only' | 'both',
website, description, is_active, sort_order
```

### ProductCategory (`GET /catalog/categories/` — tree)

```
id, name_en, name_lo, slug, level,
parent_id, description, icon,
sort_order, is_active,
children: ProductCategory[]    ← recursive tree
```

### Available Filter Params (`ProductListParams`)

```
q, category_id, brand_id,
is_active, is_rental, is_sale, is_featured,
page, page_size,
sort: 'sort_order' | 'name_en' | 'created_at' | 'updated_at',
order: 'asc' | 'desc'
```

### Existing Hooks (all preserved — consumed by new components)

```
useCatalog(params)   → { products[], total, pages, page, applyParams, refetch, create, update, remove }
useBrands(active)    → { brands[], refetch, create, update, remove }
useCategories()      → { tree[], flat[], treeFlattened[], refetch, create, update, remove }
```

---

## 1. Page Architecture

### Catalog Page — Full Layout

```
┌═══════════════════════════════════════════════════════════════════════════┐
║                                                                           ║
║  ─── ZONE A: HERO BANNER ──────────────────────────────────────────────  ║
║  ┌───────────────────────────────────────────────────────────────────────┐║
║  │                                                                       │║
║  │   DK SERVICE                                                          │║
║  │   Material Handling Equipment                                         │║
║  │                                                                       │║
║  │   Forklifts · Warehouse Equipment · Spare Parts                       │║
║  │                                                                       │║
║  │   ┌─────────────────────────────────────────────────────────────┐    │║
║  │   │  🔍  Search forklifts, parts, accessories...   [All ▾] [→] │    │║
║  │   └─────────────────────────────────────────────────────────────┘    │║
║  │                                                                       │║
║  │   [Browse Forklifts]   [Shop Spare Parts]   [View Rentals]           │║
║  │                                                                       │║
║  └───────────────────────────────────────────────────────────────────────┘║
║                                                                           ║
║  ─── ZONE B: CATEGORY SLIDER ─────────────────────────────────────────  ║
║  ┌───────────────────────────────────────────────────────────────────────┐║
║  │                                                                       │║
║  │  ◀  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  ▶│║
║  │     │   🚛    │ │   🏗    │ │   ⚙️    │ │   🔧    │ │   📦    │   │║
║  │     │Forklifts│ │Warehouse│ │  Parts  │ │ Service │ │Attachm. │   │║
║  │     │ 42 items│ │ 18 items│ │128 items│ │ 15 items│ │ 23 items│   │║
║  │     └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │║
║  │                                                                       │║
║  └───────────────────────────────────────────────────────────────────────┘║
║                                                                           ║
║  ─── ZONE C: BRAND SHOWCASE ──────────────────────────────────────────  ║
║  ┌───────────────────────────────────────────────────────────────────────┐║
║  │  Shop by Brand                                          View All →   │║
║  │                                                                       │║
║  │  ◀  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      ▶│║
║  │     │ [LOGO] │ │ [LOGO] │ │ [LOGO] │ │ [LOGO] │ │ [LOGO] │       │║
║  │     │ Toyota │ │Komatsu │ │Jungh.  │ │  Still │ │ Linde  │       │║
║  │     │ Japan  │ │ Japan  │ │Germany │ │Germany │ │Germany │       │║
║  │     │12 items│ │ 8 items│ │ 5 items│ │ 3 items│ │ 2 items│       │║
║  │     └────────┘ └────────┘ └────────┘ └────────┘ └────────┘       │║
║  │                                                                       │║
║  └───────────────────────────────────────────────────────────────────────┘║
║                                                                           ║
║  ─── ZONE D: MEGA MENU BAR (sticky below header) ─────────────────────  ║
║  ┌───────────────────────────────────────────────────────────────────────┐║
║  │  ≡ All Categories │ Forklifts │ Warehouse │ Parts │ Attachments     │║
║  └───────────────────────────────────────────────────────────────────────┘║
║                                                                           ║
║  ─── ZONE E: PRODUCT LISTING ─────────────────────────────────────────  ║
║  ┌──────────────────────┐  ┌───────────────────────────────────────────┐║
║  │                      │  │                                           │║
║  │  FILTER PANEL        │  │  TOOLBAR                                  │║
║  │                      │  │  42 products  [Relevance ▾]  [▦] [≡]     │║
║  │  ┌─── Active ──────┐│  │                                           │║
║  │  │ Brand: Toyota ✕ ││  │  ┌────────┐ ┌────────┐ ┌────────┐       │║
║  │  │ Type: Rental  ✕ ││  │  │  CARD  │ │  CARD  │ │  CARD  │       │║
║  │  └─────────────────┘│  │  │        │ │        │ │        │       │║
║  │                      │  │  └────────┘ └────────┘ └────────┘       │║
║  │  Product Type        │  │  ┌────────┐ ┌────────┐ ┌────────┐       │║
║  │  ☐ For Sale          │  │  │  CARD  │ │  CARD  │ │  CARD  │       │║
║  │  ☐ For Rental        │  │  │        │ │        │ │        │       │║
║  │  ☐ Used Available    │  │  └────────┘ └────────┘ └────────┘       │║
║  │  ☐ Spare Parts       │  │                                           │║
║  │                      │  │  PAGINATION                               │║
║  │  Brand               │  │  ◀  1  2  3  ...  8  ▶   [20 ▾] / page  │║
║  │  ☐ Toyota            │  │                                           │║
║  │  ☐ Komatsu           │  └───────────────────────────────────────────┘║
║  │  ☐ Jungheinrich      │                                              ║
║  │  [Show more]         │                                              ║
║  │                      │                                              ║
║  │  Category            │                                              ║
║  │  ▾ Forklifts         │                                              ║
║  │    ☐ Electric         │                                              ║
║  │    ☐ Diesel           │                                              ║
║  │  ▸ Parts & Spares    │                                              ║
║  │                      │                                              ║
║  │  Condition           │                                              ║
║  │  ☐ New               │                                              ║
║  │  ☐ Used              │                                              ║
║  │  ☐ Refurbished       │                                              ║
║  │                      │                                              ║
║  └──────────────────────┘                                              ║
║                                                                           ║
║  ─── ZONE F: FEATURED PRODUCTS (below listing when no filters) ─────  ║
║  ┌───────────────────────────────────────────────────────────────────────┐║
║  │  ★ Featured Products                                    View All →  │║
║  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                       │║
║  │  │  CARD  │ │  CARD  │ │  CARD  │ │  CARD  │                       │║
║  │  └────────┘ └────────┘ └────────┘ └────────┘                       │║
║  └───────────────────────────────────────────────────────────────────────┘║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Component Tree

```
CatalogPage (REWRITE — src/pages/Catalog/CatalogPage.tsx)
│
├── ZONE A: HeroBanner                                    NEW
│   ├── HeroContent (title, subtitle, CTA buttons)
│   └── HeroSearchBar                                     NEW
│       ├── SearchInput (48px tall, prominent)
│       ├── CategoryScopeSelect (inline dropdown)
│       └── SearchSuggestionsPopover                      NEW
│           ├── SuggestionGroup "Products"
│           ├── SuggestionGroup "Categories"
│           └── SuggestionGroup "Brands"
│
├── ZONE B: CategorySlider                                NEW
│   └── CategorySliderCard × N                            NEW
│       ├── CategoryIcon (mapped from category.icon or fallback)
│       ├── CategoryLabel
│       └── ProductCount
│
├── ZONE C: BrandShowcase                                 NEW
│   └── BrandCard × N                                     NEW
│       ├── BrandLogo (from brand.logo_url or initial)
│       ├── BrandName
│       ├── BrandCountry
│       └── ProductCount
│
├── ZONE D: MegaMenuBar                                   NEW
│   ├── MegaMenuTrigger ("≡ All Categories")
│   ├── MegaMenuPanel                                     NEW
│   │   ├── MegaMenuColumn × N (one per top-level category)
│   │   │   ├── ColumnHeader (category name + icon)
│   │   │   └── ColumnLink × N (subcategories)
│   │   └── MegaMenuFooter ("Browse All Products →")
│   └── TabLink × N (top-level categories as horizontal tabs)
│
├── ZONE E: Product Listing Area
│   ├── ActiveFilterPills                                  NEW
│   │   └── FilterPill × N (removable)
│   │
│   ├── FilterPanel                                        NEW
│   │   ├── FilterSection "Product Type"                   NEW
│   │   │   └── FilterCheckbox × 6
│   │   ├── FilterSection "Brand"                          NEW
│   │   │   ├── BrandSearchInput (mini)
│   │   │   ├── FilterCheckbox × N (with counts)
│   │   │   └── ShowMoreToggle
│   │   ├── FilterSection "Category"                       NEW
│   │   │   └── CategoryTreeSelect                         NEW
│   │   │       ├── TreeNode (parent — collapsible)
│   │   │       └── TreeLeaf (child — selectable)
│   │   └── FilterSection "Condition"                      NEW
│   │       └── FilterCheckbox × 3
│   │
│   ├── ProductToolbar                                     NEW
│   │   ├── ResultSummary ("42 products")
│   │   ├── SortSelect                                     NEW
│   │   ├── ViewToggle (grid/list — reuse pattern)
│   │   └── MobileFilterToggle                             NEW (show below md)
│   │
│   ├── ProductGrid                                        NEW
│   │   └── ProductCard × N                                NEW (see Section 3.5)
│   │
│   ├── ProductList (table view)                           ENHANCED
│   │   └── ProductListRow × N
│   │
│   └── Pagination (existing pattern — enhanced)
│
├── ZONE F: FeaturedProductsRow                            NEW
│   └── ProductCard × 4 (filtered: is_featured === true)
│
├── ProductForm (existing — UNCHANGED)
├── ConfirmDialog (existing — UNCHANGED)
│
└── MobileFilterDrawer                                     NEW
    └── FilterPanel (same component, rendered in Drawer)
```

---

## 3. Component Specifications

### 3.1 HeroBanner

**File:** `src/components/catalog/HeroBanner.tsx` + `.css`

**Props:**
```typescript
interface HeroBannerProps {
  totalProducts: number
  onSearch: (query: string, categoryId?: number) => void
  searchValue: string
  categories: ProductCategory[]          // for scope dropdown
}
```

**Visual Spec:**

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌─ BACKGROUND ───────────────────────────────────────────────┐ │
│  │  Gradient: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)│ │
│  │  Optional: subtle grid pattern overlay (CSS only)           │ │
│  │  Height: 280px desktop, 220px tablet, auto mobile           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ CONTENT (centered, max-width 800px) ──────────────────────┐ │
│  │                                                             │ │
│  │  DK SERVICE                              (12px, uppercase,  │ │
│  │                                           tracking, #60a5fa)│ │
│  │  Material Handling Equipment             (28px, white, bold)│ │
│  │                                                             │ │
│  │  Forklifts · Warehouse Equipment ·       (14px, #94a3b8)   │ │
│  │  Spare Parts · Attachments                                  │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ 🔍 │ Search forklifts, parts, accessories... │All ▾│→│  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │     ↑ 48px height, white bg, rounded-lg, shadow-lg         │ │
│  │     ↑ category scope dropdown on right                     │ │
│  │     ↑ submit button (blue arrow)                           │ │
│  │                                                             │ │
│  │  [Browse Forklifts]  [Spare Parts]  [Rental Equipment]    │ │
│  │   ↑ ghost buttons with white border, 13px                  │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**CTA button behavior:**
- "Browse Forklifts" → sets `category_id` filter to the "Forklifts" category
- "Spare Parts" → sets `category_id` to "Parts" category
- "Rental Equipment" → sets `is_rental: true` filter
- Category IDs resolved dynamically from `categories` prop

**HeroSearchBar sub-component:**

```typescript
// Inline component within HeroBanner
interface HeroSearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  categories: ProductCategory[]
  selectedCategoryId: number | null
  onCategoryChange: (id: number | null) => void
}
```

**Search behavior:**
- Typing shows `SearchSuggestionsPopover` after 2+ characters and 300ms debounce
- Suggestions come from client-side fuzzy matching against:
  - Product names from the current loaded product list
  - Category names from the category tree
  - Brand names from the brands list
- Enter key or arrow-click submits → sets `params.q` filter
- Category scope dropdown options: "All Categories" + top-level categories from tree

**SearchSuggestionsPopover:**
```
┌──────────────────────────────────────────────────────┐
│  PRODUCTS                                            │
│    Toyota 8FD25 Diesel Forklift          PRD-00012  │
│    Toyota 8FBN30 Electric Forklift       PRD-00015  │
│                                                      │
│  CATEGORIES                                          │
│    Electric Forklifts                    42 items    │
│    Forklift Attachments                  23 items    │
│                                                      │
│  BRANDS                                              │
│    Toyota                                12 items    │
│                                                      │
│  [↑↓ navigate · Enter select · Esc close]           │
└──────────────────────────────────────────────────────┘

Position: absolute, below search bar, same width
Z-index: 300 (above mega menu bar)
Max height: 400px, scrollable
Click product → navigate to /catalog/products/:id
Click category → set category_id filter
Click brand → set brand_id filter
```

---

### 3.2 CategorySlider

**File:** `src/components/catalog/CategorySlider.tsx` + `.css`

**Props:**
```typescript
interface CategorySliderProps {
  categories: ProductCategory[]        // tree (top-level only used)
  activeCategoryId: number | null
  onSelect: (categoryId: number | null) => void
}
```

**Visual:**
```
                ← Arrow                                           Arrow →
  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
  │                │ │                │ │                │ │                │
  │    🚛          │ │    🏗          │ │    ⚙️          │ │    🔧          │
  │   (48px icon   │ │               │ │               │ │               │
  │    in colored  │ │               │ │               │ │               │
  │    circle)     │ │               │ │               │ │               │
  │                │ │                │ │                │ │                │
  │  Forklifts     │ │  Warehouse    │ │  Spare Parts  │ │  Service      │
  │  42 products   │ │  Equipment    │ │  128 products │ │  Items        │
  │                │ │  18 products  │ │               │ │  15 products  │
  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
        ● active         ○               ○               ○

Card specs:
  Size: 160px × 140px (desktop), 130px × 120px (mobile)
  Background: var(--color-surface)
  Border: 1px solid var(--color-border)
  Radius: 12px
  Hover: shadow-md, translateY(-2px)
  Active: primary-50 bg, primary border (2px), primary text

Icon circle:
  Size: 48px
  Background: category-specific color at 10% opacity
  Icon: mapped from category.icon field (Lucide icon name string)
  Fallback: Package icon if category.icon is null

Product count:
  Source: NOT from API (would need per-category product count endpoint)
  Strategy: Show only if precomputed — omit count label in v1, add later
  Alternative: call getProducts({category_id, page_size: 0}) per top-level
               category on idle (deferred, non-blocking)
```

**Slider mechanics:**
```
Container: overflow-x: auto, scroll-snap-type: x mandatory
Cards: scroll-snap-align: start, flex-shrink: 0
Arrows: absolute positioned, show/hide based on scroll position
  Left arrow: hidden when scrollLeft === 0
  Right arrow: hidden when scrolled to end
Mobile: native horizontal scroll with momentum, no arrows
Desktop: arrow buttons + scroll, or drag-to-scroll
Gap: 16px between cards
Padding: 4px vertical (for shadow overflow)
```

**Data source:** `useCategories().tree` → take only items where `parent_id === null` (top-level).

---

### 3.3 BrandShowcase

**File:** `src/components/catalog/BrandShowcase.tsx` + `.css`

**Props:**
```typescript
interface BrandShowcaseProps {
  brands: Brand[]
  activeBrandId: number | null
  onSelect: (brandId: number | null) => void
}
```

**Visual:**
```
┌────────────────────────────────────────────────────────────────────┐
│  Shop by Brand                                       View All →   │
│                                                                    │
│  ◀  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      ▶ │
│     │          │ │          │ │          │ │          │         │
│     │  [LOGO]  │ │  [LOGO]  │ │  [LOGO]  │ │  [LOGO]  │         │
│     │  80×50   │ │  80×50   │ │  80×50   │ │  80×50   │         │
│     │          │ │          │ │          │ │          │         │
│     │  Toyota  │ │ Komatsu  │ │ Jungh.   │ │  Still   │         │
│     │  🇯🇵 Japan│ │ 🇯🇵 Japan │ │ 🇩🇪 Germany│ │ 🇩🇪 Germany│         │
│     │          │ │          │ │          │ │          │         │
│     └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

BrandCard specs:
  Size: 150px × 130px
  Background: var(--color-surface)
  Border: 1px solid var(--color-border)
  Radius: 10px
  
Logo area:
  Height: 60px
  Background: var(--color-bg-subtle)
  Border-radius: 8px (inner)
  Logo: object-fit: contain, max 80px × 50px
  No logo: show brand initial in 32px circle with brand_role color
    primary → blue, parts_only → amber, both → green

Brand name: 13px, semibold, centered, line-clamp 1
Country: 11px, muted, optional flag emoji from country string
  Mapping: "Japan" → 🇯🇵, "Germany" → 🇩🇪, "Sweden" → 🇸🇪, etc.
  Fallback: show text only if no emoji match

Active state: primary border ring (2px), primary-50 bg
Hover: shadow-sm, translateY(-1px)
Click: toggles brand_id filter (click active brand → clears filter)

"View All →": navigates to /catalog/brands
```

**Slider:** Same horizontal scroll mechanics as CategorySlider. Desktop shows 5-6 cards. Mobile shows 2.5 with peek.

**Data source:** `useBrands(true)` → active brands, sorted by `sort_order`.

---

### 3.4 MegaMenuBar

**File:** `src/components/catalog/MegaMenuBar.tsx` + `.css`

**Props:**
```typescript
interface MegaMenuBarProps {
  categories: ProductCategory[]       // full tree
  activeCategoryId: number | null
  onCategorySelect: (id: number | null) => void
}
```

**Bar visual (always visible, sticky below header):**
```
┌───────────────────────────────────────────────────────────────────┐
│  ≡ All Categories  │  Forklifts  │  Warehouse  │  Parts  │ ...  │
└───────────────────────────────────────────────────────────────────┘

Bar specs:
  Height: 44px
  Background: var(--color-surface)
  Border-bottom: 1px solid var(--color-border)
  Position: sticky, top: var(--topbar-height) (56px)
  Z-index: 90 (below header at 100)

"≡ All Categories" trigger:
  Font-weight: 600
  Icon: Menu (Lucide)
  Click → toggles MegaMenuPanel

Category tabs:
  Top-level categories from tree
  Active: primary color text, 2px bottom border
  Click: sets category_id filter + scrolls to product grid
  Mobile: horizontally scrollable
```

**MegaMenuPanel (dropdown from "≡ All Categories"):**

```
┌───────────────────────────────────────────────────────────────────┐
│  ≡ All Categories ▲                                               │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ 🚛 FORKLIFTS    │ │ 🏗 WAREHOUSE     │ │ ⚙️ SPARE PARTS  │   │
│  │                  │ │                  │ │                  │   │
│  │  Electric        │ │  Pallet Trucks   │ │  Engine Parts    │   │
│  │  Diesel          │ │  Reach Trucks    │ │  Hydraulic       │   │
│  │  LPG             │ │  Stackers        │ │  Electrical      │   │
│  │  Dual Fuel       │ │  Order Pickers   │ │  Brake & Steering│   │
│  │  Warehouse       │ │  Dock Equipment  │ │  Filters & Belts │   │
│  │                  │ │                  │ │  Tires & Wheels  │   │
│  │  View All →      │ │  View All →      │ │  View All →      │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                   │
│  ┌─────────────────┐ ┌─────────────────┐                        │
│  │ 🔧 SERVICE      │ │ 📦 ATTACHMENTS   │                        │
│  │                  │ │                  │                        │
│  │  Maintenance Kits│ │  Fork Extensions │                        │
│  │  Lubricants      │ │  Side Shifters   │                        │
│  │  Safety Equipment│ │  Clamps          │                        │
│  │                  │ │  Rotators        │                        │
│  │  View All →      │ │  View All →      │                        │
│  └─────────────────┘ └─────────────────┘                        │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│  Browse All 244 Products →                                       │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

Panel specs:
  Position: absolute, below mega menu bar, full-width
  Background: var(--color-surface)
  Border: 1px solid var(--color-border)
  Shadow: var(--shadow-lg)
  Z-index: 250
  Animation: slideDown 200ms ease

Column layout:
  Desktop: 3-column grid, then remaining columns wrap below
  Tablet: 2-column grid
  Mobile: single column accordion (each category expands)

Column header:
  Icon: from category.icon (Lucide name) or fallback
  Name: 14px, bold, uppercase
  Color: primary for text

Subcategory links:
  From category.children[]
  Font: 13px, muted, hover → text color
  Click → set category_id to that subcategory, close panel

"View All →" per column: set category_id to parent, close panel
"Browse All N Products →": clear all filters, close panel

Close behavior: click outside, Esc key, click any link
```

**Data source:** `useCategories().tree` — the full recursive tree. Level 0 = columns, level 1 = subcategory links.

---

### 3.5 ProductCard (JenStore-inspired)

**File:** `src/components/catalog/CatalogProductCard.tsx` + `.css`

**Props:**
```typescript
interface CatalogProductCardProps {
  product: Product
  onNavigate: (id: number) => void
  onEdit: (product: Product) => void
  onQuickView: (id: number) => void
}
```

**Visual:**

```
┌──────────────────────────────────┐
│ ┌──────────────────────────────┐ │
│ │                              │ │
│ │       PRODUCT IMAGE          │ │  aspect-ratio: 4/3
│ │       object-fit: contain    │ │  background: var(--color-bg-subtle)
│ │       padding: 12px          │ │
│ │                              │ │
│ │  ★                           │ │  ← Featured star (top-left, if is_featured)
│ │                              │ │
│ │  ┌──────┐ ┌──────┐         │ │  ← Type pills (bottom-left, overlaid)
│ │  │ Sale │ │Rental│         │ │
│ │  └──────┘ └──────┘         │ │
│ │                              │ │
│ │       ┌──────────────┐      │ │  ← Quick View button (center, hover only)
│ │       │  👁 Quick View│      │ │
│ │       └──────────────┘      │ │
│ │                              │ │
│ └──────────────────────────────┘ │
│                                  │
│  TOYOTA                          │  ← brand.name (11px, primary, uppercase)
│                                  │
│  Toyota 8FD25 Diesel             │  ← name_en (14px, semibold, 2 lines max)
│  Forklift                        │     text-overflow: -webkit-line-clamp(2)
│                                  │
│  Model: 8FD25                    │  ← model_number (12px, muted, if exists)
│                                  │
│  ┌─────────────────────────────┐│
│  │ SKU: PRD-00042              ││  ← sku (11px, mono, muted)
│  │ 📁 Diesel Forklifts         ││  ← category.name_en (11px, muted)
│  └─────────────────────────────┘│
│                                  │
│  ┌───────────────┐              │
│  │  Used Available│              │  ← condition chip (if is_used_available)
│  └───────────────┘              │
│                                  │
│  [Edit]          [View →]        │  ← hover-visible action buttons
│                                  │
└──────────────────────────────────┘

Card specs:
  Background: var(--color-surface)
  Border: 1px solid var(--color-border)
  Radius: 12px
  Overflow: hidden
  Cursor: pointer
  Grid: minmax(240px, 1fr)

Hover state:
  Border-color: var(--color-primary-100)
  Shadow: 0 8px 24px rgba(0,0,0,0.08)
  Image: transform scale(1.03) with overflow hidden
  Quick View button: opacity 0 → 1
  Edit + View buttons: opacity 0 → 1

Featured star:
  Position: absolute top-left of image area
  Gold circle (32px) with Star icon (Lucide)
  Background: #fef9c3, border: 1px solid #fcd34d

Type pills:
  Position: absolute bottom-left of image area, flex row
  Sale: green-50 bg, green text
  Rental: blue-50 bg, blue text
  Service Item: amber-50 bg, amber text
  Used Available: cyan-50 bg, cyan text
  Inactive: gray-50 bg, gray text (entire card at 60% opacity)

Quick View button:
  Position: absolute center of image area
  Background: white/90%, rounded-full, shadow-md
  Icon: Eye (Lucide, 16px)
  Label: "Quick View" (12px)
  Click: opens QuickViewDrawer with product detail

Differences from current ProductCard:
  ✓ Image hover zoom (scale 1.03, 300ms transition)
  ✓ Quick View overlay button
  ✓ 2-line name truncation (line-clamp)
  ✓ Category label row
  ✓ "Used Available" condition chip
  ✓ View + Edit split action buttons
  ✓ Featured star badge
  ✓ Larger card width (240px min vs 220px)
  ✓ Softer hover effect (border color + shadow, not translateY)
```

---

### 3.6 FilterPanel

**File:** `src/components/catalog/FilterPanel.tsx` + `.css`

**Props:**
```typescript
interface FilterPanelProps {
  // Current state
  params: ProductListParams
  onParamsChange: (patch: Partial<ProductListParams>) => void

  // Option data
  brands: Brand[]
  categoryTree: ProductCategory[]

  // Mobile
  isDrawerMode: boolean
  onClose?: () => void
}
```

**Sections:**

**Section 1 — Product Type:**
```
Product Type
  ☐ For Sale          → is_sale: true
  ☐ For Rental        → is_rental: true
  ☐ Featured          → is_featured: true
  ☐ Used Available    → (client-side filter or omit — no API param)
  ☐ Service Items     → (client-side filter or omit)

Note: The API supports is_sale, is_rental, is_featured as individual
boolean params. Only ONE can be active at a time with current API.
Solution: treat as radio-style — checking one unchecks others.
Display as checkboxes for visual familiarity but enforce single-select.
```

**Section 2 — Brand (with search):**
```
Brand
  [🔍 Search brands...]        ← mini input, filters the checkbox list below
  ☐ Toyota (12)                ← show sorted by sort_order
  ☐ Komatsu (8)                   brand_id is single-select (API constraint)
  ☐ Jungheinrich (5)              → treat as radio: checking one unchecks others
  ☐ Mitsubishi (4)
  ☐ Still (3)
  [+ Show 8 more]              ← initially show top 5, expandable

Counts: derived from the current page's products if available.
  Since API doesn't return faceted counts, we can:
  1. Omit counts in v1 (safest)
  2. Load all products once (page_size=100) and count client-side
  Recommended: omit counts in v1.
```

**Section 3 — Category (tree):**
```
Category
  ▾ Forklifts                  ← top-level, click to expand/collapse
    ☐ Electric Forklifts       ← leaf categories, checkable
    ☐ Diesel Forklifts
    ☐ LPG Forklifts
  ▸ Warehouse Equipment        ← collapsed, click to expand
  ▸ Spare Parts
  ▸ Attachments

Click leaf → sets category_id
Click parent → sets category_id to parent (API returns children too)
Single-select (API constraint: one category_id at a time)
```

**Section 4 — Status:**
```
Status
  ◉ Active only    → is_active: true
  ○ All            → is_active: undefined
  ○ Inactive only  → is_active: false
```

**Desktop rendering:**
```
Width: 248px
Position: static (left column of the listing grid)
Background: var(--color-surface)
Border: 1px solid var(--color-border)
Border-radius: 12px
Padding: 20px
Sticky: top calc(var(--topbar-height) + 44px + 16px)
  (below header + mega menu bar + gap)
```

**Mobile rendering:**
```
Rendered inside MobileFilterDrawer (uses existing Drawer component)
Full-height drawer from left
Additional "Apply" and "Clear All" buttons at bottom
Close button at top
```

---

### 3.7 ActiveFilterPills

**File:** `src/components/catalog/ActiveFilterPills.tsx` + `.css`

**Props:**
```typescript
interface ActiveFilterPillsProps {
  params: ProductListParams
  brands: Brand[]
  categories: ProductCategory[]   // flat
  onRemove: (key: string) => void
  onClearAll: () => void
}
```

**Visual:**
```
┌──────────────────────────────────────────────────────────────┐
│  Brand: Toyota ✕  │  Type: For Rental ✕  │  ✕ Clear all    │
└──────────────────────────────────────────────────────────────┘

Only visible when at least one filter is active.
Hidden when all params are default.

Pill specs:
  Background: var(--color-primary-50)
  Border: 1px solid var(--color-primary-100)
  Color: var(--color-primary-700)
  Radius: var(--radius-full) (pill shape)
  Font: 12px, 500 weight
  Padding: 4px 8px 4px 10px
  ✕ button: 16px, hover darkens

"Clear all":
  Ghost button style
  Color: var(--color-text-muted)
  Hover: var(--color-danger) text
```

**Param → pill mapping:**
```
q             → "Search: {value}"
brand_id      → "Brand: {brandName}"       (resolve from brands[])
category_id   → "Category: {categoryName}" (resolve from categories[])
is_sale       → "For Sale"
is_rental     → "For Rental"
is_featured   → "Featured"
```

---

### 3.8 ProductToolbar

**File:** `src/components/catalog/ProductToolbar.tsx` + `.css`

**Props:**
```typescript
interface ProductToolbarProps {
  total: number
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  sortValue: string
  onSortChange: (sort: string, order: string) => void
  onMobileFilterOpen: () => void
}
```

**Visual:**
```
┌───────────────────────────────────────────────────────────────┐
│  42 products                    [Relevance ▾]  [▦ Grid] [≡]  │
│                                                               │
│  Mobile: [🔍 Filters (2)]      [Relevance ▾]  [▦] [≡]        │
└───────────────────────────────────────────────────────────────┘

Sort options (map to existing API params):
  "Relevance"     → sort: 'sort_order',  order: 'asc'
  "Newest"        → sort: 'created_at',  order: 'desc'
  "Name (A-Z)"    → sort: 'name_en',     order: 'asc'
  "Name (Z-A)"    → sort: 'name_en',     order: 'desc'
  "Recently Updated" → sort: 'updated_at', order: 'desc'

Mobile filter button:
  Shows below md breakpoint
  Badge with active filter count
  Click → opens MobileFilterDrawer
```

---

### 3.9 QuickViewDrawer

**File:** `src/components/catalog/QuickViewDrawer.tsx` + `.css`

**Props:**
```typescript
interface QuickViewDrawerProps {
  productId: number | null       // null = closed
  onClose: () => void
  onNavigateToDetail: (id: number) => void
  onEdit: (product: Product) => void
}
```

**Visual:**
```
┌──── Drawer (480px) ──────────────────────────┐
│                                               │
│  [✕ Close]                   Quick View      │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │                                      │    │
│  │         PRIMARY IMAGE                │    │  4:3, contain
│  │                                      │    │
│  │  ┌──┐ ┌──┐ ┌──┐                    │    │  thumb strip
│  └──────────────────────────────────────┘    │
│                                               │
│  TOYOTA                                       │
│  Toyota 8FD25 Diesel Forklift                │  name (18px bold)
│  ♦ SKU: PRD-00042 · Model: 8FD25            │  meta line
│                                               │
│  ┌──────┐ ┌──────┐                           │  type pills
│  │ Sale │ │Rental│                           │
│  └──────┘ └──────┘                           │
│                                               │
│  Category: Diesel Forklifts                  │
│                                               │
│  ─── Key Specifications ───────────────────  │
│  ┌──────────────┬──────────────┐            │
│  │ Capacity     │ 2,500 kg     │            │  first 4 specs
│  │ Lift Height  │ 6,000 mm     │            │  from specs_grouped
│  │ Fuel Type    │ Diesel       │            │
│  │ Mast Type    │ Triplex      │            │
│  └──────────────┴──────────────┘            │
│                                               │
│  Description (truncated to 3 lines)          │
│  The Toyota 8FD25 is a high-performance...   │
│                                               │
│  Compatible with: Toyota, BT                 │
│                                               │
│  [View Full Details →]        [✏️ Edit]       │
│                                               │
└───────────────────────────────────────────────┘
```

**Data flow:**
1. When `productId` becomes non-null, call `getProduct(productId)` to fetch `ProductDetail`
2. Show skeleton while loading
3. Render condensed view: primary image + thumb strip, key fields, first 4 specs
4. "View Full Details" → navigates to `/catalog/products/:id` and closes drawer
5. "Edit" → opens existing `ProductForm` modal

**Dependencies:** `getProduct` API (existing), `Drawer` component (existing)

---

### 3.10 FeaturedProductsRow

**File:** `src/components/catalog/FeaturedProductsRow.tsx` + `.css`

**Props:**
```typescript
interface FeaturedProductsRowProps {
  onNavigate: (id: number) => void
  onEdit: (product: Product) => void
  onQuickView: (id: number) => void
}
```

**Visual:**
```
┌──────────────────────────────────────────────────────────────────┐
│  ★ Featured Products                              View All →    │
│                                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                  │
│  │  Card  │ │  Card  │ │  Card  │ │  Card  │                  │
│  │        │ │        │ │        │ │        │                  │
│  └────────┘ └────────┘ └────────┘ └────────┘                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Visibility: only when NO filters are active (default catalog landing state)
Hidden when any filter, search, or category is applied

Data: calls getProducts({ is_featured: true, page_size: 4, sort: 'sort_order', order: 'asc' })
  → separate from the main product listing call
  → fetched once on mount, cached
  → if < 1 result, hide entire section

"View All →": sets is_featured filter on main listing

Cards: same CatalogProductCard component
Grid: repeat(4, 1fr) on desktop, repeat(2, 1fr) on mobile
```

---

## 4. Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ CATALOG PAGE — DATA ORCHESTRATION                                    │
│                                                                      │
│  useCatalog(params) ─────────────→ GET /catalog/products/?params     │
│       ├─→ products[]  ─→ ProductGrid (CatalogProductCard × N)       │
│       ├─→ products[]  ─→ HeroSearchBar suggestions (client-side)    │
│       ├─→ total, pages ─→ Pagination + ProductToolbar               │
│       └─→ params ─→ FilterPanel, ActiveFilterPills, CategorySlider  │
│                                                                      │
│  useBrands(true) ────────────────→ GET /catalog/brands/?active=true  │
│       ├─→ brands[] ─→ BrandShowcase (cards)                         │
│       ├─→ brands[] ─→ FilterPanel (brand checkboxes)                │
│       ├─→ brands[] ─→ ActiveFilterPills (resolve brand name)        │
│       ├─→ brands[] ─→ HeroSearchBar suggestions                    │
│       └─→ brands[] ─→ ProductForm (brand select)                   │
│                                                                      │
│  useCategories() ────────────────→ GET /catalog/categories/ (tree)   │
│                  ────────────────→ GET /catalog/categories/flat       │
│       ├─→ tree[] ─→ MegaMenuBar (panel columns + subcategory links) │
│       ├─→ tree[] ─→ CategorySlider (top-level categories)           │
│       ├─→ tree[] ─→ FilterPanel (category tree select)              │
│       ├─→ tree[] ─→ HeroSearchBar (category scope dropdown)        │
│       ├─→ treeFlattened ─→ ActiveFilterPills (resolve category name)│
│       └─→ treeFlattened ─→ ProductForm (category select)            │
│                                                                      │
│  getProducts({ is_featured, page_size:4 }) ──→ FeaturedProductsRow  │
│       └─→ separate one-time call on mount                           │
│                                                                      │
│  getProduct(id) ─────────────────→ QuickViewDrawer (on demand)      │
│       └─→ called when user clicks Quick View on a card              │
│                                                                      │
│  TOTAL API CALLS ON PAGE LOAD: 4                                    │
│    1. getProducts(params)       — main listing                       │
│    2. getBrands({ active: true }) — brand showcase + filter         │
│    3. getCategoryTree()          — categories everywhere             │
│    4. getProducts({ featured, page_size:4 }) — featured row         │
│    + getCategoriesFlat() batched with #3 via useCategories           │
│                                                                      │
│  INCREMENTAL CALLS:                                                  │
│    - getProducts(params) on every filter/page change                │
│    - getProduct(id) on Quick View open                              │
│                                                                      │
│  NO NEW API ENDPOINTS.                                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Responsive Strategy

### Breakpoint Behavior

| Component | Desktop (≥1280) | Laptop (1024-1279) | Tablet (768-1023) | Mobile (<768) |
|---|---|---|---|---|
| **HeroBanner** | 280px height, centered content | 260px, narrower | 220px, stacked | Auto height, stacked |
| **HeroSearchBar** | 600px wide, inline scope | 520px, inline scope | 480px, inline scope | Full-width, scope below |
| **CategorySlider** | 5 cards visible | 4 cards | 3 cards | 2.5 cards (peek) |
| **BrandShowcase** | 6 cards visible | 5 cards | 3.5 cards | 2.5 cards |
| **MegaMenuBar** | Full text tabs | Full text tabs | Scrollable tabs | Hamburger + scrollable |
| **MegaMenuPanel** | 3-column grid | 3-column | 2-column | Accordion (stacked) |
| **FilterPanel** | 248px sidebar, visible | 220px sidebar | Hidden → drawer | Hidden → drawer |
| **ProductGrid** | 3 columns | 3 columns | 2 columns | 2 cols (< 480: 1 col) |
| **ProductCard** | Full detail | Full detail | Compact (no model line) | Compact |
| **ProductToolbar** | Inline: count + sort + view | Inline | Inline + filter btn | Filter btn prominent |
| **QuickViewDrawer** | 480px right | 420px right | 380px right | Full-screen |
| **FeaturedProducts** | 4 columns | 3 columns | 2 columns | 2 columns |
| **ActiveFilterPills** | Wrapping inline | Wrapping | Horizontal scroll | Horizontal scroll |

### Mobile-Specific Layouts

**MegaMenuPanel as Accordion (mobile):**
```
┌──────────────────────────────────┐
│  ≡ All Categories           [✕]  │
├──────────────────────────────────┤
│  ▾ 🚛 Forklifts                  │  ← tap to expand
│    Electric Forklifts            │
│    Diesel Forklifts              │
│    LPG Forklifts                 │
│    View All Forklifts →          │
│  ────────────────────────────    │
│  ▸ 🏗 Warehouse Equipment        │  ← collapsed
│  ▸ ⚙️ Spare Parts                │
│  ▸ 🔧 Service Items              │
│  ▸ 📦 Attachments                │
│  ────────────────────────────    │
│  Browse All Products →           │
└──────────────────────────────────┘

Position: full-screen overlay (z-index: 250)
Animation: slideUp from bottom
```

**MobileFilterDrawer:**
```
┌──────────────────────────────────┐
│  Filters                    [✕]  │
│  ──────────────────────────────  │
│  (FilterPanel rendered here)     │
│  ──────────────────────────────  │
│  [Clear All]   [Show N Products] │
└──────────────────────────────────┘

Uses existing Drawer component
Full height, left side
"Show N Products" → applies filters + closes
```

---

## 6. File Inventory

### New Files (26)

```
src/components/catalog/
├── HeroBanner.tsx                    NEW
├── HeroBanner.css                    NEW
├── HeroSearchBar.tsx                 NEW  (inline or separate — architect's choice)
├── HeroSearchBar.css                 NEW
├── SearchSuggestionsPopover.tsx      NEW
├── SearchSuggestionsPopover.css      NEW
├── CategorySlider.tsx                NEW
├── CategorySlider.css                NEW
├── BrandShowcase.tsx                 NEW
├── BrandShowcase.css                 NEW
├── MegaMenuBar.tsx                   NEW
├── MegaMenuBar.css                   NEW
├── MegaMenuPanel.tsx                 NEW
├── MegaMenuPanel.css                 NEW
├── CatalogProductCard.tsx            NEW  (replaces ProductCard)
├── CatalogProductCard.css            NEW
├── FilterPanel.tsx                   NEW
├── FilterPanel.css                   NEW
├── ActiveFilterPills.tsx             NEW
├── ActiveFilterPills.css             NEW
├── ProductToolbar.tsx                NEW
├── ProductToolbar.css                NEW
├── QuickViewDrawer.tsx               NEW
├── QuickViewDrawer.css               NEW
├── FeaturedProductsRow.tsx           NEW
└── FeaturedProductsRow.css           NEW
```

### Rewritten Files (2)

```
src/pages/Catalog/CatalogPage.tsx     REWRITE — assembles all new components
src/pages/Catalog/CatalogPage.css     REWRITE — new grid layout
```

### Unchanged Files (12)

```
src/pages/Catalog/ProductDetailPage.tsx + .css    UNCHANGED (separate redesign)
src/pages/Catalog/ProductForm.tsx                 UNCHANGED
src/pages/Catalog/BrandsPage.tsx + .css           UNCHANGED
src/pages/Catalog/CategoriesPage.tsx + .css       UNCHANGED
src/pages/Catalog/ImportPage.tsx + .css           UNCHANGED
src/components/catalog/SpecTable.tsx              UNCHANGED
src/components/catalog/ProductImageGallery.tsx    UNCHANGED
src/components/catalog/CatalogDashboardWidget.tsx UNCHANGED
```

### Deprecated (delete after migration)

```
src/components/catalog/ProductCard.tsx            REPLACED by CatalogProductCard
src/components/catalog/ProductCard.css            REPLACED by CatalogProductCard.css
```

---

## 7. Component Dependency Graph

```
LAYER 0 — Data hooks (existing, unchanged)
─────────────────────────────────────────────
  useCatalog          → consumed by: CatalogPage
  useBrands           → consumed by: CatalogPage
  useCategories       → consumed by: CatalogPage

LAYER 1 — Leaf components (zero custom deps)
─────────────────────────────────────────────
  CategorySlider          → deps: lucide-react
  BrandShowcase           → deps: lucide-react
  CatalogProductCard      → deps: lucide-react
  ActiveFilterPills       → deps: none
  ProductToolbar          → deps: lucide-react
  FeaturedProductsRow     → deps: CatalogProductCard, getProducts API
  SearchSuggestionsPopover → deps: lucide-react

LAYER 2 — Composite components
─────────────────────────────────────────────
  HeroSearchBar       → deps: SearchSuggestionsPopover
  HeroBanner          → deps: HeroSearchBar
  MegaMenuPanel       → deps: lucide-react, react-router Link
  MegaMenuBar         → deps: MegaMenuPanel
  FilterPanel         → deps: lucide-react (checkboxes, tree icons)
  QuickViewDrawer     → deps: Drawer (existing), getProduct API

LAYER 3 — Page composition
─────────────────────────────────────────────
  CatalogPage         → deps: ALL of the above + ProductForm + ConfirmDialog
```

---

## 8. Build Order

```
PHASE 1: Leaf components (parallel, independent)            ~3 days
────────────────────────────────────────────────────────────────
  1.  CatalogProductCard.tsx + .css
  2.  CategorySlider.tsx + .css
  3.  BrandShowcase.tsx + .css
  4.  ActiveFilterPills.tsx + .css
  5.  ProductToolbar.tsx + .css
  6.  SearchSuggestionsPopover.tsx + .css

PHASE 2: Composite components (sequential dependencies)     ~3 days
────────────────────────────────────────────────────────────────
  7.  HeroSearchBar.tsx + .css      (depends on SearchSuggestionsPopover)
  8.  HeroBanner.tsx + .css          (depends on HeroSearchBar)
  9.  MegaMenuPanel.tsx + .css
  10. MegaMenuBar.tsx + .css         (depends on MegaMenuPanel)
  11. FilterPanel.tsx + .css
  12. QuickViewDrawer.tsx + .css

PHASE 3: Self-contained widget                               ~1 day
────────────────────────────────────────────────────────────────
  13. FeaturedProductsRow.tsx + .css  (makes own API call)

PHASE 4: Page assembly                                        ~2 days
────────────────────────────────────────────────────────────────
  14. CatalogPage.tsx (rewrite — wire all components)
  15. CatalogPage.css (rewrite — layout grid)

PHASE 5: Cleanup                                              ~1 day
────────────────────────────────────────────────────────────────
  16. Delete ProductCard.tsx + .css
  17. Verify EquipmentRegistryPage still works
      (it imports CatalogPage.css — must give it its own CSS)
  18. Mobile testing at 375px, 414px, 768px, 1024px
  19. Keyboard navigation testing (search, mega menu, filter panel)

TOTAL: ~10 working days
```

---

## 9. Verification Checklist

```
HERO BANNER
  [ ] Renders with dark gradient background
  [ ] Title + subtitle display correctly
  [ ] CTA buttons filter by correct category/type
  [ ] Search bar accepts input with 300ms debounce
  [ ] Category scope dropdown shows top-level categories
  [ ] Search suggestions popover appears after 2+ chars
  [ ] Clicking a suggestion navigates or filters correctly
  [ ] Enter key submits search
  [ ] Mobile: stacked layout, full-width search

CATEGORY SLIDER
  [ ] Shows all top-level categories from tree API
  [ ] Clicking a category sets category_id filter
  [ ] Active category visually highlighted
  [ ] Horizontal scroll works on mobile
  [ ] Arrow buttons appear on desktop
  [ ] Icons render from category.icon (or fallback)

BRAND SHOWCASE
  [ ] Shows all active brands from brands API
  [ ] Logos render (or initials as fallback)
  [ ] Country labels display
  [ ] Clicking brand sets brand_id filter
  [ ] Clicking active brand clears filter
  [ ] "View All →" navigates to /catalog/brands
  [ ] Horizontal scroll/carousel on mobile

MEGA MENU BAR
  [ ] Sticky below header at correct position
  [ ] "All Categories" opens/closes panel
  [ ] Panel shows columns for each top-level category
  [ ] Subcategory links match children[] from tree
  [ ] Clicking subcategory sets filter + closes panel
  [ ] "View All" per column sets parent filter
  [ ] Tab links highlight active category
  [ ] Mobile: accordion mode works
  [ ] Esc key closes panel
  [ ] Click outside closes panel

FILTER PANEL
  [ ] Product type checkboxes toggle API params
  [ ] Brand filter shows all brands, mini search works
  [ ] "Show more" expands full brand list
  [ ] Category tree shows hierarchy
  [ ] Expanding/collapsing tree groups works
  [ ] Status filter toggles is_active param
  [ ] Each filter change resets to page 1
  [ ] Desktop: visible sidebar, sticky
  [ ] Mobile: drawer mode with Apply/Clear buttons

ACTIVE FILTER PILLS
  [ ] Shows pills for each active filter
  [ ] Resolves brand_id → brand name
  [ ] Resolves category_id → category name
  [ ] ✕ on pill removes that filter
  [ ] "Clear all" resets everything
  [ ] Hidden when no filters active

PRODUCT CARDS
  [ ] Renders product image with fallback placeholder
  [ ] Image hover zoom effect (scale 1.03)
  [ ] Quick View button appears on hover
  [ ] Type pills (Sale, Rental, etc.) show correctly
  [ ] Featured star shows for is_featured products
  [ ] 2-line name truncation works
  [ ] Brand, model, SKU, category all render
  [ ] Inactive products shown at reduced opacity
  [ ] Card click navigates to detail page
  [ ] Edit button opens ProductForm modal

QUICK VIEW DRAWER
  [ ] Opens when Quick View button clicked
  [ ] Fetches ProductDetail via existing API
  [ ] Shows skeleton during loading
  [ ] Displays image, name, type, key specs
  [ ] "View Full Details" navigates to detail page
  [ ] "Edit" opens ProductForm modal
  [ ] Esc/backdrop closes drawer

PRODUCT TOOLBAR
  [ ] Shows total product count
  [ ] Sort dropdown changes sort params
  [ ] Grid/list view toggle works
  [ ] Mobile filter button shows with active count badge

FEATURED PRODUCTS ROW
  [ ] Shows up to 4 featured products
  [ ] Hidden when any filter is active
  [ ] "View All →" applies featured filter
  [ ] Hidden if no featured products exist

PAGINATION
  [ ] Works in both grid and list views
  [ ] Page numbers render correctly
  [ ] Prev/Next disabled at boundaries

RESPONSIVE
  [ ] All 4 breakpoints tested: 375px, 768px, 1024px, 1280px
  [ ] No horizontal overflow at any width
  [ ] Touch targets ≥ 44px on mobile
  [ ] Filter drawer opens/closes on mobile
  [ ] Mega menu accordion works on mobile

PRESERVED FUNCTIONALITY
  [ ] All routes unchanged (/catalog, /catalog/products/:id, etc.)
  [ ] ProductForm creates and edits products
  [ ] BrandsPage, CategoriesPage, ImportPage unchanged
  [ ] CatalogDashboardWidget unchanged
  [ ] EquipmentRegistryPage not broken (CSS dependency resolved)
  [ ] No backend / API / database changes
```
