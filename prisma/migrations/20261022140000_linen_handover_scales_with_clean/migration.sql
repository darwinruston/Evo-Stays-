-- How long the cleaner needs to strip the bedding before the van can collect it
-- now scales with the length of the clean too (a small share, with a floor).
ALTER TABLE "LaundryFacility" RENAME COLUMN "handoverMinutes" TO "minHandoverMinutes";
ALTER TABLE "LaundryFacility" ALTER COLUMN "minHandoverMinutes" SET DEFAULT 10;
UPDATE "LaundryFacility" SET "minHandoverMinutes" = 10;
ALTER TABLE "LaundryFacility" ADD COLUMN "handoverPercent" INTEGER NOT NULL DEFAULT 15;
