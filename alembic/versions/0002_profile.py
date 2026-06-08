"""user profile real_name and mobile

Revision ID: 0002_profile
Revises: 0001_initial
Create Date: 2026-06-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = '0002_profile'
down_revision: Union[str, None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _user_column_names() -> set[str]:
    return {col['name'] for col in inspect(op.get_bind()).get_columns('user')}


def _has_mobile_unique() -> bool:
    inspector = inspect(op.get_bind())
    if any(c['name'] == 'uq_user_mobile' for c in inspector.get_unique_constraints('user')):
        return True
    return any(
        index.get('unique') and index.get('column_names') == ['mobile']
        for index in inspector.get_indexes('user')
    )


def _drop_mobile_unique() -> None:
    inspector = inspect(op.get_bind())
    if any(c['name'] == 'uq_user_mobile' for c in inspector.get_unique_constraints('user')):
        with op.batch_alter_table('user', schema=None) as batch_op:
            batch_op.drop_constraint('uq_user_mobile', type_='unique')
        return
    for index in inspector.get_indexes('user'):
        if index.get('unique') and index.get('column_names') == ['mobile']:
            op.drop_index(index['name'], table_name='user')
            return


def upgrade() -> None:
    existing = _user_column_names()
    if 'real_name' not in existing:
        op.add_column('user', sa.Column('real_name', sa.String(length=64), nullable=True))
    if 'mobile' not in existing:
        op.add_column('user', sa.Column('mobile', sa.String(length=20), nullable=True))
    if not _has_mobile_unique():
        with op.batch_alter_table('user', schema=None) as batch_op:
            batch_op.create_unique_constraint('uq_user_mobile', ['mobile'])


def downgrade() -> None:
    if _has_mobile_unique():
        _drop_mobile_unique()
    existing = _user_column_names()
    if 'mobile' in existing:
        op.drop_column('user', 'mobile')
    if 'real_name' in existing:
        op.drop_column('user', 'real_name')
