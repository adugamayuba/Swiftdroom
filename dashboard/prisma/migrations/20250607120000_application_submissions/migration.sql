-- Application submission snapshots for tracking and AI learning
ALTER TABLE "Application" ADD COLUMN "jobDescription" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Application" ADD COLUMN "submittedAnswers" JSONB;
ALTER TABLE "Application" ADD COLUMN "fieldsFilled" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Application" ADD COLUMN "fieldsAttempted" INTEGER NOT NULL DEFAULT 0;
