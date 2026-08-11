import logging
import time
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.activity_log import ActionType, EntityType
from app.models.rental_billing_cycle import RentalBillingCycle
from app.models.rental_contract import RentalContract
from app.models.user import User
from app.repositories.rental_repository import RentalRepository
from app.schemas.rental import (
    ActivateContractAction,
    ApproveContractAction,
    CancelContractAction,
    ConvertQuotationAction,
    DisputeAction,
    ExtensionDecisionAction,
    PickupAction,
    ReceiveAction,
    RentalBillingCycleCreate,
    RentalBillingCycleOut,
    RentalContractCreate,
    RentalContractDetail,
    RentalContractItemBulkReplaceRequest,
    RentalContractItemCreate,
    RentalContractItemOut,
    RentalContractItemUpdate,
    RentalContractListResponse,
    RentalContractOut,
    RentalContractUpdate,
    RentalDamageReportCreate,
    RentalDamageReportOut,
    RentalDamageReportUpdate,
    RentalExtensionCreate,
    RentalExtensionOut,
    RentalReturnCreate,
    RentalReturnOut,
    RentalReturnUpdate,
    RentalStatusHistoryOut,
    ResolveDisputeAction,
    WorkflowAction,
)
from app.services.activity_log_service import ActivityLogService
from app.services.rental_contract_service import RentalContractService
from app.services.rental_workflow_service import RentalWorkflowService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rental-contracts", tags=["Rental Contracts"])


async def _contract_out(db: AsyncSession, contract: RentalContract) -> RentalContractOut:
    # RentalContractOut.item_count has no ORM column backing it, so plain
    # model_validate() leaves it at its default of 0. A dedicated COUNT query
    # (rather than `len(contract.items)`) is used deliberately: `.items` is
    # only guaranteed eager-loaded on contracts that came from get_by_id()
    # (update/submit/approve/reject/activate/cancel/close/convert-quotation),
    # not on a freshly created one — a COUNT query is correct and safe (no
    # relationship access, no lazy-load risk) on every call site uniformly.
    obj = RentalContractOut.model_validate(contract)
    obj.item_count = await RentalRepository(db).get_item_count(contract.id)
    return obj


# =============================================================================
# Contract CRUD
# =============================================================================


@router.get("/", response_model=RentalContractListResponse, summary="List rental contracts")
async def list_contracts(
    q: str | None = Query(default=None, description="Search number, contact"),
    status: str | None = Query(default=None, alias="status"),
    contract_type: str | None = None,
    customer_id: int | None = None,
    assigned_to: int | None = None,
    is_active: bool | None = True,
    start_from: date | None = None,
    start_to: date | None = None,
    end_from: date | None = None,
    end_to: date | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = Query(
        default="created_at",
        pattern="^(created_at|start_date|end_date|total_value|contract_number|status)$",
    ),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_READ),
):
    return await RentalContractService(db).list_contracts(
        q=q, status_filter=status, contract_type=contract_type,
        customer_id=customer_id, assigned_to=assigned_to,
        is_active=is_active, start_from=start_from, start_to=start_to,
        end_from=end_from, end_to=end_to,
        page=page, page_size=page_size, sort=sort, order=order,
    )


@router.get("/{contract_id}", response_model=RentalContractDetail, summary="Get contract detail")
async def get_contract(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_READ),
):
    return await RentalContractService(db).get_contract(contract_id)


@router.post(
    "/",
    response_model=RentalContractOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create rental contract",
)
async def create_contract(
    data: RentalContractCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_CREATE),
):
    contract = await RentalContractService(db).create_contract(data, created_by=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_CONTRACT_CREATED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract.id,
        details={
            "contract_number": contract.contract_number,
            "type": contract.contract_type,
        },
    )
    return await _contract_out(db, contract)


@router.put("/{contract_id}", response_model=RentalContractOut, summary="Update contract")
async def update_contract(
    contract_id: int,
    data: RentalContractUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_UPDATE),
):
    contract = await RentalContractService(db).update_contract(
        contract_id, data, updated_by=current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_CONTRACT_UPDATED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract.id,
        details={
            "contract_number": contract.contract_number,
            "changed_fields": list(data.model_dump(exclude_unset=True).keys()),
        },
    )
    return await _contract_out(db, contract)


@router.delete(
    "/{contract_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete contract",
)
async def delete_contract(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_DELETE),
):
    svc = RentalContractService(db)
    detail = await svc.get_contract(contract_id)
    number = detail.contract_number
    await svc.delete_contract(contract_id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_CONTRACT_DELETED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract_id,
        details={"contract_number": number},
    )


# =============================================================================
# Line Items
# =============================================================================


