import logging
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.activity_log import ActionType, EntityType
from app.models.user import User
from app.schemas.forklift import (
    CostSummary,
    ForkliftCreate,
    ForkliftDetail,
    ForkliftDocumentCreate,
    ForkliftDocumentOut,
    ForkliftHourMeterLogOut,
    ForkliftListResponse,
    ForkliftLocationCreate,
    ForkliftLocationOut,
    ForkliftOut,
    ForkliftOwnershipCostOut,
    ForkliftPhotoCreate,
    ForkliftPhotoOut,
    ForkliftSpecCreate,
    ForkliftSpecOut,
    ForkliftSpecUpdate,
    ForkliftStatusHistoryOut,
    ForkliftUpdate,
    HourMeterLogCreate,
    OwnershipCostCreate,
)
from app.services.activity_log_service import ActivityLogService
from app.services.forklift_cost_service import ForkliftCostService
from app.services.forklift_document_service import ForkliftDocumentService
from app.services.forklift_hour_meter_service import ForkliftHourMeterService
from app.services.forklift_location_service import ForkliftLocationService
from app.services.forklift_photo_service import ForkliftPhotoService
from app.services.forklift_service import ForkliftService
from app.services.forklift_spec_service import ForkliftSpecService
from app.services.forklift_status_service import ForkliftStatusService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/forklifts", tags=["Forklifts"])


# =============================================================================
# Forklift CRUD
# =============================================================================


@router.get("/", response_model=ForkliftListResponse, summary="List forklifts")
async def list_forklifts(
    q: str | None = Query(default=None, description="Search serial, name, model, internal code"),
    brand_id: int | None = None,
    model_id: int | None = None,
    customer_id: int | None = None,
    status: str | None = Query(default=None, alias="status"),
    ownership_state: str | None = None,
    condition: str | None = None,
    fuel_type: str | None = None,
    is_active: bool | None = True,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = Query(
        default="created_at",
        pattern="^(name_en|serial_number|status|created_at|updated_at|current_hour_meter)$",
    ),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    return await ForkliftService(db).list_forklifts(
        q=q, brand_id=brand_id, model_id=model_id, customer_id=customer_id,
        status_filter=status, ownership_state=ownership_state, condition=condition,
        fuel_type=fuel_type, is_active=is_active, page=page, page_size=page_size,
        sort=sort, order=order,
    )


@router.get("/{forklift_id}", response_model=ForkliftDetail, summary="Get forklift detail")
async def get_forklift(
    forklift_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    return await ForkliftService(db).get_forklift(forklift_id)


@router.post(
    "/",
    response_model=ForkliftOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register new forklift",
)
async def create_forklift(
    data: ForkliftCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_CREATE),
):
    forklift = await ForkliftService(db).create_forklift(data, created_by=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.FORKLIFT_CREATED,
        entity_type=EntityType.FORKLIFT,
        entity_id=forklift.id,
        details={"serial_number": forklift.serial_number, "name_en": forklift.name_en},
    )
    return ForkliftOut.model_validate(forklift)


@router.put("/{forklift_id}", response_model=ForkliftOut, summary="Update forklift")
async def update_forklift(
    forklift_id: int,
    data: ForkliftUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    forklift = await ForkliftService(db).update_forklift(
        forklift_id, data, updated_by=current_user.id,
    )
    changed_fields = list(data.model_dump(exclude_unset=True).keys())
    details: dict = {"changed_fields": changed_fields}
    action = ActionType.FORKLIFT_UPDATED

    if "status" in changed_fields:
        action = ActionType.FORKLIFT_STATUS_CHANGED
        details["to_status"] = forklift.status

    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=action,
        entity_type=EntityType.FORKLIFT,
        entity_id=forklift.id,
        details=details,
    )
    return ForkliftOut.model_validate(forklift)


@router.delete(
    "/{forklift_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete forklift",
)
async def delete_forklift(
    forklift_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_DELETE),
):
    svc = ForkliftService(db)
    detail = await svc.get_forklift(forklift_id)
    serial = detail.serial_number
    await svc.delete_forklift(forklift_id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.FORKLIFT_DELETED,
        entity_type=EntityType.FORKLIFT,
        entity_id=forklift_id,
        details={"serial_number": serial},
    )


# =============================================================================
# Status History (read-only + implicit creation via PUT /forklifts/{id})
# =============================================================================


