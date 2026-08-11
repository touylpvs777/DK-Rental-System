import logging
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forklift_document import ForkliftDocument

logger = logging.getLogger(__name__)


class ForkliftDocumentRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, document_id: int) -> ForkliftDocument | None:
        return await self.db.get(ForkliftDocument, document_id)

    async def get_by_forklift(
        self,
        forklift_id: int,
        document_type: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ForkliftDocument]:
        stmt = (
            select(ForkliftDocument)
            .where(ForkliftDocument.forklift_id == forklift_id)
            .order_by(ForkliftDocument.created_at.desc())
        )
        if document_type is not None:
            stmt = stmt.where(ForkliftDocument.document_type == document_type)
        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_forklift(self, forklift_id: int) -> int:
        result = await self.db.execute(
            select(func.count(ForkliftDocument.id))
            .where(ForkliftDocument.forklift_id == forklift_id)
        )
        return result.scalar_one()

    async def get_expiring(
        self,
        within_days: int = 30,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ForkliftDocument]:
        today = date.today()
        from datetime import timedelta
        cutoff = today + timedelta(days=within_days)
        result = await self.db.execute(
            select(ForkliftDocument)
            .where(
                ForkliftDocument.expiry_date.is_not(None),
                ForkliftDocument.expiry_date >= today,
                ForkliftDocument.expiry_date <= cutoff,
            )
            .order_by(ForkliftDocument.expiry_date.asc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, document: ForkliftDocument) -> ForkliftDocument:
        self.db.add(document)
        await self.db.flush()
        await self.db.refresh(document)
        logger.info(
            "Document added: forklift=%s type=%s title=%s",
            document.forklift_id, document.document_type, document.title,
        )
        return document

    async def update(self, document: ForkliftDocument, changes: dict) -> ForkliftDocument:
        for key, value in changes.items():
            setattr(document, key, value)
        await self.db.flush()
        await self.db.refresh(document)
        logger.info("Document updated: id=%s", document.id)
        return document

    async def delete(self, document: ForkliftDocument) -> None:
        await self.db.delete(document)
        await self.db.flush()
        logger.info("Document deleted: id=%s forklift=%s", document.id, document.forklift_id)
