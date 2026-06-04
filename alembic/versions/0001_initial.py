"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '0001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=16), nullable=False),
        sa.Column('password', sa.String(length=128), nullable=False),
        sa.Column('email', sa.String(length=64), nullable=False),
        sa.Column('nickname', sa.String(length=16), nullable=True),
        sa.Column('avatar', sa.String(length=128), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('modified_at', sa.DateTime(), nullable=False),
        sa.Column('email_confirmed_at', sa.DateTime(), nullable=True),
        sa.Column('email_confirm_token', sa.String(length=64), nullable=True),
        sa.Column('email_confirm_token_expire_at', sa.DateTime(), nullable=True),
        sa.Column('password_reset_token', sa.String(length=64), nullable=True),
        sa.Column('password_reset_token_expire_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_email_confirmed', sa.Boolean(), nullable=False),
        sa.Column('two_factor_key', sa.LargeBinary(), nullable=True),
        sa.Column('two_factor_setup_expire_at', sa.DateTime(), nullable=True),
        sa.Column('is_two_factor_enabled', sa.Boolean(), nullable=False),
        sa.Column('two_factor_disable_token', sa.String(length=64), nullable=True),
        sa.Column('two_factor_disable_token_expire_at', sa.DateTime(), nullable=True),
        sa.Column('external_auth_provider_id', sa.String(length=32), nullable=True),
        sa.Column('external_auth_enforced', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('nickname'),
    )
    op.create_table(
        'group',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=24), nullable=False),
        sa.Column('description', sa.String(length=256), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('modified_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_table(
        'o_auth_client',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=16), nullable=False),
        sa.Column('secret', sa.String(length=128), nullable=False),
        sa.Column('redirect_url', sa.String(length=128), nullable=False),
        sa.Column('home_url', sa.String(length=128), nullable=False),
        sa.Column('is_public', sa.Boolean(), nullable=False),
        sa.Column('description', sa.String(length=256), nullable=True),
        sa.Column('icon', sa.String(length=128), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('modified_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_table(
        'login_record',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('time', sa.DateTime(), nullable=False),
        sa.Column('ip', sa.String(length=64), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('reason', sa.String(length=32), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'o_auth_authorization',
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('authorize_token', sa.String(length=64), nullable=True),
        sa.Column('authorize_token_expire_at', sa.DateTime(), nullable=True),
        sa.Column('access_token', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('modified_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['o_auth_client.id']),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('client_id', 'user_id'),
        sa.UniqueConstraint('access_token'),
        sa.UniqueConstraint('authorize_token'),
    )
    op.create_table(
        'user_groups',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['group_id'], ['group.id']),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('user_id', 'group_id'),
    )
    op.create_table(
        'o_auth_client_allowed_groups',
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['o_auth_client.id']),
        sa.ForeignKeyConstraint(['group_id'], ['group.id']),
        sa.PrimaryKeyConstraint('client_id', 'group_id'),
    )


def downgrade() -> None:
    op.drop_table('o_auth_client_allowed_groups')
    op.drop_table('user_groups')
    op.drop_table('o_auth_authorization')
    op.drop_table('login_record')
    op.drop_table('o_auth_client')
    op.drop_table('group')
    op.drop_table('user')