@router.get(
    "/{forklift_id}/status-history",
    response_model=list[ForkliftStatusHistoryOut],
    summary="List status transitions",
)
async def list_status_history(
    forklift_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    entries = await ForkliftStatusService(db).get_history(forklift_id, skip=skip, limit=limit)
    return [ForkliftStatusHistoryOut.model_validate(e) for e in entries]


# =============================================================================
# Locations
# =============================================================================


@router.get(
    "/{forklift_id}/locations",
    response_model=list[ForkliftLocationOut],
    summary="List location history",
)
async def list_locations(
    forklift_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    locations = await ForkliftLocationService(db).list_locations(forklift_id, skip=skip, limit=limit)
    return [ForkliftLocationOut.model_validate(loc) for loc in locations]


@router.post(
    "/{forklift_id}/locations",
    response_model=ForkliftLocationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Record location",
)
async def create_location(
    forklift_id: int,
    data: ForkliftLocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    loc = await ForkliftLocationService(db).create_location(
        forklift_id, data, recorded_by=current_user.id,
    )
    return ForkliftLocationOut.model_validate(loc)


# =============================================================================
# Hour Meter Logs
# =============================================================================


@router.get(
    "/{forklift_id}/hour-meter-logs",
    response_model=list[ForkliftHourMeterLogOut],
    summary="List hour meter readings",
)
async def list_hour_meter_logs(
    forklift_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    logs = await ForkliftHourMeterService(db).list_logs(forklift_id, skip=skip, limit=limit)
    return [ForkliftHourMeterLogOut.model_validate(log) for log in logs]


@router.post(
    "/{forklift_id}/hour-meter-logs",
    response_model=ForkliftHourMeterLogOut,
    status_code=status.HTTP_201_CREATED,
    summary="Record hour meter reading",
)
async def create_hour_meter_log(
    forklift_id: int,
    data: HourMeterLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    log, warning = await ForkliftHourMeterService(db).create_log(
        forklift_id, data, recorded_by=current_user.id,
    )
    response = ForkliftHourMeterLogOut.model_validate(log)
    return response


# =============================================================================
# Documents
# =============================================================================


@router.get(
    "/{forklift_id}/documents",
    response_model=list[ForkliftDocumentOut],
    summary="List documents",
)
async def list_documents(
    forklift_id: int,
    document_type: str | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    docs = await ForkliftDocumentService(db).list_documents(
        forklift_id, document_type=document_type, skip=skip, limit=limit,
    )
    return [ForkliftDocumentOut.model_validate(d) for d in docs]


@router.post(
    "/{forklift_id}/documents",
    response_model=ForkliftDocumentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Attach document",
)
async def create_document(
    forklift_id: int,
    data: ForkliftDocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    doc = await ForkliftDocumentService(db).create_document(
        forklift_id, data, uploaded_by=current_user.id,
    )
    return ForkliftDocumentOut.model_validate(doc)


# =============================================================================
# Photos
# =============================================================================


@router.get(
    "/{forklift_id}/photos",
    response_model=list[ForkliftPhotoOut],
    summary="List photos",
)
async def list_photos(
    forklift_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    photos = await ForkliftPhotoService(db).list_photos(forklift_id, skip=skip, limit=limit)
    return [ForkliftPhotoOut.model_validate(p) for p in photos]


@router.post(
    "/{forklift_id}/photos",
    response_model=ForkliftPhotoOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add photo",
)
async def create_photo(
    forklift_id: int,
    data: ForkliftPhotoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    photo = await ForkliftPhotoService(db).create_photo(
        forklift_id, data, uploaded_by=current_user.id,
    )
    return ForkliftPhotoOut.model_validate(photo)


# =============================================================================
# Ownership Costs
# =============================================================================


@router.get(
    "/{forklift_id}/costs",
    response_model=list[ForkliftOwnershipCostOut],
    summary="List ownership costs",
)
async def list_costs(
    forklift_id: int,
    cost_type: str | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    costs = await ForkliftCostService(db).list_costs(
        forklift_id, cost_type=cost_type, from_date=from_date, to_date=to_date,
        skip=skip, limit=limit,
    )
    return [ForkliftOwnershipCostOut.model_validate(c) for c in costs]


@router.get(
    "/{forklift_id}/costs/summary",
    response_model=CostSummary,
    summary="TCO summary",
)
async def get_cost_summary(
    forklift_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    return await ForkliftCostService(db).get_summary(forklift_id)


@router.post(
    "/{forklift_id}/costs",
    response_model=ForkliftOwnershipCostOut,
    status_code=status.HTTP_201_CREATED,
    summary="Record ownership cost",
)
async def create_cost(
    forklift_id: int,
    data: OwnershipCostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    cost = await ForkliftCostService(db).create_cost(
        forklift_id, data, recorded_by=current_user.id,
    )
    return ForkliftOwnershipCostOut.model_validate(cost)


# =============================================================================
# Forklift Specifications
# =============================================================================


@router.get(
    "/{forklift_id}/specs",
    response_model=list[ForkliftSpecOut],
    summary="List forklift specifications",
)
async def list_specs(
    forklift_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    return await ForkliftSpecService(db).list_specs(forklift_id)


@router.post(
    "/{forklift_id}/specs",
    response_model=ForkliftSpecOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add forklift specification",
)
async def create_spec(
    forklift_id: int,
    data: ForkliftSpecCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    spec = await ForkliftSpecService(db).create_spec(forklift_id, data)
    return ForkliftSpecOut.model_validate(spec)


@router.put(
    "/{forklift_id}/specs/{spec_id}",
    response_model=ForkliftSpecOut,
    summary="Update forklift specification",
)
async def update_spec(
    forklift_id: int,
    spec_id: int,
    data: ForkliftSpecUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    spec = await ForkliftSpecService(db).update_spec(forklift_id, spec_id, data)
    return ForkliftSpecOut.model_validate(spec)


@router.delete(
    "/{forklift_id}/specs/{spec_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete forklift specification",
)
async def delete_spec(
    forklift_id: int,
    spec_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    await ForkliftSpecService(db).delete_spec(forklift_id, spec_id)
