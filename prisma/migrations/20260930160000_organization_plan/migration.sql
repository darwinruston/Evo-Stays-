-- CreateEnum
CREATE TYPE "OrganizationPlan" AS ENUM ('TRIAL', 'PAID');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "monthlyPriceGBP" DOUBLE PRECISION,
ADD COLUMN     "plan" "OrganizationPlan" NOT NULL DEFAULT 'TRIAL';
