# DK Service Enterprise Platform — UI Foundation Implementation Plan

**Scope:** Items 1–10 from requirements. Shell & infrastructure only.  
**Constraint:** Zero backend / API / database changes. All existing routes and business logic preserved.  
**Date:** 2026-06-21

---

## 0. Current State Analysis

### 0.1 Existing File Inventory (97 source files)

```
src/
├── App.tsx                              ← routes, eagerly imported
├── App.css                              ← unused legacy
├── main.tsx                             ← entry point, imports index.css + shared.css
├── index.css                            ← 100 lines: reset, CSS vars, .btn classes
│
├── styles/
│   └── shared.css                       ← 183 lines: page-header, toolbar, table, form, pagination
│
├── api/          (9 files)              ← axios calls — DO NOT TOUCH
├── hooks/        (10 files)             ← data hooks — DO NOT TOUCH
├── types/        (9 files)              ← TS interfaces — DO NOT TOUCH
├── modules/      (2 files)              ← registry + types — WILL EXTEND
├── store/        (2 files)              ← authStore, toastStore — WILL ADD themeStore, sidebarStore
├── utils/        (1 file)               ← mockAdapter — DO NOT TOUCH
├── assets/       (3 files)              ← images — DO NOT TOUCH
│
├── components/
│   ├── layout/   (7 files)              ← AppLayout, Sidebar, Topbar, PrivateRoute + CSS
│   ├── ui/       (10 files)             ← Modal, Toast, Drawer, StatCard, Badge, ConfirmDialog + CSS
│   ├── charts/   (5 files)              ← ChartCard, TrendLine, BarCharts, index
│   ├── catalog/  (4 files)              ← ProductCard, ImageGallery, SpecTable, DashboardWidget
│   ├── equipment/(3 files)              ← ForkliftCard, ForkliftStatusBadge + CSS
│   ├── quotation/(1 file)               ← QuotationStatusBadge
│   └── rental/   (1 file)               ← RentalStatusBadge
│
└── pages/        (26 files across 8 folders) ← ALL PRESERVED, NO CHANGES IN THIS PLAN
```

### 0.2 Architecture Constraints Identified

| Area | Current Implementation | Constraint for Plan |
|---|---|---|
| **Routing** | All 19 page components eagerly imported in `App.tsx` | Must wrap in `React.lazy` + `Suspense` without changing route paths |
| **Layout** | `AppLayout` manages binary `sidebarOpen` boolean | Must evolve to 3-state: `expanded` / `collapsed` / `hidden` |
| **Sidebar width** | Hardcoded `240px` in CSS (Sidebar.css, AppLayout.css, Topbar.css) | Must extract to CSS variable and support `64px` collapsed state |
| **Topbar offset** | `left: 240px` hardcoded in Topbar.css | Must react to sidebar state via CSS variable |
| **Theme** | 10 CSS variables in `:root` of index.css | Must expand to full token system supporting light/dark |
| **Z-index** | Sidebar: 200, Topbar: 100, Modal/Drawer: 800, Toast: 9999 | Must formalize z-index scale |
| **Fonts** | `system-ui, 'Segoe UI', Roboto, sans-serif` | Must add Inter font |
| **Breakpoints** | Single `768px` in layout, `640px` in shared.css | Must implement 5-breakpoint system |
| **State** | Zustand: `authStore` (token, user), `toastStore` (toasts) | Must add `themeStore`, `sidebarStore` — same Zustand pattern |

### 0.3 Files That Will NOT Change

All files under these paths are untouched:

```
src/api/*              (9 files)
src/hooks/*            (10 files)
src/types/*            (9 files)
src/utils/*            (1 file)
src/assets/*           (3 files)
src/pages/*            (26 files — ALL page components stay identical)
src/components/catalog/*
src/components/charts/*
src/components/equipment/*
src/components/quotation/*
src/components/rental/*
src/components/ui/Badge.tsx
src/components/ui/ConfirmDialog.tsx
src/components/ui/StatCard.tsx  + StatCard.css
```

---

## 1. Folder Changes

### 1.1 New Directories

```
src/
├── styles/
│   ├── tokens.css            NEW — design tokens (colors, spacing, typography, shadows)
│   ├── breakpoints.css       NEW — responsive breakpoint utilities
│   └── shared.css            MODIFIED — import tokens, minor var name alignment
│
├── store/
│   ├── authStore.ts          UNCHANGED
│   ├── toastStore.ts         UNCHANGED
│   ├── themeStore.ts         NEW — theme preference (light/dark/system), persists to localStorage
│   └── sidebarStore.ts       NEW — sidebar state (expanded/collapsed/hidden), persists to localStorage
│
├── providers/
│   └── ThemeProvider.tsx      NEW — reads themeStore, applies [data-theme] to <html>, media query listener
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx      REWRITE — 3-state sidebar, CSS variable injection
│   │   ├── AppLayout.css      REWRITE — fluid sidebar margin via CSS vars
│   │   ├── Sidebar.tsx        REWRITE — collapsible groups, icon-rail, tooltips, search trigger
│   │   ├── Sidebar.css        REWRITE — expanded/collapsed/hidden states, dark-mode aware
│   │   ├── Topbar.tsx         REWRITE — breadcrumb slot, search trigger, notification bell, user menu
│   │   ├── Topbar.css         REWRITE — fluid left offset, dark-mode aware
│   │   ├── PrivateRoute.tsx   UNCHANGED
│   │   ├── Breadcrumb.tsx     NEW
│   │   └── Breadcrumb.css     NEW
│   │
│   └── ui/
│       ├── Modal.tsx          UNCHANGED
│       ├── Modal.css          MODIFIED — dark-mode token alignment only
│       ├── Toast.tsx          UNCHANGED
│       ├── Toast.css          MODIFIED — dark-mode token alignment only
│       ├── Drawer.tsx         UNCHANGED
│       ├── Drawer.css         MODIFIED — dark-mode token alignment only
│       ├── GlobalSearch.tsx   NEW — command palette (Cmd+K)
│       ├── GlobalSearch.css   NEW
│       ├── NotificationDropdown.tsx  NEW — bell icon + dropdown
│       ├── NotificationDropdown.css  NEW
│       ├── UserProfileMenu.tsx      NEW — avatar dropdown with logout, theme toggle
│       ├── UserProfileMenu.css      NEW
│       ├── ThemeToggle.tsx          NEW — light/dark/system switcher
│       └── ThemeToggle.css          NEW
│
├── modules/
│   ├── types.ts              UNCHANGED
│   └── registry.ts           UNCHANGED (nav config moves to new routeConfig)
│
├── config/
│   └── routes.ts             NEW — centralized route metadata (breadcrumb labels, parent paths)
```

