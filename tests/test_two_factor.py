import os
import unittest
from unittest.mock import patch

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.hashes import SHA1
from cryptography.hazmat.primitives.twofactor.totp import TOTP

import utils.two_factor as two_factor
from models import User


class TwoFactorVerifyTests(unittest.TestCase):
    def _user_with_key(self) -> User:
        return User(
            name='totpuser',
            email='totp@example.com',
            password='hashed',
            two_factor_key=os.urandom(20),
        )

    def test_verify_accepts_code_when_server_clock_is_forty_five_seconds_late(self) -> None:
        user = self._user_with_key()
        phone_time = 1_700_000_000.0
        otp = TOTP(user.two_factor_key, 6, SHA1(), 30, backend=default_backend())
        token = otp.generate(phone_time).decode()

        with patch('utils.two_factor.time.time', return_value=phone_time - 45):
            two_factor.verify(user, token)

    def test_verify_rejects_code_outside_valid_window(self) -> None:
        user = self._user_with_key()
        phone_time = 1_700_000_000.0
        otp = TOTP(user.two_factor_key, 6, SHA1(), 30, backend=default_backend())
        token = otp.generate(phone_time).decode()

        with patch('utils.two_factor.time.time', return_value=phone_time - 120):
            with self.assertRaises(two_factor.TwoFactorError) as ctx:
                two_factor.verify(user, token)
        self.assertEqual(ctx.exception.msg, 'invalid token')
