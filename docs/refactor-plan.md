# DK Service Enterprise Platform — Refactor Plan

**Baseline:** 218 endpoints, 56 tables, 48 pages, 0 tests, 491 inline styles, 5 cross-module CSS imports
**Date:** 2026-06-28
**Constraint:** All API URLs stay unchanged. No database schema changes unless explicitly noted.

---

## Cross-Cutting Work (applies to every phase)

These items are prerequisites or should be completed in parallel with each phase.

### C1. Extract `ProductDetailPage.css` to shared location

5 pages import `@/pages/Catalog/ProductDetailPage.css` across module boundaries:
- `QuotationDetailPage.tsx:18`
- `RentalContractDetailPage.tsx:19`
- `MovementDetailPage.tsx:16`
- `WorkOrderDetailPage.tsx:9`
- `SparePartDetailPage.tsx:7`

**Action:** Extract the reusable classes from `ProductDetailPage.css` into `@/styles/detail-layout.css`. Update all 6 imports (including `ProductDetailPage.tsx` itself). Delete any now-empty CSS from the original file.

**Effort:** 0.5 day | **Risk:** LOW | **Verify:** `grep -r "ProductDetailPage.css" src/` returns zero

### C2. Extract duplicated TypeScript interfaces

`CustomerBrief`, `UserBrief`, `ForkliftBrief` are defined identically in:
- `types/quotation.ts`
- `types/rental.ts`
- `types/movement.ts`
- `types/billing.ts`

**Action:** Create `types/common.ts` with shared brief interfaces. Update all importers.

**Effort:** 0.5 day | **Risk:** LOW

### C3. Replace `alert()` with toast

Two billing pages use raw `alert()` instead of the `toast` store:
- `DepositDetailPage.tsx` lines 46, 60
- `RevenueRecognitionPage.tsx` line 58

**Action:** Replace `alert(msg)` with `toast.error(msg)` or `toast.success(msg)`.

**Effort:** 15 min | **Risk:** NONE

### C4. Permission-aware sidebar

All sidebar items are visible to all roles. Support users see Admin-only menu items.

**Action:** Create `<Can permission="...">` wrapper component. Wrap sidebar items and action buttons with appropriate permission checks. Read `ROLE_PERMISSIONS` map from `permissions.py` to determine which items each role can see.

**Effort:** 3 days | **Risk:** MEDIUM (must not lock out legitimate users)

### C5. Settings page

Route `/settings` is a `<Placeholder name="Settings" />`.

**Action:** Build real Settings page with: password change form, profile edit (full_name, email), notification preferences stub.

**Effort:** 2 days | **Risk:** LOW

---

## Phase 1 — Product Catalog Hardening

**Current score:** 95% | **Target score:** 100%
**Backend:** 30 endpoints, 6 models — COMPLETE
**Frontend:** 5 pages — functional but gaps in forms and dead code

### 1.1 Fix product edit form

`ProductForm.tsx` does not load `description_en` when editing — hardcoded to `''` on line 53.

| File | Change |
|------|--------|
| `pages/Catalog/ProductForm.tsx` | Populate `description_en` from fetched product data in edit mode |
| `pages/Catalog/ProductForm.tsx` | Add missing fields: `description_lo`, status |

**Effort:** 0.5 day

### 1.2 Fix useState misuse in brand/category modals

`BrandsPage.tsx` and `CategoriesPage.tsx` use `useState()` as an initializer side-effect (lines 30–35) instead of `useEffect`. This causes stale form state when reopening the edit modal.

| File | Change |
|------|--------|
| `pages/Catalog/BrandsPage.tsx` | Replace `useState(editItem.name)` pattern with `useEffect` sync |
| `pages/Catalog/CategoriesPage.tsx` | Same fix |

**Effort:** 1 hour

### 1.3 Build product spec/image/compat management UI

9 API functions in `api/catalog.ts` are defined but never called from any component:
- `addProductSpec`, `deleteProductSpec`
- `addProductImage`, `updateProductImage`, `deleteProductImage`
- `addCompatBrand`, `removeCompatBrand`
- `getImportJobs`, `getImportJob`

| File | Change |
|------|--------|
| `pages/Catalog/ProductDetailPage.tsx` | Add "Specs" tab with add/delete spec rows |
| `pages/Catalog/ProductDetailPage.tsx` | Add "Images" tab with add/reorder/delete |
| `pages/Catalog/ProductDetailPage.tsx` | Add "Compatibility" tab with brand picker |

