"""move mast_type and max_lift_height_mm to forklift_specs

Revision ID: 0b24e4aaa242
Revises: fbd2d0a45d80
Create Date: 2026-06-26 17:02:42.518614

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0b24e4aaa242'
down_revision: Union[str, Sequence[str], None] = 'fbd2d0a45d80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add new columns to forklift_specs
    op.add_column('forklift_specs', sa.Column('mast_type', sa.String(length=50), nullable=True))
    op.add_column('forklift_specs', sa.Column('max_lift_height_mm', sa.Integer(), nullable=True))

    # 2. Migrate existing data (if any rows have these fields populated)
    op.execute("""
        INSERT INTO forklift_specs (forklift_id, mast_type, max_lift_height_mm, created_at)
        SELECT id, mast_type, max_lift_height_mm, CURRENT_TIMESTAMP
        FROM forklifts
        WHERE mast_type IS NOT NULL OR max_lift_height_mm IS NOT NULL
    """)

    # 3. Drop columns from forklifts
    with op.batch_alter_table('forklifts') as batch_op:
        batch_op.drop_column('mast_type')
        batch_op.drop_column('max_lift_height_mm')


def downgrade() -> None:
    # 1. Add columns back to forklifts
    with op.batch_alter_table('forklifts') as batch_op:
        batch_op.add_column(sa.Column('mast_type', sa.VARCHAR(length=50), nullable=True))
        batch_op.add_column(sa.Column('max_lift_height_mm', sa.INTEGER(), nullable=True))

    # 2. Migrate data back
    op.execute("""
        UPDATE forklifts SET
            mast_type = (SELECT s.mast_type FROM forklift_specs s WHERE s.forklift_id = forklifts.id LIMIT 1),
            max_lift_height_mm = (SELECT s.max_lift_height_mm FROM forklift_specs s WHERE s.forklift_id = forklifts.id LIMIT 1)
    """)

    # 3. Drop columns from forklift_specs
    with op.batch_alter_table('forklift_specs') as batch_op:
        batch_op.drop_column('mast_type')
        batch_op.drop_column('max_lift_height_mm')
