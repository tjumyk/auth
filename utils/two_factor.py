import os
import time
from datetime import timedelta, datetime

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.hashes import SHA1
from cryptography.hazmat.primitives.twofactor import InvalidToken
from cryptography.hazmat.primitives.twofactor.totp import TOTP

from error import BasicError
from models import User

_issuer_name = 'UNSWKG'
_token_length = 6
_hash_method = SHA1
_key_length = 20
_time_step = 30

_setup_expire = timedelta(seconds=60)


class TwoFactorError(BasicError):
    pass


def _get_otp(user: User) -> TOTP:
    if user is None:
        raise TwoFactorError('user is required')

    key = user.two_factor_key
    if key is None:
        raise TwoFactorError('two-factor key is not initialized')
    return TOTP(key, _token_length, _hash_method(), _time_step, backend=default_backend())


def setup(user: User):
    if user is None:
        raise TwoFactorError('user is required')

    if user.is_two_factor_enabled:
        raise TwoFactorError('two-factor authentication is already enabled')

    user.two_factor_key = os.urandom(_key_length)
    user.is_two_factor_enabled = False  # not enabled until confirmed
    user.two_factor_setup_expire_at = datetime.utcnow() + _setup_expire


def confirm_setup(user: User, token: str):
    if user is None:
        raise TwoFactorError('user is required')
    if not token:
        raise TwoFactorError('token is required')

    if user.is_two_factor_enabled:
        raise TwoFactorError('two-factor authentication is already enabled')
    if user.two_factor_setup_expire_at < datetime.utcnow():
        raise TwoFactorError('setup session expired')

    verify(user, token)
    user.is_two_factor_enabled = True
    user.two_factor_setup_expire_at = None


def disable(user: User, token: str):
    if user is None:
        raise TwoFactorError('user is required')

    if not user.is_two_factor_enabled:
        raise TwoFactorError('two-factor authentication is not enabled')

    verify(user, token)

    user.is_two_factor_enabled = False
    user.two_factor_key = None


def build_uri(user: User) -> str:
    if user is None:
        raise TwoFactorError('user is required')

    otp = _get_otp(user)
    return otp.get_provisioning_uri(user.name, _issuer_name)


def verify(user: User, token: str):
    if user is None:
        raise TwoFactorError('user is required')

    otp = _get_otp(user)
    try:
        otp.verify(token.encode(), time.time())
    except InvalidToken:
        raise TwoFactorError('invalid token')
