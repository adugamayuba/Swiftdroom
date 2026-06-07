#!/usr/bin/env python3
"""Generate TikTok slideshows, Meta flyers, link ads, and GIFs for Swiftdroom marketing."""

from __future__ import annotations

import json
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "assets" / "marketing" / "content"
OUT = ROOT / "assets" / "marketing" / "output"
LOGO = ROOT / "assets" / "logos" / "styles" / "icon-primary-512.png"

HEADER = (3, 20, 20)
LAVENDER = (209, 213, 255)
MINT = (216, 240, 228)
CREAM = (242, 239, 230)
WHITE = (255, 255, 255)
RED = (220, 38, 38)
SLATE = (100, 116, 139)
TAG_BG = (232, 240, 255)
TAG_TEXT = (26, 61, 92)

STYLES = {
    "hook": {"bg": HEADER, "fg": WHITE, "sub": LAVENDER, "accent": LAVENDER},
    "problem": {"bg": CREAM, "fg": HEADER, "sub": SLATE, "accent": RED},
    "pain": {"bg": (255, 245, 245), "fg": HEADER, "sub": SLATE, "accent": RED},
    "solution": {"bg": MINT, "fg": HEADER, "sub": (3, 20, 20, 180), "accent": HEADER},
    "proof": {"bg": TAG_BG, "fg": TAG_TEXT, "sub": SLATE, "accent": TAG_TEXT},
    "cta": {"bg": HEADER, "fg": WHITE, "sub": LAVENDER, "accent": LAVENDER},
}


def try_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
    ]
    for path in candidates:
        p = Path(path)
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size)
            except OSError:
                continue
    return ImageFont.load_default()


def wrap_text(text: str, width: int = 28) -> str:
    return "\n".join(textwrap.wrap(text, width=width)) if len(text) > width else text


def draw_slide(
    size: tuple[int, int],
    headline: str,
    sub: str,
    style: str,
    slide_num: int | None = None,
    total: int | None = None,
) -> Image.Image:
    w, h = size
    palette = STYLES.get(style, STYLES["hook"])
    img = Image.new("RGB", size, palette["bg"])
    draw = ImageDraw.Draw(img)

    if LOGO.exists():
        logo = Image.open(LOGO).convert("RGBA")
        logo_size = 48 if w <= 1200 else 56
        logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
        img.paste(logo, (40, 36), logo)

    font_brand = try_font(22, bold=True)
    draw.text((100 if LOGO.exists() else 40, 44), "Swiftdroom", fill=palette["fg"], font=font_brand)

    if slide_num and total:
        font_small = try_font(18)
        draw.text((w - 120, 48), f"{slide_num}/{total}", fill=palette["sub"], font=font_small)

    headline_size = 64 if h >= 1500 else 52 if w > h else 48
    sub_size = 30 if h >= 1500 else 26 if w > h else 24

    font_head = try_font(headline_size, bold=True)
    font_sub = try_font(sub_size)

    headline_wrapped = wrap_text(headline, width=22 if w < h else 18)
    sub_wrapped = wrap_text(sub, width=32 if w < h else 28)

    bbox_h = draw.multiline_textbbox((0, 0), headline_wrapped, font=font_head, spacing=8)
    bbox_s = draw.multiline_textbbox((0, 0), sub_wrapped, font=font_sub, spacing=6)
    block_h = (bbox_h[3] - bbox_h[1]) + 32 + (bbox_s[3] - bbox_s[1])
    y_start = (h - block_h) // 2

    draw.multiline_text(
        (60, y_start),
        headline_wrapped,
        fill=palette["fg"],
        font=font_head,
        spacing=8,
    )
    draw.multiline_text(
        (60, y_start + (bbox_h[3] - bbox_h[1]) + 32),
        sub_wrapped,
        fill=palette["sub"],
        font=font_sub,
        spacing=6,
    )

    if style == "cta":
        bar_y = h - 100
        draw.rectangle((0, bar_y, w, h), fill=LAVENDER)
        font_cta = try_font(24, bold=True)
        draw.text((60, bar_y + 32), "swiftdroom.com/register?ref=LAXJSLCA", fill=HEADER, font=font_cta)

    return img


