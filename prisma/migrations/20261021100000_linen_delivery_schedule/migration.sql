-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'LINEN';

-- AlterTable
ALTER TABLE "LaundryFacility" ADD COLUMN "depotAddress" TEXT,
ADD COLUMN "depotLatitude" DOUBLE PRECISION,
ADD COLUMN "depotLongitude" DOUBLE PRECISION,
ADD COLUMN "dayStartMinutes" INTEGER NOT NULL DEFAULT 390,
ADD COLUMN "dropBufferMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "stopMinutes" INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "laundryFacilityId" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "laundryFacilityId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_laundryFacilityId_fkey" FOREIGN KEY ("laundryFacilityId") REFERENCES "LaundryFacility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_laundryFacilityId_fkey" FOREIGN KEY ("laundryFacilityId") REFERENCES "LaundryFacility"("id") ON DELETE SET NULL ON UPDATE CASCADE;
