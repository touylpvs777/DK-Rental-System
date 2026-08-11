# Database Schema — DK Service CRM

**56 tables · 769+ columns · 143 foreign keys**

## Entity Relationship Overview

```
                        ┌──────────┐
                        │  users   │
                        │ (11 col) │
                        └────┬─────┘
                             │ role_id
                        ┌────┴─────┐
                        │  roles   │
                        │ (6 col)  │
                        └──────────┘

  ┌───────────┐     ┌──────────────┐     ┌───────────────┐
  │ customers  │────→│  quotations   │────→│rental_contracts│
  │ (12 col)   │     │  (30 col)     │     │  (40 col)      │
  └─────┬──────┘     └──────┬───────┘     └──────┬─────────┘
        │                   │                     │
        │            ┌──────┴───────┐      ┌──────┴────────────┐
  ┌─────┴──────┐     │quotation_    │      │rental_contract_   │
  │  leads     │     │  items (17)  │      │  items (20)       │
  │ (11 col)   │     │  history (7) │      │  status_hist (7)  │
  └────┬───────┘     │  approvals(8)│      │  terms (13)       │
       │             └──────────────┘      │  extensions (14)  │
  ┌────┴───────┐                           │  returns (29)     │
  │ lead_notes │                           │  damage_rpts (25) │
  │  (5 col)   │                           │  billing_cyc (24) │
  └────────────┘                           └──────┬────────────┘
                                                  │
                              ┌────────────────────┤
                              │                    │
                        ┌─────┴──────┐      ┌─────┴──────────┐
                        │  invoices   │      │  deposits       │
                        │  (28 col)   │      │  (20 col)       │
                        └─────┬──────┘      └────────────────┘
                              │
                  ┌───────────┤
                  │           │
           ┌──────┴────┐  ┌──┴──────────────┐
           │invoice_   │  │  payments        │
           │ items(13) │  │  (18 col)        │
           └───────────┘  └──┬──────────────┘
                             │
                      ┌──────┴──────────┐
                      │payment_         │
                      │ allocations (6) │
                      └─────────────────┘

  ┌──────────────┐     ┌────────────────┐     ┌───────────────┐
  │  forklifts    │────→│asset_movements │     │  work_orders   │
  │  (25 col)     │     │  (27 col)      │     │  (29 col)      │
  └──────┬────────┘     └───────┬────────┘     └───────┬───────┘
         │                      │                      │
   ┌─────┴──────────┐   ┌──────┴────────┐     ┌───────┴───────┐
   │forklift_specs  │   │movement_      │     │maintenance_   │
   │ (13 col)       │   │ history (10)  │     │ costs (11)    │
   │status_hist (7) │   └───────────────┘     │ schedules(13) │
   │locations (10)  │                         │ plans (13)    │
   │hour_meters (7) │                         └───────────────┘
   │documents (11)  │
   │photos (11)     │     ┌───────────────┐
   │costs (11)      │     │  spare_parts   │
   └────────────────┘     │  (16 col)      │
                          └───────┬───────┘
  ┌──────────────┐                │
  │   brands     │         ┌──────┴───────────┐
  │  (12 col)    │         │inventory_balances │
  └──────────────┘         │ (8 col)           │
                           │transactions (13)  │
  ┌──────────────┐         │purchase_orders(18)│
  │  products    │         │PO_items (9)       │
  │  (21 col)    │         │consumptions (11)  │
  │  specs (8)   │         └──────────────────┘
  │  images (7)  │
  │  compat (4)  │         ┌────────────────┐
  └──────────────┘         │ activity_logs  │
                           │  (7 col)       │
  ┌──────────────┐         └────────────────┘
  │  categories  │
  │  (12 col)    │         ┌────────────────┐
  │  (self-ref)  │         │ revenue_       │
  └──────────────┘         │ recognitions   │
                           │ (18 col)       │
                           └────────────────┘
```

## Tables by Domain

