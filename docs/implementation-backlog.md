# Implementation Backlog — DK Service Enterprise Platform

> Ordered by priority. Each item is a discrete, shippable unit. Phases from `docs/refactor-plan.md`.
> **Rule:** No production code until approved by project owner.

---

## Priority Legend

| Tag | Meaning | SLA |
|-----|---------|-----|
| P0 | Blocking — must fix before any feature work | Immediate |
| P1 | Critical — production risk or user-facing gap | This sprint |
| P2 | Important — functional improvement | Next sprint |
| P3 | Enhancement — polish and optimization | Backlog |

---

## Backlog Items

### P0 — Blocking (do first)

| # | Item | Phase | Effort | Dependencies | Deliverable |
|---|------|-------|--------|-------------|-------------|
| 001 | Extract `ProductDetailPage.css` to shared `detail-layout.css` | C1 | 0.5d | None | 6 files updated, 0 cross-module CSS imports |
| 002 | Extract duplicated `CustomerBrief`/`UserBrief`/`ForkliftBrief` to `types/common.ts` | C2 | 0.5d | None | 4 type files updated |
| 003 | Replace `alert()` with `toast` in DepositDetailPage + RevenueRecognitionPage | C3 | 15min | None | 3 `alert()` calls removed |

### P1 — Critical

| # | Item | Phase | Effort | Dependencies | Deliverable |
|---|------|-------|--------|-------------|-------------|
| 004 | **Build Work Order creation form** | Ph6 | 2d | None | `WorkOrderFormPage.tsx`, App.tsx route updated, placeholder removed |
| 005 | **Build Spare Part creation form** | Ph7 | 1d | None | `SparePartFormPage.tsx`, App.tsx route updated, placeholder removed |
| 006 | **Build Settings page** (password change, profile edit) | C5 | 2d | None | `SettingsPage.tsx`, App.tsx route updated |
| 007 | **Build permission-aware sidebar** (`<Can>` component) | C4 | 3d | None | `Can.tsx`, Sidebar.tsx updated, action buttons wrapped |
| 008 | Fix `ProductForm.tsx` — `description_en` not loaded in edit mode | Ph1 | 0.5d | None | Edit mode shows description |
| 009 | Fix `useState` misuse in `BrandsPage` + `CategoriesPage` modals | Ph1 | 1h | None | Modal reopens with fresh data |
| 010 | Fix `ForkliftForm.tsx` edit mode — loses purchase_date, warranty, notes | Ph2 | 1d | None | All fields preserved in edit |
| 011 | Add create buttons to Invoice/Payment/Deposit list pages | Ph8 | 3d | None | Modal forms for create operations |

### P2 — Important

| # | Item | Phase | Effort | Dependencies | Deliverable |
|---|------|-------|--------|-------------|-------------|
| 012 | Build product spec/image/compat management UI | Ph1 | 3d | #008 | 3 new tabs on ProductDetailPage |
| 013 | Add brand pagination (backend + frontend) | Ph1 | 1d | None | Paginated response, pagination controls |
| 014 | Build forklift spec management form | Ph2 | 2d | None | Spec tab with add/edit/delete |
| 015 | Build 6 forklift sub-entity tabs (photos, docs, locations, hours, costs, status) | Ph2 | 5d | #014 | 18 new API functions, 6 tabs |
| 016 | Fix QuotationFormPage — add customer picker, lead, assignee, dates | Ph3 | 2d | None | Complete form with selectors |
| 017 | Build reusable `SearchSelect` component | Ph3 | 1.5d | None | Async search select, used in Ph3-7 |
| 018 | Build quotation edit page | Ph3 | 1d | #016, #017 | `/quotations/:id/edit` route |
| 019 | Fix RentalContractFormPage — add billing, penalty, assignee fields | Ph4 | 1.5d | #017 | Complete form |
| 020 | Build rental contract edit page | Ph4 | 1d | #019 | `/rental-contracts/:id/edit` route |
| 021 | Wire billing cycle generation (replace stub toast) | Ph4 | 0.5d | None | Button calls API, shows cycles |
| 022 | Build rental return flow UI | Ph4 | 3d | #020 | Returns tab with lifecycle buttons |
| 023 | Fix MovementForm — add contract, driver, address fields | Ph5 | 1d | #017 | Complete form |
| 024 | Build movement checkpoint UI | Ph5 | 1d | None | "Add Checkpoint" button + form |
| 025 | Build work order edit capability | Ph6 | 1d | #004 | Edit button + form for scheduled orders |
| 026 | Build spare part edit capability | Ph7 | 0.5d | #005 | Edit button on detail page |
| 027 | Replace raw modal div in DepositDetailPage | Ph8 | 0.5d | None | Use shared `<Modal>` component |
| 028 | Wire `updateInvoice` for draft invoice editing | Ph8 | 1d | None | Edit button on draft invoices |

