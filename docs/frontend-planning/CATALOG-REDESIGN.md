# Product Catalog Redesign — Component Architecture

**Inspiration:** JenStore Thailand (e-commerce catalog UX for industrial equipment)  
**Constraint:** Existing APIs only. Zero backend changes.  
**Date:** 2026-06-21

---

## 0. Current State vs Target

### Existing Files (14 files)

```
Pages (7):
  CatalogPage.tsx + .css          — grid/list, search, 3 filters, pagination
  ProductDetailPage.tsx + .css    — 2-col: gallery + info + specs
  BrandsPage.tsx + .css           — brand CRUD table
  CategoriesPage.tsx + .css       — tree CRUD
  ImportPage.tsx + .css           — Excel import
  ProductForm.tsx                 — modal create/edit

Components (5):
  ProductCard.tsx + .css          — grid card: photo + badges + name + brand + model + category + sku
  ProductImageGallery.tsx         — main image + thumbs + lightbox (borrows ProductDetailPage.css)
  SpecTable.tsx                   — grouped specs key-value table
  CatalogDashboardWidget.tsx      — 3 stat cards on dashboard
```

### Available API Data

**Product (list):** id, sku, name_en, name_lo, slug, model_number, brand{id,name,slug,logo_url,country}, category{id,name_en,name_lo,slug,level}, is_active, is_featured, is_sale, is_rental, is_used_available, is_service_item, sort_order, primary_image_url, created_at, updated_at

**ProductDetail (extends Product):** description_en, description_lo, specs_grouped{group→specs[]}, images[]{id,image_url,alt_text,is_primary,sort_order}, compat_brands[]{brand,notes}, created_by, updated_by

**Brand:** id, name, slug, logo_url, country, brand_role, website, description, is_active, sort_order

**ProductCategory:** id, name_en, name_lo, slug, level, parent_id, description, icon, sort_order, is_active, children[] (recursive tree)

**List params:** q, category_id, brand_id, is_active, is_rental, is_sale, is_featured, page, page_size, sort, order

### Gap Analysis

| Area | Current | JenStore-Inspired Target |
|---|---|---|
| **Category navigation** | `<select>` dropdown with indent | Visual mega-menu with icons, subcategories, product counts |
| **Brand discovery** | `<select>` dropdown | Brand showcase carousel with logos, country, filter-on-click |
| **Product cards** | Basic: photo + text stack | Rich: hover image swap, quick-view, type pills, brand logo |
| **Product gallery** | Functional but basic | Full-screen lightbox, zoom, image counter, keyboard nav |
| **Search** | Inline text input, immediate filter | Prominent search bar with category scope, suggestions |
| **Filtering** | 3 `<select>` dropdowns | Sidebar filter panel with checkboxes, active filter pills, counts |
| **Mobile** | Grid shrinks, columns hide | Bottom-sheet filters, sticky search, swipeable cards |
| **Page hero** | None — jumps straight to toolbar | Category hero banner with breadcrumb + title + description |

---

## 1. Page Architecture

### 1.1 Catalog Page — Redesigned Layout

**Route:** `/catalog` (unchanged)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  CATALOG HERO HEADER                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Product Catalog                                     [+ New Product] ││
│  │ Browse our complete range of forklifts, parts, and accessories.    ││
│  │                                                                     ││
│  │ ┌───────────────────────────────────────────────────────────────┐  ││
│  │ │  🔍 Search products by name, SKU, model...      [All Categories▾]│ ││
│  │ └───────────────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  MEGA CATEGORY MENU                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ 🚛       │ │ ⚙️       │ │ 🔧       │ │ 🛡️       │ │ 📦       │    │
│  │ Forklifts│ │ Parts    │ │ Service  │ │ Safety   │ │ Acces.   │    │
│  │ 42 items │ │ 128 items│ │ 15 items │ │ 23 items │ │ 36 items │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                                         │
│  BRAND SHOWCASE                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Shop by Brand                                          [View All →]│ │
│  │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐ │ │
│  │ │[LOGO]  │ │[LOGO]  │ │[LOGO]  │ │[LOGO]  │ │[LOGO]  │ │ →    │ │ │
│  │ │Toyota  │ │Komatsu │ │Jungh.  │ │Mitsub. │ │Still   │ │      │ │ │
│  │ │Japan   │ │Japan   │ │Germany │ │Japan   │ │Germany │ │      │ │ │
│  │ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └──────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ACTIVE FILTERS BAR (when any filter active)                            │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Brand: Toyota ✕  │  Category: Forklifts ✕  │  Type: Rental ✕     │ │
│  │                                               ✕ Clear all filters │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  CONTENT AREA                                                           │
│  ┌──────────────────────┐  ┌─────────────────────────────────────────┐ │
│  │ FILTER SIDEBAR       │  │ TOOLBAR                                 │ │
│  │                      │  │ Showing 1-20 of 42     [Sort▾] [▦] [≡] │ │
│  │ Type                 │  │                                         │ │
│  │ ☐ For Sale (28)      │  │ PRODUCT GRID                           │ │
│  │ ☐ For Rental (15)    │  │ ┌────────┐ ┌────────┐ ┌────────┐      │ │
│  │ ☑ Featured (8)       │  │ │ CARD   │ │ CARD   │ │ CARD   │      │ │
│  │                      │  │ │        │ │        │ │        │      │ │
│  │ ─────────────────    │  │ └────────┘ └────────┘ └────────┘      │ │
│  │ Brand                │  │ ┌────────┐ ┌────────┐ ┌────────┐      │ │
│  │ ☐ Toyota (12)        │  │ │ CARD   │ │ CARD   │ │ CARD   │      │ │
│  │ ☐ Komatsu (8)        │  │ │        │ │        │ │        │      │ │
│  │ ☑ Jungheinrich (5)   │  │ └────────┘ └────────┘ └────────┘      │ │
│  │ ☐ Mitsubishi (4)     │  │                                         │ │
│  │ ☐ Still (3)          │  │ PAGINATION                              │ │
│  │ [Show 10 more]       │  │ ◀  1  2  3  ...  8  ▶                  │ │
│  │                      │  │                                         │ │
│  │ ─────────────────    │  └─────────────────────────────────────────┘ │
│  │ Category             │                                              │
│  │ ▾ Forklifts          │                                              │
│  │   ☐ Electric (8)     │                                              │
│  │   ☐ Diesel (15)      │                                              │
│  │   ☐ LPG (6)          │                                              │
│  │ ▸ Parts & Spares     │                                              │
│  │ ▸ Accessories        │                                              │
│  │                      │                                              │
│  │ ─────────────────    │                                              │
│  │ Status               │                                              │
│  │ ☑ Active (38)        │                                              │
│  │ ☐ Inactive (4)       │                                              │
│  │                      │                                              │
│  └──────────────────────┘                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Product Detail Page — Redesigned Layout