### 1.2 Modified Files Summary

```
MODIFIED (content changes):
  index.html                        — Inter font link, data-theme attribute
  src/index.css                     — replace inline vars with @import tokens.css
  src/styles/shared.css             — swap hardcoded colors for token vars
  src/main.tsx                      — wrap App in ThemeProvider
  src/App.tsx                       — React.lazy imports, Suspense wrapper
  src/components/layout/AppLayout.tsx   — 3-state sidebar + CSS var injection
  src/components/layout/AppLayout.css   — fluid margin via --sidebar-width
  src/components/layout/Sidebar.tsx     — full rewrite
  src/components/layout/Sidebar.css     — full rewrite
  src/components/layout/Topbar.tsx      — full rewrite
  src/components/layout/Topbar.css      — full rewrite
  src/components/ui/Modal.css           — token alignment (minor)
  src/components/ui/Toast.css           — token alignment (minor)
  src/components/ui/Drawer.css          — token alignment (minor)

NEW (14 files):
  src/styles/tokens.css
  src/styles/breakpoints.css
  src/store/themeStore.ts
  src/store/sidebarStore.ts
  src/providers/ThemeProvider.tsx
  src/config/routes.ts
  src/components/layout/Breadcrumb.tsx
  src/components/layout/Breadcrumb.css
  src/components/ui/GlobalSearch.tsx
  src/components/ui/GlobalSearch.css
  src/components/ui/NotificationDropdown.tsx
  src/components/ui/NotificationDropdown.css
  src/components/ui/UserProfileMenu.tsx
  src/components/ui/UserProfileMenu.css
  src/components/ui/ThemeToggle.tsx
  src/components/ui/ThemeToggle.css

DELETABLE:
  src/App.css                       — unused (no import references it)
```

### 1.3 Final Directory Tree (src/ only, showing all new + modified)

```
src/
├── main.tsx                        MOD  — add ThemeProvider wrapper
├── App.tsx                         MOD  — lazy imports + Suspense
├── index.css                       MOD  — @import tokens, simplified
│
├── config/
│   └── routes.ts                   NEW  — route metadata for breadcrumbs
│
├── providers/
│   └── ThemeProvider.tsx            NEW  — theme + media query listener
│
├── store/
│   ├── authStore.ts                ---  (unchanged)
│   ├── toastStore.ts               ---  (unchanged)
│   ├── themeStore.ts               NEW  — theme preference persistence
│   └── sidebarStore.ts             NEW  — sidebar state persistence
│
├── styles/
│   ├── tokens.css                  NEW  — all design tokens
│   ├── breakpoints.css             NEW  — breakpoint utilities
│   └── shared.css                  MOD  — var name alignment
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx           MOD  — full rewrite
│   │   ├── AppLayout.css           MOD  — full rewrite
│   │   ├── Sidebar.tsx             MOD  — full rewrite
│   │   ├── Sidebar.css             MOD  — full rewrite
│   │   ├── Topbar.tsx              MOD  — full rewrite
│   │   ├── Topbar.css              MOD  — full rewrite
│   │   ├── PrivateRoute.tsx        ---  (unchanged)
│   │   ├── Breadcrumb.tsx          NEW
│   │   └── Breadcrumb.css          NEW
│   │
│   └── ui/
│       ├── GlobalSearch.tsx        NEW
│       ├── GlobalSearch.css        NEW
│       ├── NotificationDropdown.tsx NEW
│       ├── NotificationDropdown.css NEW
│       ├── UserProfileMenu.tsx     NEW
│       ├── UserProfileMenu.css     NEW
│       ├── ThemeToggle.tsx         NEW
│       ├── ThemeToggle.css         NEW
│       ├── Modal.css               MOD  (minor token swap)
│       ├── Toast.css               MOD  (minor token swap)
│       └── Drawer.css              MOD  (minor token swap)
│
│  ... (all other folders unchanged)
```

---

## 2. Component Dependency Map

### 2.1 Build Order (topological — each layer depends only on layers above it)

```
LAYER 0 — Zero dependencies (pure config / data)
───────────────────────────────────────────────────
  src/styles/tokens.css              depends on: nothing
  src/styles/breakpoints.css         depends on: tokens.css
  src/config/routes.ts               depends on: nothing (static data)
  src/store/themeStore.ts            depends on: zustand
  src/store/sidebarStore.ts          depends on: zustand

LAYER 1 — Depends on Layer 0 only
───────────────────────────────────────────────────
  src/providers/ThemeProvider.tsx     depends on: themeStore
  src/index.css                      depends on: tokens.css, breakpoints.css (via @import)

LAYER 2 — Leaf UI components (no other custom component deps)
───────────────────────────────────────────────────
  src/components/ui/ThemeToggle.tsx         depends on: themeStore, lucide-react
  src/components/ui/GlobalSearch.tsx        depends on: routes.ts, react-router-dom, lucide-react
  src/components/ui/NotificationDropdown.tsx depends on: lucide-react, api/activity.ts
  src/components/ui/UserProfileMenu.tsx     depends on: authStore, themeStore, ThemeToggle, lucide-react
  src/components/layout/Breadcrumb.tsx      depends on: routes.ts, react-router-dom, lucide-react

LAYER 3 — Composite layout components
───────────────────────────────────────────────────
  src/components/layout/Sidebar.tsx    depends on: sidebarStore, routes.ts (nav config), lucide-react
  src/components/layout/Topbar.tsx     depends on: sidebarStore, Breadcrumb, GlobalSearch,
                                                   NotificationDropdown, UserProfileMenu, lucide-react

LAYER 4 — Shell
───────────────────────────────────────────────────
  src/components/layout/AppLayout.tsx  depends on: sidebarStore, Sidebar, Topbar

LAYER 5 — App entry
───────────────────────────────────────────────────
  src/App.tsx                          depends on: AppLayout, PrivateRoute, all pages (lazy)
  src/main.tsx                         depends on: ThemeProvider, App
```

### 2.2 Visual Dependency Graph

