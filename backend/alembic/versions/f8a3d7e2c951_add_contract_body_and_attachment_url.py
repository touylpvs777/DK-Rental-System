"""add contract body and attachment url to rental contracts

Revision ID: f8a3d7e2c951
Revises: e4f7c9a1b6d2
Create Date: 2026-08-13 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8a3d7e2c951'
down_revision: Union[str, Sequence[str], None] = 'e4f7c9a1b6d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('rental_contracts', sa.Column('contract_body', sa.Text(), nullable=True))
    op.add_column('rental_contracts', sa.Column('attachment_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('rental_contracts', 'attachment_url')
    op.drop_column('rental_contracts', 'contract_body')
