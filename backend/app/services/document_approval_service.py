from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_approval import DocumentApproval
from app.repositories.document_approval_repository import DocumentApprovalRepository
from app.schemas.document_approval import DocumentApprovalSetRequest


class DocumentApprovalService:
    """Shared "Issued By / Reviewed By / Approved By" signature-block logic
    for Purchase Orders, Invoices, and Quotations — each route module passes
    its own document's id via the matching keyword."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = DocumentApprovalRepository(db)

    async def get_for_document(
        self, *, purchase_order_id: int | None = None, invoice_id: int | None = None, quotation_id: int | None = None,
    ) -> list[DocumentApproval]:
        return await self._repo.get_for_document(
            purchase_order_id=purchase_order_id, invoice_id=invoice_id, quotation_id=quotation_id,
        )

    async def set_approvals(
        self, data: DocumentApprovalSetRequest, *,
        purchase_order_id: int | None = None, invoice_id: int | None = None, quotation_id: int | None = None,
    ) -> list[DocumentApproval]:
        for entry in data.approvals:
            if entry.signed_by and entry.signed_by.strip():
                await self._repo.upsert_role(
                    purchase_order_id=purchase_order_id, invoice_id=invoice_id, quotation_id=quotation_id,
                    role=entry.role.value, signed_by=entry.signed_by.strip(), signature_date=entry.signature_date,
                )
            else:
                # An empty signed_by clears that role's signature line entirely.
                await self._repo.clear_role(
                    purchase_order_id=purchase_order_id, invoice_id=invoice_id, quotation_id=quotation_id,
                    role=entry.role.value,
                )
        await self.db.commit()
        return await self.get_for_document(
            purchase_order_id=purchase_order_id, invoice_id=invoice_id, quotation_id=quotation_id,
        )
