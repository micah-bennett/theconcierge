#!/usr/bin/env python3
"""Remove square padding around the circular logo; regenerate favicon assets."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SOURCE = PUBLIC / "favicon-source.png"
OUTER_RADIUS_RATIO = 0.48


def outside_circle(x: int, y: int, cx: float, cy: float, radius: float) -> bool:
    return math.hypot(x + 0.5 - cx, y + 0.5 - cy) > radius


def is_background(r: int, g: int, b: int) -> bool:
    return (r > 248 and g > 248 and b > 248) or (r < 8 and g < 8 and b < 8)


def transparentize(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    w, h = rgba.size
    cx, cy = w / 2, h / 2
    radius = min(w, h) * OUTER_RADIUS_RATIO
    pixels = rgba.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if outside_circle(x, y, cx, cy, radius) or is_background(r, g, b):
                pixels[x, y] = (r, g, b, 0)
    return rgba


def main() -> None:
    base = Image.open(SOURCE)
    logo = transparentize(base)

    logo.save(PUBLIC / "logo-concierge.png", "PNG")
    logo.save(SOURCE, "PNG")

    for size, name in [(32, "favicon-32.png"), (48, "favicon-48.png"), (180, "apple-touch-icon.png")]:
        resized = logo.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(PUBLIC / name, "PNG")

    logo.resize((32, 32), Image.Resampling.LANCZOS).save(PUBLIC / "favicon.ico", format="ICO")
    print("Updated logo-concierge.png, favicon-source.png, and favicon assets")


if __name__ == "__main__":
    main()
