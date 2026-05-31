/**
 * Normalize DATABASE_URL for Neon + Prisma.
 * @see https://www.prisma.io/docs/orm/overview/databases/neon
 */

const BUILD_PLACEHOLDER =
  "postgresql://build:build@127.0.0.1:5432/build?schema=public";

function isBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-export"
  );
}

export function getDatabaseUrl(): string {
  let url = process.env.DATABASE_URL?.trim();

  if (!url) {
    // Vercel/Railway build runs `next build` without DB access — placeholder only
    if (isBuildPhase()) return BUILD_PLACEHOLDER;
    throw new Error("DATABASE_URL is not set");
  }

  url = url.replace(/^["']|["']$/g, "").trim();

  // channel_binding=require conflicts with PgBouncer — strip it
  url = url.replace(/[&?]channel_binding=[^&]*/g, "");

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
