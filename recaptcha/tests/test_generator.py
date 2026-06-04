import unittest

from generator import (
    DIGIT_COUNT,
    _digit_distortion,
    _global_distortion_scale,
    generate_digits,
    render_captcha_png,
)


class GeneratorTests(unittest.TestCase):
    def test_generate_digits_length(self) -> None:
        text = generate_digits()
        self.assertEqual(len(text), DIGIT_COUNT)
        self.assertTrue(text.isdigit())

    def test_render_png(self) -> None:
        png = render_captcha_png('1234')
        self.assertTrue(png.startswith(b'\x89PNG'))

    def test_gentle_digits_have_tighter_rotation(self) -> None:
        gentle_1, _, _, _ = _digit_distortion('1', 1)
        gentle_0, _, _, _ = _digit_distortion('0', 1)
        normal_5, _, _, _ = _digit_distortion('5', 1)
        self.assertLess(gentle_1, normal_5)
        self.assertLess(gentle_0, normal_5)

    def test_global_distortion_reduced_for_ambiguous_codes(self) -> None:
        self.assertLess(_global_distortion_scale('0137'), _global_distortion_scale('2456'))


if __name__ == '__main__':
    unittest.main()
