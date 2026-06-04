// Runs before the app starts on Railway/production

if (!process.env.APP_URL?.trim() && process.env.RAILWAY_PUBLIC_DOMAIN?.trim()) {
  process.env.APP_URL = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  console.log(`Using Railway domain for APP_URL: ${process.env.APP_URL}`);
}

const required = [
  {
    key: "DATABASE_URL",
    hint: [
      "Neon POOLED connection (-pooler in hostname)",
      "Railway → Swiftdroom service → Variables",
    ],
  },
  {
    key: "DIRECT_URL",
    hint: [
      "Neon DIRECT connection (no -pooler in hostname)",
      "Required for migrations on deploy",
    ],
  },
  {
    key: "JWT_SECRET",
    hint: ["Any random 32+ character string"],
  },
];

const recommended = [
  {
    key: "APP_URL",
    hint: "https://swiftdroom.com — CORS and Stripe redirects (or auto from Railway domain)",
  },
  {
    key: "ADMIN_EMAIL",
    hint: "Your email — gets admin access on signup",
  },
];

const missing = required.filter(({ key }) => !process.env[key]?.trim());

if (
  process.env.DATABASE_URL?.includes("-pooler") &&
  !process.env.DIRECT_URL?.trim()
) {
  console.error("\nWARNING: DATABASE_URL uses Neon pooler but DIRECT_URL is not set.");
  console.error("Migrations will fail. Add DIRECT_URL from Neon (direct connection).\n");
}

if (missing.length > 0) {
  console.error("\n=== Swiftdroom: missing required environment variables ===\n");
  for (const { key, hint } of missing) {
    console.error(`  ${key}`);
    for (const line of hint) {
      console.error(`    ${line}`);
    }
    console.error("");
  }
  console.error("See docs/ENVIRONMENT.md and env/railway.env.example\n");
  process.exit(1);
}

if (!process.env.APP_URL?.trim() && !process.env.NEXT_PUBLIC_APP_URL?.trim()) {
  console.warn("\nWarning: APP_URL not set.");
  console.warn("Set APP_URL=https://swiftdroom.com in Railway Variables\n");
  for (const { key, hint } of recommended) {
    console.warn(`  ${key}: ${hint}`);
  }
  console.warn("");
}

console.log("Required environment variables OK");
