from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class SchedulerLock(Base):
    """
    One row per named background job, used as a simple cross-process mutual
    exclusion lock so a job can't run concurrently with itself — including
    across a server restart, since (unlike an in-memory lock) this row
    persists in the database.
    """
    __tablename__ = "scheduler_locks"

    job_name: Mapped[str] = mapped_column(String(100), primary_key=True)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
