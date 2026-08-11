import logging
import time
from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.events import event_bus
from app.models.rental_contract import RentalContract, RentalContractStatus
from app.models.rental_contract_item import ContractItemStatus
from app.models.rental_contract_status_history import RentalContractStatusHistory
from app.models.rental_extension import RentalExtension, ExtensionStatus
from app.models.rental_return import RentalReturn, ReturnStatus
from app.models.rental_damage_report import RentalDamageReport, DisputeStatus
from app.models.forklift import ForkliftStatus
from app.models.forklift_status_history import ForkliftStatusHistory
from app.repositories.rental_repository import RentalRepository
from app.repositories.forklift_repository import ForkliftRepository
from app.repositories.forklift_status_repository import ForkliftStatusRepository
from app.services.billing_service import BillingService
from app.schemas.rental import (
    WorkflowAction, ApproveContractAction, ActivateContractAction,
    CancelContractAction, RentalReturnCreate, RentalReturnUpdate,
    PickupAction, ReceiveAction, RentalDamageReportCreate,
    RentalDamageReportUpdate, DisputeAction, ResolveDisputeAction,
    RentalExtensionCreate, ExtensionDecisionAction,
)

logger = logging.getLogger(__name__)

VALID_TRANSITIONS: dict[str, set[str]] = {
    RentalContractStatus.RESERVATION.value: {RentalContractStatus.DRAFT.value, RentalContractStatus.CANCELLED.value},
    RentalContractStatus.DRAFT.value: {RentalContractStatus.PENDING_APPROVAL.value, RentalContractStatus.CANCELLED.value},
    RentalContractStatus.PENDING_APPROVAL.value: {RentalContractStatus.APPROVED.value, RentalContractStatus.REVISION.value},
    RentalContractStatus.REVISION.value: {RentalContractStatus.PENDING_APPROVAL.value, RentalContractStatus.CANCELLED.value},
    RentalContractStatus.APPROVED.value: {RentalContractStatus.ACTIVE.value, RentalContractStatus.CANCELLED.value},
    RentalContractStatus.ACTIVE.value: {RentalContractStatus.RETURNING.value, RentalContractStatus.OVERDUE.value, RentalContractStatus.CANCELLED.value},
    RentalContractStatus.OVERDUE.value: {RentalContractStatus.RETURNING.value, RentalContractStatus.ACTIVE.value},
    RentalContractStatus.RETURNING.value: {RentalContractStatus.INSPECTING.value},
    RentalContractStatus.INSPECTING.value: {RentalContractStatus.SETTLING.value},
    RentalContractStatus.SETTLING.value: {RentalContractStatus.CLOSED.value},
    RentalContractStatus.CLOSED.value: set(),
    RentalContractStatus.CANCELLED.value: set(),
}


