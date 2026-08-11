from datetime import date, datetime, time

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.dependencies import get_current_superuser, get_current_user
from app.models.activity_log import ActionType, EntityType
from app.models.user import User
from app.schemas.activity_log import ActivityLogOut
from app.services.activity_log_service import ActivityLogService

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("/", response_model=list[ActivityLogOut], summary="All activity (superuser)")
async def list_activity(
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    user_id: int | None = Query(default=None),
    action: ActionType | None = Query(default=None),
    entity_type: EntityType | None = Query(default=None),
    entity_id: int | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    return await ActivityLogService(db).get_all(
        skip=skip,
        limit=limit,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        from_date=datetime.combine(from_date, time.min) if from_date else None,
        to_date=datetime.combine(to_date, time.max) if to_date else None,
    )


@router.get("/me", response_model=list[ActivityLogOut], summary="My own activity")
async def my_activity(
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    action: ActionType | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ActivityLogService(db).get_all(
        skip=skip,
        limit=limit,
        user_id=current_user.id,
        action=action,
        from_date=datetime.combine(from_date, time.min) if from_date else None,
        to_date=datetime.combine(to_date, time.max) if to_date else None,
    )


@router.get(
    "/entity/{entity_type}/{entity_id}",
    response_model=list[ActivityLogOut],
    summary="History for a specific record",
)
async def entity_history(
    entity_type: EntityType,
    entity_id: int,
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await ActivityLogService(db).get_by_entity(
        entity_type=entity_type,
        entity_id=entity_id,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/user/{user_id}",
    response_model=list[ActivityLogOut],
    summary="Activity for a specific user (superuser)",
)
async def user_activity(
    user_id: int,
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    action: ActionType | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    return await ActivityLogService(db).get_all(
        skip=skip,
        limit=limit,
        user_id=user_id,
        action=action,
        from_date=datetime.combine(from_date, time.min) if from_date else None,
        to_date=datetime.combine(to_date, time.max) if to_date else None,
    )
