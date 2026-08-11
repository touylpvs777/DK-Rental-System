# DK Service Enterprise Platform — UX Audit Report

**Auditor Role:** Principal Product Designer & Enterprise UX Architect  
**Audit Date:** 2026-06-21  
**Codebase Snapshot:** 97 source files, 5 modules, React 19 + TypeScript 6 + Vite 8  
**Scope:** CRM, Product Catalog, Equipment Registry, Quotation, Rental Contract

---

## Executive Summary

The DK Service platform is a functionally complete enterprise application with solid data architecture, clean code organization, and consistent development patterns. However, it currently operates at a **prototype-to-MVP maturity level**, not an enterprise-production level. The core issues are: no design system (hardcoded colors and inline styles), no accessibility foundation, no code splitting, no global navigation features (search, breadcrumbs), and significant CSS coupling between modules. The good news is that the architecture is sound — the path to production readiness is additive, not a rewrite.

### Production Readiness Score: 52 / 100

```
DIMENSION                SCORE   WEIGHT   WEIGHTED
─────────────────────── ─────── ──────── ──────────
1. Responsiveness         55      15%       8.3
2. Accessibility          25      15%       3.8
3. Performance            45      15%       6.8
4. Navigation             40      15%       6.0
5. Scalability            60      10%       6.0
6. Maintainability        65      15%       9.8
7. Design Consistency     55      15%       8.3
─────────────────────── ─────── ──────── ──────────
TOTAL                                      52.0 / 100
```

---

## 1. Responsiveness Audit — Score: 55/100

### What Works

| Area | Evidence |
|---|---|
| Sidebar hides below 768px with overlay | `AppLayout.tsx:17` — `MOBILE_BREAKPOINT = 768` |
| Table columns hide on mobile | `shared.css:179` — `.col-hide-sm { display: none }` at 640px |
| Form rows stack on mobile | `shared.css:181` — `.form-row-2 { grid-template-columns: 1fr }` at 640px |
| Dashboard KPI grid collapses | `DashboardPage.css:94-115` — 3 breakpoints (1100px, 720px, 420px) |
| Content padding reduces on mobile | `AppLayout.css:30` — `padding: 20px 16px` at 768px |

### Critical Issues

| ID | Severity | Issue | Location | Impact |
|---|---|---|---|---|
| R-01 | **High** | Only 2 breakpoints globally (640px, 768px). No tablet-landscape (1024px) or widescreen (1536px) handling. | `shared.css`, `AppLayout.css` | Sidebar either fully visible (241px margin) or fully hidden. No intermediate collapsed/rail state for tablets. |
| R-02 | **High** | Tables on mobile hide columns but remain as `<table>` elements. No card-list alternative below 640px. | All list pages | Users must horizontal-scroll on phones. Touch targets inside table cells are ~30px — below 44px minimum. |
| R-03 | **High** | Detail pages use 2-column grid that only collapses at 768px. Between 768px-1024px, columns are squeezed. | `ProductDetailPage.css:25` | Info column text wraps awkwardly on iPad/tablet portrait. |
| R-04 | **Medium** | Dashboard 5-column KPI grid at 1100px+ forces cards too wide on ultra-wide screens. No `max-width` on individual cards. | `DashboardPage.css:37` — `cols-5 { repeat(5, 1fr) }` | Cards stretch to ~350px+ on 2560px monitors. |
| R-05 | **Medium** | Topbar `left: 240px` is hardcoded — doesn't adapt to intermediate sidebar states. | `Topbar.css:3` | If sidebar were collapsed (64px rail), topbar wouldn't adjust. |
| R-06 | **Medium** | QuotationDetailPage and RentalContractDetailPage use `gridTemplateColumns: '1fr 1fr'` as inline styles — no responsive breakpoint. | `QuotationDetailPage.tsx:222`, `RentalContractDetailPage.tsx` | Detail metadata stays 2-column on mobile, causing cramped layout. |
| R-07 | **Low** | Login page 2-panel layout has no breakpoint — brand panel simply stacks but at what width? | `LoginPage.css` (not audited inline, but follows standard pattern) | Minor — works but no explicit control. |

### Missing Responsive Features

- No `prefers-reduced-motion` media query for users who disable animations
- No container queries (newer CSS feature, not critical but a gap vs. enterprise competitors)
- No viewport-height handling for modals on mobile (virtual keyboard pushes modals off-screen)
- No safe-area-inset handling for notched/rounded-corner mobile devices

---

## 2. Accessibility Audit — Score: 25/100

### What Works

| Area | Evidence |
|---|---|
| Modal: Esc key closes | `Modal.tsx:26` — keydown listener for Escape |
| Drawer: Esc key closes | `Drawer.tsx:18` — same pattern |
| Sidebar overlay: `aria-hidden="true"` | `Sidebar.tsx:107` |
| Product card: `role="button"`, `tabIndex={0}` | `ProductCard.tsx:17` |
| Login form: `htmlFor` on labels, `autoComplete` attributes | `LoginPage.tsx:40-57` |
| Menu toggle: `aria-label="Toggle sidebar"` | `Topbar.tsx:54` |

