import unittest

from app import app as flask_app


class MetaTimeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = flask_app.test_client()

    def test_meta_time_returns_unix_timestamp(self) -> None:
        response = self.client.get('/api/meta/time')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIsInstance(payload, dict)
        self.assertIn('unix_time', payload)
        self.assertIsInstance(payload['unix_time'], float)
        self.assertGreater(payload['unix_time'], 0)
