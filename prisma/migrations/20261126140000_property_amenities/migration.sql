-- AlterTable
ALTER TABLE "Property" ADD COLUMN "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "amenitiesSyncedAt" TIMESTAMP(3),
ADD COLUMN "amenitiesCheckedAt" TIMESTAMP(3),
ADD COLUMN "amenityAdded" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "amenityRemoved" TEXT[] DEFAULT ARRAY[]::TEXT[];
