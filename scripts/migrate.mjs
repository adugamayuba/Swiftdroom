#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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

/**
 * Apply pending Prisma migrations (used by Railway pre-deploy and app startup).
 * @param {{ maxAttempts?: number }} options
 */
export async function runMigrateDeploy({ maxAttempts = 5 } = {}) {
  const migrateUrl = getMigrateUrl();
  if (!migrateUrl) {
    console.error("DATABASE_URL or DIRECT_URL is required for migrations");
    return false;
  }

  const migrateEnv = {
    ...process.env,
    DATABASE_URL: migrateUrl,
    PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT:
      process.env.PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT || "120000",
  };

  console.log(`Running migrations against: ${maskUrl(migrateUrl)}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (maxAttempts > 1) {
      console.log(`\nMigration attempt ${attempt}/${maxAttempts}...`);
    }

    const result = run(["prisma", "migrate", "deploy"], migrateEnv);
    if (result.status === 0) {
      console.log("\nMigrations applied successfully.");
      return true;
    }

    if (isUpToDate(migrateStatus(migrateEnv))) {
      console.log("\nMigrations already applied. Skipping.");
      return true;
    }

    if (attempt < maxAttempts) {
      const delayMs = attempt * 8000;
      console.log(`\nRetrying in ${delayMs / 1000}s...`);
      await setTimeout(delayMs);
    }
  }

  console.error("\nPrisma migrate deploy failed after all retries.");
  return false;
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const maxAttempts = Number(process.env.MIGRATE_MAX_ATTEMPTS || "5");
  const ok = await runMigrateDeploy({ maxAttempts });
  process.exit(ok ? 0 : 1);
}
