import { db } from "@/lib/db";
import type { Persona, Profile, User } from "@prisma/client";
import {
  buildSearchQuery,
  fetchJobsForRegion,
  isJSearchConfigured,
  type JobRegion,
} from "@/lib/job-search";
import { scoreJobForPersona } from "@/lib/job-matching";

const REFRESH_COOLDOWN_MS = 60 * 60 * 1000;

export async function getOrCreatePreferences(userId: string) {
  return db.jobSearchPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

async function resolvePersona(
  userId: string,
  personaId?: string | null
): Promise<Persona | null> {
  if (personaId) {
    return db.persona.findFirst({
      where: { id: personaId, userId },
    });
  }
  return db.persona.findFirst({
    where: { userId, isDefault: true },
  });
}

export async function refreshJobFeed(user: User & { profile: Profile | null }) {
  const prefs = await getOrCreatePreferences(user.id);
  const now = new Date();

  const feedCount = await db.jobFeedItem.count({
    where: {
      userId: user.id,
      status: { in: ["recommended", "active", "saved", "clicked"] },
    },
  });

  const onCooldown =
    prefs.lastRefreshedAt &&
    now.getTime() - prefs.lastRefreshedAt.getTime() < REFRESH_COOLDOWN_MS;

  if (onCooldown && feedCount > 0) {
    const waitMin = Math.ceil(
      (REFRESH_COOLDOWN_MS -
        (now.getTime() - prefs.lastRefreshedAt!.getTime())) /
        60000
    );
    return {
      refreshed: false,
      message: `Feed refreshes every hour. Try again in ~${waitMin} min.`,
    };
  }

  const persona = await resolvePersona(user.id, prefs.personaId);
  if (!persona) {
    return {
      refreshed: false,
      message: "Create a persona first so we can match jobs to your focus.",
    };
  }

  const query = buildSearchQuery(
    persona.focus,
    persona.name,
    persona.resumeText || user.profile?.resumeText || "",
    persona.skills
  );

  const region = (prefs.region || "all") as JobRegion;
  const { jobs: rawJobs, stats } = await fetchJobsForRegion(
    query,
    region,
    prefs.remoteOnly
  );

  const usCount = rawJobs.filter((j) => j.region === "us").length;
  const intlCount = rawJobs.length - usCount;

  const appliedUrls = new Set(
    (
      await db.application.findMany({
        where: { userId: user.id },
        select: { url: true },
      })
    ).map((a) => a.url)
  );

  const dismissedIds = new Set(
    (
      await db.jobFeedItem.findMany({
        where: { userId: user.id, status: "dismissed" },
        select: { jobListingId: true },
      })
    ).map((i) => i.jobListingId)
  );

  let added = 0;
  for (const raw of rawJobs) {
    if (appliedUrls.has(raw.applyUrl)) continue;

    const listing = await db.jobListing.upsert({
      where: {
        source_externalId: {
          source: raw.source,
          externalId: raw.externalId,
        },
      },
      create: {
        externalId: raw.externalId,
        source: raw.source,
        company: raw.company,
        title: raw.title,
        description: raw.description,
        applyUrl: raw.applyUrl,
        location: raw.location,
        region: raw.region,
        remote: raw.remote,
        postedAt: raw.postedAt,
        atsType: raw.atsType || "",
      },
      update: {
        title: raw.title,
        description: raw.description,
        applyUrl: raw.applyUrl,
        location: raw.location,
        remote: raw.remote,
        postedAt: raw.postedAt,
        atsType: raw.atsType || "",
      },
    });

    if (dismissedIds.has(listing.id)) continue;

    const { score, matchReason } = scoreJobForPersona(
      raw,
      persona,
      user.profile
    );

    await db.jobFeedItem.upsert({
      where: {
        userId_jobListingId: {
          userId: user.id,
          jobListingId: listing.id,
        },
      },
      create: {
        userId: user.id,
        jobListingId: listing.id,
        personaId: persona.id,
        score,
        matchReason,
        status: "recommended",
      },
      update: {
        score,
        matchReason,
        personaId: persona.id,
      },
    });
    added++;
  }

  await db.jobSearchPreference.update({
    where: { userId: user.id },
    data: { lastRefreshedAt: now },
  });

  const breakdown =
    usCount || intlCount
      ? ` (${[
          usCount ? `${usCount} US` : "",
          intlCount ? `${intlCount} international` : "",
        ]
          .filter(Boolean)
          .join(", ")})`
      : "";

  let message: string;
  if (added > 0) {
    message = `Found ${added} matching jobs${breakdown}.`;
  } else if (rawJobs.length > 0) {
    message =
      "Jobs were found but you've already saved or hidden them. Try a different region filter.";
  } else if (stats.jsearchError === "rate_limited") {
    message =
      "Job search quota reached for now. International listings may still appear — try again later.";
  } else if (!stats.jsearchConfigured && (region === "us" || region === "all")) {
    message =
      "Only international remote jobs are available right now — US search isn't connected on the server yet.";
  } else if (stats.jsearchConfigured && stats.jsearch === 0 && (region === "us" || region === "all")) {
    message =
      'No US jobs matched — set persona focus to a role title (e.g. "Developer") and try USA only.';
  } else {
    message =
      'No jobs matched your search — update your persona focus (e.g. "Product Manager") and try again.';
  }

  return {
    refreshed: true,
    added,
    query,
    fetched: rawJobs.length,
    stats,
    jsearchConfigured: isJSearchConfigured(),
    message,
  };
}

export async function getActiveJobForUser(userId: string) {
  const active = await db.jobFeedItem.findFirst({
    where: { userId, status: "active" },
    include: { jobListing: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!active) return null;
  return {
    id: active.id,
    company: active.jobListing.company,
    title: active.jobListing.title,
    url: active.jobListing.applyUrl,
    jobDescription: active.jobListing.description,
    personaId: active.personaId,
    location: active.jobListing.location,
    remote: active.jobListing.remote,
    atsType: active.jobListing.atsType,
  };
}

export async function setActiveJob(userId: string, feedItemId: string) {
  const item = await db.jobFeedItem.findFirst({
    where: { id: feedItemId, userId },
    include: { jobListing: true },
  });
  if (!item) return null;

  await db.jobFeedItem.updateMany({
    where: { userId, status: "active" },
    data: { status: "clicked" },
  });

  await db.jobFeedItem.update({
    where: { id: feedItemId },
    data: { status: "active" },
  });

  return item;
}
