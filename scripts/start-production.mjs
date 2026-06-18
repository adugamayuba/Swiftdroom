#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getDatabaseUrl, maskUrl } from "./database-url.mjs";
import { runMigrateDeploy } from "./migrate.mjs";

const dashboardDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dashboard");

// Fallback: apply migrations before accepting traffic (preDeployCommand also runs on deploy).
const migrated = await runMigrateDeploy({ maxAttempts: 3 });
if (!migrated) {
  console.error("\nMigrations failed — refusing to start until database is up to date.");
  console.error("Ensure DIRECT_URL is set on Railway (Neon direct URL, no -pooler).\n");
  process.exit(1);
}

const dbUrl = getDatabaseUrl();
if (!dbUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

console.log(`Testing database connection: ${maskUrl(dbUrl)}`);

const testEnv = { ...process.env, DATABASE_URL: dbUrl };

const test = spawnSync(
  "node",
  [
    "-e",
    `
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    prisma.$queryRaw\`SELECT 1\`
      .then(() => { console.log("Database connection OK"); process.exit(0); })
      .catch((e) => { console.error("Database connection FAILED:", e.message); process.exit(1); });
  `,
  ],
  { cwd: dashboardDir, stdio: "inherit", env: testEnv }
);

if (test.status !== 0) {
  console.error("\nFix DATABASE_URL in Railway:");
  console.error("  - Pooled URL (DATABASE_URL) must include -pooler in hostname");
  console.error("  - Add ?sslmode=require&pgbouncer=true (auto-added if missing)");
  console.error("  - DIRECT_URL = direct Neon URL (no -pooler) for migrations");
  console.error("  - No quotes around the URL value\n");
  process.exit(1);
}

console.log("Starting Next.js...");
const start = spawnSync("npx", ["next", "start"], {
  cwd: dashboardDir,
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: dbUrl },
});

process.exit(start.status ?? 1);
