import unittest

from error import BasicError


class SampleError(BasicError):
    pass


class BasicErrorTests(unittest.TestCase):
    def test_leaves_literal_braces_in_detail(self) -> None:
        err = SampleError('failed', detail='{"type":"int_parsing"}')
        self.assertEqual(err.msg, 'failed')
        self.assertEqual(err.detail, '{"type":"int_parsing"}')

    def test_formats_templates_when_kwargs_provided(self) -> None:
        err = SampleError('hello {name}', detail='level {level}', name='alice', level='E1')
        self.assertEqual(err.msg, 'hello alice')
        self.assertEqual(err.detail, 'level E1')


if __name__ == '__main__':
    unittest.main()
