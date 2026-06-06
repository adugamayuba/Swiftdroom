# Chrome Web Store — Swiftdroom checklist

## Before upload

- [ ] Developer account registered ($5): https://chrome.google.com/webstore/devconsole
- [ ] Privacy policy live: https://swiftdroom.com/privacy
- [ ] Terms live: https://swiftdroom.com/terms
- [ ] Test extension locally: `chrome://extensions` → Developer mode → Load unpacked → `extension/`

## Package the extension

```bash
node scripts/package-extension.mjs
```

Upload `swiftdroom-extension.zip` from the repo root.

## Store listing copy (paste into dashboard)

**Name:** Swiftdroom — Job Application Co-Pilot

**Short description:** Autofill Workday, Greenhouse & Lever applications. AI answers from your resume.

**Detailed description:**

Swiftdroom is a job application co-pilot that saves you from retyping your resume on every application.

• Autofill contact info, work history, and links on Workday, Greenhouse, Lever, and company career pages  
• Generate tailored draft answers to open-ended questions using your resume and the job description  
• Track applications from one dashboard  
• You review everything — Swiftdroom never submits applications for you  

Get started at https://swiftdroom.com — create your profile, subscribe, install the extension, and it connects automatically when you log in.

**Category:** Productivity

**Homepage:** https://swiftdroom.com  
**Privacy policy:** https://swiftdroom.com/privacy  
**Support URL:** https://swiftdroom.com/support  
**Support email:** hello@swiftdroom.com

## Permission justifications

| Permission | Justification |
|------------|---------------|
| storage | Save your API connection token after you sign in on swiftdroom.com |
| activeTab | Read and fill form fields on the job application page you are viewing |
| sidePanel | Show the Swiftdroom sidebar while you apply |
| scripting | Detect labels and insert autofill / AI answers on application forms |
| host_permissions (all_urls) | Job applications are hosted on thousands of employer domains and ATS sites (Workday, Greenhouse, Lever, etc.) |

## Screenshots (required)

Ready-made assets (1280×800 and 640×400):

- `assets/chrome-web-store/screenshots/01-sidepanel-job-form.png`
- `assets/chrome-web-store/screenshots/02-autofill-progress.png`
- `assets/chrome-web-store/screenshots/03-dashboard-settings.png`
- Smaller set: `assets/chrome-web-store/screenshots/640x400/`

Regenerate mocks: see `assets/chrome-web-store/README.md`.

1. Side panel open on a job application form  
2. Autofill / scan in progress  
3. Dashboard settings showing extension connected  

## Store icon & promo

- Icon (128×128): `assets/logos/sizes/store-icon-128.png`
- Promo 440×280: `assets/logos/promo-small-440x280.png`
- Promo 1400×560: `assets/logos/promo-marquee-1400x560.png`
- All logo styles: `assets/logos/README.md`

## Live listing (v1.0.7)

**Extension ID:** `ficlpmiflbjkgegelneegohcbimjhnnb`  
**Store URL:** https://chromewebstore.google.com/detail/swiftdroom-%E2%80%94-job-applicat/ficlpmiflbjkgegelneegohcbimjhnnb

Set on **Vercel** (see [ENVIRONMENT.md](ENVIRONMENT.md)):

```env
CHROME_WEB_STORE_URL=https://chromewebstore.google.com/detail/ficlpmiflbjkgegelneegohcbimjhnnb
```

Redeploy frontend after approval so “Add to Chrome” uses this listing (not the archived 1.0.0 item).

## Updates

1. Bump `version` in `extension/manifest.json` (e.g. 1.0.4)  
2. Run `node scripts/package-extension.mjs`  
3. Upload new zip in the same listing → Submit for review

### v1.0.7 — release notes (paste in “What’s new”)

```
• Dropdown fields show real select menus in the side panel (country, state, etc.)
• Fill application saves your answers to the dashboard for tracking
• Track application status: applied, interview, invited, hired, rejected, and more
• AI learns from your past submitted answers to match your writing style
• Default persona syncs with your onboarding resume automatically
• Improved extension auto-connect when you visit the dashboard
• Applications count toward your plan when fill completes
• Cleaner solid Fill application button
```

**Package ready:** `swiftdroom-extension.zip` (version 1.0.7)

### Upload steps

1. Open https://chrome.google.com/webstore/devconsole
2. Select **Swiftdroom — Job Application Co-Pilot**
3. **Package** → Upload `swiftdroom-extension.zip`
4. Paste release notes above under **What's new**
5. **Submit for review**
