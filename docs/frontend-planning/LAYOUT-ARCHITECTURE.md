# Layout Architecture — Implementation Blueprint

**Role:** Principal React Architect & Enterprise UX Designer  
**Constraint:** Frontend only. Zero changes to backend, database, APIs, or business logic.  
**Codebase:** 108 source files, React 19.2, TypeScript 6, Vite 8, Zustand 5, Lucide React  
**Date:** 2026-06-21  

---

## 0. Baseline Diagnosis

### Files That Own the Current Layout (7 files — the blast radius)

```
src/main.tsx                          12 lines   Entry point. Renders <App />.
src/App.tsx                           78 lines   Routes. 16 eager page imports.
src/components/layout/AppLayout.tsx   44 lines   Shell. Binary sidebar state.
src/components/layout/AppLayout.css   32 lines   Sidebar margin, content padding.
src/components/layout/Sidebar.tsx    172 lines   5 nav groups. Flat, non-collapsible.
src/components/layout/Sidebar.css    198 lines   Dark background, fixed 240px.
src/components/layout/Topbar.tsx      74 lines   Title, user chip, logout button.
src/components/layout/Topbar.css     120 lines   Fixed left: 240px, 56px height.
```

### Files That Are NOT Touched (101 files — everything else)

```
src/api/*                             9 files    Axios calls — PRESERVED
src/hooks/*                          10 files    Data hooks — PRESERVED
src/types/*                           9 files    TypeScript types — PRESERVED
src/utils/*                           1 file     Mock adapter — PRESERVED
src/assets/*                          3 files    Images — PRESERVED
src/modules/*                         2 files    Registry — READ ONLY (consumed, not modified)
src/store/authStore.ts                           — PRESERVED
src/store/toastStore.ts                          — PRESERVED
src/components/ui/*                 10 files     Modal, Toast, Drawer, etc. — PRESERVED
src/components/catalog/*             4 files     — PRESERVED
src/components/charts/*              5 files     — PRESERVED
src/components/equipment/*           3 files     — PRESERVED
src/components/quotation/*           1 file      — PRESERVED
src/components/rental/*              1 file      — PRESERVED
src/pages/**/*                      26 files     ALL page components — PRESERVED
src/styles/shared.css                            — PRESERVED (referenced, not changed)
src/index.css                                    — MODIFIED (token import only)
```

### Hardcoded Values That Must Be Extracted

| Value | Where Used | Occurrences |
|---|---|---|
| `240px` sidebar width | `Sidebar.css:4`, `AppLayout.css:9`, `Topbar.css:3` | 3 |
| `56px` topbar height | `AppLayout.css:9` (padding-top) | 1 |
| `768px` breakpoint | `AppLayout.tsx:6`, `AppLayout.css:26`, `Sidebar.css:191`, `Topbar.css:113` | 4 |
| `#0f172a` sidebar bg | `Sidebar.css:9` | 1 |
| `200` sidebar z-index | `Sidebar.css:12` | 1 |
| `100` topbar z-index | `Topbar.css:8` | 1 |
| `PAGE_TITLES` dict | `Topbar.tsx:6-16` — 9 static entries, misses all detail/create routes | 1 |

---

## 1. Target Architecture

### Render Tree (before → after)

**BEFORE:**
```
<StrictMode>
  <App>                                    ← routes + BrowserRouter
    <PrivateRoute>
      <AppLayout>                          ← binary sidebar + topbar
        <Sidebar />                        ← flat nav, no collapse
        <Topbar />                         ← title + logout button
        <main>
          <Outlet />                       ← page content (eager imports)
        </main>
      </AppLayout>
    </PrivateRoute>
    <ToastContainer />
  </App>
</StrictMode>
```

**AFTER:**
```
<StrictMode>
  <ThemeProvider>                           ← NEW: applies data-theme to <html>
    <App>                                  ← routes + BrowserRouter (lazy imports)
      <PrivateRoute>
        <AppLayout>                        ← REWRITE: 3-state sidebar via CSS var
          <Sidebar>                        ← REWRITE: collapsible groups + rail
            <SidebarBrand />               ← NEW: logo section
            <SidebarSearch />              ← NEW: Cmd+K trigger
            <SidebarNav />                 ← NEW: grouped, collapsible
            <SidebarFooter />             ← NEW: user + collapse toggle
          </Sidebar>
          <div.app-main>
            <Header>                       ← REWRITE (was Topbar): sticky
              <HeaderLeft>
                <MenuToggle />
                <Breadcrumb />             ← NEW: route-aware
              </HeaderLeft>
              <HeaderCenter>
                <SearchBar />              ← NEW: enterprise search
              </HeaderCenter>
              <HeaderRight>
                <CategoryNavBar />         ← NEW: module-scoped nav
                <NotificationCenter />     ← NEW: bell + dropdown
                <UserProfileDropdown />    ← NEW: avatar + menu
              </HeaderRight>
            </Header>
            <main>
              <Suspense>                   ← NEW: loading fallback
                <Outlet />                 ← same routes, lazy loaded
              </Suspense>
            </main>
          </div.app-main>
        </AppLayout>
      </PrivateRoute>
      <ToastContainer />                   ← unchanged
    </App>
  </ThemeProvider>
</StrictMode>
```

