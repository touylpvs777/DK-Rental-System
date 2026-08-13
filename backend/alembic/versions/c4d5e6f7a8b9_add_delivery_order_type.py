"""add order_type to delivery orders

Revision ID: c4d5e6f7a8b9
Revises: b3d8f6a1c4e9
Create Date: 2026-08-13 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, Sequence[str], None] = "b3d8f6a1c4e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "delivery_orders",
        sa.Column("order_type", sa.String(length=20), nullable=False, server_default="delivery"),
    )
    op.create_index(op.f("ix_delivery_orders_order_type"), "delivery_orders", ["order_type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_delivery_orders_order_type"), table_name="delivery_orders")
    op.drop_column("delivery_orders", "order_type")
