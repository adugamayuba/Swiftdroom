#!/usr/bin/env node
/**
 * Run prisma migrate deploy using DIRECT_URL (or DATABASE_URL) from .env
 * Usage: npm run db:migrate:deploy
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const envPath = join(root, "..", ".env");

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

const migrateUrl =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!migrateUrl) {
  console.error("\nMissing DIRECT_URL or DATABASE_URL in dashboard/.env\n");
  console.error("Add your Neon direct connection string, e.g.:");
  console.error(
    '  DIRECT_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"\n'
  );
  process.exit(1);
}

if (
  !migrateUrl.startsWith("postgresql://") &&
  !migrateUrl.startsWith("postgres://")
) {
  console.error("\nInvalid database URL in .env");
  console.error(`Got: ${migrateUrl.slice(0, 20)}...`);
  console.error("Must start with postgresql:// or postgres://");
  console.error("\nYour .env still has the old SQLite URL (file:./dev.db).");
  console.error("Replace it with your Neon connection strings from neon.tech\n");
  process.exit(1);
}

if (migrateUrl.includes("-pooler")) {
  console.error("\nUse the DIRECT connection (no -pooler) for migrations.");
  console.error("Set DIRECT_URL in dashboard/.env\n");
  process.exit(1);
}

console.log("Running prisma migrate deploy...\n");

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  cwd: join(root, ".."),
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: migrateUrl },
});

process.exit(result.status ?? 1);
