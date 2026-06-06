-- Email notification preferences and password reset fields
ALTER TABLE "User" ADD COLUMN "emailNotifyLogin" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "emailNotifyApplications" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "emailNotifyBilling" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "welcomeEmailSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "passwordResetToken" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");
