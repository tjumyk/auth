from datetime import datetime, timedelta
from typing import Literal

from flask import current_app as app

from error import BasicError
from models import User, db
from utils.mail import is_mail_enabled, send_email

PasswordExpiryStatus = Literal['none', 'warning_1month', 'warning_1week', 'expired']

PASSWORD_EXPIRY_NO_2FA = timedelta(days=90)
PASSWORD_EXPIRY_MIGRATED = timedelta(days=30)
PASSWORD_WARNING_1MONTH = timedelta(days=30)
PASSWORD_WARNING_1WEEK = timedelta(days=7)

class PasswordExpiryError(BasicError):
    pass


def is_password_expiry_applicable(user: User) -> bool:
    if user.is_two_factor_enabled:
        return False
    if user.external_auth_enforced:
        return False
    return True


def get_password_expiry_status(user: User) -> PasswordExpiryStatus:
    if not is_password_expiry_applicable(user):
        return 'none'
    if user.password_expires_at is None:
        return 'none'
    now = datetime.utcnow()
    if user.password_expires_at <= now:
        return 'expired'
    remaining = user.password_expires_at - now
    if remaining <= PASSWORD_WARNING_1WEEK:
        return 'warning_1week'
    if remaining <= PASSWORD_WARNING_1MONTH:
        return 'warning_1month'
    return 'none'


def refresh_password_expiry(user: User) -> None:
    user.password_changed_at = datetime.utcnow()
    user.password_expiry_warning_email_sent_at = None
    if is_password_expiry_applicable(user):
        user.password_expires_at = datetime.utcnow() + PASSWORD_EXPIRY_NO_2FA
    else:
        user.password_expires_at = None


def clear_password_expiry(user: User) -> None:
    user.password_expires_at = None
    user.password_expiry_warning_email_sent_at = None


def restore_password_expiry_on_2fa_disable(user: User) -> None:
    if is_password_expiry_applicable(user):
        user.password_expires_at = datetime.utcnow() + PASSWORD_EXPIRY_NO_2FA
        user.password_expiry_warning_email_sent_at = None
    else:
        user.password_expires_at = None


def build_password_expiry_fields(user: User) -> dict:
    status = get_password_expiry_status(user)
    expires_at = user.password_expires_at.isoformat() if user.password_expires_at else None
    return {
        'password_expires_at': expires_at,
        'password_expiry_status': status,
    }


def build_password_expiry_admin_fields(user: User) -> dict:
    changed_at = user.password_changed_at.isoformat() if user.password_changed_at else None
    expires_at = user.password_expires_at.isoformat() if user.password_expires_at else None
    return {
        'password_changed_at': changed_at,
        'password_expires_at': expires_at,
        'password_expiry_status': get_password_expiry_status(user),
    }


def check_password_expiry_for_oauth(user: User) -> None:
    if get_password_expiry_status(user) == 'expired':
        raise PasswordExpiryError('password expired', code='password_expired',
                                  detail='Your password has expired. Please reset your password to continue.')


def revoke_expired_session(user: User) -> None:
    from services.oauth import OAuthService
    OAuthService.clear_user_tokens(user)
    db.session.commit()


def maybe_send_password_expiry_warning_email(user: User) -> None:
    if not is_mail_enabled():
        return
    if get_password_expiry_status(user) != 'warning_1week':
        return
    if user.password_expiry_warning_email_sent_at is not None:
        return
    if user.email is None:
        return

    send_email(user.name, user.email, 'password_expiry_warning', user=user, site=app.config['SITE'])
    user.password_expiry_warning_email_sent_at = datetime.utcnow()
