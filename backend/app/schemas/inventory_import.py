from pydantic import BaseModel


class InventoryImportRowError(BaseModel):
    row_number: int
    error_message: str


class InventoryImportResult(BaseModel):
    success: bool
    rows_imported: int
    rows_updated: int
    errors: list[InventoryImportRowError] = []
