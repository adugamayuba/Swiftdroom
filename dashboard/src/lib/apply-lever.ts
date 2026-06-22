/**
 * Server-side auto-apply via Lever's public Job Postings API.
 *
 * Lever exposes a public apply endpoint used by their hosted job board pages:
 *   POST https://api.lever.co/v0/postings/{company}/{posting_id}/apply
 *
 * Docs: https://hire.lever.co/developer/jobsite
 */

export interface ApplyPayload {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  coverLetter?: string;
}

export interface SubmittedAnswer {
  label: string;
  answer: string;
  type?: string;
}

export interface ApplyResult {
  success: boolean;
  error?: string;
  /** True when Greenhouse sent a verification code to the applicant's email */
  securityCodeRequired?: boolean;
  /** Human-readable record of every question asked and the answer submitted */
  submittedData?: {
    ats: string;
    email: string;
    submittedAt: string;
    questions: SubmittedAnswer[];
    demographicAnswers: SubmittedAnswer[];
  };
}

/**
 * Extract the Lever company slug and posting ID from a Lever apply URL.
 * Handles formats like:
 *   https://jobs.lever.co/acme/abc-123/apply
 *   https://jobs.lever.co/acme/abc-123
 *   https://api.lever.co/v0/postings/acme/abc-123
 */
function parseLeverUrl(
  applyUrl: string
): { company: string; postingId: string } | null {
  try {
    const url = new URL(applyUrl);
    // jobs.lever.co/company/posting-id[/apply]
    const match = url.pathname.match(/^\/([^/]+)\/([^/]+)/);
    if (match) return { company: match[1], postingId: match[2] };
  } catch {
    // fall through
  }
  return null;
}

export async function applyViaLever(
  applyUrl: string,
  payload: ApplyPayload
): Promise<ApplyResult> {
  const parsed = parseLeverUrl(applyUrl);
  if (!parsed) {
    return { success: false, error: "Could not parse Lever URL" };
  }

  const { company, postingId } = parsed;
  const endpoint = `https://api.lever.co/v0/postings/${company}/${postingId}/apply`;

  const form = new FormData();
  form.append("name", payload.fullName);
  form.append("email", payload.email);
  if (payload.phone) form.append("phone", payload.phone);
  if (payload.linkedinUrl) form.append("urls[LinkedIn]", payload.linkedinUrl);
  if (payload.coverLetter) form.append("comments", payload.coverLetter);

  // Fetch resume from URL and attach as a file blob if available
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
      // Resume upload optional — proceed without it
    }
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "User-Agent": "Swiftdroom/1.0 (job seeker auto-apply)" },
      body: form,
    });

    if (res.ok) {
      return { success: true };
    }

    // 404 = posting closed or no longer accepting applications
    if (res.status === 404) {
      return { success: false, error: "Job closed" };
    }

    const text = await res.text().catch(() => "");
    return {
      success: false,
      error: `Lever API ${res.status}: ${text.slice(0, 200)}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
