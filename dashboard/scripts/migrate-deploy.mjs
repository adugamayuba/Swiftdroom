#!/usr/bin/env node
/**
 * Run prisma migrate deploy using env vars from Railway, Vercel, or shell.
 * No local .env file required.
 *
 * Railway/Vercel: set DIRECT_URL and DATABASE_URL in the dashboard Variables UI.
 * One-off local run:
 *   DIRECT_URL="postgresql://..." npm run db:migrate:deploy
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const envPath = join(root, "..", ".env");

// Optional: load .env only for local dev if it exists (never required)
function loadEnvFile() {
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

let migrateUrl = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (migrateUrl) migrateUrl = migrateUrl.replace(/^["']|["']$/g, "");

if (!migrateUrl) {
  console.error("\nMissing DIRECT_URL or DATABASE_URL.\n");
  console.error("Set these in your hosting dashboard (not a local .env file):");
  console.error("  Railway → Swiftdroom service → Variables");
  console.error("  Vercel  → Project → Settings → Environment Variables\n");
  console.error("Required:");
  console.error("  DIRECT_URL  = Neon direct connection (no -pooler)");
  console.error("  DATABASE_URL = Neon pooled connection (-pooler in hostname)\n");
  process.exit(1);
}

if (
  !migrateUrl.startsWith("postgresql://") &&
  !migrateUrl.startsWith("postgres://")
) {
  console.error("\nInvalid database URL.");
  console.error(`Got: ${migrateUrl.slice(0, 30)}...`);
  console.error("Must start with postgresql:// or postgres://");
  console.error("Check DIRECT_URL in Railway or Vercel Variables.\n");
  process.exit(1);
}

if (migrateUrl.includes("-pooler")) {
  console.error("\nMigrations need the DIRECT Neon URL (no -pooler in hostname).");
  console.error("Set DIRECT_URL in Railway/Vercel to the direct connection string.\n");
  process.exit(1);
}

console.log("Running prisma migrate deploy...\n");

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  cwd: join(root, ".."),
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: migrateUrl },
});

process.exit(result.status ?? 1);
