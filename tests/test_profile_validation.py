import unittest
from datetime import datetime

from app import app
from models import db, User
from passlib.hash import pbkdf2_sha256
from services.user import UserService, UserServiceError
from utils.profile_validation import (
    ProfileValidationError,
    display_name,
    normalize_mobile,
    validate_nickname,
    validate_real_name,
)


class TestProfileValidation(unittest.TestCase):
    def test_nickname_unicode(self) -> None:
        self.assertEqual(validate_nickname('张三丰'), '张三丰')
        self.assertEqual(validate_nickname('😀😀😀'), '😀😀😀')

    def test_nickname_length(self) -> None:
        with self.assertRaises(ProfileValidationError):
            validate_nickname('ab')
        with self.assertRaises(ProfileValidationError):
            validate_nickname('a' * 17)

    def test_real_name_length(self) -> None:
        self.assertEqual(validate_real_name('Alice Bob'), 'Alice Bob')
        with self.assertRaises(ProfileValidationError):
            validate_real_name('A')
        with self.assertRaises(ProfileValidationError):
            validate_real_name('x' * 65)

    def test_mobile_normalize(self) -> None:
        self.assertEqual(normalize_mobile('+86 138-0013-8000'), '+8613800138000')
        self.assertEqual(normalize_mobile('138 0013 8000'), '13800138000')
        self.assertIsNone(normalize_mobile(''))
        with self.assertRaises(ProfileValidationError):
            normalize_mobile('not-a-phone')

    def test_display_name_priority(self) -> None:
        user = User(
            name='login', email='a@b.com', password='x',
            is_active=True, is_email_confirmed=True,
        )
        user.nickname = None
        user.real_name = 'Real'
        self.assertEqual(display_name(user), 'Real')
        user.nickname = 'Nick'
        self.assertEqual(display_name(user), 'Nick')


class TestUserServiceProfile(unittest.TestCase):
    def setUp(self) -> None:
        self.ctx = app.app_context()
        self.ctx.push()
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        db.engine.dispose()
        db.create_all()

    def tearDown(self) -> None:
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _add_user(self, name: str, email: str, mobile: str | None = None) -> User:
        user = User(
            name=name, email=email,
            password=pbkdf2_sha256.hash('password'),
            is_active=True, is_email_confirmed=True,
            created_at=datetime.utcnow(), modified_at=datetime.utcnow(),
            mobile=mobile,
        )
        db.session.add(user)
        db.session.commit()
        return user

    def test_update_profile_mobile_normalize(self) -> None:
        user = self._add_user('alice', 'alice@example.com')
        UserService.update_profile(user, mobile='+86 138-0013-8000')
        db.session.commit()
        self.assertEqual(user.mobile, '+8613800138000')

    def test_duplicate_mobile_invite(self) -> None:
        self._add_user('userone', 'u1@example.com', mobile='13800138000')
        with self.assertRaises(UserServiceError) as ctx:
            UserService.invite('usertwo', 'u2@example.com', mobile='138 0013 8000')
        self.assertEqual(ctx.exception.msg, 'duplicate mobile')


if __name__ == '__main__':
    unittest.main()