**Route:** `/catalog/products/:id` (unchanged)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ BREADCRUMB: Products / Forklifts / Electric / Toyota 8FBN30            │
│                                                                         │
│  ┌─── GALLERY COLUMN (50%) ───────┐  ┌─── INFO COLUMN (50%) ───────┐  │
│  │                                 │  │                              │  │
│  │  ┌─────────────────────────┐   │  │  TOYOTA                      │  │
│  │  │                         │   │  │  Toyota 8FBN30 Electric      │  │
│  │  │     MAIN IMAGE          │   │  │  Forklift                    │  │
│  │  │     (zoom on hover)     │   │  │                              │  │
│  │  │                         │   │  │  ┌──────┐ ┌──────┐ ┌──────┐ │  │
│  │  │                    1/5  │   │  │  │ Sale │ │Rental│ │ ★    │ │  │
│  │  │  [◀]            [▶]    │   │  │  └──────┘ └──────┘ └──────┘ │  │
│  │  └─────────────────────────┘   │  │                              │  │
│  │                                 │  │  SKU: PRD-00042              │  │
│  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐     │  │  Model: 8FBN30               │  │
│  │  │ 1 │ │ 2 │ │ 3 │ │ 4 │     │  │  Category: Electric Forklifts│  │
│  │  └───┘ └───┘ └───┘ └───┘     │  │                              │  │
│  │                                 │  │  ─────────────────────────   │  │
│  └─────────────────────────────────┘  │                              │  │
│                                        │  DESCRIPTION                │  │
│                                        │  The Toyota 8FBN30 is a     │  │
│                                        │  high-performance electric  │  │
│                                        │  forklift designed for...   │  │
│                                        │                              │  │
│                                        │  ─────────────────────────   │  │
│                                        │                              │  │
│                                        │  COMPATIBLE WITH             │  │
│                                        │  ┌──────┐ ┌──────┐          │  │
│                                        │  │Toyota│ │BT    │          │  │
│                                        │  └──────┘ └──────┘          │  │
│                                        │                              │  │
│                                        │  ACTIONS                     │  │
│                                        │  [Edit] [Create Quotation]   │  │
│                                        │                              │  │
│                                        └──────────────────────────────┘  │
│                                                                         │
│  ┌─── SPECIFICATIONS (full width) ─────────────────────────────────┐   │
│  │                                                                   │   │
│  │  TAB BAR: [Performance] [Dimensions] [Electrical] [Features]     │   │
│  │                                                                   │   │
│  │  ┌──────────────┬───────────────┐                                │   │
│  │  │ Load Capacity │ 3,000 kg      │                                │   │
│  │  │ Lift Height   │ 6,000 mm      │                                │   │
│  │  │ Drive Speed   │ 16 km/h       │                                │   │
│  │  │ Battery       │ 48V / 775Ah   │                                │   │
│  │  └──────────────┴───────────────┘                                │   │
│  │                                                                   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─── RELATED PRODUCTS ────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  Products in the same category                    [View All →]   │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                   │   │
│  │  │ CARD   │ │ CARD   │ │ CARD   │ │ CARD   │                   │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘                   │   │
│  │                                                                   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Component Tree

```
CatalogPage (list — rewrite)
│
├── CatalogHero                              NEW
│   ├── SearchBarWithScope                   NEW
│   │   └── CategoryScopeDropdown            NEW (inline)
│   └── action buttons
│
├── MegaCategoryMenu                         NEW
│   └── CategoryChip × N                     NEW (inline)
│
├── BrandShowcase                            NEW
│   └── BrandLogoCard × N                    NEW
│
├── ActiveFilterBar                          NEW
│   └── FilterPill × N                       NEW (inline)
│
├── FilterSidebar                            NEW
│   ├── FilterSection ("Type")               NEW
│   │   └── FilterCheckbox × N               NEW (inline)
│   ├── FilterSection ("Brand")              NEW
│   │   └── FilterCheckbox × N + "Show more"
│   └── FilterSection ("Category")           NEW
│       └── CategoryTreeFilter               NEW
│
├── CatalogToolbar                           NEW
│   ├── ResultCount
│   ├── SortDropdown                         NEW
│   └── ViewToggle (existing pattern, keep)
│
├── CatalogProductCard                       NEW (replaces ProductCard)
│   ├── CardImage (hover swap)
│   ├── CardBadges (type pills)
│   ├── CardBody (brand, name, model, sku)
│   └── CardQuickActions (view, edit, quick-view)
│
├── CatalogListRow (table view)              ENHANCED
│   ├── RowThumbnail
│   ├── TypeBadges
│   └── RowActionMenu
│
├── QuickViewDrawer                          NEW
│   ├── ProductImageGallery (reuse enhanced)
│   ├── key specs preview
│   └── action buttons
│
├── ProductForm (existing, unchanged)
├── ConfirmDialog (existing, unchanged)
└── Pagination (existing pattern)

ProductDetailPage (detail — rewrite)
│
├── ProductBreadcrumb                        built from category chain
│
├── ProductGallery                           NEW (replaces ProductImageGallery)
│   ├── MainImage (zoom on hover)
│   ├── ThumbnailStrip
│   ├── ImageCounter ("1/5")
│   └── FullScreenLightbox                   NEW
│       ├── LightboxImage (zoom/pan)
│       ├── LightboxThumbs
│       └── keyboard navigation
│
├── ProductInfoPanel                         NEW
│   ├── BrandLabel
│   ├── ProductTitle + name_lo
│   ├── TypeBadges
│   ├── ProductMeta (SKU, model, category)
│   ├── DescriptionBlock
│   ├── CompatBrandsList                     ENHANCED
│   └── ProductActions                       NEW
│
├── TabbedSpecifications                     NEW (replaces SpecTable)
│   ├── SpecTabBar (one tab per spec_group)
│   └── SpecGrid (key-value grid for active group)
│
├── RelatedProducts                          NEW
│   └── CatalogProductCard × 4 (reuse)
│
├── ProductForm (existing, unchanged)
└── ConfirmDialog (existing, unchanged)
```

