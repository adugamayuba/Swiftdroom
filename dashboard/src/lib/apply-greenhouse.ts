/**
 * Server-side auto-apply via Greenhouse's job board React API.
 *
 * Flow (reverse-engineered from job-boards.greenhouse.io React SPA):
 * 1. GET job-boards.greenhouse.io/{token}/jobs/{id}  — extract __remixContext for fingerprint + questions
 * 2. GET boards.greenhouse.io/{token}/jobs/{id}       — capture _jbs session cookie (redirect: manual)
 * 3. POST boards.greenhouse.io/{token}/jobs/{id}      — JSON body with job_application + fingerprint
 *
 * The boards-api.greenhouse.io API is READ-ONLY. The hosted form endpoint
 * is the only way to programmatically submit applications server-side.
 */

import type { ApplyPayload, ApplyResult } from "./apply-lever";
import { solveGreenhouseCaptcha } from "./solve-captcha";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

interface GreenhouseFieldQuestion {
  name: string;
  type: string;
  values?: Array<{ value: number | string; label: string }>;
}

interface GreenhouseQuestion {
  required: boolean;
  label: string;
  description?: string | null;
  fields: GreenhouseFieldQuestion[];
}

/**
 * Extract board token + job ID from a Greenhouse apply URL.
 * Handles boards.greenhouse.io, job-boards.greenhouse.io, and company subdomains.
 */
function parseGreenhouseUrl(
  applyUrl: string
): { boardToken: string; jobId: string } | null {
  try {
    const url = new URL(applyUrl);
    const pathMatch = url.pathname.match(/^\/([^/]+)\/jobs\/(\d+)/);
    if (pathMatch) return { boardToken: pathMatch[1], jobId: pathMatch[2] };

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

/** Extract board token + job ID from externalId stored as "{boardToken}-{numericJobId}". */
function parseGreenhouseExternalId(externalId: string): { boardToken: string; jobId: string } | null {
  const match = externalId.match(/^(.+)-(\d+)$/);
  if (match) return { boardToken: match[1], jobId: match[2] };
  return null;
}

interface LoaderData {
  fingerprint: string;
  submitPath: string;
  questions: GreenhouseQuestion[];
}

/** Detect whether a Greenhouse URL uses the EU regional subdomain. */
function detectRegion(url: string): "eu" | "us" {
  return url.includes(".eu.greenhouse.io") ? "eu" : "us";
}

/**
 * Fetch the Remix SSR loader data embedded in the job page HTML.
 * Contains the job fingerprint (required for submission), submit path, and question list.
 */
async function getGreenhouseLoaderData(
  boardToken: string,
  jobId: string,
  region: "eu" | "us" = "us"
): Promise<LoaderData | null> {
  const host =
    region === "eu"
      ? "job-boards.eu.greenhouse.io"
      : "job-boards.greenhouse.io";
  try {
    const res = await fetch(
      `https://${host}/${boardToken}/jobs/${jobId}`,
      {
        headers: { "User-Agent": BROWSER_UA, "Accept": "text/html,*/*" },
      }
    );
    if (!res.ok) return null;

    const html = await res.text();
    const markerPos = html.indexOf("__remixContext = ");
    if (markerPos === -1) return null;

    const jsonStart = markerPos + "__remixContext = ".length;
    let depth = 0, end = jsonStart;
    for (let i = jsonStart; i < html.length; i++) {
      if (html[i] === "{") depth++;
      else if (html[i] === "}") {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }

    const ctx = JSON.parse(html.slice(jsonStart, end)) as {
      state?: {
        loaderData?: Record<string, {
          jobPost?: { fingerprint?: string; questions?: GreenhouseQuestion[] };
          submitPath?: string;
        }>;
      };
    };

    const routeKey = Object.keys(ctx.state?.loaderData ?? {}).find(
      (k) => k !== "root"
    );
    const routeData = routeKey ? ctx.state?.loaderData?.[routeKey] : undefined;
    if (!routeData?.submitPath || !routeData.jobPost?.fingerprint) return null;

    return {
      fingerprint: routeData.jobPost.fingerprint,
      submitPath: routeData.submitPath,
      questions: routeData.jobPost.questions ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * GET boards.greenhouse.io/{token}/jobs/{id} (with redirect:manual) to capture
 * the _jbs session cookie if one is set.
 */
async function getGreenhouseSession(
  boardToken: string,
  jobId: string,
  region: "eu" | "us" = "us"
): Promise<string> {
  const host =
    region === "eu" ? "boards.eu.greenhouse.io" : "boards.greenhouse.io";
  try {
    const res = await fetch(
      `https://${host}/${boardToken}/jobs/${jobId}`,
      {
        headers: { "User-Agent": BROWSER_UA },
        redirect: "manual",
      }
    );
    return res.headers.get("set-cookie")?.match(/_jbs=[^;]+/)?.[0] ?? "";
  } catch {
    return "";
  }
}

/** AI-generated answer for a free-text question. */
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
          content:
            "Answer a job application question based on the candidate's resume. Be concise, specific, honest. Under 120 words. No markdown.",
        },
        {
          role: "user",
          content: `Question: ${question}\nJob title: ${jobTitle}\nResume:\n${resumeText.slice(0, 2000)}\n\nAnswer:`,
        },
      ],
      max_tokens: 160,
      temperature: 0.5,
    });
    return res.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    return "";
  }
}

