"""add contract quotas and rest policy fields

Revision ID: e4f7c9a1b6d2
Revises: d021f0b7f653
Create Date: 2026-08-13 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4f7c9a1b6d2'
down_revision: Union[str, Sequence[str], None] = 'd021f0b7f653'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('rental_contracts', sa.Column('daily_hours_quota', sa.Integer(), nullable=False, server_default='8'))
    op.add_column('rental_contracts', sa.Column('overtime_rate_per_hour', sa.Float(), nullable=True))
    op.add_column('rental_contracts', sa.Column('rest_policy_work_hours', sa.Integer(), nullable=False, server_default='4'))
    op.add_column('rental_contracts', sa.Column('rest_policy_rest_minutes', sa.Integer(), nullable=False, server_default='30'))
    op.add_column('rental_contracts', sa.Column('job_type', sa.String(length=50), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('rental_contracts', 'job_type')
    op.drop_column('rental_contracts', 'rest_policy_rest_minutes')
    op.drop_column('rental_contracts', 'rest_policy_work_hours')
    op.drop_column('rental_contracts', 'overtime_rate_per_hour')
    op.drop_column('rental_contracts', 'daily_hours_quota')
