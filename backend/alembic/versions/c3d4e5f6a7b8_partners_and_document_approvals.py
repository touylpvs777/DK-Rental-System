"""partners table, document_approvals table, purchase_orders.partner_id

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-07-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "partners",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("partner_type", sa.String(length=20), nullable=False, server_default="vendor"),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("email", sa.String(length=200), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_partners_name", "partners", ["name"])
    op.create_index("ix_partners_partner_type", "partners", ["partner_type"])

    op.create_table(
        "document_approvals",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("purchase_order_id", sa.Integer(), sa.ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=True),
        sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=True),
        sa.Column("quotation_id", sa.Integer(), sa.ForeignKey("quotations.id", ondelete="CASCADE"), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("signed_by", sa.String(length=200), nullable=False),
        sa.Column("signature_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "(CASE WHEN purchase_order_id IS NOT NULL THEN 1 ELSE 0 END) + "
            "(CASE WHEN invoice_id IS NOT NULL THEN 1 ELSE 0 END) + "
            "(CASE WHEN quotation_id IS NOT NULL THEN 1 ELSE 0 END) = 1",
            name="ck_document_approval_exactly_one_document",
        ),
    )
    op.create_index("ix_document_approvals_purchase_order_id", "document_approvals", ["purchase_order_id"])
    op.create_index("ix_document_approvals_invoice_id", "document_approvals", ["invoice_id"])
    op.create_index("ix_document_approvals_quotation_id", "document_approvals", ["quotation_id"])

    with op.batch_alter_table("purchase_orders") as batch_op:
        batch_op.add_column(sa.Column("partner_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_purchase_orders_partner_id", "partners", ["partner_id"], ["id"], ondelete="SET NULL",
        )
    op.create_index("ix_purchase_orders_partner_id", "purchase_orders", ["partner_id"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_purchase_orders_partner_id", table_name="purchase_orders")
    with op.batch_alter_table("purchase_orders") as batch_op:
        batch_op.drop_constraint("fk_purchase_orders_partner_id", type_="foreignkey")
        batch_op.drop_column("partner_id")

    op.drop_index("ix_document_approvals_quotation_id", table_name="document_approvals")
    op.drop_index("ix_document_approvals_invoice_id", table_name="document_approvals")
    op.drop_index("ix_document_approvals_purchase_order_id", table_name="document_approvals")
    op.drop_table("document_approvals")

    op.drop_index("ix_partners_partner_type", table_name="partners")
    op.drop_index("ix_partners_name", table_name="partners")
    op.drop_table("partners")
