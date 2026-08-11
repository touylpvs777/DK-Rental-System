"""sales_orders, sales_order_items, sales_order_status_history,
delivery_notes, delivery_note_items, delivery_note_status_history

Revision ID: f6a7b8c9d0e1
Revises: d4e5f6a7b8c9
Create Date: 2026-08-03

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "f6a7b8c9d0e1"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sales_orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("so_number", sa.String(50), nullable=False, unique=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("quotation_id", sa.Integer(), sa.ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_to", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("contact_name", sa.String(200), nullable=True),
        sa.Column("contact_email", sa.String(255), nullable=True),
        sa.Column("contact_phone", sa.String(50), nullable=True),
        sa.Column("subtotal", sa.Float(), nullable=False, server_default="0"),
        sa.Column("tax_rate", sa.Float(), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("discount_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("round_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(3), nullable=False, server_default="LAK"),
        sa.Column("exchange_rate", sa.Float(), nullable=False, server_default="1"),
        sa.Column("bank_details", sa.Text(), nullable=True),
        sa.Column("order_date", sa.Date(), nullable=False),
        sa.Column("expected_delivery_date", sa.Date(), nullable=True),
        sa.Column("customer_reference", sa.String(100), nullable=True),
        sa.Column("vehicle_make", sa.String(100), nullable=True),
        sa.Column("vehicle_model", sa.String(100), nullable=True),
        sa.Column("vehicle_vin", sa.String(100), nullable=True),
        sa.Column("vehicle_engine_no", sa.String(100), nullable=True),
        sa.Column("vehicle_reg_no", sa.String(50), nullable=True),
        sa.Column("job_number", sa.String(50), nullable=True),
        sa.Column("machine_type", sa.String(100), nullable=True),
        sa.Column("hour_meter", sa.Float(), nullable=True),
        sa.Column("location", sa.String(200), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("internal_notes", sa.Text(), nullable=True),
        sa.Column("terms_conditions", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_sales_orders_so_number", "sales_orders", ["so_number"])
    op.create_index("ix_sales_orders_quotation_id", "sales_orders", ["quotation_id"])
    op.create_index("ix_sales_orders_customer_id", "sales_orders", ["customer_id"])
    op.create_index("ix_sales_orders_assigned_to", "sales_orders", ["assigned_to"])
    op.create_index("ix_sales_orders_status", "sales_orders", ["status"])
    op.create_index("ix_sales_orders_expected_delivery_date", "sales_orders", ["expected_delivery_date"])
    op.create_index("ix_sales_orders_is_active", "sales_orders", ["is_active"])

    op.create_table(
        "sales_order_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sales_order_id", sa.Integer(), sa.ForeignKey("sales_orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("line_number", sa.Integer(), nullable=False),
        sa.Column("item_code", sa.String(100), nullable=True),
        sa.Column("description", sa.String(1000), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False, server_default="1"),
        sa.Column("unit", sa.String(50), nullable=False, server_default="unit"),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("discount_percent", sa.Float(), nullable=False, server_default="0"),
        sa.Column("tax_percent", sa.Float(), nullable=False, server_default="0"),
        sa.Column("line_total", sa.Float(), nullable=False),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_sales_order_items_sales_order_id", "sales_order_items", ["sales_order_id"])

    op.create_table(
        "sales_order_status_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sales_order_id", sa.Integer(), sa.ForeignKey("sales_orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_status", sa.String(30), nullable=True),
        sa.Column("to_status", sa.String(30), nullable=False),
        sa.Column("reason", sa.String(500), nullable=True),
        sa.Column("changed_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_sales_order_status_history_sales_order_id", "sales_order_status_history", ["sales_order_id"])
    op.create_index("ix_sales_order_status_history_changed_at", "sales_order_status_history", ["changed_at"])

    op.create_table(
        "delivery_notes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dn_number", sa.String(50), nullable=False, unique=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("sales_order_id", sa.Integer(), sa.ForeignKey("sales_orders.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_to", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("delivery_date", sa.Date(), nullable=False),
        sa.Column("delivery_address", sa.Text(), nullable=True),
        sa.Column("warehouse", sa.String(200), nullable=True),
        sa.Column("driver_name", sa.String(200), nullable=True),
        sa.Column("vehicle_plate", sa.String(50), nullable=True),
        sa.Column("customer_reference", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("internal_notes", sa.Text(), nullable=True),
        sa.Column("terms_conditions", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_delivery_notes_dn_number", "delivery_notes", ["dn_number"])
    op.create_index("ix_delivery_notes_sales_order_id", "delivery_notes", ["sales_order_id"])
    op.create_index("ix_delivery_notes_customer_id", "delivery_notes", ["customer_id"])
    op.create_index("ix_delivery_notes_assigned_to", "delivery_notes", ["assigned_to"])
    op.create_index("ix_delivery_notes_status", "delivery_notes", ["status"])
    op.create_index("ix_delivery_notes_is_active", "delivery_notes", ["is_active"])

    op.create_table(
        "delivery_note_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("delivery_note_id", sa.Integer(), sa.ForeignKey("delivery_notes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("line_number", sa.Integer(), nullable=False),
        sa.Column("item_code", sa.String(100), nullable=True),
        sa.Column("description", sa.String(1000), nullable=False),
        sa.Column("quantity_ordered", sa.Float(), nullable=True),
        sa.Column("quantity_delivered", sa.Float(), nullable=False, server_default="0"),
        sa.Column("unit", sa.String(50), nullable=False, server_default="unit"),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_delivery_note_items_delivery_note_id", "delivery_note_items", ["delivery_note_id"])

    op.create_table(
        "delivery_note_status_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("delivery_note_id", sa.Integer(), sa.ForeignKey("delivery_notes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_status", sa.String(30), nullable=True),
        sa.Column("to_status", sa.String(30), nullable=False),
        sa.Column("reason", sa.String(500), nullable=True),
        sa.Column("changed_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_delivery_note_status_history_delivery_note_id", "delivery_note_status_history", ["delivery_note_id"])
    op.create_index("ix_delivery_note_status_history_changed_at", "delivery_note_status_history", ["changed_at"])


def downgrade() -> None:
    op.drop_table("delivery_note_status_history")
    op.drop_table("delivery_note_items")
    op.drop_table("delivery_notes")
    op.drop_table("sales_order_status_history")
    op.drop_table("sales_order_items")
    op.drop_table("sales_orders")
