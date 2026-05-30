import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    const userCount = await db.user.count();
    return NextResponse.json({
      status: "ok",
      database: "connected",
      userCount,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        message:
          error instanceof Error ? error.message : "Database connection failed",
      },
      { status: 503 }
    );
  }
}
