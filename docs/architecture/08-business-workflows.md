# Business Workflows — DK Service CRM

## 1. Sales Pipeline (Lead → Quotation → Contract)

```
┌─────────┐    qualify     ┌──────────────┐   approve    ┌───────────────┐
│  LEAD    │──────────────→│  QUOTATION   │────────────→│ RENTAL        │
│          │               │              │  convert     │ CONTRACT      │
│ new      │               │ draft        │─────────────→│               │
│ contacted│               │ under_review │              │ reservation   │
│ qualified│               │ approved     │              │ pending_appr  │
│ proposal │               │ sent         │              │ approved      │
│ won ✓    │               │ accepted     │              │ active ★      │
│ lost ✗   │               │ declined     │              │ closed        │
└─────────┘               │ converted ✓  │              │ cancelled     │
                           │ cancelled    │              └───────────────┘
                           └──────────────┘
```

## 2. Equipment Lifecycle

```
Register                    Rent Out                Return
   │                           │                       │
   ▼                           ▼                       ▼
┌─────────┐  reserve    ┌───────────┐  return    ┌──────────┐
│ IN_STOCK │───────────→│  RENTED    │──────────→│ IN_STOCK  │
│          │            │           │            │          │
│          │←───────────│           │            │          │
│          │  available  │           │            │          │
└────┬─────┘            └─────┬─────┘            └──────────┘
     │                        │
     ▼ sell                   ▼ service
┌─────────┐            ┌───────────┐
│  SOLD    │            │IN_SERVICE │
│ (final)  │            │           │
└─────────┘            └───────────┘

     ▼ decommission
┌─────────────────┐
│ DECOMMISSIONED  │
│ (final)         │
└─────────────────┘
```

## 3. Rental Operations

```
CONTRACT ACTIVATED
       │
       ├──→ Create DELIVERY movement
       │       draft → preparing → in_transit → arrived → completed
       │
       ├──→ Generate BILLING CYCLES
       │       pending → invoiced → paid
       │
       ├──→ Track HOUR METER readings
       │       → trigger PM schedules
       │
       ├──→ Handle EXTENSIONS
       │       pending → approved/rejected
       │
       └──→ Process RETURN
               requested → picked_up → received → completed
               │
               └──→ DAMAGE REPORTS
                       none → assessed → disputed → resolved
                       │
                       └──→ Generate DAMAGE INVOICE
```

## 4. Billing Cycle

```
Contract Active
    │
    ▼
Generate Billing Cycle (monthly)
    │
    ▼
Create INVOICE (draft)
    │
    ▼ issue
INVOICE (issued)
    │
    ▼ send
INVOICE (sent → customer)
    │
    ├──→ Record PAYMENT
    │       pending → confirmed
    │       │
    │       └──→ ALLOCATE to invoice
    │               → update invoice balance
    │               → if balance = 0 → PAID
    │
    ├──→ DEPOSIT handling
    │       pending → received → (applied / refunded / forfeited)
    │
    └──→ REVENUE RECOGNITION
            scheduled → recognized (accrual-based)
```

## 5. Maintenance Operations

```
PM Plan Template
    │
    ▼ assign to forklift
Schedule (next_due_date / next_due_hours)
    │
    ▼ trigger
WORK ORDER
    │
    ▼ schedule
┌────────────┐
│ SCHEDULED  │
└─────┬──────┘
      │ start
      ▼
┌────────────┐    consume     ┌──────────────┐
│IN_PROGRESS │───────────────→│ INVENTORY    │
│            │  spare parts   │ Transaction  │
└─────┬──────┘               │ (issue)      │
      │ complete             └──────────────┘
      ▼
┌────────────┐
│ COMPLETED  │──→ Record SERVICE HISTORY
└─────┬──────┘──→ Update HOUR METER
      │ verify    → Create MAINTENANCE COSTS
      ▼
┌────────────┐
│ VERIFIED   │──→ Update NEXT schedule date
└────────────┘
```

## 6. Inventory Management

```
                    ┌──────────────┐
Supplier ──────────→│ PURCHASE     │
                    │ ORDER        │
                    │ draft→ordered│
                    │ →received    │
                    └──────┬───────┘
                           │ receive
                           ▼
                    ┌──────────────┐
                    │ INVENTORY    │
                    │ BALANCE      │
                    │ (part×whse)  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
         ┌─────────┐ ┌─────────┐ ┌──────────┐
         │ ISSUE   │ │TRANSFER │ │ CONSUME  │
         │ to WO   │ │ between │ │ on site  │
         │         │ │ warehou │ │          │
         └─────────┘ └─────────┘ └──────────┘

         Transaction types: receive, issue, adjust, transfer, return, consume
```

## 7. Product Catalog Import

```
Upload Excel (.xlsx)
    │
    ▼
PREVIEW (parse sheets → validate rows)
    │
    ├──→ valid_rows[] — ready to import
    │
    └──→ error_rows[] — row-level errors
    │
    ▼ execute
IMPORT
    │
    ├──→ Create/Update BRANDS
    ├──→ Create/Update CATEGORIES (3-level tree)
    └──→ Create/Update PRODUCTS + specs + images + compat_brands
    │
    ▼
RESULT (success_count, error_count, ImportJob record)
```
