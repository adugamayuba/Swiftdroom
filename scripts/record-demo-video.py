#!/usr/bin/env python3
"""Record a customer-facing Swiftdroom product demo video."""

from __future__ import annotations

import http.server
import os
import socket
import subprocess
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DEMO_DIR = ROOT / "assets" / "demo"
ASSETS_DIR = ROOT / "assets"
MOCK_PAGE = "demo/mocks/demo-fill-animation.html"
OUT_MP4 = DEMO_DIR / "swiftdroom-demo.mp4"
OUT_WEBM = DEMO_DIR / "swiftdroom-demo.webm"

APP_URL = os.environ.get("DEMO_APP_URL", "https://www.swiftdroom.com")
EMAIL = os.environ.get("DEMO_EMAIL", "jane@droomify.com")
PASSWORD = os.environ.get("DEMO_PASSWORD", "$$$$$$$$$$")

VIEWPORT = {"width": 1280, "height": 800}


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_mock_server(directory: Path) -> tuple[http.server.ThreadingHTTPServer, int]:
    port = free_port()
    handler = lambda *args, **kwargs: http.server.SimpleHTTPRequestHandler(
        *args, directory=str(directory), **kwargs
    )
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, port


def convert_to_mp4(webm_path: Path, mp4_path: Path) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(webm_path),
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(mp4_path),
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def login(page) -> None:
    page.goto(f"{APP_URL}/login", wait_until="networkidle")
    page.wait_for_timeout(1200)
    page.fill('input[type="email"], input[name="email"]', EMAIL)
    page.fill('input[type="password"]', PASSWORD)
    page.wait_for_timeout(600)
    page.click('button:has-text("Sign in")')
    page.wait_for_url("**/dashboard**", timeout=30000)
    page.wait_for_timeout(2500)


def tour_dashboard(page) -> None:
    page.wait_for_timeout(2000)
    page.click('a[href="/dashboard/profile"]', timeout=10000)
    page.wait_for_timeout(2200)
    page.click('a[href="/dashboard/personas"]', timeout=10000)
    page.wait_for_timeout(2000)
    page.click('a[href="/dashboard"]', timeout=10000)
    page.wait_for_timeout(1500)


def play_fill_demo(page, mock_url: str) -> None:
    page.goto(mock_url, wait_until="networkidle")
    page.wait_for_function("window.demoComplete === true", timeout=120000)
    page.wait_for_timeout(2000)


def show_applications(page) -> None:
    page.goto(f"{APP_URL}/dashboard/applications", wait_until="networkidle")
    page.wait_for_timeout(3000)


def main() -> int:
    DEMO_DIR.mkdir(parents=True, exist_ok=True)
    for old in DEMO_DIR.glob("*.webm"):
        old.unlink()
    if OUT_MP4.exists():
        OUT_MP4.unlink()

    server, port = start_mock_server(ASSETS_DIR)
    mock_url = f"http://127.0.0.1:{port}/{MOCK_PAGE}"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport=VIEWPORT,
                device_scale_factor=1,
                record_video_dir=str(DEMO_DIR),
                record_video_size=VIEWPORT,
            )
            page = context.new_page()

            print("Recording: title card…")
            page.goto(
                f"http://127.0.0.1:{port}/demo/mocks/00-title-card.html",
                wait_until="networkidle",
            )
            page.wait_for_timeout(3500)

            print("Recording: login…")
            login(page)
            print("Recording: dashboard tour…")
            tour_dashboard(page)
            print("Recording: job application autofill demo…")
            play_fill_demo(page, mock_url)
            print("Recording: applications page…")
            show_applications(page)
            page.wait_for_timeout(1500)

            page.close()
            context.close()
            browser.close()

        webms = sorted(DEMO_DIR.glob("*.webm"), key=lambda p: p.stat().st_mtime, reverse=True)
        if webms:
            webms[0].rename(OUT_WEBM)

        if OUT_WEBM.exists():
            print(f"Converting {OUT_WEBM.name} → {OUT_MP4.name}…")
            convert_to_mp4(OUT_WEBM, OUT_MP4)
            size_mb = OUT_MP4.stat().st_size / (1024 * 1024)
            print(f"Done: {OUT_MP4} ({size_mb:.1f} MB)")
        else:
            print("No video file captured.", file=sys.stderr)
            return 1
    finally:
        server.shutdown()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
