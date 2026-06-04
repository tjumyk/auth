import unittest
from unittest.mock import MagicMock, patch

from store import (
    STATUS_PENDING,
    STATUS_READY,
    activate_challenge,
    create_pending_challenge,
    hash_answer,
    peek_verify,
    verify_and_consume,
)


class StoreTests(unittest.TestCase):
    @patch('store._redis_client')
    def test_create_and_activate(self, mock_client_factory: MagicMock) -> None:
        mock_r = MagicMock()
        mock_client_factory.return_value = mock_r
        mock_r.exists.return_value = True
        mock_r.hget.return_value = STATUS_PENDING

        cid = create_pending_challenge('1.2.3.4')
        self.assertTrue(len(cid) > 0)
        mock_r.hset.assert_called()
        mock_r.expire.assert_called()

        ok = activate_challenge(cid, '1234', '1.2.3.4')
        self.assertTrue(ok)

    @patch('store._redis_client')
    def test_verify_deletes_key(self, mock_client_factory: MagicMock) -> None:
        mock_r = MagicMock()
        mock_client_factory.return_value = mock_r
        answer_hash = hash_answer('5678')
        mock_r.hgetall.return_value = {
            'status': STATUS_READY,
            'answer_hash': answer_hash,
            'ip': '10.0.0.1',
        }

        valid, reason = verify_and_consume('00000000-0000-4000-8000-000000000001', '5678', '10.0.0.1')
        self.assertTrue(valid)
        self.assertIsNone(reason)
        mock_r.delete.assert_called_once()

    @patch('store._redis_client')
    def test_peek_does_not_delete(self, mock_client_factory: MagicMock) -> None:
        mock_r = MagicMock()
        mock_client_factory.return_value = mock_r
        answer_hash = hash_answer('1234')
        mock_r.hgetall.return_value = {
            'status': STATUS_READY,
            'answer_hash': answer_hash,
        }

        valid, _ = peek_verify('00000000-0000-4000-8000-000000000003', '1234', None)
        self.assertTrue(valid)
        mock_r.delete.assert_not_called()

    @patch('store._redis_client')
    def test_wrong_answer_invalidates(self, mock_client_factory: MagicMock) -> None:
        mock_r = MagicMock()
        mock_client_factory.return_value = mock_r
        mock_r.hgetall.return_value = {
            'status': STATUS_READY,
            'answer_hash': hash_answer('1111'),
        }

        valid, reason = verify_and_consume('00000000-0000-4000-8000-000000000002', '9999', None)
        self.assertFalse(valid)
        self.assertEqual(reason, 'wrong_answer')
        mock_r.delete.assert_called_once()


if __name__ == '__main__':
    unittest.main()
