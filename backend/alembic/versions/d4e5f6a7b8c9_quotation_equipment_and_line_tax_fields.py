"""quotations equipment fields (machine_type, hour_meter, location) + quotation_items.tax_percent

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-07-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("quotations") as batch_op:
        batch_op.add_column(sa.Column("machine_type", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("hour_meter", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("location", sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column("customer_reference", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("round_amount", sa.Float(), server_default="0", nullable=False))
        batch_op.add_column(sa.Column("terms_conditions", sa.Text(), nullable=True))

    with op.batch_alter_table("quotation_items") as batch_op:
        batch_op.add_column(sa.Column("tax_percent", sa.Float(), server_default="0", nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("quotation_items") as batch_op:
        batch_op.drop_column("tax_percent")

    with op.batch_alter_table("quotations") as batch_op:
        batch_op.drop_column("terms_conditions")
        batch_op.drop_column("round_amount")
        batch_op.drop_column("customer_reference")
        batch_op.drop_column("location")
        batch_op.drop_column("hour_meter")
        batch_op.drop_column("machine_type")
