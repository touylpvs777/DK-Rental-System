import logging
import math
import time

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rental_contract import RentalContract, RentalContractStatus
from app.models.rental_contract_item import RentalContractItem, ContractItemStatus
from app.models.rental_contract_status_history import RentalContractStatusHistory
from app.models.rental_contract_term import RentalContractTerm
from app.models.rental_billing_cycle import RentalBillingCycle, BillingType, PaymentStatus
from app.models.rental_return import RentalReturn
from app.models.rental_damage_report import RentalDamageReport
from app.models.forklift import Forklift, ForkliftStatus
from app.repositories.rental_repository import RentalContractFilter, RentalRepository
from app.repositories.forklift_repository import ForkliftRepository
from app.repositories.forklift_status_repository import ForkliftStatusRepository
from app.models.forklift_status_history import ForkliftStatusHistory
from app.schemas.rental import (
    RentalContractCreate, RentalContractUpdate, RentalContractDetail,
    RentalContractItemCreate, RentalContractItemUpdate,
    RentalContractItemBulkReplaceRequest,
    RentalContractListResponse, RentalContractOut,
    RentalContractTermCreate, RentalBillingCycleCreate,
    RentalBillingCycleUpdate, GenerateBillingAction,
    BillingSummary, RecordHoursAction,
)

logger = logging.getLogger(__name__)

_VALID_SORTS = {"created_at", "start_date", "end_date", "total_value", "contract_number", "status"}
_VALID_ORDERS = {"asc", "desc"}
_EDITABLE_STATUSES = {
    RentalContractStatus.RESERVATION.value,
    RentalContractStatus.DRAFT.value,
    RentalContractStatus.REVISION.value,
}