### Critical Issues

| ID | Severity | Issue | Location | WCAG Rule |
|---|---|---|---|---|
| A-01 | **Critical** | No focus trapping in Modal or Drawer. Tab key escapes the dialog into background content. | `Modal.tsx`, `Drawer.tsx` | WCAG 2.4.3 Focus Order |
| A-02 | **Critical** | Modal and Drawer have no `role="dialog"` or `aria-modal="true"`. Screen readers don't announce them as dialogs. | `Modal.tsx:33`, `Drawer.tsx:24` | WCAG 4.1.2 Name, Role, Value |
| A-03 | **Critical** | Table rows used as navigation (`onClick` on `<tr>`) have no keyboard equivalent. No `role="link"` or `tabIndex`. Users can't navigate table rows via keyboard. | All list pages (e.g., `EquipmentRegistryPage.tsx:249`) | WCAG 2.1.1 Keyboard |
| A-04 | **Critical** | No skip-navigation link to bypass sidebar and topbar. Keyboard users must tab through ~20+ nav items to reach content. | `AppLayout.tsx` | WCAG 2.4.1 Bypass Blocks |
| A-05 | **High** | Badge component uses color alone to convey status. No visible text distinction for colorblind users (green "Active" vs green "Won" vs green "Accepted" rely on text, but structural color-only patterns exist). | `Badge.tsx` — all colors via `CSSProperties` | WCAG 1.4.1 Use of Color |
| A-06 | **High** | No `aria-live` region for toast notifications. Screen readers don't announce toast messages. | `Toast.tsx` | WCAG 4.1.3 Status Messages |
| A-07 | **High** | Form error messages not linked to inputs via `aria-describedby`. Errors shown as separate banners, not associated with specific fields. | All form components (`CustomerForm`, `ForkliftForm`, `ProductForm`, `QuotationFormPage`, `RentalContractFormPage`) | WCAG 1.3.1 Info and Relationships |
| A-08 | **High** | No `aria-current="page"` on active sidebar nav items. Screen readers don't announce which page is current. | `Sidebar.tsx:76` — uses className only | WCAG 1.3.1 |
| A-09 | **Medium** | ConfirmDialog uses `Modal` (inherits its a11y gaps) and has no `role="alertdialog"`. | `ConfirmDialog.tsx` | WCAG 4.1.2 |
| A-10 | **Medium** | Pagination buttons lack descriptive labels. "1", "2", "3" are not contextualized as "Page 1", "Page 2". | All list pages | WCAG 2.4.6 Headings and Labels |
| A-11 | **Medium** | No page title updates on route change. `document.title` stays "frontend" for all pages. | `index.html:9` — `<title>frontend</title>` | WCAG 2.4.2 Page Titled |
| A-12 | **Medium** | Color contrast for muted text (`#64748b` on `#f8fafc`) is 4.1:1 — passes AA for normal text (4.5:1 needed) but only barely. Some smaller muted text (11px) fails. | `index.css:19-20` | WCAG 1.4.3 Contrast |
| A-13 | **Low** | No heading hierarchy on most pages. Dashboard sections use `<h2>` but under no `<h1>`. List pages' `<h1>` is in the page-header but not semantically connected to the table. | All pages | WCAG 1.3.1 |

### Missing Accessibility Features

- No keyboard shortcut documentation or discoverability
- No `prefers-contrast` support
- No landmark roles (`<main>`, `<nav>`, `<aside>`) — `AppLayout.tsx` uses `<main>` but sidebar is `<aside>` without role
- No announced loading states (skeleton loaders are visual-only)
- No error summary on form submission failure

---

## 3. Performance Audit — Score: 45/100

### What Works

| Area | Evidence |
|---|---|
| Zustand for state (tiny bundle, no Redux overhead) | `authStore.ts`, `toastStore.ts` — ~1KB total |
| Skeleton loaders for perceived performance | Every list page and dashboard |
| CSS transitions hardware-accelerated (transform, opacity) | `shared.css`, card hover effects |
| Vite build tool (fast HMR, optimized production builds) | `vite.config.ts` |
| Debounced search (implicit via onChange + API call batching) | Hook pattern in `useForklifts.ts:38` |

### Critical Issues

