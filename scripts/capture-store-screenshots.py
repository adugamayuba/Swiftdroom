#!/usr/bin/env python3
"""Capture Chrome Web Store screenshots at exactly 1280x800 (device scale 1)."""

from __future__ import annotations

import http.server
import socket
import threading
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
MOCKS = ROOT / "assets" / "chrome-web-store" / "mocks"
OUT = ROOT / "assets" / "chrome-web-store" / "screenshots"
OUT_SMALL = OUT / "640x400"

PAGES = [
    ("01-sidepanel-job-form.html", "01-sidepanel-job-form.png"),
    ("02-autofill-progress.html", "02-autofill-progress.png"),
    ("03-dashboard-settings.html", "03-dashboard-settings.png"),
]


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main() -> None:
    port = free_port()
    handler = lambda *args, **kwargs: http.server.SimpleHTTPRequestHandler(
        *args, directory=str(MOCKS), **kwargs
    )
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    OUT.mkdir(parents=True, exist_ok=True)
    OUT_SMALL.mkdir(parents=True, exist_ok=True)
    base_url = f"http://127.0.0.1:{port}"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": 1280, "height": 800},
                device_scale_factor=1,
            )
            page = context.new_page()

            for html_name, png_name in PAGES:
                page.goto(f"{base_url}/{html_name}", wait_until="networkidle")
                dest = OUT / png_name
                page.screenshot(path=str(dest), full_page=False)
                img = Image.open(dest).convert("RGB")
                if img.size != (1280, 800):
                    img = img.resize((1280, 800), Image.Resampling.LANCZOS)
                    img.save(dest, optimize=True)
                img.resize((640, 400), Image.Resampling.LANCZOS).save(
                    OUT_SMALL / png_name, optimize=True
                )
                print(f"OK {png_name} {img.size}")

            browser.close()
    finally:
        server.shutdown()

    print(f"Saved to {OUT}")


if __name__ == "__main__":
    main()
