"""user profile real_name and mobile

Revision ID: 0002_profile
Revises: 0001_initial
Create Date: 2026-06-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '0002_profile'
down_revision: Union[str, None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('real_name', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('mobile', sa.String(length=20), nullable=True))
        batch_op.create_unique_constraint('uq_user_mobile', ['mobile'])


def downgrade() -> None:
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_constraint('uq_user_mobile', type_='unique')
        batch_op.drop_column('mobile')
        batch_op.drop_column('real_name')
