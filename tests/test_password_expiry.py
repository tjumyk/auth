import os
import tempfile
import time
import unittest
from datetime import datetime, timedelta

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.hashes import SHA1
from cryptography.hazmat.primitives.twofactor.totp import TOTP
from passlib.hash import pbkdf2_sha256

import utils.two_factor as two_factor
from app import app as flask_app
from models import OAuthClient, User, db
from services.password_expiry import (
    PASSWORD_EXPIRY_NO_2FA,
    PASSWORD_WARNING_1MONTH,
    PASSWORD_WARNING_1WEEK,
    get_password_expiry_status,
    is_password_expiry_applicable,
    refresh_password_expiry,
)
from services.user import UserService


class PasswordExpiryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{self.db_path}'
        self.ctx = flask_app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self) -> None:
        db.session.remove()
        db.drop_all()
        self.ctx.pop()
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def _make_user(self, **kwargs) -> User:
        user = User(
            name='testuser',
            email='test@example.com',
            password=pbkdf2_sha256.hash('OldPass123'),
            is_email_confirmed=True,
            **kwargs,
        )
        db.session.add(user)
        db.session.commit()
        return user

    def test_applicable_when_no_2fa_and_not_external_enforced(self) -> None:
        user = self._make_user()
        self.assertTrue(is_password_expiry_applicable(user))

    def test_not_applicable_with_2fa(self) -> None:
        user = self._make_user(is_two_factor_enabled=True)
        self.assertFalse(is_password_expiry_applicable(user))

    def test_not_applicable_with_external_auth_enforced(self) -> None:
        user = self._make_user(external_auth_enforced=True)
        self.assertFalse(is_password_expiry_applicable(user))

    def test_status_warning_tiers(self) -> None:
        now = datetime.utcnow()
        user = self._make_user(password_expires_at=now + PASSWORD_WARNING_1MONTH - timedelta(days=1))
        self.assertEqual(get_password_expiry_status(user), 'warning_1month')

        user.password_expires_at = now + PASSWORD_WARNING_1WEEK - timedelta(hours=1)
        self.assertEqual(get_password_expiry_status(user), 'warning_1week')

        user.password_expires_at = now - timedelta(minutes=1)
        self.assertEqual(get_password_expiry_status(user), 'expired')

    def test_refresh_password_expiry_sets_ninety_days(self) -> None:
        user = self._make_user()
        refresh_password_expiry(user)
        self.assertIsNotNone(user.password_expires_at)
        self.assertIsNotNone(user.password_changed_at)
        delta = user.password_expires_at - datetime.utcnow()
        self.assertGreater(delta.total_seconds(), 89 * 24 * 3600)

    def test_login_blocked_when_expired(self) -> None:
        user = self._make_user(password_expires_at=datetime.utcnow() - timedelta(days=1))
        with self.assertRaises(Exception) as ctx:
            UserService.login('testuser', 'OldPass123', '127.0.0.1', type('UA', (), {'string': 'test'})())
        self.assertEqual(ctx.exception.msg, 'password expired')

    def _totp_token(self, user: User) -> str:
        otp = TOTP(user.two_factor_key, 6, SHA1(), 30, backend=default_backend())
        return otp.generate(time.time()).decode()

    def test_disable_2fa_restores_password_expiry(self) -> None:
        user = self._make_user(
            is_two_factor_enabled=True,
            two_factor_key=os.urandom(20),
            password_expires_at=None,
        )
        two_factor.disable(user, self._totp_token(user))
        db.session.commit()
        self.assertIsNotNone(user.password_expires_at)
        delta = user.password_expires_at - datetime.utcnow()
        self.assertGreater(delta.total_seconds(), PASSWORD_EXPIRY_NO_2FA.total_seconds() - 60)

    def test_expired_session_whoami_returns_password_expired(self) -> None:
        user = self._make_user(password_expires_at=datetime.utcnow() - timedelta(days=1))
        client = flask_app.test_client()
        with client.session_transaction() as sess:
            sess['user_id'] = user.id

        resp = client.get('/api/account/whoami')
        self.assertEqual(resp.status_code, 401)
        body = resp.get_json()
        self.assertEqual(body['code'], 'password_expired')

        follow_up = client.get('/api/account/whoami')
        self.assertEqual(follow_up.status_code, 204)

    def test_expired_session_oauth_connect_returns_password_expired(self) -> None:
        user = self._make_user(password_expires_at=datetime.utcnow() - timedelta(days=1))
        client_row = OAuthClient(
            name='testapp',
            secret='secret',
            redirect_url='https://app.example/callback',
            home_url='https://app.example/',
            is_public=True,
        )
        db.session.add(client_row)
        db.session.commit()

        client = flask_app.test_client()
        with client.session_transaction() as sess:
            sess['user_id'] = user.id

        resp = client.get(
            f'/api/oauth/connect?client_id={client_row.id}&redirect_url={client_row.redirect_url}',
        )
        self.assertEqual(resp.status_code, 401)
        body = resp.get_json()
        self.assertEqual(body['code'], 'password_expired')

    def test_expired_session_html_oauth_connect_redirects_to_login(self) -> None:
        user = self._make_user(password_expires_at=datetime.utcnow() - timedelta(days=1))
        client_row = OAuthClient(
            name='htmlapp',
            secret='secret',
            redirect_url='https://app.example/callback',
            home_url='https://app.example/',
            is_public=True,
        )
        db.session.add(client_row)
        db.session.commit()

        client = flask_app.test_client()
        with client.session_transaction() as sess:
            sess['user_id'] = user.id

        resp = client.get(
            f'/oauth/connect?client_id={client_row.id}&redirect_url={client_row.redirect_url}',
            follow_redirects=False,
        )
        self.assertEqual(resp.status_code, 302)
        self.assertIn('password_expired=1', resp.location)


if __name__ == '__main__':
    unittest.main()
