# Swiftdroom marketing content

Organic social content for **10 TikTok accounts** (3 posts each = 30 slideshows) plus **Meta** (Facebook + Instagram) assets.

## Referral link (use everywhere)

| | |
|---|---|
| **Code** | `WELCOME` |
| **URL** | https://www.swiftdroom.com/register?code=WELCOME |
| **Offer** | 20% off first month |

## Quick start

```bash
# Generate all slide images, flyers, link ads, and GIF
python3 scripts/generate-marketing-assets.py
```

Output: `assets/marketing/output/`

## What's included

| Asset | Count | Size | Platform |
|-------|-------|------|----------|
| TikTok slideshows | 30 × 6 slides | 1080×1920 | TikTok |
| Square carousel slides | 30 × 6 | 1080×1080 | IG carousel |
| Meta feed flyers | 5 | 1080×1080 | FB + IG feed |
| Story frames | 4 | 1080×1920 | IG + FB stories |
| Link ad images | 3 | 1200×628 | Meta ads |
| Promo GIF | 1 | 1080×1080 | All platforms |
| Demo video | 1 | 1280×800 | Reels / ads | `assets/demo/swiftdroom-demo.mp4` |

## Docs

- [CONTENT_LIBRARY.md](./CONTENT_LIBRARY.md) — all 30 slideshow scripts + captions
- [POSTING_SCHEDULE.md](./POSTING_SCHEDULE.md) — 10-account posting calendar
- [META_GUIDE.md](./META_GUIDE.md) — Facebook + Instagram posting guide
- [META_ADS_COPY.md](./META_ADS_COPY.md) — paste-ready Meta Ads Manager text
- [VIDEO_SCRIPTS.md](./VIDEO_SCRIPTS.md) — Reels / short video scripts

## TikTok slideshow posting

1. Open `assets/marketing/output/tiktok/{slideshow-id}/`
2. Upload slides **in order** (`slide-01.png` → `slide-06.png`) as a photo slideshow
3. Paste caption from `caption.txt`
4. Add trending audio (see POSTING_SCHEDULE.md)
5. Pin comment: `20% off → swiftdroom.com/register?ref=LAXJSLCA`

## Regenerate after copy changes

Edit `assets/marketing/content/slideshows.json` or `meta-posts.json`, then re-run the generator.
