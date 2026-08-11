import enum

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.role import Role, RoleName
from app.models.user import User


class PermissionName(str, enum.Enum):
    VIEW_DASHBOARD = "view_dashboard"
    CREATE_CUSTOMER = "create_customer"
    EDIT_CUSTOMER = "edit_customer"
    DELETE_CUSTOMER = "delete_customer"
    CREATE_LEAD = "create_lead"
    EDIT_LEAD = "edit_lead"
    DELETE_LEAD = "delete_lead"
    MANAGE_USERS = "manage_users"
    MANAGE_CATALOG = "manage_catalog"
    FORKLIFT_READ = "forklift.read"
    FORKLIFT_CREATE = "forklift.create"
    FORKLIFT_UPDATE = "forklift.update"
    FORKLIFT_DELETE = "forklift.delete"
    QUOTATION_READ = "quotation.read"
    QUOTATION_CREATE = "quotation.create"
    QUOTATION_UPDATE = "quotation.update"
    QUOTATION_DELETE = "quotation.delete"
    QUOTATION_APPROVE = "quotation.approve"
    QUOTATION_CONVERT = "quotation.convert"
    SALES_ORDER_READ = "sales_order.read"
    SALES_ORDER_CREATE = "sales_order.create"
    SALES_ORDER_UPDATE = "sales_order.update"
    SALES_ORDER_DELETE = "sales_order.delete"
    DELIVERY_NOTE_READ = "delivery_note.read"
    DELIVERY_NOTE_CREATE = "delivery_note.create"
    DELIVERY_NOTE_UPDATE = "delivery_note.update"
    DELIVERY_NOTE_DELETE = "delivery_note.delete"
    RECEIPT_READ = "receipt.read"
    RECEIPT_CREATE = "receipt.create"
    RECEIPT_UPDATE = "receipt.update"
    RECEIPT_DELETE = "receipt.delete"
    RENTAL_READ = "rental.read"
    RENTAL_CREATE = "rental.create"
    RENTAL_UPDATE = "rental.update"
    RENTAL_DELETE = "rental.delete"
    RENTAL_APPROVE = "rental.approve"
    RENTAL_DELIVER = "rental.deliver"
    RENTAL_INSPECT = "rental.inspect"
    RENTAL_SETTLE = "rental.settle"
    BILLING_READ = "billing.read"
    BILLING_CREATE = "billing.create"
    BILLING_UPDATE = "billing.update"
    BILLING_APPROVE = "billing.approve"
    PROJECT_READ = "project.read"
    PROJECT_CREATE = "project.create"
    PROJECT_UPDATE = "project.update"
    PROJECT_DELETE = "project.delete"
    PROJECT_APPROVE = "project.approve"
    PROJECT_BOQ_MANAGE = "project.boq_manage"
    PROJECT_MILESTONE_UPDATE = "project.milestone_update"
    VIEW_SETTINGS = "settings.view"
    MANAGE_SETTINGS = "settings.manage"
    MANAGE_NOTIFICATION_PREFERENCES = "notification_preferences.manage"


