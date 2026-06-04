import unittest

from app import app
from utils.request_client import get_client_ip


class TestGetClientIp(unittest.TestCase):
    def test_direct_peer_when_not_behind_proxy(self) -> None:
        with app.test_request_context(environ_base={'REMOTE_ADDR': '203.0.113.10'}):
            self.assertEqual(get_client_ip(behind_proxy=False), '203.0.113.10')

    def test_x_real_ip_when_behind_proxy(self) -> None:
        with app.test_request_context(
            environ_base={
                'REMOTE_ADDR': '10.0.0.2',
                'HTTP_X_REAL_IP': '203.0.113.20',
            },
        ):
            self.assertEqual(get_client_ip(behind_proxy=True), '203.0.113.20')

    def test_x_forwarded_for_fallback_when_behind_proxy(self) -> None:
        with app.test_request_context(
            environ_base={
                'REMOTE_ADDR': '10.0.0.2',
                'HTTP_X_FORWARDED_FOR': '203.0.113.30, 10.0.0.5',
            },
        ):
            self.assertEqual(get_client_ip(behind_proxy=True), '203.0.113.30')


if __name__ == '__main__':
    unittest.main()
