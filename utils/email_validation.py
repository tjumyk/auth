import re

EMAIL_MAX_LENGTH = 64

# Local part: common unquoted atoms. Domain: DNS-style labels (hyphens allowed inside labels).
_EMAIL_LOCAL = r'[a-zA-Z0-9._%+\-]+'
_EMAIL_LABEL = r'[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?'
EMAIL_PATTERN = re.compile(rf'^{_EMAIL_LOCAL}@(?:{_EMAIL_LABEL})(?:\.{_EMAIL_LABEL})*$')


def is_valid_email(email: str) -> bool:
    if not email or len(email) > EMAIL_MAX_LENGTH:
        return False
    return EMAIL_PATTERN.match(email) is not None
