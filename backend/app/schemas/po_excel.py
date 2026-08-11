from pydantic import BaseModel


class POExcelImportRowError(BaseModel):
    row_number: int
    error_message: str


class POExcelImportResult(BaseModel):
    success: bool
    po_id: int | None = None
    po_number: str | None = None
    items_replaced: int = 0
    errors: list[POExcelImportRowError] = []


class GridColumn(BaseModel):
    field: str
    header_name: str
    editable: bool = True
    type: str = "text"  # "text" | "number"


class POGridRow(BaseModel):
    id: int | None = None  # null for a brand-new, unsaved row
    item_code: str | None = None
    description: str | None = None
    unit: str | None = None
    quantity_ordered: float
    unit_cost: float
    line_total: float


class POGridData(BaseModel):
    columns: list[GridColumn]
    rows: list[POGridRow]


class POGridUpdateRequest(BaseModel):
    """Bulk replace of every line item on a PO — what an ag-Grid/Handsontable
    "save" action posts back after in-grid editing."""
    rows: list[POGridRow]
