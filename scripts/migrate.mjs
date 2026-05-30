#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";
import { getMigrateUrl, maskUrl } from "./database-url.mjs";

const dashboardDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dashboard");

function run(args, env) {
  console.log(`> npx ${args.join(" ")}`);
  return spawnSync("npx", args, { cwd: dashboardDir, stdio: "inherit", env });
}

function migrateStatus(env) {
  const result = spawnSync("npx", ["prisma", "migrate", "status"], {
    cwd: dashboardDir,
    encoding: "utf-8",
    env,
  });
  return `${result.stdout || ""}${result.stderr || ""}`;
}

function isUpToDate(output) {
  return (
    output.includes("Database schema is up to date") ||
    output.includes("No pending migrations")
  );
}

const migrateUrl = getMigrateUrl();
if (!migrateUrl) {
  console.error("DATABASE_URL or DIRECT_URL is required for migrations");
  process.exit(1);
}

const migrateEnv = {
  ...process.env,
  DATABASE_URL: migrateUrl,
  PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT:
    process.env.PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT || "120000",
};

console.log(`Running migrations against: ${maskUrl(migrateUrl)}`);

const maxAttempts = 5;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  console.log(`\nMigration attempt ${attempt}/${maxAttempts}...`);

  const result = run(["prisma", "migrate", "deploy"], migrateEnv);
  if (result.status === 0) {
    console.log("\nMigrations applied successfully.");
    process.exit(0);
  }

  if (isUpToDate(migrateStatus(migrateEnv))) {
    console.log("\nMigrations already applied. Skipping.");
    process.exit(0);
  }

  if (attempt < maxAttempts) {
    const delayMs = attempt * 8000;
    console.log(`\nRetrying in ${delayMs / 1000}s...`);
    await setTimeout(delayMs);
  }
}

console.error("\nPrisma migrate deploy failed after all retries.");
process.exit(1);
