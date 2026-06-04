import type { NextConfig } from "next";

import { getAppUrlEnv, getApiUrlEnv, getChromeWebStoreUrlEnv } from "./src/lib/env";

/**
 * Map server-side env (APP_URL, API_URL, CHROME_WEB_STORE_URL) to NEXT_PUBLIC_*
 * at build time so the browser bundle never needs secrets from the dashboard.
 */
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_URL: getAppUrlEnv(),
    NEXT_PUBLIC_API_URL: getApiUrlEnv(),
    NEXT_PUBLIC_CHROME_WEB_STORE_URL: getChromeWebStoreUrlEnv(),
  },
};

export default nextConfig;