**Effort:** 3 days

### 1.4 Add pagination to brands endpoint

`GET /catalog/brands/` uses raw `skip/limit` with no total count. Frontend loads all brands with `limit=100`.

| File | Change |
|------|--------|
| `routes/brands.py` | Add `page`/`page_size` params, return `{items, total, page, pages}` |
| `repositories/brand_repository.py` | Add count query |
| `schemas/brand.py` | Add `BrandListResponse` schema |
| `pages/Catalog/BrandsPage.tsx` | Add pagination controls |

**Effort:** 1 day

### 1.5 Remove dead backend code

| File | Dead code | Action |
|------|-----------|--------|
| `services/brand_service.py:52` | `existing_slugs: set[str] = set()` — declared, never used | Delete |
| `repositories/brand_repository.py` | `count()` — defined, never called | Delete (or wire to 1.4) |
| `services/product_service.py:299` | `import time` inside method body | Move to top-level |

**Effort:** 15 min

### 1.6 Add backend routes for slug lookups or remove dead methods

`ProductService.get_product_by_slug()` and `BrandService.get_brand_by_slug()` exist but have no route.

**Decision:** Wire them to `GET /catalog/products/by-slug/{slug}` and `GET /catalog/brands/by-slug/{slug}`, or delete the methods.

**Effort:** 0.5 day

### Phase 1 verification

```
- [ ] Product edit loads description_en
- [ ] Brand/category modal reopens with fresh data
- [ ] ProductDetailPage shows specs/images/compat tabs
- [ ] Brands page has pagination
- [ ] No dead code warnings
- [ ] TypeScript builds clean: npm run build
- [ ] Backend starts: uvicorn app.main:app
```

---

## Phase 2 — Equipment Registry

**Current score:** 95% | **Target score:** 100%
**Backend:** 21 endpoints, 9 models — COMPLETE
**Frontend:** 3 pages — core works, but 8 sub-entity endpoints have no UI

### 2.1 Build spec management form

`forklift_specs` table has full CRUD backend, `ForkliftSpec` type exists in `types/forklift.ts`, but no form exists. Detail page only shows `mast_type` and `max_lift_height_mm`, ignoring `front_tire`, `rear_tire`, `tire_type`, `fork_length_mm`, `battery_type`, `attachment_type`.

| File | Change |
|------|--------|
| `pages/Equipment/ForkliftDetailPage.tsx` | Build spec tab: display all 10 fields, add/edit/delete forms |
| `api/forklift.ts` | Add `listSpecs`, `createSpec`, `updateSpec`, `deleteSpec` functions |

**Effort:** 2 days

### 2.2 Build sub-entity management tabs

Backend endpoints for photos, documents, locations, hour meter logs, costs, and status history exist but have zero frontend API callers or UI.

| Tab | Backend endpoints | Frontend work |
|-----|------------------|---------------|
| Photos | `GET/POST /{id}/photos`, `DELETE /{id}/photos/{pid}` | Gallery with upload (reuse `ImageUpload` component), set primary, delete |
| Documents | `GET/POST /{id}/documents`, `DELETE /{id}/documents/{did}` | File list with type badge, upload form, expiry date display |
| Locations | `GET/POST /{id}/locations` | Location history list, add new location form (address, lat/lng) |
| Hour Meter | `GET/POST /{id}/hour-meter-logs` | Reading history table, add reading form |
| Costs | `GET/POST /{id}/costs`, `GET /{id}/costs/summary` | Cost table with summary card, add cost form |
| Status History | `GET /{id}/status-history` | Timeline view (read-only) |

| File | Change |
|------|--------|
| `api/forklift.ts` | Add API functions for all 6 sub-entities (~18 new functions) |
| `pages/Equipment/ForkliftDetailPage.tsx` | Build 6 tabs with forms |

**Effort:** 5 days

### 2.3 Fix ForkliftForm edit mode

Form loses `purchase_date`, `warranty_expiry`, `initial_hour_meter`, and `notes` in edit mode. Also missing `model_id` and `customer_id` selectors.

| File | Change |
|------|--------|
| `pages/Equipment/ForkliftForm.tsx` | Prefill all fields from fetched data |
| `pages/Equipment/ForkliftForm.tsx` | Add model dropdown (fetch forklift_models) |
| `pages/Equipment/ForkliftForm.tsx` | Add customer search/select for `customer_id` |

**Effort:** 1 day

### 2.4 Remove hardcoded service thresholds

