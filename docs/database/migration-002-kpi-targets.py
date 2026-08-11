"""add kpi_targets table for executive BI

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-28 12:01:00.000000

ADDITIVE ONLY — creates one new table. No existing tables modified.
Supports Phase 10 (Executive BI) KPI target vs actual tracking.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'kpi_targets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('metric_name', sa.String(length=100), nullable=False),
        sa.Column('metric_category', sa.String(length=50), nullable=False),
        sa.Column('target_value', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(length=30), nullable=False, server_default='number'),
        sa.Column('period_type', sa.String(length=20), nullable=False, server_default='monthly'),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_kpi_targets_id', 'kpi_targets', ['id'], unique=False)
    op.create_index('ix_kpi_targets_metric_name', 'kpi_targets', ['metric_name'], unique=False)
    op.create_index('ix_kpi_targets_category', 'kpi_targets', ['metric_category'], unique=False)
    op.create_index('ix_kpi_targets_period', 'kpi_targets', ['period_start', 'period_end'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_kpi_targets_period', table_name='kpi_targets')
    op.drop_index('ix_kpi_targets_category', table_name='kpi_targets')
    op.drop_index('ix_kpi_targets_metric_name', table_name='kpi_targets')
    op.drop_index('ix_kpi_targets_id', table_name='kpi_targets')
    op.drop_table('kpi_targets')