### CSS Variable Flow

```
AppLayout sets these variables on .app-shell based on sidebarStore state:

  --sidebar-width:    248px | 68px | 0px
  --topbar-height:    56px
  --content-max-width: 1440px

Consumed by:
  .sidebar        { width: var(--sidebar-width) }
  .app-main       { margin-left: var(--sidebar-width) }
  .header         { left: var(--sidebar-width) }
  .app-content    { max-width: var(--content-max-width) }
  main            { padding-top: var(--topbar-height) }
```

---

## 2. Folder Structure

### New Directories (4)

```
src/
├── config/                  NEW — static configuration data
├── providers/               NEW — React context providers
├── store/                   EXISTING — add 2 new stores
└── styles/                  EXISTING — add 2 new files
```

### Complete Affected Tree

```
src/
│
├── main.tsx                          MODIFIED  (wrap in ThemeProvider)
├── App.tsx                           MODIFIED  (React.lazy + Suspense)
├── index.css                         MODIFIED  (import tokens.css)
│
├── config/
│   └── routes.ts                     NEW  — breadcrumb labels + parent chains
│
├── providers/
│   └── ThemeProvider.tsx              NEW  — data-theme on <html>
│
├── store/
│   ├── authStore.ts                  UNCHANGED
│   ├── toastStore.ts                 UNCHANGED
│   ├── themeStore.ts                 NEW  — light/dark/system preference
│   └── sidebarStore.ts              NEW  — expanded/collapsed/hidden + groups
│
├── styles/
│   ├── shared.css                    UNCHANGED
│   ├── tokens.css                    NEW  — design tokens (colors, spacing, z-index)
│   └── breakpoints.css               NEW  — named breakpoint utilities
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx             REWRITE
│   │   ├── AppLayout.css             REWRITE
│   │   ├── Sidebar.tsx               REWRITE
│   │   ├── Sidebar.css               REWRITE
│   │   ├── SidebarBrand.tsx          NEW  — logo + platform name
│   │   ├── SidebarNav.tsx            NEW  — grouped nav items, collapse logic
│   │   ├── SidebarFooter.tsx         NEW  — user info + collapse toggle
│   │   ├── Header.tsx                NEW  (replaces Topbar.tsx)
│   │   ├── Header.css                NEW  (replaces Topbar.css)
│   │   ├── Breadcrumb.tsx            NEW
│   │   ├── Breadcrumb.css            NEW
│   │   ├── PrivateRoute.tsx          UNCHANGED
│   │   ├── Topbar.tsx                DELETE after Header.tsx is live
│   │   └── Topbar.css                DELETE after Header.css is live
│   │
│   └── ui/
│       ├── SearchBar.tsx             NEW  — enterprise search (Cmd+K)
│       ├── SearchBar.css             NEW
│       ├── NotificationCenter.tsx    NEW  — bell icon + dropdown
│       ├── NotificationCenter.css    NEW
│       ├── UserProfileDropdown.tsx   NEW  — avatar + menu + theme toggle
│       ├── UserProfileDropdown.css   NEW
│       ├── CategoryNavBar.tsx        NEW  — module sub-navigation
│       ├── CategoryNavBar.css        NEW
│       ├── ThemeToggle.tsx           NEW  — light/dark/system segmented
│       ├── ThemeToggle.css           NEW
│       ├── (all existing ui/* files) UNCHANGED
│       ...
│
├── (all other directories)           UNCHANGED
│   ├── api/*
│   ├── hooks/*
│   ├── types/*
│   ├── pages/*                       (ALL 26 page files UNCHANGED)
│   ├── modules/*
│   └── utils/*
│
└── index.html                        MODIFIED  (Inter font, data-theme, title)
```

### File Count Summary

```
NEW FILES:                    20
  config/routes.ts
  providers/ThemeProvider.tsx
  store/themeStore.ts
  store/sidebarStore.ts
  styles/tokens.css
  styles/breakpoints.css
  components/layout/SidebarBrand.tsx
  components/layout/SidebarNav.tsx
  components/layout/SidebarFooter.tsx
  components/layout/Header.tsx
  components/layout/Header.css
  components/layout/Breadcrumb.tsx
  components/layout/Breadcrumb.css
  components/ui/SearchBar.tsx
  components/ui/SearchBar.css
  components/ui/NotificationCenter.tsx
  components/ui/NotificationCenter.css
  components/ui/UserProfileDropdown.tsx
  components/ui/UserProfileDropdown.css
  components/ui/CategoryNavBar.tsx
  components/ui/CategoryNavBar.css
  components/ui/ThemeToggle.tsx
  components/ui/ThemeToggle.css

REWRITTEN FILES:               4
  components/layout/AppLayout.tsx + .css
  components/layout/Sidebar.tsx + .css

MODIFIED FILES:                3
  main.tsx
  App.tsx
  index.css
  index.html

DELETED FILES:                 3
  components/layout/Topbar.tsx
  components/layout/Topbar.css
  App.css  (dead file, zero imports)

PAGE FILES CHANGED:            0

TOTAL SOURCE DELTA:          +20 new, 4 rewritten, 3 modified, 3 deleted
```