---

## 3. Component Specifications

### 3.1 MegaCategoryMenu

**File:** `src/components/catalog/MegaCategoryMenu.tsx` + `.css`

**Props:**
```typescript
interface MegaCategoryMenuProps {
  categories: ProductCategory[]       // tree from useCategories().tree
  activeCategoryId: number | null     // currently filtered category
  onCategorySelect: (id: number | null) => void
  productCounts?: Record<number, number>  // optional: per-category count
}
```

**Visual:**
```
COLLAPSED STATE (default — top-level categories as horizontal chips):

  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ 🚛       │ │ ⚙️       │ │ 🔧       │ │ 🛡️       │ │ 📦       │
  │ Forklifts│ │ Parts    │ │ Service  │ │ Safety   │ │ Acces.   │
  │ 42 items │ │ 128 items│ │ 15 items │ │ 23 items │ │ 36 items │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘

  Chip: 120px min, surface bg, border, 10px radius
  Active: primary-50 bg, primary border, primary text
  Icon: from category.icon field (Lucide name) or fallback Package icon
  Count: derived from productCounts prop or omitted

EXPANDED STATE (on hover or click — subcategory flyout):

  ┌──────────┐
  │ 🚛       │ ← hovered
  │ Forklifts│───────────────────────────────────────┐
  │ 42 items │  │                                     │
  └──────────┘  │  All Forklifts (42)                 │
                │                                     │
                │  ▸ Electric Forklifts (8)            │
                │  ▸ Diesel Forklifts (15)             │
                │  ▸ LPG Forklifts (6)                 │
                │  ▸ Dual Fuel Forklifts (3)           │
                │                                     │
                │  ▸ Warehouse Forklifts (10)          │
                │                                     │
                └─────────────────────────────────────┘

  Flyout: 280px wide, absolute below or beside parent chip
  Each subcategory is clickable → sets category_id filter
  "All {Parent}" clears to parent-level filter
  Desktop: hover to expand with 200ms delay
  Mobile: tap to expand, tap again to navigate
```

**Data source:**
- `useCategories().tree` — provides full tree with children
- Product counts: compute client-side by calling `getProducts({ category_id: X, page_size: 0 })` for each top-level category on mount (7 calls max), or derive from an unfiltered product list. Simpler: omit counts initially, add them as progressive enhancement.

**Recommended approach for counts:** Use the `category.children` length as a heuristic. Exact product counts require per-category API calls. Defer this — show categories without counts in v1, add count badges in v2 via a dedicated summary endpoint (or batch client-side calls on idle).

**Acceptance criteria:**
- Top-level categories render from tree data
- Clicking a chip filters the product grid by `category_id`
- Active chip is visually highlighted
- Subcategories visible on hover (desktop) or tap (mobile)
- Clicking subcategory sets exact `category_id`
- Clicking "All {Parent}" on flyout sets parent `category_id`
- Horizontal scroll on mobile if categories overflow

---

### 3.2 BrandShowcase

**File:** `src/components/catalog/BrandShowcase.tsx` + `.css`

**Props:**
```typescript
interface BrandShowcaseProps {
  brands: Brand[]
  activeBrandId: number | null
  onBrandSelect: (id: number | null) => void
}
```

**Visual:**
```
┌────────────────────────────────────────────────────────────────┐
│  Shop by Brand                                    [View All →] │
│                                                                │
│  ◀  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  ▶│
│     │ [LOGO] │ │ [LOGO] │ │ [LOGO] │ │ [LOGO] │ │ [LOGO] │   │
│     │        │ │        │ │        │ │        │ │        │   │
│     │ Toyota │ │Komatsu │ │Jungh.  │ │Still   │ │Linde   │   │
│     │ 🇯🇵    │ │ 🇯🇵    │ │ 🇩🇪    │ │ 🇩🇪    │ │ 🇩🇪    │   │
│     └────────┘ └────────┘ └────────┘ └────────┘ └────────┘   │
│                                                                │
│     ● ○ ○                                                     │
└────────────────────────────────────────────────────────────────┘

Brand card: 140px × 120px
  Logo area: 80px × 60px, centered, contain, bg-subtle
  Brand name: 13px semibold, centered
  Country: 11px muted, or flag emoji from country field
  Active: primary border ring, primary-50 bg
  Hover: shadow-sm, translateY(-2px)

Carousel:
  Desktop: show 5-6 cards, arrow buttons on sides
  Tablet: show 4 cards
  Mobile: show 2.5 cards (peek effect), swipeable
  Dots: pagination dots below, indicates current slide group

"View All →" links to /catalog/brands
```

**Brands without logos:** Show brand initial(s) in a colored circle (use module accent color or hash-derived color from brand name).

**Data source:** `useBrands(true)` — existing hook, returns active brands with `logo_url`, `country`.

**Acceptance criteria:**
- All active brands displayed
- Clicking a brand card filters products by `brand_id`
- Active brand visually highlighted
- Clicking active brand again clears the filter
- Smooth horizontal scroll/carousel on mobile
- "View All" navigates to brands page

---

### 3.3 FilterSidebar