```
                          main.tsx
                            │
                    ┌───────┴───────┐
               ThemeProvider      App.tsx
                    │               │
               themeStore    ┌──────┴──────┐
                          PrivateRoute  AppLayout
                                          │
                                ┌─────────┴─────────┐
                            Sidebar              Topbar
                                │                    │
                         ┌──────┘        ┌───────────┼───────────┐──────────┐
                    sidebarStore    Breadcrumb  GlobalSearch  Notif.    UserMenu
                                       │           │        Dropdown      │
                                   routes.ts   routes.ts   api/activity ThemeToggle
                                                                          │
                                                                     themeStore
```

### 2.3 Import Relationship: What Uses What

| Consumer | Imports |
|---|---|
| `main.tsx` | `ThemeProvider`, `App`, `index.css`, `shared.css` |
| `ThemeProvider` | `themeStore` |
| `App.tsx` | `PrivateRoute`, `AppLayout`, `ToastContainer`, all pages (lazy) |
| `AppLayout` | `Sidebar`, `Topbar`, `sidebarStore` |
| `Sidebar` | `sidebarStore`, `NavLink` (react-router), `lucide-react` icons |
| `Topbar` | `sidebarStore`, `Breadcrumb`, `GlobalSearch`, `NotificationDropdown`, `UserProfileMenu` |
| `Breadcrumb` | `routes.ts`, `useLocation` / `useMatches` (react-router) |
| `GlobalSearch` | `routes.ts`, `useNavigate` (react-router), `lucide-react` |
| `NotificationDropdown` | `useActivity` hook (existing), `lucide-react` |
| `UserProfileMenu` | `authStore`, `ThemeToggle`, `useNavigate`, `lucide-react` |
| `ThemeToggle` | `themeStore`, `lucide-react` |

### 2.4 Store Dependency Map

```
authStore (EXISTING — unchanged)
├── used by: PrivateRoute, useAuth hook, UserProfileMenu (new)
└── shape: { token, user, setToken, setUser, logout, isAuthenticated }

toastStore (EXISTING — unchanged)
├── used by: Toast component, toast utility
└── shape: { toasts, add, remove }

themeStore (NEW)
├── used by: ThemeProvider, ThemeToggle, UserProfileMenu
├── shape: { theme: 'light'|'dark'|'system', resolved: 'light'|'dark', setTheme }
└── persists: localStorage key "dk-theme"

sidebarStore (NEW)
├── used by: AppLayout, Sidebar, Topbar
├── shape: { state: 'expanded'|'collapsed'|'hidden', setState, toggle,
│            collapsedGroups: string[], toggleGroup }
└── persists: localStorage key "dk-sidebar"
```

---

## 3. File-by-File Implementation Plan

Each file below lists: purpose, props/interface, internal logic, dependencies, and acceptance criteria.

---

### FILE 01: `src/styles/tokens.css`

**Purpose:** Single source of truth for all design tokens. Replaces inline `:root` vars in `index.css`.

**Contains:**
```
:root (light theme defaults)
  Color tokens          — 28 variables (bg, surface, border, text, primary, status colors)
  Typography tokens     — 8 size steps, 2 font families (Inter + mono)
  Spacing tokens        — 10 steps (4px base unit)
  Radius tokens         — 6 levels (sm through full)
  Shadow tokens         — 6 levels (none through xl)
  Z-index tokens        — 7 named layers (sidebar, topbar, dropdown, modal, drawer, toast, max)
  Transition tokens     — 4 durations + 4 easing functions
  Layout tokens         — sidebar widths (expanded: 248px, collapsed: 68px)

[data-theme="dark"]
  Override all color tokens to dark equivalents
  Shadows use rgba(0,0,0,0.3) instead of 0.1
  Sidebar background changes from #0f172a to #0a0e1a
```

**Key variable names (exact):**
```css
/* Surfaces */
--color-bg, --color-bg-subtle, --color-surface, --color-surface-raised

/* Borders */
--color-border, --color-border-strong

/* Text */
--color-text, --color-text-secondary, --color-text-muted, --color-text-inverse

/* Primary */
--color-primary-50 through --color-primary-700

/* Status */
--color-success, --color-warning, --color-danger, --color-info

/* Layout */
--sidebar-width-expanded: 248px
--sidebar-width-collapsed: 68px
--topbar-height: 56px

/* Z-index */
--z-sidebar: 200
--z-topbar: 100
--z-dropdown: 300
--z-modal: 800
--z-drawer: 800
--z-toast: 9999
```

**Acceptance criteria:**
- All existing components render identically (vars map 1:1 to old names)
- `[data-theme="dark"]` overrides produce legible dark palette
- No unused variables

---

### FILE 02: `src/styles/breakpoints.css`

**Purpose:** Named breakpoint media query utility classes and CSS custom media (for documentation — CSS custom media is not yet standard, so actual breakpoints are plain `@media`).

**Contains:**
```
Reference comment block with 5 named breakpoints:
  --bp-sm:   640px    (mobile landscape)
  --bp-md:   768px    (tablet portrait)
  --bp-lg:   1024px   (tablet landscape / small desktop)
  --bp-xl:   1280px   (desktop)
  --bp-2xl:  1536px   (widescreen)

Utility classes:
  .hide-below-sm   { display: none on < 640px }
  .hide-below-md   { display: none on < 768px }
  .hide-below-lg   { display: none on < 1024px }
  .show-below-md   { display: none on >= 768px }
  .show-below-lg   { display: none on >= 1024px }
```

**Acceptance criteria:**
- Utility classes work correctly at each breakpoint
- No conflicts with existing `.col-hide-sm` in shared.css

---

### FILE 03: `src/store/themeStore.ts`

**Purpose:** Persist user theme preference. Zustand store matching existing patterns.

**Interface:**
```typescript
type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  setResolved: (theme: ResolvedTheme) => void
}
```

**Logic:**
- Reads initial `mode` from `localStorage.getItem('dk-theme')` or defaults to `'system'`
- `setMode` persists to `localStorage` and calls `set()`
- `resolved` is computed by `ThemeProvider` based on `mode` + OS preference
- Follows same Zustand `create<>((set, get) => ...)` pattern as authStore

**Dependencies:** `zustand`

**Acceptance criteria:**
- `mode` survives page refresh via localStorage
- Default is `system` for new users
- Store is importable from components without circular deps

---

### FILE 04: `src/store/sidebarStore.ts`

**Purpose:** Persist sidebar expand/collapse state and per-group collapsed state.

