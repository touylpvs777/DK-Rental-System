# DK Service Enterprise Platform — Product Roadmap

**Platform:** FastAPI + React 19 + TypeScript + SQLAlchemy 2.0 Async
**Database:** SQLite (dev) / PostgreSQL (prod)
**Current overall score:** 72% (gap-analysis baseline, 2026-06-28)

---

## Foundation (ships with every version)

| Layer | What's Included |
|-------|----------------|
| Auth | JWT login/logout/refresh, User CRUD, RBAC (4 roles × 32 permissions) |
| CRM | Customers CRUD, Leads pipeline (7 stages), Lead notes |
| Activity logs | 62 action types, entity-level audit trail |
| Theme system | CSS custom properties, dark mode, responsive breakpoints |
| Deployment | Docker Compose (backend + frontend + PostgreSQL), Nginx SPA routing |

Foundation is **complete** and ships as-is. All versions below build on it.

---

## v1.0 — Product Catalog

> Spare-parts and accessories catalog with brands, categories, Excel import.

### Backend — 30 endpoints, 6 models

| Component | Status | Detail |
|-----------|--------|--------|
| `Brand` model + CRUD | DONE | 5 endpoints: list, get, create, update, delete |
| `ProductCategory` model (3-level tree) | DONE | 6 endpoints: tree, flat list, get, create, update, delete |
| `Product` model + specs + images + compat_brands | DONE | 13 endpoints: list, get, create, update, delete, specs, images, compatibility |
| `ImportJob` + `ImportError` models | DONE | 6 endpoints: preview, execute, list jobs, get job, errors, download template |
| Brand repository | DONE | Filter, search, pagination |
| Product repository | DONE | Full-text search, category/brand filter, price range |
| Category repository | DONE | Tree traversal, parent-child |
| Import repository | DONE | Job tracking, error logging |
| Brand service | DONE | Slug generation, duplicate detection |
| Category service | DONE | Tree validation, depth limit (3) |
| Product service | DONE | SKU generation, spec/image/compat management |
| Import service | DONE | Excel parsing, row validation, preview + execute |

### Frontend — 5 pages

| Page | Status | Detail |
|------|--------|--------|
| `CatalogPage` — product list + search + filters | DONE | Paginated grid, category/brand filter, search |
| `ProductDetailPage` — full product view | DONE | Specs table, images gallery, compatibility list |
| `ProductForm` — create/edit product | DONE | Multi-section form with dynamic spec rows |
| `BrandsPage` — brand management | DONE | Inline create/edit, logo URL |
| `CategoriesPage` — category tree | DONE | 3-level tree CRUD, drag-reorder |
| `ImportPage` — Excel import wizard | DONE | Upload → preview → validate → execute |

### Gaps

| Gap | Priority | Effort |
|-----|----------|--------|
| No product image upload (URL-only) | LOW | 1 day |
| No bulk price update | LOW | 1 day |
| No product status filter on catalog page | LOW | 0.5 day |

### v1.0 Score: **95%**

---

## v1.1 — Equipment Registry

> Forklift fleet management with full asset lifecycle.

### Backend — 21 endpoints, 9 models

| Component | Status | Detail |
|-----------|--------|--------|
| `Forklift` model (25 columns) | DONE | Brand, model, serial, capacity, fuel_type, status, purchase info |
| `ForkliftModel` — equipment catalog | DONE | Brand + model name + default specs |
| `ForkliftSpec` — tire/mast/battery specs | DONE | 13 columns, FK to forklift, multi-spec per unit |
| `ForkliftPhoto` — image gallery | DONE | URL, caption, is_primary, sort_order |
| `ForkliftDocument` — PDFs/certs | DONE | Document type, URL, expiry date |
| `ForkliftLocation` — GPS/site tracking | DONE | Lat/lng, address, customer site ref |
| `ForkliftHourMeterLog` — usage tracking | DONE | Hours reading, date, operator |
| `ForkliftOwnershipCost` — TCO data | DONE | Cost type, amount, vendor, reference |
| `ForkliftStatusHistory` — audit trail | DONE | Status transitions with timestamp + user |
| Forklift repository | DONE | Filter by status/brand/fuel, eager-load specs |
| 8 sub-repositories | DONE | Cost, document, hour_meter, location, model, photo, status |
| Forklift service + 7 sub-services | DONE | Full CRUD, status transitions, backward-compat layer |
| Image upload endpoint | DONE | POST /uploads/images, UUID filenames, MIME validation |

