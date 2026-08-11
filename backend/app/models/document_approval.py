import enum
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class ApprovalRole(str, enum.Enum):
    ISSUED_BY = "issued_by"
    REVIEWED_BY = "reviewed_by"
    APPROVED_BY = "approved_by"


class DocumentApproval(Base):
    """
    The "Issued By / Reviewed By / Approved By" signature block printed at the
    bottom of a financial document. This is distinct from `QuotationApproval`
    (app/models/quotation_approval.py), which logs a workflow decision
    (approve/reject/request-changes) — this table just records who signed a
    given document and when, for print/export purposes.

    One document type's FK is set per row (enforced by the check constraint
    below) since a single table can't hold a real FK to three different
    parent tables at once.
    """

    __tablename__ = "document_approvals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    purchase_order_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=True, index=True,
    )
    invoice_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=True, index=True,
    )
    quotation_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("quotations.id", ondelete="CASCADE"), nullable=True, index=True,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    signed_by: Mapped[str] = mapped_column(String(200), nullable=False)
    signature_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    purchase_order: Mapped["PurchaseOrder | None"] = relationship("PurchaseOrder")
    invoice: Mapped["Invoice | None"] = relationship("Invoice")
    quotation: Mapped["Quotation | None"] = relationship("Quotation")

    __table_args__ = (
        CheckConstraint(
            "(CASE WHEN purchase_order_id IS NOT NULL THEN 1 ELSE 0 END) + "
            "(CASE WHEN invoice_id IS NOT NULL THEN 1 ELSE 0 END) + "
            "(CASE WHEN quotation_id IS NOT NULL THEN 1 ELSE 0 END) = 1",
            name="ck_document_approval_exactly_one_document",
        ),
    )
