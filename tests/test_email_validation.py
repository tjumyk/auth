"""Tests for email address validation."""

import unittest

from utils.email_validation import is_valid_email


class EmailValidationTests(unittest.TestCase):
    def test_huawei_partners_domain(self) -> None:
        self.assertTrue(is_valid_email('hepeng79@huawei-partners.com'))

    def test_plus_addressing(self) -> None:
        self.assertTrue(is_valid_email('user+tag@example.co.uk'))

    def test_subdomain(self) -> None:
        self.assertTrue(is_valid_email('a@mail.example.org'))

    def test_rejects_no_at(self) -> None:
        self.assertFalse(is_valid_email('not-an-email'))

    def test_rejects_domain_hyphen_edges(self) -> None:
        self.assertFalse(is_valid_email('user@-bad.com'))
        self.assertFalse(is_valid_email('user@bad-.com'))

    def test_rejects_too_long(self) -> None:
        local = 'a' * 50
        domain = 'b' * 20 + '.com'
        self.assertFalse(is_valid_email(f'{local}@{domain}'))

    def test_old_pattern_would_reject_hyphenated_domain(self) -> None:
        import re

        old = re.compile(r'^.+@\w+(\.\w+)*$')
        email = 'hepeng79@huawei-partners.com'
        self.assertIsNone(old.match(email))
        self.assertTrue(is_valid_email(email))


if __name__ == '__main__':
    unittest.main()