**Interface:**
```typescript
type SidebarState = 'expanded' | 'collapsed' | 'hidden'

interface SidebarStore {
  state: SidebarState
  collapsedGroups: string[]       // group IDs like 'crm', 'sales', 'catalog'
  setState: (state: SidebarState) => void
  toggle: () => void              // expanded ↔ collapsed (desktop), hidden ↔ expanded (mobile)
  toggleGroup: (groupId: string) => void
  isGroupCollapsed: (groupId: string) => boolean
}
```

**Logic:**
- Reads initial `state` from `localStorage.getItem('dk-sidebar-state')` or defaults to `'expanded'`
- Reads `collapsedGroups` from `localStorage.getItem('dk-sidebar-groups')` (JSON array) or defaults to `[]`
- `toggle()`:
  - If viewport `<= 768px`: toggles between `'hidden'` and `'expanded'` (overlay mode)
  - If viewport `> 768px`: toggles between `'expanded'` and `'collapsed'` (rail mode)
- `toggleGroup()`: adds/removes groupId from `collapsedGroups`, persists
- `setState()` persists and calls `set()`

**Dependencies:** `zustand`

**Acceptance criteria:**
- Sidebar state and group collapse state survive page refresh
- `toggle()` behaves differently at mobile vs desktop width
- No interference with existing `authStore` or `toastStore`

---

### FILE 05: `src/providers/ThemeProvider.tsx`

**Purpose:** Applies `data-theme` attribute to `<html>` element. Listens to OS color scheme preference.

**Props:** `{ children: ReactNode }`

**Logic:**
1. On mount, read `themeStore.mode`
2. If `mode === 'system'`, attach `matchMedia('(prefers-color-scheme: dark)')` listener
3. Resolve actual theme: `mode === 'system' ? (mediaMatch ? 'dark' : 'light') : mode`
4. Set `document.documentElement.setAttribute('data-theme', resolvedTheme)`
5. Call `themeStore.setResolved(resolvedTheme)` so other components can read it
6. On `mode` change, re-resolve
7. On unmount, clean up media listener

**Renders:** Just `{children}` — no wrapper div

**Dependencies:** `themeStore`, React `useEffect` / `useSyncExternalStore`

**Acceptance criteria:**
- `<html data-theme="light">` or `<html data-theme="dark">` applied on mount
- Changing OS preference in system mode updates theme immediately
- Switching from system to light/dark removes media listener

---

### FILE 06: `src/config/routes.ts`

**Purpose:** Centralized route metadata for breadcrumbs and page titles. Replaces `PAGE_TITLES` dict in Topbar.tsx.

**Interface:**
```typescript
interface RouteConfig {
  path: string
  label: string
  parent?: string        // path of parent for breadcrumb chain
  icon?: string          // lucide icon name (for breadcrumb + sidebar cross-ref)
}
```

**Data (maps 1:1 to current routes in App.tsx):**
```typescript
export const ROUTE_CONFIG: RouteConfig[] = [
  { path: '/dashboard',             label: 'Dashboard' },
  { path: '/customers',             label: 'Customers' },
  { path: '/leads',                 label: 'Leads' },
  { path: '/activity',              label: 'Activity' },
  { path: '/reports',               label: 'Reports' },
  { path: '/settings',              label: 'Settings' },
  { path: '/catalog',               label: 'Products',           parent: undefined },
  { path: '/catalog/products/:id',  label: 'Product Detail',     parent: '/catalog' },
  { path: '/catalog/brands',        label: 'Brands',             parent: '/catalog' },
  { path: '/catalog/categories',    label: 'Categories',         parent: '/catalog' },
  { path: '/catalog/import',        label: 'Import',             parent: '/catalog' },
  { path: '/equipment',             label: 'Equipment Registry' },
  { path: '/equipment/:id',         label: 'Equipment Detail',   parent: '/equipment' },
  { path: '/quotations',            label: 'Quotations' },
  { path: '/quotations/new',        label: 'New Quotation',      parent: '/quotations' },
  { path: '/quotations/:id',        label: 'Quotation Detail',   parent: '/quotations' },
  { path: '/rental-contracts',      label: 'Rental Contracts' },
  { path: '/rental-contracts/new',  label: 'New Contract',       parent: '/rental-contracts' },
  { path: '/rental-contracts/:id',  label: 'Contract Detail',    parent: '/rental-contracts' },
]
```

**Helper exports:**
```typescript
export function getRouteConfig(pathname: string): RouteConfig | undefined
// Matches exact path or resolves :id params via pattern matching

export function getBreadcrumbs(pathname: string): RouteConfig[]
// Walks parent chain to build [root, ..., current] array
```

**Dependencies:** None (pure data + functions)

**Acceptance criteria:**
- `getBreadcrumbs('/quotations/42')` returns `[{Quotations}, {Quotation Detail}]`
- `getBreadcrumbs('/catalog/brands')` returns `[{Products}, {Brands}]`
- `getBreadcrumbs('/dashboard')` returns `[{Dashboard}]` (single item, no breadcrumb rendered)
- Dynamic `:id` segments matched correctly

---

### FILE 07: `src/components/layout/Breadcrumb.tsx` + `Breadcrumb.css`

**Purpose:** Route-aware breadcrumb bar. Renders below the page title in Topbar.

**Props:**
```typescript
// No props — reads location from react-router
```

**Logic:**
1. Call `useLocation()` to get current `pathname`
2. Call `getBreadcrumbs(pathname)` from `routes.ts`
3. If only 1 item (root-level page), render nothing
4. Render: `Home / Segment / ... / Current` where each segment except last is a `<Link>`
5. Last segment is plain text (bold, non-clickable)
6. Separator: `ChevronRight` icon (Lucide, 14px, muted color)

**Visual spec:**
```
height: 20px line
font-size: 13px
links: --color-text-muted, hover: --color-primary
current: --color-text, font-weight 600
separator: ChevronRight 14px, --color-text-muted, opacity 0.5
```

**Dependencies:** `routes.ts`, `react-router-dom` (`useLocation`, `Link`), `lucide-react`

**Acceptance criteria:**
- Not rendered on root-level pages (dashboard, customers, leads, etc.)
- Rendered on sub-pages (product detail, quotation detail, new quotation, etc.)
- Clicking a breadcrumb segment navigates correctly
- Updates reactively on route change

---

### FILE 08: `src/components/ui/GlobalSearch.tsx` + `GlobalSearch.css`

**Purpose:** Command palette overlay. Triggered by `Cmd+K` / `Ctrl+K` or clicking search in topbar.

