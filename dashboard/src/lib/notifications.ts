import type { User } from "@prisma/client";
import { db } from "./db";
import {
  sendApplicationSubmittedEmail,
  sendLoginNotificationEmail,
  sendPaymentFailedEmail,
  sendSubscriptionActivatedEmail,
  sendWelcomeEmail,
  userWantsEmail,
} from "./email";
import { PLANS, type PlanId } from "./plans";

export async function notifyWelcomeIfNeeded(user: User) {
  if (user.welcomeEmailSent) return;

  await sendWelcomeEmail(user);
  await db.user.update({
    where: { id: user.id },
    data: { welcomeEmailSent: true },
  });
}

export async function notifyLogin(user: User) {
  if (!userWantsEmail(user, "login")) return;
  await sendLoginNotificationEmail(user);
}

export async function notifyApplicationSubmitted(
  user: User,
  application: { company: string; role: string }
) {
  if (!userWantsEmail(user, "applications")) return;
  await sendApplicationSubmittedEmail(user, application);
}

export async function notifySubscriptionActivated(user: User, planId: PlanId) {
  if (!userWantsEmail(user, "billing")) return;
  const planName = PLANS[planId]?.name ?? planId;
  await sendSubscriptionActivatedEmail(user, planName);
}

export async function notifyPaymentFailed(user: User) {
  if (!userWantsEmail(user, "billing")) return;
  await sendPaymentFailedEmail(user);
}