| File | Line | Hardcoded value | Action |
|------|------|----------------|--------|
| `ForkliftDetailPage.tsx` | 90 | `threshold = 5000` (service interval) | Read from maintenance schedule `next_due_hours` |
| `EquipmentRegistryPage.tsx` | 70–71 | `pmDue >= 4000`, `criticalPm >= 4500` | Calculate from schedule data, not magic numbers |
| `forklift_cost_service.py` | 52 | `currency: "LAK"` | Use forklift's or config currency |

**Effort:** 0.5 day

### 2.5 Fix contracts tab stub

`ForkliftDetailPage.tsx` contracts tab only shows a link to `/rental-contracts` with no forklift-specific contract data.

| File | Change |
|------|--------|
| `pages/Equipment/ForkliftDetailPage.tsx` | Fetch contracts filtered by `forklift_id`, display list with status badges |

**Effort:** 0.5 day

### Phase 2 verification

```
- [ ] Spec form shows all 10 fields, saves to API
- [ ] Photos tab uploads and displays images
- [ ] Documents tab shows file list with type/expiry
- [ ] Hour meter tab shows reading history
- [ ] Costs tab shows cost table + summary
- [ ] ForkliftForm edit mode preserves all fields
- [ ] No hardcoded thresholds remain
- [ ] Contracts tab shows forklift-specific contracts
```

---

## Phase 3 — Quotation

**Current score:** 95% | **Target score:** 100%
**Backend:** 20 endpoints, 4 models — COMPLETE
**Frontend:** 3 pages — missing form fields and edit capability

### 3.1 Fix QuotationFormPage missing fields

Backend `QuotationCreate` schema accepts fields not exposed in the form.

| Missing field | Action |
|--------------|--------|
| `customer_id` | Add searchable customer picker (currently no customer selector — critical gap) |
| `lead_id` | Add lead dropdown filtered by customer |
| `assigned_to` | Add user/staff dropdown |
| `contact_name`, `contact_email`, `contact_phone` | Add contact info section |
| `valid_from`, `valid_until` | Add validity date range picker |

| File | Change |
|------|--------|
| `pages/Quotations/QuotationFormPage.tsx` | Add 7 missing fields with proper selectors |
| `api/quotation.ts` | Add `getCustomers()`, `getUsers()` list calls (or import from existing API modules) |

**Effort:** 2 days

### 3.2 Build quotation edit page

`PUT /quotations/{id}` and `PUT /quotations/{id}/items/{item_id}` exist in backend and `api/quotation.ts`, but no edit UI calls them.

| File | Change |
|------|--------|
| `pages/Quotations/QuotationFormPage.tsx` | Accept `/:id` route param for edit mode, prefill all fields |
| `App.tsx` | Add route: `/quotations/:id/edit` → `QuotationFormPage` |

**Effort:** 1 day

### 3.3 Add date range filters

Backend supports `created_from`/`created_to` filter params, frontend doesn't expose them.

| File | Change |
|------|--------|
| `pages/Quotations/QuotationListPage.tsx` | Add date picker filter row |

**Effort:** 0.5 day

### 3.4 Replace raw ID inputs with searchable pickers

Form currently uses raw numeric input fields for `customer_id` and `forklift_id`. Replace with searchable select/typeahead components.

| File | Change |
|------|--------|
| `pages/Quotations/QuotationFormPage.tsx` | Replace `<input type="number">` with `<SearchSelect>` for customer and forklift |
| `components/ui/SearchSelect.tsx` | Create reusable async search select (used in phases 3–5) |

**Effort:** 1.5 days (includes reusable component)

### 3.5 Remove cross-module CSS import

| File | Change |
|------|--------|
| `pages/Quotations/QuotationDetailPage.tsx:18` | Replace `import '@/pages/Catalog/ProductDetailPage.css'` with `import '@/styles/detail-layout.css'` |

**Effort:** Done as part of C1

### Phase 3 verification

```
- [ ] Form has customer picker, lead picker, assignee picker
- [ ] Edit mode loads existing quotation data
- [ ] Date range filter works on list page
- [ ] No raw numeric ID inputs remain
- [ ] Cross-module CSS import removed
```

---

## Phase 4 — Rental Contract

**Current score:** 95% | **Target score:** 100%
**Backend:** 34 endpoints, 8 models — COMPLETE
**Frontend:** 3 pages — missing edit, return flow UI, billing generation, and form fields