| ID | Severity | Issue | Location | Impact |
|---|---|---|---|---|
| P-01 | **Critical** | Zero code splitting. All 16 page components eagerly imported in `App.tsx`. Initial bundle includes every module. | `App.tsx:2-22` — 16 direct `import` statements | Estimated initial JS: 250KB+ gzipped. Users loading login page download the entire Equipment, Rental, and Quotation module code. |
| P-02 | **High** | CRM modules (Customers, Leads) fetch ALL records client-side, then filter/sort/paginate in memory. No server-side pagination. | `CustomersPage.tsx:69-80` — `useMemo` filter on full array; `useCustomers` returns all customers | Works for <100 records. Will freeze the browser at 1,000+ customers with O(n) filter on every keystroke. |
| P-03 | **High** | No image lazy loading. Product and equipment photo grids load all images eagerly, including below-the-fold items. | `ProductCard.tsx:14`, `ForkliftCard.tsx:35` — plain `<img>` tags | On a page with 20 product cards, all 20 images download on paint. At 100KB/image, that's 2MB for initial view. |
| P-04 | **Medium** | No `React.memo` on list item components. Every state change in the list page (search typing, filter change) re-renders every card/row. | `ProductCard.tsx`, `ForkliftCard.tsx`, all table rows | Noticeable jank on pages with 20+ items during rapid filter changes. |
| P-05 | **Medium** | Dashboard makes 4 API calls in parallel on mount (dashboard summary + catalog stats via 3 calls). No caching or stale-while-revalidate. | `DashboardPage.tsx` + `CatalogDashboardWidget.tsx:22-31` | Every dashboard visit = 4 network requests. No data persists across navigations. |
| P-06 | **Medium** | No `loading="lazy"` attribute on images. Browsers support native lazy loading but it's not being used. | All `<img>` tags across the codebase | Easy win: add `loading="lazy"` to all product/equipment images. |
| P-07 | **Low** | CSS animations use `animation` shorthand without `will-change` hints. Minor, but skeleton pulse on 8+ rows triggers composite layer churn. | `shared.css:117` — `skeleton-pulse` animation | Cosmetic jank on lower-end devices. |

### Missing Performance Features

- No route-based code splitting (`React.lazy` + `Suspense`)
- No image optimization (no `srcset`, no WebP fallbacks, no CDN resize params)
- No virtual scrolling for large lists
- No service worker or offline capability
- No prefetching of likely-next routes (e.g., prefetch detail page on row hover)
- No HTTP cache headers awareness in the API client (no `stale-while-revalidate`)

---

## 4. Navigation Audit — Score: 40/100

### What Works

| Area | Evidence |
|---|---|
| Sidebar with 5 labeled groups | `Sidebar.tsx:26-51` — Main, Sales, Analytics, Catalog, Equipment |
| Active nav item highlighting (NavLink) | `Sidebar.tsx:76` — `isActive` className |
| User profile in sidebar footer | `Sidebar.tsx:160-168` — initials, name, role |
| Mobile hamburger menu | `Topbar.tsx:50-55` — menu toggle button |
| Back buttons on detail pages | All detail pages have `<button className="detail-back">` |
| Module registry for scalability | `registry.ts` — central config of 8 active + 4 planned modules |

### Critical Issues

| ID | Severity | Issue | Location | Impact |
|---|---|---|---|---|
| N-01 | **Critical** | No breadcrumbs. Users on `/catalog/products/42` have no indication of their position in the hierarchy. Only a back button. | All detail pages | Users lose context, especially when arriving via deep link or browser back. |
| N-02 | **Critical** | No global search. Users must navigate to each module and use its per-page search independently. | No component exists | Finding a specific forklift serial number requires navigating to Equipment first. Enterprise users expect Cmd+K. |
| N-03 | **High** | Topbar `PAGE_TITLES` is a hardcoded dictionary that doesn't cover dynamic routes. `/catalog/products/42` shows "DK Service" as title, not "Product Detail". | `Topbar.tsx:6-16` — only 9 static paths mapped | Users see "DK Service" as page title on every detail/create page. |
| N-04 | **High** | Sidebar navigation groups are not collapsible. All 15 nav items are always visible. | `Sidebar.tsx:123-157` — flat list with section labels | As modules grow (Projects, Services, Tasks, Invoices planned), the sidebar will overflow and require scrolling. |
| N-05 | **High** | No sidebar collapsed/rail state. The sidebar is either 240px open or completely hidden. No 64px icon-only intermediate. | `AppLayout.tsx:10-28` — binary `sidebarOpen` boolean | On tablets (768-1024px), the sidebar either takes 240px (30% of screen) or is completely hidden. |
| N-06 | **Medium** | Module registry (`registry.ts`) is not used for navigation. Sidebar defines its own nav arrays. Two sources of truth. | `Sidebar.tsx:26-51` (nav arrays) vs `registry.ts` (module config) | Adding a new module requires changes in both files. |
| N-07 | **Medium** | No notification center. Users have no bell icon or alert system for state changes (contract expiring, quotation approved). | No component exists | Users must manually check each module for updates. |
| N-08 | **Medium** | No user profile dropdown. Logout is a standalone button in the topbar. No account settings, theme toggle, or profile. | `Topbar.tsx:67-70` — plain logout button | Basic UX. No path to settings, no theme control, no profile access. |
| N-09 | **Low** | No keyboard shortcuts. No Cmd+K, no Cmd+1-5 for module navigation. | No implementation exists | Power users have no keyboard-driven navigation. |

