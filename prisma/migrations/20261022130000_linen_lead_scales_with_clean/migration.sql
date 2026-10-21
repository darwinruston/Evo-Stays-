-- How long before the end of a clean its linen must arrive now scales with the
-- length of the clean (a share of it, with a floor) instead of being a fixed
-- number of minutes. The old fixed value was an example, not a real setting.
ALTER TABLE "LaundryFacility" RENAME COLUMN "cleanLeadMinutes" TO "minLeadMinutes";
ALTER TABLE "LaundryFacility" ALTER COLUMN "minLeadMinutes" SET DEFAULT 15;
UPDATE "LaundryFacility" SET "minLeadMinutes" = 15;
ALTER TABLE "LaundryFacility" ADD COLUMN "cleanLeadPercent" INTEGER NOT NULL DEFAULT 33;