@router.get(
    "/{contract_id}/items",
    response_model=list[RentalContractItemOut],
    summary="List line items",
)
async def list_items(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_READ),
):
    detail = await RentalContractService(db).get_contract(contract_id)
    return detail.items


@router.post(
    "/{contract_id}/items",
    response_model=RentalContractItemOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add line item",
)
async def add_item(
    contract_id: int,
    data: RentalContractItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_UPDATE),
):
    item = await RentalContractService(db).add_item(contract_id, data, user_id=current_user.id)
    return RentalContractItemOut.model_validate(item)


@router.put(
    "/{contract_id}/items/bulk",
    response_model=list[RentalContractItemOut],
    summary="Bulk replace line items",
)
async def replace_items_bulk(
    contract_id: int,
    data: RentalContractItemBulkReplaceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_UPDATE),
):
    items = await RentalContractService(db).replace_items_bulk(contract_id, data, user_id=current_user.id)
    return [RentalContractItemOut.model_validate(i) for i in items]


@router.put(
    "/{contract_id}/items/{item_id}",
    response_model=RentalContractItemOut,
    summary="Update line item",
)
async def update_item(
    contract_id: int,
    item_id: int,
    data: RentalContractItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_UPDATE),
):
    item = await RentalContractService(db).update_item(contract_id, item_id, data)
    return RentalContractItemOut.model_validate(item)


@router.delete(
    "/{contract_id}/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove line item",
)
async def delete_item(
    contract_id: int,
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_UPDATE),
):
    await RentalContractService(db).delete_item(contract_id, item_id, user_id=current_user.id)


# =============================================================================
# Workflow Actions
# =============================================================================


@router.post("/{contract_id}/submit", response_model=RentalContractOut, summary="Submit for review")
async def submit_contract(
    contract_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_UPDATE),
):
    reason = body.reason if body else None
    contract = await RentalWorkflowService(db).submit(contract_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_CONTRACT_SUBMITTED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract.id,
        details={"contract_number": contract.contract_number},
    )
    return await _contract_out(db, contract)


@router.post("/{contract_id}/approve", response_model=RentalContractOut, summary="Approve contract")
async def approve_contract(
    contract_id: int,
    body: ApproveContractAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_APPROVE),
):
    contract = await RentalWorkflowService(db).approve(contract_id, body, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_CONTRACT_APPROVED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract.id,
        details={
            "contract_number": contract.contract_number,
            "reason": body.reason if body else None,
        },
    )
    return await _contract_out(db, contract)


@router.post("/{contract_id}/reject", response_model=RentalContractOut, summary="Request revision")
async def reject_contract(
    contract_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_APPROVE),
):
    reason = body.reason if body else None
    contract = await RentalWorkflowService(db).reject(contract_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_CONTRACT_REVISION,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract.id,
        details={"contract_number": contract.contract_number, "reason": reason},
    )
    return await _contract_out(db, contract)


@router.post("/{contract_id}/activate", response_model=RentalContractOut, summary="Activate contract")
async def activate_contract(
    contract_id: int,
    body: ActivateContractAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_DELIVER),
):
    contract = await RentalWorkflowService(db).activate(contract_id, body, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_CONTRACT_ACTIVATED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract.id,
        details={"contract_number": contract.contract_number},
    )
    return await _contract_out(db, contract)


@router.post("/{contract_id}/cancel", response_model=RentalContractOut, summary="Cancel contract")
async def cancel_contract(
    contract_id: int,
    body: CancelContractAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_UPDATE),
):
    contract = await RentalWorkflowService(db).cancel(contract_id, body, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_CONTRACT_CANCELLED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract.id,
        details={
            "contract_number": contract.contract_number,
            "reason": body.cancellation_reason,
        },
    )
    return await _contract_out(db, contract)


@router.post("/{contract_id}/close", response_model=RentalContractOut, summary="Close contract")
async def close_contract(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_SETTLE),
):
    contract = await RentalWorkflowService(db).close(contract_id, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_CONTRACT_CLOSED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract.id,
        details={"contract_number": contract.contract_number},
    )
    return await _contract_out(db, contract)


@router.post(
    "/convert-quotation",
    response_model=RentalContractOut,
    status_code=status.HTTP_201_CREATED,
    summary="Convert quotation to rental contract",
)
async def convert_quotation(
    body: ConvertQuotationAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_CREATE),
):
    contract = await RentalContractService(db).convert_from_quotation(body, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_CONTRACT_CREATED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract.id,
        details={
            "contract_number": contract.contract_number,
            "quotation_id": body.quotation_id,
        },
    )
    return await _contract_out(db, contract)


