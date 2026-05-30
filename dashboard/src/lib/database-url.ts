/**
 * Normalize DATABASE_URL for Neon + Prisma on Railway.
 * @see https://www.prisma.io/docs/orm/overview/databases/neon
 */
export function getDatabaseUrl(): string {
  let url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  // Strip accidental quotes from Railway paste
  url = url.replace(/^["']|["']$/g, "").trim();

  if (url.includes("-pooler")) {
    url = ensureQueryParam(url, "sslmode", "require");
    url = ensureQueryParam(url, "pgbouncer", "true");
  } else if (!url.includes("sslmode=")) {
    url = ensureQueryParam(url, "sslmode", "require");
  }

  return url;
}

export function getDirectDatabaseUrl(): string | undefined {
  let url = process.env.DIRECT_URL?.trim();
  if (!url) return undefined;
  url = url.replace(/^["']|["']$/g, "").trim();
  if (!url.includes("sslmode=")) {
    url = ensureQueryParam(url, "sslmode", "require");
  }
  return url;
}

function ensureQueryParam(url: string, key: string, value: string): string {
  if (url.includes(`${key}=`)) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${value}`;
}

export function maskDatabaseUrl(url: string): string {
  return url.replace(/:([^:@/]+)@/, ":***@");
}
