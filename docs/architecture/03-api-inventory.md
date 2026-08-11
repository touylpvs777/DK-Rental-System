# API Inventory — DK Service CRM

**218 endpoints across 17 route modules**

## Summary by Module

| Module | Prefix | GET | POST | PUT | PATCH | DELETE | Total |
|--------|--------|-----|------|-----|-------|--------|-------|
| Auth | /api/v1/auth | 0 | 3 | 0 | 0 | 0 | 3 |
| Users | /api/v1/users | 3 | 1 | 0 | 1 | 1 | 6 |
| Roles | /api/v1/roles | 3 | 1 | 0 | 1 | 1 | 6 |
| Dashboard | /api/v1/dashboard | 4 | 0 | 0 | 0 | 0 | 4 |
| Activity | /api/v1/activity | 3 | 0 | 0 | 0 | 0 | 3 |
| Reports | /api/v1/reports | 3 | 0 | 0 | 0 | 0 | 3 |
| Customers | /api/v1/customers | 2 | 1 | 0 | 1 | 1 | 5 |
| Leads | /api/v1/leads | 3 | 2 | 1 | 0 | 2 | 8 |
| Catalog/Brands | /api/v1/catalog/brands | 2 | 1 | 1 | 0 | 1 | 5 |
| Catalog/Categories | /api/v1/catalog/categories | 3 | 1 | 1 | 0 | 1 | 6 |
| Catalog/Products | /api/v1/catalog/products | 2 | 4 | 3 | 0 | 3 | 12 |
| Catalog/Import | /api/v1/catalog/products/import | 2 | 3 | 0 | 0 | 1 | 6 |
| Forklifts | /api/v1/forklifts | 10 | 7 | 2 | 0 | 2 | 21 |
| Quotations | /api/v1/quotations | 5 | 11 | 3 | 0 | 2 | 21 |
| Rentals | /api/v1/rental-contracts | 8 | 15 | 4 | 0 | 2 | 29 |
| Movements | /api/v1/movements | 2 | 7 | 1 | 0 | 0 | 10 |
| Maintenance | /api/v1/maintenance | 7 | 8 | 2 | 0 | 0 | 17 |
| Inventory | /api/v1/inventory | 9 | 7 | 1 | 0 | 0 | 17 |
| Billing | /api/v1/billing | 8 | 21 | 1 | 0 | 0 | 30 |
| Uploads | /api/v1/uploads | 0 | 1 | 0 | 0 | 0 | 1 |
| Health | / | 1 | 0 | 0 | 0 | 0 | 1 |
| **Total** | | **75** | **93** | **20** | **3** | **17** | **218** |

## Authentication Endpoints

```
POST /api/v1/auth/login          → TokenResponse (username + password)
POST /api/v1/auth/refresh        → TokenResponse (refresh token)
POST /api/v1/auth/logout         → 204 (revoke access token)
```

## Workflow Endpoints (State Machines)

### Quotation Workflow
```
POST → draft
  └→ /submit → under_review
       └→ /approve → approved
            └→ /send → sent
                 ├→ /accept → accepted
                 │    └→ /convert → converted
                 └→ /decline → declined
       └→ /reject → revision_requested
  └→ /cancel → cancelled
```

### Rental Contract Workflow
```
POST → reservation
  └→ /submit → pending_approval
       └→ /approve → approved
            └→ /activate → active
                 ├→ /close → closed
                 └→ /cancel → cancelled
       └→ /reject → revision_requested
```

### Movement Workflow
```
POST → draft
  └→ /prepare → preparing
       └→ /depart → in_transit
            └→ /arrive → arrived
                 └→ /complete → completed
  └→ /cancel → cancelled
```

### Work Order Workflow
```
POST → scheduled
  └→ /start → in_progress
       └→ /complete → completed
            └→ /verify → verified
  └→ /cancel → cancelled
```

## Billing Workflow
```
Invoice: draft → issued → sent → (partially_paid) → paid
         └→ cancelled / voided
Payment: pending → confirmed → (allocated to invoices)
         └→ rejected / refunded
Deposit: pending → received → (refunded / forfeited / applied)
```
