from dataclasses import dataclass

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.partner import Partner


@dataclass
class PartnerFilter:
    q: str | None = None
    partner_type: str | None = None
    is_active: bool | None = True
    page: int = 1
    page_size: int = 20


class PartnerRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_partners(self, f: PartnerFilter) -> tuple[list[Partner], int]:
        stmt = select(Partner)
        if f.is_active is not None:
            stmt = stmt.where(Partner.is_active == f.is_active)
        if f.partner_type:
            stmt = stmt.where(Partner.partner_type == f.partner_type)
        if f.q:
            like = f"%{f.q}%"
            stmt = stmt.where(or_(Partner.name.ilike(like), Partner.phone.ilike(like), Partner.email.ilike(like)))

        count = (await self.db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
        stmt = stmt.order_by(Partner.name.asc()).offset((f.page - 1) * f.page_size).limit(f.page_size)
        return list((await self.db.execute(stmt)).scalars().all()), count

    async def get_partner_by_id(self, partner_id: int) -> Partner | None:
        return await self.db.get(Partner, partner_id)

    async def create_partner(self, partner: Partner) -> Partner:
        self.db.add(partner)
        await self.db.flush()
        await self.db.refresh(partner)
        return partner

    async def update_partner(self, partner: Partner, changes: dict) -> Partner:
        for k, v in changes.items():
            setattr(partner, k, v)
        await self.db.flush()
        await self.db.refresh(partner)
        return partner
