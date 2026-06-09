import { db } from "@/lib/db";
import type { Persona, Profile, User } from "@prisma/client";
import {
  buildSearchQuery,
  fetchJobsForRegion,
  type JobRegion,
} from "@/lib/job-search";
import { scoreJobForPersona } from "@/lib/job-matching";

const REFRESH_COOLDOWN_MS = 15 * 60 * 1000;

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
    return { refreshed: false, added: 0 };
  }

  const persona = await resolvePersona(user.id, prefs.personaId);
  if (!persona) {
    return { refreshed: false, added: 0 };
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

  console.info(
    `Job refresh for ${user.id}: query="${query}" region=${region} fetched=${rawJobs.length} jsearch=${stats.jsearch} remotive=${stats.remotive} added=${added}`
  );

  return {
    refreshed: true,
    added,
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