---

## 3. File-by-File Modification Spec

### 3.1 `index.html` — MODIFY

**Changes:**
```
ADD:  <html lang="en" data-theme="light">     (was just lang="en")
ADD:  <link> for Inter font (Google Fonts preconnect + stylesheet)
CHANGE: <title>DK Service — Enterprise Platform</title>  (was "frontend")
```

**Why:** ThemeProvider needs a default `data-theme` before React hydrates. Inter replaces system-ui for professional typography. Title shows in browser tabs.

---

### 3.2 `src/index.css` — MODIFY

**Current:** 100 lines. Contains `:root` variables, reset, `.btn` classes, `.spin` animation.

**Changes:**
```
REMOVE:  :root { } block (28 lines) → moved to tokens.css
ADD:     @import './styles/tokens.css';
ADD:     @import './styles/breakpoints.css';
KEEP:    All reset rules, body styles, .btn classes, .spin animation
UPDATE:  body font-family to 'Inter', then existing fallbacks
UPDATE:  .btn classes to reference token vars (non-breaking — same var names)
```

**Risk:** Low. All pages import `index.css` via `main.tsx`. Token vars have same names.

---

### 3.3 `src/main.tsx` — MODIFY

**Current (12 lines):**
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/shared.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

**After (15 lines):**
```
ADD:     import ThemeProvider from '@/providers/ThemeProvider'
CHANGE:  Wrap <App /> in <ThemeProvider>
```

**Risk:** None. Additive wrapper.

---

### 3.4 `src/App.tsx` — MODIFY

**Current:** 78 lines. 16 eager imports, all routes defined inline.

**Changes:**
```
REPLACE: 16 direct page imports → 16 React.lazy() calls
ADD:     import { lazy, Suspense } from 'react'
ADD:     Simple LoadingFallback component (inline, 5 lines — centered spinner)
ADD:     <Suspense fallback={<LoadingFallback />}> wrapping <Outlet />
KEEP:    All route paths, nesting, PrivateRoute, ToastContainer — IDENTICAL
```

**Detailed change map:**
```
Line 2:   import PrivateRoute...       → KEEP
Line 3:   import AppLayout...          → KEEP
Line 4:   import ToastContainer...     → KEEP
Lines 5-22: import LoginPage, Dashboard, Customers...
            → REPLACE with:
              const LoginPage = lazy(() => import('@/pages/Login/LoginPage'))
              const DashboardPage = lazy(() => import('@/pages/Dashboard/DashboardPage'))
              ... (16 total)
Lines 31-68: Route definitions → KEEP ALL PATHS IDENTICAL
Line 37:     <AppLayout /> wrapper → KEEP (AppLayout will be internally rewritten)
```

**Risk:** Medium. Must verify every page has a `default` export. All current pages use `export default function`, so this is safe.

---

### 3.5 `src/styles/tokens.css` — NEW

**Purpose:** Single source of truth for design tokens. Replaces the `:root` block removed from `index.css`.

**Structure:**
```css
/* ── Light theme (default) ─────────────────────────────── */
:root {
  /* Surfaces */
  --color-bg: #f8fafc;
  --color-bg-subtle: #f1f5f9;
  --color-surface: #ffffff;
  --color-surface-raised: #ffffff;

  /* Borders */
  --color-border: #e2e8f0;
  --color-border-strong: #cbd5e1;

  /* Text */
  --color-text: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-text-inverse: #ffffff;

  /* Primary */
  --color-primary: #2563eb;
  --color-primary-dark: #1d4ed8;
  --color-primary-light: #eff6ff;
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;

  /* Status */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;

  /* Layout */
  --sidebar-width-expanded: 248px;
  --sidebar-width-collapsed: 68px;
  --topbar-height: 56px;
  --content-max-width: 1440px;

  /* Radius */
  --radius: 6px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow: 0 1px 3px rgba(0,0,0,.1), 0 1px 2px rgba(0,0,0,.06);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -1px rgba(0,0,0,.06);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -2px rgba(0,0,0,.05);

  /* Z-index scale */
  --z-sidebar: 200;
  --z-header: 100;
  --z-dropdown: 300;
  --z-modal: 800;
  --z-toast: 9999;

  /* Transitions */
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);

  /* Sidebar internal colors */
  --sidebar-bg: #0f172a;
  --sidebar-text: #94a3b8;
  --sidebar-text-hover: #e2e8f0;
  --sidebar-text-active: #60a5fa;
  --sidebar-border: rgba(255,255,255,0.06);
  --sidebar-active-bg: rgba(37,99,235,0.18);
}

/* ── Dark theme ────────────────────────────────────────── */
[data-theme="dark"] {
  --color-bg: #0f1117;
  --color-bg-subtle: #1a1d27;
  --color-surface: #1e2130;
  --color-surface-raised: #252836;
  --color-border: #2d3148;
  --color-border-strong: #3d4260;
  --color-text: #e2e8f0;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  --color-text-inverse: #0f172a;
  --shadow: 0 1px 3px rgba(0,0,0,.3);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,.3);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,.3);
  --sidebar-bg: #0a0e1a;
}
```

