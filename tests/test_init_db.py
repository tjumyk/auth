import os
import tempfile
import unittest

from app import app as flask_app, init_db
from models import Group, User, db
from services.user import UserService


class InitDbTests(unittest.TestCase):
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

    def test_init_db_is_idempotent(self) -> None:
        runner = flask_app.test_cli_runner()
        admin_config = flask_app.config['ADMIN']

        first = runner.invoke(init_db)
        self.assertEqual(first.exit_code, 0, first.output)
        user_count_after_first = User.query.count()
        group_count_after_first = Group.query.count()

        second = runner.invoke(init_db)
        self.assertEqual(second.exit_code, 0, second.output)
        self.assertEqual(User.query.count(), user_count_after_first)
        self.assertEqual(Group.query.count(), group_count_after_first)

        admin_user = UserService.get_by_name(admin_config['name'])
        self.assertIsNotNone(admin_user)
        admin_group = Group.query.filter_by(name='admin').one()
        self.assertIn(admin_group, admin_user.groups)
