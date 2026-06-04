import re

from models import User

_CONTROL_CHAR_PATTERN = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')
_MOBILE_STRIP_PATTERN = re.compile(r'[\s\-()]')
_MOBILE_VALID_PATTERN = re.compile(r'^\+?[0-9]{7,20}$')

NICKNAME_MIN_LENGTH = 3
NICKNAME_MAX_LENGTH = 16
REAL_NAME_MIN_LENGTH = 2
REAL_NAME_MAX_LENGTH = 64


class ProfileValidationError(ValueError):
    pass


def normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ProfileValidationError('value must be a string')
    stripped = value.strip()
    return stripped if stripped else None


def _reject_control_chars(value: str) -> None:
    if _CONTROL_CHAR_PATTERN.search(value):
        raise ProfileValidationError('invalid characters')


def validate_nickname(value: str | None) -> str | None:
    normalized = normalize_optional_text(value)
    if normalized is None:
        return None
    _reject_control_chars(normalized)
    if len(normalized) < NICKNAME_MIN_LENGTH:
        raise ProfileValidationError('invalid nickname format')
    if len(normalized) > NICKNAME_MAX_LENGTH:
        raise ProfileValidationError('invalid nickname format')
    return normalized


def validate_real_name(value: str | None) -> str | None:
    normalized = normalize_optional_text(value)
    if normalized is None:
        return None
    _reject_control_chars(normalized)
    if len(normalized) < REAL_NAME_MIN_LENGTH:
        raise ProfileValidationError('invalid real name format')
    if len(normalized) > REAL_NAME_MAX_LENGTH:
        raise ProfileValidationError('invalid real name format')
    return normalized


def normalize_mobile(value: str | None) -> str | None:
    normalized = normalize_optional_text(value)
    if normalized is None:
        return None
    stripped = _MOBILE_STRIP_PATTERN.sub('', normalized)
    if not stripped:
        return None
    if stripped.count('+') > 1 or (stripped.startswith('+') and '+' in stripped[1:]):
        raise ProfileValidationError('invalid mobile format')
    if '+' in stripped and not stripped.startswith('+'):
        raise ProfileValidationError('invalid mobile format')
    if not _MOBILE_VALID_PATTERN.match(stripped):
        raise ProfileValidationError('invalid mobile format')
    return stripped


def validate_mobile(value: str | None) -> str | None:
    return normalize_mobile(value)


def display_name(user: User) -> str:
    for attr in ('nickname', 'real_name', 'name'):
        val = getattr(user, attr, None)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return user.name
