import os
import tempfile
import unittest
from datetime import datetime, timedelta

from passlib.hash import pbkdf2_sha256

from app import app as flask_app
from models import User, db
from services.user import UserService


class PasswordExpirySkipTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{self.db_path}'
        self.client = flask_app.test_client()
        self.ctx = flask_app.app_context()
        self.ctx.push()
        db.create_all()
        self.user = User(
            name='skipuser',
            email='skip@example.com',
            password=pbkdf2_sha256.hash('SkipPass123'),
            is_email_confirmed=True,
            password_expires_at=datetime.utcnow() + timedelta(days=3),
        )
        db.session.add(self.user)
        db.session.commit()

    def tearDown(self) -> None:
        db.session.remove()
        db.drop_all()
        self.ctx.pop()
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_skip_clears_intercept_flag(self) -> None:
        with self.client.session_transaction() as sess:
            sess['user_id'] = self.user.id

        whoami = self.client.get('/api/account/whoami')
        self.assertEqual(whoami.status_code, 200)
        self.assertTrue(whoami.get_json()['password_expiry_intercept_active'])

        skip = self.client.post('/api/account/password-expiry/skip')
        self.assertEqual(skip.status_code, 200)
        self.assertFalse(skip.get_json()['password_expiry_intercept_active'])


if __name__ == '__main__':
    unittest.main()
