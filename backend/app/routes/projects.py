from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.activity_log import ActionType, EntityType
from app.models.user import User
from app.schemas.project import (
    BOQItemCreate, BOQItemOut, BOQItemUpdate,
    MilestoneCreate, MilestoneOut, MilestoneStatusUpdate, MilestoneUpdate,
    ProjectCreate, ProjectDetail, ProjectListResponse, ProjectOut, ProjectUpdate,
)
from app.services.activity_log_service import ActivityLogService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["Warehouse Projects"])


# ── Projects ─────────────────────────────────────────────────────────────────

@router.get("", response_model=ProjectListResponse, summary="List warehouse projects")
async def list_projects(
    status_filter: str | None = Query(default=None, alias="status"),
    customer_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="created_at", pattern="^(created_at|start_date|end_date|name|status)$"),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_READ),
):
    return await ProjectService(db).list_projects(
        status_filter=status_filter, customer_id=customer_id,
        page=page, page_size=page_size, sort=sort, order=order,
    )


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED, summary="Create project")
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_CREATE),
):
    project = await ProjectService(db).create_project(data, created_by=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.PROJECT_CREATED,
        entity_type=EntityType.PROJECT,
        entity_id=project.id,
        details={"project_number": project.project_number, "name": project.name},
    )
    return ProjectOut.model_validate(project)


@router.get("/{project_id}", response_model=ProjectDetail, summary="Get project detail")
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_READ),
):
    return await ProjectService(db).get_project(project_id)


@router.put("/{project_id}", response_model=ProjectOut, summary="Update project")
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_UPDATE),
):
    project = await ProjectService(db).update_project(project_id, data, updated_by=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.PROJECT_UPDATED,
        entity_type=EntityType.PROJECT,
        entity_id=project.id,
        details={"changed_fields": list(data.model_dump(exclude_unset=True).keys())},
    )
    return ProjectOut.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete project")
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_DELETE),
):
    await ProjectService(db).delete_project(project_id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.PROJECT_DELETED,
        entity_type=EntityType.PROJECT,
        entity_id=project_id,
    )


@router.post("/{project_id}/approve-boq", response_model=ProjectOut, summary="Approve BOQ and advance project status")
async def approve_boq(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_APPROVE),
):
    project = await ProjectService(db).approve_boq(project_id, approved_by=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.PROJECT_UPDATED,
        entity_type=EntityType.PROJECT,
        entity_id=project.id,
        details={"status": project.status},
    )
    return ProjectOut.model_validate(project)


# ── Milestones ───────────────────────────────────────────────────────────────

@router.get("/{project_id}/milestones", response_model=list[MilestoneOut], summary="List milestones")
async def list_milestones(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_READ),
):
    milestones = await ProjectService(db).list_milestones(project_id)
    return [MilestoneOut.model_validate(m) for m in milestones]


@router.post(
    "/{project_id}/milestones", response_model=MilestoneOut,
    status_code=status.HTTP_201_CREATED, summary="Create milestone",
)
async def create_milestone(
    project_id: int,
    data: MilestoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_UPDATE),
):
    milestone = await ProjectService(db).create_milestone(project_id, data)
    return MilestoneOut.model_validate(milestone)


@router.get("/{project_id}/milestones/{milestone_id}", response_model=MilestoneOut, summary="Get milestone")
async def get_milestone(
    project_id: int,
    milestone_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_READ),
):
    milestone = await ProjectService(db).get_milestone(project_id, milestone_id)
    return MilestoneOut.model_validate(milestone)


@router.put("/{project_id}/milestones/{milestone_id}", response_model=MilestoneOut, summary="Update milestone")
async def update_milestone(
    project_id: int,
    milestone_id: int,
    data: MilestoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_UPDATE),
):
    milestone = await ProjectService(db).update_milestone(project_id, milestone_id, data)
    return MilestoneOut.model_validate(milestone)


@router.patch(
    "/{project_id}/milestones/{milestone_id}/status", response_model=MilestoneOut,
    summary="Toggle milestone status",
)
async def update_milestone_status(
    project_id: int,
    milestone_id: int,
    data: MilestoneStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_MILESTONE_UPDATE),
):
    milestone = await ProjectService(db).update_milestone_status(project_id, milestone_id, data)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.PROJECT_MILESTONE_STATUS_CHANGED,
        entity_type=EntityType.PROJECT_MILESTONE,
        entity_id=milestone.id,
        details={"project_id": project_id, "status": milestone.status},
    )
    return MilestoneOut.model_validate(milestone)


@router.delete(
    "/{project_id}/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete milestone",
)
async def delete_milestone(
    project_id: int,
    milestone_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_UPDATE),
):
    await ProjectService(db).delete_milestone(project_id, milestone_id)


# ── BOQ items ────────────────────────────────────────────────────────────────

@router.get("/{project_id}/boq-items", response_model=list[BOQItemOut], summary="List BOQ items")
async def list_boq_items(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_READ),
):
    items = await ProjectService(db).list_boq_items(project_id)
    return [BOQItemOut.model_validate(i) for i in items]


@router.post(
    "/{project_id}/boq-items", response_model=BOQItemOut,
    status_code=status.HTTP_201_CREATED, summary="Add BOQ item",
)
async def create_boq_item(
    project_id: int,
    data: BOQItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_BOQ_MANAGE),
):
    item = await ProjectService(db).create_boq_item(project_id, data)
    return BOQItemOut.model_validate(item)


@router.get("/{project_id}/boq-items/{item_id}", response_model=BOQItemOut, summary="Get BOQ item")
async def get_boq_item(
    project_id: int,
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_READ),
):
    item = await ProjectService(db).get_boq_item(project_id, item_id)
    return BOQItemOut.model_validate(item)


@router.put("/{project_id}/boq-items/{item_id}", response_model=BOQItemOut, summary="Update BOQ item")
async def update_boq_item(
    project_id: int,
    item_id: int,
    data: BOQItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_BOQ_MANAGE),
):
    item = await ProjectService(db).update_boq_item(project_id, item_id, data)
    return BOQItemOut.model_validate(item)


@router.delete(
    "/{project_id}/boq-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete BOQ item",
)
async def delete_boq_item(
    project_id: int,
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.PROJECT_BOQ_MANAGE),
):
    await ProjectService(db).delete_boq_item(project_id, item_id)
