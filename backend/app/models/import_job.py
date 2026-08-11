import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class ImportStatus(str, enum.Enum):
    PENDING = "pending"
    PREVIEW = "preview"      # parsed and validated, awaiting confirmation
    PROCESSING = "processing"
    COMPLETED = "completed"
    PARTIAL = "partial"      # some rows succeeded, some failed
    FAILED = "failed"


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default=ImportStatus.PENDING.value, nullable=False
    )
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    processed_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    success_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Serialised parsed rows stored between preview and execute steps
    preview_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    errors: Mapped[list["ImportError"]] = relationship(
        "ImportError", back_populates="job", cascade="all, delete-orphan"
    )


class ImportError(Base):
    __tablename__ = "import_errors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("import_jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sheet_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    row_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=False)

    job: Mapped["ImportJob"] = relationship("ImportJob", back_populates="errors")
