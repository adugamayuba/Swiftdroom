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

interface DemographicAnswerOption {
  id: number;
  free_form: boolean;
  label: string;
}

interface DemographicQuestion {
  id: number;
  question: string;
  required: boolean;
  answer_options: DemographicAnswerOption[];
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
  demographicQuestions: DemographicQuestion[];
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
          jobPost?: {
            fingerprint?: string;
            questions?: GreenhouseQuestion[];
            demographic_questions?: DemographicQuestion[];
          };
          submitPath?: string;
          demographicQuestions?: DemographicQuestion[];
        }>;
      };
    };

    const routeKey = Object.keys(ctx.state?.loaderData ?? {}).find(
      (k) => k !== "root"
    );
    const routeData = routeKey ? ctx.state?.loaderData?.[routeKey] : undefined;
    if (!routeData?.submitPath || !routeData.jobPost?.fingerprint) return null;

    // Demographic questions may live at several paths depending on the Remix version
    // and board configuration. Collect all candidates and take the first non-empty array.
    const dqCandidates = [
      routeData.demographicQuestions,
      routeData.jobPost?.demographic_questions,
      (routeData as Record<string, unknown>).demographic_questions,
      (routeData as Record<string, unknown>).demographicQuestionGroups,
    ];
    let demographicQuestions: DemographicQuestion[] = [];
    for (const c of dqCandidates) {
      if (Array.isArray(c) && c.length > 0) { demographicQuestions = c; break; }
    }

    // If still empty, try the public Greenhouse boards API as a fallback.
    // This is the most reliable source — it always returns demographic questions
    // even when the Remix SSR page omits them (common for US-region boards like Discord).
    if (demographicQuestions.length === 0) {
      try {
        const apiRes = await fetch(
          `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}?questions=true`,
          { headers: { "User-Agent": BROWSER_UA } }
        );
        if (apiRes.ok) {
          const apiData = await apiRes.json() as {
            demographic_questions?:
              | { questions?: DemographicQuestion[] }  // nested form
              | DemographicQuestion[];                  // direct array form
          };
          // Some boards return { questions: [...] }, others return the array directly
          const dq = apiData.demographic_questions;
          const fromApi = Array.isArray(dq)
            ? dq
            : Array.isArray((dq as { questions?: DemographicQuestion[] })?.questions)
              ? (dq as { questions: DemographicQuestion[] }).questions
              : null;
          if (fromApi && fromApi.length > 0) {
            demographicQuestions = fromApi;
            console.info(`[greenhouse] ${boardToken}/${jobId} loaded ${fromApi.length} demographic question(s) from boards API`);
          }
        }
      } catch {
        // boards API unreachable — proceed without demographic answers
      }
    }

    return {
      fingerprint: routeData.jobPost.fingerprint,
      submitPath: routeData.submitPath,
      questions: Array.isArray(routeData.jobPost.questions) ? routeData.jobPost.questions : [],
      demographicQuestions,
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
): Promise<{ attrs: Record<string, unknown>; readable: import("@/lib/apply-lever").SubmittedAnswer[] }> {
  const attrs: Record<string, unknown> = {};
  const readable: import("@/lib/apply-lever").SubmittedAnswer[] = [];
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
      readable.push({ label: q.label ?? "LinkedIn", answer: linkedinUrl, type: "url" });
      continue;
    }

    if (field.type === "input_text" || field.type === "textarea") {
      const answer =
        resumeText
          ? await aiAnswer(q.label ?? q.description ?? "", resumeText, jobTitle)
          : "";
      if (answer) {
        attrs[qId] = { question_id: qId, priority: priority++, text_value: answer };
        readable.push({ label: q.label ?? "Text question", answer, type: field.type });
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
        const preferNo = ["require.*sponsor", "visa sponsor"].some((p) =>
          new RegExp(p, "i").test(q.label ?? "")
        );
        attrs[qId] = {
          question_id: qId,
          priority: priority++,
          boolean_value: preferNo ? 0 : 1,
        };
        readable.push({ label: q.label ?? "Yes/No", answer: preferNo ? "No" : "Yes", type: "boolean" });
      } else {
        attrs[qId] = {
          question_id: qId,
          priority: priority++,
          answer_selected_options_attributes: {
            "0": { question_option_id: String(firstVal) },
          },
        };
        readable.push({ label: q.label ?? "Select", answer: String(values[0].label ?? firstVal), type: "select" });
      }
    }
  }

  return { attrs, readable };
}

/**
 * Complete a Greenhouse application using the security code Greenhouse emailed
 * to the applicant after the initial captcha-failed submission.
 * This bypasses reCAPTCHA entirely.
 */
export async function completeWithSecurityCode(
  applyUrl: string,
  payload: ApplyPayload & {
    resumeText?: string;
    jobTitle?: string;
    externalId?: string;
  },
  securityCode: string
): Promise<ApplyResult> {
  return applyViaGreenhouse(applyUrl, payload, securityCode);
}

