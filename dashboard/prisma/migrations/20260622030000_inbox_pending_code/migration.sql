-- Store extracted verification code on InboxEmail so it can be retried
-- if no matching security_code_required job exists at poll time (race condition).
ALTER TABLE "InboxEmail" ADD COLUMN "pendingCode" TEXT;
