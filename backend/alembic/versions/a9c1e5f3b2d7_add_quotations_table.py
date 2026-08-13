"""add quotations table

Revision ID: a9c1e5f3b2d7
Revises: f8a3d7e2c951
Create Date: 2026-08-14 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9c1e5f3b2d7'
down_revision: Union[str, Sequence[str], None] = 'f8a3d7e2c951'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('quotations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('quotation_no', sa.String(length=50), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('forklift_id', sa.Integer(), nullable=True),
        sa.Column('expected_start_date', sa.Date(), nullable=False),
        sa.Column('expected_end_date', sa.Date(), nullable=False),
        sa.Column('rental_price', sa.Float(), nullable=False),
        sa.Column('daily_hours_quota', sa.Integer(), nullable=False, server_default='8'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='draft'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['forklift_id'], ['forklifts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_quotations_id'), 'quotations', ['id'], unique=False)
    op.create_index(op.f('ix_quotations_quotation_no'), 'quotations', ['quotation_no'], unique=True)
    op.create_index(op.f('ix_quotations_customer_id'), 'quotations', ['customer_id'], unique=False)
    op.create_index(op.f('ix_quotations_forklift_id'), 'quotations', ['forklift_id'], unique=False)
    op.create_index(op.f('ix_quotations_status'), 'quotations', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_quotations_status'), table_name='quotations')
    op.drop_index(op.f('ix_quotations_forklift_id'), table_name='quotations')
    op.drop_index(op.f('ix_quotations_customer_id'), table_name='quotations')
    op.drop_index(op.f('ix_quotations_quotation_no'), table_name='quotations')
    op.drop_index(op.f('ix_quotations_id'), table_name='quotations')
    op.drop_table('quotations')
