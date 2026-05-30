// Runs before the app starts on Railway/production

// Railway auto-injects RAILWAY_PUBLIC_DOMAIN when you generate a public domain
if (!process.env.NEXT_PUBLIC_APP_URL?.trim() && process.env.RAILWAY_PUBLIC_DOMAIN?.trim()) {
  process.env.NEXT_PUBLIC_APP_URL = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  console.log(`Using Railway domain: ${process.env.NEXT_PUBLIC_APP_URL}`);
}

const required = [
  {
    key: "DATABASE_URL",
    hint: [
      "Railway → Swiftdroom service → Variables → Raw Editor",
      "Paste your Neon connection string as DATABASE_URL",
      "Or: Railway → + New → Database → Add Neon, then reference ${{Neon.DATABASE_URL}}",
    ],
  },
  {
    key: "JWT_SECRET",
    hint: [
      "Generate any random 32+ character string",
      "Example: openssl rand -base64 32",
    ],
  },
];

const recommended = [
  {
    key: "NEXT_PUBLIC_APP_URL",
    hint: "Set to your Railway URL, or generate a domain in Railway → Settings → Networking (auto-detected via RAILWAY_PUBLIC_DOMAIN)",
  },
  {
    key: "DIRECT_URL",
    hint: "Neon direct connection string (for migrations). Optional if DATABASE_URL is already the direct URL.",
  },
];

const missing = required.filter(({ key }) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error("\n=== Swiftdroom: missing required environment variables ===\n");
  for (const { key, hint } of missing) {
    console.error(`  ${key}`);
    for (const line of hint) {
      console.error(`    ${line}`);
    }
    console.error("");
  }
  console.error("Quick setup in Railway Variables (Raw Editor):\n");
  console.error(`  DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`);
  console.error(`  JWT_SECRET=paste-a-long-random-string-here`);
  console.error(`  ADMIN_EMAIL=you@company.com\n`);
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_APP_URL?.trim()) {
  console.warn("\nWarning: NEXT_PUBLIC_APP_URL not set.");
  console.warn("Generate a public domain in Railway → Settings → Networking\n");
  for (const { key, hint } of recommended) {
    console.warn(`  ${key}: ${hint[0]}`);
  }
  console.warn("");
}

console.log("Required environment variables OK");
