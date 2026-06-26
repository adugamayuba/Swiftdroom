import type { User } from "@prisma/client";
import { getAppUrl } from "./app-url";

export type EmailNotificationType = "login" | "applications" | "billing";

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const { to, subject, text } = params;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Swiftdroom <noreply@swiftdroom.com>";

  if (!apiKey) {
    console.log(`[email] To: ${to} | Subject: ${subject}\n${text}`);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) {
      console.error("Resend email failed:", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend email error:", err);
    return false;
  }
}

export function userWantsEmail(
  user: Pick<
    User,
    "emailNotifyLogin" | "emailNotifyApplications" | "emailNotifyBilling"
  >,
  type: EmailNotificationType
): boolean {
  if (type === "login") return user.emailNotifyLogin;
  if (type === "applications") return user.emailNotifyApplications;
  return user.emailNotifyBilling;
}

export async function sendWelcomeEmail(user: {
  email: string;
  name: string | null;
}) {
  const displayName = user.name || "there";
  await sendEmail({
    to: user.email,
    subject: "You're all set on Swiftdroom",
    text: `Hi ${displayName},

Your Swiftdroom profile is complete — nice work.

Next steps:
1. Choose a plan to unlock the Chrome extension
2. Start applying to jobs with AI-powered autofill

Open your dashboard: ${getAppUrl()}/dashboard

— The Swiftdroom team`,
  });
}

export async function sendLoginNotificationEmail(user: {
  email: string;
  name: string | null;
}) {
  const displayName = user.name || "there";
  await sendEmail({
    to: user.email,
    subject: "New sign-in to your Swiftdroom account",
    text: `Hi ${displayName},

Someone just signed in to your Swiftdroom account.

If this was you, no action is needed. If you don't recognize this sign-in, reset your password right away: ${getAppUrl()}/forgot-password

— The Swiftdroom team`,
  });
}

export async function sendApplicationSubmittedEmail(
  user: { email: string; name: string | null },
  application: { company: string; role: string }
) {
  const displayName = user.name || "there";
  await sendEmail({
    to: user.email,
    subject: `Application logged: ${application.role} at ${application.company}`,
    text: `Hi ${displayName},

Your application was saved in Swiftdroom:

Role: ${application.role}
Company: ${application.company}

View your applications: ${getAppUrl()}/dashboard/applications

— The Swiftdroom team`,
  });
}

export async function sendSubscriptionActivatedEmail(
  user: { email: string; name: string | null },
  planName: string
) {
  const displayName = user.name || "there";
  await sendEmail({
    to: user.email,
    subject: "Your Swiftdroom subscription is active",
    text: `Hi ${displayName},

Your ${planName} subscription is now active. You can use the Chrome extension and start applying.

Open your dashboard: ${getAppUrl()}/dashboard

— The Swiftdroom team`,
  });
}

export async function sendPaymentFailedEmail(user: {
  email: string;
  name: string | null;
}) {
  const displayName = user.name || "there";
  await sendEmail({
    to: user.email,
    subject: "Action needed: Swiftdroom payment failed",
    text: `Hi ${displayName},

We couldn't process your latest Swiftdroom subscription payment. Update your billing details to keep access:

${getAppUrl()}/dashboard/settings

— The Swiftdroom team`,
  });
}

export async function sendPasswordResetEmail(
  user: { email: string; name: string | null },
  resetUrl: string
) {
  const displayName = user.name || "there";
  await sendEmail({
    to: user.email,
    subject: "Reset your Swiftdroom password",
    text: `Hi ${displayName},

We received a request to reset your Swiftdroom password.

Reset your password (link expires in 1 hour):
${resetUrl}

If you didn't request this, you can ignore this email.

— The Swiftdroom team`,
  });
}

interface ReferralRedemptionEmailParams {
  to: string;
  name: string | null;
  amount: number;
}

