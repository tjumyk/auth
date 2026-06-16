import json
import tempfile
import unittest
from unittest import mock

from app import app as flask_app
from models import OAuthClient, db
from services.oauth import OAuthServiceError
from services.oauth_bootstrap import (
    import_oauth_client_from_env,
    import_oauth_clients,
    import_oauth_clients_from_file,
    parse_oauth_client_from_env,
    parse_oauth_clients_file,
)


class OAuthClientBootstrapTests(unittest.TestCase):
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
        import os

        os.close(self.db_fd)
        os.unlink(self.db_path)

    def _write_clients_file(self, payload: object) -> str:
        handle = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8')
        json.dump(payload, handle)
        handle.close()
        self.addCleanup(lambda: __import__('os').unlink(handle.name))
        return handle.name

    def test_parse_oauth_clients_file(self) -> None:
        path = self._write_clients_file([
            {
                'name': 'testapp',
                'secret': 'fixed-secret',
                'redirect_url': 'http://localhost:3000/oauth/callback',
                'home_url': 'http://localhost:3000',
                'description': 'Test client',
                'is_public': False,
            },
        ])

        specs = parse_oauth_clients_file(path)
        self.assertEqual(len(specs), 1)
        self.assertEqual(specs[0].name, 'testapp')
        self.assertEqual(specs[0].secret, 'fixed-secret')
        self.assertFalse(specs[0].is_public)

    def test_parse_rejects_non_array(self) -> None:
        path = self._write_clients_file({'name': 'testapp'})
        with self.assertRaises(OAuthServiceError):
            parse_oauth_clients_file(path)

    def test_import_is_idempotent(self) -> None:
        path = self._write_clients_file([
            {
                'name': 'testapp',
                'secret': 'fixed-secret',
                'redirect_url': 'http://localhost:3000/oauth/callback',
                'home_url': 'http://localhost:3000',
            },
        ])

        first = import_oauth_clients_from_file(path)
        db.session.commit()
        second = import_oauth_clients_from_file(path)
        db.session.commit()

        self.assertEqual(len(first), 1)
        self.assertTrue(first[0][1])
        self.assertEqual(len(second), 1)
        self.assertFalse(second[0][1])
        self.assertEqual(OAuthClient.query.count(), 1)
        self.assertEqual(first[0][0].id, second[0][0].id)

    def test_import_preserves_fixed_secret(self) -> None:
        specs = parse_oauth_clients_file(self._write_clients_file([
            {
                'name': 'testapp',
                'secret': 'fixed-secret',
                'redirect_url': 'http://localhost:3000/oauth/callback',
                'home_url': 'http://localhost:3000',
            },
        ]))
        results = import_oauth_clients(specs)
        db.session.commit()

        client = results[0][0]
        self.assertEqual(client.secret, 'fixed-secret')

    def test_parse_oauth_client_from_env(self) -> None:
        with mock.patch.dict('os.environ', {
            'OAUTH_CLIENT_NAME': 'testapp',
            'OAUTH_CLIENT_SECRET': 'fixed-secret',
            'OAUTH_CLIENT_REDIRECT_URL': 'http://localhost:3000/oauth/callback',
            'OAUTH_CLIENT_HOME_URL': 'http://localhost:3000',
            'OAUTH_CLIENT_IS_PUBLIC': 'false',
        }, clear=True):
            spec = parse_oauth_client_from_env()

        self.assertIsNotNone(spec)
        assert spec is not None
        self.assertEqual(spec.name, 'testapp')
        self.assertFalse(spec.is_public)

    def test_parse_oauth_client_from_env_returns_none_without_name(self) -> None:
        with mock.patch.dict('os.environ', {}, clear=True):
            self.assertIsNone(parse_oauth_client_from_env())

    def test_import_oauth_client_from_env(self) -> None:
        with mock.patch.dict('os.environ', {
            'OAUTH_CLIENT_NAME': 'testapp',
            'OAUTH_CLIENT_SECRET': 'fixed-secret',
            'OAUTH_CLIENT_REDIRECT_URL': 'http://localhost:3000/oauth/callback',
            'OAUTH_CLIENT_HOME_URL': 'http://localhost:3000',
        }, clear=True):
            results = import_oauth_client_from_env()
            db.session.commit()

        self.assertEqual(len(results), 1)
        self.assertTrue(results[0][1])
        self.assertEqual(results[0][0].secret, 'fixed-secret')


if __name__ == '__main__':
    unittest.main()