**File:** `src/components/catalog/FilterSidebar.tsx` + `.css`

**Props:**
```typescript
interface FilterSidebarProps {
  // Current filter state
  params: ProductListParams
  onParamsChange: (next: Partial<ProductListParams>) => void

  // Data for filter options
  brands: Brand[]
  categoryTree: ProductCategory[]

  // Responsive
  isOpen: boolean              // for mobile drawer mode
  onClose: () => void          // close mobile drawer
}
```

**Visual:**
```
┌──────────────────────┐
│  Filters             │
│                      │
│  TYPE                │
│  ☐ For Sale (28)     │  ← checkbox + label + count
│  ☐ For Rental (15)   │
│  ☑ Featured (8)      │  ← checked = active filter
│  ☐ Used Available    │
│  ☐ Service Item      │
│                      │
│  ─────────────────   │
│                      │
│  BRAND               │
│  [🔍 Filter brands]  │  ← mini search within section
│  ☐ Toyota (12)       │
│  ☐ Komatsu (8)       │
│  ☐ Jungheinrich (5)  │
│  ☐ Mitsubishi (4)    │
│  ☐ Still (3)         │
│  [+ Show 10 more]    │  ← expand to show all brands
│                      │
│  ─────────────────   │
│                      │
│  CATEGORY            │
│  ▾ Forklifts         │  ← collapsible tree
│    ☐ Electric (8)    │
│    ☐ Diesel (15)     │
│    ☐ LPG (6)         │
│  ▸ Parts & Spares    │
│  ▸ Accessories       │
│                      │
│  ─────────────────   │
│                      │
│  STATUS              │
│  ◉ Active only       │  ← radio buttons
│  ○ All               │
│  ○ Inactive only     │
│                      │
└──────────────────────┘

Desktop: fixed sidebar, 240px wide, left of product grid
Mobile: slide-in drawer from left, full height, backdrop
```

**FilterSection sub-component (internal):**
```typescript
interface FilterSectionProps {
  title: string
  collapsible?: boolean      // default true
  defaultOpen?: boolean      // default true
  children: ReactNode
}
```

**CategoryTreeFilter sub-component (internal):**
- Renders category tree with collapsible groups
- Parent click expands/collapses children
- Child checkbox sets `category_id` filter
- Parent checkbox sets parent `category_id` (includes all children — API handles this)

**Data flow:**
- Type filters → mapped to `is_sale`, `is_rental`, `is_featured`, `is_used_available`, `is_service_item` params
- Brand filter → `brand_id` param (single select — API limitation)
- Category filter → `category_id` param (single select)
- Status → `is_active` param (true/false/undefined)

**Counts:** Since the API doesn't provide faceted counts, showing exact per-filter counts requires additional API calls. v1 approach: show counts only for "Type" (can be derived client-side from the current page's products). Brand and category counts omitted in v1.

**Acceptance criteria:**
- Type checkboxes toggle corresponding API params
- Brand selection updates `brand_id`
- Category tree shows hierarchy from `useCategories().tree`
- Each filter change resets to page 1
- Mobile: renders as drawer with close button
- Filters sync to URL params for shareability
- "Show more" on brands reveals full list

---

### 3.4 ActiveFilterBar

**File:** `src/components/catalog/ActiveFilterBar.tsx` + `.css`

**Props:**
```typescript
interface ActiveFilterBarProps {
  params: ProductListParams
  brands: Brand[]
  categories: ProductCategory[]   // flat list
  onRemoveFilter: (key: string) => void
  onClearAll: () => void
}
```

**Visual:**
```
┌────────────────────────────────────────────────────────────────┐
│  Brand: Toyota ✕  │  Category: Electric ✕  │  ★ Featured ✕   │
│                                             ✕ Clear all       │
└────────────────────────────────────────────────────────────────┘

Only renders when at least one filter is active.
Each pill shows: filter name + value + ✕ remove button.
"Clear all" removes all filters and resets to default view.
```

**Logic:**
- Iterate over `params` keys
- If `brand_id` set → resolve name from `brands[]`, show pill
- If `category_id` set → resolve `name_en` from `categories[]`, show pill
- If `is_sale/is_rental/is_featured` → show corresponding label
- If `q` set → show search term pill

**Acceptance criteria:**
- Hidden when no filters active
- Clicking ✕ on a pill removes that specific filter
- "Clear all" resets all filters
- Animates smoothly on add/remove

---

### 3.5 CatalogHero

**File:** `src/components/catalog/CatalogHero.tsx` + `.css`

**Props:**
```typescript
interface CatalogHeroProps {
  total: number
  onSearch: (query: string) => void
  searchValue: string
  onCategoryScope: (categoryId: number | null) => void
  categoryScope: number | null
  categories: ProductCategory[]       // for scope dropdown
  onNewProduct: () => void
}
```

**Visual:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Product Catalog                            [↻ Refresh]         │
│  Browse our complete range of forklifts,   [+ New Product]      │
│  parts, and accessories.                                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🔍 │ Search products by name, SKU, model...  │ All ▾    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Background: var(--color-surface), border-bottom, subtle gradient or flat
Height: ~160px including search bar
Search bar: 48px tall, prominent, centered, max-width 680px
Category scope: dropdown appended to search bar's right
  Options: "All Categories", then top-level categories from tree

