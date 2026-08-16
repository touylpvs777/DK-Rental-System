"""add quotation_id to rental_contracts

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-08-16 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, Sequence[str], None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('rental_contracts') as batch_op:
        batch_op.add_column(sa.Column('quotation_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_rental_contracts_quotation_id', 'quotations', ['quotation_id'], ['id'], ondelete='SET NULL',
        )
    op.create_index('ix_rental_contracts_quotation_id', 'rental_contracts', ['quotation_id'])


def downgrade() -> None:
    op.drop_index('ix_rental_contracts_quotation_id', table_name='rental_contracts')
    with op.batch_alter_table('rental_contracts') as batch_op:
        batch_op.drop_constraint('fk_rental_contracts_quotation_id', type_='foreignkey')
        batch_op.drop_column('quotation_id')