def draw_flyer(headline: str, sub: str, cta: str, size: tuple[int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size, HEADER)
    draw = ImageDraw.Draw(img)

    draw.rectangle((0, h - 8, w, h), fill=LAVENDER)
    draw.rectangle((0, 0, w, 120), fill=(10, 36, 36))

    if LOGO.exists():
        logo = Image.open(LOGO).convert("RGBA").resize((72, 72), Image.Resampling.LANCZOS)
        img.paste(logo, (48, 24), logo)

    draw.text((140, 48), "Swiftdroom", fill=WHITE, font=try_font(32, bold=True))

    font_head = try_font(56 if w >= 1000 else 42, bold=True)
    font_sub = try_font(28 if w >= 1000 else 22)
    font_cta = try_font(26, bold=True)

    draw.multiline_text((60, 180), headline, fill=WHITE, font=font_head, spacing=10)
    draw.multiline_text((60, 380), sub, fill=LAVENDER, font=font_sub, spacing=8)

    draw.rounded_rectangle((60, h - 160, w - 60, h - 80), radius=12, fill=LAVENDER)
    draw.text((80, h - 140), cta, fill=HEADER, font=font_cta)

    return img


def draw_link_ad(headline: str, sub: str, cta: str) -> Image.Image:
    w, h = 1200, 628
    img = Image.new("RGB", (w, h), MINT)
    draw = ImageDraw.Draw(img)

    draw.rectangle((0, 0, 420, h), fill=HEADER)
    if LOGO.exists():
        logo = Image.open(LOGO).convert("RGBA").resize((100, 100), Image.Resampling.LANCZOS)
        img.paste(logo, (160, (h - 100) // 2), logo)

    draw.text((460, 80), headline, fill=HEADER, font=try_font(44, bold=True))
    draw.text((460, 200), sub, fill=SLATE, font=try_font(26))
    draw.rounded_rectangle((460, h - 120, 900, h - 50), radius=8, fill=HEADER)
    draw.text((480, h - 108), cta, fill=WHITE, font=try_font(24, bold=True))

    return img


def generate_gif(out_path: Path) -> None:
    frames = []
    steps = [
        ("50 forms/day", "20+ fields each", "problem"),
        ("12 min per form", "copy-paste hell", "pain"),
        ("Swiftdroom", "3 sec autofill", "solution"),
        ("AI Ghostwriter", "intelligent answers", "proof"),
        ("20% OFF", "code LAXJSLCA", "cta"),
    ]
    for headline, sub, style in steps:
        for _ in range(8):
            frames.append(draw_slide((1080, 1080), headline, sub, style))

    frames[0].save(
        out_path,
        save_all=True,
        append_images=frames[1:],
        duration=120,
        loop=0,
        optimize=True,
    )


def main() -> None:
    slideshows = json.loads((CONTENT / "slideshows.json").read_text())
    meta = json.loads((CONTENT / "meta-posts.json").read_text())

    tiktok_dir = OUT / "tiktok"
    meta_dir = OUT / "meta"
    tiktok_dir.mkdir(parents=True, exist_ok=True)
    (meta_dir / "feed").mkdir(parents=True, exist_ok=True)
    (meta_dir / "stories").mkdir(parents=True, exist_ok=True)
    (meta_dir / "link-ads").mkdir(parents=True, exist_ok=True)
    (OUT / "gifs").mkdir(parents=True, exist_ok=True)

    total_slides = 0

    for show in slideshows["slideshows"]:
        folder = tiktok_dir / show["id"]
        folder.mkdir(parents=True, exist_ok=True)
        total = len(show["slides"])
        for i, slide in enumerate(show["slides"], 1):
            img = draw_slide(
                (1080, 1920),
                slide["headline"],
                slide["sub"],
                slide["style"],
                slide_num=i,
                total=total,
            )
            img.save(folder / f"slide-{i:02d}.png", optimize=True)
            total_slides += 1

            square = draw_slide(
                (1080, 1080),
                slide["headline"],
                slide["sub"],
                slide["style"],
                slide_num=i,
                total=total,
            )
            square.save(folder / f"slide-{i:02d}-square.png", optimize=True)

        caption_path = folder / "caption.txt"
        caption_path.write_text(
            f"{show['caption']}\n\n{slideshows['referralUrl']}\n"
        )

    for i, post in enumerate(meta["feedPosts"], 1):
        img = draw_flyer(post["headline"], post["sub"], post["cta"], (1080, 1080))
        img.save(meta_dir / "feed" / f"{post['id']}.png", optimize=True)
        (meta_dir / "feed" / f"{post['id']}-caption.txt").write_text(
            f"{post['caption']}\n\n{meta['referralUrl']}\n"
        )

    for i, frame in enumerate(meta["storyFrames"], 1):
        img = draw_slide((1080, 1920), frame["headline"], frame["sub"], frame["style"])
        img.save(meta_dir / "stories" / f"story-{i:02d}.png", optimize=True)

    for ad in meta["linkAds"]:
        img = draw_link_ad(ad["headline"], ad["sub"], ad["cta"])
        img.save(meta_dir / "link-ads" / f"{ad['id']}.png", optimize=True)

    generate_gif(OUT / "gifs" / "autofill-promo.gif")

    summary = {
        "slideshows": len(slideshows["slideshows"]),
        "tiktok_slides": total_slides,
        "meta_feed_posts": len(meta["feedPosts"]),
        "meta_story_frames": len(meta["storyFrames"]),
        "link_ads": len(meta["linkAds"]),
        "referralUrl": slideshows["referralUrl"],
        "outputDir": str(OUT),
    }
    (OUT / "manifest.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