### Frontend — 3 pages

| Page | Status | Detail |
|------|--------|--------|
| `EquipmentRegistryPage` — fleet list | DONE | Paginated table, status/brand/fuel filters, hero image |
| `ForkliftDetailPage` — asset detail | DONE | Tabbed view: overview, specs, photos, documents, costs, hours, history |
| `ForkliftForm` — register/edit | DONE | Multi-section form, customer/model selects |
| `ImageUpload` component | DONE | Drag-and-drop, preview, progress bar, validation |

### Gaps

| Gap | Priority | Effort |
|-----|----------|--------|
| Spec form UI (forklift_specs table exists, no form to populate) | MEDIUM | 1 day |
| Bulk import from Excel (242 forklifts in DK data) | MEDIUM | 2 days |
| QR code / barcode generation per asset | LOW | 1 day |
| Fleet map view (locations exist, no map component) | LOW | 2 days |

### v1.1 Score: **95%**

---

## v1.2 — Quotation

> Sales quotation workflow with multi-item line items and approval chain.

### Backend — 20 endpoints, 4 models

| Component | Status | Detail |
|-----------|--------|--------|
| `Quotation` model | DONE | 8-stage workflow: draft → under_review → approved → sent → accepted → converted |
| `QuotationItem` — line items | DONE | Description, quantity, unit_rate, discount, tax |
| `QuotationApproval` — approval records | DONE | Approver, decision, comments, timestamp |
| `QuotationStatusHistory` — audit trail | DONE | All transitions logged with user + timestamp |
| Quotation repository | DONE | Filter by status/customer/date, pagination |
| Quotation service | DONE | CRUD, item management, total calculation |
| Quotation workflow service | DONE | State machine, approval logic, convert-to-rental |

### Frontend — 3 pages

| Page | Status | Detail |
|------|--------|--------|
| `QuotationListPage` — quotation list | DONE | Paginated, status filter, search by number |
| `QuotationDetailPage` — full quotation view | DONE | Line items table, status badge, workflow buttons, approval history |
| `QuotationFormPage` — create/edit | DONE | Customer select, dynamic line items, auto-total |

### Gaps

| Gap | Priority | Effort |
|-----|----------|--------|
| PDF export / print quotation | MEDIUM | 2 days |
| Quotation templates (reuse common line items) | LOW | 2 days |
| Email send integration (currently just marks "sent") | LOW | 2 days |
| Duplicate quotation action | LOW | 0.5 day |

### v1.2 Score: **95%**

---

## v1.3 — Rental

> Full rental contract lifecycle with extensions, returns, and damage reports.

### Backend — 34 endpoints, 8 models

| Component | Status | Detail |
|-----------|--------|--------|
| `RentalContract` model | DONE | 7-stage workflow: reservation → pending_approval → approved → active → closed |
| `RentalContractItem` — equipment lines | DONE | Forklift ref, daily/monthly rate, status per item |
| `RentalContractTerm` — terms & conditions | DONE | Free-text terms attached to contract |
| `RentalContractStatusHistory` | DONE | Full audit trail |
| `RentalExtension` — contract extensions | DONE | Request → approve/reject, new end date |
| `RentalReturn` — return processing | DONE | 4-stage: requested → picked_up → received → completed |
| `RentalDamageReport` — damage assessment | DONE | Dispute workflow: none → assessed → disputed → resolved |
| `RentalBillingCycle` — billing periods | DONE | Monthly/custom cycles, amount, status |
| Rental repository | DONE | Complex eager-loading (items + forklifts + customer + history) |
| Rental contract service | DONE | CRUD, item management, billing cycle generation |
| Rental workflow service | DONE | State machine, extension/return/damage workflows, billing hooks |

### Frontend — 3 pages

| Page | Status | Detail |
|------|--------|--------|
| `RentalContractListPage` — contract list | DONE | Paginated, status/customer filter, search |
| `RentalContractDetailPage` — full contract view | DONE | Tabs: overview, items, billing cycles, extensions, returns, damage, history |
| `RentalContractFormPage` — create/edit | DONE | Customer/forklift select, rate entry, date range |

