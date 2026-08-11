"""add forklift_specs table

Revision ID: fbd2d0a45d80
Revises: 425b763888ef
Create Date: 2026-06-26 16:20:13.288951

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fbd2d0a45d80'
down_revision: Union[str, Sequence[str], None] = '425b763888ef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('forklift_specs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('forklift_id', sa.Integer(), nullable=False),
        sa.Column('front_tire', sa.String(length=50), nullable=True),
        sa.Column('rear_tire', sa.String(length=50), nullable=True),
        sa.Column('tire_type', sa.String(length=50), nullable=True),
        sa.Column('fork_length_mm', sa.Integer(), nullable=True),
        sa.Column('battery_type', sa.String(length=100), nullable=True),
        sa.Column('attachment_type', sa.String(length=100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['forklift_id'], ['forklifts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_forklift_specs_forklift_id'), 'forklift_specs', ['forklift_id'], unique=False)
    op.create_index(op.f('ix_forklift_specs_id'), 'forklift_specs', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_forklift_specs_id'), table_name='forklift_specs')
    op.drop_index(op.f('ix_forklift_specs_forklift_id'), table_name='forklift_specs')
    op.drop_table('forklift_specs')
