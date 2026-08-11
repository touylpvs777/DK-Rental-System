"""document engine overhaul: PO free-text items + vendor detail, invoice/quotation vehicle info + item codes

Revision ID: a1b2c3d4e5f6
Revises: e7a2f1c9b3d4
Create Date: 2026-07-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'e7a2f1c9b3d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("purchase_order_items") as batch_op:
        batch_op.alter_column("spare_part_id", existing_type=sa.Integer(), nullable=True)
        batch_op.add_column(sa.Column("item_code", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("description", sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column("unit", sa.String(length=50), nullable=True))

    with op.batch_alter_table("purchase_orders") as batch_op:
        batch_op.add_column(sa.Column("vendor_address", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("vendor_contact", sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column("tax_rate", sa.Float(), server_default="0", nullable=False))

    with op.batch_alter_table("invoices") as batch_op:
        batch_op.add_column(sa.Column("vehicle_make", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("vehicle_model", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("vehicle_vin", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("vehicle_engine_no", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("vehicle_reg_no", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("job_number", sa.String(length=50), nullable=True))

    with op.batch_alter_table("quotations") as batch_op:
        batch_op.add_column(sa.Column("vehicle_make", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("vehicle_model", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("vehicle_vin", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("vehicle_engine_no", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("vehicle_reg_no", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("job_number", sa.String(length=50), nullable=True))

    with op.batch_alter_table("invoice_items") as batch_op:
        batch_op.add_column(sa.Column("item_code", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("unit", sa.String(length=50), nullable=True))

    with op.batch_alter_table("quotation_items") as batch_op:
        batch_op.add_column(sa.Column("item_code", sa.String(length=100), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("quotation_items") as batch_op:
        batch_op.drop_column("item_code")

    with op.batch_alter_table("invoice_items") as batch_op:
        batch_op.drop_column("unit")
        batch_op.drop_column("item_code")

    with op.batch_alter_table("quotations") as batch_op:
        batch_op.drop_column("job_number")
        batch_op.drop_column("vehicle_reg_no")
        batch_op.drop_column("vehicle_engine_no")
        batch_op.drop_column("vehicle_vin")
        batch_op.drop_column("vehicle_model")
        batch_op.drop_column("vehicle_make")

    with op.batch_alter_table("invoices") as batch_op:
        batch_op.drop_column("job_number")
        batch_op.drop_column("vehicle_reg_no")
        batch_op.drop_column("vehicle_engine_no")
        batch_op.drop_column("vehicle_vin")
        batch_op.drop_column("vehicle_model")
        batch_op.drop_column("vehicle_make")

    with op.batch_alter_table("purchase_orders") as batch_op:
        batch_op.drop_column("tax_rate")
        batch_op.drop_column("vendor_contact")
        batch_op.drop_column("vendor_address")

    with op.batch_alter_table("purchase_order_items") as batch_op:
        batch_op.drop_column("unit")
        batch_op.drop_column("description")
        batch_op.drop_column("item_code")
        # Note: reverting spare_part_id to NOT NULL would fail if any
        # free-text (spare_part_id IS NULL) rows were created after upgrade.
        batch_op.alter_column("spare_part_id", existing_type=sa.Integer(), nullable=False)