**Key rule:** Variable names match the existing names in `index.css` exactly (`--color-primary`, `--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-muted`, `--radius`, `--shadow`, `--shadow-md`). This means every page component that references these vars continues to work without any change.

---

### 3.6 `src/styles/breakpoints.css` — NEW

**Contents:**
```css
/*
  Breakpoint reference:
  --bp-sm:   640px    mobile landscape
  --bp-md:   768px    tablet portrait
  --bp-lg:   1024px   tablet landscape / small desktop
  --bp-xl:   1280px   desktop
  --bp-2xl:  1536px   widescreen
*/

/* Utility hide/show classes */
@media (max-width: 639px)  { .hide-below-sm { display: none !important; } }
@media (max-width: 767px)  { .hide-below-md { display: none !important; } }
@media (max-width: 1023px) { .hide-below-lg { display: none !important; } }
@media (min-width: 768px)  { .show-below-md { display: none !important; } }
@media (min-width: 1024px) { .show-below-lg { display: none !important; } }
```

---

### 3.7 `src/store/themeStore.ts` — NEW

**Interface:**
```typescript
type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode                           // user preference
  resolved: ResolvedTheme                   // computed actual theme
  setMode: (mode: ThemeMode) => void
  setResolved: (theme: ResolvedTheme) => void
}
```

**Behavior:**
- Reads `mode` from `localStorage.getItem('dk-theme')` on init (default: `'system'`)
- `setMode` persists to `localStorage` and calls Zustand `set()`
- `resolved` is set by ThemeProvider after evaluating OS preference

**Pattern:** Same `create<>((set, get) => ...)` as `authStore.ts`.

---

### 3.8 `src/store/sidebarStore.ts` — NEW

**Interface:**
```typescript
type SidebarState = 'expanded' | 'collapsed' | 'hidden'

interface SidebarStore {
  state: SidebarState
  collapsedGroups: string[]
  hoverExpanded: boolean                    // true during hover-expand of rail
  setState: (state: SidebarState) => void
  toggle: () => void
  toggleGroup: (groupId: string) => void
  setHoverExpanded: (v: boolean) => void
}
```

**Behavior:**
- `state` persisted in `localStorage.getItem('dk-sidebar')` (default: `'expanded'`)
- `collapsedGroups` persisted in `localStorage.getItem('dk-sidebar-groups')` (default: `[]`)
- `toggle()` on desktop: `expanded ↔ collapsed`. On mobile (`<= 768px`): `hidden ↔ expanded`
- `hoverExpanded` is transient (not persisted) — used when mouse enters collapsed rail

---

### 3.9 `src/providers/ThemeProvider.tsx` — NEW

**Renders:** `{children}` (no wrapper div)

**Logic:**
1. Subscribe to `themeStore.mode`
2. If `mode === 'system'`, attach `matchMedia('(prefers-color-scheme: dark)')` listener
3. Resolve: `mode === 'system' ? (matchesDark ? 'dark' : 'light') : mode`
4. Apply `document.documentElement.setAttribute('data-theme', resolved)`
5. Call `themeStore.setResolved(resolved)`
6. Clean up listener on unmount

---

### 3.10 `src/config/routes.ts` — NEW

**Purpose:** Centralized route metadata for breadcrumbs and page titles. Replaces the `PAGE_TITLES` dict from `Topbar.tsx`.

**Data shape:**
```typescript
interface RouteConfig {
  path: string           // exact route or pattern with :id
  label: string          // display name for breadcrumb + document.title
  parent?: string        // parent route path for breadcrumb chain
}
```

**Entries (all 19 existing routes):**
```typescript
const ROUTE_CONFIG: RouteConfig[] = [
  { path: '/dashboard',             label: 'Dashboard' },
  { path: '/customers',             label: 'Customers' },
  { path: '/leads',                 label: 'Leads' },
  { path: '/activity',              label: 'Activity' },
  { path: '/reports',               label: 'Reports' },
  { path: '/settings',              label: 'Settings' },
  { path: '/catalog',               label: 'Products' },
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

**Exported helpers:**
```typescript
export function matchRoute(pathname: string): RouteConfig | undefined
  // Matches /equipment/42 against /equipment/:id