### 4.1 Fix RentalContractFormPage missing fields

| Missing field | Action |
|--------------|--------|
| `lead_id` | Add lead dropdown |
| `assigned_to` | Add staff dropdown |
| `billing_cycle_day` | Add day-of-month picker (1–28) |
| `payment_terms_days` | Add input (default 30) |
| `early_termination_fee_pct` | Add percentage input |
| `late_return_penalty_pct` | Add percentage input |
| `overtime_rate_pct` | Add percentage input (default 150) |

| File | Change |
|------|--------|
| `pages/Rental/RentalContractFormPage.tsx` | Add 7 missing fields |
| `pages/Rental/RentalContractFormPage.tsx` | Replace raw `customer_id`/`forklift_id` inputs with `<SearchSelect>` (from Phase 3) |

**Effort:** 1.5 days

### 4.2 Build contract edit page

`PUT /rental-contracts/{id}` exists, `api/rental.ts` has `updateContract`, but no edit UI exists.

| File | Change |
|------|--------|
| `pages/Rental/RentalContractFormPage.tsx` | Accept `/:id` param for edit mode |
| `App.tsx` | Add route: `/rental-contracts/:id/edit` → `RentalContractFormPage` |

**Effort:** 1 day

### 4.3 Wire billing cycle generation

`RentalContractDetailPage.tsx:188` shows toast: `"Billing generation -- coming in Phase 4."` Backend endpoint `POST /{contract_id}/billing-cycles` is functional.

| File | Change |
|------|--------|
| `pages/Rental/RentalContractDetailPage.tsx` | Replace stub toast with actual API call to `createBillingCycle()` |
| `pages/Rental/RentalContractDetailPage.tsx` | Show generated billing cycles in the billing tab |

**Effort:** 0.5 day

### 4.4 Build return flow UI

Backend has full return lifecycle (request/pickup/receive/complete) and damage report CRUD — all API functions exist in `api/rental.ts` but no frontend UI calls them.

| File | Change |
|------|--------|
| `pages/Rental/RentalContractDetailPage.tsx` | Build "Returns" tab with: create return form, pickup/receive/complete action buttons, damage report sub-section |

**Effort:** 3 days

### 4.5 Remove hardcoded business rules

| File | Hardcoded | Action |
|------|-----------|--------|
| `rental_contract_service.py:579` | `monthly_rate / 30` for daily rate | Use `monthly_rate / days_in_month` or configurable divisor |
| `rental_contract_service.py:299,337,570` | `duration_days / 30` for month count | Same fix |
| `schemas/rental.py:71` | `overtime_rate_pct = 150.0` default | Document as business default (acceptable as schema default) |

**Effort:** 0.5 day

### 4.6 Remove cross-module CSS import

| File | Change |
|------|--------|
| `pages/Rental/RentalContractDetailPage.tsx:19` | Replace with `import '@/styles/detail-layout.css'` |

**Effort:** Done as part of C1

### Phase 4 verification

```
- [ ] Form has billing cycle day, payment terms, penalty percentages
- [ ] Edit mode loads existing contract
- [ ] "Generate Billing" button calls API and displays cycles
- [ ] Returns tab: create, pickup, receive, complete flow works
- [ ] Damage reports can be created and viewed
- [ ] No hardcoded rate divisors
```

---

## Phase 5 — Movement

**Current score:** 90% | **Target score:** 100%
**Backend:** 10 endpoints, 2 models — COMPLETE
**Frontend:** 3 pages — missing form fields, edit, and checkpoint UI

### 5.1 Fix MovementForm missing fields

| Missing field | Action |
|--------------|--------|
| `rental_contract_id` | Add contract selector |
| `assigned_driver_id` | Add driver/user selector |
| `from_address`, `to_address` | Add address text areas |
| `tracking_code` | Add tracking code input |

| File | Change |
|------|--------|
| `pages/Movement/MovementForm.tsx` | Add 5 missing fields, replace raw ID inputs with `<SearchSelect>` |

**Effort:** 1 day

### 5.2 Build movement edit page

`PUT /movements/{id}` exists, `api/movement.ts` has `updateMovement()`, but no edit UI.

| File | Change |
|------|--------|
| `pages/Movement/MovementForm.tsx` | Accept `/:id` param for edit mode |
| `App.tsx` | Add route: `/movements/:id/edit` → `MovementForm` |

**Effort:** 0.5 day

### 5.3 Build checkpoint UI