Desktop: title left, actions right, search centered below
Mobile: stacked — title, search, actions below
```

**Acceptance criteria:**
- Search input has 300ms debounce
- Category scope dropdown limits search to a category
- "New Product" opens the existing ProductForm modal
- Responsive stacking on mobile

---

### 3.6 CatalogProductCard (replaces ProductCard)

**File:** `src/components/catalog/CatalogProductCard.tsx` + `.css`

**Props:**
```typescript
interface CatalogProductCardProps {
  product: Product
  onClick: () => void          // navigate to detail
  onEdit: () => void
  onQuickView: () => void      // open QuickViewDrawer
}
```

**Visual:**
```
┌──────────────────────────────┐
│ ┌──────────────────────────┐ │
│ │                          │ │
│ │     PRODUCT IMAGE        │ │  ← 4:3 aspect ratio
│ │     (object-fit: contain)│ │     hover: subtle zoom (scale 1.05)
│ │                          │ │
│ │ ┌──────┐ ┌──────┐       │ │  ← Overlaid type pills (top-left)
│ │ │ Sale │ │Rental│       │ │
│ │ └──────┘ └──────┘       │ │
│ │                          │ │
│ │          [👁 Quick View] │ │  ← Hover-visible quick view button
│ │                          │ │     (bottom-center, appears on hover)
│ └──────────────────────────┘ │
│                              │
│  TOYOTA                      │  ← Brand (11px, uppercase, primary color)
│  Toyota 8FBN30 Electric      │  ← Name (14px, semibold, 2 lines max)
│  Forklift                    │     overflow: line-clamp 2
│                              │
│  Model: 8FBN30               │  ← Model (12px, muted)
│  SKU: PRD-00042              │  ← SKU (11px, mono, muted)
│                              │
│  ┌──────┐                    │
│  │ Forklifts                 │  ← Category chip (12px, bg-subtle, rounded)
│  └──────┘                    │
│                              │
│  [Edit]                      │  ← Hover-visible edit button (bottom-right)
│                              │
└──────────────────────────────┘

ENHANCEMENTS OVER CURRENT ProductCard:
──────────────────────────────────────
1. Image hover: subtle scale(1.05) with overflow: hidden
2. Quick View button: centered at bottom of image on hover
3. Name: line-clamp 2 (prevents tall cards)
4. Category chip: small rounded label below SKU
5. Card width: minmax(240px, 1fr) — slightly larger than current 220px
6. Featured star badge: gold star icon overlaid top-right of image
7. Inactive state: grayscale image + "Inactive" overlay
```

**Acceptance criteria:**
- Card click navigates to detail page
- Edit button opens ProductForm modal
- Quick View button opens QuickViewDrawer
- Image hover zoom effect is smooth
- 2-line name truncation via CSS line-clamp
- Badge styling matches JenStore pill pattern

---

### 3.7 QuickViewDrawer

**File:** `src/components/catalog/QuickViewDrawer.tsx` + `.css`

**Props:**
```typescript
interface QuickViewDrawerProps {
  productId: number | null     // null = closed
  onClose: () => void
}
```

**Visual (uses existing Drawer component as base):**
```
┌─── Drawer (480px) ────────────────────────┐
│                                            │
│  [✕ Close]                                 │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │                                    │   │
│  │        PRODUCT IMAGE               │   │  ← Primary image, 4:3
│  │        (simplified gallery)        │   │
│  │                                    │   │
│  │  ┌─┐ ┌─┐ ┌─┐                     │   │  ← Thumbnail dots
│  └────────────────────────────────────┘   │
│                                            │
│  TOYOTA                                    │
│  Toyota 8FBN30 Electric Forklift           │
│                                            │
│  ┌──────┐ ┌──────┐ ┌──────┐              │
│  │ Sale │ │Rental│ │ ★    │              │
│  └──────┘ └──────┘ └──────┘              │
│                                            │
│  SKU: PRD-00042                           │
│  Model: 8FBN30                            │
│  Category: Electric Forklifts             │
│                                            │
│  KEY SPECS (first 4 specs)                 │
│  ┌─────────────┬──────────┐              │
│  │ Capacity    │ 3,000 kg │              │
│  │ Lift Height │ 6,000 mm │              │
│  │ Drive Speed │ 16 km/h  │              │
│  │ Battery     │ 48V      │              │
│  └─────────────┴──────────┘              │
│                                            │
│  [Open Full Detail →]    [Edit]            │
│                                            │
└────────────────────────────────────────────┘
```

**Logic:**
1. When `productId` changes to non-null, call `getProduct(productId)` to fetch detail
2. Show skeleton while loading
3. Render condensed view: first image, key fields, first 4 specs
4. "Open Full Detail" navigates to `/catalog/products/:id`

**Dependencies:** `getProduct` API (existing), `Drawer` component (existing)

**Acceptance criteria:**
- Opens from the right, 480px width
- Fetches full product detail on open
- Shows key info without scrolling (fits viewport)
- "Open Full Detail" navigates and closes drawer
- Esc / backdrop click closes

---

### 3.8 ProductGallery (replaces ProductImageGallery)

**File:** `src/components/catalog/ProductGallery.tsx` + `.css`

**Props:**
```typescript
interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
}
```

**Visual:**
```
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │        MAIN IMAGE               │   │  ← aspect-ratio: 4/3
│  │        (hover: magnifying glass │   │     hover: zoom lens effect
│  │         cursor, zoom 2x in     │   │     click: open lightbox
│  │         tracking area)          │   │
│  │                                 │   │
│  │  [◀]                      [▶]  │   │
│  │                          1 / 5  │   │  ← Counter badge (bottom-right)
│  └─────────────────────────────────┘   │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │thumb │ │thumb │ │thumb │ │thumb │  │  ← 72px × 72px thumbnails
│  │●actv │ │      │ │      │ │      │  │     active: blue 2px border
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│                                         │
└─────────────────────────────────────────┘

