import logging
from dataclasses import dataclass
from datetime import date

from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.rental_billing_cycle import RentalBillingCycle
from app.models.rental_contract import RentalContract
from app.models.rental_contract_item import RentalContractItem
from app.models.rental_contract_status_history import RentalContractStatusHistory
from app.models.rental_contract_term import RentalContractTerm
from app.models.rental_damage_report import RentalDamageReport
from app.models.rental_extension import RentalExtension
from app.models.rental_return import RentalReturn

logger = logging.getLogger(__name__)


@dataclass
class RentalContractFilter:
    q: str | None = None
    status: str | None = None
    contract_type: str | None = None
    customer_id: int | None = None
    assigned_to: int | None = None
    is_active: bool | None = True
    start_from: date | None = None
    start_to: date | None = None
    end_from: date | None = None
    end_to: date | None = None
    page: int = 1
    page_size: int = 20
    sort: str = "created_at"
    order: str = "desc"


class RentalRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Contract CRUD ────────────────────────────────────────────────────────

    async def get_by_id(self, contract_id: int) -> RentalContract | None:
        result = await self.db.execute(
            select(RentalContract)
            .options(
                selectinload(RentalContract.customer),
                selectinload(RentalContract.lead),
                selectinload(RentalContract.quotation),
                selectinload(RentalContract.assigned_user),
                selectinload(RentalContract.items),
            )
            .where(RentalContract.id == contract_id)
        )
        return result.scalar_one_or_none()

    async def get_detail(self, contract_id: int) -> RentalContract | None:
        result = await self.db.execute(
            select(RentalContract)
            .options(
                selectinload(RentalContract.customer),
                selectinload(RentalContract.lead),
                selectinload(RentalContract.quotation),
                selectinload(RentalContract.assigned_user),
                selectinload(RentalContract.approved_by_user),
                selectinload(RentalContract.items).selectinload(RentalContractItem.forklift),
                selectinload(RentalContract.status_history).selectinload(RentalContractStatusHistory.user),
                selectinload(RentalContract.extensions).selectinload(RentalExtension.requester),
                selectinload(RentalContract.extensions).selectinload(RentalExtension.approver),
                selectinload(RentalContract.returns).selectinload(RentalReturn.forklift),
                selectinload(RentalContract.returns).selectinload(RentalReturn.driver_user),
                selectinload(RentalContract.returns).selectinload(RentalReturn.inspector_user),
                selectinload(RentalContract.billing_cycles).selectinload(RentalBillingCycle.creator),
                selectinload(RentalContract.damage_reports).selectinload(RentalDamageReport.forklift),
                selectinload(RentalContract.damage_reports).selectinload(RentalDamageReport.assessor),
                selectinload(RentalContract.damage_reports).selectinload(RentalDamageReport.dispute_resolver),
            )
            .where(RentalContract.id == contract_id)
        )
        contract = result.scalar_one_or_none()
        if contract is not None:
            terms_result = await self.db.execute(
                select(RentalContractTerm)
                .where(RentalContractTerm.contract_id == contract_id)
                .order_by(RentalContractTerm.sort_order)
            )
            contract.terms = list(terms_result.scalars().all())
        return contract

    async def get_list(self, f: RentalContractFilter) -> tuple[list[RentalContract], int]:
        stmt = (
            select(RentalContract)
            .options(
                selectinload(RentalContract.customer),
                selectinload(RentalContract.lead),
                selectinload(RentalContract.quotation),
                selectinload(RentalContract.assigned_user),
            )
        )
        stmt = self._apply_filters(stmt, f)

        count_stmt = select(func.count(RentalContract.id))
        count_stmt = self._apply_filters(count_stmt, f)
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        sort_col = {
            "created_at": RentalContract.created_at,
            "start_date": RentalContract.start_date,
            "end_date": RentalContract.end_date,
            "total_value": RentalContract.total_value,
            "contract_number": RentalContract.contract_number,
            "status": RentalContract.status,
        }.get(f.sort, RentalContract.created_at)

        if f.order == "asc":
            stmt = stmt.order_by(sort_col.asc())
        else:
            stmt = stmt.order_by(sort_col.desc())

        offset = (f.page - 1) * f.page_size
        stmt = stmt.offset(offset).limit(f.page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    def _apply_filters(self, stmt, f: RentalContractFilter):
        if f.is_active is not None:
            stmt = stmt.where(RentalContract.is_active == f.is_active)
        if f.status is not None:
            stmt = stmt.where(RentalContract.status == f.status)
        if f.contract_type is not None:
            stmt = stmt.where(RentalContract.contract_type == f.contract_type)
        if f.customer_id is not None:
            stmt = stmt.where(RentalContract.customer_id == f.customer_id)
        if f.assigned_to is not None:
            stmt = stmt.where(RentalContract.assigned_to == f.assigned_to)
        if f.start_from is not None:
            stmt = stmt.where(RentalContract.start_date >= f.start_from)
        if f.start_to is not None:
            stmt = stmt.where(RentalContract.start_date <= f.start_to)
        if f.end_from is not None:
            stmt = stmt.where(RentalContract.end_date >= f.end_from)
        if f.end_to is not None:
            stmt = stmt.where(RentalContract.end_date <= f.end_to)
        if f.q:
            pattern = f"%{f.q}%"
            stmt = stmt.where(
                or_(
                    RentalContract.contract_number.ilike(pattern),
                    RentalContract.delivery_contact_name.ilike(pattern),
                )
            )
        return stmt

    async def number_exists(self, number: str) -> bool:
        result = await self.db.execute(
            select(RentalContract.id).where(RentalContract.contract_number == number)
        )
        return result.scalar_one_or_none() is not None

    async def create(self, contract: RentalContract) -> RentalContract:
        self.db.add(contract)
        try:
            await self.db.flush()
            await self.db.refresh(contract)
            logger.info("Rental contract created: id=%s number=%s", contract.id, contract.contract_number)
            return contract
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update(self, contract: RentalContract, changes: dict) -> RentalContract:
        for key, value in changes.items():
            setattr(contract, key, value)
        try:
            await self.db.flush()
            # Scope the refresh to just the changed columns — refreshing with no
            # attribute_names expires already-loaded relationships (e.g. .items,
            # .customer), which then crash on next access (unawaited lazy-load
            # outside of an async context). "updated_at" is always included even
            # when absent from `changes`: it carries onupdate=func.now(), a
            # server-evaluated default, so SQLAlchemy expires it on every flush
            # regardless of what was explicitly assigned — leaving it expired
            # (and therefore an unawaited-lazy-load crash risk on serialization)
            # unless it's explicitly refreshed here too.
            refresh_attrs = set(changes.keys()) | {"updated_at"}
            await self.db.refresh(contract, attribute_names=list(refresh_attrs))
            logger.info("Rental contract updated: id=%s", contract.id)
            return contract
        except IntegrityError:
            await self.db.rollback()
            raise

    async def delete(self, contract: RentalContract) -> None:
        await self.db.delete(contract)
        await self.db.flush()
        logger.info("Rental contract deleted: id=%s number=%s", contract.id, contract.contract_number)

    # ── Item helpers ─────────────────────────────────────────────────────────

    async def get_item_by_id(self, item_id: int) -> RentalContractItem | None:
        result = await self.db.execute(
            select(RentalContractItem)
            .options(selectinload(RentalContractItem.forklift))
            .where(RentalContractItem.id == item_id)
        )
        return result.scalar_one_or_none()

    async def next_line_number(self, contract_id: int) -> int:
        result = await self.db.execute(
            select(func.coalesce(func.max(RentalContractItem.line_number), 0))
            .where(RentalContractItem.contract_id == contract_id)
        )
        return result.scalar_one() + 1

    async def _reload_item(self, item_id: int) -> RentalContractItem:
        # RentalContractItemOut needs `.forklift`, a lazy relationship that plain
        # db.refresh() never populates (it only reloads/expires attributes that
        # were already loaded). Re-select with selectinload so the object handed
        # back to the route is fully materialized before Pydantic serializes it
        # outside the async session's greenlet context.
        result = await self.db.execute(
            select(RentalContractItem)
            .options(selectinload(RentalContractItem.forklift))
            .where(RentalContractItem.id == item_id)
        )
        return result.scalar_one()

    async def add_item(self, item: RentalContractItem) -> RentalContractItem:
        self.db.add(item)
        await self.db.flush()
        return await self._reload_item(item.id)

    async def update_item(self, item: RentalContractItem, changes: dict) -> RentalContractItem:
        for key, value in changes.items():
            setattr(item, key, value)
        await self.db.flush()
        return await self._reload_item(item.id)

    async def delete_item(self, item: RentalContractItem) -> None:
        await self.db.delete(item)
        await self.db.flush()

    async def get_item_count(self, contract_id: int) -> int:
        result = await self.db.execute(
            select(func.count(RentalContractItem.id))
            .where(RentalContractItem.contract_id == contract_id)
        )
        return result.scalar_one()

    async def get_item_counts(self, contract_ids: list[int]) -> dict[int, int]:
        """Batched replacement for calling get_item_count() once per contract
        in a list response — a single GROUP BY query for the whole page
        instead of N round trips. Contracts with zero items are simply
        absent from the result; callers should default-to-0 on lookup."""
        if not contract_ids:
            return {}
        result = await self.db.execute(
            select(RentalContractItem.contract_id, func.count(RentalContractItem.id))
            .where(RentalContractItem.contract_id.in_(contract_ids))
            .group_by(RentalContractItem.contract_id)
        )
        return dict(result.all())

    async def get_items_subtotal(self, contract_id: int) -> float:
        result = await self.db.execute(
            select(func.coalesce(func.sum(RentalContractItem.line_total), 0.0))
            .where(RentalContractItem.contract_id == contract_id)
        )
        return float(result.scalar_one())

    async def get_items_for_contract(self, contract_id: int) -> list[RentalContractItem]:
        # RentalContractItemOut needs `.forklift` — get_by_id()'s
        # selectinload(RentalContract.items) does NOT chain into .forklift,
        # so a bulk-replace response built from `contract.items` would crash
        # (MissingGreenlet) the same way add_item/update_item's pre-fix bug
        # did. This is the safe path back to a fully-materialized item list.
        result = await self.db.execute(
            select(RentalContractItem)
            .options(selectinload(RentalContractItem.forklift))
            .where(RentalContractItem.contract_id == contract_id)
            .order_by(RentalContractItem.sort_order, RentalContractItem.line_number)
        )
        return list(result.scalars().all())

    # ── Term helpers ─────────────────────────────────────────────────────────

    async def add_term(self, term: RentalContractTerm) -> RentalContractTerm:
        self.db.add(term)
        await self.db.flush()
        await self.db.refresh(term)
        return term

    async def get_terms(self, contract_id: int) -> list[RentalContractTerm]:
        result = await self.db.execute(
            select(RentalContractTerm)
            .where(RentalContractTerm.contract_id == contract_id)
            .order_by(RentalContractTerm.sort_order)
        )
        return list(result.scalars().all())

    # ── Status history ───────────────────────────────────────────────────────

    async def add_status_history(self, entry: RentalContractStatusHistory) -> RentalContractStatusHistory:
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)
        return entry

    # ── Extension helpers ────────────────────────────────────────────────────

    async def _reload_extension(self, ext_id: int) -> RentalExtension:
        # RentalExtensionOut needs `.requester`/`.approver` — never populated by
        # a plain db.refresh() on a relationship that was never loaded.
        result = await self.db.execute(
            select(RentalExtension)
            .options(
                selectinload(RentalExtension.requester),
                selectinload(RentalExtension.approver),
            )
            .where(RentalExtension.id == ext_id)
        )
        return result.scalar_one()

    async def add_extension(self, ext: RentalExtension) -> RentalExtension:
        self.db.add(ext)
        await self.db.flush()
        return await self._reload_extension(ext.id)

    async def get_extension_by_id(self, ext_id: int) -> RentalExtension | None:
        result = await self.db.execute(
            select(RentalExtension)
            .options(
                selectinload(RentalExtension.requester),
                selectinload(RentalExtension.approver),
            )
            .where(RentalExtension.id == ext_id)
        )
        return result.scalar_one_or_none()

    async def update_extension(self, ext: RentalExtension, changes: dict) -> RentalExtension:
        for key, value in changes.items():
            setattr(ext, key, value)
        await self.db.flush()
        return await self._reload_extension(ext.id)

    async def next_extension_number(self, contract_id: int) -> int:
        result = await self.db.execute(
            select(func.coalesce(func.max(RentalExtension.extension_number), 0))
            .where(RentalExtension.contract_id == contract_id)
        )
        return result.scalar_one() + 1

    # ── Return helpers ───────────────────────────────────────────────────────

    async def _reload_return(self, return_id: int) -> RentalReturn:
        # RentalReturnOut needs `.forklift`/`.driver_user`/`.inspector_user`, and
        # the model's `updated_at` carries onupdate=func.now() (a server-evaluated
        # default SQLAlchemy expires after every flush that touches the row) — a
        # plain db.refresh() leaves both classes of attribute unpopulated/expired.
        # Re-selecting after flush picks up the eager relationships and the fresh
        # onupdate value in one awaited round trip.
        result = await self.db.execute(
            select(RentalReturn)
            .options(
                selectinload(RentalReturn.forklift),
                selectinload(RentalReturn.driver_user),
                selectinload(RentalReturn.inspector_user),
            )
            .where(RentalReturn.id == return_id)
        )
        return result.scalar_one()

    async def add_return(self, ret: RentalReturn) -> RentalReturn:
        self.db.add(ret)
        await self.db.flush()
        return await self._reload_return(ret.id)

    async def get_return_by_id(self, return_id: int) -> RentalReturn | None:
        result = await self.db.execute(
            select(RentalReturn)
            .options(
                selectinload(RentalReturn.forklift),
                selectinload(RentalReturn.driver_user),
                selectinload(RentalReturn.inspector_user),
                selectinload(RentalReturn.damage_reports),
            )
            .where(RentalReturn.id == return_id)
        )
        return result.scalar_one_or_none()

    async def update_return(self, ret: RentalReturn, changes: dict) -> RentalReturn:
        for key, value in changes.items():
            setattr(ret, key, value)
        await self.db.flush()
        return await self._reload_return(ret.id)

    async def return_number_exists(self, number: str) -> bool:
        result = await self.db.execute(
            select(RentalReturn.id).where(RentalReturn.return_number == number)
        )
        return result.scalar_one_or_none() is not None

    # ── Damage report helpers ────────────────────────────────────────────────

    async def _reload_damage_report(self, report_id: int) -> RentalDamageReport:
        # RentalDamageReportOut needs `.forklift`/`.assessor`/`.dispute_resolver`,
        # and `updated_at` carries onupdate=func.now() — same expired-attribute
        # risk as RentalReturn, fixed the same way (re-select after flush).
        result = await self.db.execute(
            select(RentalDamageReport)
            .options(
                selectinload(RentalDamageReport.forklift),
                selectinload(RentalDamageReport.assessor),
                selectinload(RentalDamageReport.dispute_resolver),
            )
            .where(RentalDamageReport.id == report_id)
        )
        return result.scalar_one()

    async def add_damage_report(self, report: RentalDamageReport) -> RentalDamageReport:
        self.db.add(report)
        await self.db.flush()
        return await self._reload_damage_report(report.id)

    async def get_damage_report_by_id(self, report_id: int) -> RentalDamageReport | None:
        result = await self.db.execute(
            select(RentalDamageReport)
            .options(
                selectinload(RentalDamageReport.forklift),
                selectinload(RentalDamageReport.assessor),
                selectinload(RentalDamageReport.dispute_resolver),
            )
            .where(RentalDamageReport.id == report_id)
        )
        return result.scalar_one_or_none()

    async def update_damage_report(self, report: RentalDamageReport, changes: dict) -> RentalDamageReport:
        for key, value in changes.items():
            setattr(report, key, value)
        await self.db.flush()
        return await self._reload_damage_report(report.id)

    async def report_number_exists(self, number: str) -> bool:
        result = await self.db.execute(
            select(RentalDamageReport.id).where(RentalDamageReport.report_number == number)
        )
        return result.scalar_one_or_none() is not None

    # ── Billing cycle helpers ────────────────────────────────────────────────

    async def _reload_billing_cycle(self, cycle_id: int) -> RentalBillingCycle:
        # RentalBillingCycleOut needs `.creator`, and `updated_at` carries
        # onupdate=func.now() — same expired-attribute risk as RentalReturn.
        result = await self.db.execute(
            select(RentalBillingCycle)
            .options(selectinload(RentalBillingCycle.creator))
            .where(RentalBillingCycle.id == cycle_id)
        )
        return result.scalar_one()

    async def add_billing_cycle(self, cycle: RentalBillingCycle) -> RentalBillingCycle:
        self.db.add(cycle)
        await self.db.flush()
        return await self._reload_billing_cycle(cycle.id)

    async def get_billing_cycle_by_id(self, cycle_id: int) -> RentalBillingCycle | None:
        result = await self.db.execute(
            select(RentalBillingCycle)
            .options(selectinload(RentalBillingCycle.creator))
            .where(RentalBillingCycle.id == cycle_id)
        )
        return result.scalar_one_or_none()

    async def update_billing_cycle(self, cycle: RentalBillingCycle, changes: dict) -> RentalBillingCycle:
        for key, value in changes.items():
            setattr(cycle, key, value)
        await self.db.flush()
        return await self._reload_billing_cycle(cycle.id)

    async def billing_number_exists(self, number: str) -> bool:
        result = await self.db.execute(
            select(RentalBillingCycle.id).where(RentalBillingCycle.billing_number == number)
        )
        return result.scalar_one_or_none() is not None

    async def billing_period_exists(self, contract_id: int, period_start: date, period_end: date) -> bool:
        result = await self.db.execute(
            select(RentalBillingCycle.id).where(
                and_(
                    RentalBillingCycle.contract_id == contract_id,
                    RentalBillingCycle.period_start == period_start,
                    RentalBillingCycle.period_end == period_end,
                )
            )
        )
        return result.scalar_one_or_none() is not None

    async def get_billing_summary(self, contract_id: int) -> dict:
        base_where = RentalBillingCycle.contract_id == contract_id

        total_billed_result = await self.db.execute(
            select(func.coalesce(func.sum(RentalBillingCycle.total_amount), 0.0))
            .where(and_(base_where, RentalBillingCycle.is_credit == False))  # noqa: E712
        )
        total_billed = float(total_billed_result.scalar_one())

        total_credits_result = await self.db.execute(
            select(func.coalesce(func.sum(RentalBillingCycle.total_amount), 0.0))
            .where(and_(base_where, RentalBillingCycle.is_credit == True))  # noqa: E712
        )
        total_credits = float(total_credits_result.scalar_one())

        total_paid_result = await self.db.execute(
            select(func.coalesce(func.sum(RentalBillingCycle.total_amount), 0.0))
            .where(and_(base_where, RentalBillingCycle.payment_status == "paid"))
        )
        total_paid = float(total_paid_result.scalar_one())

        total_overdue_result = await self.db.execute(
            select(func.coalesce(func.sum(RentalBillingCycle.total_amount), 0.0))
            .where(and_(base_where, RentalBillingCycle.payment_status == "overdue"))
        )
        total_overdue = float(total_overdue_result.scalar_one())

        count_result = await self.db.execute(
            select(func.count(RentalBillingCycle.id)).where(base_where)
        )
        event_count = count_result.scalar_one()

        return {
            "total_billed": total_billed,
            "total_credits": total_credits,
            "total_paid": total_paid,
            "total_overdue": total_overdue,
            "event_count": event_count,
        }

    # ── Availability check ───────────────────────────────────────────────────

    async def check_forklift_conflicts(
        self,
        forklift_id: int,
        start_date: date,
        end_date: date,
        exclude_contract_id: int | None = None,
    ) -> list[RentalContract]:
        stmt = (
            select(RentalContract)
            .join(RentalContractItem, RentalContractItem.contract_id == RentalContract.id)
            .where(
                and_(
                    RentalContractItem.forklift_id == forklift_id,
                    RentalContract.status.notin_(["cancelled", "closed"]),
                    RentalContract.start_date <= end_date,
                    RentalContract.end_date >= start_date,
                )
            )
        )
        if exclude_contract_id is not None:
            stmt = stmt.where(RentalContract.id != exclude_contract_id)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())
