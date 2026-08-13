import logging

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.user import User
from app.schemas.quotation import (
    QuotationCreate,
    QuotationListResponse,
    QuotationResponse,
    QuotationUpdate,
)
from app.services.quotation_service import QuotationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quotations", tags=["Quotations"])


@router.get("/", response_model=QuotationListResponse, summary="List quotations")
async def list_quotations(
    q: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    customer_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_READ),
):
    return await QuotationService(db).list_quotations(
        q=q, status_filter=status_filter, customer_id=customer_id, page=page, page_size=page_size,
    )


@router.post(
    "/",
    response_model=QuotationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create quotation",
)
async def create_quotation(
    data: QuotationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_CREATE),
):
    quotation = await QuotationService(db).create_quotation(data, created_by=current_user.id)
    return QuotationResponse.model_validate(quotation)


@router.get("/{quotation_id}", response_model=QuotationResponse, summary="Get quotation by ID")
async def get_quotation(
    quotation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_READ),
):
    quotation = await QuotationService(db).get_quotation(quotation_id)
    return QuotationResponse.model_validate(quotation)


@router.put("/{quotation_id}", response_model=QuotationResponse, summary="Update quotation")
async def update_quotation(
    quotation_id: int,
    data: QuotationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_UPDATE),
):
    quotation = await QuotationService(db).update_quotation(quotation_id, data)
    return QuotationResponse.model_validate(quotation)


@router.delete("/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete quotation")
async def delete_quotation(
    quotation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_DELETE),
):
    await QuotationService(db).delete_quotation(quotation_id)