`POST /movements/{id}/checkpoint` exists, `addCheckpoint()` API function exists, but no UI to add checkpoints.

| File | Change |
|------|--------|
| `pages/Movement/MovementDetailPage.tsx` | Add "Add Checkpoint" button + form (location, notes, timestamp) |
| `pages/Movement/MovementDetailPage.tsx` | Display checkpoints in timeline view |

**Effort:** 1 day

### 5.4 Fix pagination in grid view

Movement list in grid mode renders all items but the data is paginated server-side, so only `page_size` items appear with no page navigation.

| File | Change |
|------|--------|
| `pages/Movement/MovementListPage.tsx` | Show pagination controls in both list and grid views |

**Effort:** 0.5 day

### 5.5 Add date range filter

Backend supports `scheduled_from`/`scheduled_to`, frontend doesn't expose them.

| File | Change |
|------|--------|
| `pages/Movement/MovementListPage.tsx` | Add date range picker in filter bar |

**Effort:** 0.5 day

### 5.6 Remove cross-module CSS import

| File | Change |
|------|--------|
| `pages/Movement/MovementDetailPage.tsx:16` | Replace with `import '@/styles/detail-layout.css'` |

**Effort:** Done as part of C1

### Phase 5 verification

```
- [ ] Form has contract selector, driver selector, address fields
- [ ] Edit mode works for draft movements
- [ ] "Add Checkpoint" button appears on in-transit movements
- [ ] Grid view has pagination
- [ ] Date range filter narrows results
```

---

## Phase 6 — Maintenance

**Current score:** 85% | **Target score:** 100%
**Backend:** 17 endpoints, 6 models — COMPLETE
**Frontend:** 4 pages + 1 PLACEHOLDER — work order form missing

### 6.1 Build Work Order creation form (critical)

Route `/maintenance/work-orders/new` renders `<Placeholder name="New Work Order" />`. Backend `POST /maintenance/work-orders` is fully functional.

| File | Action |
|------|--------|
| `pages/Maintenance/WorkOrderFormPage.tsx` | **CREATE NEW FILE** — form with: forklift selector, order type (preventive/corrective/emergency/inspection), priority, title, description, scheduled date, assigned technician, estimated hours/cost, hour meter at service |
| `App.tsx:118` | Replace `<Placeholder>` with lazy import of `WorkOrderFormPage` |

**Effort:** 2 days

### 6.2 Build work order edit capability

`PUT /maintenance/work-orders/{id}` and `updateWorkOrder` API function exist, no edit UI.

| File | Change |
|------|--------|
| `pages/Maintenance/WorkOrderFormPage.tsx` | Accept `/:id` param for edit mode |
| `App.tsx` | Add route: `/maintenance/work-orders/:id/edit` |
| `pages/Maintenance/WorkOrderDetailPage.tsx` | Add "Edit" button for scheduled/due work orders |

**Effort:** 1 day

### 6.3 Fix hardcoded month approximation

`maintenance_service.py:37` uses `days = months * 30` for schedule recurrence. This drifts over time.

| File | Change |
|------|--------|
| `services/maintenance_service.py` | Use `dateutil.relativedelta` or calendar-based month addition |

**Effort:** 0.5 day

### 6.4 Remove cross-module CSS import

| File | Change |
|------|--------|
| `pages/Maintenance/WorkOrderDetailPage.tsx:9` | Replace with `import '@/styles/detail-layout.css'` |

**Effort:** Done as part of C1

### Phase 6 verification

```
- [ ] /maintenance/work-orders/new renders a real form
- [ ] Form creates work orders via POST API
- [ ] Edit mode loads and saves work order data
- [ ] Month calculation uses calendar months
- [ ] Cross-module CSS removed
```

---

## Phase 7 — Inventory (Spare Parts)

**Current score:** 85% | **Target score:** 100%
**Backend:** 17 endpoints, 6 models — COMPLETE
**Frontend:** 5 pages + 1 PLACEHOLDER — spare part form missing

### 7.1 Build Spare Part creation form (critical)

Route `/inventory/parts/new` renders `<Placeholder name="New Spare Part" />`. Backend `POST /inventory/parts` is functional.

| File | Action |
|------|--------|
| `pages/Inventory/SparePartFormPage.tsx` | **CREATE NEW FILE** — form with: part number, name, description, category (11 categories), brand selector, unit, unit price, currency, min stock level, reorder quantity, lead time days, image URL |
| `App.tsx:124` | Replace `<Placeholder>` with lazy import of `SparePartFormPage` |

