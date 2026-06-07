# Product demo video

Customer-facing walkthrough of Swiftdroom.

## Output

| File | Description |
|------|-------------|
| `swiftdroom-demo.mp4` | H.264 MP4 (~1280×800, ready to share) |
| `swiftdroom-demo.webm` | Source recording from Playwright |

## What's in the demo (~45s)

1. Title card
2. Log in as Jenny (`jane@droomify.com`)
3. Dashboard tour (Profile → Personas → Overview)
4. Greenhouse-style job application with animated autofill + Ghostwriter
5. Applications tracker in the dashboard

## Regenerate

```bash
# Optional: override credentials (password is 10 dollar signs by default)
export DEMO_EMAIL=jane@droomify.com
export DEMO_PASSWORD='$$$$$$$$$$'

python3 scripts/record-demo-video.py
```

Requires `playwright` and `ffmpeg`.
