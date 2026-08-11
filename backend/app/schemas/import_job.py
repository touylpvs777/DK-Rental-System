from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.models.import_job import ImportStatus


# ── Row-level preview types ───────────────────────────────────────────────────

class PreviewSpec(BaseModel):
    spec_group: str
    spec_key: str
    spec_label: str
    spec_value: str
    spec_unit: str | None = None


class PreviewProduct(BaseModel):
    """A single product row as parsed from Excel, before DB write."""

    row_number: int
    action: str  # "create" | "update"
    name_en: str
    model_number: str | None = None
    brand_name: str | None = None
    category_l1: str | None = None
    category_l2: str | None = None
    category_l3: str | None = None
    description_en: str | None = None
    specs: list[PreviewSpec] = []


class PreviewError(BaseModel):
    row_number: int
    sheet_name: str
    error_message: str
    row_data: dict[str, Any] | None = None


class SheetPreview(BaseModel):
    sheet_name: str
    handler: str
    valid_rows: list[PreviewProduct] = []
    error_rows: list[PreviewError] = []
    total_valid: int = 0
    total_errors: int = 0


# ── Import job response schemas ───────────────────────────────────────────────

class ImportPreviewResponse(BaseModel):
    job_id: int
    filename: str
    sheets_detected: list[str]
    total_valid: int
    total_errors: int
    sheets: list[SheetPreview]


class ImportExecuteResponse(BaseModel):
    job_id: int
    status: str
    success_rows: int
    error_rows: int
    errors: list[PreviewError] = []


class ImportErrorOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    sheet_name: str | None = None
    row_number: int
    error_message: str
    row_data: dict[str, Any] | None = None


class ImportJobOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    original_filename: str
    status: str
    total_rows: int
    processed_rows: int
    success_rows: int
    error_rows: int
    created_by: int | None = None
    created_at: datetime
    completed_at: datetime | None = None


class ImportJobDetail(ImportJobOut):
    errors: list[ImportErrorOut] = []