### Auth & RBAC (3 tables)
| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| users | 11 | 1 | User accounts |
| roles | 6 | 0 | RBAC roles (super_admin, manager, sales, support) |
| revoked_tokens | 3 | 0 | JWT blacklist |

### CRM (3 tables)
| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| customers | 12 | 2 | Customer master data |
| leads | 11 | 3 | Sales pipeline leads |
| lead_notes | 5 | 2 | Notes attached to leads |

### Product Catalog (7 tables)
| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| brands | 12 | 0 | Equipment/product brands |
| product_categories | 12 | 1 | 3-level category tree (self-referential) |
| products | 21 | 4 | Product catalog |
| product_specs | 8 | 1 | EAV spec key-value pairs |
| product_images | 7 | 1 | Product photos |
| product_compat_brands | 4 | 2 | Brand compatibility matrix |
| import_jobs + import_errors | 11+6 | 1+1 | Excel bulk import tracking |

### Equipment (9 tables)
| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| forklifts | 25 | 5 | Core forklift asset register |
| forklift_models | 13 | 1 | Model templates |
| forklift_specs | 13 | 1 | Physical specifications (tires, mast, battery) |
| forklift_status_history | 7 | 2 | Status change audit trail |
| forklift_locations | 10 | 3 | Location tracking |
| forklift_hour_meter_logs | 7 | 2 | Hour meter readings |
| forklift_documents | 11 | 2 | Attached documents (warranty, insurance) |
| forklift_photos | 11 | 2 | Equipment photos |
| forklift_ownership_costs | 11 | 2 | TCO tracking |

### Quotations (4 tables)
| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| quotations | 30 | 6 | Sales quotations |
| quotation_items | 17 | 3 | Line items (forklift/product/service) |
| quotation_status_history | 7 | 2 | Workflow audit trail |
| quotation_approvals | 8 | 2 | Approval decisions |

### Rental Contracts (8 tables)
| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| rental_contracts | 40 | 7 | Master contract (largest table) |
| rental_contract_items | 20 | 3 | Equipment line items |
| rental_contract_status_history | 7 | 2 | Status audit |
| rental_contract_terms | 13 | 1 | EAV contract terms |
| rental_extensions | 14 | 3 | Extension requests |
| rental_returns | 29 | 6 | Return inspections |
| rental_damage_reports | 25 | 5 | Damage assessment |
| rental_billing_cycles | 24 | 3 | Billing schedule |

### Movements (2 tables)
| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| asset_movements | 27 | 6 | Delivery/retrieval/transfer |
| movement_history | 10 | 2 | GPS/checkpoint tracking |

### Maintenance (5 tables)
| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| maintenance_plans | 13 | 0 | PM plan templates |
| maintenance_schedules | 13 | 2 | Forklift ↔ plan assignments |
| work_orders | 29 | 7 | Service work orders |
| service_history | 12 | 3 | Completed service records |
| maintenance_costs | 11 | 1 | Cost line items on work orders |

### Inventory (7 tables)
| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| spare_parts | 16 | 1 | Parts catalog |
| warehouses | 9 | 0 | Storage locations |
| inventory_balances | 8 | 2 | Stock levels (part × warehouse) |
| inventory_transactions | 13 | 3 | Stock movements |
| purchase_orders | 18 | 2 | Procurement orders |
| purchase_order_items | 9 | 2 | PO line items |
| part_consumptions | 11 | 5 | Parts used on work orders |

### Billing (6 tables)
| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| invoices | 28 | 4 | Customer invoices |
| invoice_items | 13 | 2 | Invoice line items |
| payments | 18 | 5 | Payment records |
| payment_allocations | 6 | 3 | Payment ↔ invoice mapping |
| deposits | 20 | 6 | Security/advance deposits |
| revenue_recognitions | 18 | 5 | Revenue recognition schedule |

### Audit (1 table)
| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| activity_logs | 7 | 1 | 62 action types, JSON details |
