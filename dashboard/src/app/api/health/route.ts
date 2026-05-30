import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDatabaseUrl, maskDatabaseUrl } from "@/lib/database-url";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    const userCount = await db.user.count();
    return NextResponse.json({
      status: "ok",
      database: "connected",
      userCount,
      url: maskDatabaseUrl(getDatabaseUrl()),
      pooler: getDatabaseUrl().includes("-pooler"),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    let hint = "Check DATABASE_URL in Railway Variables";
    const raw = process.env.DATABASE_URL || "";
    if (raw.includes("-pooler") && !raw.includes("pgbouncer=true")) {
      hint = "Neon pooler URL needs pgbouncer=true (now auto-added — redeploy latest code)";
    }
    if (!process.env.DATABASE_URL) {
      hint = "DATABASE_URL is not set in Railway";
    }
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        message: error instanceof Error ? error.message : "Database connection failed",
        hint,
      },
      { status: 503 }
    );
  }
}