class RentalContractService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = RentalRepository(db)
        self._forklift_repo = ForkliftRepository(db)
        self._forklift_status_repo = ForkliftStatusRepository(db)

    # ── List ─────────────────────────────────────────────────────────────────

    async def list_contracts(
        self,
        q: str | None = None,
        status_filter: str | None = None,
        contract_type: str | None = None,
        customer_id: int | None = None,
        assigned_to: int | None = None,
        is_active: bool | None = True,
        start_from=None,
        start_to=None,
        end_from=None,
        end_to=None,
        page: int = 1,
        page_size: int = 20,
        sort: str = "created_at",
        order: str = "desc",
    ) -> RentalContractListResponse:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        sort = sort if sort in _VALID_SORTS else "created_at"
        order = order if order in _VALID_ORDERS else "desc"

        f = RentalContractFilter(
            q=q, status=status_filter, contract_type=contract_type,
            customer_id=customer_id, assigned_to=assigned_to,
            is_active=is_active, start_from=start_from, start_to=start_to,
            end_from=end_from, end_to=end_to,
            page=page, page_size=page_size, sort=sort, order=order,
        )
        contracts, total = await self._repo.get_list(f)
        pages = math.ceil(total / page_size) if page_size else 1

        # Single GROUP BY query for the whole page instead of one
        # get_item_count() round trip per contract — was the N+1 responsible
        # for the 2.1-2.5s response time on this endpoint.
        item_counts = await self._repo.get_item_counts([ct.id for ct in contracts])
        items = []
        for ct in contracts:
            obj = RentalContractOut.model_validate(ct)
            obj.item_count = item_counts.get(ct.id, 0)
            items.append(obj)

        return RentalContractListResponse(
            items=items, total=total, page=page, page_size=page_size, pages=pages,
        )

    # ── Detail ───────────────────────────────────────────────────────────────

    async def get_contract(
        self, contract_id: int, user_permissions: set[str] | None = None,
    ) -> RentalContractDetail:
        contract = await self._repo.get_detail(contract_id)
        if contract is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

        obj = RentalContractDetail.model_validate(contract)
        obj.item_count = len(contract.items)
        obj.recent_status_history = contract.status_history[:20]
        obj.recent_extensions = contract.extensions[:10]
        obj.active_returns = [
            r for r in contract.returns
            if r.status not in ("completed", "cancelled")
        ]
        obj.terms = contract.terms
        obj.billing_summary = await self._get_billing_summary(contract.id)
        obj.available_actions = _compute_actions(contract.status, user_permissions)
        return obj

    # ── Create ───────────────────────────────────────────────────────────────

    async def create_contract(
        self, data: RentalContractCreate, created_by: int,
    ) -> RentalContract:
        if data.end_date <= data.start_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="end_date must be after start_date.",
            )

        number = await self._generate_number()

        contract = RentalContract(
            contract_number=number,
            status=RentalContractStatus.RESERVATION.value,
            contract_type=data.contract_type.value,
            customer_id=data.customer_id,
            assigned_to=data.assigned_to or created_by,
            start_date=data.start_date,
            end_date=data.end_date,
            billing_cycle_day=data.billing_cycle_day,
            payment_terms_days=data.payment_terms_days,
            deposit_amount=data.deposit_amount,
            early_termination_fee_pct=data.early_termination_fee_pct,
            late_return_penalty_pct=data.late_return_penalty_pct,
            overtime_rate_pct=data.overtime_rate_pct,
            tax_rate=data.tax_rate,
            currency=data.currency,
            delivery_address=data.delivery_address,
            delivery_contact_name=data.delivery_contact_name,
            delivery_contact_phone=data.delivery_contact_phone,
            notes=data.notes,
            internal_notes=data.internal_notes,
            created_by=created_by,
            updated_by=created_by,
        )

        try:
            contract = await self._repo.create(contract)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Contract number generation conflict. Please retry.",
            )

        await self._repo.add_status_history(RentalContractStatusHistory(
            contract_id=contract.id,
            from_status=None,
            to_status=RentalContractStatus.RESERVATION.value,
            reason="Created",
            changed_by=created_by,
        ))

        await self.db.commit()
        return await self._repo.get_by_id(contract.id)

    # ── Update ───────────────────────────────────────────────────────────────

    async def update_contract(
        self, contract_id: int, data: RentalContractUpdate, updated_by: int,
    ) -> RentalContract:
        contract = await self._require(contract_id)
        self._require_editable(contract)

        changes = data.model_dump(exclude_unset=True)

        sd = changes.get("start_date", contract.start_date)
        ed = changes.get("end_date", contract.end_date)
        if sd and ed and ed <= sd:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="end_date must be after start_date.",
            )

        recalc = "tax_rate" in changes or "discount_amount" in changes
        changes["updated_by"] = updated_by

        try:
            contract = await self._repo.update(contract, changes)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Update conflicts with an existing contract.",
            )

        if recalc:
            await self._recalculate_totals(contract)

        await self.db.commit()
        return contract

    # ── Delete ───────────────────────────────────────────────────────────────

    async def delete_contract(self, contract_id: int) -> None:
        contract = await self._require(contract_id)
        if contract.status not in (
            RentalContractStatus.RESERVATION.value,
            RentalContractStatus.DRAFT.value,
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Only reservation or draft contracts can be deleted.",
            )

        # Release any reserved forklifts
        for item in contract.items:
            if item.forklift_id:
                forklift = await self._forklift_repo.get_by_id(item.forklift_id)
                if forklift and forklift.status == ForkliftStatus.RESERVED.value:
                    await self._forklift_repo.update(forklift, {
                        "status": ForkliftStatus.IN_STOCK.value,
                    })
                    await self._forklift_status_repo.create(ForkliftStatusHistory(
                        forklift_id=forklift.id,
                        from_status=ForkliftStatus.RESERVED.value,
                        to_status=ForkliftStatus.IN_STOCK.value,
                        reason=f"Contract {contract.contract_number} deleted",
                    ))

        await self._repo.delete(contract)
        await self.db.commit()

    # ── Items ────────────────────────────────────────────────────────────────

    async def _reserve_forklift(self, forklift_id: int, contract: RentalContract, user_id: int) -> None:
        """Validates a forklift is active, in-stock, and free of scheduling
        conflicts for `contract`'s dates, then marks it RESERVED. Raises
        HTTPException on any validation failure. Does not commit — caller
        owns the transaction."""
        forklift = await self._forklift_repo.get_by_id(forklift_id)
        if forklift is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Forklift not found.",
            )
        if not forklift.is_active:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Forklift is not active.",
            )
        if forklift.status != ForkliftStatus.IN_STOCK.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Forklift is not available (current status: {forklift.status}).",
            )

        conflicts = await self._repo.check_forklift_conflicts(
            forklift_id=forklift_id,
            start_date=contract.start_date,
            end_date=contract.end_date,
            exclude_contract_id=contract.id,
        )
        if conflicts:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Forklift has scheduling conflicts with existing contracts.",
            )

        old_status = forklift.status
        await self._forklift_repo.update(forklift, {
            "status": ForkliftStatus.RESERVED.value,
        })
        await self._forklift_status_repo.create(ForkliftStatusHistory(
            forklift_id=forklift.id,
            from_status=old_status,
            to_status=ForkliftStatus.RESERVED.value,
            reason=f"Reserved for contract {contract.contract_number}",
            changed_by=user_id,
        ))

    async def _release_forklift(self, forklift_id: int, contract: RentalContract, user_id: int) -> None:
        """Releases a RESERVED forklift back to IN_STOCK. No-op if the
        forklift is missing or not currently RESERVED. Does not commit."""
        forklift = await self._forklift_repo.get_by_id(forklift_id)
        if forklift and forklift.status == ForkliftStatus.RESERVED.value:
            await self._forklift_repo.update(forklift, {
                "status": ForkliftStatus.IN_STOCK.value,
            })
            await self._forklift_status_repo.create(ForkliftStatusHistory(
                forklift_id=forklift.id,
                from_status=ForkliftStatus.RESERVED.value,
                to_status=ForkliftStatus.IN_STOCK.value,
                reason=f"Removed from contract {contract.contract_number}",
                changed_by=user_id,
            ))

    async def add_item(
        self, contract_id: int, data: RentalContractItemCreate, user_id: int,
    ) -> RentalContractItem:
        contract = await self._require(contract_id)
        self._require_editable(contract)

        await self._reserve_forklift(data.forklift_id, contract, user_id)

        # Calculate line total
        duration_days = (contract.end_date - contract.start_date).days
        line_total = round(data.monthly_rate * (duration_days / 30), 2)

        line_number = await self._repo.next_line_number(contract_id)

        item = RentalContractItem(
            contract_id=contract_id,
            forklift_id=data.forklift_id,
            line_number=line_number,
            description=data.description,
            monthly_rate=data.monthly_rate,
            daily_rate=data.daily_rate,
            hourly_rate=data.hourly_rate,
            contracted_hours_limit=data.contracted_hours_limit,
            maintenance_interval_hours=data.maintenance_interval_hours,
            line_status=ContractItemStatus.RESERVED.value,
            line_total=line_total,
            sort_order=data.sort_order,
            notes=data.notes,
        )
        item = await self._repo.add_item(item)
        await self._recalculate_totals(contract)
        await self.db.commit()
        return item

    async def update_item(
        self, contract_id: int, item_id: int, data: RentalContractItemUpdate,
    ) -> RentalContractItem:
        contract = await self._require(contract_id)
        self._require_editable(contract)
        item = await self._require_item(item_id, contract_id)

        changes = data.model_dump(exclude_unset=True)

        # Recalculate line_total if rates changed
        monthly_rate = changes.get("monthly_rate", item.monthly_rate)
        if "monthly_rate" in changes:
            duration_days = (contract.end_date - contract.start_date).days
            changes["line_total"] = round(monthly_rate * (duration_days / 30), 2)

        item = await self._repo.update_item(item, changes)
        await self._recalculate_totals(contract)
        await self.db.commit()
        return item

    async def delete_item(
        self, contract_id: int, item_id: int, user_id: int,
    ) -> None:
        contract = await self._require(contract_id)
        self._require_editable(contract)
        item = await self._require_item(item_id, contract_id)

        if item.forklift_id:
            await self._release_forklift(item.forklift_id, contract, user_id)

        await self._repo.delete_item(item)
        await self._recalculate_totals(contract)
        await self.db.commit()

    async def replace_items_bulk(
        self, contract_id: int, data: RentalContractItemBulkReplaceRequest, user_id: int,
    ) -> list[RentalContractItem]:
        """Full differential replace of a contract's line items: lines
        omitted from the payload are deleted (releasing their forklift
        reservation), lines with a matching `id` are updated in place
        (forklift is not changeable — see RentalContractItemBulkRow), lines
        with no `id` are created (reserving a forklift exactly like
        add_item). Uses the same `_require_editable` guard as every other
        item mutation in this module, so bulk-replace can't be used to
        bypass the single-item endpoints' status restriction.
        """
        contract = await self._require(contract_id)
        self._require_editable(contract)

        existing_by_id = {item.id: item for item in contract.items}
        payload_ids = {row.id for row in data.items if row.id is not None}
        unknown_ids = payload_ids - existing_by_id.keys()
        if unknown_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Line item not found on this contract: {sorted(unknown_ids)}",
            )
        for row in data.items:
            if row.id is None and row.forklift_id is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="forklift_id is required for a new line item.",
                )

        for item in list(contract.items):
            if item.id not in payload_ids:
                if item.forklift_id:
                    await self._release_forklift(item.forklift_id, contract, user_id)
                await self._repo.delete_item(item)

        duration_days = (contract.end_date - contract.start_date).days
        next_line = await self._repo.next_line_number(contract_id)

        for row in data.items:
            line_total = round(row.monthly_rate * (duration_days / 30), 2)
            if row.id is not None:
                await self._repo.update_item(existing_by_id[row.id], {
                    "description": row.description,
                    "monthly_rate": row.monthly_rate,
                    "daily_rate": row.daily_rate,
                    "hourly_rate": row.hourly_rate,
                    "contracted_hours_limit": row.contracted_hours_limit,
                    "maintenance_interval_hours": row.maintenance_interval_hours,
                    "notes": row.notes,
                    "sort_order": row.sort_order,
                    "line_total": line_total,
                })
            else:
                await self._reserve_forklift(row.forklift_id, contract, user_id)
                await self._repo.add_item(RentalContractItem(
                    contract_id=contract_id,
                    forklift_id=row.forklift_id,
                    line_number=next_line,
                    description=row.description,
                    monthly_rate=row.monthly_rate,
                    daily_rate=row.daily_rate,
                    hourly_rate=row.hourly_rate,
                    contracted_hours_limit=row.contracted_hours_limit,
                    maintenance_interval_hours=row.maintenance_interval_hours,
                    line_status=ContractItemStatus.RESERVED.value,
                    line_total=line_total,
                    sort_order=row.sort_order,
                    notes=row.notes,
                ))
                next_line += 1

        await self._recalculate_totals(contract)
        await self.db.commit()

        return await self._repo.get_items_for_contract(contract_id)

    # ── Terms ────────────────────────────────────────────────────────────────

    async def add_term(
        self, contract_id: int, data: RentalContractTermCreate,
    ) -> RentalContractTerm:
        contract = await self._require(contract_id)
        self._require_editable(contract)

        term = RentalContractTerm(
            contract_id=contract_id,
            term_category=data.term_category.value,
            term_key=data.term_key,
            term_label=data.term_label,
            term_value=data.term_value,
            data_type=data.data_type.value,
            numeric_value=data.numeric_value,
            is_required=data.is_required,
            is_visible_to_customer=data.is_visible_to_customer,
            sort_order=data.sort_order,
        )
        term = await self._repo.add_term(term)
        await self.db.commit()
        return term

    # ── Hour-meter recording ─────────────────────────────────────────────────

    async def record_hours(
        self, contract_id: int, item_id: int, data: RecordHoursAction, user_id: int,
    ) -> RentalContractItem:
        contract = await self._require(contract_id)
        item = await self._require_item(item_id, contract_id)

        if data.reading_type == "departure":
            if contract.status not in (
                RentalContractStatus.DELIVERING.value,
                RentalContractStatus.ACTIVE.value,
            ):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Contract must be in delivering or active status to record departure hours.",
                )
            if item.departure_hour_meter is not None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Departure hour meter has already been recorded.",
                )
            item = await self._repo.update_item(item, {
                "departure_hour_meter": data.reading,
            })

        elif data.reading_type == "return":
            if contract.status not in (
                RentalContractStatus.RETURNING.value,
                RentalContractStatus.INSPECTING.value,
            ):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Contract must be in returning or inspecting status to record return hours.",
                )
            if item.departure_hour_meter is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Departure hour meter must be recorded first.",
                )
            if data.reading < item.departure_hour_meter:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Return reading must be >= departure reading.",
                )
            hours_used = data.reading - item.departure_hour_meter
            item = await self._repo.update_item(item, {
                "return_hour_meter": data.reading,
                "hours_used": hours_used,
            })

        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="reading_type must be 'departure' or 'return'.",
            )

        await self.db.commit()
        return item

    # ── Totals recalculation ─────────────────────────────────────────────────

    async def _recalculate_totals(self, contract: RentalContract) -> None:
        subtotal = await self._repo.get_items_subtotal(contract.id)
        tax_amount = round(subtotal * contract.tax_rate / 100, 2)
        total = round(subtotal + tax_amount - contract.discount_amount, 2)

        await self._repo.update(contract, {
            "subtotal": round(subtotal, 2),
            "tax_amount": tax_amount,
            "total_value": max(total, 0),
        })

    # ── Billing summary ──────────────────────────────────────────────────────

    async def _get_billing_summary(self, contract_id: int) -> BillingSummary:
        summary = await self._repo.get_billing_summary(contract_id)

        total_outstanding = (
            summary["total_billed"]
            - summary["total_credits"]
            - summary["total_paid"]
        )

        contract = await self._repo.get_by_id(contract_id)
        currency = contract.currency if contract else "LAK"

        return BillingSummary(
            total_billed=summary["total_billed"],
            total_paid=summary["total_paid"],
            total_outstanding=round(total_outstanding, 2),
            total_overdue=summary["total_overdue"],
            total_credits=summary["total_credits"],
            currency=currency,
            event_count=summary["event_count"],
        )

    # ── Helpers ──────────────────────────────────────────────────────────────

    async def _generate_number(self) -> str:
        year = time.strftime("%Y")
        base = f"RC-{year}"
        seq = 1
        while await self._repo.number_exists(f"{base}-{seq:05d}"):
            seq += 1
        return f"{base}-{seq:05d}"

    async def _require(self, contract_id: int) -> RentalContract:
        contract = await self._repo.get_by_id(contract_id)
        if contract is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
        return contract

    @staticmethod
    def _require_editable(contract: RentalContract) -> None:
        if contract.status not in _EDITABLE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Contract can only be edited in reservation, draft, or revision status.",
            )

    async def _require_item(self, item_id: int, contract_id: int) -> RentalContractItem:
        item = await self._repo.get_item_by_id(item_id)
        if item is None or item.contract_id != contract_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Line item not found")
        return item


