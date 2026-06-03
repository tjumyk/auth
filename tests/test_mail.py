"""Tests for outbound mail configuration."""

import unittest
from unittest.mock import MagicMock, patch

from app import app as flask_app


class MailConfigTests(unittest.TestCase):
    def setUp(self) -> None:
        self.ctx = flask_app.app_context()
        self.ctx.push()

    def tearDown(self) -> None:
        self.ctx.pop()

    def test_is_mail_enabled_defaults_true(self) -> None:
        from utils.mail import is_mail_enabled

        flask_app.config['MAIL'] = {'from': 'a@b.com', 'display_name': 'Test'}
        self.assertTrue(is_mail_enabled())

    def test_is_mail_enabled_respects_false(self) -> None:
        from utils.mail import is_mail_enabled

        flask_app.config['MAIL'] = {'enabled': False, 'from': 'a@b.com', 'display_name': 'Test'}
        self.assertFalse(is_mail_enabled())

    def test_send_emails_noop_when_disabled(self) -> None:
        from utils.mail import send_emails

        flask_app.config['MAIL'] = {'enabled': False, 'from': 'a@b.com', 'display_name': 'Test'}
        with patch('utils.mail.Popen') as popen:
            send_emails([('User', 'u@example.com')], [], [], 'confirm_email', user=MagicMock())
            popen.assert_not_called()


if __name__ == '__main__':
    unittest.main()
