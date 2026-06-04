import math
import os
import random
import string
from io import BytesIO

from PIL import Image, ImageDraw, ImageFilter, ImageFont

DIGIT_COUNT = 4
DEFAULT_WIDTH = 200
DEFAULT_HEIGHT = 72

# Digits that are easily confused when heavily rotated or warped.
_GENTLE_STROKE = frozenset('1')  # vs 3, 7
_GENTLE_ROUND = frozenset('08')  # 0 vs 8
_GENTLE_CURVE = frozenset('37')  # vs 1


def _is_gentle_digit(ch: str) -> bool:
    return ch in _GENTLE_STROKE or ch in _GENTLE_ROUND or ch in _GENTLE_CURVE


def _digit_distortion(ch: str, level: int) -> tuple[float, float, float, int]:
    """
    Per-character transform limits: (max_abs_angle_deg, scale_min, scale_max, y_jitter_px).
    Ambiguous glyphs use tighter bounds so 1≠3/7 and 0≠8 while keeping background noise.
    """
    level_boost = 1 + level * 0.12
    if ch == '1':
        max_angle = 5 * level_boost
        scale = (0.94, 1.06)
        y_jitter = 2
    elif ch == '0':
        max_angle = 6 * level_boost
        scale = (0.94, 1.06)
        y_jitter = 2
    elif ch in _GENTLE_ROUND:
        max_angle = 8 * level_boost
        scale = (0.92, 1.08)
        y_jitter = 3
    elif ch in _GENTLE_CURVE:
        max_angle = 10 * level_boost
        scale = (0.90, 1.10)
        y_jitter = 3
    else:
        max_angle = 18 * level_boost
        scale = (0.85, 1.15)
        y_jitter = 4
    return max_angle, scale[0], scale[1], y_jitter


def _global_distortion_scale(text: str) -> float:
    """Reduce whole-image warp/blur when the code contains easily confused digits."""
    if not text:
        return 1.0
    gentle = sum(1 for ch in text if _is_gentle_digit(ch))
    # e.g. four gentle digits → ~55% of full warp; none → 100%
    return max(0.45, 1.0 - 0.11 * gentle)


def _noise_level() -> int:
    return max(0, min(2, int(os.environ.get('CAPTCHA_NOISE_LEVEL', '1'))))


def _font_path() -> str | None:
    candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return None


def generate_digits() -> str:
    return ''.join(random.choices(string.digits, k=DIGIT_COUNT))


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = _font_path()
    if path is not None:
        return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _draw_background(draw: ImageDraw.ImageDraw, width: int, height: int, level: int) -> None:
    c1 = (random.randint(200, 240), random.randint(200, 240), random.randint(210, 250))
    c2 = (random.randint(160, 210), random.randint(170, 220), random.randint(180, 230))
    for y in range(height):
        t = y / max(height - 1, 1)
        color = tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color)
    dot_count = 40 + level * 30
    for _ in range(dot_count):
        x = random.randint(0, width - 1)
        y = random.randint(0, height - 1)
        draw.point((x, y), fill=(
            random.randint(80, 180),
            random.randint(80, 180),
            random.randint(80, 180),
        ))


def _draw_interference_lines(draw: ImageDraw.ImageDraw, width: int, height: int, level: int) -> None:
    line_count = 2 + level * 2
    for _ in range(line_count):
        start = (random.randint(0, width // 4), random.randint(0, height))
        end = (random.randint(3 * width // 4, width), random.randint(0, height))
        color = (
            random.randint(60, 140),
            random.randint(60, 140),
            random.randint(60, 140),
        )
        draw.line([start, end], fill=color, width=random.randint(1, 2))


def _render_digits(image: Image.Image, text: str, level: int) -> None:
    width, height = image.size
    draw = ImageDraw.Draw(image)
    slot = width // (len(text) + 1)
    base_size = int(height * 0.55)

    for i, ch in enumerate(text):
        max_angle, scale_min, scale_max, y_jitter = _digit_distortion(ch, level)
        char_img = Image.new('RGBA', (slot, height), (0, 0, 0, 0))
        char_draw = ImageDraw.Draw(char_img)
        font_size = int(base_size * random.uniform(scale_min, scale_max))
        font = _load_font(font_size)
        color = (
            random.randint(20, 80),
            random.randint(20, 80),
            random.randint(20, 80),
        )
        bbox = char_draw.textbbox((0, 0), ch, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = (slot - tw) // 2
        ty = (height - th) // 2
        char_draw.text((tx, ty), ch, font=font, fill=color)
        angle = random.uniform(-max_angle, max_angle)
        char_img = char_img.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
        paste_x = slot * (i + 1) - char_img.width // 2
        paste_y = (height - char_img.height) // 2 + random.randint(-y_jitter, y_jitter)
        image.paste(char_img, (paste_x, paste_y), char_img)


def _wave_distort(image: Image.Image, level: int, distortion_scale: float = 1.0) -> Image.Image:
    width, height = image.size
    amplitude = (2.5 + level * 1.5) * distortion_scale
    period = random.uniform(18, 32)
    src = image.load()
    out = Image.new('RGB', (width, height))
    dst = out.load()
    for y in range(height):
        for x in range(width):
            offset = int(amplitude * math.sin(2 * math.pi * y / period + x * 0.04))
            sx = min(max(x + offset, 0), width - 1)
            dst[x, y] = src[sx, y]
    return out


def render_captcha_png(text: str) -> bytes:
    level = _noise_level()
    width = DEFAULT_WIDTH
    height = DEFAULT_HEIGHT
    image = Image.new('RGB', (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(image)
    _draw_background(draw, width, height, level)
    _draw_interference_lines(draw, width, height, level)
    _render_digits(image, text, level)
    distortion_scale = _global_distortion_scale(text)
    image = _wave_distort(image, level, distortion_scale)
    if level >= 1:
        image = image.filter(ImageFilter.GaussianBlur(radius=0.4 * distortion_scale))
    buf = BytesIO()
    image.save(buf, format='PNG')
    return buf.getvalue()
