import { PRODUCTION_SITE_URL } from "@/lib/site";

/**
 * Resolve the public app URL from env vars.
 * Railway auto-injects RAILWAY_PUBLIC_DOMAIN; Vercel auto-injects VERCEL_URL.
 */
function normalizeUrl(raw: string) {
  const trimmed = raw.trim().replace(/\/$/, "");
  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
}

function isUsableUrl(value?: string | null): value is string {
  if (!value?.trim()) return false;

  const trimmed = value.trim();
  // Reject common placeholder values copied from docs without a real URL
  if (
    trimmed === "NEXT_PUBLIC_APP_URL" ||
    trimmed === "NEXT_PUBLIC_API_URL" ||
    trimmed.includes("${") ||
    trimmed.includes("{{")
  ) {
    return false;
  }

  try {
    const url = new URL(normalizeUrl(trimmed));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getAppUrl() {
  if (isUsableUrl(process.env.NEXT_PUBLIC_APP_URL)) {
    return normalizeUrl(process.env.NEXT_PUBLIC_APP_URL!);
  }

  if (isUsableUrl(process.env.VERCEL_URL)) {
    return normalizeUrl(process.env.VERCEL_URL!);
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN?.trim()) {
    return normalizeUrl(process.env.RAILWAY_PUBLIC_DOMAIN);
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }

  return "http://localhost:3000";
}
