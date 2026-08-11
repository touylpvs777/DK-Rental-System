import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class NotificationChannel(str, enum.Enum):
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    # Pure in-app record — no external delivery is attempted. Used for the
    # role-targeted admin activity feed, where "sent" just means "created".
    IN_APP = "in_app"


class NotificationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # String columns — no CHECK constraint, so new enum values never break existing tables.
    channel: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20), default=NotificationStatus.PENDING.value, nullable=False, index=True,
    )

    recipient: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(300), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    # Staff-facing alerts (Smart Audit, Step 3): links the notification to the
    # subscribed User so the frontend bell can show "my" alerts + unread state.
    # Nullable — customer-facing notifications (WhatsApp/email to a customer)
    # have no corresponding User row.
    recipient_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # Enterprise Audit & Alert (role broadcast): set instead of recipient_user_id
    # when this notification targets everyone holding a role (e.g. "admin") —
    # a global activity-feed entry rather than a single user's personal alert.
    # A row has either recipient_user_id OR target_role, not both.
    target_role: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    provider_message_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Domain-event linkage (Step 3): e.g. event_type="rental.activated", entity_type="rental_contract".
    event_type: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True,
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    recipient_user: Mapped["User | None"] = relationship("User")
