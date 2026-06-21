-- Add isVerification flag to InboxEmail so verification/security-code emails
-- are stored but hidden from the user's inbox view by default.
ALTER TABLE "InboxEmail" ADD COLUMN "isVerification" BOOLEAN NOT NULL DEFAULT false;
