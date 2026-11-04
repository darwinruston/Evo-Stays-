-- CreateEnum
CREATE TYPE "PropertyManagement" AS ENUM ('SHORT_LET', 'LONG_LET', 'HMO');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "management" "PropertyManagement" NOT NULL DEFAULT 'SHORT_LET';
