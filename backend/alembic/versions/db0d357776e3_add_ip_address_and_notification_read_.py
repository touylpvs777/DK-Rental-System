"""add ip_address to activity_logs and recipient_user_id/is_read to notifications

Revision ID: db0d357776e3
Revises: 9cacbd54c4eb
Create Date: 2026-07-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'db0d357776e3'
down_revision: Union[str, Sequence[str], None] = '9cacbd54c4eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("activity_logs", sa.Column("ip_address", sa.String(length=45), nullable=True))

    # batch mode: SQLite can't ALTER TABLE ADD CONSTRAINT directly, so Alembic
    # rebuilds the table under the hood; on Postgres/MySQL this is a plain ALTER.
    with op.batch_alter_table("notifications") as batch_op:
        batch_op.add_column(sa.Column("recipient_user_id", sa.Integer(), nullable=True))
        batch_op.add_column(
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.create_index(
            op.f("ix_notifications_recipient_user_id"), ["recipient_user_id"], unique=False
        )
        batch_op.create_foreign_key(
            "fk_notifications_recipient_user_id_users",
            "users",
            ["recipient_user_id"],
            ["id"],
            ondelete="CASCADE",
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("notifications") as batch_op:
        batch_op.drop_constraint("fk_notifications_recipient_user_id_users", type_="foreignkey")
        batch_op.drop_index(op.f("ix_notifications_recipient_user_id"))
        batch_op.drop_column("is_read")
        batch_op.drop_column("recipient_user_id")

    op.drop_column("activity_logs", "ip_address")