LIGHTBOX (on click):
┌─────────────────────────────────────────────────────┐
│  (black overlay, z-index 1000)                       │
│                                                      │
│  [✕ Close]                                 1 / 5     │
│                                                      │
│  [◀]     FULL-SIZE IMAGE (pinch to zoom)       [▶]  │
│          (swipe on mobile)                           │
│                                                      │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                          │
│  │ 1│ │ 2│ │ 3│ │ 4│ │ 5│   ← lightbox thumbnails  │
│  └──┘ └──┘ └──┘ └──┘ └──┘                          │
│                                                      │
│  [← → to navigate, Esc to close]                    │
└─────────────────────────────────────────────────────┘
```

**Enhancements over current ProductImageGallery:**

| Feature | Current | New |
|---|---|---|
| Zoom on hover | None | CSS zoom lens (scale(2) on mouse position) |
| Image counter | None | "1 / 5" badge on main image |
| Lightbox thumbnails | None | Thumbnail strip in lightbox |
| Lightbox keyboard | None | Arrow keys navigate, Esc closes |
| Empty state | Placeholder SVG | Styled empty state with upload suggestion |
| Lightbox counter | None | "1 / 5" in top-right |
| Mobile lightbox | Same as desktop | Full-screen, swipe to navigate |

**Acceptance criteria:**
- Hover on main image shows zoom lens effect
- Click opens full-screen lightbox
- Arrow keys navigate in lightbox
- Thumbnails clickable in both normal and lightbox modes
- Image counter shows current / total
- Empty state when no images

---

### 3.9 TabbedSpecifications (replaces SpecTable)

**File:** `src/components/catalog/TabbedSpecifications.tsx` + `.css`

**Props:**
```typescript
interface TabbedSpecificationsProps {
  specsGrouped: Record<string, ProductSpec[]>
}
```

**Visual:**
```
┌─────────────────────────────────────────────────────────────┐
│  Specifications                                              │
│                                                              │
│  [Performance●]  [Dimensions]  [Electrical]  [Features]     │
│                                                              │
│  ┌──────────────────────┬──────────────────────────────┐    │
│  │ Load Capacity        │ 3,000 kg                     │    │
│  ├──────────────────────┼──────────────────────────────┤    │
│  │ Max Lift Height      │ 6,000 mm                     │    │
│  ├──────────────────────┼──────────────────────────────┤    │
│  │ Free Lift Height     │ 2,100 mm                     │    │
│  ├──────────────────────┼──────────────────────────────┤    │
│  │ Drive Speed (loaded) │ 16 km/h                      │    │
│  ├──────────────────────┼──────────────────────────────┤    │
│  │ Lift Speed (loaded)  │ 0.55 m/s                     │    │
│  └──────────────────────┴──────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Tab bar: one tab per spec_group key from specsGrouped
Active tab: bottom border in primary color, bold text
Spec table: alternating row bg, label 40% / value 60%
Mobile: tabs scroll horizontally, table full-width
```

**Logic:**
- Each key of `specsGrouped` becomes a tab
- Default to first group
- Tab state local (useState), not URL-driven

**Acceptance criteria:**
- Renders tab per spec group
- Clicking tab shows that group's specs
- Renders nothing if `specsGrouped` is empty
- Mobile: tabs horizontally scrollable

---

### 3.10 RelatedProducts

**File:** `src/components/catalog/RelatedProducts.tsx` + `.css`

**Props:**
```typescript
interface RelatedProductsProps {
  categoryId: number | null
  currentProductId: number       // exclude from results
  brandId: number | null         // optional: prioritize same-brand
}
```

**Visual:**
```
┌─────────────────────────────────────────────────────────────┐
│  Related Products                              [View All →]  │
│                                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│  │ Card   │ │ Card   │ │ Card   │ │ Card   │              │
│  │        │ │        │ │        │ │        │              │
│  └────────┘ └────────┘ └────────┘ └────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Logic:**
1. On mount, call `getProducts({ category_id: categoryId, page_size: 5 })`
2. Filter out `currentProductId` from results
3. Show up to 4 `CatalogProductCard` components
4. "View All" navigates to `/catalog?category_id={categoryId}`
5. If no same-category products, try same-brand: `getProducts({ brand_id: brandId, page_size: 5 })`
6. If neither produces results, hide the section entirely

**Data source:** Existing `getProducts` API with category/brand filter.

**Acceptance criteria:**
- Shows 4 related products max
- Excludes current product from results
- Clicking a card navigates to that product's detail
- Hidden if no related products exist
- "View All" navigates with correct filter param

---

### 3.11 SearchBarWithScope

**File:** Inline component within `CatalogHero.tsx`

**Visual:**
```
┌──────────────────────────────────────────────────────────────┐
│  🔍 │ Search products by name, SKU, model...  │ All Categ ▾ │
└──────────────────────────────────────────────────────────────┘

Input: 48px height, rounded-lg, prominent shadow
Scope dropdown: right-aligned inside the input, dropdown with:
  - "All Categories"
  - Top-level categories from tree

Behavior:
- Typing updates `params.q` with 300ms debounce
- Scope dropdown sets `params.category_id` simultaneously
- Clearing search: ✕ button appears when text present
- Enter key submits immediately (cancels debounce)
```

**Acceptance criteria:**
- Debounced search triggers API call
- Category scope limits search to that category
- Clear button resets search text

---

### 3.12 ProductInfoPanel

**File:** `src/components/catalog/ProductInfoPanel.tsx` + `.css`

**Props:**
```typescript
interface ProductInfoPanelProps {
  product: ProductDetail
  onEdit: () => void
}
```

**Visual:**
```
┌────────────────────────────────────────┐
│                                        │
│  TOYOTA                                │  ← brand name (uppercase, primary)
│  Toyota 8FBN30 Electric Forklift       │  ← name_en (22px, bold)
│  ♦ Toyota 8FBN30 ລົດຍົກໄຟຟ້າ            │  ← name_lo (16px, muted, if exists)
│                                        │
│  ┌──────┐ ┌──────┐ ┌──────┐          │
│  │🛒Sale│ │🔧Rent│ │★ Feat│          │  ← Type pills
│  └──────┘ └──────┘ └──────┘          │
│                                        │
│  ┌────────────────────────────────┐   │
│  │  SKU          PRD-00042       │   │
│  │  Model        8FBN30          │   │  ← Key-value meta card
│  │  Category     Electric Forkl. │   │     (surface bg, border, rounded)
│  └────────────────────────────────┘   │
│                                        │
│  Description                           │
│  The Toyota 8FBN30 is a high-perf...  │  ← description_en
│                                        │
│  Compatible with                       │
│  ┌────────┐ ┌────────┐               │
│  │ Toyota │ │ BT     │               │  ← compat_brands as chips
│  │  Japan │ │ Sweden │               │
│  └────────┘ └────────┘               │
│                                        │
│  [✏️ Edit]  [📄 Create Quotation]      │  ← Action buttons
│                                        │
└────────────────────────────────────────┘
```