export function buildBreadcrumbs(pathname: string): { label: string; path: string }[]
  // Returns [{label:'Equipment Registry', path:'/equipment'}, {label:'Equipment Detail', path:'/equipment/42'}]

export function getPageTitle(pathname: string): string
  // Returns the label for the current route, or 'DK Service'
```

---

### 3.11 `src/components/layout/Sidebar.tsx` — REWRITE

**Current:** 172 lines. 5 hardcoded nav arrays, flat section labels, `isOpen`/`onClose` props.

**After:** Reads all state from `sidebarStore`. No props. 3 visual states.

**Internal structure — decomposed into 3 child components:**

**`SidebarBrand.tsx`** — logo section
```
Expanded: [Logo Icon]  DK Service / Enterprise Platform
Collapsed: [Logo Icon] only
Click: navigate to /dashboard
```

**`SidebarNav.tsx`** — navigation groups
```
Nav groups (matching current routes exactly):

  GROUP 'main':     Dashboard
  GROUP 'crm':      Customers, Leads
  GROUP 'sales':    Quotations, Rental Contracts
  GROUP 'fleet':    Equipment Registry
  GROUP 'catalog':  Products, Brands, Categories, Import
  GROUP 'analytics': Activity, Reports
  
  Fixed bottom: Settings

Each group:
  - Header is clickable to collapse/expand children
  - Collapsed state persisted via sidebarStore.collapsedGroups
  - ChevronDown icon rotates to ChevronRight when collapsed
  
Each nav item:
  - Uses NavLink for active state (same as current)
  - Expanded: icon + label
  - Collapsed (rail): icon only + tooltip on hover
  - Active: left 3px blue border + primary-50 bg
```

**`SidebarFooter.tsx`** — user section + collapse toggle
```
Expanded: [Avatar]  User Name / Role     [« collapse button]
Collapsed: [Avatar] only                 [» expand button]

Avatar: same initials logic as current Sidebar.tsx lines 89-96
Collapse button: PanelLeftClose / PanelLeftOpen icons from Lucide
```

**Three sidebar CSS states:**
```css
.sidebar[data-state="expanded"]  { width: var(--sidebar-width-expanded); }
.sidebar[data-state="collapsed"] { width: var(--sidebar-width-collapsed); }
.sidebar[data-state="hidden"]    { transform: translateX(-100%); }

/* Labels hidden in collapsed state */
.sidebar[data-state="collapsed"] .sidebar-label,
.sidebar[data-state="collapsed"] .sidebar-brand-text,
.sidebar[data-state="collapsed"] .sidebar-section-label,
.sidebar[data-state="collapsed"] .sidebar-user-info { display: none; }

/* Center icons in collapsed state */
.sidebar[data-state="collapsed"] .sidebar-nav-item {
  justify-content: center;
  padding: 10px;
}
```

---

### 3.12 `src/components/layout/Header.tsx` — NEW (replaces Topbar)

**Current Topbar.tsx (74 lines):** Static title, user chip, logout button. Hardcoded `left: 240px`.

**Header.tsx layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ [☰]  Products / Product Detail    🔍 Search...   🔔 3   [👤▾] │
│       ↑ breadcrumb                ↑ SearchBar  ↑ Notif  ↑ User │
└─────────────────────────────────────────────────────────────────┘
  ↑ hamburger (calls sidebarStore.toggle)

Optional: CategoryNavBar rendered below header on module pages
```

**Composition:**
```tsx
<header className="header">
  <div className="header-left">
    <button onClick={sidebarStore.toggle}>  {/* hamburger */}
    <Breadcrumb />
  </div>
  <div className="header-center">
    <SearchBar />                              {/* hide below 768px, show icon */}
  </div>
  <div className="header-right">
    <NotificationCenter />
    <UserProfileDropdown />
  </div>
</header>
{showCategoryNav && <CategoryNavBar />}        {/* only on catalog pages */}
```

**CSS:**
```css
.header {
  position: fixed;
  top: 0;
  left: var(--sidebar-width);      /* dynamic — set by AppLayout */
  right: 0;
  height: var(--topbar-height);
  z-index: var(--z-header);
  transition: left var(--duration-slow) var(--ease-default);
}
```

**What's different from current Topbar:**
- `PAGE_TITLES` dict deleted → replaced by `Breadcrumb` reading from `config/routes.ts`
- Inline user chip + logout button deleted → replaced by `UserProfileDropdown`
- Hardcoded `left: 240px` → `left: var(--sidebar-width)` 
- Adds `SearchBar` in center
- Adds `NotificationCenter` bell icon
- Sticky (position: fixed) — same as current, but now with variable offset

---

### 3.13 `src/components/layout/Breadcrumb.tsx` — NEW

