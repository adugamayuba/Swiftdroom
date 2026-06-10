import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";

const eventSchema = z.object({
  type: z.string().max(64),
  path: z.string().max(512).optional(),
  label: z.string().max(256).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const collectSchema = z.object({
  sessionId: z.string().optional(),
  visitorId: z.string().max(64),
  landingPath: z.string().max(512).optional(),
  referrer: z.string().max(2048).optional(),
  utmSource: z.string().max(128).optional(),
  utmMedium: z.string().max(128).optional(),
  utmCampaign: z.string().max(128).optional(),
  userAgent: z.string().max(512).optional(),
  durationSec: z.number().int().min(0).max(86400).optional(),
  pageView: z.boolean().optional(),
  events: z.array(eventSchema).max(50).optional(),
});

/** First-party analytics ingest — page views, clicks, time on site. */
export async function POST(request: NextRequest) {
  try {
    const body = collectSchema.parse(await request.json());

    let sessionId = body.sessionId;
    let session = sessionId
      ? await db.visitorSession.findUnique({ where: { id: sessionId } })
      : null;

    if (!session) {
      session = await db.visitorSession.create({
        data: {
          visitorId: body.visitorId,
          landingPath: body.landingPath || "/",
          referrer: (body.referrer || "").slice(0, 2048),
          utmSource: body.utmSource || "",
          utmMedium: body.utmMedium || "",
          utmCampaign: body.utmCampaign || "",
          userAgent: (body.userAgent || request.headers.get("user-agent") || "").slice(0, 512),
        },
      });
      sessionId = session.id;
    }

    const now = new Date();
    const updates: {
      lastSeenAt: Date;
      durationSec?: number;
      pageViews?: { increment: number };
      endedAt?: Date;
    } = { lastSeenAt: now };

    if (body.durationSec != null) {
      updates.durationSec = Math.max(session.durationSec, body.durationSec);
    }
    if (body.pageView) {
      updates.pageViews = { increment: 1 };
    }

    await db.visitorSession.update({
      where: { id: sessionId },
      data: updates,
    });

    const events = body.events || [];
    if (events.length > 0) {
      await db.visitorEvent.createMany({
        data: events.map((e) => ({
          sessionId: sessionId!,
          type: e.type,
          path: e.path || "",
          label: e.label || "",
          meta: (e.meta ?? undefined) as Prisma.InputJsonValue | undefined,
        })),
      });
    }

    return NextResponse.json({ sessionId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    console.error("Analytics collect error:", error);
    return NextResponse.json({ error: "Collect failed" }, { status: 500 });
  }
}
