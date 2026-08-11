import logging
import math

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forklift import Forklift, ForkliftStatus
from app.models.forklift_spec import ForkliftSpec
from app.models.forklift_status_history import ForkliftStatusHistory
from app.repositories.forklift_repository import ForkliftFilter, ForkliftRepository
from app.repositories.forklift_status_repository import ForkliftStatusRepository
from app.schemas.forklift import (
    ForkliftCreate,
    ForkliftDetail,
    ForkliftListResponse,
    ForkliftOut,
    ForkliftUpdate,
)
from app.utils.slugify import slugify

logger = logging.getLogger(__name__)

_VALID_SORTS = {"name_en", "serial_number", "status", "created_at", "updated_at", "current_hour_meter"}
_VALID_ORDERS = {"asc", "desc"}

VALID_STATUS_TRANSITIONS: dict[str, set[str]] = {
    ForkliftStatus.IN_STOCK.value: {
        ForkliftStatus.RENTED.value,
        ForkliftStatus.RESERVED.value,
        ForkliftStatus.SOLD.value,
        ForkliftStatus.IN_SERVICE.value,
        ForkliftStatus.DECOMMISSIONED.value,
    },
    ForkliftStatus.RENTED.value: {
        ForkliftStatus.IN_STOCK.value,
        ForkliftStatus.IN_SERVICE.value,
        ForkliftStatus.SOLD.value,
    },
    ForkliftStatus.RESERVED.value: {
        ForkliftStatus.IN_STOCK.value,
        ForkliftStatus.RENTED.value,
        ForkliftStatus.SOLD.value,
    },
    ForkliftStatus.IN_SERVICE.value: {
        ForkliftStatus.IN_STOCK.value,
        ForkliftStatus.RENTED.value,
        ForkliftStatus.DECOMMISSIONED.value,
    },
    ForkliftStatus.SOLD.value: set(),
    ForkliftStatus.DECOMMISSIONED.value: set(),
}


