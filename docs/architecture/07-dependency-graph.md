# Dependency Graph — DK Service CRM

## Backend Dependency Chain

```
Routes (17 files)
  │
  ├──→ Schemas (16 files) ←── Pydantic BaseModel
  │       used for request validation and response serialization
  │
  ├──→ Services (22 files)
  │       │
  │       ├──→ Repositories (16 files)
  │       │       │
  │       │       └──→ Models (52 files) ←── SQLAlchemy Base
  │       │               │
  │       │               └──→ Database Session (AsyncSession)
  │       │                       │
  │       │                       └──→ Config (Settings)
  │       │
  │       └──→ Other Services (cross-service calls)
  │               rental_workflow_service → billing_service
  │               forklift_service → forklift_status_service
  │               quotation_workflow_service → rental_contract_service
  │
  ├──→ Permissions (require_permission)
  │       │
  │       └──→ Dependencies (get_current_user)
  │               │
  │               └──→ Security (JWT decode)
  │
  └──→ Activity Log Service (audit trail)
```

## Cross-Service Dependencies

```
quotation_workflow_service
  ├──→ quotation_service (status transitions)
  └──→ rental_contract_service (convert quotation → contract)

rental_workflow_service
  ├──→ rental_contract_service (status transitions)
  ├──→ billing_service (on_contract_activated → create invoice)
  ├──→ forklift_service (status: in_stock → rented)
  └──→ movement_service (create delivery movement)

billing_service
  ├──→ invoice generation (from billing cycles)
  ├──→ payment processing (allocate → update invoice balance)
  └──→ revenue recognition (schedule entries)

maintenance_service
  ├──→ work_order lifecycle
  ├──→ forklift_hour_meter_service (update readings)
  └──→ inventory_service (part consumption)
```

## Frontend Dependency Chain

```
App.tsx (Router)
  │
  ├──→ Pages (48 lazy-loaded)
  │       │
  │       ├──→ Components (76)
  │       │       │
  │       │       ├──→ UI components (14) — Modal, Toast, Badge, etc.
  │       │       └──→ Domain components (27) — StatusBadges, Cards, etc.
  │       │
  │       ├──→ Hooks (12) — data fetching, state management
  │       │       │
  │       │       └──→ API clients (17) — Axios calls
  │       │               │
  │       │               └──→ client.ts — base Axios instance + interceptors
  │       │
  │       ├──→ Modules (4) — self-contained feature bundles
  │       │       dashboard/, equipment/, inventory/, finance/
  │       │
  │       └──→ Stores (4) — Zustand state
  │               auth, sidebar, theme, toast
  │
  ├──→ Layout — AppLayout > Sidebar + Header + Outlet
  │
  └──→ Providers — ThemeProvider (data-theme attribute)

CSS chain: main.tsx → index.css(@import tokens.css, breakpoints.css) → shared.css → marketplace.css
```

## Backend Python Dependencies (requirements.txt)

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | ≥0.115 | Web framework |
| uvicorn[standard] | ≥0.32 | ASGI server |
| sqlalchemy[asyncio] | ≥2.0.36 | ORM |
| aiosqlite | ≥0.17 | SQLite async driver |
| pydantic[email] | ≥2.10 | Validation |
| pydantic-settings | ≥2.6 | Env config |
| email-validator | ≥2.3 | Email field validation |
| python-jose[cryptography] | ≥3.3 | JWT |
| bcrypt | ≥4.0 | Password hashing |
| alembic | ≥1.14 | Migrations |
| python-multipart | ≥0.0.9 | File uploads |
| openpyxl | ≥3.1 | Excel import/export |

## Frontend npm Dependencies (key)

| Package | Purpose |
|---------|---------|
| react 19 + react-dom 19 | UI framework |
| react-router-dom | Client-side routing |
| axios | HTTP client |
| zustand | State management |
| recharts | Chart library |
| lucide-react | Icon library |
| vite 8 | Build tool |
| typescript 6 | Type safety |