**Logic:**
1. `useLocation()` → current `pathname`
2. `buildBreadcrumbs(pathname)` from `config/routes.ts`
3. If only 1 segment → render page title only (no breadcrumb trail)
4. If 2+ segments → render `Home / Parent / Current` with links
5. Sets `document.title` via `useEffect` on pathname change

**Visual:**
```
Single level:  "Equipment Registry"                    ← plain title, 15px semibold
Multi level:   Products  ›  Product Detail             ← links + separator + current
```

---

### 3.14 `src/components/ui/SearchBar.tsx` — NEW

**Purpose:** Enterprise search. Triggered by Cmd+K, clicking the search bar, or the mobile search icon.

**Two modes:**

**Compact mode (in header):**
```
┌──────────────────────────────────┐
│  🔍  Search...            ⌘K    │    height: 36px, 280px wide
└──────────────────────────────────┘
Click → opens overlay mode
```

**Overlay mode (command palette):**
```
┌──────────────────────────────────────────────────┐
│  🔍  Search customers, equipment, quotations...  │
├──────────────────────────────────────────────────┤
│  RECENT                                          │
│    Equipment Registry          Navigation        │
│    QT-2024-0048                Recent             │
│                                                  │
│  QUICK ACTIONS                                   │
│    + New Customer              Cmd+Shift+C       │
│    + New Quotation             Cmd+Shift+Q       │
│                                                  │
│  NAVIGATION                                      │
│    Dashboard                   Cmd+1             │
│    Customers                   Cmd+2             │
│                                                  │
│  [↑↓ navigate · Enter select · Esc close]        │
└──────────────────────────────────────────────────┘
```

**Data sources (all client-side, no new API):**
- Navigation items from `ROUTE_CONFIG`
- Quick actions: hard-coded create shortcuts
- Recent pages: `localStorage.getItem('dk-recent-pages')` (last 8 visited)

**Keyboard:**
- `Cmd+K` / `Ctrl+K` → open
- `↑`/`↓` → navigate results
- `Enter` → select
- `Esc` → close

---

### 3.15 `src/components/ui/CategoryNavBar.tsx` — NEW

**Purpose:** Sub-navigation within a module. Renders below the header only on Catalog module pages.

**Visibility logic:**
```
pathname starts with '/catalog'  → show: Products, Brands, Categories, Import
pathname starts with '/equipment' → (optional future: sub-pages)
all other paths                  → hidden
```

**Visual:**
```
┌──────────────────────────────────────────────────────────────────┐
│  📦 Products    🏷️ Brands    📁 Categories    📤 Import          │
│     ●active                                                     │
└──────────────────────────────────────────────────────────────────┘

Height: 40px
Background: var(--color-surface)
Border-bottom: 1px solid var(--color-border)
Active tab: bottom 2px border in primary color
Position: sticky, below header (top: var(--topbar-height))
```

**Impact on content area:** When visible, content `padding-top` increases by 40px. Managed via CSS:
```css
.has-category-nav .app-content { padding-top: calc(var(--topbar-height) + 40px); }
```

---

### 3.16 `src/components/ui/NotificationCenter.tsx` — NEW

**Trigger:** Bell icon button (34px) with unread count badge.

**Dropdown (360px wide, right-aligned):**
```
┌──────────────────────────────────────┐
│  Notifications             Mark read │
│                                      │
│  TODAY                               │
│  📄 Quotation approved      2h ago  │
│  📋 Contract expiring       5h ago  │
│                                      │
│  YESTERDAY                           │
│  👤 New customer added       1d ago  │
│                                      │
│  View all activity →                 │
└──────────────────────────────────────┘
```

**Data source:** Existing `getActivities({ limit: 15 })` from `src/api/activity.ts`.  
**Unread tracking:** `localStorage.getItem('dk-last-notification-read')` timestamp.  
**Close behavior:** Outside click, Esc key, or navigation.

---

### 3.17 `src/components/ui/UserProfileDropdown.tsx` — NEW

**Trigger:** Avatar circle (32px, initials) + name (hidden < 768px) + ChevronDown.

**Dropdown (240px, right-aligned):**
```
┌──────────────────────────────┐
│  [Avatar 40px]               │
│  Touyl PVS                   │
│  touylpvs7@gmail.com         │
│  Administrator               │
│                              │
│  ─────────────────────────── │
│  Appearance                  │
│  [☀️ Light] [🌙 Dark] [💻 Sys]│
│                              │
│  ─────────────────────────── │
│  ⚙️  Settings                │
│  🚪  Log out                 │
│                              │
└──────────────────────────────┘
```

**Data source:** `authStore.user` — same data as current Topbar user chip.  
**Theme toggle:** Embeds `ThemeToggle` component.  
**Logout:** Calls `useAuth().logout()` — same as current Topbar logout.

---

### 3.18 `src/components/ui/ThemeToggle.tsx` — NEW

**Visual:** Segmented control, 3 buttons: Sun (light), Moon (dark), Monitor (system).

