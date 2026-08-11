"""receipts, receipt_status_history

Revision ID: a2b3c4d5e6f7
Revises: f6a7b8c9d0e1
Create Date: 2026-08-04

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a2b3c4d5e6f7"
down_revision = "f6a7b8c9d0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "receipts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("receipt_number", sa.String(50), nullable=False, unique=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_to", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("payment_method", sa.String(20), nullable=False, server_default="cash"),
        sa.Column("bank_account", sa.String(50), nullable=True),
        sa.Column("reference_number", sa.String(100), nullable=True),
        sa.Column("amount_received", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="LAK"),
        sa.Column("exchange_rate", sa.Float(), nullable=False, server_default="1"),
        sa.Column("customer_reference", sa.String(100), nullable=True),
        sa.Column("vehicle_make", sa.String(100), nullable=True),
        sa.Column("vehicle_model", sa.String(100), nullable=True),
        sa.Column("vehicle_vin", sa.String(100), nullable=True),
        sa.Column("vehicle_engine_no", sa.String(100), nullable=True),
        sa.Column("vehicle_reg_no", sa.String(50), nullable=True),
        sa.Column("job_number", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("internal_notes", sa.Text(), nullable=True),
        sa.Column("terms_conditions", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_receipts_receipt_number", "receipts", ["receipt_number"])
    op.create_index("ix_receipts_invoice_id", "receipts", ["invoice_id"])
    op.create_index("ix_receipts_customer_id", "receipts", ["customer_id"])
    op.create_index("ix_receipts_assigned_to", "receipts", ["assigned_to"])
    op.create_index("ix_receipts_status", "receipts", ["status"])
    op.create_index("ix_receipts_is_active", "receipts", ["is_active"])

    op.create_table(
        "receipt_status_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("receipt_id", sa.Integer(), sa.ForeignKey("receipts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_status", sa.String(30), nullable=True),
        sa.Column("to_status", sa.String(30), nullable=False),
        sa.Column("reason", sa.String(500), nullable=True),
        sa.Column("changed_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_receipt_status_history_receipt_id", "receipt_status_history", ["receipt_id"])
    op.create_index("ix_receipt_status_history_changed_at", "receipt_status_history", ["changed_at"])


def downgrade() -> None:
    op.drop_table("receipt_status_history")
    op.drop_table("receipts")
