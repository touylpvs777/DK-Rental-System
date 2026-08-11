from datetime import date, datetime

from pydantic import BaseModel

from app.models.document_approval import ApprovalRole


class DocumentApprovalIn(BaseModel):
    """One signature line — `signed_by=None` clears that role's signature."""
    role: ApprovalRole
    signed_by: str | None = None
    signature_date: date | None = None


class DocumentApprovalSetRequest(BaseModel):
    """Bulk-set request body: only the roles included are touched."""
    approvals: list[DocumentApprovalIn]


class DocumentApprovalOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    role: str
    signed_by: str
    signature_date: date | None = None
    created_at: datetime
    updated_at: datetime | None = None
