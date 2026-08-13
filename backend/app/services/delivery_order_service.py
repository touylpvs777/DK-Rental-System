import logging
import math
import time

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.delivery_checklist import DeliveryChecklist
from app.models.delivery_order import DeliveryOrder
from app.repositories.delivery_order_repository import DeliveryOrderFilter, DeliveryOrderRepository
from app.repositories.rental_repository import RentalRepository
from app.schemas.delivery_order import (
    DeliveryChecklistItemCreate,
    DeliveryOrderCreate,
    DeliveryOrderListResponse,
    DeliveryOrderResponse,
    DeliveryOrderUpdate,
)

logger = logging.getLogger(__name__)


class DeliveryOrderService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = DeliveryOrderRepository(db)
        self._contract_repo = RentalRepository(db)

    async def list_delivery_orders(
        self,
        q: str | None = None,
        status_filter: str | None = None,
        contract_id: int | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> DeliveryOrderListResponse:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        f = DeliveryOrderFilter(q=q, status=status_filter, contract_id=contract_id, page=page, page_size=page_size)
        items, total = await self._repo.get_all(f)
        pages = math.ceil(total / page_size) if page_size else 1
        return DeliveryOrderListResponse(
            items=[DeliveryOrderResponse.model_validate(x) for x in items],
            total=total, page=page, page_size=page_size, pages=pages,
        )

    async def get_delivery_order(self, delivery_order_id: int) -> DeliveryOrder:
        delivery_order = await self._repo.get_by_id(delivery_order_id)
        if delivery_order is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery order not found")
        return delivery_order

    async def create_delivery_order(self, data: DeliveryOrderCreate, created_by: int) -> DeliveryOrder:
        contract = await self._contract_repo.get_by_id(data.contract_id)
        if contract is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental contract not found")

        number = await self._generate_number()
        delivery_order = DeliveryOrder(
            do_no=number,
            contract_id=data.contract_id,
            order_type=data.order_type.value,
            delivery_date=data.delivery_date,
            delivery_address=data.delivery_address,
            driver_name=data.driver_name,
            status=data.status.value,
            notes=data.notes,
            created_by=created_by,
        )
        for item in data.checklist_items or []:
            delivery_order.checklist_items.append(self._build_checklist_item(item))

        try:
            delivery_order = await self._repo.create(delivery_order)
            await self.db.commit()
            return await self._repo.get_by_id(delivery_order.id)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Delivery order number conflict. Please retry.")

    async def update_delivery_order(self, delivery_order_id: int, data: DeliveryOrderUpdate) -> DeliveryOrder:
        delivery_order = await self.get_delivery_order(delivery_order_id)
        changes = data.model_dump(exclude_unset=True, exclude={"checklist_items"})
        if "status" in changes and changes["status"] is not None:
            changes["status"] = changes["status"].value
        if "order_type" in changes and changes["order_type"] is not None:
            changes["order_type"] = changes["order_type"].value

        delivery_order = await self._repo.update(delivery_order, changes)

        if data.checklist_items is not None:
            new_items = [self._build_checklist_item(item) for item in data.checklist_items]
            await self._repo.replace_checklist_items(delivery_order, new_items)

        await self.db.commit()
        return await self._repo.get_by_id(delivery_order.id)

    async def delete_delivery_order(self, delivery_order_id: int) -> None:
        delivery_order = await self.get_delivery_order(delivery_order_id)
        await self._repo.delete(delivery_order)
        await self.db.commit()

    @staticmethod
    def _build_checklist_item(item: DeliveryChecklistItemCreate) -> DeliveryChecklist:
        return DeliveryChecklist(
            item_group=item.item_group.strip(),
            item_name=item.item_name.strip(),
            is_passed=item.is_passed,
            remark=item.remark,
        )

    async def _generate_number(self) -> str:
        year_month = time.strftime("%Y%m")
        base = f"DO-{year_month}"
        seq = 1
        while await self._repo.number_exists(f"{base}-{seq:03d}"):
            seq += 1
        return f"{base}-{seq:03d}"