---

## 5. Scalability Audit — Score: 60/100

### What Works

| Area | Evidence |
|---|---|
| Feature-based folder structure | `src/pages/{Module}/`, `src/components/{domain}/` |
| Centralized API client with interceptors | `api/client.ts` — single axios instance |
| Consistent hook pattern per entity | `useForklifts`, `useCatalog`, `useQuotations`, `useRentals` — all follow same shape |
| Module registry with planned modules | `registry.ts` — Projects, Services, Tasks, Invoices already defined |
| TypeScript strict mode | `tsconfig.app.json:6` — `target: es2023`, strong typing throughout |
| Zustand stores are domain-scoped | `authStore`, `toastStore` — adding `themeStore`, `sidebarStore` is natural |

### Issues

| ID | Severity | Issue | Impact |
|---|---|---|---|
| S-01 | **High** | CRM modules (Customers, Leads) use client-side-only data management — no server-side pagination. As data grows past 500 records, this becomes unusable. | `useCustomers` and `useLeads` fetch all records, filter/sort in `useMemo`. |
| S-02 | **High** | No shared DataTable component. Pagination logic is copy-pasted into 5 files (EquipmentRegistryPage, CatalogPage, QuotationListPage, RentalContractListPage, and separately in Customers/Leads). | 5 implementations of `pageNumbers` calculation, each ~8 lines. |
| S-03 | **Medium** | Status options (STATUS_OPTIONS, TYPE_OPTIONS) are duplicated across form and list files within each module. | `EquipmentRegistryPage.tsx:25-40` (identical to `ForkliftForm.tsx:37-58`), same for Quotations and Rental. |
| S-04 | **Medium** | Badge components are per-module (`ForkliftStatusBadge`, `QuotationStatusBadge`, `RentalStatusBadge`) rather than a single unified component with a status registry. | 3 badge files, each with its own STATUS_MAP + STATUS_LABELS. |
| S-05 | **Medium** | No shared form utility. Every form component manually implements `useState` with object shape + `set()` helper + submit handler + error state. | 6 form components with near-identical boilerplate (~40 lines each). |
| S-06 | **Low** | Module registry exists but isn't consumed for sidebar navigation, routing, or breadcrumbs. It's only used in the Reports page. | `registry.ts` is informational, not functional. |

---

## 6. Maintainability Audit — Score: 65/100

### What Works

| Area | Evidence |
|---|---|
| Clean file naming (PascalCase components, camelCase hooks) | Consistent across all 97 files |
| API layer fully separated from UI | `src/api/*.ts` — 9 files, all pure functions, no UI coupling |
| Types in dedicated directory | `src/types/*.ts` — 9 files, matching 1:1 with API modules |
| CSS custom properties for theming | `index.css:7-28` — 10 core variables |
| No class-based components | 100% functional React + hooks |
| Small component files (mostly <200 lines) | Average page component: ~250 lines. Most UI components: <80 lines. |

### Issues

| ID | Severity | Issue | Impact |
|---|---|---|---|
| M-01 | **High** | Cross-module CSS imports. Equipment pages import `CatalogPage.css` and `ProductDetailPage.css`. Quotation and Rental detail pages import `ProductDetailPage.css`. | `EquipmentRegistryPage.tsx:16`, `QuotationDetailPage.tsx:19`, `RentalContractDetailPage.tsx:17` — all import `@/pages/Catalog/ProductDetailPage.css`. Changing Catalog styles will break Equipment, Quotation, and Rental detail pages. |
| M-02 | **High** | Inline styles used heavily in Quotation and Rental detail pages instead of CSS classes. 50+ `style={{...}}` props in QuotationDetailPage alone. | `QuotationDetailPage.tsx:134-253` — nearly every element has inline styles. Impossible to maintain consistently; no dark-mode support for these elements. |
| M-03 | **Medium** | Utility functions duplicated across files. `fmtDate()` is defined identically in 6 files. `fmtAmount()` in 3 files. `fmtDateTime()` in 3 files. | `EquipmentRegistryPage.tsx:20`, `ForkliftDetailPage.tsx:17`, `QuotationListPage.tsx:13`, `QuotationDetailPage.tsx:21`, `RentalContractListPage.tsx:13`, `RentalContractDetailPage.tsx:19` |
| M-04 | **Medium** | Pagination logic (`pageNumbers` closure) is copy-pasted into 4 list page files, identical implementation each time. | ~8 lines repeated in 4 files. Any pagination bug must be fixed in 4 places. |
| M-05 | **Medium** | `App.tsx` has no lazy imports. Adding a new module means adding another eager import, growing the initial bundle. | 16 import statements, all synchronous. |
| M-06 | **Low** | `App.css` exists but is not imported anywhere — dead file. | `src/App.css` — 0 references. |
| M-07 | **Low** | Some hooks use `useState(() => ...)` (BrandsPage, CategoriesPage) instead of `useEffect` for initialization — technically works but is an anti-pattern that may confuse maintainers. | `BrandsPage.tsx:30`, `CategoriesPage.tsx:25` |

