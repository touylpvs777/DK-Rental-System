from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.user import User
from app.schemas.partner import PartnerCreate, PartnerListResponse, PartnerOut, PartnerUpdate
from app.services.partner_service import PartnerService

router = APIRouter(prefix="/partners", tags=["Partners (Vendors & Clients)"])


@router.get("", response_model=PartnerListResponse)
async def list_partners(
    q: str | None = None,
    partner_type: str | None = None,
    is_active: bool | None = True,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    return await PartnerService(db).list_partners(q=q, partner_type=partner_type, is_active=is_active, page=page, page_size=page_size)


@router.get("/{partner_id}", response_model=PartnerOut)
async def get_partner(partner_id: int, db: AsyncSession = Depends(get_db), _: User = require_permission(PermissionName.MANAGE_CATALOG)):
    partner = await PartnerService(db).get_partner(partner_id)
    return PartnerOut.model_validate(partner)


@router.post("", response_model=PartnerOut, status_code=status.HTTP_201_CREATED)
async def create_partner(data: PartnerCreate, db: AsyncSession = Depends(get_db), _: User = require_permission(PermissionName.MANAGE_CATALOG)):
    partner = await PartnerService(db).create_partner(data)
    return PartnerOut.model_validate(partner)


@router.put("/{partner_id}", response_model=PartnerOut)
async def update_partner(partner_id: int, data: PartnerUpdate, db: AsyncSession = Depends(get_db), _: User = require_permission(PermissionName.MANAGE_CATALOG)):
    partner = await PartnerService(db).update_partner(partner_id, data)
    return PartnerOut.model_validate(partner)
