"""Tests for login CAPTCHA integration."""

import unittest
from unittest.mock import MagicMock, patch

from app import app as flask_app
from models import User
from utils.captcha import captcha_required_for_login, is_captcha_enabled


class CaptchaUtilsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.ctx = flask_app.app_context()
        self.ctx.push()
        flask_app.config['CAPTCHA'] = {
            'enabled': True,
            'service_url': 'http://recaptcha:8090',
            'secret': 'test-secret',
        }

    def tearDown(self) -> None:
        self.ctx.pop()

    def test_is_captcha_enabled(self) -> None:
        self.assertTrue(is_captcha_enabled())
        flask_app.config['CAPTCHA'] = {'enabled': False}
        self.assertFalse(is_captcha_enabled())

    @patch('utils.captcha.LoginRecordService.count_recent_failures_for_user')
    @patch('utils.captcha.LoginRecordService.count_recent_failures_for_ip')
    def test_required_after_user_failure(
        self,
        mock_ip: MagicMock,
        mock_user: MagicMock,
    ) -> None:
        user = MagicMock(spec=User)
        mock_user.return_value = 1
        mock_ip.return_value = 0
        self.assertTrue(captcha_required_for_login(user, '10.0.0.1'))

    @patch('utils.captcha.LoginRecordService.count_recent_failures_for_user')
    @patch('utils.captcha.LoginRecordService.count_recent_failures_for_ip')
    def test_not_required_without_failures(
        self,
        mock_ip: MagicMock,
        mock_user: MagicMock,
    ) -> None:
        mock_user.return_value = 0
        mock_ip.return_value = 0
        self.assertFalse(captcha_required_for_login(None, '10.0.0.1'))

    @patch('utils.captcha._call_captcha_service')
    def test_peek_captcha(self, mock_call: MagicMock) -> None:
        from utils.captcha import peek_captcha

        mock_call.return_value = True
        self.assertTrue(peek_captcha('00000000-0000-4000-8000-000000000088', '1234', '1.2.3.4'))
        mock_call.assert_called_with(
            '/internal/v1/peek',
            '00000000-0000-4000-8000-000000000088',
            '1234',
            '1.2.3.4',
        )

    @patch('utils.captcha._call_captcha_service')
    def test_verify_captcha_success(self, mock_call: MagicMock) -> None:
        from utils.captcha import verify_captcha

        mock_call.return_value = True
        self.assertTrue(verify_captcha('00000000-0000-4000-8000-000000000099', '1234', '1.2.3.4'))
        mock_call.assert_called_with(
            '/internal/v1/verify',
            '00000000-0000-4000-8000-000000000099',
            '1234',
            '1.2.3.4',
        )

    @patch('utils.captcha._call_captcha_service')
    def test_verify_captcha_failure(self, mock_call: MagicMock) -> None:
        from utils.captcha import verify_captcha

        mock_call.return_value = False
        self.assertFalse(verify_captcha('00000000-0000-4000-8000-000000000099', '1234', '1.2.3.4'))


    @patch('utils.captcha.LoginRecordService.count_recent_failures_for_user')
    @patch('utils.captcha.LoginRecordService.count_recent_failures_for_ip')
    def test_required_after_ip_failure(
        self,
        mock_ip: MagicMock,
        mock_user: MagicMock,
    ) -> None:
        mock_user.return_value = 0
        mock_ip.return_value = 2
        self.assertTrue(captcha_required_for_login(None, '10.0.0.2'))


if __name__ == '__main__':
    unittest.main()
