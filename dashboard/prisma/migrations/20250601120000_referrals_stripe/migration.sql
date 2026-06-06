-- CreateEnum
CREATE TYPE "ReferralEarningStatus" AS ENUM ('PENDING', 'ELIGIBLE', 'PAID', 'CANCELED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN "referredById" TEXT;
ALTER TABLE "User" ADD COLUMN "referralDiscountUsed" BOOLEAN NOT NULL DEFAULT false;

-- Backfill referral codes for existing users
UPDATE "User" SET "referralCode" = UPPER(SUBSTRING(REPLACE(id, 'c', ''), 1, 8)) WHERE "referralCode" IS NULL;

ALTER TABLE "User" ALTER COLUMN "referralCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ReferralEarning" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "subscriptionAmount" DOUBLE PRECISION NOT NULL,
    "commissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "status" "ReferralEarningStatus" NOT NULL DEFAULT 'PENDING',
    "eligibleAt" TIMESTAMP(3) NOT NULL,
    "redemptionEmailSentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidNote" TEXT NOT NULL DEFAULT '',
    "stripeInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralEarning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralEarning_referredUserId_key" ON "ReferralEarning"("referredUserId");
CREATE UNIQUE INDEX "ReferralEarning_stripeInvoiceId_key" ON "ReferralEarning"("stripeInvoiceId");
CREATE INDEX "ReferralEarning_referrerId_idx" ON "ReferralEarning"("referrerId");
CREATE INDEX "ReferralEarning_status_eligibleAt_idx" ON "ReferralEarning"("status", "eligibleAt");

-- AddForeignKey
ALTER TABLE "ReferralEarning" ADD CONSTRAINT "ReferralEarning_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralEarning" ADD CONSTRAINT "ReferralEarning_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