# =============================================================================
# Extensions
# =============================================================================


@router.get(
    "/{contract_id}/extensions",
    response_model=list[RentalExtensionOut],
    summary="List extensions",
)
async def list_extensions(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_READ),
):
    detail = await RentalContractService(db).get_contract(contract_id)
    return detail.recent_extensions


@router.post(
    "/{contract_id}/extensions",
    response_model=RentalExtensionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Request extension",
)
async def request_extension(
    contract_id: int,
    body: RentalExtensionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_UPDATE),
):
    ext = await RentalWorkflowService(db).request_extension(contract_id, body, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_EXTENSION_REQUESTED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract_id,
        details={
            "extension_number": ext.extension_number,
            "new_end_date": str(ext.new_end_date),
        },
    )
    return RentalExtensionOut.model_validate(ext)


@router.post(
    "/{contract_id}/extensions/{ext_id}/approve",
    response_model=RentalExtensionOut,
    summary="Approve extension",
)
async def approve_extension(
    contract_id: int,
    ext_id: int,
    body: ExtensionDecisionAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_APPROVE),
):
    ext = await RentalWorkflowService(db).approve_extension(contract_id, ext_id, body, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_EXTENSION_APPROVED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract_id,
        details={
            "extension_number": ext.extension_number,
            "new_end_date": str(ext.new_end_date),
        },
    )
    return RentalExtensionOut.model_validate(ext)


@router.post(
    "/{contract_id}/extensions/{ext_id}/reject",
    response_model=RentalExtensionOut,
    summary="Reject extension",
)
async def reject_extension(
    contract_id: int,
    ext_id: int,
    body: ExtensionDecisionAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_APPROVE),
):
    ext = await RentalWorkflowService(db).reject_extension(contract_id, ext_id, body, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_EXTENSION_REJECTED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract_id,
        details={
            "extension_number": ext.extension_number,
            "reason": body.reason if body else None,
        },
    )
    return RentalExtensionOut.model_validate(ext)


# =============================================================================
# Returns
# =============================================================================


@router.get(
    "/{contract_id}/returns",
    response_model=list[RentalReturnOut],
    summary="List returns",
)
async def list_returns(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_READ),
):
    detail = await RentalContractService(db).get_contract(contract_id)
    return detail.active_returns


@router.post(
    "/{contract_id}/returns",
    response_model=RentalReturnOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create return request",
)
async def create_return(
    contract_id: int,
    body: RentalReturnCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_UPDATE),
):
    ret = await RentalWorkflowService(db).create_return(contract_id, body, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_RETURN_REQUESTED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract_id,
        details={"return_number": ret.return_number},
    )
    return RentalReturnOut.model_validate(ret)


@router.put(
    "/{contract_id}/returns/{return_id}",
    response_model=RentalReturnOut,
    summary="Update return",
)
async def update_return(
    contract_id: int,
    return_id: int,
    body: RentalReturnUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_DELIVER),
):
    ret = await RentalWorkflowService(db).update_return(contract_id, return_id, body, current_user.id)
    return RentalReturnOut.model_validate(ret)


@router.post(
    "/{contract_id}/returns/{return_id}/pickup",
    response_model=RentalReturnOut,
    summary="Mark return picked up",
)
async def pickup_return(
    contract_id: int,
    return_id: int,
    body: PickupAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_DELIVER),
):
    ret = await RentalWorkflowService(db).pickup_return(contract_id, return_id, body, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_RETURN_PICKED_UP,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract_id,
        details={"return_number": ret.return_number},
    )
    return RentalReturnOut.model_validate(ret)


@router.post(
    "/{contract_id}/returns/{return_id}/receive",
    response_model=RentalReturnOut,
    summary="Mark return received",
)
async def receive_return(
    contract_id: int,
    return_id: int,
    body: ReceiveAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_DELIVER),
):
    ret = await RentalWorkflowService(db).receive_return(contract_id, return_id, body, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_RETURN_RECEIVED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract_id,
        details={"return_number": ret.return_number},
    )
    return RentalReturnOut.model_validate(ret)


@router.post(
    "/{contract_id}/returns/{return_id}/complete",
    response_model=RentalReturnOut,
    summary="Complete return",
)
async def complete_return(
    contract_id: int,
    return_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_INSPECT),
):
    ret = await RentalWorkflowService(db).complete_return(contract_id, return_id, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_RETURN_COMPLETED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract_id,
        details={"return_number": ret.return_number},
    )
    return RentalReturnOut.model_validate(ret)


# =============================================================================
# Damage Reports
# =============================================================================


