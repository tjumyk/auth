import os
import tempfile
import unittest
from datetime import datetime, timedelta

from passlib.hash import pbkdf2_sha256

from app import app as flask_app, migrate_password_expiry
from models import User, db
from services.user import UserService


class MigratePasswordExpiryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{self.db_path}'
        self.ctx = flask_app.app_context()
        self.ctx.push()
        db.create_all()
        self.runner = flask_app.test_cli_runner()

    def tearDown(self) -> None:
        db.session.remove()
        db.drop_all()
        self.ctx.pop()
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def _add_user(self, name: str, **kwargs) -> User:
        user = User(
            name=name,
            email=f'{name}@example.com',
            password=pbkdf2_sha256.hash('TestPass123'),
            is_email_confirmed=True,
            **kwargs,
        )
        db.session.add(user)
        db.session.commit()
        return user

    def test_dry_run_does_not_persist(self) -> None:
        self._add_user('plain')
        result = self.runner.invoke(migrate_password_expiry, ['--dry-run'])
        self.assertEqual(result.exit_code, 0, result.output)
        user = UserService.get_by_name('plain')
        assert user is not None
        self.assertIsNone(user.password_expires_at)

    def test_migrates_applicable_users(self) -> None:
        plain = self._add_user('plain')
        with_2fa = self._add_user('with2fa', is_two_factor_enabled=True)
        external = self._add_user('ext', external_auth_enforced=True)

        result = self.runner.invoke(migrate_password_expiry)
        self.assertEqual(result.exit_code, 0, result.output)

        db.session.refresh(plain)
        db.session.refresh(with_2fa)
        db.session.refresh(external)
        self.assertIsNotNone(plain.password_expires_at)
        self.assertIsNone(with_2fa.password_expires_at)
        self.assertIsNone(external.password_expires_at)
        self.assertLessEqual(
            plain.password_expires_at - datetime.utcnow(),
            timedelta(days=31),
        )


if __name__ == '__main__':
    unittest.main()