**Props:**
```typescript
interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
}
```

**Internal state:**
```typescript
query: string              // search input value
results: SearchResult[]    // filtered results
activeIndex: number        // keyboard selection index
```

**Logic:**
1. **Global keyboard shortcut:** Register `keydown` listener in Topbar parent for `Cmd+K`/`Ctrl+K` → opens search
2. **Search sources (client-side, no new API):**
   - Static: navigation items from `ROUTE_CONFIG` (always available)
   - Static: quick actions (New Customer, New Quotation, etc.)
   - Recent: last 8 visited pages from `localStorage.getItem('dk-recent-pages')`
3. **When query is empty:** Show recent pages + quick actions + navigation
4. **When query has text:** Fuzzy-filter all sources, group by type, max 5 per group
5. **Keyboard navigation:** `↑`/`↓` moves `activeIndex`, `Enter` navigates, `Esc` closes
6. **On select:** Call `navigate(path)`, add to recent pages, close

**Visual spec:**
```
Container: centered, 560px wide, max-height 420px
Background overlay: rgba(0,0,0,0.4)
Input: full-width, 48px tall, 16px font, autofocus, magnifying glass icon
Results: scrollable list, 40px row height
  - Navigation items: icon + label + "Navigation" tag
  - Quick actions:    icon + label + keyboard shortcut badge
  - Recent:           icon + label + "Recent" tag
Active row: --color-primary-50 background
Footer: "↑↓ to navigate · Enter to select · Esc to close"
Z-index: --z-modal (800)
Animation: fade + scale from 0.95
```

**Dependencies:** `routes.ts`, `react-router-dom` (`useNavigate`), `lucide-react` (`Search`, `ArrowRight`, etc.)

**Acceptance criteria:**
- `Cmd+K` toggles the palette open/closed
- Typing filters results in real-time
- Arrow keys + Enter navigate without mouse
- Escape closes, clicking backdrop closes
- Recent pages persist across sessions
- No API calls — purely client-side

---

### FILE 09: `src/components/ui/NotificationDropdown.tsx` + `NotificationDropdown.css`

**Purpose:** Bell icon button in topbar with dropdown list of recent activity.

**Props:**
```typescript
// No props — self-contained, fetches own data
```

**Internal state:**
```typescript
isOpen: boolean
activities: Activity[]      // from existing useActivity hook
unreadCount: number         // count since last open
lastReadTimestamp: string   // persisted to localStorage
```

**Logic:**
1. On mount, call existing `useActivity` hook (or `getActivities` API) with `{ page_size: 10 }`
2. Compare timestamps against `localStorage.getItem('dk-last-notification-read')` to calculate `unreadCount`
3. On dropdown open: set `lastReadTimestamp = now`, persist, `unreadCount = 0`
4. Each item renders: icon (by action type), description, relative timestamp
5. Click item → navigate to related entity (if possible) or to `/activity`
6. Footer: "View all activity" → navigates to `/activity`

**Visual spec:**
```
Trigger: 34px icon button, Bell icon (Lucide), relative badge count (red dot with number)
Dropdown: 360px wide, max-height 400px, anchored below bell icon, right-aligned
  - Header: "Notifications" + "Mark all read" button
  - Items: 60px rows, icon + text + time
  - Footer: "View all activity" link
Z-index: --z-dropdown (300)
Animation: fade + translateY(-4px)
Close on: click outside, Esc key, navigate
```

**Dependencies:** `api/activity.ts` (existing), `lucide-react`, `react-router-dom`

**Acceptance criteria:**
- Shows real activity data from existing API
- Unread count badge appears when new activities exist since last open
- Clicking an activity item closes dropdown
- Dropdown closes on outside click or Escape
- "View all" navigates to `/activity`

---

### FILE 10: `src/components/ui/UserProfileMenu.tsx` + `UserProfileMenu.css`

**Purpose:** Dropdown menu anchored to user avatar in topbar. Replaces current inline logout button.

**Props:**
```typescript
// No props — reads from authStore
```

**Logic:**
1. Read `user` from `authStore`
2. Render avatar (initials) + display name button as trigger
3. On click, toggle dropdown with:
   - User info header (full name, email, role)
   - Divider
   - Theme toggle (inline `ThemeToggle` component)
   - Divider
   - Settings link → `/settings`
   - Logout button → calls `logout()` from `useAuth` hook
4. Close on outside click, Esc, or navigation

**Visual spec:**
```
Trigger: avatar circle (32px) + name (hidden on mobile) + ChevronDown icon
Dropdown: 240px wide, right-aligned below trigger
  - User header: avatar (40px) + name + email + role badge
  - Menu items: 36px rows, icon + label, hover bg
  - Theme row: "Appearance" label + segmented [☀️|🌙|💻] toggle
  - Logout: red text on hover
Z-index: --z-dropdown (300)
```

**Dependencies:** `authStore`, `useAuth` hook, `ThemeToggle`, `lucide-react`

**Acceptance criteria:**
- Displays logged-in user's name, email, role
- Theme toggle changes theme without closing menu
- Logout clears auth and navigates to `/login`
- Menu closes on outside click
- On mobile: name hidden, only avatar shows as trigger

---

### FILE 11: `src/components/ui/ThemeToggle.tsx` + `ThemeToggle.css`

**Purpose:** Three-way toggle for light / dark / system theme.

**Props:**
```typescript
interface ThemeToggleProps {
  variant?: 'segmented' | 'dropdown'    // segmented for profile menu, dropdown for settings
}
```

**Logic:**
1. Read `mode` from `themeStore`
2. Render 3 buttons (Sun, Moon, Monitor icons from Lucide)
3. Active button gets primary accent
4. On click, call `themeStore.setMode(newMode)`

**Visual spec (segmented variant):**
```
Container: 3 buttons in a row, shared border, rounded pill shape
Each button: 28px × 28px, icon only (16px)
Active: --color-primary bg, white icon
Inactive: transparent bg, --color-text-muted icon, hover bg
Total width: ~96px
```

**Dependencies:** `themeStore`, `lucide-react` (`Sun`, `Moon`, `Monitor`)

**Acceptance criteria:**
- Active state reflects current `themeStore.mode`
- Click immediately changes theme (no delay)
- Icons are clear: sun = light, moon = dark, monitor = system

---

### FILE 12: `src/components/layout/Sidebar.tsx` + `Sidebar.css`  — REWRITE

