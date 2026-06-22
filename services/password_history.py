from datetime import datetime

from passlib.hash import pbkdf2_sha256
from sqlalchemy import desc

from models import User, UserPasswordHistory, db

_PASSWORD_HISTORY_LIMIT = 3


def check_password_not_reused(user: User, new_password: str) -> None:
    from services.user import UserServiceError
    if pbkdf2_sha256.verify(new_password, user.password):
        raise UserServiceError('password recently used',
                               'Choose a password that differs from your current password.')
    history_rows = UserPasswordHistory.query.filter_by(user_id=user.id).order_by(
        desc(UserPasswordHistory.created_at),
    ).limit(_PASSWORD_HISTORY_LIMIT).all()
    for row in history_rows:
        if pbkdf2_sha256.verify(new_password, row.password_hash):
            raise UserServiceError('password recently used',
                                   'Choose a password that differs from one of your recent passwords.')


def record_password_change(user: User) -> None:
    db.session.add(UserPasswordHistory(
        user_id=user.id,
        password_hash=user.password,
        created_at=datetime.utcnow(),
    ))
    history_rows = UserPasswordHistory.query.filter_by(user_id=user.id).order_by(
        desc(UserPasswordHistory.created_at),
    ).all()
    for row in history_rows[_PASSWORD_HISTORY_LIMIT:]:
        db.session.delete(row)