**Active button:** Primary background, white icon.  
**Inactive:** Transparent, muted icon.

**Logic:** Reads/writes `themeStore.mode`. ThemeProvider handles the rest.

---

### 3.19 `src/components/layout/AppLayout.tsx` — REWRITE

**Current (44 lines):** Binary `sidebarOpen` state, window resize listener, renders Sidebar + Topbar + Outlet.

**After:**
```typescript
// Reads sidebar state from sidebarStore (not local state)
// Computes --sidebar-width CSS variable
// Listens to viewport resize for auto state transitions
// Renders: Sidebar + Header + main > Suspense > Outlet
```

**Viewport-driven auto transitions:**
```
width > 1024px  → restore last desktop state (expanded or collapsed)
768px–1024px    → force 'collapsed' (icon rail)
width < 768px   → force 'hidden' (overlay)
```

**CSS variable injection:**
```tsx
const sidebarWidth =
  state === 'expanded'  ? 'var(--sidebar-width-expanded)' :
  state === 'collapsed' ? 'var(--sidebar-width-collapsed)' :
  '0px'

<div className="app-shell" style={{ '--sidebar-width': sidebarWidth }}>
```

---

## 4. Dependency Graph — Build Order

```
LAYER 0 — Pure data / config (zero component deps)
──────────────────────────────────────────────────
  tokens.css              → imported by index.css
  breakpoints.css         → imported by index.css
  config/routes.ts        → pure data + helper functions
  store/themeStore.ts      → zustand only
  store/sidebarStore.ts   → zustand only

LAYER 1 — Provider (depends on Layer 0 stores)
──────────────────────────────────────────────────
  providers/ThemeProvider.tsx  → reads themeStore

LAYER 2 — Leaf UI components (no custom deps)
──────────────────────────────────────────────────
  ThemeToggle.tsx         → reads themeStore
  Breadcrumb.tsx          → reads config/routes.ts + react-router
  SearchBar.tsx           → reads config/routes.ts + react-router
  NotificationCenter.tsx  → reads api/activity.ts
  CategoryNavBar.tsx      → reads react-router location

LAYER 3 — Composite components
──────────────────────────────────────────────────
  UserProfileDropdown.tsx → embeds ThemeToggle, reads authStore
  SidebarBrand.tsx        → reads sidebarStore
  SidebarNav.tsx          → reads sidebarStore, react-router NavLink
  SidebarFooter.tsx       → reads sidebarStore, authStore

LAYER 4 — Layout shells
──────────────────────────────────────────────────
  Sidebar.tsx             → composes SidebarBrand + SidebarNav + SidebarFooter
  Header.tsx              → composes Breadcrumb + SearchBar + NotificationCenter
                            + UserProfileDropdown + CategoryNavBar
  AppLayout.tsx           → composes Sidebar + Header + Outlet

LAYER 5 — Entry
──────────────────────────────────────────────────
  App.tsx                 → uses AppLayout, lazy page imports
  main.tsx                → wraps App in ThemeProvider
```

---

## 5. Migration Strategy

### Principle: Zero-Downtime, Incremental Delivery

Each step produces a working application. No step depends on future steps to be usable. If work stops at any step, the app is functional.

---

### Step 1: Infrastructure (invisible to users)

**Files created:** `tokens.css`, `breakpoints.css`, `themeStore.ts`, `sidebarStore.ts`, `ThemeProvider.tsx`, `config/routes.ts`

**Files modified:** `index.html` (font + title), `index.css` (import tokens)

**Verification:**
- App renders identically (tokens map 1:1 to old var names)
- Inter font loads
- Browser title shows "DK Service — Enterprise Platform"
- `[data-theme="light"]` on `<html>` (no visible change)

**Risk:** Low. New files exist but aren't consumed by layout yet.

---

### Step 2: Entry point wiring

**Files modified:** `main.tsx` (add ThemeProvider), `App.tsx` (lazy imports + Suspense)

**Verification:**
- App still renders all pages
- Network tab shows chunk files (code splitting active)
- Brief loading spinner on first navigation to a new page
- Theme store initializes but has no visible effect yet

**Risk:** Medium. Lazy imports must match page export signatures. Test every route.

---

### Step 3: Leaf components (parallel builds)

**Files created:** `ThemeToggle`, `Breadcrumb`, `SearchBar`, `NotificationCenter`, `UserProfileDropdown`, `CategoryNavBar` (12 files total: 6 tsx + 6 css)

**Verification:** Components can be rendered in isolation (temporary test route or console). Not wired into the layout yet.

**Risk:** None. New files, not imported anywhere.

---

### Step 4: Sidebar rewrite (highest-risk change)

**Files created:** `SidebarBrand.tsx`, `SidebarNav.tsx`, `SidebarFooter.tsx`

**Files rewritten:** `Sidebar.tsx`, `Sidebar.css`

