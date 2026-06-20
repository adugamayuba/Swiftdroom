/**
 * Server-side auto-apply via Greenhouse's public Job Board API.
 *
 * Greenhouse exposes public endpoints used by their hosted job board pages:
 *   GET  /v1/boards/{token}/jobs/{job_id}?questions=true  — fetch form questions
 *   POST /v1/boards/{token}/jobs/{job_id}/applications    — submit application
 *
 * Docs: https://developers.greenhouse.io/job-board.html
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

/**
 * Extract the Greenhouse board token and job ID from a Greenhouse apply URL.
 * Handles multiple formats:
 *   https://boards.greenhouse.io/acme/jobs/1234567        (standard)
 *   https://job-boards.greenhouse.io/acme/jobs/1234567   (alternate)
 *   https://acme.greenhouse.io/jobs/1234567               (company subdomain)
 */
function parseGreenhouseUrl(
  applyUrl: string
): { boardToken: string; jobId: string } | null {
  try {
    const url = new URL(applyUrl);

    // Format 1: boards.greenhouse.io/{token}/jobs/{id}  (most common)
    const pathMatch = url.pathname.match(/^\/([^/]+)\/jobs\/(\d+)/);
    if (pathMatch) return { boardToken: pathMatch[1], jobId: pathMatch[2] };

    // Format 2: {token}.greenhouse.io/jobs/{id}  (company-hosted subdomain, e.g. instacart)
    const subMatch = url.hostname.match(/^([^.]+)\.greenhouse\.io$/);
    if (subMatch && subMatch[1] !== "boards" && subMatch[1] !== "job-boards") {
      const jobIdMatch = url.pathname.match(/\/jobs\/(\d+)/);
      if (jobIdMatch) return { boardToken: subMatch[1], jobId: jobIdMatch[1] };
    }
  } catch {
    // fall through
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

/**
 * Extract board token + job ID from a Greenhouse job's externalId.
 * ats-boards.ts stores externalId as "{boardToken}-{numericJobId}".
 */
function parseGreenhouseExternalId(externalId: string): { boardToken: string; jobId: string } | null {
  const match = externalId.match(/^(.+)-(\d+)$/);
  if (match) return { boardToken: match[1], jobId: match[2] };
  return null;
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

  // Fetch job details with questions
  let jobDetails: GreenhouseJobDetails | null = null;
  try {
    const detailsRes = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}?questions=true`,
      { headers: { "User-Agent": "Swiftdroom/1.0" }, cache: "no-store" }
    );
    if (detailsRes.ok) {
      jobDetails = (await detailsRes.json()) as GreenhouseJobDetails;
    }
  } catch {
    // Proceed with basic fields only
  }

  const form = new FormData();

  // Standard fields
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
        // Skip standard fields we already filled
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

        const answer = await aiAnswer(
          label,
          payload.resumeText,
          payload.jobTitle || ""
        );
        if (answer && q.name) {
          form.append(q.name, answer);
        }
      }
    }
  }

  // Verify the job still exists before attempting to submit.
  // 404 here means the job was closed/removed since we ingested it.
  if (!jobDetails) {
    try {
      const probe = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}`,
        { headers: { "User-Agent": "Swiftdroom/1.0" }, cache: "no-store" }
      );
      if (probe.status === 404) {
        return { success: false, error: "Job closed" };
      }
    } catch {
      // network error — allow the submission attempt anyway
    }
  }

  // Submit to Greenhouse boards apply endpoint.
  // boards.greenhouse.io hosts the apply forms; boards-api is read-only for listings.
  const submitUrl = `https://boards.greenhouse.io/api/v1/boards/${boardToken}/jobs/${jobId}/applications`;

  try {
    const res = await fetch(submitUrl, {
      method: "POST",
      headers: { "User-Agent": "Swiftdroom/1.0 (job seeker auto-apply)" },
      body: form,
    });

    if (res.ok || res.status === 201) {
      return { success: true };
    }

    // 404 = job no longer accepting applications
    if (res.status === 404) {
      return { success: false, error: "Job closed" };
    }

    const text = await res.text().catch(() => "");
    return {
      success: false,
      error: `Greenhouse API ${res.status}: ${text.slice(0, 300)}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
