import os
import tempfile
import unittest

from passlib.hash import pbkdf2_sha256

from app import app as flask_app, init_db, reset_admin_password
from models import db
from services.user import UserService


class ResetAdminPasswordTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_admin_config = dict(flask_app.config['ADMIN'])
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{self.db_path}'
        self.ctx = flask_app.app_context()
        self.ctx.push()
        db.create_all()
        self.runner = flask_app.test_cli_runner()
        result = self.runner.invoke(init_db)
        self.assertEqual(result.exit_code, 0, result.output)
        self.admin_config = flask_app.config['ADMIN']
        self.admin_user = UserService.get_by_name(self.admin_config['name'])
        assert self.admin_user is not None
        UserService.force_set_password(self.admin_user, 'OldPass123')
        db.session.commit()

    def tearDown(self) -> None:
        flask_app.config['ADMIN'] = self.original_admin_config
        db.session.remove()
        db.drop_all()
        self.ctx.pop()
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_reset_with_interactive_prompt(self) -> None:
        result = self.runner.invoke(
            reset_admin_password,
            input='NewPass456\nNewPass456\n',
        )
        self.assertEqual(result.exit_code, 0, result.output)
        admin_user = UserService.get_by_name(self.admin_config['name'])
        assert admin_user is not None
        self.assertTrue(pbkdf2_sha256.verify('NewPass456', admin_user.password))

    def test_reset_from_stdin(self) -> None:
        result = self.runner.invoke(
            reset_admin_password,
            ['--stdin'],
            input='NewPass456',
        )
        self.assertEqual(result.exit_code, 0, result.output)
        admin_user = UserService.get_by_name(self.admin_config['name'])
        assert admin_user is not None
        self.assertTrue(pbkdf2_sha256.verify('NewPass456', admin_user.password))

    def test_reset_from_config(self) -> None:
        result = self.runner.invoke(reset_admin_password, ['--from-config'])
        self.assertEqual(result.exit_code, 0, result.output)
        admin_user = UserService.get_by_name(self.admin_config['name'])
        assert admin_user is not None
        self.assertTrue(pbkdf2_sha256.verify(self.admin_config['password'], admin_user.password))

    def test_reset_from_config_requires_config_password(self) -> None:
        flask_app.config['ADMIN'] = {**self.admin_config, 'password': None}
        result = self.runner.invoke(reset_admin_password, ['--from-config'])
        self.assertNotEqual(result.exit_code, 0)
        self.assertIn('ADMIN.password', result.output)

    def test_reset_rejects_both_stdin_and_from_config(self) -> None:
        result = self.runner.invoke(reset_admin_password, ['--stdin', '--from-config'])
        self.assertNotEqual(result.exit_code, 0)
        self.assertIn('only one', result.output)

    def test_reset_fails_when_admin_missing(self) -> None:
        db.session.delete(self.admin_user)
        db.session.commit()
        result = self.runner.invoke(reset_admin_password, ['--from-config'])
        self.assertNotEqual(result.exit_code, 0)
        self.assertIn('not found', result.output)
