/**
 * Server-side auto-apply via Greenhouse's hosted job board forms.
 *
 * The boards-api.greenhouse.io API is READ-ONLY for job listings.
 * Application submission requires the hosted board form endpoint:
 *   GET  boards.greenhouse.io/{token}/jobs/{id}        — fetch page + CSRF token
 *   POST boards.greenhouse.io/{token}/jobs/{id}/apply  — submit application
 *
 * We simulate a browser form submission: fetch the page to get the Rails
 * authenticity_token + session cookie, then POST with those included.
 */

import type { ApplyPayload, ApplyResult } from "./apply-lever";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface GreenhouseQuestion {
  required: boolean;
  label: string;
  field_type: string;
  name?: string;
  values?: Array<{ value: number | string; label: string }>;
  description?: string;
}

interface GreenhouseJobDetails {
  id: number;
  title: string;
  content: string;
  questions: GreenhouseQuestion[];
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/**
 * Extract the Greenhouse board token and job ID from a Greenhouse apply URL.
 * Handles multiple formats:
 *   https://boards.greenhouse.io/acme/jobs/1234567        (standard)
 *   https://job-boards.greenhouse.io/acme/jobs/1234567   (alternate)
 *   https://acme.greenhouse.io/jobs/1234567               (company subdomain)
 */
function parseGreenhouseUrl(
  applyUrl: string
): { boardToken: string; jobId: string; host: string } | null {
  try {
    const url = new URL(applyUrl);

    // Format 1: boards.greenhouse.io/{token}/jobs/{id}
    const pathMatch = url.pathname.match(/^\/([^/]+)\/jobs\/(\d+)/);
    if (pathMatch) {
      return { boardToken: pathMatch[1], jobId: pathMatch[2], host: url.hostname };
    }

    // Format 2: {token}.greenhouse.io/jobs/{id}  (company-hosted subdomain)
    const subMatch = url.hostname.match(/^([^.]+)\.greenhouse\.io$/);
    if (subMatch && subMatch[1] !== "boards" && subMatch[1] !== "job-boards") {
      const jobIdMatch = url.pathname.match(/\/jobs\/(\d+)/);
      if (jobIdMatch) {
        return { boardToken: subMatch[1], jobId: jobIdMatch[1], host: url.hostname };
      }
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Extract board token + job ID from a Greenhouse job's externalId.
 * ats-boards.ts stores externalId as "{boardToken}-{numericJobId}".
 */
function parseGreenhouseExternalId(externalId: string): { boardToken: string; jobId: string; host: string } | null {
  const match = externalId.match(/^(.+)-(\d+)$/);
  if (match) return { boardToken: match[1], jobId: match[2], host: "boards.greenhouse.io" };
  return null;
}

/**
 * Fetch the Greenhouse hosted job board page to get the Rails CSRF token and session cookie.
 * Required for submitting applications through the hosted board form.
 */
async function getGreenhouseFormToken(
  boardToken: string,
  jobId: string
): Promise<{ csrfToken: string; sessionCookie: string } | null> {
  // Try both hosted board domains
  const urls = [
    `https://boards.greenhouse.io/${boardToken}/jobs/${jobId}`,
    `https://job-boards.greenhouse.io/${boardToken}/jobs/${jobId}`,
  ];

  for (const pageUrl of urls) {
    try {
      const res = await fetch(pageUrl, {
        headers: {
          "User-Agent": BROWSER_UA,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        redirect: "follow",
      });

      if (!res.ok) continue;

      const html = await res.text();

      // Extract Rails authenticity_token from the HTML form
      const tokenMatch =
        html.match(/name="authenticity_token"[^>]*value="([^"]+)"/) ||
        html.match(/value="([^"]+)"[^>]*name="authenticity_token"/);
      if (!tokenMatch) continue;

      // Extract session cookie from response headers
      const rawCookie = res.headers.get("set-cookie") || "";
      const sessionCookieMatch = rawCookie.match(/_greenhouse_session=[^;,]+/);
      if (!sessionCookieMatch) continue;

      return { csrfToken: tokenMatch[1], sessionCookie: sessionCookieMatch[0] };
    } catch {
      // try next URL
    }
  }
  return null;
}

/** Use AI to generate a short answer for a free-text question. */
async function aiAnswer(
  question: string,
  resumeText: string,
  jobTitle: string
): Promise<string> {
  if (!openai) return "";
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You answer a single job application question based on the candidate's resume. Be concise, honest, and tailored. Under 150 words. No markdown.`,
        },
        {
          role: "user",
          content: `Question: ${question}\nJob title: ${jobTitle}\nResume:\n${resumeText.slice(0, 2000)}\n\nAnswer:`,
        },
      ],
      max_tokens: 200,
      temperature: 0.5,
    });
    return res.choices[0]?.message?.content?.trim() || "";
  } catch {
    return "";
  }
}

