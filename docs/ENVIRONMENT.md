# Environment variables — Vercel & Railway

**Never commit real secrets.** Set everything in the hosting dashboards (or local `.env` for dev only).

## Architecture

| Platform | Role | What to set |
|----------|------|-------------|
| **Railway** | API + database + Stripe webhooks + AI + file storage | All **secrets** and server config |
| **Vercel** | Marketing site + dashboard UI (browser) | **Non-secret** URLs only (injected to the client at build time) |

The browser calls the Railway API cross-origin. Vercel does **not** need `DATABASE_URL`, `JWT_SECRET`, Stripe keys, etc.

---

## Railway (required)

Copy from [`env/railway.env.example`](../env/railway.env.example).

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon **pooled** connection string |
| `DIRECT_URL` | Yes | Neon **direct** URL (migrations) |
| `JWT_SECRET` | Yes | Long random string (32+ chars) |
| `ADMIN_EMAIL` | Yes | Email that receives admin role on register |
| `APP_URL` | Yes | Public site origin: `https://swiftdroom.com` (CORS + Stripe redirects) |
| `ALLOWED_ORIGINS` | Recommended | `https://swiftdroom.com,https://www.swiftdroom.com` |
| `NODE_ENV` | Yes | `production` |
| `OPENAI_API_KEY` | Yes* | AI Ghostwriter (*optional in dev) |
| `STRIPE_SECRET_KEY` | Yes* | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes* | Stripe webhook signing secret |
| `STRIPE_PRICE_STARTER` | Yes* | Stripe price ID |
| `STRIPE_PRICE_PRO` | Yes* | Stripe price ID |
| `STRIPE_PRICE_BUSINESS` | Yes* | Stripe price ID |
| `FIREBASE_PROJECT_ID` | Optional | Resume file storage |
| `FIREBASE_CLIENT_EMAIL` | Optional | Service account |
| `FIREBASE_PRIVATE_KEY` | Optional | Service account key (`\n` for newlines) |
| `FIREBASE_STORAGE_BUCKET` | Optional | e.g. `project.appspot.com` |

\* Stripe/Firebase optional locally; required for full production billing/storage.

**Do not put on Railway:** `NEXT_PUBLIC_*` (use `APP_URL` instead).  
**Webhook URL in Stripe:** `https://YOUR-SERVICE.up.railway.app/api/webhooks/stripe`

---

## Vercel (required for split deploy)

Copy from [`env/vercel.env.example`](../env/vercel.env.example).

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_URL` | Yes | `https://swiftdroom.com` — canonical site URL (SEO, links) |
| `API_URL` | Yes | Railway public URL, e.g. `https://swiftdroom-production.up.railway.app` |
| `CHROME_WEB_STORE_URL` | Yes | `https://chromewebstore.google.com/detail/ficlpmiflbjkgegelneegohcbimjhnnb` |

`next.config.ts` maps these to `NEXT_PUBLIC_*` at **build time** so the browser can use them without exposing secrets.

**Do not put on Vercel:** `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, Firebase keys, etc.

---

## Local development

Use a single `dashboard/.env` (see `dashboard/.env.example`):

- `APP_URL=http://localhost:3000`
- `API_URL=` (empty = same-origin; API routes run on localhost)
- Run `npm run dev` in `dashboard/`

---

## Legacy names (still supported)

If you already set these, they keep working:

| Legacy | Prefer |
|--------|--------|
| `NEXT_PUBLIC_APP_URL` | `APP_URL` |
| `NEXT_PUBLIC_API_URL` | `API_URL` |
| `NEXT_PUBLIC_CHROME_WEB_STORE_URL` | `CHROME_WEB_STORE_URL` |

---

## Checklist after deploy

- [ ] Railway `/api/health` returns OK  
- [ ] Vercel site loads; login hits Railway (Network tab → Railway domain)  
- [ ] Extension auto-connect: meta `swiftdroom-api-url` = Railway `API_URL` (check page source on swiftdroom.com)  
- [ ] Stripe webhook points at Railway  
- [ ] Chrome Web Store link on dashboard uses `ficlpmiflbjkgegelneegohcbimjhnnb`
