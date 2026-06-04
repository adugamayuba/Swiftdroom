/**
 * Chrome Web Store listing URL (v1.0.3 listing).
 * Override with NEXT_PUBLIC_CHROME_WEB_STORE_URL in Vercel if needed.
 */
export const CHROME_WEB_STORE_EXTENSION_ID = "ficlpmiflbjkgegelneegohcbimjhnnb";

export const CHROME_WEB_STORE_URL =
  process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL ||
  `https://chromewebstore.google.com/detail/${CHROME_WEB_STORE_EXTENSION_ID}`;
