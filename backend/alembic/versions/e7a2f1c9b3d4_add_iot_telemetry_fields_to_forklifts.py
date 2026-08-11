"""add iot_device_id and last_telemetry_ping to forklifts

Revision ID: e7a2f1c9b3d4
Revises: db0d357776e3
Create Date: 2026-07-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7a2f1c9b3d4'
down_revision: Union[str, Sequence[str], None] = 'db0d357776e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("forklifts") as batch_op:
        batch_op.add_column(sa.Column("iot_device_id", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("last_telemetry_ping", sa.DateTime(timezone=True), nullable=True))
        batch_op.create_index(
            op.f("ix_forklifts_iot_device_id"), ["iot_device_id"], unique=True,
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("forklifts") as batch_op:
        batch_op.drop_index(op.f("ix_forklifts_iot_device_id"))
        batch_op.drop_column("last_telemetry_ping")
        batch_op.drop_column("iot_device_id")
