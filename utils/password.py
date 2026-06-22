import re

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 64

SPECIAL_CHAR_PATTERN = re.compile(r'[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]')
LOWERCASE_PATTERN = re.compile(r'[a-z]')
UPPERCASE_PATTERN = re.compile(r'[A-Z]')
DIGIT_PATTERN = re.compile(r'[0-9]')

PASSWORD_LENGTH_PATTERN = re.compile(rf'^.{{{PASSWORD_MIN_LENGTH},{PASSWORD_MAX_LENGTH}}}$')


class PasswordValidationError(Exception):
    def __init__(self, msg: str) -> None:
        self.msg = msg
        super().__init__(msg)


def count_password_character_classes(password: str) -> int:
    classes = 0
    if LOWERCASE_PATTERN.search(password):
        classes += 1
    if UPPERCASE_PATTERN.search(password):
        classes += 1
    if DIGIT_PATTERN.search(password):
        classes += 1
    if SPECIAL_CHAR_PATTERN.search(password):
        classes += 1
    return classes


def validate_password_strength(password: str | None) -> None:
    if password is None:
        raise PasswordValidationError('password is required')
    if not PASSWORD_LENGTH_PATTERN.match(password):
        if len(password) < PASSWORD_MIN_LENGTH:
            raise PasswordValidationError('password too short')
        if len(password) > PASSWORD_MAX_LENGTH:
            raise PasswordValidationError('password too long')
        raise PasswordValidationError('invalid password format')
    if count_password_character_classes(password) < 3:
        raise PasswordValidationError('password complexity insufficient')
