#!/usr/bin/env python3
"""Render TikTok-ready 9:16 videos for the Swiftdroom main account.

Builds branded text slides with PIL, splices in segments of the real product
demo (assets/demo/swiftdroom-demo.mp4), and assembles MP4s with ffmpeg.

Output: assets/marketing/output/tiktok/main/videos/*.mp4 (1080x1920, 30fps, silent —
add trending audio in the TikTok app before posting).
"""

from __future__ import annotations

import shutil
import subprocess
import tempfile
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DEMO = ROOT / "assets" / "demo" / "swiftdroom-demo.mp4"
WORDMARK = ROOT / "assets" / "logos" / "styles" / "wordmark-on-dark.png"
OUT_DIR = ROOT / "assets" / "marketing" / "output" / "tiktok" / "main" / "videos"

W, H = 1080, 1920
FPS = 30

BLACK = (10, 10, 10)
WHITE = (255, 255, 255)
GREEN = (16, 185, 129)
GRAY = (163, 163, 163)
DARK_CARD = (28, 28, 30)

FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


def draw_centered(draw: ImageDraw.ImageDraw, text: str, y: int, fnt, fill,
                  wrap: int = 16, spacing: int = 14) -> int:
    """Draw wrapped text centered horizontally at y. Returns bottom y."""
    wrapped = "\n".join(textwrap.wrap(text, width=wrap)) if len(text) > wrap else text
    bbox = draw.multiline_textbbox((0, 0), wrapped, font=fnt, spacing=spacing)
    tw = bbox[2] - bbox[0]
    draw.multiline_text(((W - tw) // 2, y), wrapped, font=fnt, fill=fill,
                        spacing=spacing, align="center")
    return y + (bbox[3] - bbox[1]) + spacing


def add_brand(img: Image.Image, footer: bool = True) -> None:
    draw = ImageDraw.Draw(img)
    if WORDMARK.exists():
        wm = Image.open(WORDMARK).convert("RGBA")
        ratio = 300 / wm.width
        wm = wm.resize((300, int(wm.height * ratio)), Image.Resampling.LANCZOS)
        img.paste(wm, ((W - 300) // 2, 90), wm)
    if footer:
        draw_centered(draw, "swiftdroom.com  ·  code LAXJSLCA = 20% off",
                      H - 130, font(34, bold=False), GRAY, wrap=60)


def slide(headline: str, sub: str = "", accent: str | None = None,
          big: str | None = None, bg=BLACK, fg=WHITE) -> Image.Image:
    """Standard slide: optional giant accent number/text, headline, subtext."""
    img = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(img)
    add_brand(img)

    y = 560
    if big:
        y = draw_centered(draw, big, y, font(220), GREEN, wrap=10) + 40
    y = draw_centered(draw, headline, y, font(96), fg, wrap=16) + 50
    if sub:
        y = draw_centered(draw, sub, y, font(52, bold=False), GRAY, wrap=30, spacing=18)
    if accent:
        pill_f = font(48)
        bbox = draw.textbbox((0, 0), accent, font=pill_f)
        pw, ph = bbox[2] - bbox[0] + 80, bbox[3] - bbox[1] + 50
        px, py = (W - pw) // 2, y + 60
        draw.rounded_rectangle((px, py, px + pw, py + ph), radius=ph // 2, fill=GREEN)
        draw.text((px + 40, py + 18), accent, font=pill_f, fill=BLACK)
    return img


def cta_slide() -> Image.Image:
    img = Image.new("RGB", (W, H), GREEN)
    draw = ImageDraw.Draw(img)
    y = draw_centered(draw, "Swiftdroom", 540, font(110), BLACK, wrap=20) + 30
    y = draw_centered(draw, "Apply to 50 jobs a day", y, font(64), BLACK, wrap=22) + 70
    pill = "20% OFF — CODE LAXJSLCA"
    pill_f = font(52)
    bbox = draw.textbbox((0, 0), pill, font=pill_f)
    pw, ph = bbox[2] - bbox[0] + 90, bbox[3] - bbox[1] + 56
    px, py = (W - pw) // 2, y + 40
    draw.rounded_rectangle((px, py, px + pw, py + ph), radius=ph // 2, fill=BLACK)
    draw.text((px + 45, py + 20), pill, font=pill_f, fill=WHITE)
    draw_centered(draw, "swiftdroom.com/register", py + ph + 70,
                  font(46, bold=False), (6, 78, 59), wrap=40)
    return img


def demo_bg(caption: str, sub: str = "") -> Image.Image:
    """Background canvas for demo footage overlay (video sits in the middle)."""
    img = Image.new("RGB", (W, H), BLACK)
    draw = ImageDraw.Draw(img)
    add_brand(img)
    y = draw_centered(draw, caption, 360, font(80), WHITE, wrap=20)
    if sub:
        draw_centered(draw, sub, y + 30, font(48, bold=False), GREEN, wrap=32)
    # frame for the video area (1000x625 centered)
    vx, vy = (W - 1000) // 2, (H - 625) // 2 + 60
    draw.rounded_rectangle((vx - 12, vy - 12, vx + 1012, vy + 637),
                           radius=24, outline=GREEN, width=6)
    return img


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, capture_output=True)


def encode_slide(png: Path, dur: float, out: Path) -> None:
    """Still image -> clip with slow zoom-in for motion."""
    frames = int(dur * FPS)
    run([
        "ffmpeg", "-y", "-loop", "1", "-framerate", str(FPS), "-t", str(dur),
        "-i", str(png),
        "-vf",
        (f"scale={W * 2}:{H * 2},"
         f"zoompan=z='min(1+0.0010*on,1.10)':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2'"
         f":d=1:s={W}x{H}:fps={FPS}"),
        "-frames:v", str(frames),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "fast", "-crf", "20",
        str(out),
    ])


def encode_demo(bg_png: Path, start: float, dur: float, out: Path) -> None:
    """Demo footage segment composited onto a branded canvas."""
    vy = (H - 625) // 2 + 60
    run([
        "ffmpeg", "-y",
        "-loop", "1", "-framerate", str(FPS), "-t", str(dur), "-i", str(bg_png),
        "-ss", str(start), "-t", str(dur), "-i", str(DEMO),
        "-filter_complex",
        f"[1:v]scale=1000:625[demo];[0:v][demo]overlay={(W - 1000) // 2}:{vy}",
        "-r", str(FPS), "-t", str(dur),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "fast", "-crf", "20",
        str(out),
    ])


# ---------------------------------------------------------------------------
# Video definitions. Segment types:
#   ("slide", duration, kwargs-for-slide())
#   ("cta", duration)
#   ("demo", duration, demo_start_sec, caption, sub)
# ---------------------------------------------------------------------------

VIDEOS: dict[str, list[tuple]] = {
    "v01-watch-this-form": [
        ("slide", 2.2, {"headline": "this job form has 25 fields", "sub": "watch this."}),
        ("demo", 8.0, 21.0, "scan & autofill", "3 seconds. every field."),
        ("demo", 4.5, 34.0, "AI writes the essay too", "in your voice"),
        ("cta", 2.5),
    ],
    "v03-pov-2026": [
        ("slide", 3.0, {"headline": "POV: it's 2026 and you're STILL typing your work history into Workday"}),
        ("slide", 3.0, {"headline": "20 fields × 50 jobs", "sub": "= your whole week, gone"}),
        ("demo", 6.0, 23.0, "there's an AI for this now", "autofill in 3 seconds"),
        ("cta", 3.0),
    ],
    "v04-we-timed-it": [
        ("slide", 3.0, {"headline": "we timed a real job application", "sub": "manual vs Swiftdroom"}),
        ("slide", 4.0, {"big": "12:24", "headline": "manual", "sub": "re-type resume · hunt dropdowns · write essays"}),
        ("demo", 6.0, 22.0, "now with Swiftdroom", ""),
        ("slide", 4.0, {"big": "0:03", "headline": "with Swiftdroom", "sub": "scan → map → fill → review"}),
        ("slide", 3.0, {"headline": "that's 232x faster", "sub": "every single application"}),
        ("cta", 3.0),
    ],
    "v05-field-labels": [
        ("slide", 1.6, {"headline": '"phone"'}),
        ("slide", 1.6, {"headline": '"mobile"'}),
        ("slide", 1.6, {"headline": '"contact number"'}),
        ("slide", 1.6, {"headline": '"primary phone"'}),
        ("slide", 2.8, {"headline": "they're all the SAME FIELD", "sub": "your saved-answers doc can't keep up"}),
        ("demo", 5.0, 24.0, "Swiftdroom maps them automatically", "set up once. autofill everywhere."),
        ("cta", 2.8),
    ],
    "v06-things-that-take-longer": [
        ("slide", 2.6, {"headline": "things that take longer than a Swiftdroom job application", "sub": "(3 seconds)"}),
        ("slide", 2.2, {"headline": "microwaving anything"}),
        ("slide", 2.2, {"headline": "waiting for an elevator"}),
        ("slide", 2.2, {"headline": "your phone recognizing your face"}),
        ("demo", 4.5, 24.0, "applying to a job", "3 seconds ⚡"),
        ("cta", 2.8),
    ],
    "v07-form-pov": [
        ("slide", 3.0, {"headline": "i am a Workday application", "sub": "step 1 of 7"}),
        ("slide", 3.0, {"headline": "humans usually cry around step 4"}),
        ("slide", 2.5, {"headline": "wait. what is that."}),
        ("demo", 6.0, 23.0, "i have never been completed this fast", ""),
        ("slide", 3.0, {"headline": "Swiftdroom", "sub": "Workday's worst nightmare"}),
        ("cta", 3.0),
    ],
    "v10-the-math": [
        ("slide", 3.0, {"headline": "job search math nobody shows you"}),
        ("slide", 3.5, {"big": "3", "headline": "interviews/month", "sub": "5 apps/day × 2% reply rate"}),
        ("slide", 3.5, {"big": "30", "headline": "interviews/month", "sub": "50 apps/day × 2% reply rate"}),
        ("slide", 3.0, {"headline": "the only question:", "sub": "how do you do 50 a day?"}),
        ("demo", 4.5, 24.0, "3 seconds per application", ""),
        ("cta", 3.0),
    ],
    "v12-feed-reveal": [
        ("slide", 2.8, {"headline": "stop scrolling LinkedIn for jobs"}),
        ("slide", 3.5, {"headline": "Swiftdroom pulls jobs straight from career pages", "sub": "Stripe · Anthropic · Airbnb · Databricks"}),
        ("slide", 3.0, {"headline": "matched to YOUR resume", "sub": "and your target role"}),
        ("demo", 5.5, 23.0, "find → apply in 3 sec → tracked", ""),
        ("cta", 3.0),
    ],
}


def build_video(name: str, segments: list[tuple], tmp: Path) -> Path:
    clips: list[Path] = []
    for i, seg in enumerate(segments):
        clip = tmp / f"{name}-{i:02d}.mp4"
        kind = seg[0]
        if kind == "slide":
            png = tmp / f"{name}-{i:02d}.png"
            slide(**seg[2]).save(png)
            encode_slide(png, seg[1], clip)
        elif kind == "cta":
            png = tmp / f"{name}-{i:02d}.png"
            cta_slide().save(png)
            encode_slide(png, seg[1], clip)
        elif kind == "demo":
            png = tmp / f"{name}-{i:02d}.png"
            demo_bg(seg[3], seg[4]).save(png)
            encode_demo(png, seg[2], seg[1], clip)
        clips.append(clip)

    concat_file = tmp / f"{name}-concat.txt"
    concat_file.write_text("".join(f"file '{c}'\n" for c in clips))
    out = OUT_DIR / f"{name}.mp4"
    run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "fast", "-crf", "20",
        "-r", str(FPS), "-movflags", "+faststart",
        str(out),
    ])
    return out


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix="swiftdroom-tiktok-"))
    try:
        for name, segments in VIDEOS.items():
            out = build_video(name, segments, tmp)
            dur = sum(s[1] for s in segments)
            size_mb = out.stat().st_size / 1024 / 1024
            print(f"{out.name}: ~{dur:.0f}s, {size_mb:.1f} MB")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
