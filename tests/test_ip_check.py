import os
import tempfile
import unittest
from unittest.mock import patch

from app import app as flask_app
from models import User, db
from passlib.hash import pbkdf2_sha256


class IpCheckTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        flask_app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{self.db_path}'
        flask_app.config['IP_CHECK'] = {
            'url': 'http://gate.example',
            'secret': 'test-secret',
        }
        self.client = flask_app.test_client()
        self.ctx = flask_app.app_context()
        self.ctx.push()
        db.create_all()
        self.user = User(
            name='ipuser',
            email='ip@example.com',
            password=pbkdf2_sha256.hash('Pass123456'),
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

    @patch('api_account.requests.get')
    def test_ip_check_returns_guarded_ports(self, mock_get) -> None:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            'check_pass': False,
            'guarded_ports': [443, 80],
        }

        with self.client.session_transaction() as sess:
            sess['user_id'] = self.user.id

        response = self.client.get('/api/account/ip-check')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertFalse(payload['check_pass'])
        self.assertEqual(payload['guarded_ports'], [443, 80])


if __name__ == '__main__':
    unittest.main()
