import { getChromeWebStoreUrlEnv, normalizeChromeWebStoreUrl } from "@/lib/env";

export const CHROME_WEB_STORE_EXTENSION_ID = "ficlpmiflbjkgegelneegohcbimjhnnb";

export const CHROME_WEB_STORE_URL_DEFAULT =
  "https://chromewebstore.google.com/detail/swiftdroom-%E2%80%94-job-applicat/ficlpmiflbjkgegelneegohcbimjhnnb";

/** Resolved at build time; falls back to the live CWS listing if env is missing or malformed. */
export const CHROME_WEB_STORE_URL = getChromeWebStoreUrlEnv();

/** Client-safe resolver (uses NEXT_PUBLIC_* when inlined in the browser). */
export function getChromeWebStoreUrl(): string {
  if (typeof window === "undefined") return CHROME_WEB_STORE_URL;
  return normalizeChromeWebStoreUrl(
    process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL
  );
}
