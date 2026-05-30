const required = [
  {
    key: "DATABASE_URL",
    hint: "Railway → your service → Variables → add DATABASE_URL with your Neon connection string",
  },
  {
    key: "JWT_SECRET",
    hint: "Any long random string (32+ characters)",
  },
  {
    key: "NEXT_PUBLIC_APP_URL",
    hint: "Your public Railway URL, e.g. https://swiftdroom-production.up.railway.app",
  },
];

const missing = required.filter(({ key }) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error("\nMissing required environment variables:\n");
  for (const { key, hint } of missing) {
    console.error(`  ${key}`);
    console.error(`    ${hint}\n`);
  }
  console.error(
    "Neon example:\n" +
      '  DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require\n'
  );
  process.exit(1);
}

console.log("Environment variables OK");
