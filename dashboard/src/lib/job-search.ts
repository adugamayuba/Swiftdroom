import { pickCompaniesForRefresh } from "@/lib/top-companies";

export type JobRegion = "us" | "international" | "all";

export interface RawJobListing {
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
}

function detectAts(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("greenhouse.io") || lower.includes("boards.greenhouse"))
    return "greenhouse";
  if (lower.includes("lever.co") || lower.includes("jobs.lever")) return "lever";
  if (lower.includes("workday") || lower.includes("myworkdayjobs"))
    return "workday";
  if (lower.includes("ashbyhq.com")) return "ashby";
  return "";
}

function normalizeApplyUrl(url: string): string | null {
  if (!url?.startsWith("http")) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Free public API — international remote jobs. */
async function fetchRemotiveJobs(query: string): Promise<RawJobListing[]> {
  const res = await fetch("https://remotive.com/api/remote-jobs", {
    headers: { "User-Agent": "Swiftdroom/1.0" },
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("Remotive error:", res.status);
    return [];
  }

  const data = (await res.json()) as {
    jobs?: Array<{
      id: number;
      url: string;
      title: string;
      company_name: string;
      description: string;
      candidate_required_location?: string;
      publication_date?: string;
      job_type?: string;
      category?: string;
    }>;
  };

  const allJobs = data.jobs || [];
  const q = query.toLowerCase().trim();
  const keywords = q.split(/\s+/).filter((word) => word.length > 2);

  let pool = allJobs;
  if (keywords.length > 0) {
    const matched = allJobs.filter((job) => {
      const hay =
        `${job.title} ${job.company_name} ${job.description} ${job.category || ""}`.toLowerCase();
      return keywords.some((word) => hay.includes(word));
    });
    if (matched.length >= 8) {
      pool = matched;
    }
  }

  const jobs = pool.slice(0, 25).map((job) => {
    const applyUrl = normalizeApplyUrl(job.url) || "";
    return {
      externalId: String(job.id),
      source: "remotive",
      company: job.company_name || "Unknown",
      title: job.title || "Role",
      description: (job.description || "").slice(0, 12000),
      applyUrl,
      location: job.candidate_required_location || "Remote",
      region: "international" as const,
      remote: true,
      postedAt: job.publication_date ? new Date(job.publication_date) : undefined,
      atsType: applyUrl ? detectAts(applyUrl) : "",
    };
  }).filter((j) => j.applyUrl);

  console.info(`Remotive returned ${jobs.length} jobs for query "${query}"`);
  return jobs;
}

function pickApplyUrl(job: {
  job_apply_link?: string;
  apply_options?: Array<{ apply_link?: string; is_direct?: boolean }>;
}): string {
  const direct = normalizeApplyUrl(job.job_apply_link || "");
  if (direct) return direct;

  const options = job.apply_options || [];
  const preferred =
    options.find((o) => o.is_direct && o.apply_link)?.apply_link ||
    options.find((o) => o.apply_link)?.apply_link ||
    "";
  return normalizeApplyUrl(preferred) || "";
}

export function isJSearchConfigured(): boolean {
  return Boolean(getJSearchApiKey());
}

function getJSearchApiKey(): string {
  const raw =
    process.env.JSEARCH_RAPIDAPI_KEY?.trim() ||
    process.env.RAPIDAPI_KEY?.trim() ||
    "";
  return raw.replace(/^["']+|["']+$/g, "").replace(/\s+/g, "");
}

function extractJSearchJobs(payload: unknown): JSearchJob[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data as JSearchJob[];
  if (root.data && typeof root.data === "object") {
    const nested = root.data as Record<string, unknown>;
    if (Array.isArray(nested.jobs)) return nested.jobs as JSearchJob[];
  }
  return [];
}

type JSearchJob = {
  job_id: string;
  employer_name?: string;
  job_title?: string;
  job_description?: string;
  job_apply_link?: string;
  apply_options?: Array<{ apply_link?: string; is_direct?: boolean }>;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_is_remote?: boolean | null;
  job_posted_at_datetime_utc?: string;
};

function mapJSearchJob(job: JSearchJob): RawJobListing | null {
  const applyUrl = pickApplyUrl(job);
  if (!applyUrl) return null;

  const country = (job.job_country || "").toLowerCase();
  const isUs =
    country === "united states" ||
    country === "us" ||
    country === "usa" ||
    Boolean(job.job_state);
  const location = [job.job_city, job.job_state, job.job_country]
    .filter(Boolean)
    .join(", ");

  return {
    externalId: job.job_id,
    source: "jsearch",
    company: job.employer_name || "Company",
    title: job.job_title || "Role",
    description: (job.job_description || "").slice(0, 12000),
    applyUrl,
    location,
    region: isUs ? "us" : "international",
    remote: job.job_is_remote === true,
    postedAt: job.job_posted_at_datetime_utc
      ? new Date(job.job_posted_at_datetime_utc)
      : undefined,
    atsType: detectAts(applyUrl),
  };
}

async function callJSearchEndpoint(
  apiKey: string,
  path: "search" | "search-v2",
  params: URLSearchParams
): Promise<{ jobs: RawJobListing[]; status: number; apiStatus?: string }> {
  const res = await fetch(
    `https://jsearch.p.rapidapi.com/${path}?${params.toString()}`,
    {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        "User-Agent": "Swiftdroom/1.0",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`JSearch ${path} error:`, res.status, body.slice(0, 300));
    return { jobs: [], status: res.status };
  }

  const payload = await res.json();
  const jobs = extractJSearchJobs(payload)
    .map(mapJSearchJob)
    .filter((j): j is RawJobListing => j !== null);

  const apiStatus =
    payload && typeof payload === "object" && "status" in payload
      ? String((payload as { status?: string }).status)
      : undefined;

  return { jobs, status: res.status, apiStatus };
}

/** JSearch via RapidAPI — strong US coverage when key is set. */
async function fetchJSearchJobs(
  query: string,
  region: JobRegion,
  remoteOnly: boolean,
  options?: { numPages?: number }
): Promise<{ jobs: RawJobListing[]; error?: string }> {
  const apiKey = getJSearchApiKey();
  if (!apiKey) {
    console.warn("JSearch skipped: no API key configured");
    return { jobs: [], error: "not_configured" };
  }

  const params = new URLSearchParams({
    query: query || "software engineer",
    page: "1",
    num_pages: String(options?.numPages ?? 2),
    date_posted: "all",
    language: "en",
  });

  if (region === "us") {
    params.set("country", "us");
  }

  if (remoteOnly) {
    params.set("work_from_home", "true");
  }

  // v3 API — prefer search-v2, fall back to search
  let result = await callJSearchEndpoint(apiKey, "search-v2", params);
  if (result.jobs.length === 0 && result.status !== 429) {
    const legacy = await callJSearchEndpoint(apiKey, "search", params);
    if (legacy.jobs.length > 0) result = legacy;
    else if (legacy.status === 429) result = legacy;
  }

  if (result.status === 429) {
    return { jobs: [], error: "rate_limited" };
  }

  console.info(
    `JSearch returned ${result.jobs.length} jobs for query "${query}" (${region})`
  );

  return { jobs: result.jobs };
}

/** Extra searches like "software engineer Google" for popular employers. */
async function fetchTopCompanyJobs(
  baseQuery: string,
  region: JobRegion,
  remoteOnly: boolean,
  seed: string
): Promise<RawJobListing[]> {
  if (!isJSearchConfigured()) return [];
  if (region === "international") return [];

  const role = baseQuery.trim() || "software engineer";
  const companies = pickCompaniesForRefresh(seed, 5);
  const jobs: RawJobListing[] = [];

  for (const company of companies) {
    const { jobs: batch, error } = await fetchJSearchJobs(
      `${role} ${company}`,
      "us",
      remoteOnly,
      { numPages: 1 }
    );
    if (error === "rate_limited") break;
    jobs.push(...batch);
  }

  console.info(
    `Top-company search returned ${jobs.length} jobs (${companies.join(", ")})`
  );
  return jobs;
}

import { resolveTargetRole } from "@/lib/job-title";

export function buildSearchQuery(
  personaFocus: string,
  personaName: string,
  resumeSnippet: string,
  skills = "",
  targetRole = ""
): string {
  return resolveTargetRole(
    targetRole,
    personaFocus,
    personaName,
    resumeSnippet,
    skills
  );
}

export type JobFetchStats = {
  jsearchConfigured: boolean;
  jsearch: number;
  remotive: number;
  jsearchError?: string;
};

export async function fetchJobsForRegion(
  query: string,
  region: JobRegion,
  remoteOnly: boolean,
  seed = "default"
): Promise<{ jobs: RawJobListing[]; stats: JobFetchStats }> {
  const results: RawJobListing[] = [];
  const stats: JobFetchStats = {
    jsearchConfigured: isJSearchConfigured(),
    jsearch: 0,
    remotive: 0,
  };

  if (region === "us" || region === "all") {
    const { jobs, error } = await fetchJSearchJobs(query, "us", remoteOnly);
    stats.jsearch += jobs.length;
    if (error) stats.jsearchError = error;

    const companyJobs = await fetchTopCompanyJobs(query, region, remoteOnly, seed);
    stats.jsearch += companyJobs.length;

    results.push(...jobs, ...companyJobs);
  }

  if (region === "international" || region === "all") {
    const { jobs: intlJobs, error: intlError } =
      region === "international"
        ? await fetchJSearchJobs(query, "international", remoteOnly)
        : { jobs: [] as RawJobListing[] };
    stats.jsearch += intlJobs.length;
    if (intlError && !stats.jsearchError) stats.jsearchError = intlError;
    results.push(...intlJobs);

    const remotive = await fetchRemotiveJobs(query);
    stats.remotive = remotive.length;
    results.push(...remotive);
  }

  const seen = new Set<string>();
  let filtered = results.filter((job) => {
    const key = `${job.company.toLowerCase()}|${job.title.toLowerCase()}|${job.applyUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (region === "us") {
    filtered = filtered.filter((j) => j.region === "us");
  } else if (region === "international") {
    filtered = filtered.filter((j) => j.region === "international");
  }

  if (remoteOnly) {
    filtered = filtered.filter((j) => j.remote);
  }

  return { jobs: filtered.slice(0, 60), stats };
}
