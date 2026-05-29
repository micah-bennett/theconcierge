#!/usr/bin/env python3
"""
Build tab favicons from public/favicon-source.png only (does not change logo-hvcs.png).
Square-crops, then circular mask so the white square background becomes transparent.
Black silhouette icons are kept (no black-removal step).
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "favicon-source.png"


def apply_circle(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    cx, cy = w / 2, h / 2
    r = min(w, h) / 2 - 0.5
    px = im.load()
    for y in range(h):
        for x in range(w):
            dx, dy = x - cx, y - cy
            if dx * dx + dy * dy > r * r:
                px[x, y] = (0, 0, 0, 0)
    return im


def main() -> None:
    im = Image.open(SOURCE).convert("RGBA")
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    im = im.crop((left, top, left + side, top + side))
    im = apply_circle(im)

    fav32 = im.copy()
    fav32.thumbnail((32, 32), Image.Resampling.LANCZOS)
    fav32.save(ROOT / "public" / "favicon-32.png", optimize=True)

    fav48 = im.copy()
    fav48.thumbnail((48, 48), Image.Resampling.LANCZOS)
    fav48.save(ROOT / "public" / "favicon-48.png", optimize=True)


if __name__ == "__main__":
    main()