### Gaps

| Gap | Priority | Effort |
|-----|----------|--------|
| Contract PDF generation | MEDIUM | 2 days |
| Auto-renewal reminders (contract expiry alerts) | MEDIUM | 1 day |
| Contract comparison (side-by-side two contracts) | LOW | 2 days |

### v1.3 Score: **95%**

---

## v1.4 — Movement

> Asset delivery, retrieval, and transfer tracking with driver assignment.

### Backend — 10 endpoints, 2 models

| Component | Status | Detail |
|-----------|--------|--------|
| `AssetMovement` model | DONE | 6-stage workflow: draft → preparing → in_transit → arrived → completed |
| `MovementHistory` — checkpoint log | DONE | Location, timestamp, notes per checkpoint |
| Movement repository | DONE | Filter by type/status/forklift/customer/driver |
| Movement service | DONE | CRUD, state transitions, checkpoint recording |

### Frontend — 3 pages

| Page | Status | Detail |
|------|--------|--------|
| `MovementListPage` — movement list | DONE | Paginated, type/status filter, priority badges |
| `MovementDetailPage` — movement detail | DONE | Timeline view, checkpoint history, workflow buttons |
| `MovementForm` — create movement | DONE | Forklift/customer/driver select, type, priority, notes |

### Gaps

| Gap | Priority | Effort |
|-----|----------|--------|
| Live map tracking (GPS integration) | LOW | 3 days |
| Driver mobile view (simplified movement interface) | LOW | 1 week |
| Delivery note PDF generation | MEDIUM | 1 day |
| Automated movement creation on contract activation | LOW | 1 day (partially wired in rental_workflow_service) |

### v1.4 Score: **90%**

---

## v1.5 — Maintenance

> Preventive maintenance plans, work orders, and service history.

### Backend — 17 endpoints, 6 models

| Component | Status | Detail |
|-----------|--------|--------|
| `MaintenancePlan` — PM templates | DONE | Name, description, interval (hours/days), checklist |
| `MaintenanceSchedule` — per-forklift schedules | DONE | Next due date/hours, recurrence, auto-trigger flag |
| `WorkOrder` — work order lifecycle | DONE | 5-stage: scheduled → in_progress → completed → verified |
| `ServiceHistory` — completed service log | DONE | Forklift ref, date, type, description, technician name |
| `MaintenanceCost` — cost tracking | DONE | Labor, parts, external service, other — per work order |
| `PartConsumption` — inventory link | DONE | Spare part ref, quantity consumed, work order ref |
| Maintenance repository | DONE | Filter by status/forklift/date, eager-load costs |
| Maintenance service | DONE | Full lifecycle, schedule management, cost aggregation |

### Frontend — 4 pages

| Page | Status | Detail |
|------|--------|--------|
| `MaintenanceDashboardPage` — PM overview | DONE | KPI cards, upcoming schedules, recent work orders |
| `WorkOrderListPage` — work order list | DONE | Paginated, status/forklift filter |
| `WorkOrderDetailPage` — work order detail | DONE | Workflow buttons (start/complete/verify), costs table, parts consumed |
| `MaintenanceSchedulePage` — schedule management | DONE | Per-forklift schedules, plan assignment |
| New Work Order form | PLACEHOLDER | Route exists (`/maintenance/work-orders/new`), renders placeholder |

### Gaps

| Gap | Priority | Effort |
|-----|----------|--------|
| **Work Order creation form** | HIGH | 2 days |
| PM auto-trigger (schedule → work order based on hours/date) | MEDIUM | 2 days |
| Technician entity (currently free-text name field) | MEDIUM | 3 days |
| Service history report / export | LOW | 1 day |
| Recurring checklist templates | LOW | 2 days |

### v1.5 Score: **85%**

---

## v1.6 — Spare Parts

> Inventory management, warehouse tracking, purchase orders, stock control.

### Backend — 17 endpoints, 6 models

