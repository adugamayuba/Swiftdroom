#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dashboardDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dashboard");

function run(command, args) {
  console.log(`> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: dashboardDir,
    stdio: "inherit",
    env: process.env,
  });
  return result.status ?? 1;
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

// Use direct Neon URL for migrations when available (pooled URLs can fail migrate)
const migrateEnv = { ...process.env };
if (process.env.DIRECT_URL) {
  migrateEnv.DATABASE_URL = process.env.DIRECT_URL;
}

const migrateStatus = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  cwd: dashboardDir,
  stdio: "inherit",
  env: migrateEnv,
}).status ?? 1;
if (migrateStatus !== 0) {
  console.error("Prisma migrate deploy failed");
  process.exit(migrateStatus);
}

const startStatus = run("npx", ["next", "start"]);
process.exit(startStatus);
