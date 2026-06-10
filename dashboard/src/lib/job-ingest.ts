import { fetchAtsBoardJobsForIngest } from "@/lib/ats-boards";
import { db } from "@/lib/db";
import { fetchJobsForRegion } from "@/lib/job-search";
import { TOP_TECH_COMPANIES } from "@/lib/top-companies";

/** Roles we refresh daily into the shared job cache. */
export const INGEST_SEED_ROLES = [
  "software engineer",
  "product manager",
  "data analyst",
  "data scientist",
  "ux designer",
  "marketing manager",
  "project manager",
  "business analyst",
  "frontend developer",
  "backend developer",
  "devops engineer",
  "customer success manager",
] as const;

async function upsertListing(raw: {
  externalId: string;
  source: string;
  company: string;
  title: string;
  description: string;
  applyUrl: string;
  location: string;
  region: string;
  remote: boolean;
  postedAt?: Date;
  atsType?: string;
}) {
  await db.jobListing.upsert({
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
}

/** Daily ingest: pull fresh listings into the shared JobListing table. */
export async function ingestGlobalJobCache(): Promise<{ ingested: number; queries: number }> {
  let ingested = 0;
  let queries = 0;

  for (const role of INGEST_SEED_ROLES) {
    const { jobs } = await fetchJobsForRegion(role, "all", false, `ingest:${role}`);
    queries++;
    for (const raw of jobs) {
      await upsertListing(raw);
      ingested++;
    }
  }

  // Top companies × generic engineer query
  for (const company of TOP_TECH_COMPANIES.slice(0, 8)) {
    const { jobs } = await fetchJobsForRegion(
      `software engineer ${company}`,
      "us",
      false,
      `ingest:${company}`
    );
    queries++;
    for (const raw of jobs) {
      await upsertListing(raw);
      ingested++;
    }
  }

  const { jobs: atsJobs, stats: atsStats } = await fetchAtsBoardJobsForIngest();
  for (const raw of atsJobs) {
    await upsertListing(raw);
    ingested++;
  }

  console.info(
    `Job ingest complete: ${ingested} listings from ${queries} queries + ${atsJobs.length} ATS (gh=${atsStats.greenhouse} lever=${atsStats.lever})`
  );
  return { ingested, queries };
}

/** Pull matching jobs from the daily cache for a user's target role. */
export async function fetchCachedJobsForRole(
  targetRole: string,
  region: "all" | "us" | "international"
): Promise<
  Array<{
    externalId: string;
    source: string;
    company: string;
    title: string;
    description: string;
    applyUrl: string;
    location: string;
    region: "us" | "international";
    remote: boolean;
    postedAt?: Date;
    atsType?: string;
  }>
> {
  const role = targetRole.trim().toLowerCase();
  if (!role) return [];

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const keywords = role.split(/\s+/).filter((w) => w.length > 2).slice(0, 4);

  const listings = await db.jobListing.findMany({
    where: {
      updatedAt: { gte: since },
      ...(region === "us"
        ? { region: "us" }
        : region === "international"
          ? { region: "international" }
          : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return listings
    .filter((job) => {
      const hay = `${job.title} ${job.description} ${job.company}`.toLowerCase();
      return keywords.some((kw) => hay.includes(kw));
    })
    .slice(0, 40)
    .map((job) => ({
      externalId: job.externalId,
      source: job.source,
      company: job.company,
      title: job.title,
      description: job.description,
      applyUrl: job.applyUrl,
      location: job.location,
      region: job.region as "us" | "international",
      remote: job.remote,
      postedAt: job.postedAt ?? undefined,
      atsType: job.atsType,
    }));
}