### P3 — Enhancement

| # | Item | Phase | Effort | Dependencies | Deliverable |
|---|------|-------|--------|-------------|-------------|
| 029 | Remove dead backend code (brand_service, product_service) | Ph1 | 15min | None | Clean code |
| 030 | Remove hardcoded forklift thresholds (5000/4000/4500) | Ph2 | 0.5d | None | Read from schedule data |
| 031 | Fix forklift contracts tab (show forklift-specific contracts) | Ph2 | 0.5d | None | Filtered contract list |
| 032 | Add date range filter to QuotationListPage | Ph3 | 0.5d | None | Date picker in filter bar |
| 033 | Fix rate divisor (`monthly_rate / 30` → calendar-based) | Ph4 | 0.5d | None | More accurate calculations |
| 034 | Fix movement grid pagination | Ph5 | 0.5d | None | Page controls in grid view |
| 035 | Add date range filter to MovementListPage | Ph5 | 0.5d | None | Date picker in filter bar |
| 036 | Fix month approximation (`days = months * 30` → calendar) | Ph6 | 0.5d | None | Accurate schedule recurrence |
| 037 | Add "Create PO" button to PurchaseOrderPage | Ph7 | 1d | None | Modal or form for PO creation |

### P3 — New Features (Phases 9-10)

| # | Item | Phase | Effort | Dependencies | Deliverable |
|---|------|-------|--------|-------------|-------------|
| 038 | Build `ProfitabilityService` (backend) | Ph9 | 3d | None | Service with 4 aggregation methods |
| 039 | Build profitability API endpoints (4 routes) | Ph9 | 1d | #038 | `/api/v1/profitability/*` |
| 040 | Build profitability frontend (types, API client) | Ph9 | 0.5d | #039 | `types/profitability.ts`, `api/profitability.ts` |
| 041 | Build `ProfitabilityDashboardPage` | Ph9 | 3d | #040 | KPI cards, fleet table, charts |
| 042 | Build `AssetProfitabilityPage` | Ph9 | 2d | #040 | Per-asset P&L detail |
| 043 | Build unified Executive API endpoint | Ph10 | 3d | None | `/api/v1/executive/summary` |
| 044 | Add date range selector to ExecutiveDashboardPage | Ph10 | 1d | #043 | Date picker, filtered data |
| 045 | Add KPI target vs actual cards | Ph10 | 1.5d | #043 | Progress bars, red/green indicators |
| 046 | Add chart drill-down navigation | Ph10 | 1d | #044 | Click chart → filtered list page |
| 047 | Add profitability widgets to executive dashboard | Ph10 | 1d | #041 | Margin KPI, top assets table |

### Infrastructure