/**
 * Build the answers_attributes object for custom questions.
 * Mirrors the logic of the `ga` function in the Greenhouse React SPA.
 *
 * Key format: numeric question ID (e.g. "8590525008", not "question_8590525008").
 * Value format:
 *   text/textarea  → { question_id, priority, text_value }
 *   select (0/1)   → { question_id, priority, boolean_value }
 *   select (opts)  → { question_id, priority, answer_selected_options_attributes: { "0": { question_option_id } } }
 */
async function buildAnswers(
  questions: GreenhouseQuestion[],
  resumeText: string,
  jobTitle: string,
  linkedinUrl?: string
): Promise<Record<string, unknown>> {
  const attrs: Record<string, unknown> = {};
  let priority = 0;

  const SKIP_LABELS = [
    "first name", "last name", "email", "phone", "resume",
    "cover letter", "linkedin", "website",
  ];

  for (const q of questions) {
    const field = q.fields[0];
    if (!field) continue;

    const name = field.name;
    if (!name.startsWith("question_")) continue;

    // Extract numeric ID (Greenhouse expects this, not the full "question_XXX" key)
    const qId = name.replace(/^question_/, "").replace(/\[\]$/, "");
    const labelLower = (q.label ?? "").toLowerCase();

    // Skip standard fields
    if (SKIP_LABELS.some((s) => labelLower.includes(s))) continue;

    // LinkedIn URL question
    if (labelLower.includes("linkedin") && linkedinUrl) {
      attrs[qId] = { question_id: qId, priority: priority++, text_value: linkedinUrl };
      continue;
    }

    if (field.type === "input_text" || field.type === "textarea") {
      const answer =
        resumeText
          ? await aiAnswer(q.label ?? q.description ?? "", resumeText, jobTitle)
          : "";
      if (answer) {
        attrs[qId] = { question_id: qId, priority: priority++, text_value: answer };
      }
      continue;
    }

    if (
      field.type === "multi_value_single_select" ||
      field.type === "multi_value_multi_select"
    ) {
      const values = field.values ?? [];
      if (values.length === 0) continue;

      const firstVal = values[0].value;
      const isBoolean = firstVal === 0 || firstVal === 1;

      if (isBoolean) {
        // Yes/No — pick "Yes" (1) unless question sounds like it would be a disqualifier
        const preferNo = ["require.*sponsor", "visa sponsor"].some((p) =>
          new RegExp(p, "i").test(q.label ?? "")
        );
        attrs[qId] = {
          question_id: qId,
          priority: priority++,
          boolean_value: preferNo ? 0 : 1,
        };
      } else {
        // Option-based — pick the first option
        attrs[qId] = {
          question_id: qId,
          priority: priority++,
          answer_selected_options_attributes: {
            "0": { question_option_id: String(firstVal) },
          },
        };
      }
    }
  }

  return attrs;
}