def _compute_actions(current_status: str, permissions: set[str] | None = None) -> list[str]:
    if permissions is None:
        permissions = set()

    has_update = "rental.update" in permissions or not permissions
    has_approve = "rental.approve" in permissions or not permissions
    has_deliver = "rental.deliver" in permissions or not permissions
    has_inspect = "rental.inspect" in permissions or not permissions
    has_settle = "rental.settle" in permissions or not permissions

    actions_map: dict[str, list[str]] = {
        RentalContractStatus.RESERVATION.value: [],
        RentalContractStatus.DRAFT.value: [],
        RentalContractStatus.PENDING_APPROVAL.value: [],
        RentalContractStatus.REVISION.value: [],
        RentalContractStatus.APPROVED.value: [],
        RentalContractStatus.ACTIVE.value: [],
        RentalContractStatus.OVERDUE.value: [],
        RentalContractStatus.INSPECTING.value: [],
        RentalContractStatus.SETTLING.value: [],
    }

    if has_update:
        actions_map[RentalContractStatus.RESERVATION.value].extend(["submit", "cancel"])
        actions_map[RentalContractStatus.DRAFT.value].extend(["submit", "cancel"])
        actions_map[RentalContractStatus.REVISION.value].extend(["submit", "cancel"])
        actions_map[RentalContractStatus.ACTIVE.value].extend([
            "request_return", "request_extension", "cancel",
        ])
        actions_map[RentalContractStatus.OVERDUE.value].extend([
            "request_return", "request_extension",
        ])
    if has_approve:
        actions_map[RentalContractStatus.PENDING_APPROVAL.value].extend(["approve", "reject"])
    if has_deliver:
        actions_map[RentalContractStatus.APPROVED.value].append("activate")
    if has_inspect:
        actions_map[RentalContractStatus.INSPECTING.value].append("complete_inspection")
    if has_settle:
        actions_map[RentalContractStatus.ACTIVE.value].append("generate_billing")
        actions_map[RentalContractStatus.OVERDUE.value].append("generate_billing")
        actions_map[RentalContractStatus.SETTLING.value].append("close")

    return actions_map.get(current_status, [])
