import enum
from datetime import date

from fastapi import Query


class ReportFormat(str, enum.Enum):
    CSV = "csv"
    EXCEL = "excel"


class ReportFilters:
    """
    FastAPI dependency class — injects date-range and format query parameters
    into any report endpoint without repeating the parameter declarations.

    Usage:
        filters: ReportFilters = Depends()
    """

    def __init__(
        self,
        from_date: date | None = Query(
            default=None,
            description="Inclusive start date (YYYY-MM-DD)",
        ),
        to_date: date | None = Query(
            default=None,
            description="Inclusive end date (YYYY-MM-DD)",
        ),
        format: ReportFormat = Query(
            default=ReportFormat.CSV,
            description="Export format: csv or excel",
        ),
    ) -> None:
        self.from_date = from_date
        self.to_date = to_date
        self.format = format