| # | Item | Phase | Effort | Dependencies | Deliverable |
|---|------|-------|--------|-------------|-------------|
| 048 | Set up pytest with test fixtures (conftest, factories) | Test | 2d | None | `backend/tests/conftest.py` |
| 049 | Write auth + RBAC tests (18 tests) | Test | 2d | #048 | All 4 roles tested |
| 050 | Write CRUD tests (customers, leads, catalog — 19 tests) | Test | 2d | #048 | All CRUD operations verified |
| 051 | Write workflow tests (quotation, rental, billing — 26 tests) | Test | 3d | #050 | State machine paths tested |
| 052 | Set up vitest + RTL for frontend | Test | 1d | None | `vitest.config.ts`, setup file |
| 053 | Write store tests (8 tests) | Test | 1d | #052 | All 4 stores tested |
| 054 | Write component tests (10 tests) | Test | 2d | #052 | Sidebar, Modal, Toast tested |
| 055 | Set up Playwright E2E (5 critical journeys) | Test | 3d | #048, #052 | Login, quotation, rental, billing flows |
| 056 | Apply Alembic migration 001 (performance indexes) | DB | 0.5d | None | 9 new indexes on PostgreSQL |
| 057 | Apply Alembic migration 002 (kpi_targets table) | DB | 0.5d | #056 | New table for Phase 10 |
| 058 | Set up GitHub Actions CI pipeline | DevOps | 1d | #048 | Lint + test + build on push/PR |
| 059 | Register SecurityHeaders + RequestID middleware | DevOps | 15min | None | Production hardening |

---

## Sprint Plan

### Sprint 1 — Foundation (Week 1)

| # | Item | Effort |
|---|------|--------|
| 001 | CSS extraction | 0.5d |
| 002 | Shared types | 0.5d |
| 003 | alert→toast | 15min |
| 008 | Fix ProductForm edit | 0.5d |
| 009 | Fix modal useState | 1h |
| 029 | Remove dead code | 15min |
| 048 | Set up pytest | 2d |

**Sprint total: 4 days**

### Sprint 2 — Critical Placeholders (Week 2)

| # | Item | Effort |
|---|------|--------|
| 004 | Work Order form | 2d |
| 005 | Spare Part form | 1d |
| 006 | Settings page | 2d |

**Sprint total: 5 days**

### Sprint 3 — Permission + Equipment (Week 3)

| # | Item | Effort |
|---|------|--------|
| 007 | Permission-aware sidebar | 3d |
| 010 | Fix ForkliftForm edit | 1d |
| 014 | Forklift spec form | 2d |

**Sprint total: 6 days** (tight — may overflow)

### Sprint 4 — Sales Pipeline (Week 4)

| # | Item | Effort |
|---|------|--------|
| 017 | SearchSelect component | 1.5d |
| 016 | Quotation form fields | 2d |
| 019 | Rental form fields | 1.5d |

**Sprint total: 5 days**

### Sprint 5 — Workflows (Week 5)

| # | Item | Effort |
|---|------|--------|
| 021 | Wire billing generation | 0.5d |
| 022 | Return flow UI | 3d |
| 011 | Billing create buttons | 3d |

**Sprint total: 6.5 days** (tight)

### Sprint 6-7 — Analytics (Weeks 6-7)

| # | Item | Effort |
|---|------|--------|
| 038-042 | Profitability (full stack) | 9.5d |

### Sprint 8 — Executive BI (Week 8)

| # | Item | Effort |
|---|------|--------|
| 043-047 | Executive BI enhancements | 7.5d |

---

## Acceptance Criteria Template

Each backlog item must meet before merge:

```
[ ] TypeScript builds clean: npm run build → 0 errors
[ ] Backend starts: uvicorn app.main:app → no errors
[ ] Feature works: golden path tested manually
[ ] No regressions: existing pages still function
[ ] Code review: approved by 1 reviewer
[ ] No new cross-module CSS imports
[ ] No new alert() calls (use toast)
[ ] No new hardcoded values (status thresholds, currency, rates)
```

---

## Summary

| Category | Items | Total Effort |
|----------|-------|-------------|
| P0 Blocking | 3 | 1 day |
| P1 Critical | 8 | 13.5 days |
| P2 Important | 17 | 27.5 days |
| P3 Enhancement | 9 | 4.5 days |
| P3 New Features (Ph9-10) | 10 | 17 days |
| Infrastructure (tests + CI) | 12 | 18 days |
| **Total** | **59 items** | **~81.5 days (16 weeks, 1 developer)** |
