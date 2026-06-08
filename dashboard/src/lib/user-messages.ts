import { NextResponse } from "next/server";
import type { ZodError } from "zod";

const EXACT: Record<string, string> = {
  Unauthorized: "Please sign in to continue.",
  "Invalid token": "Your session expired. Please sign in again.",
  "Invalid email or password": "That email or password doesn't look right. Please try again.",
  "Invalid password": "That password isn't correct.",
  "Email already registered": "An account with this email already exists. Try logging in instead.",
  "Invalid referral code": "That referral code isn't valid. Check the code and try again.",
  "You cannot use your own referral code": "You can't use your own referral code.",
  "Login failed": "We couldn't sign you in. Please try again.",
  "Registration failed": "We couldn't create your account. Please try again.",
  "Checkout failed": "We couldn't start checkout. Please try again in a moment.",
  "Billing is not configured. Contact support.":
    "Subscriptions aren't available right now. Please contact support@swiftdroom.com.",
  "Active subscription required":
    "An active subscription is required to use this feature.",
  "Monthly application limit reached":
    "You've used all your applications for this month. Upgrade your plan or wait until your next billing cycle.",
  "Generation failed": "We couldn't generate an answer. Please try again.",
  "Create failed": "We couldn't save that. Please try again.",
  "Upload failed": "We couldn't upload your file. Please try again.",
  "Update failed": "We couldn't save your changes. Please try again.",
  "Save failed": "We couldn't save your changes. Please try again.",
  "No file provided": "Please choose a file to upload.",
  "Not found": "We couldn't find what you're looking for.",
  "Persona not found": "We couldn't find that persona. Try selecting another one.",
  "Job not found": "We couldn't find that job. It may have been removed.",
  "User not found": "We couldn't find your account. Please sign in again.",
  "Invalid request": "Something doesn't look right. Please try again.",
  "No billing account found":
    "We couldn't find a billing account. Subscribe first to manage billing.",
  Forbidden: "You don't have access to this page.",
  "Sync failed": "We couldn't sync your subscription. Please try again.",
  "Invalid email": "Please enter a valid email address.",
  "This payment does not match your account.":
    "This payment doesn't match your account. Please sign in with the email you used to pay.",
};

const TECHNICAL =
  /railway|vercel|api_url|database_url|direct_url|neon|postgresql|prisma|migrate|deploy|webhook|cors|localhost|\/api\/|zod|expected|string received|invalid_type|OPENAI_API_KEY|503|p2021|p2002|stripe|firebase|jwt|typeerror|syntaxerror|econnrefused|enotfound|unique constraint|foreign key|invocation|stack trace|at \/|cannot read propert/i;

export function friendlyUserMessage(
  raw?: string | null,
  fallback = "Something went wrong. Please try again."
): string {
  if (!raw?.trim()) return fallback;

  const message = raw.trim();
  if (EXACT[message]) return EXACT[message];
  if (TECHNICAL.test(message)) return fallback;
  if (/^expected\s/i.test(message)) return fallback;
  if (/^\[?\{/.test(message)) return fallback;
  if (message.length > 140) return fallback;

  return message;
}

/** JSON error response with a customer-friendly message. */
export function apiError(
  message: string,
  status: number,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    { error: friendlyUserMessage(message), ...extra },
    { status }
  );
}

export function apiZodError(error: ZodError): NextResponse {
  return NextResponse.json({ error: zodUserMessage(error) }, { status: 400 });
}

export function zodUserMessage(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Please check your information and try again.";

  const field = issue.path.join(" ");
  if (issue.code === "invalid_type" && issue.expected === "string") {
    if (field.includes("email")) return "Please enter a valid email address.";
    return "Please fill in all required fields.";
  }
  if (issue.code === "too_small" && field.includes("password")) {
    return "Password must be at least 8 characters.";
  }
  if (issue.code === "invalid_format" && field.includes("email")) {
    return "Please enter a valid email address.";
  }
  if (issue.code === "invalid_format" && field.includes("url")) {
    return "Please enter a valid link.";
  }

  return "Please check your information and try again.";
}

export const USER_MESSAGES = {
  network: "We're having trouble connecting. Check your internet and try again.",
  tryAgain: "Something went wrong. Please try again.",
  contactSupport: "Something went wrong on our end. Please try again or contact support@swiftdroom.com.",
  resumeExtract:
    "We couldn't read text from this file. Try a standard PDF exported from Word or Google Docs, or paste your resume text manually.",
  resumeScanned:
    "This PDF looks like a scanned image. Export a text-based PDF from your resume builder, or paste your resume text manually.",
  signInRequired: "Please sign in to continue.",
} as const;
