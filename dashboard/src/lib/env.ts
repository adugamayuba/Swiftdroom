/**
 * Server-safe env reads. Prefer APP_URL / API_URL / CHROME_WEB_STORE_URL
 * (set in Railway or Vercel dashboards). NEXT_PUBLIC_* still supported.
 */

function trimUrl(value?: string | null): string {
  return value?.trim().replace(/\/$/, "") || "";
}

export function getAppUrlEnv(): string {
  return trimUrl(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL);
}

export function getApiUrlEnv(): string {
  return trimUrl(process.env.API_URL || process.env.NEXT_PUBLIC_API_URL);
}

const CHROME_WEB_STORE_URL_DEFAULT =
  "https://chromewebstore.google.com/detail/swiftdroom-%E2%80%94-job-applicat/ficlpmiflbjkgegelneegohcbimjhnnb";

/** Normalize store URL — handles accidental "KEY=value" pastes in env dashboards. */
export function normalizeChromeWebStoreUrl(raw?: string | null): string {
  let value = raw?.trim() || "";
  if (!value) return CHROME_WEB_STORE_URL_DEFAULT;

  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    const match = value.match(/https?:\/\/[^\s"'<>]+/);
    value = match?.[0] || "";
  }

  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return CHROME_WEB_STORE_URL_DEFAULT;
  }

  return trimUrl(value);
}

export function getChromeWebStoreUrlEnv(): string {
  const fromEnv =
    process.env.CHROME_WEB_STORE_URL ||
    process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL;
  return normalizeChromeWebStoreUrl(fromEnv);
}