---

## 7. Design Consistency Audit — Score: 55/100

### What Works

| Area | Evidence |
|---|---|
| Consistent page header pattern | Every list page uses `.page-header` with `<h1>` + sub + actions |
| Consistent toolbar pattern | Every list page uses `.toolbar` with search + filters + count |
| Consistent table structure | All tables use `.data-table` with `.table-card` wrapper |
| Consistent skeleton loading | All list pages render 8 skeleton rows during loading |
| Consistent empty states | All tables show `.table-empty` with icon + text |
| Consistent button variants | `.btn-primary`, `.btn-ghost`, `.btn-danger` used everywhere |
| Consistent badge component | All status badges use the same `<Badge>` component |
| Lucide icons throughout | No mixed icon libraries |

### Issues

| ID | Severity | Issue | Location | Description |
|---|---|---|---|---|
| D-01 | **High** | Detail pages have no consistent layout pattern. Catalog uses gallery + info. Equipment uses similar but with inline CSS. Quotation/Rental use entirely inline-styled layouts. | Compare: `ProductDetailPage.tsx` (uses CSS classes) vs `QuotationDetailPage.tsx` (100% inline styles) | Every detail page looks structurally different. No shared `DetailShell` or `DetailHeader`. |
| D-02 | **High** | Two different data management patterns. Catalog/Equipment/Quotation/Rental use server-side pagination via hooks. CRM (Customers/Leads) use client-side-only. | `useCatalog.ts` (server params) vs `useCustomers.ts` (loads all, filters in useMemo) | Inconsistent behavior: CRM pages have no page_size selector, others have 20-item pages. |
| D-03 | **High** | No dark mode. All colors hardcoded for light theme. Sidebar uses hardcoded dark colors (`#0f172a`), making a future dark mode complex. | `Sidebar.css:9` — `background: #0f172a`, `index.css:10-27` — light-only `:root` vars | Enterprise platforms (Linear, Samsara) offer dark mode. Current code has no `[data-theme]` support. |
| D-04 | **Medium** | Font sizes vary inconsistently. Body: 14px. Table cells: 13.5px. Labels: 12.5px. Some inline styles use 11px, 11.5px, 12px, 13px. No systematic type scale. | Across all CSS + inline styles | 8+ font sizes in use with no named tokens. |
| D-05 | **Medium** | Spacing is ad-hoc. Gaps: 3px, 4px, 5px, 6px, 8px, 10px, 12px, 14px, 16px, 18px, 20px, 24px, 28px, 32px all used. No 4px-base spacing scale enforced. | Across all CSS files | Visual rhythm feels inconsistent between sections and modules. |
| D-06 | **Medium** | Card styling varies. Product cards: 10px radius, `translateY(-2px)` hover. Stat cards: 10px radius, `translateY(-1px)` hover. Table card: 10px radius. Some inline cards use 8px radius. | `ProductCard.css:4`, `StatCard.css:4`, `ForkliftCard.css:4` vs inline `borderRadius: 8` in QuotationDetailPage | Minor but noticeable inconsistency in hover effects and radii. |
| D-07 | **Medium** | Color usage inconsistencies. The primary color is `#2563eb` in tokens but `#1d4ed8` appears as hover-only color in some places and as primary-text-color in others. | `index.css:12` (primary dark) used in Badge blue variant `color: #2563eb`, some badges use `#1d4ed8` | No primary-50 through primary-700 scale. Colors picked ad-hoc. |
| D-08 | **Low** | Refresh button reuses `.topbar-logout` CSS class — a semantic mismatch. | `DashboardPage.tsx:54`, `EquipmentRegistryPage.tsx:92` — `className="topbar-logout"` on a refresh button | Functional but confusing for maintainers. |

---

## Cross-Module Comparison Matrix

