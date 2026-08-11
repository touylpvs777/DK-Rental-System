from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardSummary, ErpDashboardSummary, LeadMetrics, ProfitTrendPoint, TrendPoint
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.VIEW_DASHBOARD),
):
    return await DashboardService(db).get_summary()


@router.get(
    "/erp-summary",
    response_model=ErpDashboardSummary,
    summary="Financial & operational ERP summary: sales, costs, profit, inventory, service, credit, revenue breakdown",
)
async def get_erp_summary(
    time_range: str = Query(
        default="all",
        alias="range",
        pattern="^(week|month|last_month|year|all)$",
        description="Time-range filter applied to the revenue breakdown chart only",
    ),
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.VIEW_DASHBOARD),
):
    return await DashboardService(db).get_erp_summary(revenue_range=time_range)


@router.get(
    "/profit-trend",
    response_model=list[ProfitTrendPoint],
    summary="Monthly net profit trend (revenue minus recorded purchase and service costs)",
)
async def get_profit_trend(
    months: int = Query(default=6, ge=1, le=24, description="Number of months to look back"),
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.VIEW_DASHBOARD),
):
    return await DashboardService(db).get_profit_trend(months=months)


@router.get(
    "/lead-trend",
    response_model=list[TrendPoint],
    summary="Monthly lead creation trend",
)
async def get_lead_trend(
    months: int = Query(default=12, ge=1, le=24, description="Number of months to look back"),
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.VIEW_DASHBOARD),
):
    return await DashboardService(db).get_lead_trend(months=months)


@router.get(
    "/customer-trend",
    response_model=list[TrendPoint],
    summary="Monthly customer creation trend",
)
async def get_customer_trend(
    months: int = Query(default=12, ge=1, le=24, description="Number of months to look back"),
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.VIEW_DASHBOARD),
):
    return await DashboardService(db).get_customer_trend(months=months)


@router.get(
    "/lead-metrics",
    response_model=LeadMetrics,
    summary="Lead conversion, win rate, lost rate and breakdowns",
)
async def get_lead_metrics(
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.VIEW_DASHBOARD),
):
    return await DashboardService(db).get_lead_metrics()