**Effort:** 1 day

### 7.2 Build spare part edit capability

`PUT /inventory/parts/{id}` and `updatePart` API function exist, but `SparePartDetailPage` has no "Edit" button.

| File | Change |
|------|--------|
| `pages/Inventory/SparePartFormPage.tsx` | Accept `/:id` param for edit mode |
| `App.tsx` | Add route: `/inventory/parts/:id/edit` |
| `pages/Inventory/SparePartDetailPage.tsx` | Add "Edit" action button |

**Effort:** 0.5 day

### 7.3 Add create buttons to list pages

| Page | Missing button | Backend endpoint |
|------|---------------|-----------------|
| `PurchaseOrderPage.tsx` | "Create PO" button | `POST /inventory/purchase-orders` |
| `SparePartListPage.tsx` | "Add Part" button navigation (may already exist — verify) | `POST /inventory/parts` |

| File | Change |
|------|--------|
| `pages/Inventory/PurchaseOrderPage.tsx` | Add "Create PO" button → inline modal or dedicated form |
| `pages/Inventory/SparePartListPage.tsx` | Verify "Add Part" navigates to form (not placeholder) |

**Effort:** 1 day

### 7.4 Remove cross-module CSS import

| File | Change |
|------|--------|
| `pages/Inventory/SparePartDetailPage.tsx:7` | Replace with `import '@/styles/detail-layout.css'` |

**Effort:** Done as part of C1

### Phase 7 verification

```
- [ ] /inventory/parts/new renders a real form
- [ ] Spare part creation saves via POST API
- [ ] Edit mode loads existing part data
- [ ] "Create PO" button works on purchase order page
- [ ] Cross-module CSS removed
```

---

## Phase 8 — Billing

**Current score:** 90% | **Target score:** 100%
**Backend:** 29 endpoints, 6 models — COMPLETE
**Frontend:** 12 pages — functional but missing create forms and uses alert()

### 8.1 Add create buttons to list pages

| Page | Missing action | API function |
|------|---------------|-------------|
| `InvoiceListPage.tsx` | "Create Invoice" button | `createInvoice()` exists |
| `PaymentListPage.tsx` | "Record Payment" button | `recordPayment()` exists |
| `DepositListPage.tsx` | "Create Deposit" button | `createDeposit()` exists |

| File | Change |
|------|--------|
| `pages/Billing/InvoiceListPage.tsx` | Add "Create Invoice" button → modal form (contract_id, customer_id, due_date, tax_rate, items) |
| `pages/Billing/PaymentListPage.tsx` | Add "Record Payment" button → modal form (customer_id, amount, method, date, reference) |
| `pages/Billing/DepositListPage.tsx` | Add "Create Deposit" button → modal form (contract_id, customer_id, type, amount) |

**Effort:** 3 days

### 8.2 Replace alert() with toast

| File | Line | Current | Fix |
|------|------|---------|-----|
| `DepositDetailPage.tsx` | 46, 60 | `alert(msg)` | `toast.error(msg)` |
| `RevenueRecognitionPage.tsx` | 58 | `alert(msg)` | `toast.error(msg)` |

**Effort:** 15 min

### 8.3 Replace raw modal div with shared Modal component

`DepositDetailPage.tsx` builds its own raw modal markup (lines 121–177) instead of using the shared `<Modal>` component.

| File | Change |
|------|--------|
| `pages/Billing/DepositDetailPage.tsx` | Replace raw `<div className="modal-overlay">` with `import Modal from '@/components/ui/Modal'` |

**Effort:** 0.5 day

### 8.4 Wire `updateInvoice` endpoint

`PUT /billing/invoices/{id}` exists, `updateInvoice()` in `api/billing.ts` exists, but `InvoiceDetailPage` has no "Edit" functionality.

| File | Change |
|------|--------|
| `pages/Billing/InvoiceDetailPage.tsx` | Add "Edit" button for draft invoices → inline edit or modal for notes, due_date, tax_rate |

**Effort:** 1 day

### Phase 8 verification

```
- [ ] "Create Invoice" button on invoice list works
- [ ] "Record Payment" button on payment list works
- [ ] "Create Deposit" button on deposit list works
- [ ] No alert() calls remain in billing pages
- [ ] DepositDetailPage uses shared Modal component
- [ ] Draft invoices can be edited
```

---

## Phase 9 — Profitability