| Component | Status | Detail |
|-----------|--------|--------|
| `SparePart` model | DONE | Part number, name, category, brand, unit_price, min_stock, is_active |
| `Warehouse` model | DONE | Name, location, is_active |
| `InventoryBalance` — per-part per-warehouse | DONE | Quantity on hand, reserved, available |
| `InventoryTransaction` — stock movements | DONE | Types: receive, issue, adjust, transfer, return, consume |
| `PurchaseOrder` + `PurchaseOrderItem` | DONE | PO lifecycle: draft → ordered → partially_received → received |
| Inventory repository | DONE | Balance queries, transaction logging, PO management |
| Inventory service | DONE | Dashboard aggregation, stock operations, PO workflow |

### Frontend — 5 pages

| Page | Status | Detail |
|------|--------|--------|
| `InventoryDashboardPage` — overview | DONE | KPI cards: total parts, stock value, low stock alerts, recent transactions |
| `SparePartListPage` — part catalog | DONE | Paginated, category/brand filter, search |
| `SparePartDetailPage` — part detail | DONE | Balances per warehouse, transaction history, consumption log |
| `WarehousePage` — warehouse list | DONE | Create/edit warehouses, balance overview |
| `PurchaseOrderPage` — PO management | DONE | PO list, create, receive items, status workflow |
| New Spare Part form | PLACEHOLDER | Route exists (`/inventory/parts/new`), renders placeholder |

### Gaps

| Gap | Priority | Effort |
|-----|----------|--------|
| **Spare Part creation form** | HIGH | 1 day |
| Low-stock email alerts | MEDIUM | 1 day |
| Stock-take / physical count feature | MEDIUM | 2 days |
| Barcode scanning for transactions | LOW | 2 days |
| Inventory valuation report (FIFO/weighted avg) | LOW | 2 days |

### v1.6 Score: **85%**

---

## v1.7 — Billing

> Invoice generation, payment processing, deposits, revenue recognition.

### Backend — 29 endpoints, 6 models

| Component | Status | Detail |
|-----------|--------|--------|
| `Invoice` model | DONE | 8-status workflow: draft → issued → sent → partially_paid → paid → overdue |
| `InvoiceItem` — line items | DONE | Billing cycle ref, description, quantity, rate, tax |
| `Payment` model | DONE | 6 methods (cash, bank_transfer, check, credit_card, mobile, other), 4 statuses |
| `PaymentAllocation` — payment → invoice | DONE | Partial payment support, allocation tracking |
| `Deposit` model | DONE | 3 types (security, advance, guarantee), 6-status lifecycle |
| `RevenueRecognition` — accrual accounting | DONE | 5 types, schedule/recognize/reverse workflow |
| Billing repository | DONE | Complex filters (status, customer, contract, date range), aggregation |
| Billing service | DONE | Full lifecycle + automation hooks (mark overdue, generate from cycles, revenue scheduling) |

### Frontend — 12 pages

| Page | Status | Detail |
|------|--------|--------|
| `BillingDashboardPage` — billing overview | DONE | KPI cards, quick actions, mark-overdue button |
| `InvoiceListPage` — invoice list | DONE | Paginated, status filter, search by number |
| `InvoiceDetailPage` — invoice detail | DONE | Items table, allocations, workflow buttons (issue/send/cancel/void) |
| `PaymentListPage` — payment list | DONE | Status/method filter, search |
| `PaymentDetailPage` — payment detail | DONE | Confirm/reject buttons, allocation to invoices |
| `DepositListPage` — deposit list | DONE | Status/type filter |
| `DepositDetailPage` — deposit detail | DONE | Receive/refund/forfeit/apply workflow buttons |
| `RevenueRecognitionPage` — recognition list | DONE | Type/status filter, inline recognize/reverse |
| `FinanceDashboardPage` — finance overview | DONE | Charts, AR aging, revenue breakdown |
| `PaymentPage` — unified payment view | DONE | Combined payment + allocation management |
| `DepositPage` — unified deposit view | DONE | Combined deposit management |
| `StatementPage` — customer statements | DONE | Per-customer invoice/payment history |

### Gaps

| Gap | Priority | Effort |
|-----|----------|--------|
| Invoice PDF generation | HIGH | 2 days |
| Payment receipt PDF | MEDIUM | 1 day |
| Automated late-payment reminders | MEDIUM | 1 day |
| Multi-currency support (currently LAK-only) | LOW | 3 days |
| Tax report generation | MEDIUM | 2 days |

### v1.7 Score: **90%**

---

## v1.8 — Profitability

