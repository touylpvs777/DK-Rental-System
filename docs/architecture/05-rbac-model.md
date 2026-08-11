# RBAC Model — DK Service CRM

## Roles (4)

| Role | Description | User Count Target |
|------|-------------|------------------|
| super_admin | Full system access, bypasses all permission checks | 1-2 |
| manager | Full operational access except user management | 2-5 |
| sales | CRM + quotation + rental read/create, no approvals | 5-10 |
| support | Read-only operational access | 5-10 |

## Permissions (32)

| Permission | super_admin | manager | sales | support |
|------------|:-----------:|:-------:|:-----:|:-------:|
| **General** | | | | |
| view_dashboard | ✓ | ✓ | ✓ | ✓ |
| manage_users | ✓ | — | — | — |
| manage_catalog | ✓ | ✓ | — | — |
| **CRM** | | | | |
| create_customer | ✓ | ✓ | ✓ | ✓ |
| edit_customer | ✓ | ✓ | ✓ | ✓ |
| delete_customer | ✓ | ✓ | — | — |
| create_lead | ✓ | ✓ | ✓ | — |
| edit_lead | ✓ | ✓ | ✓ | — |
| delete_lead | ✓ | ✓ | — | — |
| **Equipment** | | | | |
| forklift.read | ✓ | ✓ | ✓ | ✓ |
| forklift.create | ✓ | ✓ | — | — |
| forklift.update | ✓ | ✓ | — | — |
| forklift.delete | ✓ | ✓ | — | — |
| **Quotations** | | | | |
| quotation.read | ✓ | ✓ | ✓ | ✓ |
| quotation.create | ✓ | ✓ | ✓ | — |
| quotation.update | ✓ | ✓ | ✓ | — |
| quotation.delete | ✓ | ✓ | — | — |
| quotation.approve | ✓ | ✓ | — | — |
| quotation.convert | ✓ | ✓ | — | — |
| **Rental** | | | | |
| rental.read | ✓ | ✓ | ✓ | ✓ |
| rental.create | ✓ | ✓ | ✓ | — |
| rental.update | ✓ | ✓ | ✓ | — |
| rental.delete | ✓ | ✓ | — | — |
| rental.approve | ✓ | ✓ | — | — |
| rental.deliver | ✓ | ✓ | — | — |
| rental.inspect | ✓ | ✓ | — | — |
| rental.settle | ✓ | ✓ | — | — |
| **Billing** | | | | |
| billing.read | ✓ | ✓ | ✓ | ✓ |
| billing.create | ✓ | ✓ | — | — |
| billing.update | ✓ | ✓ | — | — |
| billing.approve | ✓ | ✓ | — | — |

## Implementation

- Permissions are **compile-time constants** in `PermissionName` enum
- Role-to-permission mapping is a **frozen dict** in `ROLE_PERMISSIONS`
- `is_superuser=True` bypasses all checks (backward compat with initial admin)
- Enforcement: `require_permission()` dependency factory returns `Depends(_check)`
- Role seeding: `RBACService.seed_roles()` runs on startup

## Missing Permissions (Gaps)

| Area | Missing Permission | Impact |
|------|--------------------|--------|
| Maintenance | `maintenance.read/create/update` | Work orders use `FORKLIFT_UPDATE` as proxy |
| Inventory | `inventory.read/create/update` | No inventory-specific permissions |
| Movements | `movement.read/create/update` | No movement-specific permissions |
| Reports | `reports.read/export` | Uses `VIEW_DASHBOARD` as proxy |
| Uploads | `uploads.create` | Uses `FORKLIFT_UPDATE` as proxy |
