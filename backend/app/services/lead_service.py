from fastapi import HTTPException, status as http_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.lead import Lead, LeadSource, LeadStatus, VALID_TRANSITIONS
from app.models.lead_note import LeadNote
from app.schemas.lead import LeadCreate, LeadNoteCreate, LeadUpdate


class LeadService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, lead_id: int) -> Lead | None:
        result = await self.db.execute(select(Lead).where(Lead.id == lead_id))
        return result.scalar_one_or_none()

    async def get_by_id_with_detail(self, lead_id: int) -> Lead | None:
        result = await self.db.execute(
            select(Lead)
            .options(
                selectinload(Lead.assigned_user),
                selectinload(Lead.customer),
                selectinload(Lead.lead_notes).selectinload(LeadNote.author),
            )
            .where(Lead.id == lead_id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: LeadStatus | None = None,
        source: LeadSource | None = None,
        assigned_to: int | None = None,
        customer_id: int | None = None,
    ) -> list[Lead]:
        stmt = select(Lead)
        if status is not None:
            stmt = stmt.where(Lead.status == status)
        if source is not None:
            stmt = stmt.where(Lead.source == source.value)
        if assigned_to is not None:
            stmt = stmt.where(Lead.assigned_to == assigned_to)
        if customer_id is not None:
            stmt = stmt.where(Lead.customer_id == customer_id)
        stmt = stmt.order_by(Lead.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, data: LeadCreate, created_by: int) -> Lead:
        payload = data.model_dump()
        # Enum → stored string value
        if payload.get("source") is not None:
            payload["source"] = str(payload["source"].value) if hasattr(payload["source"], "value") else str(payload["source"])
        lead = Lead(**payload, created_by=created_by)
        self.db.add(lead)
        await self.db.commit()
        await self.db.refresh(lead)
        return lead

    async def update(self, lead: Lead, data: LeadUpdate) -> Lead:
        updates = data.model_dump(exclude_unset=True)

        if "status" in updates and updates["status"] is not None:
            new_status = updates["status"]
            if new_status != lead.status:
                allowed = VALID_TRANSITIONS.get(lead.status, set())
                if new_status not in allowed:
                    allowed_values = [s.value for s in allowed]
                    raise HTTPException(
                        status_code=http_status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=(
                            f"Cannot transition from '{lead.status.value}' to '{new_status.value}'. "
                            f"Allowed next statuses: {allowed_values or ['none — terminal state']}."
                        ),
                    )

        if "source" in updates and updates["source"] is not None:
            updates["source"] = str(updates["source"].value) if hasattr(updates["source"], "value") else str(updates["source"])

        for field, value in updates.items():
            setattr(lead, field, value)
        await self.db.commit()
        await self.db.refresh(lead)
        return lead

    async def delete(self, lead: Lead) -> None:
        await self.db.delete(lead)
        await self.db.commit()

    # ── Notes ─────────────────────────────────────────────────────────────

    async def add_note(self, lead_id: int, data: LeadNoteCreate, author_id: int) -> LeadNote:
        note = LeadNote(lead_id=lead_id, author_id=author_id, content=data.content)
        self.db.add(note)
        await self.db.commit()
        # Reload with author for response
        result = await self.db.execute(
            select(LeadNote)
            .options(selectinload(LeadNote.author))
            .where(LeadNote.id == note.id)
        )
        return result.scalar_one()

    async def get_notes(self, lead_id: int) -> list[LeadNote]:
        result = await self.db.execute(
            select(LeadNote)
            .options(selectinload(LeadNote.author))
            .where(LeadNote.lead_id == lead_id)
            .order_by(LeadNote.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_note(self, note_id: int) -> LeadNote | None:
        result = await self.db.execute(
            select(LeadNote).where(LeadNote.id == note_id)
        )
        return result.scalar_one_or_none()

    async def delete_note(self, note: LeadNote) -> None:
        await self.db.delete(note)
        await self.db.commit()
