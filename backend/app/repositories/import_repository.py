import logging

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.import_job import ImportError, ImportJob

logger = logging.getLogger(__name__)


class ImportRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, job_id: int) -> ImportJob | None:
        return await self.db.get(ImportJob, job_id)

    async def get_detail(self, job_id: int) -> ImportJob | None:
        result = await self.db.execute(
            select(ImportJob)
            .options(selectinload(ImportJob.errors))
            .where(ImportJob.id == job_id)
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 50) -> list[ImportJob]:
        result = await self.db.execute(
            select(ImportJob)
            .order_by(ImportJob.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, job: ImportJob) -> ImportJob:
        self.db.add(job)
        await self.db.flush()
        await self.db.refresh(job)
        logger.info("ImportJob created: id=%s file=%s", job.id, job.original_filename)
        return job

    async def update(self, job: ImportJob, changes: dict) -> ImportJob:
        for key, value in changes.items():
            setattr(job, key, value)
        await self.db.flush()
        await self.db.refresh(job)
        return job

    async def add_error(self, error: ImportError) -> ImportError:
        self.db.add(error)
        await self.db.flush()
        return error

    async def delete(self, job: ImportJob) -> None:
        await self.db.delete(job)
        await self.db.flush()
        logger.info("ImportJob deleted: id=%s", job.id)