**Acceptance criteria:**
- All product fields render (null-safe — hide absent fields)
- Edit opens ProductForm modal
- Create Quotation navigates to `/quotations/new`
- Compatible brands show logo (if available) + name
- Mobile: full-width, stacked below gallery

---

### 3.13 ProductActions

**File:** Inline within `ProductInfoPanel`

**Actions:**
- **Edit** → opens ProductForm modal with product data
- **Create Quotation** → navigates to `/quotations/new` (future: with product pre-selected)
- **Delete** → opens ConfirmDialog

---

## 4. File Inventory

### 4.1 New Files (24)

```
src/components/catalog/
├── MegaCategoryMenu.tsx          NEW
├── MegaCategoryMenu.css          NEW
├── BrandShowcase.tsx             NEW
├── BrandShowcase.css             NEW
├── FilterSidebar.tsx             NEW
├── FilterSidebar.css             NEW
├── ActiveFilterBar.tsx           NEW
├── ActiveFilterBar.css           NEW
├── CatalogHero.tsx               NEW
├── CatalogHero.css               NEW
├── CatalogProductCard.tsx        NEW (replaces ProductCard)
├── CatalogProductCard.css        NEW (replaces ProductCard.css)
├── QuickViewDrawer.tsx           NEW
├── QuickViewDrawer.css           NEW
├── ProductGallery.tsx            NEW (replaces ProductImageGallery)
├── ProductGallery.css            NEW
├── ProductInfoPanel.tsx          NEW
├── ProductInfoPanel.css          NEW
├── TabbedSpecifications.tsx      NEW (replaces inline SpecTable usage)
├── TabbedSpecifications.css      NEW
├── RelatedProducts.tsx           NEW
├── RelatedProducts.css           NEW
├── CatalogToolbar.tsx            NEW
└── CatalogToolbar.css            NEW
```

### 4.2 Modified Files (2 — full rewrites)

```
src/pages/Catalog/CatalogPage.tsx           REWRITE — new layout with all new components
src/pages/Catalog/ProductDetailPage.tsx     REWRITE — tabbed specs, gallery, related products
```

### 4.3 Unchanged Files (7)

```
src/pages/Catalog/ProductForm.tsx           UNCHANGED — modal form works fine
src/pages/Catalog/BrandsPage.tsx + .css     UNCHANGED — admin CRUD
src/pages/Catalog/CategoriesPage.tsx + .css UNCHANGED — admin CRUD
src/pages/Catalog/ImportPage.tsx + .css     UNCHANGED — import workflow
src/components/catalog/SpecTable.tsx        UNCHANGED — reused inside TabbedSpecifications
src/components/catalog/CatalogDashboardWidget.tsx  UNCHANGED
```

### 4.4 Deprecated (delete after migration)

```
src/components/catalog/ProductCard.tsx      REPLACED BY CatalogProductCard
src/components/catalog/ProductCard.css      REPLACED BY CatalogProductCard.css
src/components/catalog/ProductImageGallery.tsx  REPLACED BY ProductGallery
src/pages/Catalog/CatalogPage.css           REPLACED (new CSS inline with rewrite)
src/pages/Catalog/ProductDetailPage.css     SPLIT into component-level CSS files
```

---

## 5. Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ CATALOG PAGE                                                         │
│                                                                      │
│  useCatalog(params) ─────────────→ GET /catalog/products/?params     │
│       ├─→ products[]  ─→ CatalogProductCard × N                     │
│       ├─→ total, pages ─→ Pagination                                │
│       └─→ params ─→ CatalogHero.searchValue                         │
│              ├─→ FilterSidebar (brand/category/type active states)   │
│              ├─→ ActiveFilterBar (resolved filter names)             │
│              └─→ MegaCategoryMenu (activeCategoryId)                 │
│                                                                      │
│  useBrands(true) ────────────────→ GET /catalog/brands/?active=true  │
│       ├─→ brands[] ─→ BrandShowcase                                 │
│       ├─→ brands[] ─→ FilterSidebar (brand checkboxes)              │
│       ├─→ brands[] ─→ ActiveFilterBar (resolve brand_id → name)     │
│       └─→ brands[] ─→ ProductForm (brand select)                    │
│                                                                      │
│  useCategories() ────────────────→ GET /catalog/categories/          │
│       ├─→ tree[] ─→ MegaCategoryMenu (hierarchy)                    │
│       ├─→ tree[] ─→ FilterSidebar (category tree filter)            │
│       ├─→ treeFlattened ─→ CatalogHero (scope dropdown)             │
│       ├─→ treeFlattened ─→ ActiveFilterBar (resolve category name)  │
│       └─→ treeFlattened ─→ ProductForm (category select)            │
│                                                                      │
│  QuickViewDrawer.productId ──────→ GET /catalog/products/:id         │
│       └─→ ProductDetail ─→ condensed view in drawer                 │
│                                                                      │
│  ZERO new API calls needed (all from existing endpoints)             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ PRODUCT DETAIL PAGE                                                  │
│                                                                      │
│  getProduct(id) ─────────────────→ GET /catalog/products/:id         │
│       ├─→ product ─→ ProductInfoPanel                               │
│       ├─→ product.images ─→ ProductGallery                          │
│       ├─→ product.specs_grouped ─→ TabbedSpecifications             │
│       ├─→ product.compat_brands ─→ CompatBrandsList (in InfoPanel)  │
│       └─→ product.category.id ─→ RelatedProducts                   │
│                                                                      │
│  RelatedProducts ────────────────→ GET /catalog/products/            │
│       └─→ { category_id, page_size: 5 }                            │
│                                                                      │
│  ONE new call per detail page view (RelatedProducts)                │
│  Everything else from single GET /products/:id                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Responsive Behavior