export async function sendSubscribeNudgeEmail(
  user: { email: string; name: string | null },
  nudgeNumber: number
) {
  const displayName = user.name || "there";
  const appUrl = getAppUrl();
  const subjects = [
    "Your Swiftdroom profile is ready — unlock autofill",
    "Still applying manually? Your profile is waiting",
    "20% off your first month — finish setting up Swiftdroom",
  ];
  const bodies = [
    `Hi ${displayName},

You finished setting up your profile — nice work. Subscribe to unlock the Chrome extension and autofill Workday, Greenhouse, and Lever forms in seconds.

Use code WELCOME for 20% off your first month:
${appUrl}/subscribe?code=WELCOME

— The Swiftdroom team`,
    `Hi ${displayName},

Job applications still eating your evenings? Swiftdroom autofills forms and writes tailored answers from your resume.

Your profile is saved and ready:
${appUrl}/subscribe?code=WELCOME

— The Swiftdroom team`,
    `Hi ${displayName},

Last reminder — start applying faster this week. Swiftdroom users fill 40+ field Workday forms in under a minute.

20% off with WELCOME:
${appUrl}/subscribe?code=WELCOME

— The Swiftdroom team`,
  ];

  const idx = Math.min(nudgeNumber - 1, 2);
  await sendEmail({
    to: user.email,
    subject: subjects[idx],
    text: bodies[idx],
  });
}

export async function sendFollowUpReminderEmail(
  user: { email: string; name: string | null },
  application: { company: string; role: string; appliedAt: Date }
) {
  const displayName = user.name || "there";
  const days = Math.floor(
    (Date.now() - application.appliedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  await sendEmail({
    to: user.email,
    subject: `Follow up on ${application.role} at ${application.company}?`,
    text: `Hi ${displayName},

You applied to ${application.role} at ${application.company} about ${days} days ago. A short follow-up message can help you stand out.

View your application: ${getAppUrl()}/dashboard/applications

— The Swiftdroom team`,
  });
}

export async function sendReferralRedemptionEmail(
  params: ReferralRedemptionEmailParams
) {
  const { to, name, amount } = params;
  const displayName = name || "there";
  await sendEmail({
    to,
    subject: "Your Swiftdroom referral earnings are ready",
    text: `Hi ${displayName},

Great news — your referral commission of $${amount.toFixed(2)} is now eligible for payout.

To receive your earnings, reply to this email with your preferred payment details (PayPal email, bank transfer info, or other method). Our team processes payouts on the 3rd of each month.

Thank you for spreading the word about Swiftdroom!

— The Swiftdroom team`,
  });
}

export async function sendAutoApplyDigestEmail(
  user: { email: string; name: string | null },
  applied: Array<{ company: string; role: string }>,
  failed: number,
  totalApplied: number,
  monthlyLimit: number
) {
  const displayName = user.name || "there";
  const lines = applied
    .map((a, i) => `${i + 1}. ${a.role} at ${a.company}`)
    .join("\n");

  await sendEmail({
    to: user.email,
    subject: `Your AI agent submitted ${applied.length} application${applied.length !== 1 ? "s" : ""}`,
    text: `Hi ${displayName},

Your Swiftdroom AI agent just submitted ${applied.length} job application${applied.length !== 1 ? "s" : ""} on your behalf:

${lines}${failed > 0 ? `\n\n${failed} application${failed !== 1 ? "s" : ""} could not be submitted (the job may have closed or changed).` : ""}

Monthly progress: ${totalApplied}/${monthlyLimit} applications used.

View all your applications: ${getAppUrl()}/dashboard/applications
Manage auto-apply settings: ${getAppUrl()}/dashboard/auto-apply

— The Swiftdroom team`,
  });
}

export async function sendCommunityLeaderInviteEmail(params: {
  email: string;
  communityName?: string;
  signupUrl: string;
}) {
  const nameHint = params.communityName?.trim()
    ? ` for ${params.communityName.trim()}`
    : "";

  await sendEmail({
    to: params.email,
    subject: "You're invited to Swiftdroom Community Access",
    text: `Hi,

You've been invited to join Swiftdroom as a community leader${nameHint}.

As a community leader you'll get:
• A dedicated community dashboard
• Your own referral link for your members
• Tools to manage your community profile (logo, name, and details)

Set up your account here (link expires in 7 days):
${params.signupUrl}

If you weren't expecting this invite, you can ignore this email.

— The Swiftdroom team`,
  });
}