**Purpose:** Modern responsive sidebar with collapsible groups, icon-rail collapsed state, and hover-expand.

**Props:**
```typescript
// No props — reads all state from sidebarStore
```

**Navigation groups (data structure, matching existing routes):**
```typescript
const NAV_GROUPS = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    id: 'crm',
    label: 'CRM',
    items: [
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/leads',     label: 'Leads',     icon: TrendingUp },
    ]
  },
  {
    id: 'sales',
    label: 'Sales',
    items: [
      { to: '/quotations',       label: 'Quotations',       icon: FileText },
      { to: '/rental-contracts', label: 'Rental Contracts', icon: ClipboardList },
    ]
  },
  {
    id: 'fleet',
    label: 'Fleet',
    items: [
      { to: '/equipment', label: 'Equipment Registry', icon: Truck },
    ]
  },
  {
    id: 'catalog',
    label: 'Catalog',
    items: [
      { to: '/catalog',             label: 'Products',   icon: Package },
      { to: '/catalog/brands',      label: 'Brands',     icon: Tag },
      { to: '/catalog/categories',  label: 'Categories', icon: Layers },
      { to: '/catalog/import',      label: 'Import',     icon: Upload },
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics',
    items: [
      { to: '/activity', label: 'Activity', icon: Activity },
      { to: '/reports',  label: 'Reports',  icon: BarChart2 },
    ]
  }
]
```

**Three visual states:**

| State | Width | Labels | Groups | When |
|---|---|---|---|---|
| `expanded` | 248px | Visible | Collapsible headers | Desktop default |
| `collapsed` | 68px | Hidden (tooltips on hover) | Icons only, no headers | Desktop toggled or tablet |
| `hidden` | 0px (off-screen) | N/A | N/A | Mobile default |

