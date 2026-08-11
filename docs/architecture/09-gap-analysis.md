# Gap Analysis — DK Service CRM

## Scoring Legend
- **COMPLETE** — Fully implemented backend + frontend, production-ready
- **FUNCTIONAL** — Backend complete, frontend works but needs polish
- **PARTIAL** — Core structure exists, significant features missing
- **STUB** — Placeholder or minimal implementation
- **MISSING** — Not implemented at all

---

## Module Completion Matrix

| # | Module | Backend | Frontend | DB | API | Score |
|---|--------|---------|----------|----|-----|-------|
| 1 | Auth & Login | COMPLETE | COMPLETE | ✓ | 3/3 | 100% |
| 2 | RBAC | COMPLETE | PARTIAL | ✓ | 6/6 | 85% |
| 3 | CRM — Customers | COMPLETE | FUNCTIONAL | ✓ | 5/5 | 90% |
| 4 | CRM — Leads | COMPLETE | FUNCTIONAL | ✓ | 8/8 | 90% |
| 5 | Product Catalog | COMPLETE | COMPLETE | ✓ | 29/29 | 95% |
| 6 | Equipment Registry | COMPLETE | COMPLETE | ✓ | 21/21 | 95% |
| 7 | Quotations | COMPLETE | COMPLETE | ✓ | 21/21 | 95% |
| 8 | Rental Contracts | COMPLETE | COMPLETE | ✓ | 29/29 | 90% |
| 9 | Asset Movements | COMPLETE | FUNCTIONAL | ✓ | 10/10 | 90% |
| 10 | Maintenance | COMPLETE | FUNCTIONAL | ✓ | 17/17 | 85% |
| 11 | Inventory | COMPLETE | FUNCTIONAL | ✓ | 17/17 | 85% |
| 12 | Billing | COMPLETE | COMPLETE | ✓ | 30/30 | 90% |
| 13 | Reports & Export | COMPLETE | FUNCTIONAL | — | 3/3 | 80% |
| 14 | Dashboard | COMPLETE | COMPLETE | — | 4/4 | 90% |
| 15 | Executive BI | PARTIAL | FUNCTIONAL | — | 0/0 | 70% |
| 16 | Activity Logs | COMPLETE | COMPLETE | ✓ | 3/3 | 95% |
| 17 | Settings | MISSING | STUB | — | — | 5% |
| 18 | File Uploads | COMPLETE | COMPLETE | — | 1/1 | 90% |
| | **Overall** | | | **56 tables** | **218 endpoints** | **87%** |

---

## Detailed Gaps

### 1. MISSING MODULES

| Module | Description | Impact | Effort |
|--------|-------------|--------|--------|
| **Settings Page** | User preferences, password change, notification settings | Users can't change their password without admin | S (2-3 days) |
| **Notifications** | Real-time or polling notifications for approvals, overdue items | Users have no proactive alerts | M (1 week) |
| **Automotive Service** | Car/vehicle repair tracking (242 automotive customers in Excel data) | Entire business line unrepresented | L (2-3 weeks) |
| **Technician Management** | Dedicated technician entity with skills, availability, assignments | Technicians are just names in text fields | M (1 week) |
| **Customer Portal** | Customer-facing view of their contracts, invoices, equipment | All interactions require DK staff | XL (4+ weeks) |

### 2. INCOMPLETE MODULES

| Module | What's Missing | Priority |
|--------|---------------|----------|
| **RBAC** | Frontend shows no role-based UI hiding. Support users see all menu items and buttons. No permission-aware component wrappers. | HIGH |
| **Settings** | Only a placeholder div. No password change, no notification preferences, no user profile edit. | HIGH |
| **Reports** | Only 3 report types (customers, leads, sales). Missing: equipment utilization, maintenance costs, billing aging, contract expiry, inventory valuation. | MEDIUM |
| **Executive BI** | Aggregates existing API data but no dedicated analytics backend. No KPI targets, no period comparison, no export-to-PDF. | MEDIUM |
| **Maintenance** | No "New Work Order" form page (placeholder). Schedule auto-triggering not implemented (manual only). | MEDIUM |
| **Inventory** | No "New Spare Part" form page (placeholder). No stock-take / physical count feature. No low-stock email alerts. | LOW |

### 3. ARCHITECTURE ISSUES

