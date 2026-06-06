/** Normalize webhook secret pasted from Railway/Stripe (quotes, newlines). */
export function getStripeWebhookSecret(): string | null {
  const raw = process.env.STRIPE_WEBHOOK_SECRET;
  if (!raw?.trim()) return null;

  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "")
    .replace(/\n/g, "");
}

/** Support secret rotation — comma-separated list in STRIPE_WEBHOOK_SECRET. */
export function getStripeWebhookSecrets(): string[] {
  const secret = getStripeWebhookSecret();
  if (!secret) return [];
  return secret.split(",").map((s) => s.trim()).filter(Boolean);
}
