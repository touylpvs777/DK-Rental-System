import math

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.partner import Partner
from app.repositories.partner_repository import PartnerFilter, PartnerRepository
from app.schemas.partner import PartnerCreate, PartnerListResponse, PartnerOut, PartnerUpdate


class PartnerService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = PartnerRepository(db)

    async def list_partners(
        self, q: str | None = None, partner_type: str | None = None, is_active: bool | None = True,
        page: int = 1, page_size: int = 20,
    ) -> PartnerListResponse:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        f = PartnerFilter(q=q, partner_type=partner_type, is_active=is_active, page=page, page_size=page_size)
        items, total = await self._repo.get_partners(f)
        return PartnerListResponse(
            items=[PartnerOut.model_validate(p) for p in items], total=total, page=page, page_size=page_size,
            pages=math.ceil(total / page_size) if page_size else 1,
        )

    async def get_partner(self, partner_id: int) -> Partner:
        partner = await self._repo.get_partner_by_id(partner_id)
        if partner is None:
            raise HTTPException(status_code=404, detail="Partner not found")
        return partner

    async def create_partner(self, data: PartnerCreate) -> Partner:
        partner = Partner(
            name=data.name.strip(), partner_type=data.partner_type.value,
            address=data.address, phone=data.phone, email=data.email,
        )
        partner = await self._repo.create_partner(partner)
        await self.db.commit()
        return partner

    async def update_partner(self, partner_id: int, data: PartnerUpdate) -> Partner:
        partner = await self.get_partner(partner_id)
        changes = data.model_dump(exclude_unset=True)
        if "partner_type" in changes and changes["partner_type"] is not None:
            changes["partner_type"] = changes["partner_type"].value
        if "name" in changes and changes["name"] is not None:
            changes["name"] = changes["name"].strip()
        partner = await self._repo.update_partner(partner, changes)
        await self.db.commit()
        return partner
