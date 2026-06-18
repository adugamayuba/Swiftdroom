import { db } from "@/lib/db";
import { sendSubscribeNudgeEmail, sendFollowUpReminderEmail } from "@/lib/email";

const NUDGE_INTERVALS_HOURS = [1, 24, 72];

export async function processSubscribeNudges() {
  const users = await db.user.findMany({
    where: {
      onboardingComplete: true,
      subscriptionStatus: "NONE",
      subscribeNudgeCount: { lt: NUDGE_INTERVALS_HOURS.length },
    },
    select: {
      id: true,
      email: true,
      name: true,
      subscribeNudgeCount: true,
      subscribeNudgeLastSentAt: true,
      updatedAt: true,
    },
    take: 100,
  });

  let sent = 0;

  for (const user of users) {
    const nudgeIndex = user.subscribeNudgeCount;
    const hoursRequired = NUDGE_INTERVALS_HOURS[nudgeIndex];
    if (hoursRequired == null) continue;

    const reference = user.subscribeNudgeLastSentAt || user.updatedAt;
    const hoursSince =
      (Date.now() - reference.getTime()) / (1000 * 60 * 60);

    if (hoursSince < hoursRequired) continue;

    await sendSubscribeNudgeEmail(user, nudgeIndex + 1);
    await db.user.update({
      where: { id: user.id },
      data: {
        subscribeNudgeCount: nudgeIndex + 1,
        subscribeNudgeLastSentAt: new Date(),
      },
    });
    sent += 1;
  }

  return sent;
}

export async function processFollowUpReminders() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const applications = await db.application.findMany({
    where: {
      status: { in: ["applied", "filled", "screening"] },
      followUpReminderSentAt: null,
      appliedAt: { lte: sevenDaysAgo, gte: fourteenDaysAgo },
    },
    include: {
      user: {
        select: { id: true, email: true, name: true, emailNotifyApplications: true },
      },
    },
    take: 50,
  });

  let sent = 0;

  for (const app of applications) {
    if (!app.user.emailNotifyApplications) continue;

    await sendFollowUpReminderEmail(app.user, {
      company: app.company,
      role: app.role,
      appliedAt: app.appliedAt,
    });

    await db.application.update({
      where: { id: app.id },
      data: { followUpReminderSentAt: new Date() },
    });
    sent += 1;
  }

  return sent;
}
