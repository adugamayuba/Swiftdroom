import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin-auth";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Admin analytics summary — sessions, time on site, pages, clicks, UTM sources. */
export async function GET(request: NextRequest) {
  if (!(await requireAdminSession(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Math.min(90, Math.max(1, Number(request.nextUrl.searchParams.get("days") || 7)));
  const since = daysAgo(days);

  const sessions = await db.visitorSession.findMany({
    where: { startedAt: { gte: since } },
    select: {
      id: true,
      durationSec: true,
      pageViews: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      landingPath: true,
      startedAt: true,
    },
    orderBy: { startedAt: "desc" },
    take: 5000,
  });

  const events = await db.visitorEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { type: true, path: true, label: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 10000,
  });

  const sessionCount = sessions.length;
  const avgDurationSec =
    sessionCount > 0
      ? Math.round(sessions.reduce((s, x) => s + x.durationSec, 0) / sessionCount)
      : 0;
  const avgPageViews =
    sessionCount > 0
      ? Math.round((sessions.reduce((s, x) => s + x.pageViews, 0) / sessionCount) * 10) / 10
      : 0;

  const bySource: Record<string, number> = {};
  for (const s of sessions) {
    const key =
      s.utmSource ||
      (s.utmMedium ? `(none)/${s.utmMedium}` : "(direct / unknown)");
    bySource[key] = (bySource[key] || 0) + 1;
  }

  const pageViews: Record<string, number> = {};
  const clicks: Record<string, number> = {};
  let promoShown = 0;
  let promoClicked = 0;
  let registerClicks = 0;

  for (const e of events) {
    if (e.type === "page_view" && e.path) {
      pageViews[e.path] = (pageViews[e.path] || 0) + 1;
    }
    if (e.type === "click" && e.label) {
      clicks[e.label] = (clicks[e.label] || 0) + 1;
    }
    if (e.type === "promo_shown") promoShown++;
    if (e.type === "promo_click") promoClicked++;
    if (e.type === "cta_register_click") registerClicks++;
  }

  const topPages = Object.entries(pageViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([path, count]) => ({ path, count }));

  const topClicks = Object.entries(clicks)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([label, count]) => ({ label, count }));

  const topSources = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([source, count]) => ({ source, count }));

  const registrations = await db.user.count({
    where: { createdAt: { gte: since } },
  });

  return NextResponse.json({
    days,
    sessions: sessionCount,
    avgDurationSec,
    avgPageViews,
    registrations,
    conversionRate:
      sessionCount > 0
        ? Math.round((registrations / sessionCount) * 1000) / 10
        : 0,
    promoShown,
    promoClicked,
    registerClicks,
    topPages,
    topClicks,
    topSources,
    recentSessions: sessions.slice(0, 20).map((s) => ({
      startedAt: s.startedAt,
      durationSec: s.durationSec,
      pageViews: s.pageViews,
      source: s.utmSource || "direct",
      medium: s.utmMedium,
      landing: s.landingPath,
    })),
  });
}
