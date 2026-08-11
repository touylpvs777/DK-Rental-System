from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.activity_log import ActionType, EntityType
from app.models.lead import LeadSource, LeadStatus
from app.models.user import User
from app.schemas.lead import (
    LeadCreate,
    LeadDetail,
    LeadNoteCreate,
    LeadNoteOut,
    LeadOut,
    LeadUpdate,
)
from app.services.activity_log_service import ActivityLogService
from app.services.lead_service import LeadService

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.get("/", response_model=list[LeadOut])
async def list_leads(
    skip: int = 0,
    limit: int = 100,
    status: LeadStatus | None = None,
    source: LeadSource | None = None,
    assigned_to: int | None = None,
    customer_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await LeadService(db).get_all(
        skip=skip,
        limit=limit,
        status=status,
        source=source,
        assigned_to=assigned_to,
        customer_id=customer_id,
    )


@router.post("/", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
async def create_lead(
    data: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.CREATE_LEAD),
):
    lead = await LeadService(db).create(data, created_by=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.LEAD_CREATED,
        entity_type=EntityType.LEAD,
        entity_id=lead.id,
        details={"title": lead.title, "status": lead.status.value},
    )
    return lead


@router.get("/{lead_id}", response_model=LeadDetail)
async def get_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    lead = await LeadService(db).get_by_id_with_detail(lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead


@router.put("/{lead_id}", response_model=LeadOut)
async def update_lead(
    lead_id: int,
    data: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.EDIT_LEAD),
):
    service = LeadService(db)
    lead = await service.get_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    changed_fields = list(data.model_dump(exclude_unset=True).keys())
    old_status = lead.status

    lead = await service.update(lead, data)

    activity = ActivityLogService(db)
    await activity.log(
        user_id=current_user.id,
        action=ActionType.LEAD_UPDATED,
        entity_type=EntityType.LEAD,
        entity_id=lead.id,
        details={"changed_fields": changed_fields},
    )
    if "status" in changed_fields and data.status != old_status:
        await activity.log(
            user_id=current_user.id,
            action=ActionType.LEAD_STATUS_CHANGED,
            entity_type=EntityType.LEAD,
            entity_id=lead.id,
            details={"from": old_status.value, "to": data.status.value},
        )
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.DELETE_LEAD),
):
    service = LeadService(db)
    lead = await service.get_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    title = lead.title
    await service.delete(lead)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.LEAD_DELETED,
        entity_type=EntityType.LEAD,
        entity_id=lead_id,
        details={"title": title},
    )


# ── Notes ──────────────────────────────────────────────────────────────────────


@router.get("/{lead_id}/notes", response_model=list[LeadNoteOut])
async def list_notes(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    service = LeadService(db)
    lead = await service.get_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return await service.get_notes(lead_id)


@router.post(
    "/{lead_id}/notes",
    response_model=LeadNoteOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_note(
    lead_id: int,
    data: LeadNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = LeadService(db)
    lead = await service.get_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    note = await service.add_note(lead_id, data, author_id=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.LEAD_NOTE_ADDED,
        entity_type=EntityType.NOTE,
        entity_id=note.id,
        details={"lead_id": lead_id, "lead_title": lead.title},
    )
    return note


@router.delete(
    "/{lead_id}/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_note(
    lead_id: int,
    note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = LeadService(db)
    lead = await service.get_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    note = await service.get_note(note_id)
    if not note or note.lead_id != lead_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    if note.author_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    await service.delete_note(note)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.LEAD_NOTE_DELETED,
        entity_type=EntityType.NOTE,
        entity_id=note_id,
        details={"lead_id": lead_id, "lead_title": lead.title},
    )