> Per-asset and per-contract profitability analysis, cost tracking, margin reporting.

### Backend

| Component | Status | Detail |
|-----------|--------|--------|
| `ForkliftOwnershipCost` model | DONE | Cost type, amount, vendor, date — per forklift |
| `MaintenanceCost` model | DONE | Labor/parts/external costs — per work order |
| Revenue data (invoices, billing cycles) | DONE | Available via billing service |
| Cost aggregation queries | PARTIAL | `ForkliftCostService.get_summary()` returns per-forklift totals |
| **Profitability calculation engine** | MISSING | No service that combines revenue - costs per asset/contract |
| **Margin analysis API** | MISSING | No endpoints for profitability reports |
| **Contract P&L API** | MISSING | No per-contract revenue vs cost breakdown |

### Frontend

| Page | Status | Detail |
|------|--------|--------|
| Per-asset cost view | PARTIAL | ForkliftDetailPage shows ownership costs tab |
| **Profitability dashboard** | MISSING | No page showing margin by asset/customer/period |
| **Contract P&L page** | MISSING | No per-contract profit/loss view |
| **Cost analysis charts** | MISSING | No visualizations for cost trends, category breakdown |

### What Needs to Be Built

| Deliverable | Priority | Effort |
|-------------|----------|--------|
| `ProfitabilityService` — combine revenue + costs per forklift | HIGH | 2 days |
| `GET /api/v1/profitability/assets` — fleet profitability list | HIGH | 1 day |
| `GET /api/v1/profitability/assets/{id}` — single asset P&L | HIGH | 1 day |
| `GET /api/v1/profitability/contracts/{id}` — contract P&L | HIGH | 1 day |
| `GET /api/v1/profitability/summary` — company-wide margins | MEDIUM | 1 day |
| `ProfitabilityDashboardPage` — margin overview with charts | HIGH | 3 days |
| `AssetProfitabilityPage` — per-asset revenue vs cost breakdown | HIGH | 2 days |
| `ContractProfitabilityPage` — per-contract P&L | MEDIUM | 2 days |
| Period comparison (month-over-month, YoY) | MEDIUM | 2 days |
| Export profitability report to Excel | LOW | 1 day |

### v1.8 Score: **20%** (data models exist, no analysis layer)

---

## v1.9 — Executive BI

> C-level dashboards with cross-module KPIs, trend analysis, and export.

### Backend

| Component | Status | Detail |
|-----------|--------|--------|
| Dashboard summary API | DONE | 4 endpoints: summary, lead trend, customer trend, monthly stats |
| Billing summary API | DONE | `GET /billing/dashboard` — invoice/payment/deposit aggregation |
| Inventory summary API | DONE | `GET /inventory/dashboard` — stock value, low stock count |
| Maintenance summary API | DONE | `GET /maintenance/dashboard` — open WOs, overdue schedules |
| **Dedicated BI analytics backend** | MISSING | No KPI target setting, no period comparison engine |
| **Cross-module aggregation API** | MISSING | Executive page manually calls 8 separate APIs |
| **Data export API (PDF/Excel)** | MISSING | No executive report export |

### Frontend

| Page | Status | Detail |
|------|--------|--------|
| `ExecutiveDashboardPage` | DONE | Aggregates 8 API calls: CRM summary, billing, inventory, fleet, rentals, lead/customer trends |
| Revenue area chart | DONE | 12-month trend from billing data |
| Fleet utilization pie chart | DONE | Rented vs in_stock vs in_service breakdown |
| Customer growth bar chart | DONE | Monthly new customers |
| Lead pipeline bar chart | DONE | Stage distribution |
| **KPI target vs actual** | MISSING | No target-setting UI, no actual-vs-plan visualization |
| **Period selector** | MISSING | Always shows all-time / 12-month, no custom date range |
| **Drill-down navigation** | MISSING | Charts are display-only, no click-to-detail |
| **PDF report export** | MISSING | No export-to-PDF for executive reports |
| **Scheduled report emails** | MISSING | No automated report delivery |

### What Needs to Be Built

