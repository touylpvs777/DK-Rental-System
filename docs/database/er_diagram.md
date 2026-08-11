# ER Diagram — DK Service Enterprise Platform

> Rendered Mermaid source: [`er-diagram.mmd`](er-diagram.mmd) (all 56 tables with columns)

## Domain Map

```mermaid
graph LR
    subgraph "Foundation"
        AUTH["Auth\n3 tables"]
        CRM["CRM\n4 tables"]
    end

    subgraph "Catalog & Assets"
        CAT["Catalog\n8 tables"]
        EQ["Equipment\n9 tables"]
    end

    subgraph "Sales Pipeline"
        QT["Quotation\n4 tables"]
        RT["Rental\n8 tables"]
    end

    subgraph "Operations"
        MV["Movement\n2 tables"]
        MT["Maintenance\n6 tables"]
        INV["Inventory\n6 tables"]
    end

    subgraph "Finance"
        BL["Billing\n6 tables"]
    end

    AUTH -.->|"user FK on\nevery domain"| CRM
    CRM -->|"customer_id\nlead_id"| QT
    CRM -->|"customer_id"| RT
    CRM -->|"customer_id"| BL
    CAT -->|"brand_id"| EQ
    CAT -->|"brand_id"| INV
    EQ -->|"forklift_id"| QT
    EQ -->|"forklift_id"| RT
    EQ -->|"forklift_id"| MV
    EQ -->|"forklift_id"| MT
    QT -->|"convert"| RT
    RT -->|"on_activate"| BL
    RT -->|"delivery"| MV
    MT -->|"part_consumption"| INV
    RT -->|"billing_cycle"| BL

    classDef auth fill:#ef4444,color:#fff
    classDef crm fill:#3b82f6,color:#fff
    classDef catalog fill:#8b5cf6,color:#fff
    classDef ops fill:#059669,color:#fff
    classDef fin fill:#d97706,color:#fff
    class AUTH auth
    class CRM crm
    class CAT,EQ catalog
    class QT,RT,MV,MT,INV ops
    class BL fin
```

## Table Counts by Domain

| # | Domain | Tables | Total Columns | FKs | Relationships |
|---|--------|--------|--------------|-----|---------------|
| 1 | Auth | 3 | 24 | 1 | users → roles |
| 2 | CRM | 4 | 38 | 7 | customers ← leads ← lead_notes, activity_logs |
| 3 | Catalog | 8 | 74 | 9 | brands → products ← categories, specs, images, compat, import |
| 4 | Equipment | 9 | 98 | 18 | forklifts ← specs, photos, docs, locations, hours, costs, status |
| 5 | Quotation | 4 | 60 | 12 | quotations ← items, approvals, status_history |
| 6 | Rental | 8 | 163 | 30 | contracts ← items, terms, status, extensions, returns, damage, cycles |
| 7 | Movement | 2 | 30 | 7 | movements ← movement_history |
| 8 | Maintenance | 6 | 74 | 14 | plans → schedules → work_orders ← costs, service_history, consumption |
| 9 | Inventory | 6 | 56 | 10 | parts ← balances, transactions, PO_items; warehouses; purchase_orders |
| 10 | Billing | 6 | 91 | 16 | invoices ← items, allocations; payments; deposits; revenue_recognitions |
| | **Total** | **56** | **708** | **124** | |

## Relationship Types

```mermaid
graph TD
    subgraph "CASCADE — child deleted with parent"
        P1["quotation → quotation_items"]
        P2["rental_contract → rental_contract_items"]
        P3["forklift → forklift_specs"]
        P4["invoice → invoice_items"]
        P5["work_order → maintenance_costs"]
        P6["product → product_specs"]
    end

    subgraph "RESTRICT — parent cannot be deleted"
        R1["customer ← invoices"]
        R2["customer ← rental_contracts"]
        R3["rental_contract ← invoices"]
        R4["forklift ← work_orders"]
        R5["forklift ← asset_movements"]
    end

    subgraph "SET NULL — reference cleared"
        S1["user ← forklifts.created_by"]
        S2["brand ← products.brand_id"]
        S3["customer ← leads.customer_id"]
    end

    classDef cascade fill:#ef4444,color:#fff
    classDef restrict fill:#f59e0b,color:#000
    classDef setnull fill:#3b82f6,color:#fff
    class P1,P2,P3,P4,P5,P6 cascade
    class R1,R2,R3,R4,R5 restrict
    class S1,S2,S3 setnull
```

## FK Cascade Summary

| ON DELETE | Count | Pattern |
|-----------|-------|---------|
| CASCADE | 28 | All child/detail tables — items, specs, costs, history, notes |
| SET NULL | 78 | User references (created_by, assigned_to), optional brand/category/lead refs |
| RESTRICT | 8 | Critical financial links — invoices→contracts, invoices→customers, movements→forklifts, work_orders→forklifts |
| No explicit (DB default) | 10 | Early models (users.role_id, customers.assigned_to, leads FKs) — behaves as NO ACTION |

## Circular Reference Analysis

No true circular FKs exist. The closest pattern:
- `rental_contracts` → `billing_service` (runtime hook, not FK)
- `billing_service` reads `rental_billing_cycles` (FK is cycle→contract, one-directional)
- `quotations.converted_to_id` is a plain INTEGER with no FK constraint (polymorphic reference)

All FK chains are acyclic. Table creation order follows the dependency graph without conflicts.
