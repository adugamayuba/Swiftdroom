-- CreateTable: AutoApplySettings
CREATE TABLE "AutoApplySettings" (
    "userId"        TEXT NOT NULL,
    "enabled"       BOOLEAN NOT NULL DEFAULT false,
    "minMatchScore" INTEGER NOT NULL DEFAULT 75,
    "dailyLimit"    INTEGER NOT NULL DEFAULT 10,
    "coverLetter"   TEXT NOT NULL DEFAULT '',
    "pausedUntil"   TIMESTAMP(3),
    "totalApplied"  INTEGER NOT NULL DEFAULT 0,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoApplySettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable: AutoApplyJob
CREATE TABLE "AutoApplyJob" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "status"       TEXT NOT NULL DEFAULT 'pending',
    "atsType"      TEXT NOT NULL DEFAULT '',
    "error"        TEXT NOT NULL DEFAULT '',
    "appliedAt"    TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoApplyJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutoApplyJob_userId_jobListingId_key" ON "AutoApplyJob"("userId", "jobListingId");
CREATE INDEX "AutoApplyJob_userId_status_createdAt_idx" ON "AutoApplyJob"("userId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "AutoApplySettings" ADD CONSTRAINT "AutoApplySettings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutoApplyJob" ADD CONSTRAINT "AutoApplyJob_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutoApplyJob" ADD CONSTRAINT "AutoApplyJob_jobListingId_fkey"
    FOREIGN KEY ("jobListingId") REFERENCES "JobListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
