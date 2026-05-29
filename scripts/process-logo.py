#!/usr/bin/env python3
"""
1) Square-crop tall images
2) Circular mask (transparent outside the round emblem)
3) Remove near-black pixels inside the circle (drops the solid black disc behind the colorful logo)
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "logo-hvcs.png"

# Pixels darker than this (max RGB) become transparent — removes black frame / black circle
BLACK_CUTOFF = 52


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


def remove_near_black(im: Image.Image) -> Image.Image:
    """Transparent where the image is still black / near-black (keeps colorful logo only)."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r0, g0, b0, a0 = px[x, y]
            if a0 == 0:
                continue
            if max(r0, g0, b0) < BLACK_CUTOFF:
                px[x, y] = (0, 0, 0, 0)
    return im


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    im = im.crop((left, top, left + side, top + side))

    im = apply_circle(im)
    im = remove_near_black(im)

    im.save(SRC, optimize=True)

    fav32 = im.copy()
    fav32.thumbnail((32, 32), Image.Resampling.LANCZOS)
    fav32.save(ROOT / "public" / "favicon-32.png", optimize=True)

    fav48 = im.copy()
    fav48.thumbnail((48, 48), Image.Resampling.LANCZOS)
    fav48.save(ROOT / "public" / "favicon-48.png", optimize=True)


if __name__ == "__main__":
    main()