# Design-time mapping — permissions are constants, not runtime config.
# frozenset prevents accidental mutation.
ROLE_PERMISSIONS: dict[RoleName, frozenset[PermissionName]] = {
    RoleName.SUPER_ADMIN: frozenset(PermissionName),  # all permissions
    RoleName.MANAGER: frozenset({
        PermissionName.VIEW_DASHBOARD,
        PermissionName.CREATE_CUSTOMER,
        PermissionName.EDIT_CUSTOMER,
        PermissionName.DELETE_CUSTOMER,
        PermissionName.CREATE_LEAD,
        PermissionName.EDIT_LEAD,
        PermissionName.DELETE_LEAD,
        PermissionName.MANAGE_CATALOG,
        PermissionName.FORKLIFT_READ,
        PermissionName.FORKLIFT_CREATE,
        PermissionName.FORKLIFT_UPDATE,
        PermissionName.FORKLIFT_DELETE,
        PermissionName.QUOTATION_READ,
        PermissionName.QUOTATION_CREATE,
        PermissionName.QUOTATION_UPDATE,
        PermissionName.QUOTATION_DELETE,
        PermissionName.QUOTATION_APPROVE,
        PermissionName.QUOTATION_CONVERT,
        PermissionName.SALES_ORDER_READ,
        PermissionName.SALES_ORDER_CREATE,
        PermissionName.SALES_ORDER_UPDATE,
        PermissionName.SALES_ORDER_DELETE,
        PermissionName.DELIVERY_NOTE_READ,
        PermissionName.DELIVERY_NOTE_CREATE,
        PermissionName.DELIVERY_NOTE_UPDATE,
        PermissionName.DELIVERY_NOTE_DELETE,
        PermissionName.RECEIPT_READ,
        PermissionName.RECEIPT_CREATE,
        PermissionName.RECEIPT_UPDATE,
        PermissionName.RECEIPT_DELETE,
        PermissionName.RENTAL_READ,
        PermissionName.RENTAL_CREATE,
        PermissionName.RENTAL_UPDATE,
        PermissionName.RENTAL_DELETE,
        PermissionName.RENTAL_APPROVE,
        PermissionName.RENTAL_DELIVER,
        PermissionName.RENTAL_INSPECT,
        PermissionName.RENTAL_SETTLE,
        PermissionName.BILLING_READ,
        PermissionName.BILLING_CREATE,
        PermissionName.BILLING_UPDATE,
        PermissionName.BILLING_APPROVE,
        PermissionName.PROJECT_READ,
        PermissionName.PROJECT_CREATE,
        PermissionName.PROJECT_UPDATE,
        PermissionName.PROJECT_DELETE,
        PermissionName.PROJECT_APPROVE,
        PermissionName.PROJECT_BOQ_MANAGE,
        PermissionName.PROJECT_MILESTONE_UPDATE,
        PermissionName.VIEW_SETTINGS,
        PermissionName.MANAGE_SETTINGS,
        PermissionName.MANAGE_NOTIFICATION_PREFERENCES,
    }),
    RoleName.SALES: frozenset({
        PermissionName.VIEW_DASHBOARD,
        PermissionName.CREATE_CUSTOMER,
        PermissionName.EDIT_CUSTOMER,
        PermissionName.CREATE_LEAD,
        PermissionName.EDIT_LEAD,
        PermissionName.FORKLIFT_READ,
        PermissionName.QUOTATION_READ,
        PermissionName.QUOTATION_CREATE,
        PermissionName.QUOTATION_UPDATE,
        PermissionName.SALES_ORDER_READ,
        PermissionName.SALES_ORDER_CREATE,
        PermissionName.SALES_ORDER_UPDATE,
        PermissionName.DELIVERY_NOTE_READ,
        PermissionName.DELIVERY_NOTE_CREATE,
        PermissionName.DELIVERY_NOTE_UPDATE,
        PermissionName.RECEIPT_READ,
        PermissionName.RECEIPT_CREATE,
        PermissionName.RECEIPT_UPDATE,
        PermissionName.RENTAL_READ,
        PermissionName.RENTAL_CREATE,
        PermissionName.RENTAL_UPDATE,
        PermissionName.BILLING_READ,
        PermissionName.PROJECT_READ,
        PermissionName.VIEW_SETTINGS,
    }),
    RoleName.SUPPORT: frozenset({
        PermissionName.VIEW_DASHBOARD,
        PermissionName.CREATE_CUSTOMER,
        PermissionName.EDIT_CUSTOMER,
        PermissionName.FORKLIFT_READ,
        PermissionName.QUOTATION_READ,
        PermissionName.SALES_ORDER_READ,
        PermissionName.DELIVERY_NOTE_READ,
        PermissionName.RECEIPT_READ,
        PermissionName.RENTAL_READ,
        PermissionName.BILLING_READ,
        # "Coordinators/technicians": can see project workflows and toggle
        # milestone status, but not create/approve/edit BOQ.
        PermissionName.PROJECT_READ,
        PermissionName.PROJECT_MILESTONE_UPDATE,
        PermissionName.VIEW_SETTINGS,
    }),
}


def require_permission(permission: PermissionName):
    """
    Dependency factory — returns a FastAPI Depends that enforces one permission.

    Usage:
        current_user: User = require_permission(PermissionName.CREATE_CUSTOMER)

    Rules:
      - is_superuser=True bypasses all checks (backward-compatible with admin account).
      - Users with no role, an inactive role, or insufficient permissions get HTTP 403.
    """
    async def _check(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if current_user.is_superuser:
            return current_user

        if current_user.role_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No role assigned to your account",
            )

        role: Role | None = await db.get(Role, current_user.role_id)
        if role is None or not role.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your role is inactive or does not exist",
            )

        try:
            role_name = RoleName(role.name)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Unrecognised role: {role.name!r}",
            )

        if permission not in ROLE_PERMISSIONS.get(role_name, frozenset()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: '{permission.value}' required",
            )

        return current_user

    return Depends(_check)
