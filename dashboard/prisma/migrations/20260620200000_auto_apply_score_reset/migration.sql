-- Lower minMatchScore for any existing auto-apply settings that still have
-- the old default of 75 (set before the threshold was changed to 35).
UPDATE "AutoApplySettings"
SET "minMatchScore" = 35
WHERE "minMatchScore" >= 75;