export async function applyViaGreenhouse(
  applyUrl: string,
  payload: ApplyPayload & {
    resumeText?: string;
    jobTitle?: string;
    externalId?: string;
  },
  securityCode?: string
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

  const { fingerprint, submitPath, questions, demographicQuestions } = loaderData;
  console.info(
    `[greenhouse] ${boardToken}/${jobId} fingerprint=${fingerprint.slice(0, 8)}… submitPath=${submitPath}`
  );

  // Build demographic answers: always select the "decline / prefer not to say" option.
  // Greenhouse rejects submissions with 422 invalid-attributes when required demographic
  // questions are missing. Selecting "decline" is legal and avoids discrimination data.
  const dqList = Array.isArray(demographicQuestions) ? demographicQuestions : [];
  console.info(`[greenhouse] ${boardToken}/${jobId} demographic questions: ${dqList.length}`);
  const demographicAnswers = dqList.map((q) => {
    const options = Array.isArray(q.answer_options) ? q.answer_options : [];
    const declineOption = options.find(
      (o) =>
        /decline|prefer not|i don.t|not wish|not disclose/i.test(o.label) ||
        o.label.toLowerCase().includes("no answer")
    ) ?? options[options.length - 1];
    return declineOption
      ? { demographic_question_id: q.id, demographic_answer_option_id: declineOption.id }
      : null;
  }).filter(Boolean);

  // Step 2 — establish session (_jbs cookie)
  const sessionCookie = await getGreenhouseSession(boardToken, jobId, region);

  // Step 3 — build answers for custom required questions
  const { attrs: answersAttributes, readable: readableAnswers } = await buildAnswers(
    questions,
    payload.resumeText ?? "",
    payload.jobTitle ?? "",
    payload.linkedinUrl
  );

  // Step 4 — CAPTCHA: skip if we have a security code (email verification bypass)
  let captchaToken: string | null = null;
  if (securityCode) {
    console.info(`[greenhouse] ${boardToken}/${jobId} using security code — skipping captcha`);
  } else {
    captchaToken = await solveGreenhouseCaptcha(pageUrl);
    if (!captchaToken) {
      console.warn(`[greenhouse] ${boardToken}/${jobId} no captcha token — will attempt without`);
    }
  }

  // Step 5 — assemble application JSON
  // NOTE: demographic_answers go at the TOP LEVEL of the POST body (not inside
  // job_application). US-region boards (e.g. boards.greenhouse.io) return 422
  // "demographic_questions invalid-attributes" when they are nested inside.
  const jobApplication: Record<string, unknown> = {
    first_name: payload.firstName,
    last_name: payload.lastName,
    email: payload.email,
    phone: payload.phone ?? "",
    answers_attributes: answersAttributes,
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

  // Demographic answers placement differs by submission path:
  //   CAPTCHA path (initial submit): top-level — boards.greenhouse.io rejects 422 if nested
  //   Security-code path (completion): inside job_application — the full validation
  //     pass that runs on code completion expects them nested
  // We include them in BOTH places so either path is covered.
  if (demographicAnswers.length > 0) {
    jobApplication.demographic_answers = demographicAnswers; // nested (code completion)
    console.info(
      `[greenhouse] ${boardToken}/${jobId} sending ${demographicAnswers.length} demographic answer(s), first: ${JSON.stringify(demographicAnswers[0])}`
    );
  }

  const postBody: Record<string, unknown> = { job_application: jobApplication, fingerprint };

  if (demographicAnswers.length > 0) {
    postBody["demographic_answers"] = demographicAnswers; // top-level (captcha path)
  }

  if (securityCode) {
    // Email verification bypass — skip reCAPTCHA entirely
    postBody["security_code"] = securityCode;
    postBody["captcha_retried"] = true;
  } else if (captchaToken) {
    postBody["g-recaptcha-enterprise-token"] = captchaToken;
  }

  try {
    const res = await fetch(submitPath, {
      method: "POST",
      headers,
      body: JSON.stringify(postBody),
      redirect: "manual",
    });

    const responseText = await res.text().catch(() => "");
    const ct = res.headers.get("content-type") ?? "";
    const xRuntime = res.headers.get("x-runtime") ?? "";
    console.info(
      `[greenhouse] ${boardToken}/${jobId} submit status=${res.status} ct="${ct}" runtime=${xRuntime} body="${responseText.slice(0, 200)}"`
    );

    if (res.ok || res.status === 201 || res.status === 302) {
      // Build human-readable demographic answers for storage
      const readableDemographic = dqList.map((q, i) => {
        const ans = demographicAnswers[i] as { demographic_answer_option_id: number } | undefined;
        const options = Array.isArray(q.answer_options) ? q.answer_options : [];
        const chosen = options.find((o) => o.id === ans?.demographic_answer_option_id);
        return {
          label: (q as { label?: string; question?: string }).label ??
                 (q as { label?: string; question?: string }).question ??
                 `Demographic question ${i + 1}`,
          answer: chosen?.label ?? "Decline",
          type: "demographic",
        };
      });
      return {
        success: true,
        submittedData: {
          ats: "greenhouse",
          email: payload.email,
          submittedAt: new Date().toISOString(),
          questions: readableAnswers,
          demographicAnswers: readableDemographic,
        },
      };
    }

    if (res.status === 404 || res.status === 410) {
      return { success: false, error: "Job closed" };
    }

    if (res.status === 429) {
      return { success: false, error: "Rate limited — will retry" };
    }

    // Try to parse JSON error from Greenhouse
    try {
      const json = JSON.parse(responseText) as {
        code?: string;
        message?: string;
        security_code_recipient?: string;
      };
      if (json.code === "captcha-failed" || json.code === "captcha-retry") {
        if (json.security_code_recipient) {
          // Greenhouse sent a verification code to the applicant's email.
          // The user must enter this code to complete the application.
          console.info(
            `[greenhouse] ${boardToken}/${jobId} security code sent to ${json.security_code_recipient}`
          );
          return {
            success: false,
            error: "security_code_required",
            securityCodeRequired: true,
          };
        }
        return { success: false, error: "Captcha failed — will retry" };
      }
      if (json.code === "invalid-attributes") {
        return { success: false, error: `Missing required fields: ${json.message}` };
      }
      if (json.message) return { success: false, error: json.message };
    } catch {
      // Not JSON
    }
    return {
      success: false,
      error: `Greenhouse ${res.status}: ${responseText.slice(0, 200)}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
