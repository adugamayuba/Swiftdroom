import { NextRequest, NextResponse } from "next/server";
import { requireActiveSubscription } from "@/lib/subscription-gate";
import { db } from "@/lib/db";
import { getOrAssignSwiftdroomEmail } from "@/lib/user-swiftdroom-email";

/** GET /api/inbox — returns the user's swiftdroom inbox */
export async function GET(req: NextRequest) {
  const gate = await requireActiveSubscription(req);
  if (gate.response) return gate.response;

  const userId = gate.user.id;
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0");

  const [alias, emails, unreadCount] = await Promise.all([
    getOrAssignSwiftdroomEmail(userId),
    db.inboxEmail.findMany({
      where: { userId },
      orderBy: { receivedAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        toAlias: true,
        fromEmail: true,
        fromName: true,
        subject: true,
        bodyText: true,
        receivedAt: true,
        isRead: true,
      },
    }),
    db.inboxEmail.count({ where: { userId, isRead: false } }),
  ]);

  return NextResponse.json({ alias, emails, unreadCount });
}

/** PATCH /api/inbox — mark emails as read */
export async function PATCH(req: NextRequest) {
  const gate = await requireActiveSubscription(req);
  if (gate.response) return gate.response;

  const userId = gate.user.id;
  const { ids } = (await req.json()) as { ids?: string[] };

  if (!ids?.length) return NextResponse.json({ updated: 0 });

  const result = await db.inboxEmail.updateMany({
    where: { userId, id: { in: ids } },
    data: { isRead: true },
  });

  return NextResponse.json({ updated: result.count });
}
