import os
import tempfile
import unittest

from passlib.hash import pbkdf2_sha256

from app import app as flask_app
from models import User, UserPasswordHistory, db
from services.password_history import check_password_not_reused, record_password_change
from services.user import UserService, UserServiceError


class PasswordHistoryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{self.db_path}'
        self.ctx = flask_app.app_context()
        self.ctx.push()
        db.create_all()
        self.user = User(
            name='histuser',
            email='hist@example.com',
            password=pbkdf2_sha256.hash('FirstPass1'),
            is_email_confirmed=True,
        )
        db.session.add(self.user)
        db.session.commit()

    def tearDown(self) -> None:
        db.session.remove()
        db.drop_all()
        self.ctx.pop()
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_rejects_current_password(self) -> None:
        with self.assertRaises(UserServiceError) as ctx:
            check_password_not_reused(self.user, 'FirstPass1')
        self.assertEqual(ctx.exception.msg, 'password recently used')

    def test_record_password_change_trims_to_three(self) -> None:
        passwords = ['FirstPass1', 'SecondPass2', 'ThirdPass3', 'FourthPass4', 'FifthPass5']
        for pwd in passwords[1:]:
            record_password_change(self.user)
            self.user.password = pbkdf2_sha256.hash(pwd)
        db.session.commit()

        rows = UserPasswordHistory.query.filter_by(user_id=self.user.id).order_by(
            UserPasswordHistory.created_at.desc(),
        ).all()
        self.assertLessEqual(len(rows), 3)
        with self.assertRaises(UserServiceError):
            check_password_not_reused(self.user, 'ThirdPass3')

    def test_force_set_password_enforces_history(self) -> None:
        UserService.force_set_password(self.user, 'SecondPass2')
        db.session.commit()
        with self.assertRaises(UserServiceError):
            UserService.force_set_password(self.user, 'FirstPass1')


if __name__ == '__main__':
    unittest.main()