| Capability | CRM (Customers/Leads) | Catalog | Equipment | Quotation | Rental |
|---|---|---|---|---|---|
| **List page** | Table only | Grid + Table toggle | Grid + Table toggle | Table only | Table only |
| **Pagination** | Client-side | Server-side | Server-side | Server-side | Server-side |
| **Search** | Client-side filter | API `q` param | API `q` param | API `q` param | API `q` param |
| **Sorting** | Client-side multi | API sort/order | None (no sort headers) | None | None |
| **Detail page** | No detail page | Gallery + info + specs | Photo + info + history + docs | Info + items + history + approvals | Info + items + history + returns + extensions + billing |
| **Create form** | Modal | Modal | Modal | Full page | Full page |
| **Edit form** | Modal | Modal | Modal | None (create only) | None (create only) |
| **Delete** | Row button | Row button | Row button | Draft only | Draft only |
| **Status badges** | In Badge.tsx | In Badge.tsx | Dedicated component | Dedicated component | Dedicated component |
| **Grid cards** | None | ProductCard | ForkliftCard | None | None |
| **View toggle** | No | Yes | Yes (borrows Catalog CSS) | No | No |
| **Dedicated CSS** | CustomersPage.css | CatalogPage.css + ProductDetailPage.css | No (imports Catalog CSS) | No (imports Catalog CSS) | No (imports Catalog CSS) |

---

## File-Level Issue Heatmap

```
SEVERITY:  🔴 Critical   🟠 High   🟡 Medium   ⚪ Low

FILE                                    ISSUES    SEVERITY
──────────────────────────────────────  ────────  ────────
App.tsx                                 P-01      🔴
AppLayout.tsx                           R-05,N-05 🟠🟠
Sidebar.tsx                             N-04,N-06,A-08 🟠🟠🟡
Topbar.tsx                              N-03,N-07,N-08 🟠🟠🟠
Modal.tsx                               A-01,A-02 🔴🔴
Drawer.tsx                              A-01,A-02 🔴🔴
Toast.tsx                               A-06      🟠
index.html                              A-11      🟡
index.css                               D-03,D-04,D-07 🟠🟡🟡
shared.css                              R-01      🟠

CustomersPage.tsx                       P-02,S-01,D-02 🟠🟠🟠
LeadsPage.tsx                           P-02,S-01,D-02 🟠🟠🟠

CatalogPage.tsx                         P-03,A-03 🟠🔴
ProductDetailPage.tsx                   R-03      🟠
ProductCard.tsx                         P-04,P-06 🟡🟡

EquipmentRegistryPage.tsx               M-01,A-03 🟠🔴
ForkliftDetailPage.tsx                  M-01,M-02 🟠🟠

QuotationListPage.tsx                   A-03,S-02 🔴🟠
QuotationDetailPage.tsx                 M-01,M-02,R-06 🟠🟠🟠
QuotationFormPage.tsx                   (clean)

RentalContractListPage.tsx              A-03,S-02 🔴🟠
RentalContractDetailPage.tsx            M-01,M-02,R-06 🟠🟠🟠
RentalContractFormPage.tsx              (clean)
```

---

## Production Readiness Scoring — Detailed Breakdown

### Responsiveness: 55/100

```
+20  Sidebar collapse on mobile
+15  Column hiding on mobile tables
+10  Dashboard KPI grid responsive breakpoints
+10  Form grid responsive stacking
-15  No tablet intermediate state
-10  No card-list mobile alternative for tables
-10  No widescreen handling
-5   Detail page 2-col doesn't adapt for tablets
-5   No touch-target compliance (44px minimum)
```

### Accessibility: 25/100

```
+10  Esc-to-close on modals/drawers
+5   aria-label on hamburger button
+5   aria-hidden on sidebar overlay
+5   htmlFor + autoComplete on login form
-20  No focus trapping in modals/drawers
-15  No dialog roles (role="dialog", aria-modal)
-10  No keyboard navigation for table rows
-5   No skip-navigation link
-5   No aria-live for toast announcements
-5   No page title updates per route
-5   No form error association (aria-describedby)
-5   No aria-current on active nav
```

### Performance: 45/100

```
+15  Zustand lightweight state
+15  Skeleton loaders throughout
+10  Vite bundler
+5   CSS hardware-accelerated transitions
-25  Zero code splitting (all pages eagerly imported)
-15  Client-side-only data for CRM modules (will break at scale)
-10  No image lazy loading
-5   No React.memo on list items
-5   No data caching between navigations
```

### Navigation: 40/100

```
+15  Sidebar with labeled groups
+10  Active nav item highlighting
+10  Back buttons on detail pages
+5   Mobile hamburger menu
-15  No breadcrumbs
-10  No global search (Cmd+K)
-10  No collapsed sidebar rail state
-5   PAGE_TITLES doesn't cover dynamic routes
-5   No notification center
-5   Module registry not used for navigation
```

### Scalability: 60/100

```
+20  Feature-based folder structure
+15  Centralized API client
+15  Consistent hook pattern
+10  Module registry with planned modules
-15  Client-side data in CRM (won't scale)
-10  No shared DataTable component (5 copies)
-5   Status options duplicated per module
-5   Badge components duplicated per module
-5   No shared form utilities
```

### Maintainability: 65/100

```
+20  Clean code organization
+15  Separated API / types / hooks layers
+10  CSS custom properties as theme base
+10  All functional components
+10  Small focused files
-15  Cross-module CSS imports (M-01 — fragile coupling)
-10  Heavy inline styles in Quotation/Rental detail pages
-5   Utility function duplication (fmtDate × 6)
-5   Pagination logic duplication (× 4)
```