@router.get(
    "/{contract_id}/damage-reports",
    response_model=list[RentalDamageReportOut],
    summary="List damage reports",
)
async def list_damage_reports(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_READ),
):
    repo = RentalRepository(db)
    contract = await repo.get_detail(contract_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    return [RentalDamageReportOut.model_validate(r) for r in contract.damage_reports]


@router.post(
    "/{contract_id}/damage-reports",
    response_model=RentalDamageReportOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create damage report",
)
async def create_damage_report(
    contract_id: int,
    body: RentalDamageReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_INSPECT),
):
    report = await RentalWorkflowService(db).create_damage_report(contract_id, body, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_DAMAGE_ASSESSED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract_id,
        details={"report_number": report.report_number},
    )
    return RentalDamageReportOut.model_validate(report)


@router.put(
    "/{contract_id}/damage-reports/{report_id}",
    response_model=RentalDamageReportOut,
    summary="Update damage report",
)
async def update_damage_report(
    contract_id: int,
    report_id: int,
    body: RentalDamageReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_INSPECT),
):
    report = await RentalWorkflowService(db).update_damage_report(
        contract_id, report_id, body, current_user.id,
    )
    return RentalDamageReportOut.model_validate(report)


@router.post(
    "/{contract_id}/damage-reports/{report_id}/dispute",
    response_model=RentalDamageReportOut,
    summary="Dispute damage charge",
)
async def dispute_damage(
    contract_id: int,
    report_id: int,
    body: DisputeAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_UPDATE),
):
    report = await RentalWorkflowService(db).dispute_damage(
        contract_id, report_id, body, current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_DAMAGE_DISPUTED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract_id,
        details={"report_number": report.report_number},
    )
    return RentalDamageReportOut.model_validate(report)


@router.post(
    "/{contract_id}/damage-reports/{report_id}/resolve-dispute",
    response_model=RentalDamageReportOut,
    summary="Resolve damage dispute",
)
async def resolve_dispute(
    contract_id: int,
    report_id: int,
    body: ResolveDisputeAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_SETTLE),
):
    report = await RentalWorkflowService(db).resolve_dispute(
        contract_id, report_id, body, current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_DAMAGE_RESOLVED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract_id,
        details={
            "report_number": report.report_number,
            "final_charge": report.final_charge,
        },
    )
    return RentalDamageReportOut.model_validate(report)


# =============================================================================
# Billing Cycles
# =============================================================================


@router.get(
    "/{contract_id}/billing-cycles",
    response_model=list[RentalBillingCycleOut],
    summary="List billing cycles",
)
async def list_billing_cycles(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_READ),
):
    repo = RentalRepository(db)
    contract = await repo.get_detail(contract_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    return [RentalBillingCycleOut.model_validate(c) for c in contract.billing_cycles]


@router.post(
    "/{contract_id}/billing-cycles",
    response_model=RentalBillingCycleOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create billing cycle entry",
)
async def create_billing_cycle(
    contract_id: int,
    body: RentalBillingCycleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_SETTLE),
):
    repo = RentalRepository(db)
    contract = await repo.get_by_id(contract_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="Contract not found")

    # Generate billing number
    year = time.strftime("%Y")
    base = f"RB-{year}"
    seq = 1
    while await repo.billing_number_exists(f"{base}-{seq:05d}"):
        seq += 1
    billing_number = f"{base}-{seq:05d}"

    amount = round(body.quantity * body.unit_rate, 2)
    total_amount = round(amount + body.tax_amount, 2)

    cycle = RentalBillingCycle(
        billing_number=billing_number,
        contract_id=contract_id,
        contract_item_id=body.contract_item_id,
        billing_type=body.billing_type.value,
        description=body.description,
        period_start=body.period_start,
        period_end=body.period_end,
        quantity=body.quantity,
        unit_rate=body.unit_rate,
        amount=amount,
        tax_amount=body.tax_amount,
        total_amount=total_amount,
        currency=contract.currency,
        is_credit=body.is_credit,
        due_date=body.due_date,
        notes=body.notes,
        created_by=current_user.id,
    )
    cycle = await repo.add_billing_cycle(cycle)
    await db.commit()

    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RENTAL_BILLING_CREATED,
        entity_type=EntityType.RENTAL_CONTRACT,
        entity_id=contract_id,
        details={
            "billing_number": cycle.billing_number,
            "amount": total_amount,
        },
    )
    return RentalBillingCycleOut.model_validate(cycle)


# =============================================================================
# Status History
# =============================================================================


@router.get(
    "/{contract_id}/status-history",
    response_model=list[RentalStatusHistoryOut],
    summary="Status audit trail",
)
async def list_status_history(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_READ),
):
    detail = await RentalContractService(db).get_contract(contract_id)
    return detail.recent_status_history
