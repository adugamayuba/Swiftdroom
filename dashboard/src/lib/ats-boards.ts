import {
  ATS_COMPANIES,
  pickAtsCompaniesForRun,
  type AtsBoard,
} from "@/lib/ats-companies";
import type { RawJobListing } from "@/lib/job-search";

const US_STATE_ABBR = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function inferRegion(location: string, country?: string): "us" | "international" {
  const loc = location.toLowerCase();
  const c = (country || "").toLowerCase();

  if (c === "us" || c === "usa" || c === "united states") return "us";
  if (loc.includes("united states") || loc.includes(", usa")) return "us";
  if (US_STATE_ABBR.test(location)) return "us";

  const intlMarkers = [
    "london",
    "dublin",
    "berlin",
    "paris",
    "amsterdam",
    "singapore",
    "tokyo",
    "sydney",
    "toronto",
    "vancouver",
    "mumbai",
    "bangalore",
    "bengaluru",
    "canada",
    "uk",
    "germany",
    "france",
    "india",
    "australia",
    "japan",
    "mexico",
    "brazil",
  ];
  if (intlMarkers.some((m) => loc.includes(m))) return "international";

  return "us";
}

function metadataText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(String).join(" ");
  if (value != null) return String(value);
  return "";
}

function isRemote(
  location: string,
  extras?: { workplaceType?: string; metadata?: Array<{ name?: string; value?: unknown }> }
): boolean {
  const loc = location.toLowerCase();
  if (loc.includes("remote")) return true;

  const wp = (extras?.workplaceType || "").toLowerCase();
  if (wp === "remote") return true;

  for (const m of extras?.metadata || []) {
    const name = (m.name || "").toLowerCase();
    const value = metadataText(m.value).toLowerCase();
    if (name.includes("location type") && value.includes("remote")) return true;
    if (value.includes("remote")) return true;
  }

  return false;
}

function roleMatches(title: string, _description: string, roleFilter?: string): boolean {
  if (!roleFilter?.trim()) return true;
  const keywords = roleFilter
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 5);
  if (keywords.length === 0) return true;

  const titleLower = title.toLowerCase();
  if (keywords.every((kw) => titleLower.includes(kw))) return true;

  const primary = keywords[keywords.length - 1];
  return titleLower.includes(primary);
}

async function fetchGreenhouseBoard(
  board: AtsBoard
): Promise<RawJobListing[]> {
  const token = board.greenhouse;
  if (!token) return [];

  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
      {
        headers: { "User-Agent": "Swiftdroom/1.0" },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      console.warn(`Greenhouse ${token}: HTTP ${res.status}`);
      return [];
    }

    const data = (await res.json()) as {
      jobs?: Array<{
        id: number;
        title?: string;
        absolute_url?: string;
        location?: { name?: string };
        content?: string;
        updated_at?: string;
        first_published?: string;
        metadata?: Array<{ name?: string; value?: string }>;
        company_name?: string;
      }>;
    };

    const jobs: RawJobListing[] = [];
    for (const job of data.jobs || []) {
      const applyUrl = job.absolute_url?.startsWith("http") ? job.absolute_url : "";
      if (!applyUrl) continue;

      const location = job.location?.name || "";
      const description = stripHtml(job.content || "").slice(0, 12000);

      jobs.push({
        externalId: `${token}-${job.id}`,
        source: "greenhouse",
        company: board.name || job.company_name || token,
        title: job.title || "Role",
        description,
        applyUrl,
        location,
        region: inferRegion(location),
        remote: isRemote(location, { metadata: job.metadata }),
        postedAt: job.first_published
          ? new Date(job.first_published)
          : job.updated_at
            ? new Date(job.updated_at)
            : undefined,
        atsType: "greenhouse",
      });
    }

    console.info(`Greenhouse ${token}: ${jobs.length} jobs`);
    return jobs;
  } catch (err) {
    console.error(`Greenhouse ${token} fetch failed:`, err);
    return [];
  }
}

