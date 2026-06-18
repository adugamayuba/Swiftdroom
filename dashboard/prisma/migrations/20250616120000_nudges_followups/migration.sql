-- AlterTable
ALTER TABLE "User" ADD COLUMN "subscribeNudgeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "subscribeNudgeLastSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Application" ADD COLUMN "followUpReminderSentAt" TIMESTAMP(3);
