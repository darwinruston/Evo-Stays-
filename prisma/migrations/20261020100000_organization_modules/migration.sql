-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('PROPERTY_MANAGER', 'CLEANING_COMPANY', 'HOST', 'MIXED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN "businessType" "BusinessType",
ADD COLUMN "laundryEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "stockEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "invoicingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "syncEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Every organization that exists now predates the setup questions: mark them
-- as done (everything stays on) so only companies created from here on are
-- asked.
UPDATE "Organization" SET "onboardingCompletedAt" = NOW();