**Current score:** 20% | **Target score:** 90%
**Backend:** Data models exist, NO analysis engine
**Frontend:** Per-asset cost tab exists, NO profitability pages

### 9.1 Build ProfitabilityService (backend)

| File | Action |
|------|--------|
| `services/profitability_service.py` | **CREATE NEW FILE** |

Methods:
```
get_asset_profitability(forklift_id) → {revenue, costs_by_type, margin, margin_pct}
list_fleet_profitability(params) → [{forklift, revenue, cost, margin}]
get_contract_profitability(contract_id) → {revenue, costs, margin}
get_company_summary(period) → {total_revenue, total_cost, margin, by_month[]}
```

Data sources:
- Revenue: `invoices` (amount_paid), `deposits` (forfeit_amount)
- Cost: `forklift_ownership_costs`, `maintenance_costs`, `part_consumptions`

**Effort:** 3 days

### 9.2 Build profitability API endpoints

| File | Action |
|------|--------|
| `routes/profitability.py` | **CREATE NEW FILE** |

Endpoints:
```
GET  /api/v1/profitability/fleet          → fleet-wide profitability list
GET  /api/v1/profitability/assets/{id}    → single asset P&L
GET  /api/v1/profitability/contracts/{id} → contract P&L
GET  /api/v1/profitability/summary        → company-wide summary
```

| File | Change |
|------|--------|
| `main.py` | Register profitability router |
| `core/permissions.py` | Add `PROFITABILITY_READ` permission (manager + super_admin only) |

**Effort:** 1 day

### 9.3 Build profitability frontend types and API

| File | Action |
|------|--------|
| `types/profitability.ts` | **CREATE NEW FILE** — `AssetProfitability`, `ContractProfitability`, `CompanySummary` |
| `api/profitability.ts` | **CREATE NEW FILE** — 4 API functions matching endpoints |

**Effort:** 0.5 day

### 9.4 Build ProfitabilityDashboardPage

| File | Action |
|------|--------|
| `pages/Profitability/ProfitabilityDashboardPage.tsx` | **CREATE NEW FILE** |

Layout:
- KPI cards: total revenue, total cost, gross margin, margin %
- Fleet profitability table: forklift × revenue × cost × margin (sortable)
- Margin trend chart (monthly area chart via Recharts)
- Cost breakdown pie chart (purchase / maintenance / parts / insurance / other)

**Effort:** 3 days

### 9.5 Build AssetProfitabilityPage

| File | Action |
|------|--------|
| `pages/Profitability/AssetProfitabilityPage.tsx` | **CREATE NEW FILE** |

Layout:
- Asset header (serial, model, status)
- Revenue breakdown: rental invoices, penalties, overtime
- Cost breakdown: purchase, maintenance labor, parts, insurance, inspection
- Monthly P&L bar chart
- Linked contracts with per-contract margin

**Effort:** 2 days

### 9.6 Register routes and navigation

| File | Change |
|------|--------|
| `App.tsx` | Add routes: `/profitability`, `/profitability/assets/:id`, `/profitability/contracts/:id` |
| `components/layout/Sidebar.tsx` | Add "Profitability" item under Finance group |
| `config/routes.ts` | Add breadcrumb entries |

**Effort:** 0.5 day

### Phase 9 verification

```
- [ ] GET /api/v1/profitability/fleet returns forklift margins
- [ ] GET /api/v1/profitability/assets/1 returns P&L for forklift 1
- [ ] Dashboard shows KPI cards, fleet table, charts
- [ ] Asset detail page shows revenue vs cost breakdown
- [ ] Sidebar has "Profitability" link
- [ ] Only manager + super_admin can access
```

---

## Phase 10 — Executive BI

**Current score:** 40% | **Target score:** 90%
**Backend:** Aggregates existing APIs, no dedicated analytics backend
**Frontend:** 1 page with 4 charts — no date range, no drill-down, no KPI targets

### 10.1 Build unified Executive API endpoint

Current `ExecutiveDashboardPage` makes 8 separate API calls. Build a single endpoint that aggregates all data server-side.

| File | Action |
|------|--------|
| `services/executive_service.py` | **CREATE NEW FILE** — aggregates CRM, billing, inventory, fleet, maintenance data |
| `schemas/executive.py` | **CREATE NEW FILE** — `ExecutiveSummary` response schema |
| `routes/executive.py` | **CREATE NEW FILE** |

