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
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];

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
    }>;
  };

  const q = query.toLowerCase();
  return (data.jobs || [])
    .filter((job) => {
      if (!q) return true;
      const hay = `${job.title} ${job.company_name} ${job.description}`.toLowerCase();
      return q.split(/\s+/).some((word) => word.length > 2 && hay.includes(word));
    })
    .slice(0, 25)
    .map((job) => {
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
    })
    .filter((j) => j.applyUrl);
}

/** JSearch via RapidAPI — strong US coverage when key is set. */
async function fetchJSearchJobs(
  query: string,
  region: JobRegion
): Promise<RawJobListing[]> {
  const apiKey = process.env.JSEARCH_RAPIDAPI_KEY?.trim();
  if (!apiKey) return [];

  const params = new URLSearchParams({
    query: query || "software engineer",
    page: "1",
    num_pages: "1",
    date_posted: "week",
  });

  if (region === "us") {
    params.set("country", "us");
  }

  const res = await fetch(
    `https://jsearch.p.rapidapi.com/search?${params.toString()}`,
    {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    console.error("JSearch error:", res.status, await res.text().catch(() => ""));
    return [];
  }

  const data = (await res.json()) as {
    data?: Array<{
      job_id: string;
      employer_name?: string;
      job_title?: string;
      job_description?: string;
      job_apply_link?: string;
      job_city?: string;
      job_state?: string;
      job_country?: string;
      job_is_remote?: boolean;
      job_posted_at_datetime_utc?: string;
    }>;
  };

  return (data.data || [])
    .map((job) => {
      const applyUrl = normalizeApplyUrl(job.job_apply_link || "") || "";
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
}

export function buildSearchQuery(
  personaFocus: string,
  personaName: string,
  resumeSnippet: string
): string {
  const focus = personaFocus.trim();
  if (focus) return focus.slice(0, 120);
  const name = personaName.replace(/resume|cv/gi, "").trim();
  if (name) return name.slice(0, 120);
  const firstLine = resumeSnippet.split("\n").find((l) => l.trim().length > 3);
  return (firstLine || "software engineer").slice(0, 120);
}

export async function fetchJobsForRegion(
  query: string,
  region: JobRegion,
  remoteOnly: boolean
): Promise<RawJobListing[]> {
  const results: RawJobListing[] = [];

  if (region === "us" || region === "all") {
    const usJobs = await fetchJSearchJobs(query, "us");
    results.push(...usJobs);
  }

  if (region === "international" || region === "all") {
    const intlJSearch =
      region === "international" ? await fetchJSearchJobs(query, "international") : [];
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

  return filtered.slice(0, 40);
}
