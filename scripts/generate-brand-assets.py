#!/usr/bin/env python3
"""Generate Swiftdroom logos in multiple styles and Chrome Web Store sizes."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "logos"

HEADER = (3, 20, 20)  # #031414
LAVENDER = (209, 213, 255)  # #d1d5ff
MINT = (216, 240, 228)  # #d8f0e4
WHITE = (255, 255, 255)


def try_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        p = Path(path)
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size)
            except OSError:
                continue
    return ImageFont.load_default()


def draw_monogram(draw: ImageDraw.ImageDraw, cx: float, cy: float, r: float, fg: tuple[int, int, int]) -> None:
    """Stylized S with a forward motion stroke (swift)."""
    w = r * 0.22
    # Upper arc of S
    draw.arc(
        (cx - r * 0.55, cy - r * 0.72, cx + r * 0.2, cy - r * 0.05),
        start=200,
        end=20,
        fill=fg,
        width=max(2, int(w)),
    )
    # Lower arc
    draw.arc(
        (cx - r * 0.2, cy + r * 0.05, cx + r * 0.55, cy + r * 0.72),
        start=200,
        end=20,
        fill=fg,
        width=max(2, int(w)),
    )
    # Forward chevron
    pts = [
        (cx + r * 0.15, cy - r * 0.05),
        (cx + r * 0.72, cy),
        (cx + r * 0.15, cy + r * 0.05),
    ]
    draw.polygon(pts, fill=fg)


def icon_square(size: int, bg: tuple[int, int, int], fg: tuple[int, int, int], radius_ratio: float = 0.22) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = max(1, int(size * 0.08))
    r = (size - pad * 2) // 2
    cx = cy = size // 2
    corner = int(size * radius_ratio)
    draw.rounded_rectangle((pad, pad, size - pad, size - pad), radius=corner, fill=bg)
    draw_monogram(draw, cx, cy, r * 0.78, fg)
    return img


def icon_circle(size: int, bg: tuple[int, int, int], fg: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = max(1, int(size * 0.06))
    draw.ellipse((pad, pad, size - pad, size - pad), fill=bg)
    draw_monogram(draw, size // 2, size // 2, (size - pad * 2) * 0.36, fg)
    return img


def wordmark(width: int, height: int, bg: tuple[int, int, int] | None, text_color: tuple[int, int, int]) -> Image.Image:
    mode = "RGBA" if bg is None else "RGB"
    base = (0, 0, 0, 0) if bg is None else bg
    img = Image.new(mode, (width, height), base)
    draw = ImageDraw.Draw(img)
    font_size = int(height * 0.42)
    font = try_font(font_size, bold=True)
    text = "Swiftdroom"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (width - tw) // 2
    y = (height - th) // 2 - int(height * 0.04)
    draw.text((x, y), text, fill=text_color, font=font)
    # Accent dot
    dot_r = max(3, int(height * 0.04))
    draw.ellipse((x + tw + int(height * 0.06), y + th // 2 - dot_r, x + tw + int(height * 0.06) + dot_r * 2, y + th // 2 + dot_r), fill=LAVENDER if text_color == WHITE else HEADER)
    return img


def promo_tile(w: int, h: int) -> Image.Image:
    img = Image.new("RGB", (w, h), HEADER)
    draw = ImageDraw.Draw(img)
    # Soft gradient bands
    for i in range(h):
        t = i / h
        c = (
            int(HEADER[0] + (MINT[0] - HEADER[0]) * t * 0.15),
            int(HEADER[1] + (MINT[1] - HEADER[1]) * t * 0.2),
            int(HEADER[2] + (MINT[2] - HEADER[2]) * t * 0.18),
        )
        draw.line([(0, i), (w, i)], fill=c)
    icon_sz = int(min(w, h) * 0.28)
    icon = icon_square(icon_sz, LAVENDER, HEADER, radius_ratio=0.24)
    img.paste(icon, (int(w * 0.08), int(h * 0.32)), icon)
    font_lg = try_font(int(h * 0.14), bold=True)
    font_sm = try_font(int(h * 0.055))
    draw.text((int(w * 0.34), int(h * 0.34)), "Swiftdroom", fill=WHITE, font=font_lg)
    draw.text(
        (int(w * 0.34), int(h * 0.52)),
        "Job application co-pilot",
        fill=(LAVENDER[0], LAVENDER[1], LAVENDER[2]),
        font=font_sm,
    )
    draw.rounded_rectangle(
        (int(w * 0.34), int(h * 0.66), int(w * 0.58), int(h * 0.76)),
        radius=8,
        fill=LAVENDER,
    )
    draw.text((int(w * 0.37), int(h * 0.685)), "Autofill · AI answers", fill=HEADER, font=font_sm)
    return img


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if img.mode == "RGBA":
        img.save(path, "PNG", optimize=True)
    else:
        img.convert("RGB").save(path, "PNG", optimize=True)


def resize_icon(src: Image.Image, size: int) -> Image.Image:
    return src.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    styles_dir = OUT / "styles"
    ext_dir = ROOT / "extension" / "icons"

    # --- Style: primary (dark icon, lavender mark) ---
    primary_512 = icon_square(512, HEADER, LAVENDER)
    save_png(primary_512, styles_dir / "icon-primary-512.png")

    # --- Style: lavender background ---
    lavender_512 = icon_square(512, LAVENDER, HEADER)
    save_png(lavender_512, styles_dir / "icon-lavender-512.png")

    # --- Style: mint background ---
    mint_512 = icon_square(512, MINT, HEADER)
    save_png(mint_512, styles_dir / "icon-mint-512.png")

    # --- Style: circle ---
    circle_512 = icon_circle(512, HEADER, LAVENDER)
    save_png(circle_512, styles_dir / "icon-circle-512.png")

    # --- Wordmarks ---
    save_png(wordmark(640, 160, None, HEADER), styles_dir / "wordmark-dark-transparent.png")
    save_png(wordmark(640, 160, HEADER, WHITE), styles_dir / "wordmark-on-dark.png")
    save_png(wordmark(640, 160, LAVENDER, HEADER), styles_dir / "wordmark-on-lavender.png")

    # --- Promo tiles (Chrome Web Store) ---
    save_png(promo_tile(440, 280), OUT / "promo-small-440x280.png")
    save_png(promo_tile(1400, 560), OUT / "promo-marquee-1400x560.png")

    # --- Standard sizes from primary icon ---
    sizes = {
        "icon-16.png": 16,
        "icon-48.png": 48,
        "icon-128.png": 128,
        "store-icon-128.png": 128,
        "icon-256.png": 256,
        "icon-512.png": 512,
    }
    sizes_dir = OUT / "sizes"
    for name, sz in sizes.items():
        save_png(resize_icon(primary_512, sz), sizes_dir / name)

    # Lavender + circle variants at common sizes
    for label, base in [("lavender", lavender_512), ("circle", circle_512)]:
        for sz in (16, 48, 128):
            save_png(resize_icon(base, sz), sizes_dir / f"{label}-{sz}.png")

    # Extension icons (primary style)
    for sz, fname in [(16, "icon16.png"), (48, "icon48.png"), (128, "icon128.png")]:
        save_png(resize_icon(primary_512, sz), ext_dir / fname)

    print(f"Wrote logos to {OUT}")
    print(f"Updated extension icons in {ext_dir}")


if __name__ == "__main__":
    main()
