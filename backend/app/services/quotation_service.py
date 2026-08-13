import logging
import math
import time

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quotation import Quotation
from app.repositories.forklift_repository import ForkliftRepository
from app.repositories.quotation_repository import QuotationFilter, QuotationRepository
from app.schemas.quotation import (
    QuotationCreate,
    QuotationListResponse,
    QuotationResponse,
    QuotationUpdate,
)
from app.services.customer_service import CustomerService

logger = logging.getLogger(__name__)


class QuotationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = QuotationRepository(db)
        self._customer_service = CustomerService(db)
        self._forklift_repo = ForkliftRepository(db)

    async def list_quotations(
        self,
        q: str | None = None,
        status_filter: str | None = None,
        customer_id: int | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> QuotationListResponse:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        f = QuotationFilter(q=q, status=status_filter, customer_id=customer_id, page=page, page_size=page_size)
        items, total = await self._repo.get_all(f)
        pages = math.ceil(total / page_size) if page_size else 1
        return QuotationListResponse(
            items=[QuotationResponse.model_validate(x) for x in items],
            total=total, page=page, page_size=page_size, pages=pages,
        )

    async def get_quotation(self, quotation_id: int) -> Quotation:
        quotation = await self._repo.get_by_id(quotation_id)
        if quotation is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")
        return quotation

    async def create_quotation(self, data: QuotationCreate, created_by: int) -> Quotation:
        if data.expected_end_date <= data.expected_start_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="expected_end_date must be after expected_start_date.",
            )

        customer = await self._customer_service.get_by_id(data.customer_id)
        if customer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        if data.forklift_id is not None:
            forklift = await self._forklift_repo.get_by_id(data.forklift_id)
            if forklift is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forklift not found")

        number = await self._generate_number()
        quotation = Quotation(
            quotation_no=number,
            customer_id=data.customer_id,
            forklift_id=data.forklift_id,
            expected_start_date=data.expected_start_date,
            expected_end_date=data.expected_end_date,
            rental_price=data.rental_price,
            daily_hours_quota=data.daily_hours_quota,
            status=data.status.value,
            notes=data.notes,
            created_by=created_by,
        )
        try:
            quotation = await self._repo.create(quotation)
            await self.db.commit()
            return await self._repo.get_by_id(quotation.id)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Quotation number conflict. Please retry.")

    async def update_quotation(self, quotation_id: int, data: QuotationUpdate) -> Quotation:
        quotation = await self.get_quotation(quotation_id)
        changes = data.model_dump(exclude_unset=True)

        sd = changes.get("expected_start_date", quotation.expected_start_date)
        ed = changes.get("expected_end_date", quotation.expected_end_date)
        if sd and ed and ed <= sd:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="expected_end_date must be after expected_start_date.",
            )

        if "forklift_id" in changes and changes["forklift_id"] is not None:
            forklift = await self._forklift_repo.get_by_id(changes["forklift_id"])
            if forklift is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forklift not found")
        if "customer_id" in changes:
            customer = await self._customer_service.get_by_id(changes["customer_id"])
            if customer is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        if "status" in changes and changes["status"] is not None:
            changes["status"] = changes["status"].value

        quotation = await self._repo.update(quotation, changes)
        await self.db.commit()
        return await self._repo.get_by_id(quotation.id)

    async def delete_quotation(self, quotation_id: int) -> None:
        quotation = await self.get_quotation(quotation_id)
        await self._repo.delete(quotation)
        await self.db.commit()

    async def _generate_number(self) -> str:
        year_month = time.strftime("%Y%m")
        base = f"QT-{year_month}"
        seq = 1
        while await self._repo.number_exists(f"{base}-{seq:03d}"):
            seq += 1
        return f"{base}-{seq:03d}"
