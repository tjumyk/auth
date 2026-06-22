"""password expiry and password history

Revision ID: 0003_password_expiry
Revises: 0002_profile
Create Date: 2026-06-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = '0003_password_expiry'
down_revision: Union[str, None] = '0002_profile'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _user_column_names() -> set[str]:
    return {col['name'] for col in inspect(op.get_bind()).get_columns('user')}


def _table_exists(name: str) -> bool:
    return name in inspect(op.get_bind()).get_table_names()


def upgrade() -> None:
    existing = _user_column_names()
    if 'password_changed_at' not in existing:
        op.add_column('user', sa.Column('password_changed_at', sa.DateTime(), nullable=True))
    if 'password_expires_at' not in existing:
        op.add_column('user', sa.Column('password_expires_at', sa.DateTime(), nullable=True))
    if 'password_expiry_warning_email_sent_at' not in existing:
        op.add_column('user', sa.Column('password_expiry_warning_email_sent_at', sa.DateTime(), nullable=True))

    if not _table_exists('user_password_history'):
        op.create_table(
            'user_password_history',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('password_hash', sa.String(length=128), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )


def downgrade() -> None:
    if _table_exists('user_password_history'):
        op.drop_table('user_password_history')

    existing = _user_column_names()
    if 'password_expiry_warning_email_sent_at' in existing:
        op.drop_column('user', 'password_expiry_warning_email_sent_at')
    if 'password_expires_at' in existing:
        op.drop_column('user', 'password_expires_at')
    if 'password_changed_at' in existing:
        op.drop_column('user', 'password_changed_at')