| # | Issue | Severity | Description |
|---|-------|----------|-------------|
| 1 | **No test suite** | HIGH | Zero test files. No pytest, no vitest, no Playwright. Backend and frontend have no automated tests. |
| 2 | **No API versioning strategy** | MEDIUM | All routes are `/api/v1/*` but there's no plan or mechanism for v2 coexistence. |
| 3 | **SQLite in dev vs PostgreSQL in prod** | MEDIUM | `PRAGMA` migrations in main.py are SQLite-specific. Alembic partially configured but the 2 legacy SQL migration files are separate from Alembic. |
| 4 | **No rate limiting** | MEDIUM | Login endpoint has no brute-force protection. No rate limiter middleware. |
| 5 | **No pagination on some list endpoints** | LOW | Customers, leads, activity logs return full lists. Only forklifts, quotations, rentals, inventory, maintenance have paginated responses. |
| 6 | **No WebSocket/SSE** | LOW | Real-time updates (e.g., movement tracking) would benefit from push. Currently poll-based. |
| 7 | **Hardcoded business rules** | LOW | Tax rates, penalty percentages, billing cycle logic are in Python code, not configurable via UI. |

### 4. DATABASE GAPS

| Gap | Tables Affected | Description |
|-----|----------------|-------------|
| No `technicians` table | work_orders, service_history | Technician names stored as plain strings. Can't track assignments, skills, workload. |
| No `vehicles` table | — | Automotive customer cars (242 in Excel) have no DB representation. Only forklift entities exist. |
| No `correction_items` table | work_orders | Repair line items (1,297 in Excel data) have no structured storage. Only free-text fields on work_orders. |
| No `daily_status_log` table | forklifts | Per-forklift daily A/NA/S status (from Breakdown Monitoring Excel) not tracked. |
| No `delivery_notes` table | asset_movements | Delivery and retrieval documents (from Excel) not modeled as a separate document type. |
| No `contract_documents` table | rental_contracts | Contract PDFs, signed copies not tracked. |
| Missing `CUS_ID` format | customers | Excel data uses `CUS_00001` identifiers. No `customer_code` field on the `customers` table. |
| Missing tire/spec data path | forklifts → forklift_specs | `forklift_specs` table exists but no UI form to populate it. No bulk import from Excel. |

### 5. API GAPS

| Gap | Current State | What's Needed |
|-----|--------------|---------------|
| No batch operations | All CRUD is single-entity | Bulk status update, bulk invoice generation |
| No search across entities | Per-entity search only | Global search API: `/api/v1/search?q=HOYA` across customers + forklifts + contracts |
| No export for all modules | Only customers, leads, sales reports | Equipment report, maintenance report, billing aging report |
| No dashboard filters | Dashboard always shows all-time data | Date range filters on `/dashboard/summary` |
| No work order creation form | `POST /maintenance/work-orders` exists but frontend uses placeholder | Wire the existing API to a real form |

### 6. FRONTEND GAPS

| Gap | Priority | Description |
|-----|----------|-------------|
| No permission-aware UI | HIGH | All sidebar items visible to all roles. Buttons not hidden based on permissions. |
| Settings page is placeholder | HIGH | `<Placeholder name="Settings" />` — no password change, no profile. |
| No inline editing | MEDIUM | Every edit requires full page navigation. No quick-edit modals on list pages. |
| No keyboard shortcuts | LOW | No Ctrl+K search, no Ctrl+N new record. |
| No offline indicator | LOW | No "you're offline" banner when network drops. |
| No print/PDF export | MEDIUM | No `@media print` styles. No client-side PDF generation. |
| No onboarding | LOW | No first-login wizard, no empty-state guided setup. |

---

## Recommended Refactoring (Priority Order)

| # | Refactoring | Impact | Effort | Rationale |
|---|-------------|--------|--------|-----------|
| 1 | **Add test suite** | Safety | 2 weeks | Zero tests is the single biggest production risk. Add pytest for backend (50+ tests), vitest for frontend (30+ tests). |
| 2 | **Implement Settings page** | UX | 2 days | Users can't change passwords. Profile edit is expected. |
| 3 | **Add permission-aware UI** | Security | 3 days | Support users shouldn't see Delete buttons. Sales shouldn't see Approve buttons. Wrap in `<Can permission="...">` components. |
| 4 | **Add customer_code to customers** | Data | 1 day | Enable CUS_00001 format for Excel data import compatibility. |
| 5 | **Add rate limiting** | Security | 1 day | Login brute-force protection. Use `slowapi` or custom middleware. |
| 6 | **Paginate all list endpoints** | Stability | 2 days | Customers and leads return unbounded lists. Will break at >1000 records. |
| 7 | **Add work order form** | UX | 2 days | Replace `/maintenance/work-orders/new` placeholder with a real form. |
| 8 | **Add spare part form** | UX | 1 day | Replace `/inventory/parts/new` placeholder. |
| 9 | **Add technician entity** | Data | 3 days | Model + CRUD + link to work_orders and service_history. |
| 10 | **Consolidate migration strategy** | DevOps | 1 day | Remove legacy SQL migrations. Run everything through Alembic. |
