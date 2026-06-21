-- Add swiftdroomEmail alias to users
ALTER TABLE "User" ADD COLUMN "swiftdroomEmail" TEXT;
CREATE UNIQUE INDEX "User_swiftdroomEmail_key" ON "User"("swiftdroomEmail");

-- InboxEmail table: stores all emails received at *@swiftdroom.com
CREATE TABLE "InboxEmail" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "toAlias"     TEXT NOT NULL,
    "fromEmail"   TEXT NOT NULL,
    "fromName"    TEXT NOT NULL DEFAULT '',
    "subject"     TEXT NOT NULL DEFAULT '',
    "bodyText"    TEXT NOT NULL DEFAULT '',
    "bodyHtml"    TEXT NOT NULL DEFAULT '',
    "imapUid"     TEXT NOT NULL DEFAULT '',
    "receivedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead"      BOOLEAN NOT NULL DEFAULT false,
    "isNotified"  BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxEmail_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InboxEmail_userId_receivedAt_idx" ON "InboxEmail"("userId", "receivedAt");
CREATE INDEX "InboxEmail_imapUid_idx" ON "InboxEmail"("imapUid");

ALTER TABLE "InboxEmail" ADD CONSTRAINT "InboxEmail_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
