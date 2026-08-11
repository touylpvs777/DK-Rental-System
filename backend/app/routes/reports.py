from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.user import User
from app.schemas.report import ReportFilters, ReportFormat
from app.services.report_service import ReportService
from app.utils.export import csv_response, excel_response

router = APIRouter(prefix="/reports", tags=["Reports"])

_EXCEL_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

_REPORT_RESPONSES = {
    200: {
        "content": {
            "text/csv": {"schema": {"type": "string", "format": "binary"}},
            _EXCEL_MIME: {"schema": {"type": "string", "format": "binary"}},
        },
        "description": "File download in the requested format.",
    }
}


def _respond(data: list[dict], stem: str, sheet: str, fmt: ReportFormat) -> StreamingResponse:
    today = date.today().isoformat()
    if fmt == ReportFormat.EXCEL:
        return excel_response(data, filename=f"{stem}_{today}.xlsx", sheet_name=sheet)
    return csv_response(data, filename=f"{stem}_{today}.csv")


# ── Customer report ───────────────────────────────────────────────────────────

@router.get(
    "/customers",
    response_class=StreamingResponse,
    responses=_REPORT_RESPONSES,
    summary="Customer report (CSV / Excel)",
)
async def customer_report(
    filters: ReportFilters = Depends(),
    db=Depends(get_db),
    _: User = require_permission(PermissionName.VIEW_DASHBOARD),
):
    data = await ReportService(db).customers(filters)
    return _respond(data, stem="customers", sheet="Customers", fmt=filters.format)


# ── Lead report ───────────────────────────────────────────────────────────────

@router.get(
    "/leads",
    response_class=StreamingResponse,
    responses=_REPORT_RESPONSES,
    summary="Lead pipeline report (CSV / Excel)",
)
async def lead_report(
    filters: ReportFilters = Depends(),
    db=Depends(get_db),
    _: User = require_permission(PermissionName.VIEW_DASHBOARD),
):
    data = await ReportService(db).leads(filters)
    return _respond(data, stem="leads", sheet="Leads", fmt=filters.format)


# ── Sales report ──────────────────────────────────────────────────────────────

@router.get(
    "/sales",
    response_class=StreamingResponse,
    responses=_REPORT_RESPONSES,
    summary="Sales report with pipeline summary (CSV / Excel)",
)
async def sales_report(
    filters: ReportFilters = Depends(),
    db=Depends(get_db),
    _: User = require_permission(PermissionName.VIEW_DASHBOARD),
):
    result = await ReportService(db).sales(filters)
    detail: list[dict] = result["detail"]
    summary: dict = result["summary"]

    if detail:
        # Build summary footer rows using the same column keys as the detail rows.
        # Maps each aggregate into (title, value, status) so the output is readable.
        blank: dict = {k: "" for k in detail[0]}

        def _srow(label: str, val: object, tag: str = "") -> dict:
            r = dict(blank)
            if "title"  in r: r["title"]  = label
            if "value"  in r: r["value"]  = val
            if "status" in r: r["status"] = tag
            return r

        footer = [
            blank,
            _srow("── SUMMARY ──",                  "",                         ""),
            _srow("Total Pipeline Value",             summary["total_pipeline"],  "all"),
            _srow("Won Revenue",                     summary["won_value"],        "won"),
            _srow("Lost Revenue",                    summary["lost_value"],       "lost"),
            _srow("Active Pipeline",                 summary["active_pipeline"],  "active"),
            _srow("Total Leads (with value)",        summary["total_leads"],      "count"),
        ]
        combined = detail + footer
    else:
        combined = []

    return _respond(combined, stem="sales", sheet="Sales", fmt=filters.format)