| Deliverable | Priority | Effort |
|-------------|----------|--------|
| `GET /api/v1/executive/summary` — unified cross-module endpoint | HIGH | 2 days |
| `GET /api/v1/executive/kpis` — KPI with targets | MEDIUM | 2 days |
| `POST /api/v1/executive/kpi-targets` — set KPI targets | MEDIUM | 1 day |
| `GET /api/v1/executive/report` — PDF/Excel export | MEDIUM | 2 days |
| Date range picker on Executive dashboard | HIGH | 1 day |
| KPI target vs actual cards | MEDIUM | 2 days |
| Chart drill-down (click bar → navigate to filtered list) | MEDIUM | 2 days |
| Profitability widgets (from v1.8) | HIGH | 1 day (after v1.8) |
| PDF generation (wkhtmltopdf or Playwright) | MEDIUM | 2 days |
| Scheduled email reports | LOW | 3 days |

### v1.9 Score: **40%** (visualization exists, no analytics backend)

---

## Cross-Cutting Concerns (all versions)

These items apply to every version and should be addressed progressively:

| # | Item | Current | Target | Priority | Effort |
|---|------|---------|--------|----------|--------|
| 1 | **Automated tests** | 0 tests | pytest (backend) + vitest (frontend) | CRITICAL | 2 weeks |
| 2 | **Permission-aware UI** | All menu items visible to all roles | `<Can permission="...">` component wrapping buttons/menu items | HIGH | 3 days |
| 3 | **Settings page** | Placeholder div | Password change, profile edit, notification preferences | HIGH | 2 days |
| 4 | **Rate limiting** | None | Login brute-force protection (`slowapi`) | HIGH | 1 day |
| 5 | **Pagination** | Missing on customers, leads, activity | All list endpoints paginated | MEDIUM | 2 days |
| 6 | **CI/CD pipeline** | None | GitHub Actions: lint + test + build + deploy | MEDIUM | 2 days |
| 7 | **API versioning** | All `/api/v1/*`, no v2 plan | Header-based or path-based coexistence strategy | LOW | 1 day |
| 8 | **WebSocket/SSE** | Poll-based | Real-time notifications for approvals, overdue alerts | LOW | 1 week |

---

## Version Summary

| Version | Module | Backend | Frontend | Score | Key Metric |
|---------|--------|---------|----------|-------|------------|
| v1.0 | Product Catalog | 30 endpoints, 6 models | 5 pages | **95%** | 29/29 API endpoints |
| v1.1 | Equipment Registry | 21 endpoints, 9 models | 3 pages | **95%** | 21/21 API endpoints |
| v1.2 | Quotation | 20 endpoints, 4 models | 3 pages | **95%** | 8-stage workflow |
| v1.3 | Rental | 34 endpoints, 8 models | 3 pages | **95%** | 5 sub-workflows |
| v1.4 | Movement | 10 endpoints, 2 models | 3 pages | **90%** | 6-stage workflow |
| v1.5 | Maintenance | 17 endpoints, 6 models | 4 pages + 1 placeholder | **85%** | Work order form missing |
| v1.6 | Spare Parts | 17 endpoints, 6 models | 5 pages + 1 placeholder | **85%** | Spare part form missing |
| v1.7 | Billing | 29 endpoints, 6 models | 12 pages | **90%** | Full invoice→payment→deposit lifecycle |
| v1.8 | Profitability | Data models exist | No pages | **20%** | Analysis engine not built |
| v1.9 | Executive BI | Aggregates existing APIs | 1 page, 4 charts | **40%** | No analytics backend |
| | **Total** | **218 endpoints, 56 models** | **48+ pages** | **79%** | |

---

## Recommended Execution Order

```
NOW         v1.5 fix — Work Order form (2 days)
            v1.6 fix — Spare Part form (1 day)
            Cross-cut — Settings page (2 days)
            Cross-cut — Permission-aware UI (3 days)

NEXT        v1.8 — Profitability engine + dashboard (2 weeks)
            v1.9 — Executive BI analytics backend + enhancements (2 weeks)

ONGOING     Cross-cut — Test suite (2 weeks, parallelize with above)
            Cross-cut — CI/CD pipeline (2 days)
```

**Rationale:** v1.0–v1.4 are effectively complete (90–95%). v1.5 and v1.6 need only small form pages. The real gaps are v1.8 (profitability — 20%) and v1.9 (executive BI — 40%), which depend on all other modules being operational. Cross-cutting concerns (tests, permissions, settings) should ship continuously alongside feature work.
