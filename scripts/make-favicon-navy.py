#!/usr/bin/env python3
"""
Generate navy-background favicon assets from the existing white logo source.
Replaces: favicon.ico, favicon-32.png, favicon-48.png, apple-touch-icon.png
Does NOT touch: logo-concierge.png, email-logo-*.png, or any other assets.
"""
from pathlib import Path
from PIL import Image

# Brand navy: #0d1b35
NAVY = (13, 27, 53, 255)

ROOT = Path(__file__).parent.parent
SOURCE = ROOT / "public" / "favicon-source.png"
OUT = ROOT / "public"

def make_icon(source: Image.Image, size: int, padding_frac: float = 0.14) -> Image.Image:
    """White logo centered on solid navy square at `size` px."""
    bg = Image.new("RGBA", (size, size), NAVY)
    pad = max(1, int(size * padding_frac))
    logo_size = size - 2 * pad
    logo = source.resize((logo_size, logo_size), Image.LANCZOS)
    bg.paste(logo, (pad, pad), logo)
    return bg

source = Image.open(SOURCE).convert("RGBA")
print(f"Source: {SOURCE.name}  {source.size}  {source.mode}")

# favicon-32.png  (browser tab, standard)
img32 = make_icon(source, 32)
img32.save(OUT / "favicon-32.png", "PNG")
print("✓  favicon-32.png  32×32")

# favicon-48.png  (Windows taskbar)
img48 = make_icon(source, 48)
img48.save(OUT / "favicon-48.png", "PNG")
print("✓  favicon-48.png  48×48")

# apple-touch-icon.png  (180×180 — iOS adds its own rounding)
img180 = make_icon(source, 180, padding_frac=0.16)
img180.save(OUT / "apple-touch-icon.png", "PNG")
print("✓  apple-touch-icon.png  180×180")

# favicon.ico  (multi-size: 16 + 32 embedded)
img_ico = make_icon(source, 256)        # Pillow downscales from this
img_ico.save(OUT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32)])
print("✓  favicon.ico  (16×16 + 32×32)")

print("\nAll favicon assets updated. Bump ?v= in index.html to bust cache.")