**Key behaviors:**
- **Collapse toggle:** `PanelLeftClose` / `PanelLeftOpen` icon button at bottom of sidebar
- **Group collapse:** Click section header to toggle children. Arrow icon rotates. Persisted in sidebarStore.
- **Hover expand (collapsed mode):** When `state === 'collapsed'`, hovering sidebar for 300ms shows temporary expanded overlay (position: fixed, doesn't push content). Moving mouse away re-collapses.
- **Mobile overlay:** When `state === 'hidden'` and user opens, shows as fixed overlay with backdrop. Clicking outside closes.
- **Active indicator:** Left 3px blue border on active nav item (via NavLink `isActive`).
- **Brand section:** Logo + "DK Service" + "Enterprise Platform" in expanded. Logo only in collapsed.
- **User footer:** Avatar + name in expanded. Avatar only in collapsed. Clicking opens UserProfileMenu.
- **Settings:** Fixed at bottom, above user footer, separated by divider.

**CSS approach:**
- Use `--sidebar-width` CSS variable set by AppLayout based on sidebarStore state
- Sidebar fixed position, `width: var(--sidebar-width)`
- Transition: `width 0.2s var(--ease-default)`
- In collapsed state: `.sidebar-nav-item` hides label, centers icon, shows tooltip on hover
- In hidden state: `transform: translateX(-100%)` (same as current closed)

**Dependencies:** `sidebarStore`, `react-router-dom` (`NavLink`), `lucide-react`

**Acceptance criteria:**
- All 19 existing routes accessible from sidebar (no route removed)
- Group headers clickable to collapse/expand children
- Collapsed state shows icon-only rail at 68px
- Hover on collapsed sidebar expands temporarily
- Mobile: overlay with backdrop, swipe or hamburger to open
- Active nav item highlighted correctly
- Smooth transitions between all states
- Dark mode: colors adapt via CSS variables

---

### FILE 13: `src/components/layout/Topbar.tsx` + `Topbar.css`  — REWRITE

**Purpose:** Top navigation bar with breadcrumbs, search trigger, notifications, and user menu.

**Props:**
```typescript
// No props — all state from stores and child components
```

**Layout (left to right):**
```
[Hamburger]  [Page Title / Breadcrumb]  ───stretch───  [🔍 Search]  [🔔 Notif]  [👤 User]
```

**Sections:**
1. **Left:** Hamburger button (calls `sidebarStore.toggle()`), then `Breadcrumb` component
2. **Center stretch:** Empty flex spacer
3. **Right:** Search trigger button → opens `GlobalSearch`, `NotificationDropdown`, `UserProfileMenu`

**Key changes from current:**
- Remove `PAGE_TITLES` dict — delegate to `Breadcrumb` (which reads from `routes.ts`)
- Remove inline logout button — moved to `UserProfileMenu`
- Remove inline user chip — replaced by `UserProfileMenu` trigger
- Add search icon button (opens `GlobalSearch`)
- Add notification bell (renders `NotificationDropdown`)
- `left` offset reads `var(--sidebar-width)` instead of hardcoded `240px`

**CSS approach:**
- `left: var(--sidebar-width, 248px)` — dynamically set by AppLayout
- Topbar height stays `56px` (`--topbar-height`)
- Dark mode: `--color-surface` becomes dark via tokens.css

**State management:**
- `GlobalSearch` isOpen state managed internally in Topbar
- Keyboard shortcut `Cmd+K` registered in Topbar's `useEffect`

**Dependencies:** `sidebarStore`, `Breadcrumb`, `GlobalSearch`, `NotificationDropdown`, `UserProfileMenu`, `lucide-react`

**Acceptance criteria:**
- Page title still shows on root pages (from route config)
- Breadcrumb appears on sub-pages
- Search button opens command palette, `Cmd+K` also works
- Notification bell shows unread count
- User menu shows profile + theme toggle + logout
- Topbar offsets correctly with sidebar in any state
- Mobile: hamburger button visible, search/notifications still accessible
- Dark mode styling correct

---

### FILE 14: `src/components/layout/AppLayout.tsx` + `AppLayout.css`  — REWRITE

**Purpose:** Root layout shell. Manages CSS variable injection for sidebar width.

**Props:** None (renders `<Outlet />`)

**Logic:**
1. Subscribe to `sidebarStore.state`
2. Compute `--sidebar-width` based on state:
   - `expanded` → `248px`
   - `collapsed` → `68px`
   - `hidden` → `0px`
3. Set CSS variable on the shell div via inline style
4. Listen to viewport resize:
   - `<= 768px` → auto-set `hidden`
   - `769px–1024px` → auto-set `collapsed`
   - `> 1024px` → restore last desktop state (expanded or collapsed)
5. Render: `<div className="app-shell">` → `<Sidebar />` + `<div className="app-main">` → `<Topbar />` + `<main>` → `<Outlet />`

**CSS approach:**
```css
.app-main {
  margin-left: var(--sidebar-width, 248px);
  padding-top: var(--topbar-height, 56px);
  transition: margin-left 0.2s var(--ease-default);
}

.app-content {
  padding: var(--space-6) var(--space-6);    /* 24px */
  max-width: 1400px;
}

@media (max-width: 768px) {
  .app-main {
    margin-left: 0;    /* sidebar is overlay */
  }
  .app-content {
    padding: var(--space-5) var(--space-4);  /* 20px 16px */
  }
}
```

**Dependencies:** `sidebarStore`, `Sidebar`, `Topbar`, `react-router-dom` (`Outlet`)

**Acceptance criteria:**
- Content area margin-left matches sidebar width at all times
- Smooth transition on sidebar state change
- Auto-collapse on tablet, auto-hide on mobile
- No horizontal scrollbar at any viewport
- `<Outlet />` renders all existing page components without modification

---

### FILE 15: `src/index.css` — MODIFY

**Purpose:** Simplified global styles. Moves token definitions to `tokens.css`.

**Changes:**
```
REMOVE:  All :root variables (moved to tokens.css)
ADD:     @import './styles/tokens.css';
ADD:     @import './styles/breakpoints.css';
KEEP:    Reset rules (box-sizing, margin, padding)
KEEP:    Body styles (update to use Inter font + token vars)
KEEP:    Anchor styles
KEEP:    Button cursor reset
KEEP:    Input font inheritance
KEEP:    .spin animation
KEEP:    .btn, .btn-primary, .btn-ghost, .btn-danger classes (update to use token vars)
```

**Acceptance criteria:**
- All existing `.btn` classes render identically
- Inter font loads and applies
- Token variables available globally

---

### FILE 16: `src/styles/shared.css` — MODIFY

**Purpose:** Align existing shared styles to new token variable names.

**Changes (find-and-replace, no structural changes):**
```
var(--color-bg)      → stays (same name)
var(--color-surface) → stays (same name)
var(--color-border)  → stays (same name)
var(--color-text)    → stays (same name)
var(--color-text-muted) → stays (same name)
var(--color-primary) → var(--color-primary-500)   (or keep alias)
var(--radius)        → stays (same name, aliased in tokens)
var(--shadow)        → var(--shadow-sm)
var(--shadow-md)     → var(--shadow-md)            (same)

Hardcoded values to replace:
  #dc2626 → var(--color-danger)
  #b91c1c → var(--color-danger-dark)  (add to tokens)
  #fef2f2 → var(--color-danger-50)    (add to tokens)
  #fecaca → var(--color-danger-200)   (add to tokens)
```

**Acceptance criteria:**
- All table, form, toolbar, pagination styles render identically
- Dark mode applies correctly to shared elements

---

### FILE 17: `src/main.tsx` — MODIFY

**Purpose:** Wrap `<App />` in `<ThemeProvider>`.

**Current → New:**
```typescript
// Current
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// New
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
)
```

**Dependencies:** `ThemeProvider`

**Acceptance criteria:**
- App renders with `data-theme` attribute on `<html>`
- No double-render or flicker on initial load

---

### FILE 18: `src/App.tsx` — MODIFY

**Purpose:** Convert eager page imports to `React.lazy` + `Suspense`.

**Changes:**
```typescript
// Current (eager)
import DashboardPage from '@/pages/Dashboard/DashboardPage'

// New (lazy)
const DashboardPage = lazy(() => import('@/pages/Dashboard/DashboardPage'))
```

Apply to all 16 page imports. Wrap `<Route element={<AppLayout />}>` content in:
```tsx
<Suspense fallback={<PageLoadingFallback />}>
  <Outlet />
</Suspense>
```

Where `PageLoadingFallback` is a simple centered spinner (inline component in App.tsx, not a separate file).

**No route path changes. No route order changes.**

**Dependencies:** React `lazy`, `Suspense`

**Acceptance criteria:**
- All routes still work identically
- Network tab shows chunk-splitting (separate JS files per page)
- Brief loading spinner visible on first navigation to a page
- No broken imports after refactor

---

### FILE 19: `index.html` — MODIFY

**Purpose:** Add Inter font, update title, add default `data-theme`.

**Changes:**
```html
<!-- Add to <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

<!-- Update -->
<title>DK Service — Enterprise Platform</title>

<!-- Add to <html> -->
<html lang="en" data-theme="light">
```

**Acceptance criteria:**
- Inter font loads on page load
- Title bar shows "DK Service — Enterprise Platform"
- `data-theme="light"` present as default until ThemeProvider overrides

---

### FILE 20: `src/components/ui/Modal.css` — MINOR MODIFY

**Purpose:** Dark mode token alignment.

**Changes:**
```css
/* Add dark-mode overrides */
[data-theme="dark"] .modal {
  background: var(--color-surface);
  box-shadow: var(--shadow-xl);
}

[data-theme="dark"] .modal-overlay {
  background: rgba(0,0,0,0.6);
}
```

**Acceptance criteria:** Modals render correctly in dark mode (dark background, visible border, readable text).

---

### FILE 21: `src/components/ui/Toast.css` — MINOR MODIFY

**Purpose:** Dark mode support for toast notifications.

**Changes:** Add `[data-theme="dark"]` overrides for `.toast.success`, `.toast.error`, `.toast.info` backgrounds.

**Acceptance criteria:** Toasts readable and distinct in dark mode.

---

### FILE 22: `src/components/ui/Drawer.css` — MINOR MODIFY

**Purpose:** Dark mode support for drawer.

**Changes:**
```css
[data-theme="dark"] .drawer {
  background: var(--color-surface);
}
[data-theme="dark"] .drawer-overlay {
  background: rgba(0,0,0,0.6);
}
[data-theme="dark"] .json-block {
  background: #0a0e1a;
}
```

**Acceptance criteria:** Drawer renders correctly in dark mode.

---

## 4. Implementation Sequence (Build Order)

### Sprint 1: Tokens & Stores (no visual change)

| # | File | Type | Risk |
|---|---|---|---|
| 1 | `src/styles/tokens.css` | NEW | None — not imported yet |
| 2 | `src/styles/breakpoints.css` | NEW | None |
| 3 | `src/store/themeStore.ts` | NEW | None — not used yet |
| 4 | `src/store/sidebarStore.ts` | NEW | None — not used yet |
| 5 | `src/config/routes.ts` | NEW | None |
| 6 | `src/providers/ThemeProvider.tsx` | NEW | None — not mounted yet |

**Test:** All new files compile. Existing app unchanged.

### Sprint 2: Entry point wiring (minimal visual change)

| # | File | Type | Risk |
|---|---|---|---|
| 7 | `index.html` | MOD | Low — font + title only |
| 8 | `src/index.css` | MOD | Medium — token swap must be exact |
| 9 | `src/styles/shared.css` | MOD | Medium — verify all pages look identical |
| 10 | `src/main.tsx` | MOD | Low — add ThemeProvider wrapper |
| 11 | `src/App.tsx` | MOD | Medium — lazy imports must not break |

**Test:** Full app regression. All pages render. Font changed to Inter. Code splitting visible in network tab.

### Sprint 3: Leaf components

| # | File | Type | Risk |
|---|---|---|---|
| 12 | `src/components/ui/ThemeToggle.tsx + .css` | NEW | None |
| 13 | `src/components/layout/Breadcrumb.tsx + .css` | NEW | None |
| 14 | `src/components/ui/GlobalSearch.tsx + .css` | NEW | None |
| 15 | `src/components/ui/NotificationDropdown.tsx + .css` | NEW | Low |
| 16 | `src/components/ui/UserProfileMenu.tsx + .css` | NEW | Low |

**Test:** Components render in isolation (can test via temporary route or Storybook-style page).

### Sprint 4: Shell rewrite (high visual change)

| # | File | Type | Risk |
|---|---|---|---|
| 17 | `src/components/layout/Sidebar.tsx + .css` | REWRITE | High — core navigation |
| 18 | `src/components/layout/Topbar.tsx + .css` | REWRITE | High — integrates 4 new components |
| 19 | `src/components/layout/AppLayout.tsx + .css` | REWRITE | High — layout math |

**Test:** Full regression. All pages accessible via sidebar. Sidebar collapse/expand works. Topbar shows breadcrumbs. Search palette opens. Notifications load. User menu works. Responsive at all breakpoints.

### Sprint 5: Polish

| # | File | Type | Risk |
|---|---|---|---|
| 20 | `src/components/ui/Modal.css` | MOD | Low |
| 21 | `src/components/ui/Toast.css` | MOD | Low |
| 22 | `src/components/ui/Drawer.css` | MOD | Low |
| 23 | Delete `src/App.css` | DEL | None |

**Test:** Toggle dark mode. Verify modals, toasts, drawers, all pages render correctly in both themes.

---

## 5. Risk Matrix

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Token rename breaks existing page styles | Medium | High | Alias old var names in tokens.css during transition |
| Lazy import breaks a page component | Low | High | Test each route after conversion |
| Sidebar rewrite breaks navigation | Medium | High | Keep all NavLink `to=` paths identical to current |
| Dark mode unreadable on some pages | Medium | Medium | Page-level CSS uses tokens, not hardcoded colors — natural inheritance. Hardcoded colors in inline styles (ConfirmDialog, some pages) won't adapt — accept as tech debt for now |
| GlobalSearch performance with many entities | Low | Low | Client-side only, no API calls, small datasets |
| Notification API call rate | Low | Low | Single call on mount, no polling in this phase |

---

## 6. What This Plan Does NOT Include

These are explicitly out of scope for this foundation phase:

- DataTable component (Phase 4 of UX spec)
- DetailShell / tabbed detail pages (Phase 5)
- FormWizard / multi-step forms (Phase 6)
- Bulk actions, CSV export (Phase 6)
- Dashboard widget rebuild (Phase 3)
- Any page-level component changes
- Any new API calls (except reusing existing activity API for notifications)
- Mobile bottom sheets
- Virtual scrolling
- Storybook / component documentation
- Unit tests (recommend adding in parallel but not blocking)

---

## 7. Verification Checklist

After complete implementation, all of these must pass:

```
NAVIGATION
  [ ] All 19 routes accessible from sidebar
  [ ] Sidebar expands/collapses on desktop
  [ ] Sidebar shows icon-rail at 68px when collapsed
  [ ] Sidebar groups collapse/expand individually
  [ ] Sidebar state persists across page refresh
  [ ] Mobile: sidebar opens as overlay, closes on backdrop click
  [ ] Tablet (768-1024): auto-collapses to rail

TOPBAR
  [ ] Page title shows on root pages
  [ ] Breadcrumbs show on sub-pages (detail, create, etc.)
  [ ] Breadcrumb links navigate correctly
  [ ] Topbar width adjusts with sidebar state

GLOBAL SEARCH
  [ ] Cmd+K / Ctrl+K opens palette
  [ ] Typing filters navigation items
  [ ] Arrow keys + Enter navigates
  [ ] Esc closes
  [ ] Recent pages shown when empty
  [ ] Quick actions listed

NOTIFICATIONS
  [ ] Bell icon shows in topbar
  [ ] Dropdown shows recent activity items
  [ ] Unread count badge works
  [ ] "View all" goes to /activity
  [ ] Dropdown closes on outside click

USER MENU
  [ ] Avatar shows user initials
  [ ] Dropdown shows name, email, role
  [ ] Theme toggle changes theme
  [ ] Logout clears auth and redirects
  [ ] Menu closes on outside click

THEME
  [ ] Light mode renders correctly
  [ ] Dark mode renders correctly
  [ ] System mode follows OS preference
  [ ] Theme preference persists across refresh
  [ ] Sidebar, topbar, modals, toasts, drawers all adapt

RESPONSIVE
  [ ] 1536px+: full sidebar, full topbar
  [ ] 1024-1535px: full sidebar, full topbar
  [ ] 768-1023px: collapsed sidebar rail, full topbar
  [ ] 640-767px: hidden sidebar, hamburger menu
  [ ] <640px: hidden sidebar, hamburger menu, compact content padding

PERFORMANCE
  [ ] Route-based code splitting active (separate chunks per page)
  [ ] No regressions in existing page rendering
  [ ] Smooth transitions (no jank on sidebar toggle)

ZERO REGRESSIONS
  [ ] All existing forms work (Customer, Lead, Product, Forklift, Quotation, Contract)
  [ ] All existing tables render correctly
  [ ] All existing detail pages render correctly
  [ ] Dashboard page renders correctly
  [ ] Login page renders correctly
  [ ] Logout flow works
```