Endpoints:
```
GET  /api/v1/executive/summary?from=2026-01-01&to=2026-06-30    → unified dashboard data
GET  /api/v1/executive/kpis                                       → KPI targets vs actuals
POST /api/v1/executive/kpi-targets                                → set KPI targets
```

| File | Change |
|------|--------|
| `main.py` | Register executive router |

**Effort:** 3 days

### 10.2 Add date range selector

| File | Change |
|------|--------|
| `pages/Executive/ExecutiveDashboardPage.tsx` | Add date picker (preset: this month, this quarter, this year, custom range) |
| `pages/Executive/ExecutiveDashboardPage.tsx` | Pass date range to unified API call |

**Effort:** 1 day

### 10.3 Add KPI target vs actual cards

| File | Change |
|------|--------|
| `pages/Executive/ExecutiveDashboardPage.tsx` | Add KPI row: revenue target vs actual, fleet utilization target, customer growth target — each with progress bar and red/green indicator |

**Effort:** 1.5 days

### 10.4 Add chart drill-down navigation

| Chart | Drill-down target |
|-------|--------------------|
| Fleet utilization pie | Click segment → `/equipment?status={status}` |
| Revenue trend | Click month bar → `/billing/invoices?issue_from={month_start}&issue_to={month_end}` |
| Customer growth | Click bar → `/customers?created_from={month_start}` |
| Lead pipeline | Click stage → `/leads?status={stage}` |

| File | Change |
|------|--------|
| `pages/Executive/ExecutiveDashboardPage.tsx` | Add `onClick` handlers to Recharts components with `useNavigate()` |

**Effort:** 1 day

### 10.5 Add profitability widgets

After Phase 9 is complete, add margin data to the executive dashboard.

| File | Change |
|------|--------|
| `pages/Executive/ExecutiveDashboardPage.tsx` | Add gross margin KPI card, margin trend sparkline, top 5 most profitable assets table |

**Effort:** 1 day

### 10.6 Add PDF report export (future)

| File | Action |
|------|--------|
| `services/executive_service.py` | Add `generate_report_pdf()` method using Playwright or wkhtmltopdf |
| `routes/executive.py` | Add `GET /api/v1/executive/report?format=pdf` |
| `pages/Executive/ExecutiveDashboardPage.tsx` | Add "Export PDF" button |

**Effort:** 3 days | **Deferred** — requires server-side rendering dependency

### Phase 10 verification

```
- [ ] GET /api/v1/executive/summary returns unified data
- [ ] Date range picker filters all charts
- [ ] KPI targets can be set and compared to actuals
- [ ] Clicking chart elements navigates to filtered list pages
- [ ] Profitability widgets show margin data
- [ ] Sidebar "Analytics" link loads the page
```

---

## Execution Timeline

```
Week 1     C1 (CSS extraction) + C2 (shared types) + C3 (alert→toast)
           Phase 1 (Catalog hardening)

Week 2     Phase 2 (Equipment sub-entity tabs)

Week 3     Phase 3 (Quotation form + edit)
           Phase 4 (Rental form + returns + billing wire)

Week 4     Phase 5 (Movement form + checkpoints)
           Phase 6 (Work Order form — critical placeholder)
           Phase 7 (Spare Part form — critical placeholder)

Week 5     Phase 8 (Billing create buttons + modals)
           C4 (Permission-aware sidebar)
           C5 (Settings page)

Week 6-7   Phase 9 (Profitability — backend + frontend)

Week 8     Phase 10 (Executive BI — unified API + enhancements)
```

**Total estimated effort:** 8 weeks (1 developer)

---

## Risk Register

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | CSS extraction breaks existing page layouts | Visual regression test each page after C1 |
| 2 | Permission-aware sidebar locks out users | Test all 4 roles in dev before deploy |
| 3 | Profitability calculations are wrong | Cross-reference with Excel workbook totals from DK LAO data |
| 4 | Executive unified endpoint is slow | Add DB indexes on `created_at`, `status` for aggregate queries |
| 5 | Form refactors break existing create flows | Test create + edit + delete for each entity before merging |
| 6 | SearchSelect component has UX issues | Use debounced API search, min 2 chars, 300ms delay |

---

## File Impact Summary

| Action | Count |
|--------|-------|
| New files to create | 12 |
| Existing files to modify | 38 |
| Cross-module CSS imports to remove | 5 |
| Placeholder routes to replace | 3 |
| alert() calls to replace with toast | 3 |
| Hardcoded values to extract | 8 |
| Dead code to remove | 4 |
| Backend endpoints with no frontend caller | 18 |
