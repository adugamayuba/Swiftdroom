-- Job listings and personalized feed
CREATE TABLE "JobListing" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "applyUrl" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL DEFAULT 'us',
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "atsType" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobListing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobFeedItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "personaId" TEXT,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matchReason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'recommended',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobFeedItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobSearchPreference" (
    "userId" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'all',
    "remoteOnly" BOOLEAN NOT NULL DEFAULT false,
    "personaId" TEXT,
    "lastRefreshedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSearchPreference_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "JobListing_source_externalId_key" ON "JobListing"("source", "externalId");
CREATE INDEX "JobListing_region_postedAt_idx" ON "JobListing"("region", "postedAt");
CREATE UNIQUE INDEX "JobFeedItem_userId_jobListingId_key" ON "JobFeedItem"("userId", "jobListingId");
CREATE INDEX "JobFeedItem_userId_status_score_idx" ON "JobFeedItem"("userId", "status", "score");

ALTER TABLE "JobFeedItem" ADD CONSTRAINT "JobFeedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobFeedItem" ADD CONSTRAINT "JobFeedItem_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "JobListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobSearchPreference" ADD CONSTRAINT "JobSearchPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