class RentalWorkflowService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = RentalRepository(db)
        self._forklift_repo = ForkliftRepository(db)
        self._forklift_status_repo = ForkliftStatusRepository(db)
        self._billing = BillingService(db)

    # ── Workflow actions ────────────────────────────────────────────────────

    async def submit(
        self, contract_id: int, reason: str | None, user_id: int,
    ) -> RentalContract:
        contract = await self._require(contract_id)

        item_count = await self._repo.get_item_count(contract_id)
        if item_count == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Cannot submit contract with no line items.",
            )

        # If reservation, auto-transition to draft first
        if contract.status == RentalContractStatus.RESERVATION.value:
            self._validate_transition(contract.status, RentalContractStatus.DRAFT.value)
            contract = await self._transition(
                contract, RentalContractStatus.DRAFT.value,
                "Auto-promoted from reservation", user_id,
            )

        self._validate_transition(contract.status, RentalContractStatus.PENDING_APPROVAL.value)
        return await self._transition(
            contract, RentalContractStatus.PENDING_APPROVAL.value, reason, user_id,
        )

    async def approve(
        self, contract_id: int, data: ApproveContractAction, user_id: int,
    ) -> RentalContract:
        contract = await self._require(contract_id)
        self._validate_transition(contract.status, RentalContractStatus.APPROVED.value)

        await self._repo.update(contract, {
            "approved_by": user_id,
            "approved_at": datetime.now(timezone.utc),
        })

        return await self._transition(
            contract, RentalContractStatus.APPROVED.value,
            data.reason if data else None, user_id,
        )

    async def reject(
        self, contract_id: int, reason: str | None, user_id: int,
    ) -> RentalContract:
        contract = await self._require(contract_id)
        self._validate_transition(contract.status, RentalContractStatus.REVISION.value)

        contract = await self._transition(
            contract, RentalContractStatus.REVISION.value, reason, user_id,
        )

        await self._repo.update(contract, {
            "revision_number": contract.revision_number + 1,
        })
        await self.db.commit()
        return contract

    async def activate(
        self, contract_id: int, data: ActivateContractAction, user_id: int,
    ) -> RentalContract:
        contract = await self._require(contract_id)
        self._validate_transition(contract.status, RentalContractStatus.ACTIVE.value)

        actual_start = data.actual_start_date if data and data.actual_start_date else date.today()
        await self._repo.update(contract, {
            "actual_start_date": actual_start,
        })

        # Transition each item's forklift from reserved -> rented
        for item in contract.items:
            if item.forklift_id:
                forklift = await self._forklift_repo.get_by_id(item.forklift_id)
                if forklift and forklift.status == ForkliftStatus.RESERVED.value:
                    old_status = forklift.status
                    await self._forklift_repo.update(forklift, {
                        "status": ForkliftStatus.RENTED.value,
                    })
                    await self._forklift_status_repo.create(ForkliftStatusHistory(
                        forklift_id=forklift.id,
                        from_status=old_status,
                        to_status=ForkliftStatus.RENTED.value,
                        reason=f"Contract {contract.contract_number} activated",
                        changed_by=user_id,
                    ))
            # Item -> active
            await self._repo.update_item(item, {
                "line_status": ContractItemStatus.ACTIVE.value,
            })

        contract = await self._transition(
            contract, RentalContractStatus.ACTIVE.value,
            data.notes if data else None, user_id,
        )

        # Auto-generate initial billing cycles
        await self._billing.on_contract_activated(contract, user_id)
        await self.db.commit()

        await event_bus.emit("rental.activated", db=self.db, contract=contract)

        return contract

    async def cancel(
        self, contract_id: int, data: CancelContractAction, user_id: int,
    ) -> RentalContract:
        contract = await self._require(contract_id)

        # Any non-terminal status can be cancelled
        terminal = {RentalContractStatus.CLOSED.value, RentalContractStatus.CANCELLED.value}
        if contract.status in terminal:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Cannot cancel a contract in '{contract.status}' status.",
            )

        # Release forklifts
        for item in contract.items:
            if item.forklift_id and item.line_status not in (
                ContractItemStatus.SETTLED.value,
                ContractItemStatus.CANCELLED.value,
            ):
                forklift = await self._forklift_repo.get_by_id(item.forklift_id)
                if forklift and forklift.status in (
                    ForkliftStatus.RESERVED.value,
                    ForkliftStatus.RENTED.value,
                ):
                    old_status = forklift.status
                    await self._forklift_repo.update(forklift, {
                        "status": ForkliftStatus.IN_STOCK.value,
                    })
                    await self._forklift_status_repo.create(ForkliftStatusHistory(
                        forklift_id=forklift.id,
                        from_status=old_status,
                        to_status=ForkliftStatus.IN_STOCK.value,
                        reason=f"Contract {contract.contract_number} cancelled",
                        changed_by=user_id,
                    ))
            # Item -> cancelled
            if item.line_status not in (
                ContractItemStatus.SETTLED.value,
                ContractItemStatus.CANCELLED.value,
            ):
                await self._repo.update_item(item, {
                    "line_status": ContractItemStatus.CANCELLED.value,
                })

        # Auto-generate early termination fee if contract was active
        if contract.status == RentalContractStatus.ACTIVE.value:
            await self._billing.on_early_termination(contract, user_id)

        await self._repo.update(contract, {
            "cancellation_reason": data.cancellation_reason,
        })

        return await self._transition(
            contract, RentalContractStatus.CANCELLED.value,
            data.cancellation_reason, user_id,
        )

    async def close(
        self, contract_id: int, user_id: int,
    ) -> RentalContract:
        contract = await self._require(contract_id)
        self._validate_transition(contract.status, RentalContractStatus.CLOSED.value)

        # Check all items are settled or cancelled
        for item in contract.items:
            if item.line_status not in (
                ContractItemStatus.SETTLED.value,
                ContractItemStatus.CANCELLED.value,
            ):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="All items must be settled or cancelled before closing.",
                )

        await self._repo.update(contract, {
            "actual_end_date": date.today(),
        })

        return await self._transition(
            contract, RentalContractStatus.CLOSED.value, None, user_id,
        )

    # ── Returns ─────────────────────────────────────────────────────────────

    async def create_return(
        self, contract_id: int, data: RentalReturnCreate, user_id: int,
    ) -> RentalReturn:
        contract = await self._require(contract_id)
        if contract.status not in (
            RentalContractStatus.ACTIVE.value,
            RentalContractStatus.OVERDUE.value,
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Returns can only be created for active or overdue contracts.",
            )

        return_number = await self._generate_return_number()

        # Resolve item
        contract_item_id = data.contract_item_id
        forklift_id = data.forklift_id

        if contract_item_id:
            item = await self._repo.get_item_by_id(contract_item_id)
            if item is None or item.contract_id != contract_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Contract item not found.",
                )
            forklift_id = forklift_id or item.forklift_id
            # Update item line_status -> returning
            await self._repo.update_item(item, {
                "line_status": ContractItemStatus.RETURNING.value,
            })

        ret = RentalReturn(
            return_number=return_number,
            contract_id=contract_id,
            contract_item_id=contract_item_id,
            forklift_id=forklift_id,
            return_type=data.return_type.value,
            status=ReturnStatus.REQUESTED.value,
            requested_date=data.requested_date,
            scheduled_pickup_date=data.scheduled_pickup_date,
            pickup_address=data.pickup_address,
            is_early_termination=data.is_early_termination,
            early_termination_reason=data.early_termination_reason,
            notes=data.notes,
            created_by=user_id,
        )
        ret = await self._repo.add_return(ret)

        # If all items are returning or settled -> contract -> returning
        all_returning = all(
            i.line_status in (
                ContractItemStatus.RETURNING.value,
                ContractItemStatus.SETTLED.value,
                ContractItemStatus.CANCELLED.value,
            )
            for i in contract.items
        )
        if all_returning and contract.status != RentalContractStatus.RETURNING.value:
            self._validate_transition(contract.status, RentalContractStatus.RETURNING.value)
            await self._transition(
                contract, RentalContractStatus.RETURNING.value,
                "All items returning", user_id,
            )
        else:
            await self.db.commit()

        return ret

    async def update_return(
        self, contract_id: int, return_id: int,
        data: RentalReturnUpdate, user_id: int,
    ) -> RentalReturn:
        await self._require(contract_id)
        ret = await self._require_return(return_id, contract_id)

        changes = data.model_dump(exclude_unset=True)
        ret = await self._repo.update_return(ret, changes)
        await self.db.commit()
        return ret

    async def pickup_return(
        self, contract_id: int, return_id: int,
        data: PickupAction, user_id: int,
    ) -> RentalReturn:
        contract = await self._require(contract_id)
        ret = await self._require_return(return_id, contract_id)

        if ret.status not in (ReturnStatus.REQUESTED.value, ReturnStatus.SCHEDULED.value):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Return must be in requested or scheduled status (current: {ret.status}).",
            )

        ret = await self._repo.update_return(ret, {
            "status": ReturnStatus.PICKED_UP.value,
            "actual_pickup_date": date.today(),
            "departure_hour_meter": data.departure_hour_meter,
            "customer_signoff_url": data.customer_signoff_url,
            "assigned_driver": user_id,
            "notes": data.notes or ret.notes,
        })

        await self.db.commit()
        return ret

    async def receive_return(
        self, contract_id: int, return_id: int,
        data: ReceiveAction, user_id: int,
    ) -> RentalReturn:
        contract = await self._require(contract_id)
        ret = await self._require_return(return_id, contract_id)

        if ret.status != ReturnStatus.PICKED_UP.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Return must be in picked_up status (current: {ret.status}).",
            )

        ret = await self._repo.update_return(ret, {
            "status": ReturnStatus.RECEIVED.value,
            "actual_received_date": date.today(),
            "arrival_hour_meter": data.arrival_hour_meter,
            "condition_rating": data.condition_rating,
            "overall_condition": data.overall_condition,
            "mechanical_pass": data.mechanical_pass,
            "safety_equipment_pass": data.safety_equipment_pass,
            "exterior_notes": data.exterior_notes,
            "photo_urls": data.photo_urls,
            "inspected_by": user_id,
            "notes": data.notes or ret.notes,
        })

        # Update item -> inspecting
        if ret.contract_item_id:
            item = await self._repo.get_item_by_id(ret.contract_item_id)
            if item:
                await self._repo.update_item(item, {
                    "line_status": ContractItemStatus.INSPECTING.value,
                })

        # Release forklift: rented -> in_stock
        if ret.forklift_id:
            forklift = await self._forklift_repo.get_by_id(ret.forklift_id)
            if forklift and forklift.status == ForkliftStatus.RENTED.value:
                await self._forklift_repo.update(forklift, {
                    "status": ForkliftStatus.IN_STOCK.value,
                })
                await self._forklift_status_repo.create(ForkliftStatusHistory(
                    forklift_id=forklift.id,
                    from_status=ForkliftStatus.RENTED.value,
                    to_status=ForkliftStatus.IN_STOCK.value,
                    reason=f"Return {ret.return_number} received",
                    changed_by=user_id,
                ))

        # Auto-detect overtime hours
        if ret.contract_item_id and ret.arrival_hour_meter and ret.departure_hour_meter:
            item = await self._repo.get_item_by_id(ret.contract_item_id)
            if item and item.contracted_hours_limit:
                hours_used = ret.arrival_hour_meter - ret.departure_hour_meter
                if hours_used > item.contracted_hours_limit:
                    excess = hours_used - item.contracted_hours_limit
                    await self._billing.on_overtime_hours(
                        contract, item, excess, user_id,
                    )

        # Auto-detect late return
        if date.today() > contract.end_date:
            days_late = (date.today() - contract.end_date).days
            await self._billing.on_late_return(contract, days_late, user_id)

        # If all items inspecting or settled -> contract -> inspecting
        all_inspecting = all(
            i.line_status in (
                ContractItemStatus.INSPECTING.value,
                ContractItemStatus.SETTLED.value,
                ContractItemStatus.CANCELLED.value,
            )
            for i in contract.items
        )
        if all_inspecting and contract.status != RentalContractStatus.INSPECTING.value:
            self._validate_transition(contract.status, RentalContractStatus.INSPECTING.value)
            await self._transition(
                contract, RentalContractStatus.INSPECTING.value,
                "All items received/inspecting", user_id,
            )
        else:
            await self.db.commit()

        return ret

    async def complete_return(
        self, contract_id: int, return_id: int, user_id: int,
    ) -> RentalReturn:
        contract = await self._require(contract_id)
        ret = await self._require_return(return_id, contract_id)

        if ret.status != ReturnStatus.RECEIVED.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Return must be in received status (current: {ret.status}).",
            )

        ret = await self._repo.update_return(ret, {
            "status": ReturnStatus.COMPLETED.value,
        })

        # Item -> settled
        if ret.contract_item_id:
            item = await self._repo.get_item_by_id(ret.contract_item_id)
            if item:
                await self._repo.update_item(item, {
                    "line_status": ContractItemStatus.SETTLED.value,
                })

        # If all items settled or cancelled -> contract -> settling
        all_settled = all(
            i.line_status in (
                ContractItemStatus.SETTLED.value,
                ContractItemStatus.CANCELLED.value,
            )
            for i in contract.items
        )
        if all_settled and contract.status != RentalContractStatus.SETTLING.value:
            self._validate_transition(contract.status, RentalContractStatus.SETTLING.value)
            await self._transition(
                contract, RentalContractStatus.SETTLING.value,
                "All returns completed", user_id,
            )
            # Auto-generate settlement invoice for all pending billing cycles
            await self._billing.on_contract_settling(contract, user_id)
            await self.db.commit()
        else:
            await self.db.commit()

        return ret

    # ── Damage reports ──────────────────────────────────────────────────────

    async def create_damage_report(
        self, contract_id: int, data: RentalDamageReportCreate, user_id: int,
    ) -> RentalDamageReport:
        contract = await self._require(contract_id)
        if contract.status not in (
            RentalContractStatus.INSPECTING.value,
            RentalContractStatus.SETTLING.value,
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Damage reports can only be created during inspecting or settling.",
            )

        report_number = await self._generate_report_number()
        total_charge = round(
            data.repair_cost + data.parts_cost + data.downtime_cost, 2,
        )

        report = RentalDamageReport(
            report_number=report_number,
            return_id=data.return_id,
            contract_id=contract_id,
            forklift_id=data.forklift_id,
            damage_category=data.damage_category.value,
            component=data.component,
            description=data.description,
            photo_urls=data.photo_urls,
            repair_cost=data.repair_cost,
            parts_cost=data.parts_cost,
            downtime_days=data.downtime_days,
            downtime_cost=data.downtime_cost,
            total_charge=total_charge,
            is_customer_liable=data.is_customer_liable,
            assessed_by=user_id,
            assessed_at=datetime.now(timezone.utc),
        )
        report = await self._repo.add_damage_report(report)

        # Auto-generate damage charge billing cycle
        await self._billing.on_damage_report_created(contract, report, user_id)

        await self.db.commit()
        return report

    async def update_damage_report(
        self, contract_id: int, report_id: int,
        data: RentalDamageReportUpdate, user_id: int,
    ) -> RentalDamageReport:
        await self._require(contract_id)
        report = await self._require_report(report_id, contract_id)

        if report.dispute_status != DisputeStatus.NONE.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Cannot update a damage report that is disputed or resolved.",
            )

        changes = data.model_dump(exclude_unset=True)

        # Recalculate total_charge if cost fields changed
        repair_cost = changes.get("repair_cost", report.repair_cost)
        parts_cost = changes.get("parts_cost", report.parts_cost)
        downtime_cost = changes.get("downtime_cost", report.downtime_cost)
        if any(k in changes for k in ("repair_cost", "parts_cost", "downtime_cost")):
            changes["total_charge"] = round(repair_cost + parts_cost + downtime_cost, 2)

        report = await self._repo.update_damage_report(report, changes)
        await self.db.commit()
        return report

    async def dispute_damage(
        self, contract_id: int, report_id: int,
        data: DisputeAction, user_id: int,
    ) -> RentalDamageReport:
        await self._require(contract_id)
        report = await self._require_report(report_id, contract_id)

        if report.dispute_status != DisputeStatus.NONE.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Report is already in '{report.dispute_status}' dispute status.",
            )

        report = await self._repo.update_damage_report(report, {
            "dispute_status": DisputeStatus.DISPUTED.value,
            "dispute_reason": data.dispute_reason,
        })
        await self.db.commit()
        return report

    async def resolve_dispute(
        self, contract_id: int, report_id: int,
        data: ResolveDisputeAction, user_id: int,
    ) -> RentalDamageReport:
        await self._require(contract_id)
        report = await self._require_report(report_id, contract_id)

        if report.dispute_status != DisputeStatus.DISPUTED.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Report must be in disputed status to resolve.",
            )

        report = await self._repo.update_damage_report(report, {
            "dispute_status": DisputeStatus.RESOLVED.value,
            "final_charge": data.final_charge,
            "dispute_resolution": data.dispute_resolution,
            "dispute_resolved_by": user_id,
            "dispute_resolved_at": datetime.now(timezone.utc),
        })
        await self.db.commit()
        return report

    # ── Extensions ──────────────────────────────────────────────────────────

    async def request_extension(
        self, contract_id: int, data: RentalExtensionCreate, user_id: int,
    ) -> RentalExtension:
        contract = await self._require(contract_id)
        if contract.status not in (
            RentalContractStatus.ACTIVE.value,
            RentalContractStatus.OVERDUE.value,
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Extensions can only be requested for active or overdue contracts.",
            )

        if data.new_end_date <= contract.end_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="New end date must be after the current contract end date.",
            )

        ext_number = await self._repo.next_extension_number(contract_id)

        ext = RentalExtension(
            contract_id=contract_id,
            extension_number=ext_number,
            original_end_date=contract.end_date,
            new_end_date=data.new_end_date,
            rate_adjustment_pct=data.rate_adjustment_pct,
            new_monthly_rate=data.new_monthly_rate,
            reason=data.reason,
            status=ExtensionStatus.PENDING.value,
            requested_by=user_id,
        )
        ext = await self._repo.add_extension(ext)
        await self.db.commit()
        return ext

    async def approve_extension(
        self, contract_id: int, ext_id: int,
        data: ExtensionDecisionAction, user_id: int,
    ) -> RentalExtension:
        contract = await self._require(contract_id)
        ext = await self._require_extension(ext_id, contract_id)

        if ext.status != ExtensionStatus.PENDING.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Extension must be pending (current: {ext.status}).",
            )

        ext = await self._repo.update_extension(ext, {
            "status": ExtensionStatus.APPROVED.value,
            "approved_by": user_id,
            "decided_at": datetime.now(timezone.utc),
            "conditions": data.conditions if data else None,
        })

        # Update contract end_date
        await self._repo.update(contract, {
            "end_date": ext.new_end_date,
            "revision_number": contract.revision_number + 1,
        })

        # If overdue -> active
        if contract.status == RentalContractStatus.OVERDUE.value:
            await self._transition(
                contract, RentalContractStatus.ACTIVE.value,
                f"Extension {ext.extension_number} approved", user_id,
            )
        else:
            await self.db.commit()

        return ext

    async def reject_extension(
        self, contract_id: int, ext_id: int,
        data: ExtensionDecisionAction, user_id: int,
    ) -> RentalExtension:
        contract = await self._require(contract_id)
        ext = await self._require_extension(ext_id, contract_id)

        if ext.status != ExtensionStatus.PENDING.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Extension must be pending (current: {ext.status}).",
            )

        ext = await self._repo.update_extension(ext, {
            "status": ExtensionStatus.REJECTED.value,
            "approved_by": user_id,
            "decided_at": datetime.now(timezone.utc),
            "conditions": data.conditions if data else None,
        })
        await self.db.commit()
        return ext

    # ── Internal ─────────────────────────────────────────────────────────────

    async def _transition(
        self, contract: RentalContract, to_status: str, reason: str | None, user_id: int,
    ) -> RentalContract:
        old_status = contract.status
        await self._repo.update(contract, {
            "status": to_status,
            "updated_by": user_id,
        })
        await self._repo.add_status_history(RentalContractStatusHistory(
            contract_id=contract.id,
            from_status=old_status,
            to_status=to_status,
            reason=reason,
            changed_by=user_id,
        ))
        await self.db.commit()
        return contract

    async def _require(self, contract_id: int) -> RentalContract:
        contract = await self._repo.get_by_id(contract_id)
        if contract is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
        return contract

    async def _require_return(self, return_id: int, contract_id: int) -> RentalReturn:
        ret = await self._repo.get_return_by_id(return_id)
        if ret is None or ret.contract_id != contract_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return not found")
        return ret

    async def _require_report(self, report_id: int, contract_id: int) -> RentalDamageReport:
        report = await self._repo.get_damage_report_by_id(report_id)
        if report is None or report.contract_id != contract_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Damage report not found")
        return report

    async def _require_extension(self, ext_id: int, contract_id: int) -> RentalExtension:
        ext = await self._repo.get_extension_by_id(ext_id)
        if ext is None or ext.contract_id != contract_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Extension not found")
        return ext

    @staticmethod
    def _validate_transition(from_status: str, to_status: str) -> None:
        allowed = VALID_TRANSITIONS.get(from_status, set())
        if to_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Invalid action: cannot transition from '{from_status}' to '{to_status}'.",
            )

    async def _generate_return_number(self) -> str:
        year = time.strftime("%Y")
        base = f"RR-{year}"
        seq = 1
        while await self._repo.return_number_exists(f"{base}-{seq:05d}"):
            seq += 1
        return f"{base}-{seq:05d}"

    async def _generate_report_number(self) -> str:
        year = time.strftime("%Y")
        base = f"RD-{year}"
        seq = 1
        while await self._repo.report_number_exists(f"{base}-{seq:05d}"):
            seq += 1
        return f"{base}-{seq:05d}"
