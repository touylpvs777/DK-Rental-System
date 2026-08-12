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
