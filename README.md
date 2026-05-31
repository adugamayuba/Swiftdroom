# Swiftdroom — Production Deployment

AI-powered job application co-pilot with Stripe billing, Neon PostgreSQL, Firebase Storage, and admin analytics.

## Architecture

| Service | Purpose |
|---------|---------|
| **Vercel** | Frontend (landing, dashboard UI) |
| **Railway** | API routes + server logic |
| **Neon** | PostgreSQL database |
| **Stripe** | Subscriptions ($9.99 / $19.99 / $39.99) |
| **Firebase** | Resume file storage |
| **OpenAI** | AI answer generation |
| **Chrome Extension** | Sidebar co-pilot on job boards |

## User flow

1. **Landing page** → Register
2. **Onboarding** → Upload resume + fill profile (free)
3. **Subscribe** → Choose a plan via Stripe Checkout
4. **Dashboard** → Install extension, copy API token
5. **Extension** → Scan forms, autofill, AI ghostwriter

Extension access requires an **active subscription**.

## Pricing tiers

| Plan | Price | Applications/mo |
|------|-------|-----------------|
| Starter | $9.99 | 50 |
| Pro | $19.99 | 150 |
| Business | $39.99 | 500 |

## Local development

```bash
cd dashboard
cp .env.example .env
# Set DATABASE_URL to your Neon connection string (or local Postgres)
npm install
npx prisma migrate deploy
npm run dev
```

Load the extension from `extension/` via `chrome://extensions`.

## Railway + Neon setup

The container crash `Environment variable not found: DATABASE_URL` means Railway does not have your database URL configured yet.

### 1. Create Neon database

1. Go to [neon.tech](https://neon.tech) and create a project
2. Copy the **connection string** (Pooled or Direct both work)
3. It looks like: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

### 2. Add variables in Railway

Open your Railway service → **Variables** tab → add these (Raw Editor is fastest):

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your-long-random-secret-here
NEXT_PUBLIC_APP_URL=https://YOUR-SERVICE.up.railway.app
ADMIN_EMAIL=you@company.com
NODE_ENV=production
```

The variable name must be exactly `DATABASE_URL` (not `POSTGRES_URL` or `NEON_DATABASE_URL`).

Add Stripe, Firebase, and OpenAI keys from `dashboard/.env.example` when ready.

### 3. Redeploy

After saving variables, Railway redeploys automatically. Migrations run on startup via `prisma migrate deploy`.

## Environment variables (Railway / Vercel only)

You do **not** need a local `.env` file for production. Set all variables in your hosting dashboard:

| Platform | Where |
|----------|--------|
| **Railway** | Service → **Variables** → Raw Editor |
| **Vercel** | Project → **Settings** → **Environment Variables** |

### Required variables

```env
DATABASE_URL=postgresql://...@ep-xxx-pooler....neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://...@ep-xxx....neon.tech/neondb?sslmode=require
JWT_SECRET=long-random-string
ADMIN_EMAIL=you@company.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

- `DATABASE_URL` = Neon **Pooled** (`-pooler` in hostname) — app runtime  
- `DIRECT_URL` = Neon **Direct** (no `-pooler`) — migrations  

Migrations run **automatically** on **Railway** via `preDeployCommand`. Vercel frontend builds skip migrations.

Local `.env` is **optional** — only if you run the app on your machine.

## Split deployment (recommended)

| Platform | Role | Root directory |
|----------|------|----------------|
| **Vercel** | Frontend (pages only) | `dashboard` |
| **Railway** | API + database | repo root |

### Vercel (frontend)

1. Import repo → Root Directory: `dashboard`
2. Environment variables:
   ```env
   NEXT_PUBLIC_API_URL=https://YOUR-SERVICE.up.railway.app
   NEXT_PUBLIC_APP_URL=https://YOUR-APP.vercel.app
   ```
3. No `DATABASE_URL` needed — Vercel build runs `next build` only (no migrations)

### Railway (API)

1. Connect repo → deploy from **repo root** (uses `railway.toml`)
2. Environment variables (full set from `dashboard/.env.example`):
   ```env
   DATABASE_URL=postgresql://...@ep-xxx-pooler....neon.tech/neondb?sslmode=require
   DIRECT_URL=postgresql://...@ep-xxx....neon.tech/neondb?sslmode=require
   JWT_SECRET=...
   ADMIN_EMAIL=...
   NEXT_PUBLIC_APP_URL=https://YOUR-APP.vercel.app
   ```
3. Stripe webhook: `https://YOUR-SERVICE.up.railway.app/api/webhooks/stripe`
4. Migrations run via `preDeployCommand` on each deploy

Auth uses **Bearer tokens** stored in the browser — the Vercel frontend calls the Railway API cross-origin with CORS.

## Single-host deployment

You can still deploy everything on **Railway only** or **Vercel only** — leave `NEXT_PUBLIC_API_URL` empty for same-origin `/api` calls.

## Vercel (full app — legacy)

1. Import the GitHub repo in Vercel
2. Set **Root Directory** to `dashboard`
3. Add all environment variables (including `DATABASE_URL`, `DIRECT_URL`)
4. Use `npm run db:migrate:deploy` separately or restore migrate in `vercel-build`

Set `NEXT_PUBLIC_APP_URL` to your Vercel URL, e.g. `https://swiftdroom.vercel.app`

## Railway deployment (API or full app)

1. Create a Railway project and connect the **Swiftdroom** GitHub repo
2. Leave **Root Directory** empty (deploy from repo root — `package.json` at root handles the monorepo)
3. Add env vars from `dashboard/.env.example` (Neon `DATABASE_URL`, Stripe, Firebase, etc.)
4. Railway uses `/railway.toml` automatically: `npm run build` → `npm start`

### Required environment variables

See `dashboard/.env.example` for the full list. Critical ones:

- `DATABASE_URL` — Neon PostgreSQL connection string
- `JWT_SECRET` — Random 32+ char secret
- `ADMIN_EMAIL` — First admin account email
- `NEXT_PUBLIC_APP_URL` — Your Railway URL
- `STRIPE_*` — Secret key, webhook secret, and 3 price IDs
- `FIREBASE_*` — Service account for resume storage
- `OPENAI_API_KEY` — For AI generation

## Stripe setup

1. Create 3 recurring products in Stripe Dashboard (Starter, Pro, Business)
2. Copy price IDs to `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`
3. Add webhook endpoint: `https://your-api.up.railway.app/api/webhooks/stripe`
4. Listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`
5. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Firebase setup

1. Create a Firebase project with Storage enabled
2. Generate a service account key (JSON)
3. Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`
4. Storage rules: restrict `resumes/{userId}/*` to authenticated admin SDK only

## Admin dashboard

Register with the email matching `ADMIN_EMAIL` to get admin access.

Admin panel at `/admin`:
- User growth rate and monthly signups
- MRR / ARR revenue metrics
- Subscriber breakdown by plan
- User list with subscription status and usage

## Extension (production)

1. Set **API URL** in extension setup to your **Railway** domain
2. Users paste API token from Dashboard → Settings (on Vercel)
3. Manifest includes `https://*.up.railway.app/*` and `https://*.vercel.app/*`

## Project structure

```
Swiftdroom/
├── dashboard/     Next.js app (Vercel frontend + Railway API)
├── extension/     Chrome MV3 extension
└── README.md
```