**Verification:**
```
[ ] All 15 nav items render (same routes as before)
[ ] Clicking each nav item navigates correctly
[ ] Groups collapse/expand
[ ] Collapsed state shows icon-only rail (68px)
[ ] Hover on collapsed rail expands temporarily
[ ] Mobile: overlay with backdrop
[ ] Sidebar state persists across refresh
[ ] Group collapse state persists
[ ] Active nav item highlighted
[ ] User info shows in footer
```

**Risk:** High. Core navigation. Must preserve every NavLink `to=` value.

**Rollback:** Git revert to pre-rewrite commit restores original Sidebar.

---

### Step 5: Header rewrite + layout wiring

**Files created:** `Header.tsx`, `Header.css`

**Files rewritten:** `AppLayout.tsx`, `AppLayout.css`

**Files deleted:** `Topbar.tsx`, `Topbar.css`

**Verification:**
```
[ ] Breadcrumb shows on sub-pages (detail, create routes)
[ ] Page title updates in breadcrumb and document.title
[ ] Search bar visible in header, Cmd+K opens palette
[ ] Notification bell shows, dropdown lists activity
[ ] User avatar shows, dropdown shows profile + theme + logout
[ ] CategoryNavBar visible on /catalog/* routes
[ ] Header left offset adjusts with sidebar state
[ ] Mobile: hamburger opens sidebar overlay
[ ] Logout works from UserProfileDropdown
[ ] Theme toggle switches light/dark/system
[ ] All 19 routes still render correctly
```

**Risk:** High. Removes Topbar (consumed by AppLayout). Must complete Header before deleting Topbar.

**Rollback:** Keep `Topbar.tsx` until Header is verified. Delete in a separate commit.

---

### Step 6: Cleanup + polish

```
[ ] Delete App.css (dead file)
[ ] Verify dark mode on all pages (tokens handle most; inline styles in
    QuotationDetailPage and RentalContractDetailPage won't adapt — known tech debt)
[ ] Test at 5 breakpoints: 420px, 640px, 768px, 1024px, 1536px
[ ] Verify Modal, Drawer, Toast render correctly in dark mode
[ ] Confirm no pages import Topbar.tsx or Topbar.css
```

---

### Step Summary Timeline

```
Step 1: Infrastructure      Day 1         No visible change, zero risk
Step 2: Entry wiring         Day 2         Code splitting active
Step 3: Leaf components      Day 2-4       Parallel work, components ready
Step 4: Sidebar rewrite      Day 4-6       New sidebar live
Step 5: Header + layout      Day 6-8       Full new shell live
Step 6: Cleanup              Day 8-9       Topbar deleted, polish done
                             ─────
                             ~9 working days
```

---

## 6. Verification Matrix

| Requirement | Component(s) | Data Source | Route Impact |
|---|---|---|---|
| 1. Sticky Header | `Header.tsx` | — | None |
| 2. Enterprise Search | `SearchBar.tsx` | `config/routes.ts`, localStorage | None |
| 3. Category Nav Bar | `CategoryNavBar.tsx` | `pathname` check | None |
| 4. Notification Center | `NotificationCenter.tsx` | `api/activity.ts` (existing) | None |
| 5. User Profile Dropdown | `UserProfileDropdown.tsx` | `authStore` (existing) | None |
| 6. Breadcrumb System | `Breadcrumb.tsx` | `config/routes.ts` | None |
| 7. Responsive Sidebar | `Sidebar.tsx` + children | `sidebarStore` | None |
| 8. Mobile Navigation | `Sidebar.tsx` overlay + `Header.tsx` hamburger | `sidebarStore` | None |
| 9. Theme Provider | `ThemeProvider.tsx` + `tokens.css` | `themeStore` | None |
| 10. Layout Container | `AppLayout.tsx` | CSS variables | None |

**Route preservation:** All 19 routes in `App.tsx` remain byte-for-byte identical. The only `App.tsx` change is swapping `import X from '...'` to `const X = lazy(() => import('...'))` and adding `<Suspense>`. Route paths, nesting, and components are untouched.

---

## 7. Risk Registry

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Token rename breaks page CSS | Low | High | Alias old names in tokens.css — verified: names are identical |
| Lazy import breaks a page | Low | High | Every page uses `export default function` — safe for `React.lazy` |
| Sidebar rewrite loses a nav link | Medium | High | Diff all `to=` values against current Sidebar.tsx before merge |
| Dark mode unreadable on some pages | High | Medium | 50+ inline `style={{}}` in Quotation/Rental detail pages won't adapt. Accept as known tech debt — those pages need their own CSS rewrite (out of scope). |
| SearchBar performance | Low | Low | Client-side only, <50 items to filter. No API calls. |
| Notification API rate | Low | Low | Single call on component mount, no polling. |
| CategoryNavBar adds height to content area | Medium | Low | Add CSS `.has-category-nav` class with adjusted padding-top. Test on all /catalog/* pages. |
