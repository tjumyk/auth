import os
import tempfile
import unittest

from app import app
from utils.database_url import resolve_database_uri


class TestDatabaseUrl(unittest.TestCase):
    def test_sqlite_relative_uses_instance_path(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            app.root_path = tmp
            app.instance_path = os.path.join(tmp, 'instance')
            with app.app_context():
                resolved = resolve_database_uri('sqlite:///auth.db', app)
            self.assertTrue(resolved.startswith('sqlite:///'))
            self.assertIn('instance', resolved)
            self.assertTrue(resolved.endswith('auth.db') or 'auth.db' in resolved)

    def test_sqlite_absolute_unchanged(self) -> None:
        uri = 'sqlite:////tmp/abs.db'
        with app.app_context():
            self.assertEqual(resolve_database_uri(uri, app), uri)

    def test_postgresql_unchanged(self) -> None:
        uri = 'postgresql://u:p@localhost/db'
        with app.app_context():
            self.assertEqual(resolve_database_uri(uri, app), uri)


if __name__ == '__main__':
    unittest.main()
