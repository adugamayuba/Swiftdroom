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

/** JSearch via RapidAPI — strong US coverage when key is set. */
async function fetchJSearchJobs(
  query: string,
  region: JobRegion,
  remoteOnly: boolean
): Promise<RawJobListing[]> {
  const apiKey = process.env.JSEARCH_RAPIDAPI_KEY?.trim();
  if (!apiKey) {
    console.warn("JSearch skipped: JSEARCH_RAPIDAPI_KEY is not set");
    return [];
  }

  const params = new URLSearchParams({
    query: query || "software engineer",
    page: "1",
    num_pages: "3",
    date_posted: "month",
  });

  if (region === "us") {
    params.set("country", "us");
  }

  if (remoteOnly) {
    params.set("work_from_home", "true");
  }

  const res = await fetch(
    `https://jsearch.p.rapidapi.com/search?${params.toString()}`,
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
    console.error("JSearch error:", res.status, body.slice(0, 300));
    return [];
  }

  const data = (await res.json()) as {
    data?: Array<{
      job_id: string;
      employer_name?: string;
      job_title?: string;
      job_description?: string;
      job_apply_link?: string;
      apply_options?: Array<{ apply_link?: string; is_direct?: boolean }>;
      job_city?: string;
      job_state?: string;
      job_country?: string;
      job_is_remote?: boolean;
      job_posted_at_datetime_utc?: string;
    }>;
  };

  const jobs = (data.data || [])
    .map((job) => {
      const applyUrl = pickApplyUrl(job);
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
        region: isUs ? ("us" as const) : ("international" as const),
        remote: Boolean(job.job_is_remote),
        postedAt: job.job_posted_at_datetime_utc
          ? new Date(job.job_posted_at_datetime_utc)
          : undefined,
        atsType: applyUrl ? detectAts(applyUrl) : "",
      };
    })
    .filter((j) => j.applyUrl);

  console.info(`JSearch returned ${jobs.length} jobs for query "${query}" (${region})`);
  return jobs;
}

const GENERIC_FOCUS = /^(general|default|other|any|misc|n\/a|none)$/i;

export function buildSearchQuery(
  personaFocus: string,
  personaName: string,
  resumeSnippet: string,
  skills = ""
): string {
  const focus = personaFocus.trim();
  if (focus && !GENERIC_FOCUS.test(focus)) return focus.slice(0, 120);

  const skillLine = skills
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2)
    .slice(0, 3)
    .join(" ");
  if (skillLine) return skillLine.slice(0, 120);

  const resumeWords = tokenizeResumeForQuery(resumeSnippet);
  if (resumeWords.length > 0) return resumeWords.slice(0, 120);

  const name = personaName.replace(/resume|cv|default/gi, "").trim();
  if (name && !GENERIC_FOCUS.test(name)) return name.slice(0, 120);

  return "software engineer";
}

function tokenizeResumeForQuery(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    const lower = line.toLowerCase();
    if (
      lower.includes("engineer") ||
      lower.includes("developer") ||
      lower.includes("manager") ||
      lower.includes("designer") ||
      lower.includes("analyst") ||
      lower.includes("specialist")
    ) {
      return line.slice(0, 120);
    }
  }
  const first = lines.find((l) => l.length > 3);
  return first?.slice(0, 120) || "";
}

export async function fetchJobsForRegion(
  query: string,
  region: JobRegion,
  remoteOnly: boolean
): Promise<RawJobListing[]> {
  const results: RawJobListing[] = [];

  if (region === "us" || region === "all") {
    const usJobs = await fetchJSearchJobs(query, "us", remoteOnly);
    results.push(...usJobs);
  }

  if (region === "international" || region === "all") {
    const intlJSearch =
      region === "international"
        ? await fetchJSearchJobs(query, "international", remoteOnly)
        : [];
    const remotive = await fetchRemotiveJobs(query);
    results.push(...intlJSearch, ...remotive);
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

  return filtered.slice(0, 50);
}
