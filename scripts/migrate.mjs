#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";

const dashboardDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dashboard");

function getMigrateUrl() {
  const direct = process.env.DIRECT_URL?.trim();
  const db = process.env.DATABASE_URL?.trim();

  if (direct) return direct;

  if (db?.includes("-pooler")) {
    console.error("\nERROR: DATABASE_URL uses Neon pooler (-pooler in hostname).");
    console.error("Prisma migrations cannot run through the pooler.");
    console.error("Add DIRECT_URL in Railway with Neon’s direct (non-pooler) connection string.\n");
    process.exit(1);
  }

  return db;
}

function run(command, args, env) {
  console.log(`> ${command} ${args.join(" ")}`);
  return spawnSync(command, args, {
    cwd: dashboardDir,
    stdio: "inherit",
    env,
  });
}

function migrateStatus(env) {
  const result = spawnSync("npx", ["prisma", "migrate", "status"], {
    cwd: dashboardDir,
    encoding: "utf-8",
    env,
  });
  return `${result.stdout || ""}${result.stderr || ""}`;
}

function isUpToDate(statusOutput) {
  return (
    statusOutput.includes("Database schema is up to date") ||
    statusOutput.includes("No pending migrations")
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

console.log(
  `Running migrations against: ${migrateUrl.replace(/:[^:@]+@/, ":***@")}`
);

const maxAttempts = 5;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  console.log(`\nMigration attempt ${attempt}/${maxAttempts}...`);

  const result = run("npx", ["prisma", "migrate", "deploy"], migrateEnv);
  if (result.status === 0) {
    console.log("\nMigrations applied successfully.");
    process.exit(0);
  }

  const status = migrateStatus(migrateEnv);
  if (isUpToDate(status)) {
    console.log("\nMigrations already applied. Skipping.");
    process.exit(0);
  }

  if (attempt < maxAttempts) {
    const delayMs = attempt * 8000;
    console.log(`\nMigration failed (often advisory lock on Neon). Retrying in ${delayMs / 1000}s...`);
    await setTimeout(delayMs);
  }
}

console.error("\nPrisma migrate deploy failed after all retries.");
console.error("Ensure DIRECT_URL is set to Neon’s direct connection (not pooler).");
process.exit(1);