export async function applyViaGreenhouse(
  applyUrl: string,
  payload: ApplyPayload & {
    resumeText?: string;
    jobTitle?: string;
    externalId?: string;
  }
): Promise<ApplyResult> {
  const parsed =
    parseGreenhouseUrl(applyUrl) ??
    (payload.externalId ? parseGreenhouseExternalId(payload.externalId) : null);
  if (!parsed) {
    return { success: false, error: "Could not parse Greenhouse URL" };
  }

  const { boardToken, jobId } = parsed;
  const region = detectRegion(applyUrl);
  const pageHost =
    region === "eu"
      ? "job-boards.eu.greenhouse.io"
      : "job-boards.greenhouse.io";
  const pageUrl = `https://${pageHost}/${boardToken}/jobs/${jobId}`;

  // Step 1 — get fingerprint + submitPath + questions from Remix loader data
  const loaderData = await getGreenhouseLoaderData(boardToken, jobId, region);
  if (!loaderData) {
    console.warn(`[greenhouse] ${boardToken}/${jobId} loader data unavailable`);
    return { success: false, error: "Job closed" };
  }

  const { fingerprint, submitPath, questions } = loaderData;
  console.info(
    `[greenhouse] ${boardToken}/${jobId} fingerprint=${fingerprint.slice(0, 8)}… submitPath=${submitPath}`
  );

  // Step 2 — establish session (_jbs cookie)
  const sessionCookie = await getGreenhouseSession(boardToken, jobId, region);

  // Step 3 — build answers for custom required questions
  const answersAttributes = await buildAnswers(
    questions,
    payload.resumeText ?? "",
    payload.jobTitle ?? "",
    payload.linkedinUrl
  );

  // Step 4 — solve reCAPTCHA Enterprise (required by Greenhouse on all submissions)
  const captchaToken = await solveGreenhouseCaptcha(pageUrl);
  if (!captchaToken) {
    console.warn(`[greenhouse] ${boardToken}/${jobId} no captcha token — will attempt without`);
  }

  // Step 5 — assemble application JSON
  const jobApplication: Record<string, unknown> = {
    first_name: payload.firstName,
    last_name: payload.lastName,
    email: payload.email,
    phone: payload.phone ?? "",
    answers_attributes: answersAttributes,
    demographic_answers: [],
    data_compliance: {},
    attachments: {},
    from_job_board_renderer: true,
    employments: [],
    time_zone: "America/New_York",
  };

  // Resume — Greenhouse accepts a direct URL (downloads it server-side)
  if (payload.resumeUrl) {
    const fileName =
      payload.resumeUrl.split("/").pop()?.split("?")[0] ?? "resume.pdf";
    jobApplication.resume_url = payload.resumeUrl;
    jobApplication.resume_url_filename = fileName;
  }

  if (payload.linkedinUrl) {
    jobApplication.question_url_linkedin = payload.linkedinUrl;
  }

  if (payload.coverLetter) {
    jobApplication.cover_letter_text = payload.coverLetter;
  }

  // Step 6 — POST
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": BROWSER_UA,
    "Origin": `https://${pageHost}`,
    "Referer": pageUrl,
  };
  if (sessionCookie) headers["Cookie"] = sessionCookie;

  const postBody: Record<string, unknown> = { job_application: jobApplication, fingerprint };
  if (captchaToken) postBody["g-recaptcha-enterprise-token"] = captchaToken;

  try {
    const res = await fetch(submitPath, {
      method: "POST",
      headers,
      body: JSON.stringify(postBody),
      redirect: "manual",
    });

    console.info(`[greenhouse] ${boardToken}/${jobId} submit status=${res.status}`);

    if (res.ok || res.status === 201 || res.status === 302) {
      return { success: true };
    }

    if (res.status === 404 || res.status === 410) {
      return { success: false, error: "Job closed" };
    }

    if (res.status === 429) {
      // Rate-limited — treat as temporary failure (will retry next cycle)
      return { success: false, error: "Rate limited — will retry" };
    }

    let text = "";
    try {
      text = await res.text();
      // Parse Greenhouse JSON error response
      const json = JSON.parse(text) as { code?: string; message?: string };
      if (json.code === "invalid-attributes") {
        return { success: false, error: `Missing required fields: ${json.message}` };
      }
      if (json.message) return { success: false, error: json.message };
    } catch {
      // Not JSON
    }
    return {
      success: false,
      error: `Greenhouse ${res.status}: ${text.slice(0, 200)}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