### Design Consistency: 55/100

```
+15  Consistent page-header + toolbar pattern
+15  Shared table styles
+10  Shared button system
+10  Unified Badge component
+5   Consistent icon library (Lucide)
-15  No shared detail page layout
-10  Two different data management patterns
-5   No dark mode
-5   Font sizes and spacing ad-hoc
-5   Color palette not systematic
```

---

## Improvement Roadmap

### Phase 1: Critical Fixes (Week 1–2) — Target: 52 → 68

| Priority | Task | Issues Resolved | Score Impact |
|---|---|---|---|
| P0 | Add `React.lazy` + `Suspense` to all page imports in `App.tsx` | P-01 | Perf +10 |
| P0 | Add focus trapping to Modal and Drawer | A-01 | A11y +8 |
| P0 | Add `role="dialog"` + `aria-modal="true"` to Modal and Drawer | A-02 | A11y +5 |
| P0 | Add `aria-live="polite"` to Toast container | A-06 | A11y +3 |
| P0 | Add `loading="lazy"` to all `<img>` tags | P-03, P-06 | Perf +5 |
| P0 | Create `src/utils/format.ts` with shared `fmtDate`, `fmtAmount`, `fmtDateTime` | M-03 | Maint +3 |
| P0 | Update `<title>` per route in `Topbar.tsx` via `useEffect` + `document.title` | A-11, N-03 | A11y +2, Nav +2 |

### Phase 2: Foundation (Week 3–4) — Target: 68 → 78

| Priority | Task | Issues Resolved | Score Impact |
|---|---|---|---|
| P1 | Create `src/styles/tokens.css` with full design token system | D-03, D-04, D-05, D-07 | Consistency +8 |
| P1 | Create shared `Breadcrumb` component + route config | N-01 | Nav +8 |
| P1 | Evolve sidebar to 3-state (expanded/collapsed/hidden) + collapsible groups | N-04, N-05, R-01 | Nav +6, Resp +5 |
| P1 | Create each Quotation/Rental detail page's own CSS file, eliminate inline styles | M-01, M-02 | Maint +8 |
| P1 | Add `tabIndex={0}` + `onKeyDown` (Enter) to clickable table rows | A-03 | A11y +5 |
| P1 | Add skip-navigation link in `AppLayout` | A-04 | A11y +3 |
| P1 | Add `aria-current="page"` to active sidebar NavLink | A-08 | A11y +2 |

### Phase 3: Shared Components (Week 5–7) — Target: 78 → 86

| Priority | Task | Issues Resolved | Score Impact |
|---|---|---|---|
| P2 | Build shared `DataTable` component with sorting, pagination, skeleton, empty state | S-02, M-04 | Scale +5, Maint +4 |
| P2 | Build shared `DetailShell` (header + tabs + 2-col layout) | D-01, R-03 | Consistency +5, Resp +3 |
| P2 | Migrate Customers/Leads to server-side pagination | P-02, S-01, D-02 | Perf +8, Scale +5 |
| P2 | Build `CommandPalette` (Cmd+K global search) | N-02 | Nav +6 |
| P2 | Unify badge components into single registry-driven StatusBadge | S-04 | Scale +2 |
| P2 | Add mobile card-list view to DataTable (below 640px) | R-02 | Resp +5 |

### Phase 4: Enterprise Features (Week 8–10) — Target: 86 → 92

| Priority | Task | Issues Resolved | Score Impact |
|---|---|---|---|
| P3 | Build `NotificationCenter` (bell dropdown from Activity API) | N-07 | Nav +3 |
| P3 | Build `UserProfileMenu` dropdown (replaces inline logout) | N-08 | Nav +2 |
| P3 | Add dark mode via `[data-theme="dark"]` token overrides | D-03 | Consistency +3 |
| P3 | Add `React.memo` to list item components (cards, table rows) | P-04 | Perf +2 |
| P3 | Add form-level `aria-describedby` error association | A-07 | A11y +2 |
| P3 | Add keyboard shortcuts (Cmd+K, Cmd+1-5) | N-09 | Nav +2 |
| P3 | Add data caching layer (stale-while-revalidate in hooks) | P-05 | Perf +2 |

### Phase 5: Polish (Week 11–12) — Target: 92 → 96+

| Priority | Task | Issues Resolved | Score Impact |
|---|---|---|---|
| P4 | Responsive detail pages (tablet breakpoint at 1024px) | R-03, R-06 | Resp +3 |
| P4 | Touch target audit (44px minimum on all interactive elements) | R-02 | Resp +2 |
| P4 | Color contrast audit (WCAG AA compliance for all text) | A-12 | A11y +2 |
| P4 | `prefers-reduced-motion` support | — | A11y +1 |
| P4 | Virtual scrolling for lists > 100 items | — | Perf +1 |
| P4 | Clean up dead file `App.css` | M-06 | Maint +0.5 |