class ForkliftService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = ForkliftRepository(db)
        self._status_repo = ForkliftStatusRepository(db)

    # ── List ─────────────────────────────────────────────────────────────────

    async def list_forklifts(
        self,
        q: str | None = None,
        brand_id: int | None = None,
        model_id: int | None = None,
        customer_id: int | None = None,
        status_filter: str | None = None,
        ownership_state: str | None = None,
        condition: str | None = None,
        fuel_type: str | None = None,
        is_active: bool | None = True,
        page: int = 1,
        page_size: int = 20,
        sort: str = "created_at",
        order: str = "desc",
    ) -> ForkliftListResponse:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        sort = sort if sort in _VALID_SORTS else "created_at"
        order = order if order in _VALID_ORDERS else "desc"

        f = ForkliftFilter(
            q=q,
            brand_id=brand_id,
            model_id=model_id,
            customer_id=customer_id,
            status=status_filter,
            ownership_state=ownership_state,
            condition=condition,
            fuel_type=fuel_type,
            is_active=is_active,
            page=page,
            page_size=page_size,
            sort=sort,
            order=order,
        )
        forklifts, total = await self._repo.get_list(f)
        pages = math.ceil(total / page_size) if page_size else 1

        items = [self._to_out(fl) for fl in forklifts]
        return ForkliftListResponse(
            items=items, total=total, page=page, page_size=page_size, pages=pages,
        )

    # ── Single item ──────────────────────────────────────────────────────────

    async def get_forklift(self, forklift_id: int) -> ForkliftDetail:
        forklift = await self._repo.get_detail(forklift_id)
        if forklift is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Forklift not found",
            )
        return self._to_detail(forklift)

    # ── Create ───────────────────────────────────────────────────────────────

    async def create_forklift(self, data: ForkliftCreate, created_by: int) -> Forklift:
        if data.purchase_date and data.warranty_expiry:
            if data.warranty_expiry < data.purchase_date:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Warranty expiry must be after purchase date.",
                )

        slug = slugify(data.serial_number)
        if await self._repo.slug_exists(slug):
            base = slug
            counter = 2
            while await self._repo.slug_exists(f"{base}-{counter}"):
                counter += 1
            slug = f"{base}-{counter}"

        forklift = Forklift(
            serial_number=data.serial_number.strip(),
            slug=slug,
            internal_code=data.internal_code,
            name_en=data.name_en.strip(),
            name_lo=data.name_lo,
            model_number=data.model_number,
            model_id=data.model_id,
            brand_id=data.brand_id,
            customer_id=data.customer_id,
            status=data.status.value,
            ownership_state=data.ownership_state.value,
            condition=data.condition.value,
            fuel_type=data.fuel_type.value if data.fuel_type else None,
            capacity_kg=data.capacity_kg,
            year_manufactured=data.year_manufactured,
            purchase_date=data.purchase_date,
            warranty_expiry=data.warranty_expiry,
            initial_hour_meter=data.initial_hour_meter,
            current_hour_meter=data.current_hour_meter,
            notes=data.notes,
            created_by=created_by,
            updated_by=created_by,
        )
        try:
            forklift = await self._repo.create(forklift)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A forklift with this serial number already exists.",
            )

        await self._status_repo.create(ForkliftStatusHistory(
            forklift_id=forklift.id,
            from_status=None,
            to_status=data.status.value,
            reason="Initial registration",
            changed_by=created_by,
        ))

        if data.specs:
            for spec_data in data.specs:
                spec = ForkliftSpec(
                    forklift_id=forklift.id,
                    **spec_data.model_dump(),
                )
                self.db.add(spec)
            await self.db.flush()

        await self.db.commit()
        return forklift

    # ── Update ───────────────────────────────────────────────────────────────

    async def update_forklift(
        self, forklift_id: int, data: ForkliftUpdate, updated_by: int,
    ) -> Forklift:
        forklift = await self._require(forklift_id)
        changes = data.model_dump(exclude_unset=True)

        if "status" in changes:
            new_status_value = changes["status"].value
            self._validate_transition(forklift.status, new_status_value)
            changes["status"] = new_status_value
        if "ownership_state" in changes:
            changes["ownership_state"] = changes["ownership_state"].value
        if "condition" in changes:
            changes["condition"] = changes["condition"].value
        if "fuel_type" in changes and changes["fuel_type"] is not None:
            changes["fuel_type"] = changes["fuel_type"].value

        purchase = changes.get("purchase_date", forklift.purchase_date)
        warranty = changes.get("warranty_expiry", forklift.warranty_expiry)
        if purchase and warranty and warranty < purchase:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Warranty expiry must be after purchase date.",
            )

        old_status = forklift.status
        new_status = changes.get("status")

        if "serial_number" in changes:
            new_slug = slugify(changes["serial_number"])
            if await self._repo.slug_exists(new_slug, exclude_id=forklift_id):
                base = new_slug
                counter = 2
                while await self._repo.slug_exists(f"{base}-{counter}", exclude_id=forklift_id):
                    counter += 1
                new_slug = f"{base}-{counter}"
            changes["slug"] = new_slug

        changes["updated_by"] = updated_by
        try:
            forklift = await self._repo.update(forklift, changes)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Update conflicts with an existing forklift.",
            )

        if new_status and new_status != old_status:
            await self._status_repo.create(ForkliftStatusHistory(
                forklift_id=forklift.id,
                from_status=old_status,
                to_status=new_status,
                changed_by=updated_by,
            ))

        await self.db.commit()
        return forklift

    # ── Delete ───────────────────────────────────────────────────────────────

    async def delete_forklift(self, forklift_id: int) -> None:
        forklift = await self._require(forklift_id)
        await self._repo.delete(forklift)
        await self.db.commit()

    # ── Helpers ──────────────────────────────────────────────────────────────

    async def _require(self, forklift_id: int) -> Forklift:
        forklift = await self._repo.get_by_id(forklift_id)
        if forklift is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Forklift not found",
            )
        return forklift

    @staticmethod
    def _validate_transition(from_status: str, to_status: str) -> None:
        allowed = VALID_STATUS_TRANSITIONS.get(from_status, set())
        if to_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Invalid status transition: '{from_status}' → '{to_status}'.",
            )

    @staticmethod
    def _to_out(forklift: Forklift) -> ForkliftOut:
        obj = ForkliftOut.model_validate(forklift)
        primary = next(
            (p.image_url for p in forklift.photos if p.is_primary),
            forklift.photos[0].image_url if forklift.photos else None,
        )
        obj.primary_photo_url = primary
        return obj

    @staticmethod
    def _to_detail(forklift: Forklift) -> ForkliftDetail:
        obj = ForkliftDetail.model_validate(forklift)

        primary = next(
            (p.image_url for p in forklift.photos if p.is_primary),
            forklift.photos[0].image_url if forklift.photos else None,
        )
        obj.primary_photo_url = primary
        obj.recent_status_history = forklift.status_history[:10]
        obj.current_location = forklift.locations[0] if forklift.locations else None

        if forklift.specs:
            first_spec = forklift.specs[0]
            obj.mast_type = first_spec.mast_type
            obj.max_lift_height_mm = first_spec.max_lift_height_mm

        return obj
