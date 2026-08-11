from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_approval import DocumentApproval

# The column name to filter/set for each document type — keeps every method
# below a one-liner instead of three near-identical branches.
_DOC_COLUMNS = ("purchase_order_id", "invoice_id", "quotation_id")


class DocumentApprovalRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_for_document(
        self, *, purchase_order_id: int | None = None, invoice_id: int | None = None, quotation_id: int | None = None,
    ) -> list[DocumentApproval]:
        column, value = self._resolve(purchase_order_id, invoice_id, quotation_id)
        stmt = select(DocumentApproval).where(column == value).order_by(DocumentApproval.id.asc())
        return list((await self.db.execute(stmt)).scalars().all())

    async def upsert_role(
        self, *, purchase_order_id: int | None, invoice_id: int | None, quotation_id: int | None,
        role: str, signed_by: str, signature_date,
    ) -> DocumentApproval:
        column, value = self._resolve(purchase_order_id, invoice_id, quotation_id)
        existing = (await self.db.execute(
            select(DocumentApproval).where(column == value, DocumentApproval.role == role)
        )).scalar_one_or_none()

        if existing:
            existing.signed_by = signed_by
            existing.signature_date = signature_date
            await self.db.flush()
            await self.db.refresh(existing)
            return existing

        approval = DocumentApproval(
            purchase_order_id=purchase_order_id, invoice_id=invoice_id, quotation_id=quotation_id,
            role=role, signed_by=signed_by, signature_date=signature_date,
        )
        self.db.add(approval)
        await self.db.flush()
        await self.db.refresh(approval)
        return approval

    async def clear_role(
        self, *, purchase_order_id: int | None, invoice_id: int | None, quotation_id: int | None, role: str,
    ) -> None:
        column, value = self._resolve(purchase_order_id, invoice_id, quotation_id)
        existing = (await self.db.execute(
            select(DocumentApproval).where(column == value, DocumentApproval.role == role)
        )).scalar_one_or_none()
        if existing:
            await self.db.delete(existing)
            await self.db.flush()

    @staticmethod
    def _resolve(purchase_order_id: int | None, invoice_id: int | None, quotation_id: int | None):
        provided = [
            (DocumentApproval.purchase_order_id, purchase_order_id),
            (DocumentApproval.invoice_id, invoice_id),
            (DocumentApproval.quotation_id, quotation_id),
        ]
        set_pairs = [(col, val) for col, val in provided if val is not None]
        if len(set_pairs) != 1:
            raise ValueError("Exactly one of purchase_order_id/invoice_id/quotation_id must be provided")
        return set_pairs[0]
