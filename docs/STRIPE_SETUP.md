# Stripe activation guide — Swiftdroom

Follow these steps to turn billing back on in production.

## 1. Stripe Dashboard — products & prices

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products).
2. Create three **recurring monthly** products. Use these **Name** and **Description** values (shown at checkout, customer portal, and quotes):

### Starter — $9.99/mo

| Field | Value |
|-------|-------|
| **Name** | `Swiftdroom Starter` |
| **Description** | `50 job applications per month with the Swiftdroom Chrome extension, AI answer generation, application tracking, and one persona profile. For active job seekers applying weekly.` |
| **Price** | $9.99 / month, recurring |

### Pro — $19.99/mo

| Field | Value |
|-------|-------|
| **Name** | `Swiftdroom Pro` |
| **Description** | `150 job applications per month with everything in Starter, plus unlimited personas, priority AI generation, and saved field mappings. For intensive job search campaigns.` |
| **Price** | $19.99 / month, recurring |

### Business — $39.99/mo

| Field | Value |
|-------|-------|
| **Name** | `Swiftdroom Business` |
| **Description** | `500 job applications per month with everything in Pro, plus bulk profile management, usage analytics, and priority support. For recruiters, coaches, and power users.` |
| **Price** | $39.99 / month, recurring |

3. Copy each **Price ID** (starts with `price_`) into Railway.

**Important:** Use the **Price ID**, not the Product ID.

| Wrong | Right |
|-------|-------|
| `prod_UeQwYUhAezd1dn` (product) | `price_1ABC123xyz` (price) |

In Stripe: open your product → under **Pricing**, click the price → copy the ID from the price row (starts with `price_`).

```env
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
```

### Restricted Stripe API key

A restricted key works fine. Enable **Write** access for:

- Checkout Sessions
- Customers
- Subscriptions
- Invoices (read)
- Prices (read)
- Coupons (read) — for referral discount at checkout
- Billing portal (if using customer portal)

Webhook signing still uses `STRIPE_WEBHOOK_SECRET` from the webhook endpoint, not the API key.

## 2. Referral coupon (20% off first month)

1. Go to [Coupons](https://dashboard.stripe.com/coupons) → **Create coupon**.
2. Settings:
   - **Percent off:** 20%
   - **Duration:** Once (first invoice only)
   - Name: `Referral 20% first month`
3. Copy the **Coupon ID** (starts with `coupon_`).

## 3. Railway environment variables

In Railway → your API service → **Variables**, set:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
STRIPE_COUPON_REFEREE_20=coupon_...

ADMIN_PASSWORD=your-strong-admin-password
CRON_SECRET=random-string-for-monthly-cron
RESEND_API_KEY=re_...          # optional — sends referral redemption emails
EMAIL_FROM=Swiftdroom <noreply@swiftdroom.com>
```

**Important:** Remove or do **not** set `ALLOW_STRIPE_BYPASS` in production. Without Stripe keys, checkout returns an error instead of free activation.

Redeploy Railway after saving variables.

## 4. Deploy code (migrations run automatically)

Railway applies database migrations on **every deploy** — no manual step needed.

Configured in `railway.toml`:

1. **Pre-deploy:** `node scripts/migrate.mjs` (runs before new containers go live)
2. **Startup:** `scripts/start-production.mjs` runs `prisma migrate deploy` once more as a safety net

**Required on Railway:** set both Neon URLs:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Pooled URL (`-pooler` in hostname) — app runtime |
| `DIRECT_URL` | Direct URL (no `-pooler`) — migrations |

Push to `main` → Railway redeploys → check deploy logs for `Migrations applied successfully`.

**Manual fallback** (only if deploy logs show migration errors):

```bash
cd dashboard && railway link && railway run npx prisma migrate deploy
```

## 5. Stripe webhook

Use **one destination only** — **Snapshot** payload style. Do **not** add a second Thin destination.

Swiftdroom’s handler reads full objects from `event.data.object` (subscription periods, invoice lines, checkout metadata). **Thin payloads will not work** without rewriting the webhook code.

### Correct setup

1. [Developers → Webhooks](https://dashboard.stripe.com/webhooks) → **Add destination**.
2. **Payload style:** **Snapshot** (not Thin).
3. **Endpoint URL:** `https://swiftdroom-production.up.railway.app/api/webhooks/stripe`
4. **Events:** select **only** these 7 (not “all events” / 228):
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `checkout.session.async_payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the **Signing secret** from **that one destination** → `STRIPE_WEBHOOK_SECRET` on Railway (no quotes, no extra spaces).

### Webhook signature errors

If Railway logs show `Webhook signature verification failed`:

1. Stripe → **Developers → Webhooks** → open **Swiftdroom API ENDPOINT** (Snapshot)
2. Click **Reveal** under **Signing secret**
3. Replace `STRIPE_WEBHOOK_SECRET` on Railway with that exact value
4. Redeploy — the secret from a **deleted** or **Thin** destination will not work

Payments still succeed in Stripe; the success page also calls `/api/stripe/verify-session` as a backup to activate accounts when webhooks fail.

### If you already created two destinations

You likely have:

| Destination | Style | Problem |
|-------------|-------|---------|
| Swiftdroom API ENDPOINT | Snapshot, 228 events | Too many events; trim to the 7 above |
| playful-excellence-thin | Thin, 24 events | **Delete this** — incompatible with our code |

**Delete the Thin destination.** Keep only the Snapshot one, narrow it to the 7 events, then copy **its** signing secret into Railway `STRIPE_WEBHOOK_SECRET` and redeploy.

Two destinations to the same URL can cause duplicate deliveries and signature mismatches if the wrong secret is used.

## 6. How billing works

| Event | What happens |
|-------|----------------|
| User clicks Subscribe | Redirected to Stripe Checkout. **No access** until payment succeeds. |
| User abandons checkout | Account stays inactive. Cancel banner on `/subscribe`. |
| Payment succeeds | Webhook activates plan, sets period dates and application limit. |
| Month renews | `invoice.paid` resets `applicationsUsed` to 0. |
| Payment fails | `PAST_DUE`, limit set to 0 — extension blocked. |
| Subscription canceled | Access removed immediately. |

Usage counts **one application per completed fill** (logged when the extension records a finished application), not per AI answer.

## 7. Admin & referrals

- **Admin portal:** https://swiftdroom.com/admin/s — password from `ADMIN_PASSWORD`.
- **Referral payouts:** Process on the 3rd of each month at `/admin/s/referrals`.
- **Automated emails:** Schedule a monthly cron (Railway cron or external) to POST:

```bash
curl -X POST https://YOUR-RAILWAY-SERVICE.up.railway.app/api/cron/referrals \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

This moves 30-day-old commissions to **eligible** and emails referrers (via Resend if configured).

## 8. Verify end-to-end

1. Register a test user → complete onboarding → subscribe with [Stripe test card](https://docs.stripe.com/testing) `4242 4242 4242 4242`.
2. Confirm `/api/me` shows `hasActiveSubscription: true` and correct usage limits.
3. Install extension → fill one application → usage increments by 1.
4. Cancel subscription in Stripe → confirm extension shows subscription required.
5. Test referral: register with `?ref=CODE` → subscribe → check referrer dashboard earnings.

## 9. Switching from test to live

1. Replace `sk_test_` / `price_` (test) with live keys and price IDs.
2. Create a **new** webhook endpoint for the live mode URL.
3. Update Railway variables and redeploy.