export async function applyViaGreenhouse(
  applyUrl: string,
  payload: ApplyPayload & { resumeText?: string; jobTitle?: string; externalId?: string }
): Promise<ApplyResult> {
  // Prefer URL parsing; fall back to externalId (stored as "{boardToken}-{jobId}")
  const parsed =
    parseGreenhouseUrl(applyUrl) ??
    (payload.externalId ? parseGreenhouseExternalId(payload.externalId) : null);
  if (!parsed) {
    return { success: false, error: "Could not parse Greenhouse URL" };
  }

  const { boardToken, jobId } = parsed;

  // Fetch job details with questions (best-effort, for AI-generated custom answers)
  let jobDetails: GreenhouseJobDetails | null = null;
  try {
    const detailsRes = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}?questions=true`,
      {
        headers: { "User-Agent": BROWSER_UA, "Accept": "application/json" },
        cache: "no-store",
      }
    );
    if (detailsRes.status === 404) {
      return { success: false, error: "Job closed" };
    }
    if (detailsRes.ok) {
      jobDetails = (await detailsRes.json()) as GreenhouseJobDetails;
    }
  } catch {
    // Proceed without questions
  }

  // Get CSRF token + session cookie from the hosted job board page
  const formAuth = await getGreenhouseFormToken(boardToken, jobId);
  if (!formAuth) {
    // Hosted form page not accessible — job may be on a custom career page
    return { success: false, error: "Job closed" };
  }

  const form = new FormData();

  // Rails CSRF + UTF-8 marker
  form.append("utf8", "✓");
  form.append("authenticity_token", formAuth.csrfToken);

  // Standard applicant fields
  form.append("first_name", payload.firstName);
  form.append("last_name", payload.lastName);
  form.append("email", payload.email);
  if (payload.phone) form.append("phone", payload.phone);
  if (payload.linkedinUrl) form.append("question_url_linkedin", payload.linkedinUrl);
  if (payload.coverLetter) form.append("cover_letter_text", payload.coverLetter);

  // Resume file
  if (payload.resumeUrl) {
    try {
      const resumeRes = await fetch(payload.resumeUrl);
      if (resumeRes.ok) {
        const blob = await resumeRes.blob();
        const fileName =
          payload.resumeUrl.split("/").pop()?.split("?")[0] || "resume.pdf";
        form.append("resume", blob, fileName);
      }
    } catch {
      // Resume upload optional
    }
  }

  // AI-generated answers for custom required questions
  if (jobDetails?.questions && payload.resumeText) {
    for (const q of jobDetails.questions) {
      if (
        q.field_type === "short_text" ||
        q.field_type === "long_text" ||
        q.field_type === "textarea"
      ) {
        const label = q.label || q.description || "";
        if (!label) continue;
        const labelLower = label.toLowerCase();
        if (
          labelLower.includes("first name") ||
          labelLower.includes("last name") ||
          labelLower.includes("email") ||
          labelLower.includes("phone") ||
          labelLower.includes("linkedin") ||
          labelLower.includes("resume") ||
          labelLower.includes("cover letter")
        )
          continue;

        const answer = await aiAnswer(label, payload.resumeText, payload.jobTitle || "");
        if (answer && q.name) {
          form.append(q.name, answer);
        }
      }
    }
  }

  // Submit to the hosted board form endpoint
  const submitUrl = `https://boards.greenhouse.io/${boardToken}/jobs/${jobId}/apply`;

  try {
    const res = await fetch(submitUrl, {
      method: "POST",
      headers: {
        "User-Agent": BROWSER_UA,
        "Origin": "https://boards.greenhouse.io",
        "Referer": `https://boards.greenhouse.io/${boardToken}/jobs/${jobId}`,
        "Cookie": formAuth.sessionCookie,
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: form,
      redirect: "manual",
    });

    console.info(`[greenhouse] ${boardToken}/${jobId} submit status=${res.status}`);

    // 200/201 = success; 302 redirect after form POST also typically means success
    if (res.ok || res.status === 201 || res.status === 302) {
      return { success: true };
    }

    if (res.status === 404 || res.status === 410) {
      return { success: false, error: "Job closed" };
    }

    const text = await res.text().catch(() => "");
    return {
      success: false,
      error: `Greenhouse ${res.status}: ${text.slice(0, 300)}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
