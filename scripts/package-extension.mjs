#!/usr/bin/env node
/**
 * Package the Chrome extension for Chrome Web Store upload.
 * Output: swiftdroom-extension.zip at repo root
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const extDir = join(root, "extension");
const outZip = join(root, "swiftdroom-extension.zip");

if (!existsSync(join(extDir, "manifest.json"))) {
  console.error("extension/manifest.json not found");
  process.exit(1);
}

for (const f of ["icons/icon16.png", "icons/icon48.png", "icons/icon128.png"]) {
  if (!existsSync(join(extDir, f))) {
    console.error(`Missing ${f}`);
    process.exit(1);
  }
}

execSync(`cd "${extDir}" && zip -r "${outZip}" . -x "*.DS_Store"`, { stdio: "inherit" });
console.log(`\nCreated ${outZip}`);
console.log("Upload at: https://chrome.google.com/webstore/devconsole");
console.log("Privacy policy URL: https://swiftdroom.com/privacy");
