/**
 * Resolve the public app URL from env vars.
 * Railway auto-injects RAILWAY_PUBLIC_DOMAIN when a domain is generated.
 */
export function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN?.trim()) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}
