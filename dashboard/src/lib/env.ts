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

export function getChromeWebStoreUrlEnv(): string {
  const fromEnv =
    process.env.CHROME_WEB_STORE_URL ||
    process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL;
  if (fromEnv?.trim()) return trimUrl(fromEnv);
  return "https://chromewebstore.google.com/detail/ficlpmiflbjkgegelneegohcbimjhnnb";
}
