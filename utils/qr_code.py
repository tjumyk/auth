from base64 import b64encode
from io import BytesIO

import qrcode


def build_qr_code(content: str) -> bytes:
    buffer = BytesIO()
    qrcode.make(content).save(buffer)
    return buffer.getvalue()


def img_to_base64(img: bytes, format: str='png') ->str:
    return 'data:image/%s;base64,%s' % (format, b64encode(img).decode())


if __name__ == '__main__':
    with open('test.png', 'wb') as f:
        f.write(build_qr_code('hello, world!'))
