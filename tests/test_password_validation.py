import unittest

from utils.password import (
    PasswordValidationError,
    count_password_character_classes,
    validate_password_strength,
)


class PasswordValidationTests(unittest.TestCase):
    def test_minimum_length(self) -> None:
        with self.assertRaises(PasswordValidationError):
            validate_password_strength('Ab1')

    def test_maximum_length(self) -> None:
        with self.assertRaises(PasswordValidationError):
            validate_password_strength('A1a!' + 'x' * 62)

    def test_three_of_four_classes(self) -> None:
        validate_password_strength('Abcdefg1')
        validate_password_strength('Abcdefg!')
        with self.assertRaises(PasswordValidationError):
            validate_password_strength('abcdefgh')

    def test_count_character_classes(self) -> None:
        self.assertEqual(count_password_character_classes('Abcdefg1'), 3)
        self.assertEqual(count_password_character_classes('Abcdefg!'), 3)


if __name__ == '__main__':
    unittest.main()
