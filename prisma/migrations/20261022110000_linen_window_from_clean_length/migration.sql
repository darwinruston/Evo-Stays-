-- The latest the van may arrive is now worked out from how long the clean is
-- expected to take (clean linen must be there cleanLeadMinutes before it ends)
-- instead of a fixed time after the cleaner arrives.
ALTER TABLE "LaundryFacility" DROP COLUMN "needByMinutes";
ALTER TABLE "LaundryFacility" ADD COLUMN "cleanLeadMinutes" INTEGER NOT NULL DEFAULT 40,
ADD COLUMN "defaultCleanMinutes" INTEGER NOT NULL DEFAULT 90;
