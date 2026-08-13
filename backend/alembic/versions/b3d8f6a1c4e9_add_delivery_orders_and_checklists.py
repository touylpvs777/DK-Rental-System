"""add delivery_orders and delivery_checklists tables

Revision ID: b3d8f6a1c4e9
Revises: a9c1e5f3b2d7
Create Date: 2026-08-14 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3d8f6a1c4e9'
down_revision: Union[str, Sequence[str], None] = 'a9c1e5f3b2d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('delivery_orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('do_no', sa.String(length=50), nullable=False),
        sa.Column('contract_id', sa.Integer(), nullable=False),
        sa.Column('delivery_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('delivery_address', sa.Text(), nullable=False),
        sa.Column('driver_name', sa.String(length=200), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['contract_id'], ['rental_contracts.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_delivery_orders_id'), 'delivery_orders', ['id'], unique=False)
    op.create_index(op.f('ix_delivery_orders_do_no'), 'delivery_orders', ['do_no'], unique=True)
    op.create_index(op.f('ix_delivery_orders_contract_id'), 'delivery_orders', ['contract_id'], unique=False)
    op.create_index(op.f('ix_delivery_orders_status'), 'delivery_orders', ['status'], unique=False)

    op.create_table('delivery_checklists',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('delivery_order_id', sa.Integer(), nullable=False),
        sa.Column('item_group', sa.String(length=50), nullable=False),
        sa.Column('item_name', sa.String(length=200), nullable=False),
        sa.Column('is_passed', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('remark', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['delivery_order_id'], ['delivery_orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_delivery_checklists_id'), 'delivery_checklists', ['id'], unique=False)
    op.create_index(op.f('ix_delivery_checklists_delivery_order_id'), 'delivery_checklists', ['delivery_order_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_delivery_checklists_delivery_order_id'), table_name='delivery_checklists')
    op.drop_index(op.f('ix_delivery_checklists_id'), table_name='delivery_checklists')
    op.drop_table('delivery_checklists')

    op.drop_index(op.f('ix_delivery_orders_status'), table_name='delivery_orders')
    op.drop_index(op.f('ix_delivery_orders_contract_id'), table_name='delivery_orders')
    op.drop_index(op.f('ix_delivery_orders_do_no'), table_name='delivery_orders')
    op.drop_index(op.f('ix_delivery_orders_id'), table_name='delivery_orders')
    op.drop_table('delivery_orders')
