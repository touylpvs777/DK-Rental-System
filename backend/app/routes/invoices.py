import io
import logging

from anyio import to_thread
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.user import User
from app.services.billing_service import BillingService
from app.services.pdf_service import PdfService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.get("/{invoice_id}/pdf", summary="Render invoice PDF")
async def get_invoice_pdf(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.BILLING_READ),
) -> StreamingResponse:
    """Render the current invoice record as an inline A4 PDF."""
    invoice = await BillingService(db).get_invoice(invoice_id)
    try:
        pdf = await to_thread.run_sync(PdfService().render_invoice, invoice)
    except Exception as exc:
        logger.exception("Failed to render invoice PDF: id=%s", invoice_id)
        raise HTTPException(status_code=500, detail="Unable to generate invoice PDF") from exc

    filename = f"invoice-{invoice.invoice_number}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