async function fetchLeverBoard(board: AtsBoard): Promise<RawJobListing[]> {
  const client = board.lever;
  if (!client) return [];

  try {
    const res = await fetch(
      `https://api.lever.co/v0/postings/${client}?mode=json`,
      {
        headers: { "User-Agent": "Swiftdroom/1.0" },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      console.warn(`Lever ${client}: HTTP ${res.status}`);
      return [];
    }

    const postings = (await res.json()) as Array<{
      id: string;
      text?: string;
      hostedUrl?: string;
      applyUrl?: string;
      descriptionPlain?: string;
      description?: string;
      additionalPlain?: string;
      categories?: { location?: string; allLocations?: string[] };
      country?: string;
      workplaceType?: string;
      createdAt?: number;
    }>;

    if (!Array.isArray(postings)) return [];

    const jobs: RawJobListing[] = [];
    for (const job of postings) {
      const applyUrl =
        (job.applyUrl?.startsWith("http") && job.applyUrl) ||
        (job.hostedUrl?.startsWith("http") ? `${job.hostedUrl}/apply` : "");
      if (!applyUrl) continue;

      const location =
        job.categories?.location ||
        job.categories?.allLocations?.join(", ") ||
        "";
      const description = [
        job.descriptionPlain,
        job.additionalPlain,
        stripHtml(job.description || ""),
      ]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 12000);

      jobs.push({
        externalId: job.id,
        source: "lever",
        company: board.name,
        title: job.text || "Role",
        description,
        applyUrl,
        location,
        region: inferRegion(location, job.country),
        remote: isRemote(location, { workplaceType: job.workplaceType }),
        postedAt: job.createdAt ? new Date(job.createdAt) : undefined,
        atsType: "lever",
      });
    }

    console.info(`Lever ${client}: ${jobs.length} jobs`);
    return jobs;
  } catch (err) {
    console.error(`Lever ${client} fetch failed:`, err);
    return [];
  }
}

export type AtsFetchStats = {
  greenhouse: number;
  lever: number;
  companies: number;
};

/** Fetch jobs from public ATS boards, optionally filtered by target role. */
export async function fetchAtsBoardJobs(options?: {
  roleFilter?: string;
  maxCompanies?: number;
  seed?: string;
  companies?: AtsBoard[];
}): Promise<{ jobs: RawJobListing[]; stats: AtsFetchStats }> {
  const boards =
    options?.companies ||
    pickAtsCompaniesForRun(options?.seed || "ats", options?.maxCompanies ?? 6);

  const stats: AtsFetchStats = { greenhouse: 0, lever: 0, companies: 0 };
  const allJobs: RawJobListing[] = [];

  for (const board of boards) {
    const batch = board.greenhouse
      ? await fetchGreenhouseBoard(board)
      : board.lever
        ? await fetchLeverBoard(board)
        : [];

    if (batch.length === 0) continue;
    stats.companies++;

    const filtered = options?.roleFilter
      ? batch.filter((j) => roleMatches(j.title, j.description, options.roleFilter))
      : batch;

    for (const job of filtered) {
      if (job.source === "greenhouse") stats.greenhouse++;
      else if (job.source === "lever") stats.lever++;
      allJobs.push(job);
    }
  }

  const seen = new Set<string>();
  const deduped = allJobs.filter((job) => {
    const key = `${job.company.toLowerCase()}|${job.title.toLowerCase()}|${job.applyUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.info(
    `ATS boards: ${deduped.length} jobs from ${stats.companies} companies (gh=${stats.greenhouse} lever=${stats.lever})`
  );

  return { jobs: deduped, stats };
}

/** Daily ingest — rotate through all boards over several days. */
export async function fetchAtsBoardJobsForIngest(): Promise<{
  jobs: RawJobListing[];
  stats: AtsFetchStats;
}> {
  const dayIndex =
    Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % Math.ceil(ATS_COMPANIES.length / 6);
  const start = dayIndex * 6;
  const companies = ATS_COMPANIES.slice(start, start + 6);

  return fetchAtsBoardJobs({ companies, maxCompanies: companies.length });
}
