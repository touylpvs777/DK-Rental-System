from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.activity_log import ActionType, EntityType
from app.models.user import User
from app.schemas.customer import Customer360Out, CustomerCreate, CustomerOut, CustomerUpdate
from app.services.activity_log_service import ActivityLogService
from app.services.customer_service import CustomerService

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("/", response_model=list[CustomerOut])
async def list_customers(
    skip: int = 0,
    limit: int = 100,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await CustomerService(db).get_all(skip=skip, limit=limit, q=q)


@router.post("/", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
async def create_customer(
    data: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.CREATE_CUSTOMER),
):
    customer = await CustomerService(db).create(data, created_by=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.CUSTOMER_CREATED,
        entity_type=EntityType.CUSTOMER,
        entity_id=customer.id,
        details={
            "name": f"{customer.first_name} {customer.last_name}",
            "status": customer.status.value,
        },
    )
    return customer


@router.get("/{customer_id}", response_model=CustomerOut)
async def get_customer(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    customer = await CustomerService(db).get_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


@router.get("/{customer_id}/overview", response_model=Customer360Out)
async def get_customer_overview(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Customer 360: profile + forklifts + rental contracts + work orders + invoices."""
    overview = await CustomerService(db).get_360(customer_id)
    if not overview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return overview


@router.patch("/{customer_id}", response_model=CustomerOut)
async def update_customer(
    customer_id: int,
    data: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.EDIT_CUSTOMER),
):
    service = CustomerService(db)
    customer = await service.get_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    changed_fields = list(data.model_dump(exclude_unset=True).keys())
    old_status = customer.status

    customer = await service.update(customer, data)

    activity = ActivityLogService(db)
    await activity.log(
        user_id=current_user.id,
        action=ActionType.CUSTOMER_UPDATED,
        entity_type=EntityType.CUSTOMER,
        entity_id=customer.id,
        details={"changed_fields": changed_fields},
    )
    if "status" in changed_fields and data.status != old_status:
        await activity.log(
            user_id=current_user.id,
            action=ActionType.CUSTOMER_STATUS_CHANGED,
            entity_type=EntityType.CUSTOMER,
            entity_id=customer.id,
            details={"from": old_status.value, "to": data.status.value},
        )
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.DELETE_CUSTOMER),
):
    service = CustomerService(db)
    customer = await service.get_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    name = f"{customer.first_name} {customer.last_name}"
    await service.delete(customer)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.CUSTOMER_DELETED,
        entity_type=EntityType.CUSTOMER,
        entity_id=customer_id,
        details={"name": name},
    )
