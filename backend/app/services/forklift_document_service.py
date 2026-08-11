import logging
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forklift_document import ForkliftDocument
from app.repositories.forklift_document_repository import ForkliftDocumentRepository
from app.repositories.forklift_repository import ForkliftRepository
from app.schemas.forklift import ForkliftDocumentCreate, ForkliftDocumentUpdate

logger = logging.getLogger(__name__)


class ForkliftDocumentService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = ForkliftDocumentRepository(db)
        self._forklift_repo = ForkliftRepository(db)

    async def list_documents(
        self,
        forklift_id: int,
        document_type: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ForkliftDocument]:
        await self._require_forklift(forklift_id)
        return await self._repo.get_by_forklift(
            forklift_id, document_type=document_type, skip=skip, limit=limit,
        )

    async def get_expiring(
        self,
        within_days: int = 30,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ForkliftDocument]:
        return await self._repo.get_expiring(within_days=within_days, skip=skip, limit=limit)

    async def create_document(
        self,
        forklift_id: int,
        data: ForkliftDocumentCreate,
        uploaded_by: int,
    ) -> ForkliftDocument:
        await self._require_forklift(forklift_id)

        if data.expiry_date is not None and data.expiry_date < date.today():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Expiry date cannot be in the past.",
            )

        document = ForkliftDocument(
            forklift_id=forklift_id,
            document_type=data.document_type.value,
            title=data.title,
            file_url=data.file_url,
            file_size_bytes=data.file_size_bytes,
            mime_type=data.mime_type,
            expiry_date=data.expiry_date,
            notes=data.notes,
            uploaded_by=uploaded_by,
        )
        document = await self._repo.create(document)
        await self.db.commit()
        return document

    async def update_document(
        self,
        forklift_id: int,
        document_id: int,
        data: ForkliftDocumentUpdate,
        updated_by: int,
    ) -> ForkliftDocument:
        document = await self._require_owned(document_id, forklift_id)
        changes = data.model_dump(exclude_unset=True)

        if "document_type" in changes and changes["document_type"] is not None:
            changes["document_type"] = changes["document_type"].value

        document = await self._repo.update(document, changes)
        await self.db.commit()
        return document

    async def delete_document(self, forklift_id: int, document_id: int) -> None:
        document = await self._require_owned(document_id, forklift_id)
        await self._repo.delete(document)
        await self.db.commit()

    async def _require_forklift(self, forklift_id: int) -> None:
        forklift = await self._forklift_repo.get_by_id(forklift_id)
        if forklift is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Forklift not found",
            )

    async def _require_owned(self, document_id: int, forklift_id: int) -> ForkliftDocument:
        document = await self._repo.get_by_id(document_id)
        if document is None or document.forklift_id != forklift_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )
        return document
