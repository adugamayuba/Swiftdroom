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

Capture at 1280×800 or 640×400:

1. Side panel open on a job application form  
2. Autofill / scan in progress  
3. Dashboard at swiftdroom.com/settings showing extension connected  

## After approval

1. Copy the full Chrome Web Store URL from your listing  
2. Set in Vercel:

```env
NEXT_PUBLIC_CHROME_WEB_STORE_URL=https://chromewebstore.google.com/detail/swiftdroom/YOUR_EXTENSION_ID
```

3. Redeploy frontend

## Updates

1. Bump `version` in `extension/manifest.json` (e.g. 1.0.1)  
2. Run `node scripts/package-extension.mjs`  
3. Upload new zip in the same listing → Submit for review
