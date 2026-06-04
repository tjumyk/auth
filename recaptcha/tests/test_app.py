import unittest
from unittest.mock import patch

from app import app


class AppRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = app.test_client()
        app.config['TESTING'] = True

    def test_health(self) -> None:
        resp = self.client.get('/api/meta/health')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json(), {'status': 'ok'})

    @patch('app.check_issue_rate_limit', return_value=True)
    @patch('app.create_pending_challenge', return_value='00000000-0000-4000-8000-000000000010')
    def test_create_challenge(self, _mock_create: object, _mock_rate: object) -> None:
        resp = self.client.post('/api/v1/challenges')
        self.assertEqual(resp.status_code, 201)
        data = resp.get_json()
        self.assertEqual(data['challenge_id'], '00000000-0000-4000-8000-000000000010')

    @patch('app._captcha_secret', return_value='secret')
    @patch('app.verify_and_consume', return_value=(True, None))
    def test_verify_internal(self, _mock_verify: object, _mock_secret: object) -> None:
        resp = self.client.post(
            '/internal/v1/verify',
            json={'challenge_id': '00000000-0000-4000-8000-000000000011', 'answer': '1234'},
            headers={'X-Captcha-Secret': 'secret'},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.get_json()['valid'])

    @patch('app._captcha_secret', return_value='secret')
    def test_verify_unauthorized(self, _mock_secret: object) -> None:
        resp = self.client.post(
            '/internal/v1/verify',
            json={'challenge_id': '00000000-0000-4000-8000-000000000011', 'answer': '1234'},
            headers={'X-Captcha-Secret': 'wrong'},
        )
        self.assertEqual(resp.status_code, 401)


if __name__ == '__main__':
    unittest.main()
