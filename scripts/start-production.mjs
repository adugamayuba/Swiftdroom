#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dashboardDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dashboard");

console.log("Starting Next.js...");
const result = spawnSync("npx", ["next", "start"], {
  cwd: dashboardDir,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