| Component | Desktop (≥1024) | Tablet (768-1023) | Mobile (<768) |
|---|---|---|---|
| **CatalogHero** | Title left, actions right, search centered below | Same, narrower search | Stacked: title, search, actions |
| **MegaCategoryMenu** | Horizontal chips, flyout on hover | Horizontal scroll, flyout on click | Horizontal scroll, modal on tap |
| **BrandShowcase** | 5-6 visible cards, arrows | 4 visible cards | 2.5 visible, swipe |
| **FilterSidebar** | 240px fixed sidebar, always visible | Hidden, toggle button in toolbar | Drawer from left, "Filters" button |
| **ActiveFilterBar** | Full width, wrapping pills | Full width | Horizontal scroll |
| **Product Grid** | 3 columns `minmax(240px, 1fr)` | 2 columns | 2 columns (< 480: 1 column) |
| **Product Card** | Full details, hover effects | Full details | Compact: shorter name, smaller image |
| **Detail: Gallery** | 50% width column, hover zoom | 100% width, above info | 100% width, above info |
| **Detail: InfoPanel** | 50% width column | 100% width, below gallery | 100% width |
| **Detail: Specs tabs** | Full width, 4 columns visible | Full width, scrollable tabs | Full width, scrollable tabs |
| **RelatedProducts** | 4 cards in a row | 3 cards | 2 cards, horizontal scroll |
| **QuickViewDrawer** | 480px right drawer | 420px right drawer | Full-screen modal |

### Mobile-Specific Patterns

**Filter Bottom Sheet:**
```
┌──────────────────────────────────┐
│          [drag handle]            │
│  Filters                [Apply]  │
│                                  │
│  TYPE                            │
│  ☐ For Sale    ☐ For Rental      │
│  ☐ Featured    ☐ Service Item    │
│                                  │
│  BRAND         [All ▾]           │
│                                  │
│  CATEGORY      [All ▾]           │
│                                  │
│  [Clear All]   [Show N Results]  │
└──────────────────────────────────┘
```

**Mobile Product Card (compact):**
```
┌────────────────────┐
│ [IMAGE 3:2]        │
│  ┌────┐ ┌────┐    │
│  │Sale│ │Rent│    │
│  └────┘ └────┘    │
├────────────────────┤
│ TOYOTA             │
│ Toyota 8FBN30      │
│ PRD-00042          │
└────────────────────┘

Differences from desktop:
  - Shorter image ratio (3:2 vs 4:3) to fit more in viewport
  - No model number line
  - No category chip
  - No hover effects
  - No Quick View button (tap card → detail page)
```

---

## 7. Build Order

```
PHASE 1: Leaf components (parallel, no page dependency)
─────────────────────────────────────────────────────────
  1.  CatalogProductCard.tsx + .css
  2.  MegaCategoryMenu.tsx + .css
  3.  BrandShowcase.tsx + .css
  4.  FilterSidebar.tsx + .css
  5.  ActiveFilterBar.tsx + .css
  6.  CatalogHero.tsx + .css
  7.  CatalogToolbar.tsx + .css
  8.  ProductGallery.tsx + .css
  9.  TabbedSpecifications.tsx + .css
  10. ProductInfoPanel.tsx + .css
  11. RelatedProducts.tsx + .css

PHASE 2: Composite components
─────────────────────────────────────────────────────────
  12. QuickViewDrawer.tsx + .css (depends on ProductGallery, Drawer)

PHASE 3: Page rewrites
─────────────────────────────────────────────────────────
  13. CatalogPage.tsx (rewrite — integrate all list components)
  14. ProductDetailPage.tsx (rewrite — gallery + info panel + specs + related)

PHASE 4: Cleanup
─────────────────────────────────────────────────────────
  15. Delete ProductCard.tsx + .css
  16. Delete ProductImageGallery.tsx
  17. Merge/clean up CatalogPage.css, ProductDetailPage.css
```

---

## 8. Verification Checklist

```
CATALOG PAGE
  [ ] Hero header renders with search bar and category scope dropdown
  [ ] MegaCategoryMenu shows all top-level categories from API
  [ ] Clicking a category chip filters products
  [ ] Subcategory flyout appears on hover (desktop) / tap (mobile)
  [ ] BrandShowcase renders with logos (or initials)
  [ ] Clicking a brand filters products
  [ ] FilterSidebar shows type, brand, category, status sections
  [ ] Checking a filter updates the product grid
  [ ] ActiveFilterBar shows pills for active filters
  [ ] Removing a pill clears that filter
  [ ] "Clear all" resets everything
  [ ] Search debounces at 300ms
  [ ] Sort dropdown works (name, created_at, sort_order)
  [ ] Grid view shows CatalogProductCard with hover effects
  [ ] List view shows enhanced table rows
  [ ] Quick View opens drawer with product preview
  [ ] Pagination works in both views
  [ ] Mobile: filter drawer opens/closes correctly
  [ ] Mobile: categories scroll horizontally
  [ ] New Product button opens ProductForm modal

PRODUCT DETAIL PAGE
  [ ] ProductGallery renders with hover zoom
  [ ] Lightbox opens on click, keyboard navigable
  [ ] Image counter shows "1 / N"
  [ ] Thumbnails selectable in both normal and lightbox
  [ ] ProductInfoPanel shows all product fields
  [ ] Type badges render correctly (sale, rental, featured)
  [ ] Compatible brands show as chips
  [ ] TabbedSpecifications shows one tab per spec_group
  [ ] Clicking tabs switches displayed specs
  [ ] RelatedProducts shows up to 4 same-category products
  [ ] Edit button opens ProductForm
  [ ] Breadcrumb shows category path
  [ ] Mobile: gallery full-width above info panel
  [ ] Mobile: specs tabs scroll horizontally

PRESERVED FUNCTIONALITY
  [ ] All existing routes unchanged
  [ ] ProductForm works for create and edit
  [ ] BrandsPage, CategoriesPage, ImportPage unchanged
  [ ] All existing API calls unchanged
  [ ] CatalogDashboardWidget unchanged
  [ ] No backend/API/database changes
```