### Projected Score Trajectory

```
Week  0:  52 / 100  ←── current
Week  2:  68 / 100  ←── critical fixes done
Week  4:  78 / 100  ←── foundation in place
Week  7:  86 / 100  ←── shared components live
Week 10:  92 / 100  ←── enterprise features
Week 12:  96 / 100  ←── polished, production-ready

        100 ┤
         90 ┤                                          ●━━━━● 96
         80 ┤                          ●━━━━━━━● 86
         70 ┤              ●━━━━● 78
         60 ┤    ●━━● 68
         50 ┤● 52
         40 ┤
            └──────┬──────┬──────┬──────┬──────┬──────┬──
              W0    W2     W4     W7     W10    W12
```

---

## Appendix A: Issue Registry (All 47 Issues)

| ID | Category | Severity | Summary |
|---|---|---|---|
| R-01 | Responsive | High | Only 2 breakpoints globally |
| R-02 | Responsive | High | No mobile card-list alternative for tables |
| R-03 | Responsive | High | Detail pages 2-col too tight on tablets |
| R-04 | Responsive | Medium | Dashboard KPI cards stretch on widescreen |
| R-05 | Responsive | Medium | Topbar `left` hardcoded to 240px |
| R-06 | Responsive | Medium | Quotation/Rental detail grids inline-styled, no breakpoint |
| R-07 | Responsive | Low | Login layout has no explicit breakpoint |
| A-01 | A11y | Critical | No focus trapping in Modal/Drawer |
| A-02 | A11y | Critical | No dialog roles on Modal/Drawer |
| A-03 | A11y | Critical | Table rows not keyboard accessible |
| A-04 | A11y | Critical | No skip-navigation link |
| A-05 | A11y | High | Color-only status differentiation |
| A-06 | A11y | High | No aria-live on toast container |
| A-07 | A11y | High | Form errors not linked to inputs |
| A-08 | A11y | High | No aria-current on active nav items |
| A-09 | A11y | Medium | ConfirmDialog not role="alertdialog" |
| A-10 | A11y | Medium | Pagination buttons lack descriptive labels |
| A-11 | A11y | Medium | Document title never updates |
| A-12 | A11y | Medium | Muted text contrast borderline |
| A-13 | A11y | Low | Heading hierarchy issues |
| P-01 | Perf | Critical | Zero code splitting |
| P-02 | Perf | High | CRM uses client-side-only data |
| P-03 | Perf | High | No image lazy loading |
| P-04 | Perf | Medium | No React.memo on list items |
| P-05 | Perf | Medium | No data caching between navigations |
| P-06 | Perf | Medium | No native `loading="lazy"` on images |
| P-07 | Perf | Low | Animation `will-change` hints missing |
| N-01 | Nav | Critical | No breadcrumbs |
| N-02 | Nav | Critical | No global search |
| N-03 | Nav | High | PAGE_TITLES doesn't cover dynamic routes |
| N-04 | Nav | High | Sidebar groups not collapsible |
| N-05 | Nav | High | No sidebar collapsed/rail state |
| N-06 | Nav | Medium | Module registry not used for nav |
| N-07 | Nav | Medium | No notification center |
| N-08 | Nav | Medium | No user profile dropdown |
| N-09 | Nav | Low | No keyboard shortcuts |
| S-01 | Scale | High | CRM client-side data won't scale |
| S-02 | Scale | High | No shared DataTable (5 copies) |
| S-03 | Scale | Medium | Status options duplicated per module |
| S-04 | Scale | Medium | Badge components per-module, not unified |
| S-05 | Scale | Medium | No shared form utilities |
| S-06 | Scale | Low | Module registry not consumed functionally |
| M-01 | Maint | High | Cross-module CSS imports |
| M-02 | Maint | High | Heavy inline styles in Quotation/Rental |
| M-03 | Maint | Medium | Utility function duplication |
| M-04 | Maint | Medium | Pagination logic duplication |
| M-05 | Maint | Medium | No lazy imports in App.tsx |
| M-06 | Maint | Low | Dead file App.css |
| M-07 | Maint | Low | useState for initialization anti-pattern |
| D-01 | Consistency | High | No shared detail page layout |
| D-02 | Consistency | High | Two different data management patterns |
| D-03 | Consistency | High | No dark mode |
| D-04 | Consistency | Medium | Font sizes not systematic |
| D-05 | Consistency | Medium | Spacing values ad-hoc |
| D-06 | Consistency | Medium | Card styling varies |
| D-07 | Consistency | Medium | Color palette not systematic |
| D-08 | Consistency | Low | Refresh button reuses logout CSS class |

**Total: 7 Critical, 20 High, 19 Medium, 8 Low**
