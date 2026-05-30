#!/usr/bin/env node
/**
 * Shared Neon URL normalization for migrate + startup checks.
 */
export function getDatabaseUrl() {
  let url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  url = url.replace(/^["']|["']$/g, "").trim();
  if (url.includes("-pooler")) {
    url = ensureParam(url, "sslmode", "require");
    url = ensureParam(url, "pgbouncer", "true");
  } else if (!url.includes("sslmode=")) {
    url = ensureParam(url, "sslmode", "require");
  }
  return url;
}

export function getMigrateUrl() {
  let url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!url) return null;
  url = url.replace(/^["']|["']$/g, "").trim();

  if (url.includes("-pooler")) {
    console.error("\nERROR: Use DIRECT_URL (non-pooler) for migrations.\n");
    process.exit(1);
  }

  if (!url.includes("sslmode=")) {
    url = ensureParam(url, "sslmode", "require");
  }
  return url;
}

function ensureParam(url, key, value) {
  if (url.includes(`${key}=`)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${key}=${value}`;
}

export function maskUrl(url) {
  return url.replace(/:([^:@/]+)@/, ":***@");
}
